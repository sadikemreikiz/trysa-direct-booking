import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { CONCIERGE_SYSTEM_PROMPT, requestContext } from "./knowledge";
import { maskPersonalData } from "./mask";
import {
  emptyUsage,
  MAX_TOOL_ROUNDS,
  runConcierge,
  type ConciergeEvent,
  type MessageStreamer,
} from "./run";
import { runTool, type ToolContext } from "./tools";

const ctx: ToolContext = {
  today: "2026-10-01",
  locale: "en",
  // Nights of 10 and 11 October are booked in Ambar-1
  lockedByRoom: { "Ambar-1": ["2026-10-10", "2026-10-11"] },
};

describe("knowledge", () => {
  it("is built from the site's content: rooms, prices, menu and FAQ", () => {
    expect(CONCIERGE_SYSTEM_PROMPT).toContain("Tiny House (id: tiny-house)");
    expect(CONCIERGE_SYSTEM_PROMPT).toContain("1.750 ₺ per night");
    expect(CONCIERGE_SYSTEM_PROMPT).toContain("Kuzu Şiş (Lamb skewer) 650 ₺");
    expect(CONCIERGE_SYSTEM_PROMPT).toContain("Check-out is 12:00");
  });

  it("contains nothing that changes per request, so it stays cacheable", () => {
    expect(CONCIERGE_SYSTEM_PROMPT).not.toMatch(/20\d\d-\d\d-\d\d/);
    expect(requestContext("2026-10-01", "de")).toBe(
      'Today\'s date in Demre is 2026-10-01 (Thursday). The guest is browsing the website in "de".',
    );
  });
});

describe("check_availability", () => {
  const check = (input: unknown) => runTool("check_availability", input, ctx);

  it("reports each room from the booking calendar's data", () => {
    const out = JSON.parse(check({ checkin: "2026-10-09", checkout: "2026-10-12" }).content);
    expect(out.nights).toBe(3);
    const byId = Object.fromEntries(out.rooms.map((r: { id: string }) => [r.id, r]));
    expect(byId["ambar-1"].available).toBe(false);
    expect(byId["ambar-2"].available).toBe(true);
    expect(byId["kamp"].available).toMatch(/^ask/);
  });

  it("a stay can end on the morning of the next booking", () => {
    const out = JSON.parse(
      check({ checkin: "2026-10-08", checkout: "2026-10-10", room: "ambar-1" }).content,
    );
    expect(out.rooms).toEqual([
      expect.objectContaining({ id: "ambar-1", available: true, price_per_night: "1.350 ₺" }),
    ]);
  });

  it("returns errors the model can explain instead of guessing", () => {
    expect(check({ checkin: "2026-09-30", checkout: "2026-10-02" })).toMatchObject({
      isError: true,
    });
    expect(check({ checkin: "2026-10-05", checkout: "2026-10-05" }).content).toContain(
      "checkout_must_be_after",
    );
    expect(check({ checkin: "2026-10-05", checkout: "2027-01-05" }).content).toContain(
      "stay_too_long",
    );
    expect(check({ checkin: "5 Oct", checkout: "7 Oct" })).toMatchObject({ isError: true });
    expect(
      check({ checkin: "2026-10-05", checkout: "2026-10-07", room: "penthouse" }),
    ).toMatchObject({
      isError: true,
    });
  });
});

describe("offer_booking and offer_whatsapp", () => {
  it("builds the prefilled booking link itself, in the guest's language", () => {
    const out = runTool(
      "offer_booking",
      { checkin: "2026-10-08", checkout: "2026-10-10", room: "tiny-house", guests: 2 },
      { ...ctx, locale: "de" },
    );
    expect(out.action).toEqual({
      type: "booking",
      href: "/de/rezervasyon?checkin=2026-10-08&checkout=2026-10-10&unit=tiny-house&guests=2",
    });
  });

  it("works with no details at all", () => {
    expect(runTool("offer_booking", {}, ctx).action).toEqual({
      type: "booking",
      href: "/en/rezervasyon",
    });
  });

  it("links to the family's WhatsApp with the message prefilled", () => {
    const out = runTool("offer_whatsapp", { message: "Is a 7 m campervan OK?" }, ctx);
    expect(out.action).toEqual({
      type: "whatsapp",
      href: "https://wa.me/905555721569?text=Is%20a%207%20m%20campervan%20OK%3F",
    });
  });
});

describe("maskPersonalData", () => {
  it("masks email addresses and phone numbers", () => {
    expect(maskPersonalData("I'm anna.schmidt@web.de, call +49 170 1234567")).toBe(
      "I'm [email], call [phone]",
    );
    expect(maskPersonalData("numaram 0532 000 00 01 ya da 532 000 00 02")).toBe(
      "numaram [phone] ya da [phone]",
    );
  });

  it("keeps dates, prices and booking codes readable", () => {
    const text = "From 12.10.2026 to 15.10.2026, 2026-10-12 – 2026-10-15, 1.350 ₺, code TRY-7K3Q9";
    expect(maskPersonalData(text)).toBe(text);
  });
});

