/**
 * Emails to guests, in their language, along the stay:
 *   1. ack: "we got your request" (not a confirmation yet)
 *   2. confirmed: the family confirmed the booking in the panel
 *   3. prearrival: the day before arrival, with directions and arrival times
 *   4. review: the day after check-out, only if the guest opted in on the form
 * Every email is built once as plain text and once as branded HTML from the same content
 * (email clients with images off show the plain text). Facts such as arrival times come
 * from the site's FAQ, so the emails never promise more than the site does.
 */
import { place, site } from "@/content/site";
import { SITE_URL } from "@/lib/seo";

type Locale = "tr" | "en" | "de";
export type GuestEmailKind = "ack" | "confirmed" | "prearrival" | "review";

export type GuestEmailVars = {
  guestName: string;
  reference: string;
  checkIn: string;
  checkOut: string;
  unitName: string | null;
  adults: number;
  children: number;
  locale: string;
};

export type GuestEmail = { subject: string; text: string; html: string };

type Button = { href: string; label: string; color: string };

type Content = {
  subject: string;
  hello: string;
  intro: string;
  details: [label: string, value: string][];
  paragraphs: string[];
  buttons: Button[];
  bye: string;
  footnote?: string;
};

type Vars = {
  name: string;
  ref: string;
  dates: string;
  unit: string;
  guests: string;
  directions: string;
  menu: string;
  review: string;
};

const CLAY = "#ad5426";
const WHATSAPP = "#0f8040";
const PINE = "#2c3a2e";

const SIGNATURE: Record<Locale, string> = {
  tr: "Trysa Restaurant Camping · Demre",
  en: "Trysa Restaurant Camping · Demre, Turkey",
  de: "Trysa Restaurant Camping · Demre, Türkei",
};

const ARRIVAL: Record<Locale, string> = {
  tr: "Çıkış saati 12:00. Girişte esneğiz: gün içinde, akşam 21–22'ye kadar gelebilirsin. Başka bir saat gerekirse yazman yeterli.",
  en: "Check-out is at 12:00. Check-in is flexible: any time during the day, even around 9–10 pm. Need another time? Just send us a message.",
  de: "Abreise bis 12:00 Uhr. Bei der Anreise sind wir flexibel: jederzeit tagsüber, auch abends gegen 21–22 Uhr. Brauchst du eine andere Zeit? Schreib uns einfach.",
};

