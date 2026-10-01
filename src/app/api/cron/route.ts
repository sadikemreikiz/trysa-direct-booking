import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/db";
import { anonymizeExpiredReservations, escalateStalePending } from "@/features/maintenance/jobs";
import { pruneRateLimits } from "@/features/booking/rate-limit";
import { deliverDueOutbox } from "@/features/notifications/outbox";
import { sendGuestEmail, sendNotificationEmail } from "@/features/notifications/email";
import { sendPushToStaff } from "@/features/notifications/push";

/**
 * Scheduled maintenance: retries failed notifications, reminds the admin about unanswered
 * requests, deletes expired personal data and cleans up old spam counters.
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
  if (!db) return Response.json({ skipped: "DATABASE_URL yok" });

  const push = (m: Parameters<typeof sendPushToStaff>[1]) => sendPushToStaff(db, m);
  const outbox = await deliverDueOutbox(db, { email: sendNotificationEmail, push, guestEmail: sendGuestEmail });
  const escalated = await escalateStalePending(db, (m) => sendPushToStaff(db, m, { roles: ["admin"] }));
  const anonymized = await anonymizeExpiredReservations(db);
  await pruneRateLimits(db);

  return Response.json({ outbox, escalated, anonymized });
}

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
