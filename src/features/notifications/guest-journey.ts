/**
 * Scheduled guest emails along the stay (run by /api/cron every 15 minutes):
 *   - pre-arrival: the day before check-in, with directions and arrival times
 *   - review: the day after check-out, only for guests who opted in on the booking form
 * Rows are inserted into the outbox with a dedupe key, so however often the job runs each
 * guest gets each email at most once. Delivery itself is the outbox's job.
 */
import { and, between, eq, isNotNull } from "drizzle-orm";
import type { Db } from "@/db";
import { outbox, reservations } from "@/db/schema";
import { addDays, hourInDemre, todayInDemre } from "@/lib/dates";

/** Emails go out during the day in Demre, never at night. */
export const SEND_HOURS = { from: 10, to: 20 };
/** The pre-arrival email is sent this many days before check-in. */
export const PREARRIVAL_DAYS = 1;
/** Review requests are sent from the day after check-out, for a few days in case cron missed a run. */
export const REVIEW_WINDOW_DAYS = 3;

type Queued = { prearrival: number; review: number };

export async function queueGuestJourneyEmails(
  db: Db,
  opts: { enabled: boolean; now?: Date },
): Promise<Queued> {
  const now = opts.now ?? new Date();
  const hour = hourInDemre(now);
  if (!opts.enabled || hour < SEND_HOURS.from || hour >= SEND_HOURS.to) {
    return { prearrival: 0, review: 0 };
  }
  const today = todayInDemre(now);

  const arriving = await db
    .select({
      id: reservations.id,
      checkIn: reservations.checkIn,
      updatedAt: reservations.updatedAt,
    })
    .from(reservations)
    .where(
      and(
        eq(reservations.status, "confirmed"),
        isNotNull(reservations.email),
        // Exactly that day: the email says "see you tomorrow", so it must not go out late.
        eq(reservations.checkIn, addDays(today, PREARRIVAL_DAYS)),
      ),
    );
  // Bookings confirmed on the day before arrival skip it: the confirmation email they just
  // received already has the same directions and arrival times.
  const prearrivalIds = arriving
    .filter((r) => todayInDemre(r.updatedAt) <= addDays(r.checkIn, -(PREARRIVAL_DAYS + 1)))
    .map((r) => r.id);

  const departed = await db
    .select({ id: reservations.id })
    .from(reservations)
    .where(
      and(
        eq(reservations.status, "confirmed"),
        isNotNull(reservations.email),
        isNotNull(reservations.reviewConsentAt),
        between(reservations.checkOut, addDays(today, -REVIEW_WINDOW_DAYS), addDays(today, -1)),
      ),
    );

  return {
    prearrival: await enqueue(db, "guest_prearrival", prearrivalIds, now),
    review: await enqueue(
      db,
      "guest_review",
      departed.map((r) => r.id),
      now,
    ),
  };
}

/** Inserts one outbox row per booking; rows already queued earlier are skipped. */
async function enqueue(db: Db, kind: string, reservationIds: string[], now: Date): Promise<number> {
  if (reservationIds.length === 0) return 0;
  const inserted = await db
    .insert(outbox)
    .values(
      reservationIds.map((id) => ({
        kind,
        payload: { reservationId: id },
        dedupeKey: `${kind}:${id}`,
        nextAttemptAt: now,
        createdAt: now,
      })),
    )
    .onConflictDoNothing({ target: outbox.dedupeKey })
    .returning({ id: outbox.id });
  return inserted.length;
}
