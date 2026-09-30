/**
 * Misafire kendi dilinde "talebini aldık" e-postası. Bu henüz ONAY değildir; aile
 * müsaitliği teyit edince misafire WhatsApp/telefonla döner (bkz. lib/whatsapp).
 */
import { site } from "./site";

type Locale = "tr" | "en" | "de";

export type GuestAckVars = {
  guestName: string;
  reference: string;
  checkIn: string;
  checkOut: string;
  unitName: string | null;
  locale: string;
};

function formatRange(checkIn: string, checkOut: string, locale: Locale): string {
  const fmt = new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${fmt.format(new Date(checkIn))} – ${fmt.format(new Date(checkOut))}`;
}

const TEMPLATES: Record<Locale, (v: { name: string; ref: string; dates: string; unit: string }) => { subject: string; lines: string[] }> = {
  tr: (v) => ({
    subject: `Talebini aldık — ${v.ref} · Trysa`,
    lines: [
      `Merhaba ${v.name},`,
      "",
      "Rezervasyon talebin bize ulaştı, teşekkürler! 🌿",
      "",
      `Talep kodu: ${v.ref}`,
      `Tarih: ${v.dates}`,
      `Konaklama: ${v.unit || "Henüz seçilmedi"}`,
      "",
      "Bu henüz bir onay değil: müsaitliği kontrol edip en kısa sürede sana telefon ya da WhatsApp'tan döneceğiz.",
      `Acelen varsa bize WhatsApp'tan yazabilirsin: ${site.whatsapp}`,
      "",
      "Görüşmek üzere,",
      "Trysa Restaurant Camping · Demre",
    ],
  }),
  en: (v) => ({
    subject: `We've received your request — ${v.ref} · Trysa`,
    lines: [
      `Hello ${v.name},`,
      "",
      "Thank you, your booking request has reached us! 🌿",
      "",
      `Request code: ${v.ref}`,
      `Dates: ${v.dates}`,
      `Stay: ${v.unit || "Not chosen yet"}`,
      "",
      "This is not a confirmation yet: we'll check availability and get back to you by phone or WhatsApp as soon as possible.",
      `In a hurry? Message us on WhatsApp: ${site.whatsapp}`,
      "",
      "See you soon,",
      "Trysa Restaurant Camping · Demre, Turkey",
    ],
  }),
  de: (v) => ({
    subject: `Wir haben deine Anfrage erhalten — ${v.ref} · Trysa`,
    lines: [
      `Hallo ${v.name},`,
      "",
      "Danke, deine Buchungsanfrage ist bei uns angekommen! 🌿",
      "",
      `Anfrage-Code: ${v.ref}`,
      `Zeitraum: ${v.dates}`,
      `Unterkunft: ${v.unit || "Noch nicht gewählt"}`,
      "",
      "Das ist noch keine Bestätigung: Wir prüfen die Verfügbarkeit und melden uns so schnell wie möglich per Telefon oder WhatsApp.",
      `Eilig? Schreib uns auf WhatsApp: ${site.whatsapp}`,
      "",
      "Bis bald,",
      "Trysa Restaurant Camping · Demre, Türkei",
    ],
  }),
};

export function buildGuestAck(v: GuestAckVars): { subject: string; text: string } {
  const locale: Locale = v.locale === "en" || v.locale === "de" ? v.locale : "tr";
  const { subject, lines } = TEMPLATES[locale]({
    name: v.guestName.trim().split(/\s+/)[0] ?? v.guestName,
    ref: v.reference,
    dates: formatRange(v.checkIn, v.checkOut, locale),
    unit: v.unitName ?? "",
  });
  return { subject, text: lines.join("\n") };
}
