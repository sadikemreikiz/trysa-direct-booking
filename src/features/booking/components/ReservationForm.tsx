"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { WhatsAppIcon } from "@/components/icons";
import type { Dict, Locale } from "@/content/dictionaries";
import { rangeHasLockedDay } from "@/features/airbnb-sync/airbnb-calendar";
import { submitReservation } from "@/features/booking/actions";
import { fullyBookedDays, nightsBetween, rangeFromParams } from "@/features/booking/calendar";
import AvailabilityCalendar, {
  nightsLabel,
  shortDate,
} from "@/features/booking/components/AvailabilityCalendar";
import { whatsappUrl, type ReservationInput } from "@/features/booking/summary";
import { todayInDemre } from "@/lib/dates";

// Display name → the unit's stable database id (slug)
const roomUnits: [label: string, slug: string][] = [
  ["Ambar-1", "ambar-1"],
  ["Ambar-2", "ambar-2"],
  ["Ambar-3", "ambar-3"],
  ["Kulübe-1", "kulube-1"],
  ["Kulübe-2", "kulube-2"],
  ["Tiny House", "tiny-house"],
];

const empty: ReservationInput = {
  checkin: "",
  checkout: "",
  adults: "2",
  children: "0",
  unit: "Ambar-1",
  name: "",
  phone: "",
  email: "",
  note: "",
};

type Props = {
  t: Dict;
  lang: Locale;
  lockedByType?: Record<string, string[]>;
  /** Google rating and review count, e.g. "★ 4,9 · 292 yorum" (filled in on the server) */
  reviewsChip: string;
};

const noSubscription = () => () => {};

/**
 * The booking page is prerendered, so "today" and the URL's query (dates and room from
 * the home page or a room page) are only known in the browser. Both are read after
 * hydration; the form then starts fresh with them as its initial values.
 */
export default function ReservationForm(props: Props) {
  const today = useSyncExternalStore(
    noSubscription,
    () => todayInDemre(new Date()),
    () => "",
  );
  const search = useSyncExternalStore(
    noSubscription,
    () => window.location.search,
    () => "",
  );
  return <BookingForm key={`${today}${search}`} {...props} today={today} search={search} />;
}

function initialData(
  search: string,
  today: string,
  unitOptions: [string, string][],
): ReservationInput {
  if (!today) return empty;
  const params = new URLSearchParams(search);
  const { checkin, checkout } = rangeFromParams(params, today);
  const unit = unitOptions.find(([, slug]) => slug && slug === params.get("unit"))?.[0];
  const guests = params.get("guests");
  return {
    ...empty,
    checkin,
    checkout,
    unit: unit ?? empty.unit,
    adults: guests && /^[1-4]$/.test(guests) ? guests : empty.adults,
  };
}

