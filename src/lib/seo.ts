import type { Metadata } from "next";
import { locales, type Locale } from "@/i18n-config";

// Site adresi (canlıda NEXT_PUBLIC_SITE_URL ile de ayarlı).
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://trysacamping.com";

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
    siteName: "Trysa",
    locale: lang === "tr" ? "tr_TR" : lang === "de" ? "de_DE" : "en_US",
    type: "website" as const,
    images: [{ url: "/img/hero.jpg", width: 1200, height: 900, alt: "Trysa" }],
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
