import Link from "next/link";
import PanelHeader from "@/components/panel/PanelHeader";
import { buildCalendar, daysOfMonth, shiftMonth, type Cell } from "@/components/panel/calendar";
import { formatDay } from "@/components/panel/format";
import { calendarData, SHARED_UNIT_SLUG } from "@/db/panel";
import { todayInDemre } from "@/db/reservations";
import { AIRBNB_REFRESH_SECONDS, getLockedDatesByType } from "@/lib/availability";
import { requireApprovedStaff } from "@/lib/panel-session";

const monthTitle = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" });
const weekday = new Intl.DateTimeFormat("tr-TR", { weekday: "short", timeZone: "UTC" });

/** Shortened unit names so the column headers fit narrow screens */
const SHORT: Record<string, string> = {
  "ambar-1": "A1",
  "ambar-2": "A2",
  "ambar-3": "A3",
  "kulube-1": "K1",
  "kulube-2": "K2",
  "tiny-house": "TH",
  kamp: "Kamp",
};

const cellStyle: Record<Cell["kind"], string> = {
  free: "bg-white",
  confirmed: "bg-[#9fd08a] text-[#1e3320]",
  pending: "bg-[#f7e7c4] text-[#7a5a1e]",
  airbnb: "bg-[#ffd9d6] text-[#b0413e]",
};

/** Monthly occupancy: days as rows, rooms as columns. Tapping a confirmed cell opens the booking. */
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ ay?: string }> }) {
  const { db, staff } = await requireApprovedStaff();
  const today = todayInDemre(new Date());
  const { ay } = await searchParams;
  const month = ay && /^\d{4}-(0[1-9]|1[0-2])$/.test(ay) ? ay : today.slice(0, 7);

  const days = daysOfMonth(month);
  const [{ units, stays }, airbnb] = await Promise.all([
    calendarData(db, days[0], shiftMonth(month, 1) + "-01"),
    getLockedDatesByType(),
  ]);
  const calendar = buildCalendar(month, units, stays, airbnb, SHARED_UNIT_SLUG);
  const unassigned = stays.filter((s) => s.unitId == null);

  return (
    <>
      <PanelHeader staff={staff} back />
      <div className="mb-3 flex items-center justify-between">
        <Link href={`/panel/takvim?ay=${shiftMonth(month, -1)}`} className="px-3 py-2 text-2xl text-clay" aria-label="Önceki ay">
          ‹
        </Link>
        <h1 className="font-display text-2xl font-semibold capitalize text-pine">
          {monthTitle.format(new Date(`${month}-01`))}
        </h1>
        <Link href={`/panel/takvim?ay=${shiftMonth(month, 1)}`} className="px-3 py-2 text-2xl text-clay" aria-label="Sonraki ay">
          ›
        </Link>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <Legend className={cellStyle.confirmed} label="Onaylı" />
        <Legend className={cellStyle.pending} label="Bekleyen talep" />
        <Legend className={cellStyle.airbnb} label="Airbnb" />
      </div>
      <p className="mb-3 text-xs text-muted">
        Airbnb takvimi en geç {AIRBNB_REFRESH_SECONDS / 60} dakikada bir okunur. Airbnb geçmiş günleri paylaşmadığı için
        geçmiş günler soluk gösterilir.
      </p>

      <div className="overflow-hidden rounded-2xl bg-white">
        <div
          className="sticky top-0 z-10 grid border-b border-line bg-cream text-center text-xs font-bold text-pine"
          style={{ gridTemplateColumns: `3.25rem repeat(${units.length}, minmax(0, 1fr))` }}
        >
          <div className="py-2" />
          {units.map((u) => (
            <div key={u.id} className="py-2" title={u.name}>
              {SHORT[u.slug] ?? u.name}
            </div>
          ))}
        </div>
        {calendar.map((day) => {
          const d = new Date(day.date);
          const isToday = day.date === today;
          const isPast = day.date < today;
          const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
          return (
            <div
              key={day.date}
              className={`grid border-b border-line/50 ${isToday ? "outline outline-2 -outline-offset-2 outline-clay" : ""} ${isPast ? "bg-[#f1ece2] opacity-50" : ""}`}
              style={{ gridTemplateColumns: `3.25rem repeat(${units.length}, minmax(0, 1fr))` }}
            >
              <div className={`px-1.5 py-1.5 text-xs leading-tight ${weekend ? "font-bold text-clay" : "text-muted"}`}>
                <div className="text-sm font-bold text-ink">{d.getUTCDate()}</div>
                {weekday.format(d)}
              </div>
              {day.cells.map((cell, i) => (
                <CellView key={units[i].id} cell={cell} />
              ))}
            </div>
          );
        })}
      </div>

      {unassigned.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-xs font-bold tracking-widest text-clay">ODA SEÇMEMİŞ TALEPLER</h2>
          <ul className="space-y-2">
            {unassigned.map((s) => (
              <li key={s.id}>
                <Link href={`/panel/talep/${s.id}`} className="block rounded-2xl bg-white p-3 text-base">
                  <span className="font-bold text-ink">{s.guestName}</span>
                  <span className="text-muted">
                    {" "}
                    · {formatDay(s.checkIn)} – {formatDay(s.checkOut)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function CellView({ cell }: { cell: Cell }) {
  const base = `m-0.5 flex min-h-9 items-center justify-center overflow-hidden rounded-md text-[11px] font-bold ${cellStyle[cell.kind]}`;
  if (cell.kind === "free") return <div className={base} />;
  if (cell.kind === "airbnb") return <div className={base} aria-label="Airbnb'de dolu" />;
  const label = cell.count > 1 ? `×${cell.count}` : cell.starts ? cell.guestName.slice(0, 3) : "";
  return (
    <Link href={`/panel/talep/${cell.id}`} className={base} aria-label={`${cell.guestName} (${cell.kind === "confirmed" ? "onaylı" : "bekliyor"})`}>
      {label}
    </Link>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded ${className}`} />
      {label}
    </span>
  );
}
