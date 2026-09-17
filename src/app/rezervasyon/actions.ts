"use server";

import { reservationSummary, type ReservationInput } from "@/lib/reservation";

export type SubmitResult = { ok: boolean; error?: string; emailed?: boolean };

/**
 * Rezervasyon talebini işler.
 * - Zorunlu alanları doğrular.
 * - RESEND_API_KEY tanımlıysa aileye e-posta gönderir (opsiyonel; sonradan eklenebilir).
 * - E-posta olmasa da talep WhatsApp'tan iletilir (istemci tarafı).
 */
export async function submitReservation(
  data: ReservationInput,
): Promise<SubmitResult> {
  if (
    !data.checkin ||
    !data.checkout ||
    !data.name.trim() ||
    !data.phone.trim()
  ) {
    return { ok: false, error: "Lütfen tarih, ad ve telefon alanlarını doldur." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.RESERVATION_EMAIL || "sadikemreikiz90@gmail.com";
  let emailed = false;

  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Trysa <onboarding@resend.dev>",
          to: [to],
          subject: `Yeni rezervasyon talebi — ${data.name}`,
          text: reservationSummary(data),
        }),
      });
      emailed = res.ok;
    } catch {
      emailed = false;
    }
  }

  return { ok: true, emailed };
}
