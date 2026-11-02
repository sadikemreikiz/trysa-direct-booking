/**
 * Computes availability from Airbnb iCal calendars.
 * Goal: prevent double bookings on the site. A date is blocked only when ALL units of that
 * type are taken (so guests aren't turned away by mistake while a room is free).
 * Note: iCal sync is not instant (Airbnb's export lags; we read it every 15 minutes).
 * Env variables (comma-separated .ics links, SECRET, never committed):
 * Each room is separate: a single unit with its own env key.
 *   AIRBNB_ICAL_AMBAR1/2/3, AIRBNB_ICAL_KULUBE1/2, AIRBNB_ICAL_TINY
 *
 * A calendar that can't be read is reported as such (null), never as an empty one: the caller
 * falls back to the last calendar read successfully (features/airbnb-sync/calendar-store).
 */

import type { CheckResult } from "@/features/monitoring/health";

type TypeConfig = { total: number; envKey: string };

// Room (booking option) → env key (each room is a single unit)
const TYPE_CONFIG: Record<string, TypeConfig> = {
  "Ambar-1": { total: 1, envKey: "AIRBNB_ICAL_AMBAR1" },
  "Ambar-2": { total: 1, envKey: "AIRBNB_ICAL_AMBAR2" },
  "Ambar-3": { total: 1, envKey: "AIRBNB_ICAL_AMBAR3" },
  "Kulübe-1": { total: 1, envKey: "AIRBNB_ICAL_KULUBE1" },
  "Kulübe-2": { total: 1, envKey: "AIRBNB_ICAL_KULUBE2" },
  "Tiny House": { total: 1, envKey: "AIRBNB_ICAL_TINY" },
};

/** How often the Airbnb calendar is re-read (also shown in the panel calendar). */
export const AIRBNB_REFRESH_SECONDS = 15 * 60;

function urlsFor(envKey: string): string[] {
  return (process.env[envKey] || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toISO(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

/**
 * The taken days (YYYY-MM-DD) in an .ics file, or null when the text isn't a calendar
 * (Airbnb sometimes answers with a web page, e.g. a sign-in page, and a 200 status).
 */
export function parseBookedDays(text: string): Set<string> | null {
  if (!text.includes("BEGIN:VCALENDAR")) return null;
  const set = new Set<string>();
  let start: string | null = null;
  let end: string | null = null;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("BEGIN:VEVENT")) {
      start = null;
      end = null;
    } else if (line.startsWith("DTSTART")) {
      const m = line.match(/(\d{8})/);
      if (m) start = toISO(m[1]);
    } else if (line.startsWith("DTEND")) {
      const m = line.match(/(\d{8})/);
      if (m) end = toISO(m[1]);
    } else if (line.startsWith("END:VEVENT") && start && end) {
      let d = new Date(`${start}T00:00:00Z`);
      const last = new Date(`${end}T00:00:00Z`); // checkout day excluded
      while (d < last) {
        set.add(d.toISOString().slice(0, 10));
        d = new Date(d.getTime() + 86_400_000);
      }
    }
  }
  return set;
}

type Reading = { days: Set<string> } | { error: string };

/** Reads one .ics link: its taken days, or why it couldn't be read. */
async function readCalendar(
  url: string,
  fetchImpl: typeof fetch,
  init: RequestInit & { next?: { revalidate: number } },
): Promise<Reading> {
  try {
    const res = await fetchImpl(url, init);
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const days = parseBookedDays(await res.text());
    return days ? { days } : { error: "not a calendar" };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** Days taken in EVERY unit of a type (= the type is fully booked), or the first read error. */
function lockedDays(readings: Reading[]): { days: string[] } | { error: string } {
  const failed = readings.find((r): r is { error: string } => "error" in r);
  if (failed) return failed;
  const [first, ...rest] = readings.map((r) => (r as { days: Set<string> }).days);
  return { days: [...first].filter((day) => rest.every((s) => s.has(day))).sort() };
}

/** Rooms whose units all have a calendar link (otherwise a room may be free: no blocking). */
function connectedRooms(): [string, string[]][] {
  return Object.entries(TYPE_CONFIG).flatMap(([room, cfg]) => {
    const urls = urlsFor(cfg.envKey);
    return urls.length > 0 && urls.length >= cfg.total ? [[room, urls] as [string, string[]]] : [];
  });
}

/**
 * The BLOCKED days of each accommodation type, read through the 15-minute cache: null for a
 * room whose calendar couldn't be read just now. Rooms without a calendar link get [].
 */
export async function readLockedDatesByType(
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, string[] | null>> {
  const out: Record<string, string[] | null> = Object.fromEntries(
    Object.keys(TYPE_CONFIG).map((room) => [room, []]),
  );
  await Promise.all(
    connectedRooms().map(async ([room, urls]) => {
      // Airbnb updates its own export with a delay too; we read it at least every 15 minutes.
      const init = { next: { revalidate: AIRBNB_REFRESH_SECONDS } };
      const result = lockedDays(
        await Promise.all(urls.map((u) => readCalendar(u, fetchImpl, init))),
      );
      out[room] = "days" in result ? result.days : null;
    }),
  );
  return out;
}

/**
 * Reads every connected Airbnb calendar fresh (bypassing the cache), for the scheduled job:
 * its health check, and the copy of each calendar kept for when Airbnb can't be read.
 */
export async function checkAirbnbCalendars(
  fetchImpl: typeof fetch = fetch,
): Promise<{ room: string; result: CheckResult; days?: string[] }[]> {
  return Promise.all(
    connectedRooms().map(async ([room, urls]) => {
      const init = { cache: "no-store" as const, signal: AbortSignal.timeout(10_000) };
      const result = lockedDays(
        await Promise.all(urls.map((u) => readCalendar(u, fetchImpl, init))),
      );
      return "days" in result
        ? { room, result: { ok: true as const }, days: result.days }
        : { room, result: { ok: false as const, error: result.error } };
    }),
  );
}

/** Is there a blocked day in the chosen [check-in, checkout) range? */
export function rangeHasLockedDay(
  checkin: string,
  checkout: string,
  lockedDates: string[],
): boolean {
  if (!checkin || !checkout || checkout <= checkin || lockedDates.length === 0) return false;
  const set = new Set(lockedDates);
  let d = new Date(`${checkin}T00:00:00Z`);
  const end = new Date(`${checkout}T00:00:00Z`);
  while (d < end) {
    if (set.has(d.toISOString().slice(0, 10))) return true;
    d = new Date(d.getTime() + 86_400_000);
  }
  return false;
}
