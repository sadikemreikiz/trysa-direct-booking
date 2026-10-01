import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/db";
import { pruneRateLimits } from "@/features/booking/rate-limit";
import { deleteExpiredConversations } from "@/features/concierge/conversations";
import { anonymizeExpiredReservations, escalateStalePending } from "@/features/maintenance/jobs";
import { monitorAirbnbCalendars, monitorScheduler } from "@/features/monitoring/checks";
import { guestEmailEnabled } from "@/features/notifications/email";
import { queueGuestJourneyEmails } from "@/features/notifications/guest-journey";
import { outboxHandlers } from "@/features/notifications/handlers";
import { deliverDueOutbox } from "@/features/notifications/outbox";
import { sendPushToStaff } from "@/features/notifications/push";

/**
 * Scheduled maintenance: queues pre-arrival and review emails, retries failed notifications,
 * reminds the admin about unanswered requests, deletes expired personal data and assistant
 * conversations, cleans up old spam counters, and checks what fails quietly (Airbnb
 * calendars, the scheduler itself) to alert the admins.
 *
 * Callers (Authorization: Bearer $CRON_SECRET):
 *   - Vercel Cron (vercel.json): once a day on the Hobby plan; Vercel adds the header itself.
 *   - GitHub Actions (.github/workflows/cron.yml): every 15 minutes.
 * Every job is idempotent, so frequent or overlapping calls are safe.
 */
export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return new Response(null, { status: 401 });
  }
  const db = getDb();
  if (!db) return Response.json({ skipped: "no DATABASE_URL" });

  // Queue first, so new pre-arrival and review emails go out in this same run.
  const journey = await queueGuestJourneyEmails(db, { enabled: guestEmailEnabled() });
  const outbox = await deliverDueOutbox(db, outboxHandlers(db));
  const escalated = await escalateStalePending(db, (m) =>
    sendPushToStaff(db, m, { roles: ["admin"] }),
  );
  const anonymized = await anonymizeExpiredReservations(db);
  const conversations = await deleteExpiredConversations(db);
  await pruneRateLimits(db);

  // Vercel's own cron identifies itself; every other authorised caller is the GitHub schedule.
  const source = request.headers.get("user-agent")?.startsWith("vercel-cron") ? "vercel" : "github";
  const scheduler = await monitorScheduler(db, source);
  const airbnb = await monitorAirbnbCalendars(db);

  return Response.json({
    journey,
    outbox,
    escalated,
    anonymized,
    conversations,
    scheduler,
    airbnb,
  });
}

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
