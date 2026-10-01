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
