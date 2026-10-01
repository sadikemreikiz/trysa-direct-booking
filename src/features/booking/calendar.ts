/**
 * Date logic for the guest availability calendar. Everything works on ISO dates
 * (YYYY-MM-DD) in UTC, so there are no time zone or daylight-saving surprises;
 * "today" is passed in by the caller in the business's time zone.
 *
 * A booked day means the NIGHT starting that day is taken. A guest can therefore
 * check out on a booked day (they leave that morning) but cannot check in on it.
 */

import { addDays } from "@/lib/dates";

export const MAX_NIGHTS = 60;
/** How far ahead guests can browse; Airbnb exports about a year of calendar. */
export const MONTHS_AHEAD = 12;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type Range = { checkin: string; checkout: string };
export type YearMonth = { year: number; month: number }; // month: 0–11

export { addDays };

export function nightsBetween(checkin: string, checkout: string): number {
  return Math.round(
    (Date.parse(`${checkout}T00:00:00Z`) - Date.parse(`${checkin}T00:00:00Z`)) / 86_400_000,
  );
}

export function monthOf(iso: string): YearMonth {
  return { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) - 1 };
}

export function addMonths({ year, month }: YearMonth, n: number): YearMonth {
  const total = year * 12 + month + n;
  return { year: Math.floor(total / 12), month: total % 12 };
}

/** Months from `a` to `b` (negative if `b` is earlier). */
export function monthsBetween(a: YearMonth, b: YearMonth): number {
  return b.year * 12 + b.month - (a.year * 12 + a.month);
}

/** The weeks of a month, Monday first; cells outside the month are null. */
export function monthGrid({ year, month }: YearMonth): (string | null)[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * The latest check-out a guest can choose after `checkin`: the morning of the first
 * booked night, or the end of the longest allowed stay.
 */
export function lastCheckout(
  checkin: string,
  booked: ReadonlySet<string>,
  maxNights = MAX_NIGHTS,
): string {
  for (let i = 1; i < maxNights; i++) {
    const day = addDays(checkin, i);
    if (booked.has(day)) return day;
  }
  return addDays(checkin, maxNights);
}

function choosingCheckout(range: Range): boolean {
  return range.checkin !== "" && range.checkout === "";
}

/** Whether tapping `day` would end the current selection as its check-out. */
export function isCheckoutChoice(
  range: Range,
  day: string,
  booked: ReadonlySet<string>,
  maxNights = MAX_NIGHTS,
): boolean {
  return (
    choosingCheckout(range) &&
    day > range.checkin &&
    day <= lastCheckout(range.checkin, booked, maxNights)
  );
}

/** Whether tapping `day` does anything right now. */
export function isSelectable(
  range: Range,
  day: string,
  booked: ReadonlySet<string>,
  today: string,
  maxNights = MAX_NIGHTS,
): boolean {
  if (day < today) return false;
  return isCheckoutChoice(range, day, booked, maxNights) || !booked.has(day);
}

/**
 * The range after the guest taps `day`: the first tap sets check-in, the second sets
 * check-out if the stay is possible, otherwise the tap starts a new stay.
 */
export function pickDay(
  range: Range,
  day: string,
  booked: ReadonlySet<string>,
  today: string,
  maxNights = MAX_NIGHTS,
): Range {
  if (!isSelectable(range, day, booked, today, maxNights)) return range;
  if (isCheckoutChoice(range, day, booked, maxNights)) {
    return { checkin: range.checkin, checkout: day };
  }
  return { checkin: day, checkout: "" };
}

/**
 * Days on which every listed room is booked. Used when the guest hasn't chosen a
 * room: a date is only closed if no room at all is free.
 */
export function fullyBookedDays(lockedByRoom: Record<string, string[]>, rooms: string[]): string[] {
  if (rooms.length === 0) return [];
  const [first, ...rest] = rooms.map((room) => new Set(lockedByRoom[room] ?? []));
  return [...first].filter((day) => rest.every((set) => set.has(day))).sort();
}

/**
 * Dates passed in the URL (e.g. from the home page search bar). Anything invalid,
 * in the past or longer than the maximum stay is dropped.
 */
export function rangeFromParams(params: URLSearchParams, today: string): Range {
  const checkin = params.get("checkin") ?? "";
  const checkout = params.get("checkout") ?? "";
  if (!ISO_DATE.test(checkin) || checkin < today) return { checkin: "", checkout: "" };
  if (
    !ISO_DATE.test(checkout) ||
    checkout <= checkin ||
    nightsBetween(checkin, checkout) > MAX_NIGHTS
  ) {
    return { checkin, checkout: "" };
  }
  return { checkin, checkout };
}
