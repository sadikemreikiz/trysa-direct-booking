/**
 * The concierge loop: streams Claude's reply, runs the tools it asks for and feeds the
 * results back, for at most a few rounds. It yields small events (text, UI actions) that
 * the route handler forwards to the browser as they arrive.
 *
 * The SDK client is passed in, so tests drive the loop with a fake instead of the API.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { MenuCategory } from "@/content/menu";
import { conciergeSystemPrompt, requestContext } from "./knowledge";
import { CONCIERGE_TOOLS, runTool, type ToolContext, type UiAction } from "./tools";

/** Chosen by the owner for speed and cost; the prompt and tools are kept simple for it. */
export const CONCIERGE_MODEL = "claude-haiku-4-5";
/** Chat replies are short; this leaves room for a reply plus tool calls. */
const MAX_TOKENS = 2048;
/** Rounds of tool use per guest message before the loop gives up. */
export const MAX_TOOL_ROUNDS = 3;

export type ChatTurn = { role: "user" | "assistant"; text: string };

export type ConciergeContext = ToolContext & {
  /** The restaurant menu as staff last edited it. */
  menu: MenuCategory[];
};

export type ConciergeEvent =
  | { type: "text"; text: string }
  | { type: "action"; action: UiAction }
  | { type: "error"; code: "refused" | "unavailable" };

export type ConciergeUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  toolCalls: Record<string, number>;
};

export function emptyUsage(): ConciergeUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    toolCalls: {},
  };
}

/** The part of the SDK client the loop uses. The real `Anthropic` client satisfies it. */
export type MessageStreamer = {
  messages: {
    stream(params: Anthropic.MessageStreamParams): AsyncIterable<Anthropic.MessageStreamEvent> & {
      finalMessage(): Promise<Anthropic.Message>;
    };
  };
};

function addUsage(total: ConciergeUsage, usage: Anthropic.Usage) {
  total.inputTokens += usage.input_tokens;
  total.outputTokens += usage.output_tokens;
  total.cacheReadTokens += usage.cache_read_input_tokens ?? 0;
  total.cacheWriteTokens += usage.cache_creation_input_tokens ?? 0;
}

export async function* runConcierge(
  client: MessageStreamer,
  history: ChatTurn[],
  ctx: ConciergeContext,
  usage: ConciergeUsage,
): AsyncGenerator<ConciergeEvent> {
  const system: Anthropic.TextBlockParam[] = [
    // Rules and knowledge: identical on every request until the menu is edited, so they can be
    // cached. Haiku 4.5 only caches prefixes from 4096 tokens; today's ~3K-token prompt is below
    // that, so this marker takes effect once the knowledge grows (check usage.cacheReadTokens).
    {
      type: "text",
      text: conciergeSystemPrompt(ctx.menu),
      cache_control: { type: "ephemeral" },
    },
    // Today's date and the site language: after the breakpoint, so they don't break the cache.
    { type: "text", text: requestContext(ctx.today, ctx.locale) },
  ];
  const messages: Anthropic.MessageParam[] = history.map((turn) => ({
    role: turn.role,
    content: turn.text,
  }));

  let wroteText = false;
  let unparseableRetries = 0;

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const stream = client.messages.stream({
      model: CONCIERGE_MODEL,
      max_tokens: MAX_TOKENS,
      system,
      tools: CONCIERGE_TOOLS,
      // Last round: no more tools, so the guest always gets a written answer.
      ...(round === MAX_TOOL_ROUNDS ? { tool_choice: { type: "none" as const } } : {}),
      messages,
    });

    let separated = false;
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        // Text from a later round ("Let me check… / Good news…") starts a new paragraph.
        if (wroteText && !separated) {
          yield { type: "text", text: "\n\n" };
        }
        separated = true;
        wroteText = true;
        yield { type: "text", text: event.delta.text };
      }
    }

    let message: Anthropic.Message;
    try {
      message = await stream.finalMessage();
      unparseableRetries = 0;
    } catch (err) {
      // With eager input streaming, a tool input that isn't valid JSON rejects here.
      // Re-issue that turn once; API errors (rate limits, outages) go to the caller.
      if (err instanceof Anthropic.APIError || unparseableRetries++ >= 1) throw err;
      round--;
      continue;
    }
    addUsage(usage, message.usage);

    if (message.stop_reason === "refusal") {
      yield { type: "error", code: "refused" };
      return;
    }
    const toolUses = message.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    // Done: a plain answer, or a reply cut at max_tokens (never run a truncated tool call).
    if (toolUses.length === 0 || message.stop_reason === "max_tokens") return;
    if (round === MAX_TOOL_ROUNDS) return;

    messages.push({ role: "assistant", content: message.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const call of toolUses) {
      usage.toolCalls[call.name] = (usage.toolCalls[call.name] ?? 0) + 1;
      const outcome = runTool(call.name, call.input, ctx);
      if (outcome.action) yield { type: "action", action: outcome.action };
      results.push({
        type: "tool_result",
        tool_use_id: call.id,
        content: outcome.content,
        ...(outcome.isError ? { is_error: true } : {}),
      });
    }
    // All results of one turn go back in a single user message.
    messages.push({ role: "user", content: results });
  }
}
