import Anthropic from "@anthropic-ai/sdk";
import { after } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { clientKey } from "@/features/booking/client-key";
import { getGuestLockedDates } from "@/features/booking/guest-availability";
import { hitRateLimit, hitRateLimits } from "@/features/booking/rate-limit";
import { saveExchange } from "@/features/concierge/conversations";
import { emptyUsage, runConcierge, type ChatTurn } from "@/features/concierge/run";
import type { UiAction } from "@/features/concierge/tools";
import { todayInDemre } from "@/lib/dates";

export const maxDuration = 60;

/** Per visitor (IP digest): 20 messages per 10 minutes, 80 per day. */
const VISITOR_LIMITS = {
  "10m": { limit: 20, windowMs: 10 * 60_000 },
  "1d": { limit: 80, windowMs: 86_400_000 },
};
/** Across the whole site: a ceiling on daily cost, whatever happens. */
const SITE_DAILY_LIMIT = { limit: 1000, windowMs: 86_400_000 };
/** How much of the conversation the model sees. */
const HISTORY_TURNS = 12;

const requestBody = z.object({
  conversationId: z.uuid(),
  locale: z.enum(["tr", "en", "de"]),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().min(1).max(4000) }))
    .min(1)
    .max(60)
    // The newest message is the guest's question, at most 1000 characters.
    .refine((m) => {
      const last = m.at(-1);
      return last?.role === "user" && last.text.length <= 1000;
    }),
});

let client: Anthropic | undefined;

/**
 * The AI concierge. Streams newline-delimited JSON events to the browser: text deltas,
 * UI actions (booking / WhatsApp buttons), an error if something went wrong, then "done".
 * Without ANTHROPIC_API_KEY the endpoint doesn't exist and the chat button isn't shown.
 */
export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return new Response(null, { status: 404 });
  // Rate limits live in Postgres; without it there is no cost ceiling, so don't serve.
  const db = getDb();
  if (!db) return Response.json({ error: "unavailable" }, { status: 503 });

  const parsed = requestBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
  const { conversationId, locale, messages } = parsed.data;

  const allowed =
    (await hitRateLimits(db, `chat:${clientKey(request.headers)}`, VISITOR_LIMITS)) &&
    (await hitRateLimit(db, "chat:site", SITE_DAILY_LIMIT));
  if (!allowed) return Response.json({ error: "rate_limited" }, { status: 429 });

  // The model sees the recent part of the chat, starting with a guest message.
  let history: ChatTurn[] = messages.slice(-HISTORY_TURNS);
  while (history[0].role !== "user") history = history.slice(1);

  const ctx = {
    today: todayInDemre(new Date()),
    locale,
    lockedByRoom: await getGuestLockedDates(),
  };
  client ??= new Anthropic();
  const usage = emptyUsage();
  const result = { answer: "", actions: [] as UiAction[] };

  // Stored once the response has been sent (masked, kept 30 days).
  after(() =>
    saveExchange(db, {
      id: conversationId,
      locale,
      question: history.at(-1)!.text,
      answer: result.answer,
      actions: result.actions,
      usage,
    }).catch((e) => console.error("Failed to store concierge conversation", e)),
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        for await (const event of runConcierge(client!, history, ctx, usage)) {
          if (event.type === "text") result.answer += event.text;
          if (event.type === "action") result.actions.push(event.action);
          send(event);
        }
      } catch (e) {
        console.error("Concierge request failed", e);
        send({ type: "error", code: "unavailable" });
      }
      send({ type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
