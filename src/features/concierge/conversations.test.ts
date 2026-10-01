import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { conciergeConversations } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { deleteExpiredConversations, saveExchange, type StoredMessage } from "./conversations";
import { emptyUsage } from "./run";

const ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const NOW = new Date("2026-10-01T09:00:00Z");
const DAY = 86_400_000;

let db: Db;
let client: PGlite;

beforeAll(async () => {
  ({ db, client } = await createTestDb());
});
afterAll(async () => {
  await client.close();
});
beforeEach(async () => {
  await client.exec("TRUNCATE concierge_conversations");
});

const usage = (input: number, tools: Record<string, number> = {}) => ({
  ...emptyUsage(),
  inputTokens: input,
  outputTokens: 50,
  toolCalls: tools,
});

describe("saveExchange", () => {
  it("creates the conversation, then appends to it and adds up the usage", async () => {
    await saveExchange(db, {
      id: ID,
      locale: "en",
      question: "Is Ambar-1 free 9-12 Oct?",
      answer: "Yes, it is.",
      actions: [],
      usage: usage(3000, { check_availability: 1 }),
      now: NOW,
    });
    await saveExchange(db, {
      id: ID,
      locale: "en",
      question: "Great, I want to book",
      answer: "Tap the button below.",
      actions: [{ type: "booking", href: "/en/rezervasyon?unit=ambar-1" }],
      usage: usage(3200, { offer_booking: 1 }),
      now: new Date(NOW.getTime() + 60_000),
    });

    const [row] = await db.select().from(conciergeConversations);
    const messages = row.messages as StoredMessage[];
    expect(row.turns).toBe(2);
    expect(row.inputTokens).toBe(6200);
    expect(row.outputTokens).toBe(100);
    expect(row.toolCalls).toEqual(["check_availability", "offer_booking"]);
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant", "user", "assistant"]);
    expect(messages[3].actions).toEqual(["booking"]);
    expect(row.updatedAt.getTime()).toBe(NOW.getTime() + 60_000);
  });

  it("masks contact details before storing", async () => {
    await saveExchange(db, {
      id: ID,
      locale: "de",
      question: "Ruft mich an: +49 170 1234567 oder anna@example.com",
      answer: "Bitte nutze das Buchungsformular.",
      actions: [],
      usage: usage(100),
      now: NOW,
    });
    const [row] = await db.select().from(conciergeConversations);
    expect((row.messages as StoredMessage[])[0].text).toBe("Ruft mich an: [phone] oder [email]");
  });
});

describe("deleteExpiredConversations", () => {
  it("deletes conversations 30 days after their last message", async () => {
    const save = (id: string, daysAgo: number) =>
      saveExchange(db, {
        id,
        locale: "tr",
        question: "Merhaba",
        answer: "Merhaba!",
        actions: [],
        usage: usage(1),
        now: new Date(NOW.getTime() - daysAgo * DAY),
      });
    await save(ID, 31);
    await save("7a2b3c4d-5e6f-4a70-8b9c-0d1e2f3a4b5c", 29);
    expect(await deleteExpiredConversations(db, NOW)).toBe(1);
    expect(await db.select().from(conciergeConversations)).toHaveLength(1);
  });
});
