import type { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import { createTestDb, resetTestDb } from "@/db/test-db";
import { parseBookedDays } from "./airbnb-calendar";
import { readAirbnbAvailability, saveAirbnbCalendars } from "./calendar-store";

let db: Db;
let client: PGlite;

beforeAll(async () => {
  ({ db, client } = await createTestDb());
});
afterAll(async () => {
  await client.close();
});
beforeEach(async () => {
  await resetTestDb(client);
  for (const key of ["AMBAR1", "AMBAR2", "AMBAR3", "KULUBE1", "KULUBE2", "TINY"]) {
    vi.stubEnv(`AIRBNB_ICAL_${key}`, "");
  }
  vi.stubEnv("AIRBNB_ICAL_AMBAR1", "https://airbnb.test/ambar-1.ics");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

// A guest staying the nights of 14 and 15 November (checks out on the 16th).
const ICS = [
  "BEGIN:VCALENDAR",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20261114",
  "DTEND;VALUE=DATE:20261116",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

const respond = (status: number, body = ICS) =>
  vi.fn<typeof fetch>().mockImplementation(async () => new Response(body, { status }));

describe("parseBookedDays", () => {
  it("lists the booked nights, without the checkout day", () => {
    expect([...parseBookedDays(ICS)!]).toEqual(["2026-11-14", "2026-11-15"]);
  });

  it("tells an empty calendar apart from a page that isn't a calendar", () => {
    expect(parseBookedDays("BEGIN:VCALENDAR\r\nEND:VCALENDAR")?.size).toBe(0);
    expect(parseBookedDays("<html>Log in</html>")).toBeNull();
  });
});

describe("readAirbnbAvailability", () => {
  it("uses the live calendar when Airbnb answers", async () => {
    const result = await readAirbnbAvailability(db, respond(200));
    expect(result.locked["Ambar-1"]).toEqual(["2026-11-14", "2026-11-15"]);
    expect(result.locked["Tiny House"]).toEqual([]); // not connected: never blocked
    expect(result.fallback).toEqual([]);
  });

  it("falls back to the last copy when Airbnb fails, instead of showing the room free", async () => {
    const readAt = new Date("2026-11-02T09:00:00Z");
    await saveAirbnbCalendars(
      db,
      [{ room: "Ambar-1", days: ["2026-11-14", "2026-11-15"] }],
      readAt,
    );

    const failures: [string, typeof fetch][] = [
      ["an error status", respond(503)],
      ["a page that isn't a calendar", respond(200, "<html>Log in</html>")],
      ["a network error", vi.fn<typeof fetch>().mockRejectedValue(new Error("timeout"))],
    ];
    for (const [what, fetchImpl] of failures) {
      const result = await readAirbnbAvailability(db, fetchImpl);
      expect(result.locked["Ambar-1"], what).toEqual(["2026-11-14", "2026-11-15"]);
      expect(result.fallback, what).toEqual([{ room: "Ambar-1", readAt }]);
    }
  });

  it("says so when there is no copy yet", async () => {
    const result = await readAirbnbAvailability(db, respond(503));
    expect(result.locked["Ambar-1"]).toEqual([]);
    expect(result.fallback).toEqual([{ room: "Ambar-1", readAt: null }]);
  });

  it("keeps working without a database", async () => {
    const result = await readAirbnbAvailability(null, respond(503));
    expect(result.fallback).toEqual([{ room: "Ambar-1", readAt: null }]);
  });
});

describe("saveAirbnbCalendars", () => {
  it("replaces a room's copy with the newer reading", async () => {
    await saveAirbnbCalendars(db, [{ room: "Ambar-1", days: ["2026-11-14"] }], new Date(0));
    const later = new Date("2026-11-02T10:00:00Z");
    await saveAirbnbCalendars(db, [{ room: "Ambar-1", days: ["2026-11-20"] }], later);
    const result = await readAirbnbAvailability(db, respond(503));
    expect(result.locked["Ambar-1"]).toEqual(["2026-11-20"]);
    expect(result.fallback).toEqual([{ room: "Ambar-1", readAt: later }]);
  });
});
