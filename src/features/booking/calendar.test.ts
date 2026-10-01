import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  fullyBookedDays,
  isSelectable,
  lastCheckout,
  monthGrid,
  monthsBetween,
  nightsBetween,
  pickDay,
  rangeFromParams,
  type Range,
} from "./calendar";

const TODAY = "2026-10-10";
const none: Range = { checkin: "", checkout: "" };
// Nights of 15 and 16 October are booked (a two-night stay from the 15th to the 17th)
const booked = new Set(["2026-10-15", "2026-10-16"]);

describe("date helpers", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("counts nights, unaffected by daylight saving (25 October 2026 in Europe)", () => {
    expect(nightsBetween("2026-10-24", "2026-10-27")).toBe(3);
  });

  it("adds and compares months across years", () => {
    expect(addMonths({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(monthsBetween({ year: 2026, month: 10 }, { year: 2027, month: 1 })).toBe(3);
  });

  it("builds Monday-first weeks with padding", () => {
    // 1 October 2026 is a Thursday
    const weeks = monthGrid({ year: 2026, month: 9 });
    expect(weeks[0]).toEqual([
      null,
      null,
      null,
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });
});

describe("selecting a stay", () => {
  it("the first tap sets check-in, the second sets check-out", () => {
    const start = pickDay(none, "2026-10-11", booked, TODAY);
    expect(start).toEqual({ checkin: "2026-10-11", checkout: "" });
    expect(pickDay(start, "2026-10-13", booked, TODAY)).toEqual({
      checkin: "2026-10-11",
      checkout: "2026-10-13",
    });
  });

  it("allows checking out on the morning of a booked night, but not later", () => {
    const start = { checkin: "2026-10-12", checkout: "" };
    expect(lastCheckout("2026-10-12", booked)).toBe("2026-10-15");
    expect(pickDay(start, "2026-10-15", booked, TODAY).checkout).toBe("2026-10-15");
    expect(isSelectable(start, "2026-10-16", booked, TODAY)).toBe(false);
  });

  it("a free day beyond the next booking starts a new stay instead", () => {
    const start = { checkin: "2026-10-12", checkout: "" };
    expect(pickDay(start, "2026-10-18", booked, TODAY)).toEqual({
      checkin: "2026-10-18",
      checkout: "",
    });
  });

  it("cannot start a stay on a booked night or in the past", () => {
    expect(pickDay(none, "2026-10-15", booked, TODAY)).toBe(none);
    expect(pickDay(none, "2026-10-09", booked, TODAY)).toBe(none);
    expect(isSelectable(none, TODAY, booked, TODAY)).toBe(true);
  });

  it("a tap before check-in or after a finished stay starts over", () => {
    const start = { checkin: "2026-10-12", checkout: "" };
    expect(pickDay(start, "2026-10-11", booked, TODAY)).toEqual({
      checkin: "2026-10-11",
      checkout: "",
    });
    const done = { checkin: "2026-10-11", checkout: "2026-10-13" };
    expect(pickDay(done, "2026-10-20", booked, TODAY)).toEqual({
      checkin: "2026-10-20",
      checkout: "",
    });
  });

  it("caps the stay at the maximum number of nights", () => {
    expect(lastCheckout("2026-11-01", new Set(), 60)).toBe("2026-12-31");
    const start = { checkin: "2026-11-01", checkout: "" };
    expect(isSelectable(start, "2027-01-01", new Set(), TODAY, 60)).toBe(true); // starts over
    expect(pickDay(start, "2027-01-01", new Set(), TODAY, 60).checkout).toBe("");
  });
});

describe("fullyBookedDays", () => {
  it("closes only the days on which every room is booked", () => {
    const locked = {
      A: ["2026-10-15", "2026-10-16"],
      B: ["2026-10-16"],
      C: ["2026-10-16", "2026-10-20"],
    };
    expect(fullyBookedDays(locked, ["A", "B", "C"])).toEqual(["2026-10-16"]);
  });

  it("a room with no calendar keeps every day open", () => {
    expect(fullyBookedDays({ A: ["2026-10-16"] }, ["A", "B"])).toEqual([]);
  });
});

describe("rangeFromParams", () => {
  const parse = (query: string) => rangeFromParams(new URLSearchParams(query), TODAY);

  it("reads a valid stay from the URL", () => {
    expect(parse("checkin=2026-10-12&checkout=2026-10-14")).toEqual({
      checkin: "2026-10-12",
      checkout: "2026-10-14",
    });
  });

  it("drops dates in the past, malformed dates and impossible stays", () => {
    expect(parse("checkin=2026-10-01&checkout=2026-10-03")).toEqual(none);
    expect(parse("checkin=12.10.2026")).toEqual(none);
    expect(parse("checkin=2026-10-12&checkout=2026-10-11")).toEqual({
      checkin: "2026-10-12",
      checkout: "",
    });
    expect(parse("checkin=2026-10-12&checkout=2027-10-12").checkout).toBe("");
  });
});
