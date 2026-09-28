/**
 * Aileye bildirim e-postası (Resend). Anahtar yoksa gönderim denenmez.
 * Ücretsiz modda gönderim sadece Resend hesabının kayıtlı adresine yapılabilir.
 */
export type EmailResult = { ok: true } | { ok: false; error: string };

export async function sendNotificationEmail(
  subject: string,
  text: string,
): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.RESERVATION_EMAIL || "sadikemreikiz90@gmail.com";
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY tanımlı değil" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: "Trysa <onboarding@resend.dev>", to: [to], subject, text }),
    });
    if (res.ok) return { ok: true };
    return { ok: false, error: `Resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
