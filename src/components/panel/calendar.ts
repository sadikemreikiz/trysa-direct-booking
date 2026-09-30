/**
 * Panel doluluk takvimi: bir ayın her günü × her ünite için hücre durumu.
 * Öncelik: onaylı (site/elle) > Airbnb'de dolu > bekleyen talep > boş.
 * Kamp alanı ortak olduğu için hücrede kaç grup olduğu gösterilir.
 */
export type CalendarUnit = { id: number; slug: string; name: string };
export type CalendarStay = {
  id: string;
  unitId: number | null;
  checkIn: string;
  checkOut: string;
  status: "pending" | "confirmed" | "declined" | "cancelled";
  guestName: string;
};

export type Cell =
  | { kind: "free" }
  | { kind: "airbnb" }
  | { kind: "confirmed" | "pending"; id: string; guestName: string; starts: boolean; count: number };

export type CalendarDay = { date: string; cells: Cell[] };

const DAY_MS = 86_400_000;

/** "2026-11" → ["2026-11-01", …, "2026-11-30"] */
export function daysOfMonth(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => new Date(Date.UTC(y, m - 1, i + 1)).toISOString().slice(0, 10));
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export function buildCalendar(
  month: string,
  units: CalendarUnit[],
  stays: CalendarStay[],
  airbnbLocked: Record<string, string[]>,
  sharedUnitSlug: string,
): CalendarDay[] {
  const airbnb = new Map(units.map((u) => [u.id, new Set(airbnbLocked[u.name] ?? [])]));

  return daysOfMonth(month).map((date) => {
    const next = new Date(Date.parse(date) + DAY_MS).toISOString().slice(0, 10);
    const cells = units.map((u): Cell => {
      // Bu gece bu ünitede kalanlar: giriş ≤ gün < çıkış
      const here = stays.filter((s) => s.unitId === u.id && s.checkIn < next && s.checkOut > date);
      const confirmed = here.filter((s) => s.status === "confirmed");
      const pending = here.filter((s) => s.status === "pending");
      const pick = (list: CalendarStay[], kind: "confirmed" | "pending"): Cell => ({
        kind,
        id: list[0].id,
        guestName: list[0].guestName,
        starts: list[0].checkIn === date,
        count: u.slug === sharedUnitSlug ? list.length : 1,
      });
      if (confirmed.length > 0) return pick(confirmed, "confirmed");
      if (airbnb.get(u.id)?.has(date)) return { kind: "airbnb" };
      if (pending.length > 0) return pick(pending, "pending");
      return { kind: "free" };
    });
    return { date, cells };
  });
}