const TEMPLATES: Record<Locale, Record<GuestEmailKind, (v: Vars) => Content>> = {
  tr: {
    ack: (v) => ({
      subject: `Talebini aldık — ${v.ref} · Trysa`,
      hello: `Merhaba ${v.name},`,
      intro: "Rezervasyon talebin bize ulaştı, teşekkürler! 🌿",
      details: [
        ["Talep kodu", v.ref],
        ["Tarih", v.dates],
        ["Konaklama", v.unit || "Henüz seçilmedi"],
      ],
      paragraphs: [
        "Bu henüz bir onay değil: müsaitliği kontrol edip en kısa sürede sana telefon ya da WhatsApp'tan döneceğiz.",
      ],
      buttons: [whatsapp("WhatsApp'tan yaz"), directions(v, "Yol tarifi")],
      bye: "Görüşmek üzere,",
    }),
    confirmed: (v) => ({
      subject: `Rezervasyonun onaylandı — ${v.ref} · Trysa`,
      hello: `Merhaba ${v.name},`,
      intro: "Güzel haber: rezervasyonun onaylandı, seni bekliyoruz! 🌿",
      details: [
        ["Rezervasyon kodu", v.ref],
        ["Tarih", v.dates],
        ["Konaklama", v.unit],
        ["Kişi", v.guests],
      ],
      paragraphs: [
        ARRIVAL.tr,
        "Bir değişiklik ya da iptal gerekirse WhatsApp'tan veya telefonla bize ulaşman yeterli.",
      ],
      buttons: [directions(v, "Yol tarifi"), whatsapp("WhatsApp'tan yaz")],
      bye: "Görüşmek üzere,",
    }),
    prearrival: (v) => ({
      subject: "Yarın görüşüyoruz — yol tarifi ve giriş bilgileri · Trysa",
      hello: `Merhaba ${v.name},`,
      intro: "Yarın geliyorsun, seni görmek için sabırsızlanıyoruz! 🌿",
      details: [
        ["Rezervasyon kodu", v.ref],
        ["Tarih", v.dates],
        ["Konaklama", v.unit],
      ],
      paragraphs: [
        `Bizi bulmak için aşağıdaki yol tarifi düğmesine dokun ya da Google Haritalar'a "${place.plusCode}" yaz.`,
        ARRIVAL.tr,
        `Akşam yemeği için restoranımız da tesiste: ${v.menu}`,
      ],
      buttons: [directions(v, "Yol tarifi"), whatsapp("WhatsApp'tan yaz")],
      bye: "Yarın görüşmek üzere,",
    }),
    review: (v) => ({
      subject: "Trysa'da konaklaman nasıldı?",
      hello: `Merhaba ${v.name},`,
      intro: "Bizi tercih ettiğin için teşekkürler, umarız keyifli bir konaklama geçirdin. 🌿",
      details: [],
      paragraphs: [
        "Küçük bir aile işletmesiyiz. Bir dakikanı ayırıp Google'da deneyimini yazarsan, Trysa'yı arayan diğer misafirlere çok yardımcı olursun.",
      ],
      buttons: [{ href: v.review, label: "Google'da yorum yaz", color: CLAY }],
      bye: "Tekrar görüşmek dileğiyle,",
      footnote:
        "Bu e-postayı, rezervasyon formunda izin verdiğin için aldın. Bu konuda başka e-posta göndermeyeceğiz.",
    }),
  },
  en: {
    ack: (v) => ({
      subject: `We've received your request — ${v.ref} · Trysa`,
      hello: `Hello ${v.name},`,
      intro: "Thank you, your booking request has reached us! 🌿",
      details: [
        ["Request code", v.ref],
        ["Dates", v.dates],
        ["Stay", v.unit || "Not chosen yet"],
      ],
      paragraphs: [
        "This is not a confirmation yet: we'll check availability and get back to you by phone or WhatsApp as soon as possible.",
      ],
      buttons: [whatsapp("Message us on WhatsApp"), directions(v, "Directions")],
      bye: "See you soon,",
    }),
    confirmed: (v) => ({
      subject: `Your booking is confirmed — ${v.ref} · Trysa`,
      hello: `Hello ${v.name},`,
      intro: "Good news: your booking is confirmed, we're looking forward to welcoming you! 🌿",
      details: [
        ["Booking code", v.ref],
        ["Dates", v.dates],
        ["Stay", v.unit],
        ["Guests", v.guests],
      ],
      paragraphs: [
        ARRIVAL.en,
        "If you need to change or cancel anything, just message us on WhatsApp or give us a call.",
      ],
      buttons: [directions(v, "Directions"), whatsapp("Message us on WhatsApp")],
      bye: "See you soon,",
    }),
    prearrival: (v) => ({
      subject: "See you tomorrow — directions and arrival details · Trysa",
      hello: `Hello ${v.name},`,
      intro: "You're arriving tomorrow, we can't wait to welcome you! 🌿",
      details: [
        ["Booking code", v.ref],
        ["Dates", v.dates],
        ["Stay", v.unit],
      ],
      paragraphs: [
        `To find us, tap the directions button below or type "${place.plusCode}" into Google Maps.`,
        ARRIVAL.en,
        `Our restaurant is right on site for dinner: ${v.menu}`,
      ],
      buttons: [directions(v, "Directions"), whatsapp("Message us on WhatsApp")],
      bye: "See you tomorrow,",
    }),
    review: (v) => ({
      subject: "How was your stay at Trysa?",
      hello: `Hello ${v.name},`,
      intro: "Thank you for staying with us, we hope you had a lovely time. 🌿",
      details: [],
      paragraphs: [
        "We're a small family business. If you have a minute to share your experience on Google, it really helps other travellers find Trysa.",
      ],
      buttons: [{ href: v.review, label: "Write a review on Google", color: CLAY }],
      bye: "Hope to see you again,",
      footnote:
        "You're receiving this because you agreed to it on the booking form. We won't email you about this again.",
    }),
  },
  de: {
    ack: (v) => ({
      subject: `Wir haben deine Anfrage erhalten — ${v.ref} · Trysa`,
      hello: `Hallo ${v.name},`,
      intro: "Danke, deine Buchungsanfrage ist bei uns angekommen! 🌿",
      details: [
        ["Anfrage-Code", v.ref],
        ["Zeitraum", v.dates],
        ["Unterkunft", v.unit || "Noch nicht gewählt"],
      ],
      paragraphs: [
        "Das ist noch keine Bestätigung: Wir prüfen die Verfügbarkeit und melden uns so schnell wie möglich per Telefon oder WhatsApp.",
      ],
      buttons: [whatsapp("Auf WhatsApp schreiben"), directions(v, "Anfahrt")],
      bye: "Bis bald,",
    }),
    confirmed: (v) => ({
      subject: `Deine Buchung ist bestätigt — ${v.ref} · Trysa`,
      hello: `Hallo ${v.name},`,
      intro: "Gute Nachricht: Deine Buchung ist bestätigt, wir freuen uns auf dich! 🌿",
      details: [
        ["Buchungscode", v.ref],
        ["Zeitraum", v.dates],
        ["Unterkunft", v.unit],
        ["Personen", v.guests],
      ],
      paragraphs: [
        ARRIVAL.de,
        "Wenn du etwas ändern oder stornieren musst, schreib uns einfach auf WhatsApp oder ruf uns an.",
      ],
      buttons: [directions(v, "Anfahrt"), whatsapp("Auf WhatsApp schreiben")],
      bye: "Bis bald,",
    }),
    prearrival: (v) => ({
      subject: "Bis morgen — Anfahrt und Anreise · Trysa",
      hello: `Hallo ${v.name},`,
      intro: "Morgen geht es los, wir freuen uns auf dich! 🌿",
      details: [
        ["Buchungscode", v.ref],
        ["Zeitraum", v.dates],
        ["Unterkunft", v.unit],
      ],
      paragraphs: [
        `Um uns zu finden, tippe unten auf „Anfahrt“ oder gib „${place.plusCode}“ in Google Maps ein.`,
        ARRIVAL.de,
        `Zum Abendessen ist unser Restaurant direkt vor Ort: ${v.menu}`,
      ],
      buttons: [directions(v, "Anfahrt"), whatsapp("Auf WhatsApp schreiben")],
      bye: "Bis morgen,",
    }),
    review: (v) => ({
      subject: "Wie war dein Aufenthalt bei Trysa?",
      hello: `Hallo ${v.name},`,
      intro: "Danke, dass du bei uns warst, wir hoffen, du hattest eine schöne Zeit. 🌿",
      details: [],
      paragraphs: [
        "Wir sind ein kleiner Familienbetrieb. Wenn du kurz deine Erfahrung auf Google teilst, hilft das anderen Reisenden sehr, Trysa zu finden.",
      ],
      buttons: [{ href: v.review, label: "Bewertung auf Google schreiben", color: CLAY }],
      bye: "Hoffentlich bis bald wieder,",
      footnote:
        "Du erhältst diese E-Mail, weil du im Buchungsformular zugestimmt hast. Dazu schreiben wir dir nicht noch einmal.",
    }),
  },
};

