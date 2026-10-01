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
