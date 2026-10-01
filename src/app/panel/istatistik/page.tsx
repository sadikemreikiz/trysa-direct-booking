import { redirect } from "next/navigation";
import PanelHeader from "@/features/panel/components/PanelHeader";
import { sourceLabel } from "@/features/panel/format";
import { requireApprovedStaff } from "@/features/panel/session";
import { getStats } from "@/features/panel/stats";

const monthName = new Intl.DateTimeFormat("tr-TR", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} dk`;
  const hours = minutes / 60;
  return hours < 24
    ? `${hours.toFixed(1).replace(".", ",")} saat`
    : `${Math.round(hours / 24)} gün`;
}

/** Measured numbers only: requests, response time, clicks, nights sold. Admins only. */
export default async function StatsPage() {
  const { db, staff } = await requireApprovedStaff();
  if (staff.role !== "admin") redirect("/panel");
  const stats = await getStats(db);

  const totals = stats.months.reduce(
    (t, m) => ({
      requests: t.requests + m.requests,
      confirmed: t.confirmed + m.confirmed,
      clicks: t.clicks + m.whatsappClicks + m.phoneClicks,
    }),
    { requests: 0, confirmed: 0, clicks: 0 },
  );
  const maxBar = Math.max(
    1,
    ...stats.months.map((m) => m.requests + m.whatsappClicks + m.phoneClicks),
  );

  return (
    <>
      <PanelHeader staff={staff} back />
      <h1 className="mb-1 font-display text-3xl font-semibold text-pine">İstatistik</h1>
      <p className="mb-5 text-muted">Son 6 ay · sadece sitede ölçülen veriler</p>

      <div className="grid grid-cols-2 gap-3">
        <Tile label="Siteden talep" value={totals.requests} />
        <Tile
          label="Onaylanan"
          value={totals.confirmed}
          hint={
            totals.requests > 0
              ? `%${Math.round((totals.confirmed / totals.requests) * 100)}`
              : undefined
          }
        />
        <Tile label="WhatsApp / telefon tıklaması" value={totals.clicks} />
        <Tile label="Yaklaşan onaylı gece" value={stats.upcomingNights} />
      </div>

      <section className="mt-3 rounded-2xl bg-white p-4">
        <div className="text-sm font-bold text-muted">Talebe ilk cevap süresi (ortanca)</div>
        <div className="mt-1 text-2xl font-bold text-pine">
          {stats.medianResponseMinutes == null ? "—" : formatDuration(stats.medianResponseMinutes)}
        </div>
        <div className="text-sm text-muted">{stats.respondedCount} cevaplanmış talep üzerinden</div>
      </section>

      <h2 className="mb-3 mt-7 text-xs font-bold tracking-widest text-clay">AYLARA GÖRE</h2>
      <ul className="space-y-2">
        {[...stats.months].reverse().map((m) => (
          <li key={m.month} className="rounded-2xl bg-white p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-bold text-ink">
                {monthName.format(new Date(`${m.month}-01`))}
              </span>
              <span className="text-sm text-muted">{m.nights} onaylı gece</span>
            </div>
            <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-cream" aria-hidden="true">
              <div className="bg-clay" style={{ width: `${(m.requests / maxBar) * 100}%` }} />
              <div
                className="bg-whatsapp"
                style={{ width: `${(m.whatsappClicks / maxBar) * 100}%` }}
              />
              <div className="bg-pine" style={{ width: `${(m.phoneClicks / maxBar) * 100}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Legend color="bg-clay" label={`${m.requests} talep (${m.confirmed} onay)`} />
              <Legend color="bg-whatsapp" label={`${m.whatsappClicks} WhatsApp`} />
              <Legend color="bg-pine" label={`${m.phoneClicks} telefon`} />
            </div>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 mt-7 text-xs font-bold tracking-widest text-clay">
        ONAYLI REZERVASYONLAR · KAYNAK
      </h2>
      <section className="rounded-2xl bg-white p-4">
        {Object.keys(stats.bySource).length === 0 ? (
          <p className="text-muted">Henüz onaylı rezervasyon yok</p>
        ) : (
          <ul className="space-y-1.5">
            {Object.entries(stats.bySource)
              .sort((a, b) => b[1] - a[1])
              .map(([source, n]) => (
                <li key={source} className="flex justify-between text-base">
                  <span>{sourceLabel[source] ?? source}</span>
                  <span className="font-bold text-ink">{n}</span>
                </li>
              ))}
          </ul>
        )}
      </section>
      <p className="mt-4 text-xs text-muted">
        Airbnb rezervasyonları burada yok (Airbnb takviminden sadece dolu günler gelir). Tıklamalar
        çerezsiz sayılır; aynı kişinin birden çok tıklaması ayrı sayılabilir.
      </p>
    </>
  );
}

function Tile({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="text-2xl font-bold text-pine">
        {value}
        {hint && <span className="ml-1.5 text-base font-semibold text-muted">{hint}</span>}
      </div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