function whatsapp(label: string): Button {
  return { href: site.whatsapp, label, color: WHATSAPP };
}

function directions(v: Vars, label: string): Button {
  return { href: v.directions, label, color: CLAY };
}

const INTL: Record<Locale, string> = { tr: "tr-TR", en: "en-GB", de: "de-DE" };

function formatRange(checkIn: string, checkOut: string, locale: Locale): string {
  const fmt = new Intl.DateTimeFormat(INTL[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${fmt.format(new Date(checkIn))} – ${fmt.format(new Date(checkOut))}`;
}

function formatGuests(adults: number, children: number, locale: Locale): string {
  const words: Record<Locale, [adult: string, adults: string, child: string, children: string]> = {
    tr: ["yetişkin", "yetişkin", "çocuk", "çocuk"],
    en: ["adult", "adults", "child", "children"],
    de: ["Erwachsener", "Erwachsene", "Kind", "Kinder"],
  };
  const [a1, an, c1, cn] = words[locale];
  const parts = [`${adults} ${adults === 1 ? a1 : an}`];
  if (children > 0) parts.push(`${children} ${children === 1 ? c1 : cn}`);
  return parts.join(", ");
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function toText(c: Content, locale: Locale): string {
  return [
    c.hello,
    "",
    c.intro,
    ...(c.details.length ? ["", ...c.details.map(([k, v]) => `${k}: ${v}`)] : []),
    "",
    ...c.paragraphs.flatMap((p) => [p, ""]),
    ...c.buttons.map((b) => `${b.label}: ${b.href}`),
    "",
    c.bye,
    SIGNATURE[locale],
    ...(c.footnote ? ["", c.footnote] : []),
  ].join("\n");
}

/** Safe for email clients: table layout, inline styles, no external CSS. */
function toHtml(c: Content, locale: Locale): string {
  const rows = c.details
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#5f6358;font-size:14px">${esc(k)}</td><td style="padding:6px 0;color:${PINE};font-size:14px;font-weight:700;text-align:right">${esc(v)}</td></tr>`,
    )
    .join("");
  const details = rows
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e9e1cf;border-bottom:1px solid #e9e1cf;margin-bottom:16px">${rows}</table>`
    : "";
  const paragraphs = c.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#22271f">${esc(p)}</p>`,
    )
    .join("");
  const buttons = c.buttons
    .map(
      (b) =>
        `<a href="${esc(b.href)}" style="display:inline-block;background:${b.color};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 18px;border-radius:10px;margin:4px 6px 4px 0">${esc(b.label)}</a>`,
    )
    .join("");
  const footnote = c.footnote
    ? `<tr><td style="padding:0 4px 4px;font-size:12px;line-height:1.5;color:#5f6358;text-align:center">${esc(c.footnote)}</td></tr>`
    : "";
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f6f1e7;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#22271f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1e7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="padding:4px 4px 18px"><img src="${SITE_URL}/email-logo.png" width="200" height="46" alt="TRYSA · Restaurant · Camping" style="display:block;border:0"></td></tr>
<tr><td style="background:#ffffff;border-radius:16px;padding:24px 22px">
<p style="margin:0 0 6px;font-size:18px;font-weight:700;color:${PINE}">${esc(c.hello)}</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.5">${esc(c.intro)}</p>
${details}${paragraphs}
<div style="margin-top:4px">${buttons}</div>
<p style="margin:20px 0 0;font-size:14px;color:#5f6358">${esc(c.bye)}<br><b style="color:${PINE}">${esc(SIGNATURE[locale])}</b></p>
</td></tr>
<tr><td style="padding:14px 4px;font-size:12px;color:#5f6358;text-align:center"><a href="${SITE_URL}" style="color:#5f6358">trysacamping.com</a> · ${esc(site.phoneLabel)}</td></tr>
${footnote}
</table></td></tr></table></body></html>`;
}

export function buildGuestEmail(kind: GuestEmailKind, v: GuestEmailVars): GuestEmail {
  const locale: Locale = v.locale === "en" || v.locale === "de" ? v.locale : "tr";
  const content = TEMPLATES[locale][kind]({
    name: v.guestName.trim().split(/\s+/)[0] ?? v.guestName,
    ref: v.reference,
    dates: formatRange(v.checkIn, v.checkOut, locale),
    unit: v.unitName ?? "",
    guests: formatGuests(v.adults, v.children, locale),
    directions: `https://${place.shortLink[locale]}`,
    menu: `${SITE_URL}/${locale}/menu`,
    review: `${SITE_URL}/${locale === "tr" ? "yorum" : locale === "de" ? "bewertung" : "review"}`,
  });
  return {
    subject: content.subject,
    text: toText(content, locale),
    html: toHtml(content, locale),
  };
}

/** "We got your request" email (kept for callers that only send the first message). */
export function buildGuestAck(v: GuestEmailVars): GuestEmail {
  return buildGuestEmail("ack", v);
}
