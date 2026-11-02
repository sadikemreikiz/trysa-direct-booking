# 0003: Send notifications through a transactional outbox

**Status:** accepted (September 2026)

## Context

A booking request is worthless if nobody hears about it. The first version sent an email directly from the form handler, so if the email provider failed, the request was lost silently, and if the email went out but the save failed, there was a notification for a request that didn't exist.

## Decision

The booking, its audit event, an analytics event and one outbox row per notification channel (family email, staff push, guest receipt) are written in **one transaction**. Delivery happens afterwards:

1. The form handler tries to deliver immediately, so the happy path has no delay.
2. A worker **claims** a row with a conditional `UPDATE` that also pushes `next_attempt_at` forward by a 2-minute lease, so two workers never send the same message.
3. On failure the row stays `pending` and is retried with exponential backoff (2, 4, 8 … minutes, capped at 6 hours), up to 6 attempts, then marked `failed`.
4. A cron endpoint sweeps due rows every 15 minutes and daily (Vercel Cron); see the update below for what calls it every 15 minutes.

Email and push are separate rows, so a failing email provider doesn't block phone notifications and vice versa.

## Consequences

- At-least-once delivery with no lost requests; a duplicate is possible only if a send succeeds and the process dies before marking it sent.
- Without a database, or if the database errors, the form falls back to sending the email directly, so the site never stops taking requests.
- More moving parts than a direct send, all covered by integration tests (retry timing, lease, concurrent workers).

## Update (October 2026): a scheduler that really runs every 15 minutes

The 15-minute sweep was a GitHub Actions schedule. Measured over a week, GitHub ran it only every 2.2 to 7.3 hours (median 4.5), so retries and the 3-hour reminder for unanswered requests could arrive hours late, and the daily check that the scheduler is alive raised false alarms on most mornings. A free external cron service (cron-job.org) now calls `/api/cron?from=cron-job` every 15 minutes from 08:00 to 23:00 Turkish time; GitHub Actions stays as a backup, and the daily check (09:00) watches cron-job.org alone, so the alarm means what it says. Every job was already idempotent, so the extra callers are safe.

Daytime only, because each call wakes the database. Neon's free plan gives 100 compute-unit hours a month and suspends the database after 5 idle minutes, so a call every 15 minutes around the clock would keep it awake about a third of the time: by our estimate about 60 of those hours at the smallest size (0.25), before any real traffic. The daytime window needs about 40, and it keeps reminders from waking anyone at night; a request left unanswered overnight is reminded about at 08:00.
