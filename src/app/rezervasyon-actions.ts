"use server";

import { after } from "next/server";
import { getDb } from "@/db";
import {
  createReservation,
  deliverDueOutbox,
  deliverOutboxMessage,
  ReservationValidationError,
} from "@/db/reservations";
import { sendNotificationEmail } from "@/lib/email";
import { sendPushToStaff, type PushMessage } from "@/lib/push";
import { reservationSummary, type ReservationInput } from "@/lib/reservation";
import type { Locale } from "@/i18n-config";

export type SubmitResult = {
  ok: boolean;
  error?: "required" | "invalid";
  emailed?: boolean;
  /** Misafire gösterilen talep kodu (veritabanına kaydedildiyse) */
  reference?: string;
};

/**
 * Rezervasyon talebini işler.
 * Veritabanı varsa: talep önce kaydedilir (tek doğruluk kaynağı), sonra e-posta outbox
 * üzerinden gönderilir — gönderim başarısız olursa arka planda tekrar denenir.
 * Veritabanı yoksa ya da hata verirse: eski davranış (doğrudan e-posta), site çalışmaya devam eder.
 */
export async function submitReservation(
  data: ReservationInput,
  meta: { unitSlug: string; locale: Locale; consent: boolean },
): Promise<SubmitResult> {
  if (!data.checkin || !data.checkout || !data.name.trim() || !data.phone.trim()) {
    return { ok: false, error: "required" };
  }

  const db = getDb();
  if (db) {
    try {
      const { reservation, outboxId, pushOutboxId } = await createReservation(db, {
        ...data,
        unit: meta.unitSlug,
        locale: meta.locale,
        consent: meta.consent as true,
      });
      const handlers = {
        email: sendNotificationEmail,
        push: (m: PushMessage) => sendPushToStaff(db, m),
      };
      const [delivery] = await Promise.all([
        deliverOutboxMessage(db, outboxId, handlers),
        deliverOutboxMessage(db, pushOutboxId, handlers),
      ]);
      // Yanıt döndükten sonra: daha önce başarısız olmuş bildirimleri tekrar dene.
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
