"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { getDb } from "@/db";
import { hitRateLimits, pruneRateLimits } from "@/db/rate-limit";
import {
  createReservation,
  deliverDueOutbox,
  deliverOutboxMessage,
  ReservationValidationError,
} from "@/db/reservations";
import { rangeHasLockedDay } from "@/lib/availability";
import { clientKey } from "@/lib/client-key";
import { guestEmailEnabled, sendGuestEmail, sendNotificationEmail } from "@/lib/email";
import { getGuestLockedDates } from "@/lib/guest-availability";
import { sendPushToStaff, type PushMessage } from "@/lib/push";
import { reservationSummary, type ReservationInput } from "@/lib/reservation";
import type { Locale } from "@/i18n-config";

export type SubmitResult = {
  ok: boolean;
  error?: "required" | "invalid" | "blocked" | "rate_limited";
  emailed?: boolean;
  /** Misafire gösterilen talep kodu (veritabanına kaydedildiyse) */
  reference?: string;
};

/** Aynı kişiden (IP özeti) gelen talep sınırı: 10 dakikada 3, günde 8. */
const RESERVATION_LIMITS = {
  "10m": { limit: 3, windowMs: 10 * 60_000 },
  "1d": { limit: 8, windowMs: 86_400_000 },
};

/** Bir insanın formu bundan hızlı doldurması pek mümkün değil (tarih + ad + telefon). */
const MIN_FILL_MS = 3_000;

/**
 * Rezervasyon talebini işler.
 * Veritabanı varsa: talep önce kaydedilir (tek doğruluk kaynağı), sonra e-posta outbox
 * üzerinden gönderilir — gönderim başarısız olursa arka planda tekrar denenir.
 * Veritabanı yoksa ya da hata verirse: eski davranış (doğrudan e-posta), site çalışmaya devam eder.
 */
export async function submitReservation(
  data: ReservationInput,
  meta: {
    unitSlug: string;
    locale: Locale;
    consent: boolean;
    /** Bot tuzakları: gizli alan (insanlar görmez, boş kalır) ve formun doldurulma süresi */
    trap?: { hp: string; elapsedMs: number };
  },
): Promise<SubmitResult> {
  if (!data.checkin || !data.checkout || !data.name.trim() || !data.phone.trim()) {
    return { ok: false, error: "required" };
  }
  // Bot: sessizce "başarılı" dön ki denemeyi değiştirmesin; hiçbir şey kaydedilmez, bildirim gitmez.
  if (!meta.trap || meta.trap.hp || meta.trap.elapsedMs < MIN_FILL_MS) {
    return { ok: true, emailed: false };
  }
  // Sayfa önbellekten gelmiş olabilir: seçilen oda bu arada dolduysa talebi baştan reddet.
  if (meta.unitSlug && meta.unitSlug !== "kamp") {
    const locked = (await getGuestLockedDates())[data.unit] ?? [];
    if (rangeHasLockedDay(data.checkin, data.checkout, locked)) return { ok: false, error: "blocked" };
  }

  const db = getDb();
  if (db) {
    try {
      const allowed = await hitRateLimits(db, `res:${clientKey(await headers())}`, RESERVATION_LIMITS);
      after(() => pruneRateLimits(db).catch(console.error));
      if (!allowed) return { ok: false, error: "rate_limited" };
    } catch (e) {
      console.error("Spam sınırı kontrol edilemedi, talep kabul ediliyor", e);
    }
    try {
      const { reservation, outboxId, pushOutboxId } = await createReservation(
        db,
        { ...data, unit: meta.unitSlug, locale: meta.locale, consent: meta.consent as true },
        { guestAck: guestEmailEnabled() },
      );
      const handlers = {
        email: sendNotificationEmail,
        push: (m: PushMessage) => sendPushToStaff(db, m),
        guestEmail: sendGuestEmail,
      };
      const [delivery] = await Promise.all([
        deliverOutboxMessage(db, outboxId, handlers),
        deliverOutboxMessage(db, pushOutboxId, handlers),
      ]);
      // Yanıt döndükten sonra: misafirin e-postası ve daha önce başarısız olmuş bildirimler.
      after(() => deliverDueOutbox(db, handlers).catch(console.error));
      return { ok: true, emailed: delivery === "sent", reference: reservation.reference };
    } catch (e) {
      if (e instanceof ReservationValidationError) {
        return { ok: false, error: "invalid" };
      }
      console.error("Rezervasyon veritabanına yazılamadı, doğrudan e-postaya geçiliyor", e);
    }
  }

  const result = await sendNotificationEmail(
    `Yeni rezervasyon talebi — ${data.name}`,
    reservationSummary(data),
  );
  return { ok: true, emailed: result.ok };
}
