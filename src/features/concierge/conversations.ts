/**
 * Stored concierge conversations: one row per chat, each exchange appended with contact
 * details masked. Rows are deleted 30 days after the last message (see the privacy policy).
 */
import { lt, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { conciergeConversations } from "@/db/schema";
import { maskPersonalData } from "./mask";
import type { ConciergeUsage } from "./run";
import type { UiAction } from "./tools";

export const CONVERSATION_RETENTION_DAYS = 30;

export type StoredMessage = {
  role: "user" | "assistant";
  text: string;
  at: string;
  actions?: UiAction["type"][];
};

/** Appends one guest message and the assistant's reply; creates the conversation if needed. */
export async function saveExchange(
  db: Db,
  exchange: {
    id: string;
    locale: string;
    question: string;
    answer: string;
    actions: UiAction[];
    usage: ConciergeUsage;
    now?: Date;
  },
): Promise<void> {
  const now = exchange.now ?? new Date();
  const at = now.toISOString();
  const messages: StoredMessage[] = [
    { role: "user", text: maskPersonalData(exchange.question), at },
    {
      role: "assistant",
      text: maskPersonalData(exchange.answer),
      at,
      ...(exchange.actions.length ? { actions: exchange.actions.map((a) => a.type) } : {}),
    },
  ];
  const toolCalls = Object.entries(exchange.usage.toolCalls).flatMap(([name, n]) =>
    Array<string>(n).fill(name),
  );
  const { usage } = exchange;
  const t = conciergeConversations;
  await db
    .insert(t)
    .values({
      id: exchange.id,
      locale: exchange.locale,
      messages,
      toolCalls,
      turns: 1,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheReadTokens: usage.cacheReadTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: t.id,
      set: {
        messages: sql`${t.messages} || excluded.messages`,
        toolCalls: sql`${t.toolCalls} || excluded.tool_calls`,
        turns: sql`${t.turns} + 1`,
        inputTokens: sql`${t.inputTokens} + excluded.input_tokens`,
        outputTokens: sql`${t.outputTokens} + excluded.output_tokens`,
        cacheReadTokens: sql`${t.cacheReadTokens} + excluded.cache_read_tokens`,
        cacheWriteTokens: sql`${t.cacheWriteTokens} + excluded.cache_write_tokens`,
        updatedAt: now,
      },
    });
}

/** Deletes conversations whose last message is older than the retention period. */
export async function deleteExpiredConversations(db: Db, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - CONVERSATION_RETENTION_DAYS * 86_400_000);
  const deleted = await db
    .delete(conciergeConversations)
    .where(lt(conciergeConversations.updatedAt, cutoff))
    .returning({ id: conciergeConversations.id });
  return deleted.length;
}