function BookingForm({
  t,
  lang,
  lockedByType = {},
  reviewsChip,
  today,
  search,
}: Props & { today: string; search: string }) {
  const unitOptions: [label: string, slug: string][] = [
    ...roomUnits,
    [t.reservation.unitKamp, "kamp"],
    [t.reservation.uninameEmin, ""],
  ];
  const [data, setData] = useState<ReservationInput>(() => initialData(search, today, unitOptions));
  const [kvkk, setKvkk] = useState(false);
  const [reviewOk, setReviewOk] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [emailed, setEmailed] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bot traps: hidden field + how long the form took to fill
  const [hp, setHp] = useState("");
  const openedAt = useRef<number | null>(null);

  const unitSlug = unitOptions.find(([label]) => label === data.unit)?.[1] ?? "";
  // Camping is shared, so it's never closed; "not sure" closes only days when every room is full.
  const lockedDates =
    unitSlug === "kamp"
      ? []
      : unitSlug === ""
        ? fullyBookedDays(
            lockedByType,
            roomUnits.map(([label]) => label),
          )
        : (lockedByType[data.unit] ?? []);
  const dateBlocked = rangeHasLockedDay(data.checkin, data.checkout, lockedDates);
  const calendarNote =
    unitSlug === "kamp"
      ? t.reservation.calNoteKamp
      : unitSlug === ""
        ? t.reservation.calNoteAny
        : undefined;
  const units = unitOptions.map(([label]) => label);

  const fld =
    "mt-1.5 w-full rounded-xl border border-line bg-white p-3 text-sm text-ink outline-none focus:border-clay";
  const lbl = "block text-xs font-bold text-muted";

  function set<K extends keyof ReservationInput>(k: K, v: string) {
    setData((d) => ({ ...d, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!data.checkin || !data.checkout || !data.name.trim() || !data.phone.trim()) {
      setError(t.reservation.errRequired);
      return;
    }
    if (!kvkk) {
      setError(t.reservation.errKvkk);
      return;
    }
    if (dateBlocked) {
      setError(t.reservation.blockedMsg);
      return;
    }
    setStatus("sending");
    try {
      const res = await submitReservation(data, {
        unitSlug,
        locale: lang,
        consent: kvkk,
        reviewConsent: reviewOk && data.email.trim() !== "",
        trap: { hp, elapsedMs: openedAt.current ? Date.now() - openedAt.current : 0 },
      });
      if (!res.ok) {
        setError(
          res.error === "required"
            ? t.reservation.errRequired
            : res.error === "blocked"
              ? t.reservation.blockedMsg
              : res.error === "rate_limited"
                ? t.reservation.errRateLimited
                : t.reservation.errInvalid,
        );
        setStatus("idle");
        return;
      }
      setEmailed(Boolean(res.emailed));
      setReference(res.reference ?? null);
    } catch {
      /* even if the email fails we continue via WhatsApp */
      setEmailed(false);
    }
    setStatus("done");
  }

  if (status === "done") {
    return (
      <section className="mx-auto max-w-xl px-5 py-14 text-center md:px-8">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#9fd08a]">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1e3320"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="font-display text-3xl font-semibold text-pine">
          {emailed ? t.reservation.doneTitleSent : t.reservation.doneTitle}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-muted">
          {emailed ? t.reservation.doneSubSent : t.reservation.doneSub}
        </p>

        <div className="mx-auto mt-6 rounded-2xl border border-line bg-white p-5 text-left text-sm">
          <div className="mb-3 text-xs font-bold tracking-widest text-clay">
            {t.reservation.summaryTitle}
          </div>
          <Row
            k={t.reservation.sumDate}
            v={`${shortDate(data.checkin, lang)} → ${shortDate(data.checkout, lang)} · ${nightsLabel(
              nightsBetween(data.checkin, data.checkout),
              t,
            )}`}
          />
          <Row
            k={t.reservation.sumGuests}
            v={`${data.adults} ${t.reservation.adultsWord}${
              Number(data.children) > 0 ? `, ${data.children} ${t.reservation.childrenWord}` : ""
            }`}
          />
          <Row k={t.reservation.sumStay} v={data.unit} last={!reference} />
          {reference && <Row k={t.reservation.refLabel} v={reference} last />}
        </div>

        <a
          href={whatsappUrl(data)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-whatsapp px-6 py-4 text-base font-bold text-white"
        >
          <WhatsAppIcon className="h-5 w-5" />
          {emailed ? t.reservation.waOptional : t.reservation.sendWhatsapp}
        </a>
        <Link
          href={`/${lang}`}
          className="mt-3 inline-block text-sm font-semibold text-muted hover:text-clay"
        >
          {t.reservation.backHome}
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-5 py-10 md:px-8">
      <h1 className="font-display text-3xl font-semibold text-pine md:text-4xl">
        {t.reservation.title}
      </h1>
      <p className="mt-2 max-w-xl text-muted">{t.reservation.intro}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-[#f7e7c4] px-3 py-1.5 text-xs font-bold text-[#7a5a1e]">
          {reviewsChip}
        </span>
        <span className="rounded-full bg-[#e4eadd] px-3 py-1.5 text-xs font-bold text-pine">
          {t.reservation.chipNoFee}
        </span>
      </div>

      <form
        onSubmit={onSubmit}
        onFocus={() => {
          openedAt.current ??= Date.now();
        }}
        className="mt-6 space-y-4 rounded-2xl border border-line bg-white p-5 md:p-7"
      >
        {/* Hidden field: humans don't see it, bots fill it in. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
            />
          </label>
        </div>
        <div>
          <span className={lbl}>{t.reservation.forWhat}</span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {units.map((u) => {
              const active = data.unit === u;
              return (
                <button
                  type="button"
                  key={u}
                  onClick={() => set("unit", u)}
                  className={`rounded-xl border p-3 text-sm font-semibold ${
                    active
                      ? "border-2 border-clay bg-[#fbf0e7] text-pine"
                      : "border-line bg-white text-pine/80"
                  }`}
                >
                  {u}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className={lbl}>{t.reservation.dates}</span>
          <div className="mt-2">
            {today ? (
              <AvailabilityCalendar
                t={t}
                lang={lang}
                today={today}
                booked={new Set(lockedDates)}
                range={{ checkin: data.checkin, checkout: data.checkout }}
                onChange={({ checkin, checkout }) => setData((d) => ({ ...d, checkin, checkout }))}
                note={calendarNote}
              />
            ) : (
              <div className="min-h-[430px] rounded-2xl border border-line bg-white p-4 text-sm font-semibold text-clay">
                {t.reservation.calPickIn}
              </div>
            )}
          </div>
        </div>

        {dateBlocked && (
          <p className="rounded-lg bg-[#fbe4dc] px-3 py-2 text-sm font-semibold text-clay-dark">
            {t.reservation.blockedMsg}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={lbl}>{t.reservation.adults}</span>
            <select
              className={fld}
              value={data.adults}
              onChange={(e) => set("adults", e.target.value)}
            >
              {["1", "2", "3", "4", "5+"].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={lbl}>{t.reservation.children}</span>
            <select
              className={fld}
              value={data.children}
              onChange={(e) => set("children", e.target.value)}
            >
              {["0", "1", "2", "3+"].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="h-px bg-line/70" />

        <label className="block">
          <span className={lbl}>{t.reservation.name}</span>
          <input
            type="text"
            className={fld}
            placeholder={t.reservation.namePh}
            value={data.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </label>
        <label className="block">
          <span className={lbl}>{t.reservation.phone}</span>
          <input
            type="tel"
            className={fld}
            placeholder="05xx xxx xx xx"
            value={data.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </label>
        <label className="block">
          <span className={lbl}>
            {t.reservation.email}{" "}
            <span className="font-normal text-muted">{t.reservation.optional}</span>
          </span>
          <input
            type="email"
            className={fld}
            placeholder="ornek@eposta.com"
            value={data.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </label>
        {data.email.trim() !== "" && (
          <label className="-mt-1 flex items-start gap-2.5 text-xs leading-relaxed text-muted">
            <input
              type="checkbox"
              className="mt-0.5 h-[18px] w-[18px] accent-clay"
              checked={reviewOk}
              onChange={(e) => setReviewOk(e.target.checked)}
            />
            <span>{t.reservation.reviewOptIn}</span>
          </label>
        )}
        <label className="block">
          <span className={lbl}>
            {t.reservation.note}{" "}
            <span className="font-normal text-muted">{t.reservation.optional}</span>
          </span>
          <textarea
            className={fld}
            rows={3}
            placeholder={t.reservation.notePh}
            value={data.note}
            onChange={(e) => set("note", e.target.value)}
          />
        </label>

        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-muted">
          <input
            type="checkbox"
            className="mt-0.5 h-[18px] w-[18px] accent-clay"
            checked={kvkk}
            onChange={(e) => setKvkk(e.target.checked)}
          />
          <span>
            {t.reservation.kvkk}{" "}
            <Link href={`/${lang}/gizlilik`} target="_blank" className="underline">
              {t.footer.rights}
            </Link>
          </span>
        </label>

        {error && (
          <p className="rounded-lg bg-[#fbe4dc] px-3 py-2 text-sm font-semibold text-clay-dark">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "sending" || dateBlocked}
          className="w-full rounded-xl bg-clay py-4 text-base font-bold text-white disabled:opacity-60"
        >
          {status === "sending"
            ? t.reservation.sending
            : dateBlocked
              ? t.reservation.blocked
              : t.reservation.submit}
        </button>
      </form>
    </section>
  );
}

function Row({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div className={`flex justify-between py-2 ${last ? "" : "border-b border-line/60"}`}>
      <span className="text-muted">{k}</span>
      <span className="font-semibold text-ink">{v}</span>
    </div>
  );
}
