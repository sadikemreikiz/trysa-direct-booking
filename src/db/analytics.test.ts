import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { clientEventSchema, recordClientEvent } from "./analytics";
import type { Db } from "./index";
import { analyticsEvents } from "./schema";
import { createTestDb, resetTestDb } from "./test-db";

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

describe("dönüşüm olayları", () => {
  it("WhatsApp tıklamasını kaydeder", async () => {
    const event = clientEventSchema.parse({
      name: "whatsapp_click",
      path: "/de/oda/ambar-1",
      locale: "de",
      referrerHost: "www.google.com",
    });
    await recordClientEvent(db, event);
    const rows = await db.select().from(analyticsEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "whatsapp_click", locale: "de", referrerHost: "www.google.com" });
  });

  it.each([
    ["bilinmeyen olay adı", { name: "purchase", path: "/tr" }],
    ["istemcinin form gönderimi uydurması", { name: "reservation_submitted", path: "/tr" }],
    ["göreli olmayan yol", { name: "phone_click", path: "https://evil.example" }],
    ["desteklenmeyen dil", { name: "phone_click", path: "/fr", locale: "fr" }],
  ])("geçersiz olayı reddeder: %s", (_label, input) => {
    expect(clientEventSchema.safeParse(input).success).toBe(false);
  });

  it("veritabanı da bilinmeyen olay adını reddeder (uygulama atlansa bile)", async () => {
    await expect(
      client.query("INSERT INTO analytics_events (name) VALUES ('purchase')"),
    ).rejects.toThrow(/analytics_events_name/);
  });
});
