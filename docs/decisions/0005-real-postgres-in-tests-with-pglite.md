# 0005: Test against a real Postgres engine (PGlite) instead of mocks

**Status:** accepted (September 2026)

## Context

The most important rules live in the database: the exclusion constraint, `CHECK` constraints, conditional updates for the state machine and the outbox lease, and an atomic upsert for rate limiting. Mocking the database would test none of them. Docker-based Postgres works but makes tests slow to start and CI harder to set up.

## Decision

Integration tests run on [PGlite](https://pglite.dev), PostgreSQL compiled to WebAssembly, in memory. Each test file gets its own instance with the **same migration files as production**, including the `btree_gist` extension. The same engine also powers local development (`npm run db:local`) over a TCP socket, so no Docker is needed anywhere.

Time is passed in explicitly (`now`) instead of read from the clock, so retry schedules, reminders and retention are tested deterministically.

## Consequences

- Constraint violations, races between two workers and retry timing are tested for real; the full suite runs in a few seconds.
- PGlite is single-connection, so true parallel transactions are simulated with interleaved calls rather than separate connections.
- A lesson learned: rows that used `DEFAULT now()` while tests used a fixed `now` produced a test that started failing on a calendar date. All writes now take their timestamps from the caller.
