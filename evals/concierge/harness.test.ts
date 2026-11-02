import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { stays } from "@/content/site";
import type { MessageStreamer } from "@/features/concierge/run";
import { cases, type EvalCase } from "./cases";
import {
  checkText,
  checkTools,
  gradeCase,
  judgeInput,
  JUDGE_MODEL,
  runCase,
  type CaseRun,
  type JudgeClient,
  type JudgeVerdict,
} from "./harness";

const usage = {
  input_tokens: 100,
  output_tokens: 20,
  cache_read_input_tokens: 4000,
  cache_creation_input_tokens: 0,
};

/** A streamed reply as the SDK returns it: text deltas, then the final message. */
function reply(content: Anthropic.ContentBlock[], model = "claude-haiku-5-5") {
  const toolUse = content.some((b) => b.type === "tool_use");
  const message = {
    id: "msg",
    type: "message",
    role: "assistant",
    model,
    content,
    stop_reason: toolUse ? "tool_use" : "end_turn",
    stop_sequence: null,
    usage,
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
  const models: string[] = [];
  const client: MessageStreamer = {
    messages: {
      stream(params) {
        models.push(params.model);
        const next = replies.shift();
        if (!next) throw new Error("no more fake replies");
        return next;
      },
    },
  };
  return { client, models };
}

const byId = (id: string) => cases.find((c) => c.id === id)!;
const tinyBooked = byId("availability-tiny-booked");

async function tinyRun() {
  const { client } = fakeClient([
    reply([
      toolUse("t1", "check_availability", {
        checkin: "2026-11-20",
        checkout: "2026-11-22",
        room: "tiny-house",
      }),
    ]),
    reply([text("Maalesef Tiny House 20-22 Kasım'da dolu.")]),
  ]);
  return runCase(tinyBooked, client);
}

describe("cases", () => {
  it("have unique ids, criteria and valid tool expectations", () => {
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
    const rooms = new Set(stays.map((s) => s.slug));
    for (const c of cases) {
      expect(c.criteria.length, c.id).toBeGreaterThan(0);
      expect(c.turns.at(-1)?.role, c.id).toBe("user");
      for (const fields of Object.values(c.tools?.inputs ?? {})) {
        for (const room of [fields?.room ?? []].flat()) {
          if (room !== null) expect(rooms.has(String(room)), `${c.id}: ${room}`).toBe(true);
        }
      }
    }
  });

  it("accept a tool call made with the expected inputs (oracle)", () => {
    for (const c of cases) {
      const calls = Object.entries(c.tools?.inputs ?? {}).map(([name, fields]) => ({
        name,
        input: Object.fromEntries(
          Object.entries(fields!)
            .map(([key, value]) => [key, [value].flat()[0]])
            .filter(([, value]) => value !== null),
        ),
      }));
      for (const name of c.tools?.mustCall ?? []) {
        if (!calls.some((call) => call.name === name)) calls.push({ name, input: {} });
      }
      expect(checkTools(c, calls), c.id).toEqual([]);
    }
  });
});

describe("checkTools", () => {
  it("fails a missing, forbidden or wrongly filled call", () => {
    expect(checkTools(tinyBooked, [])).toEqual(["did not call check_availability"]);
    const wrong = [
      { name: "check_availability", input: { checkin: "2026-11-21", checkout: "2026-11-22" } },
    ];
    expect(checkTools(tinyBooked, wrong)[0]).toMatch(/don't match/);
    const price = byId("facts-price-tiny");
    expect(checkTools(price, [{ name: "offer_whatsapp", input: {} }])).toEqual([
      "called offer_whatsapp",
    ]);
  });

  it("accepts a field left out when null is allowed", () => {
    const calls = [
      { name: "check_availability", input: { checkin: "2026-11-20", checkout: "2026-11-22" } },
    ];
    expect(checkTools(tinyBooked, calls)).toEqual([]);
  });
});

describe("checkText", () => {
  it("checks required and forbidden text and the plain-text rule", () => {
    const price = byId("facts-price-tiny");
    expect(checkText(price, "Gecelik 1.750 ₺.").expected).toEqual([]);
    expect(checkText(price, "Gecelik 1500 ₺.").expected).toHaveLength(1);
    expect(checkText(price, "## Fiyat\n1.750 ₺").conduct).toEqual([
      "reply uses a markdown heading",
    ]);
    // The chat shows replies as typed: bold would reach the guest as asterisks.
    expect(checkText(price, "- **Tiny House**: 1.750 ₺").conduct).toEqual([
      "reply uses a markdown bold",
    ]);
    expect(checkText(price, "- Tiny House: 1.750 ₺\n- Kulübe-1: 1.500 ₺").conduct).toEqual([]);
    const discount = byId("handoff-discount");
    expect(checkText(discount, "Size %10 indirim yapabiliriz.").conduct).toHaveLength(1);
  });
});

describe("runCase", () => {
  it("runs the real loop and keeps the tool calls, transcript and usage", async () => {
    const run = await tinyRun();
    expect(run.output).toBe("Maalesef Tiny House 20-22 Kasım'da dolu.");
    expect(run.toolCalls).toHaveLength(1);
    // The fixed calendar has the Tiny House booked on the nights of 20 and 21 November.
    expect(JSON.parse(run.toolCalls[0].result!).rooms[0]).toMatchObject({
      id: "tiny-house",
      available: false,
    });
    expect(run.transcript.map((t) => t.role)).toEqual([
      "system",
      "user",
      "tool_call",
      "tool_result",
      "assistant",
    ]);
    expect(run.usage.input_tokens).toBe(200);
    expect(run.api_calls).toBe(2);
    expect(run.status).toBe("ok");
  });

  it("sends the requested model and fails when another one answers", async () => {
    const { client, models } = fakeClient([reply([text("Hi")], "claude-other")]);
    const run = await runCase(byId("rules-are-you-human"), client, "claude-other");
    expect(models).toEqual(["claude-other"]);
    expect(run.model).toBe("claude-other");

    const mixed = fakeClient([
      reply([toolUse("t1", "offer_booking", {})]),
      reply([text("Done")], "claude-other"),
    ]);
    await expect(runCase(byId("booking-how"), mixed.client)).rejects.toMatchObject({
      failure_class: "serving_mismatch",
    });
  });
});

const allOk = (c: EvalCase): JudgeVerdict => ({
  criteria: c.criteria.map((_, i) => ({ number: i + 1, reason: "quoted", met: true })),
  grounded: { reason: "supported", ok: true },
  language: { reason: "Turkish", ok: true },
  conduct: { reason: "fine", ok: true },
});

function fakeJudge(verdict: JudgeVerdict | null, model = JUDGE_MODEL) {
  const inputs: string[] = [];
  const client = {
    messages: {
      parse: async (params: Anthropic.MessageCreateParamsNonStreaming) => {
        inputs.push(String(params.messages[0].content));
        return { model, usage, stop_reason: "end_turn", parsed_output: verdict };
      },
    },
  } as unknown as JudgeClient;
  return { client, inputs };
}

describe("gradeCase", () => {
  it("passes a good reply (oracle) and records the judge's model and usage", async () => {
    const run = await tinyRun();
    const { client, inputs } = fakeJudge(allOk(tinyBooked));
    const result = await gradeCase(client, tinyBooked, run);
    expect(result.grade).toEqual({
      pass: 1,
      expected: 1,
      grounded: 1,
      tools: 1,
      language: 1,
      conduct: 1,
    });
    expect(result.judge_model).toBe(JUDGE_MODEL);
    expect(inputs[0]).toContain("[tool call check_availability]");
    expect(inputs[0]).toContain("1. Says the Tiny House is not available");
  });

  it("fails every judged metric for an empty reply or a refusal, without a judge call", async () => {
    const empty: CaseRun = { ...(await tinyRun()), output: "", actions: [], toolCalls: [] };
    const { client, inputs } = fakeJudge(allOk(tinyBooked));
    const result = await gradeCase(client, tinyBooked, empty);
    expect(result.grade).toEqual({
      pass: 0,
      expected: 0,
      grounded: 0,
      tools: 0,
      language: 0,
      conduct: 0,
    });
    expect(inputs).toHaveLength(0);
    const refused = await gradeCase(client, tinyBooked, { ...empty, refused: true });
    expect(refused.explanation.expected).toContain("refused");
  });

  it("fails the metric the judge or a code check rejects", async () => {
    const run = await tinyRun();
    const verdict = allOk(tinyBooked);
    verdict.grounded = { reason: "invents a pool", ok: false };
    const result = await gradeCase(fakeJudge(verdict).client, tinyBooked, run);
    expect(result.grade).toMatchObject({ pass: 0, grounded: 0, expected: 1, tools: 1 });
    expect(result.explanation.grounded).toBe("invents a pool");
  });

  it("files a wrong-sized or wrong-model verdict as an error with the billed usage", async () => {
    const run = await tinyRun();
    const short = { ...allOk(tinyBooked), criteria: [] };
    await expect(gradeCase(fakeJudge(short).client, tinyBooked, run)).rejects.toMatchObject({
      failure_class: "judge_error",
      judge_usage: usage,
    });
    await expect(
      gradeCase(fakeJudge(allOk(tinyBooked), "claude-other").client, tinyBooked, run),
    ).rejects.toMatchObject({ failure_class: "serving_mismatch" });
  });

  it("shows the judge the whole conversation and the buttons", async () => {
    const multi = byId("booking-multi-turn");
    const { client } = fakeClient([
      reply([toolUse("t1", "offer_booking", { checkin: "2026-11-25" })]),
      reply([text("Here is the form.")]),
    ]);
    const input = judgeInput(multi, await runCase(multi, client));
    expect(input).toContain("Assistant (earlier reply): Lovely choice!");
    expect(input).toContain("Guest (last message): From November 25 to 27");
    expect(input).toContain("[buttons shown] booking: /en/rezervasyon?checkin=2026-11-25");
  });
});