/** A fake SDK stream: emits the text as deltas, then resolves with the message. */
function reply(content: Anthropic.ContentBlock[], stopReason: Anthropic.StopReason = "end_turn") {
  const message = {
    id: "msg",
    type: "message",
    role: "assistant",
    model: "claude-haiku-4-5",
    content,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: {
      input_tokens: 100,
      output_tokens: 20,
      cache_read_input_tokens: 4000,
      cache_creation_input_tokens: 0,
    },
  } as unknown as Anthropic.Message;
  return {
    async *[Symbol.asyncIterator]() {
      for (const block of content) {
        if (block.type === "text") {
          yield {
            type: "content_block_delta",
            index: 0,
            delta: { type: "text_delta", text: block.text },
          } as Anthropic.MessageStreamEvent;
        }
      }
    },
    finalMessage: async () => message,
  };
}

const text = (t: string) => ({ type: "text", text: t, citations: null }) as Anthropic.TextBlock;
const toolUse = (id: string, name: string, input: unknown) =>
  ({ type: "tool_use", id, name, input }) as Anthropic.ToolUseBlock;

function fakeClient(replies: ReturnType<typeof reply>[]) {
  const requests: Anthropic.MessageStreamParams[] = [];
  const client: MessageStreamer = {
    messages: {
      stream(params) {
        requests.push(structuredClone(params));
        const next = replies.shift();
        if (!next) throw new Error("no more fake replies");
        return next;
      },
    },
  };
  return { client, requests };
}

async function collect(generator: AsyncGenerator<ConciergeEvent>) {
  const events: ConciergeEvent[] = [];
  for await (const event of generator) events.push(event);
  return events;
}

describe("runConcierge", () => {
  it("caches the knowledge and sends today's date after the cache breakpoint", async () => {
    const { client, requests } = fakeClient([reply([text("Hi!")])]);
    await collect(runConcierge(client, [{ role: "user", text: "Hello" }], ctx, emptyUsage()));
    const system = requests[0].system as Anthropic.TextBlockParam[];
    expect(system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(system[1].cache_control).toBeUndefined();
    expect(system[1].text).toContain("2026-10-01");
  });

  it("runs the tool, returns its result and streams the final answer", async () => {
    const { client, requests } = fakeClient([
      reply(
        [
          text("Let me check."),
          toolUse("t1", "check_availability", {
            checkin: "2026-10-09",
            checkout: "2026-10-12",
            room: "ambar-1",
          }),
        ],
        "tool_use",
      ),
      reply([text("Ambar-1 is booked then, but Ambar-2 is free.")]),
    ]);
    const usage = emptyUsage();
    const events = await collect(
      runConcierge(client, [{ role: "user", text: "Ambar-1 9-12 Oct?" }], ctx, usage),
    );

    expect(events.map((e) => (e.type === "text" ? e.text : e.type)).join("")).toBe(
      "Let me check.\n\nAmbar-1 is booked then, but Ambar-2 is free.",
    );
    const toolResult = (
      requests[1].messages.at(-1)!.content as Anthropic.ToolResultBlockParam[]
    )[0];
    expect(toolResult.tool_use_id).toBe("t1");
    expect(JSON.parse(toolResult.content as string).rooms[0].available).toBe(false);
    expect(usage).toMatchObject({ inputTokens: 200, outputTokens: 40, cacheReadTokens: 8000 });
    expect(usage.toolCalls).toEqual({ check_availability: 1 });
  });

  it("forwards UI actions as soon as the tool runs", async () => {
    const { client } = fakeClient([
      reply([toolUse("t1", "offer_booking", { room: "kulube-1" })], "tool_use"),
      reply([text("Tap the button to send your request.")]),
    ]);
    const events = await collect(
      runConcierge(client, [{ role: "user", text: "Book Kulübe-1" }], ctx, emptyUsage()),
    );
    expect(events[0]).toEqual({
      type: "action",
      action: { type: "booking", href: "/en/rezervasyon?unit=kulube-1" },
    });
  });

  it("stops offering tools after the last round, so there is always an answer", async () => {
    const loop = Array.from({ length: MAX_TOOL_ROUNDS }, (_, i) =>
      reply(
        [toolUse(`t${i}`, "check_availability", { checkin: "2026-10-09", checkout: "2026-10-12" })],
        "tool_use",
      ),
    );
    const { client, requests } = fakeClient([...loop, reply([text("Here's what I found.")])]);
    await collect(runConcierge(client, [{ role: "user", text: "?" }], ctx, emptyUsage()));
    expect(requests).toHaveLength(MAX_TOOL_ROUNDS + 1);
    expect(requests.at(-1)!.tool_choice).toEqual({ type: "none" });
  });

  it("never runs a tool call cut off at max_tokens, and reports refusals", async () => {
    const cut = fakeClient([
      reply([toolUse("t1", "offer_whatsapp", { message: "Is" })], "max_tokens"),
    ]);
    expect(
      await collect(runConcierge(cut.client, [{ role: "user", text: "?" }], ctx, emptyUsage())),
    ).toEqual([]);

    const refused = fakeClient([reply([], "refusal")]);
    expect(
      await collect(runConcierge(refused.client, [{ role: "user", text: "?" }], ctx, emptyUsage())),
    ).toEqual([{ type: "error", code: "refused" }]);
  });
});
