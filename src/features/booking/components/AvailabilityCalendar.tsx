"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Dict, Locale } from "@/content/dictionaries";
import {
  addDays,
  addMonths,
  isCheckoutChoice,
  isSelectable,
  monthGrid,
  monthOf,
  monthsBetween,
  MONTHS_AHEAD,
  nightsBetween,
  pickDay,
  type Range,
  type YearMonth,
} from "@/features/booking/calendar";

const intlLocale: Record<Locale, string> = { tr: "tr-TR", en: "en-GB", de: "de-DE" };
const A_MONDAY = "2026-10-05";

function formatDay(iso: string, lang: Locale, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(intlLocale[lang], { timeZone: "UTC", ...options }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

/** "Wed 14 Oct" in the guest's language, for summaries. */
export function shortDate(iso: string, lang: Locale): string {
  return formatDay(iso, lang, { weekday: "short", day: "numeric", month: "short" });
}

export function nightsLabel(nights: number, t: Dict): string {
  const r = t.reservation;
  return (nights === 1 ? r.calNightOne : r.calNightOther).replace("{n}", String(nights));
}

/** Same day of the month `n` months later, clamped to the length of that month. */
function shiftMonth(day: string, n: number): string {
  const target = addMonths(monthOf(day), n);
  const lastDay = new Date(Date.UTC(target.year, target.month + 1, 0)).getUTCDate();
  const dayOfMonth = Math.min(Number(day.slice(8, 10)), lastDay);
  return new Date(Date.UTC(target.year, target.month, dayOfMonth)).toISOString().slice(0, 10);
}

function firstOfMonth({ year, month }: YearMonth): string {
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

function lastOfMonth({ year, month }: YearMonth): string {
  return new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
}

/**
 * Date range picker that shows which nights are booked. One month on phones, two on
 * larger screens. Follows the WAI-ARIA date grid pattern: arrow keys move by day and
 * week, Home/End to the week's start and end, Page Up/Down by month, Enter selects.
 */
export default function AvailabilityCalendar({
  t,
  lang,
  today,
  booked,
  range,
  onChange,
  note,
}: {
  t: Dict;
  lang: Locale;
  /** Today in the business's time zone (YYYY-MM-DD). */
  today: string;
  /** Nights that are taken for the chosen room. */
  booked: ReadonlySet<string>;
  range: Range;
  onChange: (range: Range) => void;
  note?: string;
}) {
  const c = t.reservation;
  const id = useId();
  const firstMonth = monthOf(today);
  const lastMonth = addMonths(firstMonth, MONTHS_AHEAD - 1);
  const [view, setView] = useState<YearMonth>(() => monthOf(range.checkin || today));
  const [focusDay, setFocusDay] = useState(range.checkin || today);
  const [hover, setHover] = useState<string | null>(null);
  const focusAfterRender = useRef(false);
  const buttons = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (!focusAfterRender.current) return;
    focusAfterRender.current = false;
    buttons.current.get(focusDay)?.focus();
  }, [focusDay, view]);

  const months = [view, addMonths(view, 1)];
  const visibleOffset = monthsBetween(view, monthOf(focusDay));
  const tabbable = visibleOffset === 0 || visibleOffset === 1 ? focusDay : firstOfMonth(view);

  const choosingCheckout = range.checkin !== "" && range.checkout === "";
  const previewEnd =
    choosingCheckout && hover && isCheckoutChoice(range, hover, booked) ? hover : "";
  const end = range.checkout || previewEnd;
  const nights = range.checkin && range.checkout ? nightsBetween(range.checkin, range.checkout) : 0;

  const instruction = !range.checkin
    ? c.calPickIn
    : !range.checkout
      ? c.calPickOut
      : `${shortDate(range.checkin, lang)} → ${shortDate(range.checkout, lang)} · ${nightsLabel(nights, t)}`;

  function select(day: string) {
    const next = pickDay(range, day, booked, today);
    setFocusDay(day);
    if (next !== range) onChange(next);
  }

  function onKeyDown(event: React.KeyboardEvent, day: string) {
    const weekday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(day, -1),
      ArrowRight: () => addDays(day, 1),
      ArrowUp: () => addDays(day, -7),
      ArrowDown: () => addDays(day, 7),
      Home: () => addDays(day, -weekday),
      End: () => addDays(day, 6 - weekday),
      PageUp: () => shiftMonth(day, -1),
      PageDown: () => shiftMonth(day, 1),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();

    let target = move();
    if (target < firstOfMonth(firstMonth)) target = firstOfMonth(firstMonth);
    if (target > lastOfMonth(lastMonth)) target = lastOfMonth(lastMonth);

    // Keep the focused day on screen: the second month is hidden on phones.
    const panels = window.matchMedia("(min-width: 768px)").matches ? 2 : 1;
    const offset = monthsBetween(view, monthOf(target));
    if (offset < 0) setView(monthOf(target));
    else if (offset >= panels) setView(addMonths(monthOf(target), 1 - panels));

    focusAfterRender.current = true;
    setFocusDay(target);
  }

  const weekdays = Array.from({ length: 7 }, (_, i) => addDays(A_MONDAY, i));
  const navButton =
    "flex h-10 w-10 items-center justify-center rounded-full text-pine transition hover:bg-cream disabled:cursor-default disabled:opacity-30";

  return (
    <div className="rounded-2xl border border-line bg-white p-3 md:p-4">
      <p
        aria-live="polite"
        className={`px-1 text-sm font-semibold ${range.checkout ? "text-pine" : "text-clay"}`}
      >
        {instruction}
      </p>

      <div className="relative mt-3">
        <div className="absolute inset-x-0 top-0 flex justify-between">
          <button
            type="button"
            aria-label={c.calPrev}
            disabled={monthsBetween(firstMonth, view) <= 0}
            onClick={() => setView((v) => addMonths(v, -1))}
            className={navButton}
          >
            <Chevron direction="left" />
          </button>
          <button
            type="button"
            aria-label={c.calNext}
            disabled={monthsBetween(view, lastMonth) <= 0}
            onClick={() => setView((v) => addMonths(v, 1))}
            className={navButton}
          >
            <Chevron direction="right" />
          </button>
        </div>

        <div className="grid gap-6 md:grid-cols-2" onMouseLeave={() => setHover(null)}>
          {months.map((month, panel) => {
            const heading = `${id}-month-${panel}`;
            return (
              <div
                key={`${month.year}-${month.month}`}
                className={panel === 1 ? "hidden md:block" : ""}
              >
                <h2
                  id={heading}
                  className="flex h-10 items-center justify-center font-display text-base font-semibold capitalize text-pine"
                >
                  {formatDay(firstOfMonth(month), lang, { month: "long", year: "numeric" })}
                </h2>
                <table role="grid" aria-labelledby={heading} className="mt-1 w-full table-fixed">
                  <thead>
                    <tr>
                      {weekdays.map((d) => (
                        <th
                          key={d}
                          scope="col"
                          abbr={formatDay(d, lang, { weekday: "long" })}
                          className="pb-1 text-xs font-semibold text-muted"
                        >
                          {formatDay(d, lang, { weekday: "short" }).replace(".", "")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthGrid(month).map((week, w) => (
                      <tr key={w}>
                        {week.map((day, i) => {
                          if (!day) return <td key={i} />;
                          const isStart = day === range.checkin;
                          const isEnd = day === range.checkout;
                          const inRange = Boolean(
                            range.checkin && end && day > range.checkin && day < end,
                          );
                          const past = day < today;
                          const isBooked = booked.has(day);
                          const asCheckout = isCheckoutChoice(range, day, booked);
                          const selectable = isSelectable(range, day, booked, today);
                          const status = past
                            ? c.calPast
                            : isBooked
                              ? asCheckout
                                ? c.calCheckoutOnly
                                : c.calBooked
                              : c.calFree;

                          const band =
                            isStart && end
                              ? "bg-[linear-gradient(to_right,transparent_50%,#f6e3d6_50%)]"
                              : (isEnd || day === previewEnd) && range.checkin
                                ? "bg-[linear-gradient(to_left,transparent_50%,#f6e3d6_50%)]"
                                : inRange
                                  ? "bg-[#f6e3d6]"
                                  : "";
                          const look =
                            isStart || isEnd
                              ? "bg-clay font-bold text-white"
                              : day === previewEnd
                                ? "bg-[#e9b597] font-bold text-ink"
                                : past
                                  ? "text-[#bdb8aa]"
                                  : isBooked && !asCheckout
                                    ? "bg-booked text-[#8f8a7c] line-through"
                                    : "text-ink hover:bg-cream hover:ring-1 hover:ring-clay/50";

                          return (
                            <td
                              key={day}
                              role="gridcell"
                              aria-selected={isStart || isEnd || inRange}
                              className={`p-0 py-0.5 ${band}`}
                            >
                              <button
                                type="button"
                                ref={(el) => {
                                  if (el) buttons.current.set(day, el);
                                  else buttons.current.delete(day);
                                }}
                                tabIndex={day === tabbable ? 0 : -1}
                                aria-disabled={!selectable}
                                aria-label={`${formatDay(day, lang, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}, ${status}`}
                                onClick={() => selectable && select(day)}
                                onKeyDown={(e) => onKeyDown(e, day)}
                                onMouseEnter={() => setHover(day)}
                                onFocus={() => setFocusDay(day)}
                                className={`relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-clay md:h-11 md:w-11 ${look} ${selectable ? "cursor-pointer" : "cursor-default"}`}
                              >
                                {Number(day.slice(8, 10))}
                                {day === today && !isStart && !isEnd && (
                                  <span
                                    aria-hidden="true"
                                    className="absolute bottom-1 h-1 w-1 rounded-full bg-clay"
                                  />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 px-1 pt-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-hidden="true">
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-full border border-line bg-white" />
            {c.calFree}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-booked h-3.5 w-3.5 rounded-full border border-line" />
            {c.calBooked}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-full bg-clay" />
            {c.calSelected}
          </span>
        </div>
        {range.checkin && (
          <button
            type="button"
            onClick={() => onChange({ checkin: "", checkout: "" })}
            className="text-xs font-bold text-clay underline-offset-2 hover:underline"
          >
            {c.calClear}
          </button>
        )}
      </div>
      {note && <p className="mt-2 px-1 text-xs text-muted">{note}</p>}
    </div>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
    </svg>
  );
}
