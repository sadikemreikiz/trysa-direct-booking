# 0007: An AI concierge grounded in site content and tools, not free text

**Status:** accepted (October 2026)

## Context

Guests ask the same questions at all hours, in Turkish, English and German: is a room free on these dates, is breakfast included, how do I get there from the airport. The family answers on WhatsApp when they can. A chat assistant could answer immediately, but a guesthouse assistant that invents a price, promises a room that is taken or quotes a wrong check-in time does real damage.

## Decision

- **Knowledge comes from the site, not from a separate document.** The system prompt is generated from the same content the pages render (rooms and prices, menu, FAQ, distances), so a price change on the site changes the assistant too. The rules say to answer only from that knowledge and to hand off to WhatsApp otherwise. The prompt is deterministic so it can be cached; today's date travels in a second system block after the cache breakpoint.
- **Facts that change come from tools.** `check_availability` reads the same data as the booking calendar; the model never states availability without calling it.
- **The model never writes links.** `offer_booking` and `offer_whatsapp` make our code build the URL (a prefilled booking form, a WhatsApp chat) and show it as a button; the browser renders only site paths and `wa.me` links. The assistant cannot confirm bookings.
- **Model: Claude Haiku 4.5**, the owner's choice for speed and cost (about two cents a conversation). The loop is kept simple for it: at most three tool rounds, the last without tools so there is always an answer.
- **Cost ceilings in the database**: 20 messages per 10 minutes and 80 a day per visitor, 1000 a day for the whole site. Without the database the endpoint refuses to serve.
- **Privacy**: the chat is labelled as AI. Conversations are stored for 30 days with emails and phone numbers masked, to review and improve the assistant, then deleted; they are not linked to bookings or IP addresses.

## Consequences

- Answers are only as complete as the site's content; gaps turn into WhatsApp hand-offs rather than guesses, which is the intended failure mode.
- The prompt is about 3K tokens, below Haiku 4.5's 4096-token caching minimum, so caching only takes effect if the knowledge grows. At this size each message costs well under a cent either way.
- The loop is tested without API calls (a fake client), and end to end against a local fake of the streaming Messages API. Answer quality needs an evaluation set of real guest questions, run against the real model.

**Revisit when** the content outgrows the prompt (move to retrieval), or measured answer quality on the evaluation set calls for a larger model.

## Update (October 2026): Claude Haiku 5.5

The concierge went live on a small prepaid API credit with automatic top-up switched off, so when the credit runs out the assistant only says it is unavailable. To make that credit last, it moved from Claude Haiku 4.5 to Claude Haiku 5.5, whose list price is a tenth per token ($0.10 / $0.50 per million input / output tokens against $1 / $5). The saving per conversation is smaller than tenfold, because the newer tokenizer counts the same text as about 30% more tokens and the model now thinks before answering; the real cost per conversation is to be read from the API console rather than estimated.

- **Thinking:** Haiku 5.5 thinks adaptively, at `medium` effort here. `low` would be cheaper, but calling the availability tool instead of guessing matters more than a fraction of a cent, and at these prices thinking adds little. Thinking text is never shown to guests.
- **Tool loop:** each assistant turn, thinking blocks included, goes back unchanged with the tool results, and the history within a guest message stays append-only, as the model requires.
- **Caching:** Haiku 5.5 caches prompts from 512 tokens, so the ~3K-token knowledge prompt is now cached across messages and rounds.
- **Refusals:** the model can decline a request (`stop_reason: "refusal"`); the loop already reports that to the guest, and there is no server-side fallback model for Haiku 5.5.
- **Prompt:** the rules now say explicitly that they hold for the whole conversation, whatever the guest argues, and that the booking button fills in the dates, room and guests while the guest adds their name and phone number (a live test showed the assistant implying the form was complete).
