import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { createTestDb, resetTestDb } from "@/db/test-db";
import { lastOk, recordCheck } from "./health";

const T0 = new Date("2026-10-01T09:00:00Z");
const min = (m: number) => new Date(T0.getTime() + m * 60_000);
const GRACE = 60 * 60_000;
const down = { ok: false as const, error: "HTTP 503" };

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

describe("health checks", () => {
  it("alert once after the grace period, then once more when it works again", async () => {
    const changes = [
      await recordCheck(db, "x", down, GRACE, min(0)),
      await recordCheck(db, "x", down, GRACE, min(30)),
      await recordCheck(db, "x", down, GRACE, min(61)),
      await recordCheck(db, "x", down, GRACE, min(90)),
      await recordCheck(db, "x", { ok: true }, GRACE, min(120)),
      await recordCheck(db, "x", { ok: true }, GRACE, min(135)),
    ];
    expect(changes.map((c) => c.kind)).toEqual([
      "none",
      "none",
      "failing",
      "none",
      "recovered",
      "none",
    ]);
    expect(changes[2]).toEqual({ kind: "failing", since: min(0), error: "HTTP 503" });
  });

  it("a short failure that recovers within the grace period stays silent", async () => {
    await recordCheck(db, "y", down, GRACE, min(0));
    expect(await recordCheck(db, "y", { ok: true }, GRACE, min(20))).toEqual({ kind: "none" });
    // A new failure starts its own grace period
    expect((await recordCheck(db, "y", down, GRACE, min(70))).kind).toBe("none");
  });

  it("remembers when a check last worked", async () => {
    expect(await lastOk(db, "z")).toBeNull();
    await recordCheck(db, "z", { ok: true }, GRACE, min(5));
    await recordCheck(db, "z", down, GRACE, min(20));
    expect(await lastOk(db, "z")).toEqual(min(5));
  });
});
