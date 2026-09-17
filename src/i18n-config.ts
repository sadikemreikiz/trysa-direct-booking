// Dil ayarı — hem sunucu hem istemci bileşenlerinden güvenle kullanılır (server-only DEĞİL).
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
