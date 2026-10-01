/**
 * "We got your request" email to the guest in their language. This is NOT a confirmation yet;
 * the family gets back via WhatsApp/phone once availability is confirmed (see lib/whatsapp).
 * Both plain text and branded HTML are built from the same content (email clients with
 * images off show the plain text).
 */
import { SITE_URL } from "./seo";
import { place, site } from "./site";

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

type Content = {
  subject: string;
  hello: string;
  intro: string;
  details: [label: string, value: string][];
  notYet: string;
  whatsapp: string;
  directions: string;
  bye: string;
  signature: string;
};

type Vars = { name: string; ref: string; dates: string; unit: string };

const TEMPLATES: Record<Locale, (v: Vars) => Content> = {
  tr: (v) => ({
    subject: `Talebini aldık — ${v.ref} · Trysa`,
    hello: `Merhaba ${v.name},`,
    intro: "Rezervasyon talebin bize ulaştı, teşekkürler! 🌿",
    details: [
      ["Talep kodu", v.ref],
      ["Tarih", v.dates],
      ["Konaklama", v.unit || "Henüz seçilmedi"],
    ],
    notYet: "Bu henüz bir onay değil: müsaitliği kontrol edip en kısa sürede sana telefon ya da WhatsApp'tan döneceğiz.",
    whatsapp: "WhatsApp'tan yaz",
    directions: "Yol tarifi",
    bye: "Görüşmek üzere,",
    signature: "Trysa Restaurant Camping · Demre",
  }),
  en: (v) => ({
    subject: `We've received your request — ${v.ref} · Trysa`,
    hello: `Hello ${v.name},`,
    intro: "Thank you, your booking request has reached us! 🌿",
    details: [
      ["Request code", v.ref],
      ["Dates", v.dates],
      ["Stay", v.unit || "Not chosen yet"],
    ],
    notYet: "This is not a confirmation yet: we'll check availability and get back to you by phone or WhatsApp as soon as possible.",
    whatsapp: "Message us on WhatsApp",
    directions: "Directions",
    bye: "See you soon,",
    signature: "Trysa Restaurant Camping · Demre, Turkey",
  }),
  de: (v) => ({
    subject: `Wir haben deine Anfrage erhalten — ${v.ref} · Trysa`,
    hello: `Hallo ${v.name},`,
    intro: "Danke, deine Buchungsanfrage ist bei uns angekommen! 🌿",
    details: [
      ["Anfrage-Code", v.ref],
      ["Zeitraum", v.dates],
      ["Unterkunft", v.unit || "Noch nicht gewählt"],
    ],
    notYet: "Das ist noch keine Bestätigung: Wir prüfen die Verfügbarkeit und melden uns so schnell wie möglich per Telefon oder WhatsApp.",
    whatsapp: "Auf WhatsApp schreiben",
    directions: "Anfahrt",
    bye: "Bis bald,",
    signature: "Trysa Restaurant Camping · Demre, Türkei",
  }),
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function toText(c: Content, directionsLink: string): string {
  return [
    c.hello,
    "",
    c.intro,
    "",
    ...c.details.map(([k, v]) => `${k}: ${v}`),
    "",
    c.notYet,
    `${c.whatsapp}: ${site.whatsapp}`,
    `${c.directions}: ${directionsLink}`,
    "",
    c.bye,
    c.signature,
  ].join("\n");
}

/** Safe for email clients: table layout, inline styles, no external CSS. */
function toHtml(c: Content, directionsLink: string, lang: Locale): string {
  const pine = "#2c3a2e";
  const clay = "#c1622f";
  const rows = c.details
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#6b6f63;font-size:14px">${esc(k)}</td><td style="padding:6px 0;color:${pine};font-size:14px;font-weight:700;text-align:right">${esc(v)}</td></tr>`,
    )
    .join("");
  const button = (href: string, label: string, bg: string) =>
    `<a href="${esc(href)}" style="display:inline-block;background:${bg};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 18px;border-radius:10px;margin:4px 6px 4px 0">${esc(label)}</a>`;
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f6f1e7;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#22271f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1e7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="padding:4px 4px 18px"><img src="${SITE_URL}/email-logo.png" width="200" height="46" alt="TRYSA · Restaurant · Camping" style="display:block;border:0"></td></tr>
<tr><td style="background:#ffffff;border-radius:16px;padding:24px 22px">
<p style="margin:0 0 6px;font-size:18px;font-weight:700;color:${pine}">${esc(c.hello)}</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.5">${esc(c.intro)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e9e1cf;border-bottom:1px solid #e9e1cf;margin-bottom:16px">${rows}</table>
<p style="margin:0 0 18px;font-size:14px;line-height:1.55;color:#22271f">${esc(c.notYet)}</p>
${button(site.whatsapp, c.whatsapp, "#25d366")}${button(directionsLink, c.directions, clay)}
<p style="margin:20px 0 0;font-size:14px;color:#6b6f63">${esc(c.bye)}<br><b style="color:${pine}">${esc(c.signature)}</b></p>
</td></tr>
<tr><td style="padding:14px 4px;font-size:12px;color:#6b6f63;text-align:center"><a href="${SITE_URL}" style="color:#6b6f63">trysacamping.com</a> · ${esc(site.phoneLabel)}</td></tr>
</table></td></tr></table></body></html>`;
}

export function buildGuestAck(v: GuestAckVars): { subject: string; text: string; html: string } {
  const locale: Locale = v.locale === "en" || v.locale === "de" ? v.locale : "tr";
  const content = TEMPLATES[locale]({
    name: v.guestName.trim().split(/\s+/)[0] ?? v.guestName,
    ref: v.reference,
    dates: formatRange(v.checkIn, v.checkOut, locale),
    unit: v.unitName ?? "",
  });
  const directionsLink = `https://${place.shortLink[locale]}`;
  return { subject: content.subject, text: toText(content, directionsLink), html: toHtml(content, directionsLink, locale) };
}
