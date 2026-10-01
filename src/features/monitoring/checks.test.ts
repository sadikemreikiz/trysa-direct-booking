import type { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import { createTestDb, resetTestDb } from "@/db/test-db";
import type { AlertChannels } from "./alerts";
import { monitorAirbnbCalendars, monitorScheduler } from "./checks";

const T0 = new Date("2026-10-01T09:00:00Z");
const min = (m: number) => new Date(T0.getTime() + m * 60_000);

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
});
afterEach(() => {
  vi.unstubAllEnvs();
});

function channels() {
  return {
    push: vi.fn<AlertChannels["push"]>().mockResolvedValue({ ok: true }),
    email: vi.fn<AlertChannels["email"]>().mockResolvedValue({ ok: true }),
  };
}

const respond = (status: number, body = "BEGIN:VCALENDAR\nEND:VCALENDAR") =>
  vi.fn<typeof fetch>().mockImplementation(async () => new Response(body, { status }));

describe("Airbnb calendars", () => {
  beforeEach(() => {
    for (const key of ["AMBAR1", "AMBAR2", "AMBAR3", "KULUBE1", "KULUBE2", "TINY"]) {
      vi.stubEnv(`AIRBNB_ICAL_${key}`, "");
    }
    vi.stubEnv("AIRBNB_ICAL_AMBAR1", "https://airbnb.test/ambar-1.ics");
    vi.stubEnv("AIRBNB_ICAL_TINY", "https://airbnb.test/tiny.ics");
  });

  it("alerts once when a calendar has been unreadable for 3 hours, and when it's back", async () => {
    const c = channels();
    const down = respond(503);
    await monitorAirbnbCalendars(db, { now: min(0), fetchImpl: down, channels: c });
    await monitorAirbnbCalendars(db, { now: min(120), fetchImpl: down, channels: c });
    expect(c.push).not.toHaveBeenCalled();

    await monitorAirbnbCalendars(db, { now: min(185), fetchImpl: down, channels: c });
    await monitorAirbnbCalendars(db, { now: min(200), fetchImpl: down, channels: c });
    expect(c.push).toHaveBeenCalledTimes(1);
    const [, failing] = c.push.mock.calls[0];
    expect(failing.title).toBe("⚠️ Airbnb takvimi okunamıyor");
    expect(failing.body).toContain("Ambar-1 (3 saattir), Tiny House (3 saattir)");
    expect(failing.url).toBe("/panel/takvim");

    await monitorAirbnbCalendars(db, { now: min(215), fetchImpl: respond(200), channels: c });
    expect(c.push).toHaveBeenCalledTimes(2);
    expect(c.push.mock.calls[1][1].title).toBe("✅ Airbnb takvimi düzeldi");
  });

  it("an answer that isn't a calendar (e.g. a login page) counts as a failure", async () => {
    const c = channels();
    const html = respond(200, "<html>Log in</html>");
    await monitorAirbnbCalendars(db, { now: min(0), fetchImpl: html, channels: c });
    await monitorAirbnbCalendars(db, { now: min(181), fetchImpl: html, channels: c });
    expect(c.push).toHaveBeenCalledTimes(1);
  });

  it("only reads the calendars that are connected, bypassing the cache", async () => {
    const ok = respond(200);
    await monitorAirbnbCalendars(db, { now: min(0), fetchImpl: ok, channels: channels() });
    expect(ok.mock.calls.map(([url]) => url).sort()).toEqual([
      "https://airbnb.test/ambar-1.ics",
      "https://airbnb.test/tiny.ics",
    ]);
    expect(ok.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  });
});

describe("the 15-minute scheduler", () => {
  it("Vercel's daily run alerts when the GitHub schedule has gone quiet", async () => {
    const c = channels();
    await monitorScheduler(db, "github", { now: min(0), channels: c });
    expect(await monitorScheduler(db, "vercel", { now: min(60), channels: c })).toEqual({
      stale: false,
    });
    expect(await monitorScheduler(db, "vercel", { now: min(180), channels: c })).toEqual({
      stale: true,
    });
    expect(c.push).toHaveBeenCalledTimes(1);
    expect(c.push.mock.calls[0][1].body).toContain("3 saattir çalışmadı");
  });

  it("stays quiet before the GitHub schedule has ever run", async () => {
    const c = channels();
    expect(await monitorScheduler(db, "vercel", { now: min(0), channels: c })).toEqual({
      stale: false,
    });
    expect(c.push).not.toHaveBeenCalled();
  });
});
