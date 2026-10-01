import { container, type TL } from "./shared";

/** Home page search bar: a plain GET form, so the chosen dates open the booking form prefilled. */
export function BookingBar({ t, lang }: TL) {
  const fld = "mt-1.5 w-full rounded-xl border border-line bg-white p-3 text-sm text-ink";
  const lbl = "block text-xs font-bold text-muted";
  return (
    <div className={`${container} relative z-20 -mt-8`}>
      <form
        action={`/${lang}/rezervasyon`}
        method="get"
        className="rounded-2xl border border-line bg-white p-4 shadow-[0_14px_34px_rgba(44,58,46,0.14)] md:flex md:items-end md:gap-5"
      >
        <label className="block flex-1">
          <span className={lbl}>{t.booking.checkin}</span>
          <input type="date" name="checkin" className={fld} />
        </label>
        <label className="mt-3 block flex-1 md:mt-0">
          <span className={lbl}>{t.booking.checkout}</span>
          <input type="date" name="checkout" className={fld} />
        </label>
        <label className="mt-3 block flex-1 md:mt-0">
          <span className={lbl}>{t.booking.guests}</span>
          <select name="guests" defaultValue="2" className={fld}>
            {t.booking.guestOptions.map((g, i) => (
              <option key={g} value={String(i + 1)}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="mt-3 block w-full rounded-xl bg-clay px-7 py-3 text-center text-sm font-bold text-white md:mt-0 md:w-auto"
        >
          {t.booking.ask}
        </button>
      </form>
    </div>
  );
}
