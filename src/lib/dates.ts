const BUSINESS_TIME_ZONE = "Europe/Istanbul";

/** Today's date in the business's time zone (YYYY-MM-DD). */
export function todayInDemre(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIME_ZONE }).format(now);
}

/** The hour (0–23) in the business's time zone. */
export function hourInDemre(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: BUSINESS_TIME_ZONE,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now),
  );
}

/** Adds days to an ISO date (YYYY-MM-DD), in UTC so daylight saving never shifts it. */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
