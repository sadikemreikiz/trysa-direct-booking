/**
 * Misafir formunda engellenecek günler: Airbnb doluluğu + sitede onaylanmış rezervasyonlar.
 * Sadece sunucuda kullanılır (veritabanına erişir); istemci tarafı lib/availability'yi kullanır.
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
    console.error("Onaylı rezervasyonlar okunamadı, sadece Airbnb doluluğu kullanılıyor", e);
    return airbnb;
  }
}
