/**
 * E-posta (Resend). Anahtar yoksa gönderim denenmez.
 * - RESEND_FROM yoksa: Resend'in test adresinden gönderilir ve ücretsiz modda SADECE hesabın
 *   kayıtlı adresine (aileye) gidebilir → misafire e-posta kapalıdır.
 * - RESEND_FROM varsa (alan adı Resend'de doğrulanmış, ör. "Trysa <rezervasyon@trysacamping.com>"):
 *   misafire de kendi dilinde "talebini aldık" e-postası gider.
 */
import { PRIVACY_CONTACT } from "./privacy";

export type EmailResult = { ok: true } | { ok: false; error: string };

const FALLBACK_FROM = "Trysa <onboarding@resend.dev>";

function familyAddress(): string {
  return process.env.RESERVATION_EMAIL || PRIVACY_CONTACT;
}

/** Misafire e-posta gönderilebilir mi? (alan adı doğrulanmış gönderen adresi gerekli) */
export function guestEmailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

async function sendEmail(message: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY tanımlı değil" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || FALLBACK_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Aileye yeni talep bildirimi. */
export function sendNotificationEmail(subject: string, text: string): Promise<EmailResult> {
  return sendEmail({ to: familyAddress(), subject, text });
}

/** Misafire e-posta; cevaplarsa aileye gider. */
export function sendGuestEmail(to: string, subject: string, text: string, html?: string): Promise<EmailResult> {
  if (!guestEmailEnabled()) return Promise.resolve({ ok: false, error: "RESEND_FROM tanımlı değil" });
  return sendEmail({ to, subject, text, html, replyTo: familyAddress() });
}
