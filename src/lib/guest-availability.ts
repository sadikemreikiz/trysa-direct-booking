/**
 * Days blocked in the guest form: Airbnb occupancy + bookings confirmed on the site.
 * Server only (reads the database); the client side uses lib/availability.
 */
import { getDb } from "@/db";
import { confirmedDaysByUnit, mergeLockedDays } from "@/db/panel";
import { todayInDemre } from "@/db/reservations";
import { getLockedDatesByType } from "./availability";

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
