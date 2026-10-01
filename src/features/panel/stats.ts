/**
 * Panel statistics: measured data only (no estimates).
 * Months are grouped in the business's time zone (Europe/Istanbul).
 */
import { sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db";

export type MonthStats = {
  /** YYYY-MM */
  month: string;
  /** Booking requests from the site */
  requests: number;
  /** Of these requests, the confirmed ones */
  confirmed: number;
  /** Nights of confirmed stays from all sources (by check-in month) */
  nights: number;
  whatsappClicks: number;
  phoneClicks: number;
};

export type Stats = {
  months: MonthStats[];
  /** Confirmed bookings by source (all time) */
  bySource: Record<string, number>;
  /** Median time to first answer (confirm/decline) for site requests, in minutes; null without data */
  medianResponseMinutes: number | null;
  respondedCount: number;
  /** Nights of confirmed stays checking in after today (all sources) */
  upcomingNights: number;
};

function lastMonths(count: number, now: Date): string[] {
  const [y, m] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit" })
    .format(now)
    .split("-")
    .map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

const monthOf = (column: SQL) =>
  sql`to_char(${column} at time zone 'Europe/Istanbul', 'YYYY-MM')`;

export async function getStats(db: Db, now: Date = new Date(), monthCount = 6): Promise<Stats> {
  const months = lastMonths(monthCount, now);
  const from = months[0];

  const requests = await query<{ month: string; requests: number; confirmed: number }>(db, sql`
    select ${monthOf(sql`created_at`)} as month,
           count(*)::int as requests,
           count(*) filter (where status in ('confirmed', 'cancelled'))::int as confirmed
    from reservations
    where source = 'website' and ${monthOf(sql`created_at`)} >= ${from}
    group by 1`);

  const nights = await query<{ month: string; nights: number }>(db, sql`
    select to_char(check_in, 'YYYY-MM') as month, sum(check_out - check_in)::int as nights
    from reservations
    where status = 'confirmed' and to_char(check_in, 'YYYY-MM') >= ${from}
    group by 1`);

  const clicks = await query<{ month: string; name: string; n: number }>(db, sql`
    select ${monthOf(sql`created_at`)} as month, name, count(*)::int as n
    from analytics_events
    where name in ('whatsapp_click', 'phone_click') and ${monthOf(sql`created_at`)} >= ${from}
    group by 1, 2`);

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(now);
  const [upcoming] = await query<{ nights: number | null }>(db, sql`
    select sum(check_out - check_in)::int as nights
    from reservations where status = 'confirmed' and check_in >= ${today}`);

  const sources = await query<{ source: string; n: number }>(db, sql`
    select source, count(*)::int as n from reservations where status = 'confirmed' group by 1`);

  // Time between the request arriving and the first decision (confirm/decline)
  const [response] = await query<{ median: number | null; n: number }>(db, sql`
      select percentile_cont(0.5) within group (order by minutes) as median, count(*)::int as n
      from (
        select extract(epoch from (min(e.created_at) - r.created_at)) / 60 as minutes
        from reservations r
        join reservation_events e on e.reservation_id = r.id and e.type = 'status_changed'
        where r.source = 'website'
        group by r.id, r.created_at
      ) t`);

  const byMonth = new Map(
    months.map((month) => [month, { month, requests: 0, confirmed: 0, nights: 0, whatsappClicks: 0, phoneClicks: 0 }]),
  );
  for (const r of requests) Object.assign(byMonth.get(r.month) ?? {}, { requests: r.requests, confirmed: r.confirmed });
  for (const r of nights) Object.assign(byMonth.get(r.month) ?? {}, { nights: r.nights });
  for (const r of clicks) {
    const m = byMonth.get(r.month);
    if (m) m[r.name === "whatsapp_click" ? "whatsappClicks" : "phoneClicks"] = r.n;
  }

  return {
    months: [...byMonth.values()],
    bySource: Object.fromEntries(sources.map((r) => [r.source, r.n])),
    medianResponseMinutes: response?.median == null ? null : Math.round(Number(response.median)),
    respondedCount: response?.n ?? 0,
    upcomingNights: upcoming?.nights ?? 0,
  };
}

/** Raw SQL query. postgres.js returns an array, PGlite returns { rows }; support both. */
async function query<T>(db: Db, q: SQL): Promise<T[]> {
  const result: unknown = await db.execute(q);
  return Array.isArray(result) ? (result as T[]) : ((result as { rows?: T[] }).rows ?? []);
}
