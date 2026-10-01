import type { Metadata } from "next";
import { locales, type Locale } from "./i18n";

// Site URL (also set via NEXT_PUBLIC_SITE_URL in production).
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://trysacamping.com";

/** Must match the name on the Google Business Profile exactly (for search matching). */
export const BUSINESS_NAME = "Trysa Restaurant Camping";

/** Home page title and search result description (page metadata and structured data share them). */
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

/** Google Business Profile (by Place ID): the site ↔ profile link in structured data. */
export const GOOGLE_MAPS_URL = "https://maps.google.com/?cid=1839563921786307451";

// Search visibility: set SITE_INDEXABLE=true (Vercel env) at launch → gets indexed.
// Off otherwise (so staging doesn't show up on Google).
export const SITE_INDEXABLE = process.env.SITE_INDEXABLE === "true";

/**
 * The page's own URL (canonical) and language alternates (hreflang). Every page must give its
 * own URL; otherwise the layout's home URL stays and Google treats the subpage as a copy of the
 * home page. The default (x-default) for visitors with no matching language is English.
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

/** Shared fields for link previews (WhatsApp, Facebook…); subpages add title/URL. */
export function openGraphBase(lang: Locale) {
  return {
    siteName: BUSINESS_NAME,
    locale: lang === "tr" ? "tr_TR" : lang === "de" ? "de_DE" : "en_US",
    type: "website" as const,
    // Share card (WhatsApp, Facebook…): logo + name + cabin photo, 1200x630
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "Trysa Restaurant Camping" }],
  };
}

/** Subpage metadata: title, description, own URL, language alternates, link preview. */
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
