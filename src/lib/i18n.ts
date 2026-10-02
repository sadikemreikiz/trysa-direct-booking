// Locale config: safe to import from both server and client components (NOT server-only).
export const locales = ["tr", "en", "de"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "tr";

export const localeNames: Record<Locale, string> = {
  tr: "TR",
  en: "EN",
  de: "DE",
};

export function isLocale(x: string): x is Locale {
  return (locales as readonly string[]).includes(x);
}

/** For visitors who ask only for languages we don't offer (Russian, French...), as x-default says. */
export const fallbackLocale: Locale = "en";

/**
 * Picks the site language from an Accept-Language header, honouring q-values.
 * No usable header (crawlers, some apps) → the default; only other languages → the fallback.
 */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  const ranges = (acceptLanguage ?? "")
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      return { lang: tag.split("-")[0], q: q ? Number(q.slice(2)) : 1, index };
    })
    .filter((r) => r.lang && r.lang !== "*" && r.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  if (ranges.length === 0) return defaultLocale;
  return ranges.map((r) => r.lang).find(isLocale) ?? fallbackLocale;
}
