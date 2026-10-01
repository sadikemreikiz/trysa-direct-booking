import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import { createTestDb, resetTestDb } from "@/db/test-db";
import type { EmailResult } from "@/features/notifications/email";
import { alertAdmins, HOUR_MS, type AlertChannels } from "./alerts";

const T0 = new Date("2026-10-01T09:00:00Z");
const at = (ms: number) => new Date(T0.getTime() + ms);

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

function channels(push: EmailResult = { ok: true }, email: EmailResult = { ok: true }) {
  return {
    push: vi.fn<AlertChannels["push"]>().mockResolvedValue(push),
    email: vi.fn<AlertChannels["email"]>().mockResolvedValue(email),
  };
}

const alert = { key: "test", title: "⚠️ Test", body: "Something broke" };

describe("alerting the admins", () => {
  it("pushes to their phones once per cooldown, however often the error repeats", async () => {
    const c = channels();
    const outcomes = [
      await alertAdmins(db, alert, { now: at(0), channels: c }),
      await alertAdmins(db, alert, { now: at(30 * 60_000), channels: c }),
      await alertAdmins(db, alert, { now: at(HOUR_MS + 1), channels: c }),
    ];
    expect(outcomes).toEqual(["push", "suppressed", "push"]);
    expect(c.push).toHaveBeenCalledWith(db, {
      title: "⚠️ Test",
      body: "Something broke",
      url: "/panel",
    });
    expect(c.email).not.toHaveBeenCalled();
  });

  it("emails the family address when push fails", async () => {
    const c = channels({ ok: false, error: "push service down" });
    expect(await alertAdmins(db, alert, { now: at(0), channels: c })).toBe("email");
    expect(c.email).toHaveBeenCalledWith("[Trysa uyarı] ⚠️ Test", "Something broke");
  });

  it("without a database it emails, still at most once per cooldown", async () => {
    const c = channels();
    const key = { ...alert, key: "no-db" };
    expect(await alertAdmins(null, key, { now: at(0), channels: c })).toBe("email");
    expect(await alertAdmins(null, key, { now: at(60_000), channels: c })).toBe("suppressed");
    expect(c.email).toHaveBeenCalledTimes(1);
  });

  it("never throws, so a broken alert can't break the request that raised it", async () => {
    const c = {
      push: vi.fn<AlertChannels["push"]>().mockRejectedValue(new Error("db gone")),
      email: vi.fn<AlertChannels["email"]>().mockRejectedValue(new Error("email gone")),
    };
    const key = { ...alert, key: "all-down" };
    await expect(alertAdmins(db, key, { now: at(0), channels: c })).resolves.toBe("failed");
  });
});
