/** Today's date in the business's time zone (YYYY-MM-DD). */
export function todayInDemre(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(now);
}
