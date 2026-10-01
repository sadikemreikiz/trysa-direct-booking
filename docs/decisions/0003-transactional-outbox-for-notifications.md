# 0003: Send notifications through a transactional outbox

**Status:** accepted (September 2026)

## Context

A booking request is worthless if nobody hears about it. The first version sent an email directly from the form handler, so if the email provider failed, the request was lost silently, and if the email went out but the save failed, there was a notification for a request that didn't exist.

## Decision

The booking, its audit event, an analytics event and one outbox row per notification channel (family email, staff push, guest receipt) are written in **one transaction**. Delivery happens afterwards:

1. The form handler tries to deliver immediately, so the happy path has no delay.
2. A worker **claims** a row with a conditional `UPDATE` that also pushes `next_attempt_at` forward by a 2-minute lease, so two workers never send the same message.
3. On failure the row stays `pending` and is retried with exponential backoff (2, 4, 8 … minutes, capped at 6 hours), up to 6 attempts, then marked `failed`.
4. A cron endpoint sweeps due rows every 15 minutes (GitHub Actions) and daily (Vercel Cron).

Email and push are separate rows, so a failing email provider doesn't block phone notifications and vice versa.

## Consequences

- At-least-once delivery with no lost requests; a duplicate is possible only if a send succeeds and the process dies before marking it sent.
- Without a database, or if the database errors, the form falls back to sending the email directly, so the site never stops taking requests.
- More moving parts than a direct send, all covered by integration tests (retry timing, lease, concurrent workers).
