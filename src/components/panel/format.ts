/** Panelde tarih ve süre gösterimi (Türkçe, dayının okuyacağı biçimde). */

const dayFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  weekday: "short",
  timeZone: "UTC",
});

export function formatDay(iso: string): string {
  return dayFmt.format(new Date(iso));
}

export function nights(checkIn: string, checkOut: string): number {
  return Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86_400_000);
}

export function timeAgo(date: Date, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000));
  if (minutes < 1) return "az önce";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  return `${Math.round(hours / 24)} gün önce`;
}

/** Bu kadar süredir cevapsız bekleyen talep kırmızıyla vurgulanır. */
export const SLOW_RESPONSE_MS = 3 * 60 * 60 * 1000;

export const localeFlag: Record<string, string> = { tr: "🇹🇷", en: "🇬🇧", de: "🇩🇪" };
