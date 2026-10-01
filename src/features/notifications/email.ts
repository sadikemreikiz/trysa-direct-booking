/**
 * Email (Resend). Without a key nothing is sent.
 * - Without RESEND_FROM: sent from Resend's test address, which on the free tier can ONLY reach
 *   the account's own address (the family) → guest emails are off.
 * - With RESEND_FROM (a domain verified in Resend, e.g. "Trysa <rezervasyon@trysacamping.com>"):
 *   guests also get a "we got your request" email in their language.
 */
import { PRIVACY_CONTACT } from "@/content/privacy";

export type EmailResult = { ok: true } | { ok: false; error: string };

const FALLBACK_FROM = "Trysa <onboarding@resend.dev>";

function familyAddress(): string {
  return process.env.RESERVATION_EMAIL || PRIVACY_CONTACT;
}

/** Can we email guests? (needs a sender on a verified domain) */
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
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY is not set" };

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

/** New request notification to the family. */
export function sendNotificationEmail(subject: string, text: string): Promise<EmailResult> {
  return sendEmail({ to: familyAddress(), subject, text });
}

/** Email to the guest; replies go to the family. */
export function sendGuestEmail(
  to: string,
  subject: string,
  text: string,
  html?: string,
): Promise<EmailResult> {
  if (!guestEmailEnabled()) return Promise.resolve({ ok: false, error: "RESEND_FROM is not set" });
  return sendEmail({ to, subject, text, html, replyTo: familyAddress() });
}
