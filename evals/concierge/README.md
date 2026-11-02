# AI concierge eval

31 scripted guest conversations run through the production concierge loop ([`src/features/concierge/run.ts`](../../src/features/concierge/run.ts)) with the production model, prompt and tools, then graded. Only the date (Tuesday 10 November 2026), the booking calendar and the menu are fixed, so the right answer to "is it free?" is known.

- **Cases** ([`cases.ts`](cases.ts), readable in [`cases.md`](cases.md)): facts 10, availability 6, booking 4, handoff to the family 4, rules 7; Turkish 9, English 15, German 7. They are written from the site's content, not taken from real guest messages.
- **Code checks:** which tools were called and with which inputs (for example `check_availability` for 20–22 November), text the reply must or must not contain, plain text without markdown.
- **Judge** (Claude Sonnet 5.5, structured output): the case's own criteria; _grounded_, no claim about Trysa beyond the knowledge or a tool result; _language_, the guest's language with the informal "sen"/"du"; _conduct_, the concierge's rules, including not saying the same thing twice.
- **Metrics** per case, 0 or 1: `pass` when `expected`, `grounded`, `tools`, `language` and `conduct` all pass.

The grader has offline tests ([`harness.test.ts`](harness.test.ts)): a reference answer passes, an empty reply or a refusal fails without a judge call, and API errors or a different model answering are filed as errors, not scores. Two pilots of five cases were read by hand before the full runs; that review added the check for bold text and the rule against repeating.

## Running it

```bash
npm run eval:concierge -- --variant baseline                  # all cases
npm run eval:concierge -- --variant v1 --cases id1,id2        # some cases
```

It needs an Anthropic API key in `.env.eval.local` (`ANTHROPIC_API_KEY=…`), separate from the website's so eval spend shows up on its own. On the first run, and after any change to the eval code or cases, add `--approve-harness`: the runner records a hash of the eval code and refuses to run code nobody approved. Results go to `.claude/hillclimb/concierge/<variant>/` (`results.jsonl`, full transcripts in `traces/`, failed attempts in `errors.jsonl`), which is not committed. A full run takes under a minute and costs about $0.20, almost all of it the judge.

## Results (2 November 2026)

One run per case. Costs from the API's token counts at list prices.

|                                | baseline    | v1          | v2              |
| ------------------------------ | ----------- | ----------- | --------------- |
| **pass**                       | 22/31 (71%) | 24/31 (77%) | **29/31 (94%)** |
| expected                       | 30          | 30          | 30              |
| grounded                       | 28          | 31          | 31              |
| tools                          | 31          | 31          | 31              |
| language                       | 31          | 26          | 31              |
| conduct                        | 23          | 30          | 30              |
| model calls, all cases         | 52          | 38          | 38              |
| median time per conversation   | 2.2 s       | 1.9 s       | 2.0 s           |
| concierge cost, all cases      | $0.0087     | $0.0071     | $0.0090         |
| cost with the judge, all cases | $0.219      | $0.171      | $0.204          |

- **baseline:** 7 of the 9 failures were the same answer written twice, before and after a WhatsApp or booking button; 3 replies made a claim the knowledge doesn't support (for example that the Kekova boat tours leave from nearby).
- **v1** ([`run.ts`](../../src/features/concierge/run.ts)): the turn ends after a button when the reply is already written. Repeated answers went from 7 to 0 and model calls fell by 27%. In this run, 5 of the 9 Turkish replies used the formal "siz"; the first model request is identical in both versions, so that is run-to-run variation the baseline happened not to show, not an effect of the change.
- **v2** ([`knowledge.ts`](../../src/features/concierge/knowledge.ts)): the informal "sen"/"du" rule spelled out with the forms to use and to avoid. Language back to 31/31.
- **Left in v2:** one reply used bold text, which the chat shows as asterisks (the rule now names bold; not measured yet); and one failure was the judge's, a reply that only offered to check other rooms (that criterion has been reworded since).

Limits: with one run of 31 cases, a pass rate moves by about ±18 points from chance alone, so single cases flipping mean little; the fixes above are backed by the specific failures they removed. The grounded improvement from baseline to v1 is partly chance: the Kekova case calls no tool, so the change can't have affected it. Building and running the eval (two pilots and three full runs) cost $0.70.
