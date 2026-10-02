# 0006: Protect the form without a CAPTCHA, with limits stored in Postgres

**Status:** accepted (September 2026)

## Context

Every request triggers an email and a push notification to the family's phones, so spam has a real cost. A CAPTCHA would add friction for guests on phones and load third-party scripts, which the Content Security Policy forbids. The backend is serverless, so an in-memory counter would be per instance and useless.

## Decision

Three layers:

1. **Honeypot field** that humans never see.
2. **Minimum fill time** (a human can't enter dates, name and phone in under 3 seconds).
   Bots caught by either get a fake "success" response, so they don't adapt, and nothing is saved or sent.
3. **Fixed-window rate limit in Postgres**: 3 requests per 10 minutes and 8 per day per visitor, 30 analytics events per hour. One atomic `INSERT … ON CONFLICT DO UPDATE` statement counts and resets the window.

The visitor key is an HMAC of the IP address with a server secret, never the IP itself, and rows are deleted after 2 days (KVKK/GDPR data minimisation).

## Consequences

- No CAPTCHA, no third-party script, no friction for real guests.
- The limiter **fails open**: if the rate-limit query errors, the request is accepted. Losing a real booking is worse than letting one spam message through.
- A determined attacker rotating IPs gets through; that is acceptable at this traffic level and would be the point to add a CAPTCHA.

## Update (October 2026): don't drop real guests, and count what is dropped

A bug hunt found two ways the first two layers could catch a real guest, who then only saw "send it to us on WhatsApp" while the family never heard of the request:

- The fill time started at the first focus inside the form. iOS Safari doesn't focus buttons, so picking a room and dates there never started the clock, and a guest who then autofilled name and phone could be "too fast". The clock now starts when the form appears.
- The honeypot was named `website`, a field password managers can fill from an identity. It now has a name and label nothing autofills, plus the attributes 1Password, LastPass and Bitwarden honour to skip a field.

Dropped requests were also invisible, so there was no way to tell whether this ever happened. Each drop now writes a `reservation_filtered` analytics event (no personal data, at most 5 per visitor per day so a bot flood can't fill the table), and the panel statistics show the count for the last 6 months.
