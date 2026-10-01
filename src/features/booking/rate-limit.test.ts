import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clientKey } from "./client-key";
import type { Db } from "@/db";
import { hitRateLimit, hitRateLimits, pruneRateLimits } from "./rate-limit";
import { rateLimits } from "@/db/schema";
import { createTestDb, resetTestDb } from "@/db/test-db";

const T0 = new Date("2026-10-01T09:00:00Z");
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);
const rule = { limit: 3, windowMs: 10 * 60_000 };

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

describe("spam limit", () => {
  it("allows up to the limit within the window, then blocks", async () => {
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await hitRateLimit(db, "k", rule, at(i)));
    expect(results).toEqual([true, true, true, false, false]);
  });

  it("the counter resets when the window is over", async () => {
    for (let i = 0; i < 4; i++) await hitRateLimit(db, "k", rule, at(0));
    expect(await hitRateLimit(db, "k", rule, at(9))).toBe(false);
    expect(await hitRateLimit(db, "k", rule, at(10))).toBe(true);
    expect(await hitRateLimit(db, "k", rule, at(11))).toBe(true);
  });

  it("anahtarlar birbirini etkilemez", async () => {
    for (let i = 0; i < 3; i++) await hitRateLimit(db, "a", rule, at(0));
    expect(await hitRateLimit(db, "a", rule, at(1))).toBe(false);
    expect(await hitRateLimit(db, "b", rule, at(1))).toBe(true);
  });

  it("multiple rules: rejects if any one is exceeded", async () => {
    const rules = { short: rule, day: { limit: 4, windowMs: 86_400_000 } };
    const results = [];
    // Every 11 minutes: the short rule never trips, the daily rule trips on the 5th attempt.
    for (let i = 0; i < 5; i++) results.push(await hitRateLimits(db, "k", rules, at(i * 11)));
    expect(results).toEqual([true, true, true, true, false]);
  });

  it("counters older than 2 days are deleted", async () => {
    await hitRateLimit(db, "eski", rule, at(0));
    await hitRateLimit(db, "yeni", rule, at(3 * 24 * 60 - 5));
    await pruneRateLimits(db, at(3 * 24 * 60));
    const keys = (await db.select({ key: rateLimits.key }).from(rateLimits)).map((r) => r.key);
    expect(keys).toEqual(["yeni"]);
  });
});

describe("client key", () => {
  it("doesn't store the IP; the same IP gives the same key", () => {
    const h = (ip: string) => new Headers({ "x-forwarded-for": `${ip}, 10.0.0.1` });
    const k1 = clientKey(h("203.0.113.7"), "gizli");
    expect(k1).toBe(clientKey(h("203.0.113.7"), "gizli"));
    expect(k1).not.toContain("203.0.113.7");
    expect(k1).not.toBe(clientKey(h("203.0.113.8"), "gizli"));
    expect(k1).not.toBe(clientKey(h("203.0.113.7"), "baska-gizli"));
  });
});
