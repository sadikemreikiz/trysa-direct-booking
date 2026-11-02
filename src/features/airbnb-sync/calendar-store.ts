/**
 * The last Airbnb calendar read successfully for each room, kept in Postgres.
 *
 * The scheduled job reads every calendar fresh (every 15 minutes in the daytime) and saves it
 * here. When a calendar can't be read on a page or assistant request, its last known copy is
 * used instead, so the room never looks free just because Airbnb is unreachable. Bookings made
 * on Airbnb after that copy can't be seen until it's readable again; the family confirms
 * every request, and the admins are alerted after a few hours.
 */
import { inArray, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { airbnbCalendars } from "@/db/schema";
import { readLockedDatesByType } from "./airbnb-calendar";

export async function saveAirbnbCalendars(
  db: Db,
  calendars: { room: string; days: string[] }[],
  now: Date = new Date(),
): Promise<void> {
  if (calendars.length === 0) return;
  await db
    .insert(airbnbCalendars)
    .values(calendars.map(({ room, days }) => ({ room, bookedDays: days, readAt: now })))
    .onConflictDoUpdate({
      target: airbnbCalendars.room,
      set: { bookedDays: sql`excluded.booked_days`, readAt: sql`excluded.read_at` },
    });
}

export type AirbnbAvailability = {
  /** Blocked days per room, as the booking form and the panel use them. */
  locked: Record<string, string[]>;
  /** Rooms read from their last known copy, with when it was read (null: no copy yet). */
  fallback: { room: string; readAt: Date | null }[];
};

export async function readAirbnbAvailability(
  db: Db | null,
  fetchImpl?: typeof fetch,
): Promise<AirbnbAvailability> {
  const live = await readLockedDatesByType(fetchImpl);
  const locked: Record<string, string[]> = {};
  const failed: string[] = [];
  for (const [room, days] of Object.entries(live)) {
    if (days) locked[room] = days;
    else failed.push(room);
  }
  if (failed.length === 0) return { locked, fallback: [] };

  let saved: (typeof airbnbCalendars.$inferSelect)[] = [];
  if (db) {
    try {
      saved = await db.select().from(airbnbCalendars).where(inArray(airbnbCalendars.room, failed));
    } catch (e) {
      console.error("Failed to read the last known Airbnb calendars", e);
    }
  }
  const byRoom = new Map(saved.map((s) => [s.room, s]));
  const fallback = failed.map((room) => {
    const copy = byRoom.get(room);
    locked[room] = copy?.bookedDays ?? [];
    return { room, readAt: copy?.readAt ?? null };
  });
  return { locked, fallback };
}

/** Blocked days per room: live where Airbnb answers, the last known copy where it doesn't. */
export async function getAirbnbLockedDates(db: Db | null): Promise<Record<string, string[]>> {
  return (await readAirbnbAvailability(db)).locked;
}
