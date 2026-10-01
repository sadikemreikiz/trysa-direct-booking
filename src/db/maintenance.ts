/**
 * Scheduled maintenance jobs (see /api/cron):
 *   - Reminding the admin about requests left unanswered too long (escalation)
 *   - Deleting personal data from bookings whose retention period has expired (KVKK/GDPR)
 */
import { and, eq, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import type { Db } from "./index";
import { reservationEvents, reservations } from "./schema";
import type { EmailResult } from "@/lib/email";
import type { PushMessage } from "@/lib/push";

/** Requests unanswered for this long trigger a reminder to the admin. */
export const ESCALATE_AFTER_MS = 3 * 3_600_000;

/**
 * Sends ONE notification for old pending requests that haven't been reminded yet.
 * If the notification fails nothing is marked → retried on the next run.
 */
export async function escalateStalePending(
  db: Db,
  push: (message: PushMessage) => Promise<EmailResult>,
  now: Date = new Date(),
): Promise<number> {
  const stale = await db
    .select({ id: reservations.id, guestName: reservations.guestName })
    .from(reservations)
    .where(
      and(
        eq(reservations.status, "pending"),
        isNull(reservations.escalatedAt),
        lt(reservations.createdAt, new Date(now.getTime() - ESCALATE_AFTER_MS)),
      ),
    );
  if (stale.length === 0) return 0;

  const result = await push(
    stale.length === 1
      ? {
          title: "⏰ Talep cevap bekliyor",
          body: `${stale[0].guestName} 3 saatten uzun süredir cevap bekliyor.`,
          url: `/panel/talep/${stale[0].id}`,
        }
      : {
          title: `⏰ ${stale.length} talep cevap bekliyor`,
          body: "3 saatten uzun süredir cevap bekleyen talepler var.",
          url: "/panel",
        },
  );
  if (!result.ok) return 0;

  await db
    .update(reservations)
    .set({ escalatedAt: now })
    .where(inArray(reservations.id, stale.map((s) => s.id)));
  return stale.length;
}

/**
 * Retention period promised in the privacy policy: at most 2 years after the stay
 * (checkout date). If this changes, update the lib/privacy text as well.
 */
export const RETENTION_DAYS = 730;

/**
 * Deletes personal data from expired bookings; dates, unit and status remain
 * (for statistics). Past notes are deleted too, since they may contain personal details.
 */
export async function anonymizeExpiredReservations(db: Db, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10);
  return db.transaction(async (tx) => {
    const expired = await tx
      .update(reservations)
      .set({
        guestName: "(silindi)",
        phone: "(silindi)",
        email: null,
        note: null,
        anonymizedAt: now,
      })
      .where(and(isNull(reservations.anonymizedAt), lt(reservations.checkOut, cutoff)))
      .returning({ id: reservations.id });
    if (expired.length > 0) {
      await tx
        .update(reservationEvents)
        .set({ note: null })
        .where(
          and(
            inArray(reservationEvents.reservationId, expired.map((r) => r.id)),
            isNotNull(reservationEvents.note),
          ),
        );
    }
    return expired.length;
  });
}
