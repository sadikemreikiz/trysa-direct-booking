/**
 * Days blocked in the guest form: Airbnb occupancy + bookings confirmed on the site.
 * Server only (reads the database); the client side uses features/airbnb-sync/airbnb-calendar.
 */
import { getDb } from "@/db";
import { confirmedDaysByUnit, mergeLockedDays } from "@/features/panel/reservation-admin";
import { todayInDemre } from "@/lib/dates";
import { getLockedDatesByType } from "@/features/airbnb-sync/airbnb-calendar";

export async function getGuestLockedDates(): Promise<Record<string, string[]>> {
  const airbnb = await getLockedDatesByType();
  const db = getDb();
  if (!db) return airbnb;
  try {
    return mergeLockedDays(airbnb, await confirmedDaysByUnit(db, todayInDemre(new Date())));
  } catch (e) {
    console.error("Failed to read confirmed bookings, using Airbnb occupancy only", e);
    return airbnb;
  }
}
