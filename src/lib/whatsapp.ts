/**
 * Panelden misafire WhatsApp: numarayı wa.me biçimine çevirir, misafirin dilinde
 * hazır mesaj üretir. Dayı sadece "gönder"e basar.
 */

/** "0555 111 22 33" → "905551112233", "+49 170 1234567" → "491701234567" */
export function toWhatsAppNumber(phone: string): string {
  const trimmed = phone.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  if (trimmed.startsWith("+")) return digits;
  if (digits.startsWith("0") && digits.length === 11) digits = "9" + digits; // TR: 0 5xx → 90 5xx
  else if (digits.length === 10 && digits.startsWith("5")) digits = "90" + digits; // TR: 5xx
  return digits;
}

export type MessageKind = "reply" | "confirmed" | "declined";
type Locale = "tr" | "en" | "de";

function formatRange(checkIn: string, checkOut: string, locale: Locale): string {
  const fmt = new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return `${fmt.format(new Date(checkIn))} – ${fmt.format(new Date(checkOut))}`;
}

const TEMPLATES: Record<Locale, Record<MessageKind, (v: Vars) => string>> = {
  tr: {
    reply: (v) =>
      `Merhaba ${v.name}, Trysa'dan yazıyoruz 🌿 ${v.dates} tarihleri için rezervasyon talebinizi (${v.ref}) aldık.`,
    confirmed: (v) =>
      `Merhaba ${v.name}, ${v.dates} tarihleri için ${v.unit} rezervasyonunuz onaylandı ✅ (${v.ref}). Sizi ağırlamayı dört gözle bekliyoruz! — Trysa`,
    declined: (v) =>
      `Merhaba ${v.name}, ${v.dates} tarihleri için maalesef yerimiz dolu 🙏 Farklı tarihlerde yardımcı olmaktan memnuniyet duyarız. — Trysa`,
  },
  en: {
    reply: (v) =>
      `Hello ${v.name}, this is Trysa 🌿 We've received your booking request (${v.ref}) for ${v.dates}.`,
    confirmed: (v) =>
      `Hello ${v.name}, your stay in ${v.unit} for ${v.dates} is confirmed ✅ (${v.ref}). We look forward to welcoming you! — Trysa`,
    declined: (v) =>
      `Hello ${v.name}, unfortunately we're fully booked for ${v.dates} 🙏 We'd be happy to help with other dates. — Trysa`,
  },
  de: {
    reply: (v) =>
      `Hallo ${v.name}, hier ist Trysa 🌿 Wir haben deine Buchungsanfrage (${v.ref}) für ${v.dates} erhalten.`,
    confirmed: (v) =>
      `Hallo ${v.name}, dein Aufenthalt in ${v.unit} vom ${v.dates} ist bestätigt ✅ (${v.ref}). Wir freuen uns auf dich! — Trysa`,
    declined: (v) =>
      `Hallo ${v.name}, leider sind wir vom ${v.dates} ausgebucht 🙏 Gerne helfen wir dir mit anderen Terminen. — Trysa`,
  },
};

type Vars = { name: string; dates: string; ref: string; unit: string };

export function guestMessage(
  kind: MessageKind,
  r: { guestName: string; checkIn: string; checkOut: string; reference: string; locale: string },
  unitName: string | null,
): string {
  const locale: Locale = r.locale === "en" || r.locale === "de" ? r.locale : "tr";
  const firstName = r.guestName.trim().split(/\s+/)[0] ?? r.guestName;
  return TEMPLATES[locale][kind]({
    name: firstName,
    dates: formatRange(r.checkIn, r.checkOut, locale),
    ref: r.reference,
    unit: unitName ?? "",
  });
}

export function whatsAppLink(phone: string, text: string): string {
  return `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(text)}`;
}
