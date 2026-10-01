/**
 * Computes availability from Airbnb iCal calendars.
 * Goal: prevent double bookings on the site. A date is blocked only when ALL units of that
 * type are taken (so guests aren't turned away by mistake while a room is free).
 * Note: iCal sync is not instant (Airbnb's export lags; we read it every 15 minutes).
 * Env variables (comma-separated .ics links, SECRET, never committed):
 * Each room is separate: a single unit with its own env key.
 *   AIRBNB_ICAL_AMBAR1/2/3, AIRBNB_ICAL_KULUBE1/2, AIRBNB_ICAL_TINY
 */

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

/** Returns the taken days (YYYY-MM-DD) from a single .ics link. */
async function bookedSet(url: string): Promise<Set<string>> {
  const set = new Set<string>();
  try {
    // Airbnb updates its own export with a delay too; we read it at least every 15 minutes.
    const res = await fetch(url, { next: { revalidate: AIRBNB_REFRESH_SECONDS } });
    if (!res.ok) return set;
    const text = await res.text();
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
  } catch {
    /* empty if it can't be fetched */
  }
  return set;
}

/**
 * Returns the BLOCKED days for each accommodation type.
 * A date is blocked only if ALL units of the type are connected and all are taken that day.
 * If a unit is missing (e.g. 2 of 5 rooms connected) nothing is blocked, since a room may be free.
 */
export async function getLockedDatesByType(): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  await Promise.all(
    Object.entries(TYPE_CONFIG).map(async ([type, cfg]) => {
      const urls = urlsFor(cfg.envKey);
      // If not all units are connected we can't decide occupancy → no blocking.
      if (urls.length === 0 || urls.length < cfg.total) {
        out[type] = [];
        return;
      }
      const sets = await Promise.all(urls.map(bookedSet));
      const [first, ...rest] = sets;
      // Only days taken in EVERY unit = the type is fully booked
      out[type] = [...first].filter((day) => rest.every((s) => s.has(day))).sort();
    }),
  );
  return out;
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
