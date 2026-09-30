import type { Metadata } from "next";
import { locales, type Locale } from "@/i18n-config";

// Site adresi (canlıda NEXT_PUBLIC_SITE_URL ile de ayarlı).
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://trysacamping.com";

/** Google İşletme Profili'ndeki adla birebir aynı olmalı (arama eşleşmesi için). */
export const BUSINESS_NAME = "Trysa Restaurant Camping";

/** Ana sayfa başlığı ve arama sonucu açıklaması (sayfa metadata'sı ve yapısal veri aynısını kullanır). */
export const HOME_TITLE: Record<Locale, string> = {
  tr: "Trysa Restaurant Camping — Demre'de doğada konaklama & ocakbaşı",
  en: "Trysa Restaurant Camping — Nature stay & grill in Demre, Antalya",
  de: "Trysa Restaurant Camping — Natur, Unterkunft & Grill in Demre",
};
export const HOME_DESCRIPTION: Record<Locale, string> = {
  tr: "Trysa Restaurant Camping, Demre: ahşap odalar, tiny house, kamp & karavan alanı ve ocakbaşı restoran — antik Trysa'nın eteğinde, yıl boyu açık.",
  en: "Trysa Restaurant Camping in Demre, Antalya: wooden rooms, a tiny house, a camping & caravan area and a grill restaurant below ancient Trysa. Open all year.",
  de: "Trysa Restaurant Camping in Demre, Antalya: Holzzimmer, Tiny House, Camping- & Wohnmobilplatz und Grillrestaurant am antiken Trysa. Ganzjährig geöffnet.",
};

/** Google İşletme Profili (Place ID ile) — yapısal veride site ↔ profil bağı. */
export const GOOGLE_MAPS_URL = "https://maps.google.com/?cid=1839563921786307451";

// Google'a görünürlük: launch'ta SITE_INDEXABLE=true yap (Vercel env) → indexlenir.
// Şimdilik kapalı (staging Google'da çıkmasın).
export const SITE_INDEXABLE = process.env.SITE_INDEXABLE === "true";

/**
 * Sayfanın kendi adresi (canonical) ve dil alternatifleri (hreflang). Her sayfa kendi
 * adresini vermeli; yoksa düzenin ana sayfa adresi kalır ve Google alt sayfayı ana sayfanın
 * kopyası sanar. Dil eşleşmeyen ziyaretçiler için varsayılan (x-default) İngilizce.
 */
export function pageAlternates(lang: Locale, path: string) {
  return {
    canonical: `/${lang}${path}`,
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, `/${l}${path}`])),
      "x-default": `/en${path}`,
    },
  };
}

/** Paylaşım önizlemesi (WhatsApp, Facebook…) için ortak alanlar; alt sayfalar başlık/adres ekler. */
export function openGraphBase(lang: Locale) {
  return {
    siteName: BUSINESS_NAME,
    locale: lang === "tr" ? "tr_TR" : lang === "de" ? "de_DE" : "en_US",
    type: "website" as const,
    // Paylaşım kartı (WhatsApp, Facebook…): logo + isim + kulübe fotoğrafı, 1200x630
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Trysa Restaurant Camping" }],
  };
}

/** Alt sayfa metadata'sı: başlık, açıklama, kendi adresi, dil alternatifleri, paylaşım önizlemesi. */
export function pageMetadata(lang: Locale, path: string, m: { title: string; description?: string }): Metadata {
  return {
    title: m.title,
    description: m.description,
    alternates: pageAlternates(lang, path),
    openGraph: {
      ...openGraphBase(lang),
      title: `${m.title} · Trysa`,
      description: m.description,
      url: `${SITE_URL}/${lang}${path}`,
    },
  };
}
