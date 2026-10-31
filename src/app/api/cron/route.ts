import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/db";
import { pruneRateLimits } from "@/features/booking/rate-limit";
import { deleteExpiredConversations } from "@/features/concierge/conversations";
import { anonymizeExpiredReservations, escalateStalePending } from "@/features/maintenance/jobs";
import {
  monitorAirbnbCalendars,
  monitorScheduler,
  type CronSource,
} from "@/features/monitoring/checks";
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
 *   - cron-job.org: every 15 minutes, as /api/cron?from=cron-job.
 *   - GitHub Actions (.github/workflows/cron.yml): a backup. It is scheduled every 15 minutes,
 *     but GitHub runs scheduled workflows only every 2–7 hours in practice.
 *   - Vercel Cron (vercel.json): once a day on the Hobby plan; Vercel adds the header itself.
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

  const scheduler = await monitorScheduler(db, callerOf(request));
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

/** Vercel's own cron identifies itself; cron-job.org says so in the URL; the rest is GitHub. */
function callerOf(request: Request): CronSource {
  if (request.headers.get("user-agent")?.startsWith("vercel-cron")) return "vercel";
  return new URL(request.url).searchParams.get("from") === "cron-job" ? "cron-job" : "github";
}

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
