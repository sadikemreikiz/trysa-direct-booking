import { describe, expect, it } from "vitest";
import { buildCalendar, daysOfMonth, shiftMonth, type CalendarStay } from "./calendar";

const units = [
  { id: 1, slug: "ambar-1", name: "Ambar-1" },
  { id: 7, slug: "kamp", name: "Kamp & Karavan Alanı" },
];

const stay = (patch: Partial<CalendarStay>): CalendarStay => ({
  id: "r1",
  unitId: 1,
  checkIn: "2026-11-10",
  checkOut: "2026-11-12",
  status: "confirmed",
  guestName: "Ayşe",
  ...patch,
});

describe("occupancy calendar", () => {
  it("computes the days of the month and month boundaries correctly", () => {
    expect(daysOfMonth("2026-02")).toHaveLength(28);
    expect(daysOfMonth("2028-02")).toHaveLength(29);
    expect(daysOfMonth("2026-11")[29]).toBe("2026-11-30");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("marks the nights of a stay; the checkout day stays free", () => {
    const days = buildCalendar("2026-11", units, [stay({})], {}, "kamp");
    const at = (d: string) => days.find((x) => x.date === d)!.cells[0];
    expect(at("2026-11-09").kind).toBe("free");
    expect(at("2026-11-10")).toMatchObject({ kind: "confirmed", starts: true, guestName: "Ayşe" });
    expect(at("2026-11-11")).toMatchObject({ kind: "confirmed", starts: false });
    expect(at("2026-11-12").kind).toBe("free");
  });

  it("priority: confirmed > Airbnb > pending", () => {
    const days = buildCalendar(
      "2026-11",
      units,
      [stay({ id: "p", status: "pending", checkIn: "2026-11-01", checkOut: "2026-11-05" }), stay({ checkIn: "2026-11-01", checkOut: "2026-11-02" })],
      { "Ambar-1": ["2026-11-01", "2026-11-02"] },
      "kamp",
    );
    expect(days.slice(0, 4).map((d) => d.cells[0].kind)).toEqual(["confirmed", "airbnb", "pending", "pending"]);
  });

  it("counts groups on the same night in the camping area", () => {
    const days = buildCalendar(
      "2026-11",
      units,
      [stay({ id: "a", unitId: 7 }), stay({ id: "b", unitId: 7, checkIn: "2026-11-11", checkOut: "2026-11-13" })],
      {},
      "kamp",
    );
    expect(days.find((d) => d.date === "2026-11-11")!.cells[1]).toMatchObject({ kind: "confirmed", count: 2 });
  });
});
