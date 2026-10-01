# 0002: Prevent double bookings with a PostgreSQL exclusion constraint

**Status:** accepted (September 2026)

## Context

Two family members can act on the panel at the same time, from different phones, on a serverless backend with many concurrent instances. A check like "is the room free? then insert" in application code has a race window between the read and the write.

## Decision

The rule lives in the database ([migration 0001](../../drizzle/0001_no_double_booking_and_units.sql)):

```sql
ALTER TABLE reservations
  ADD CONSTRAINT reservations_no_overlap_confirmed
  EXCLUDE USING gist (
    unit_id WITH =,
    daterange(check_in, check_out, '[)') WITH &&
  ) WHERE (status = 'confirmed' AND unit_id <> 7);
```

- The half-open range `[)` lets a checkout day be the next guest's check-in day.
- Only `confirmed` rows take part, so pending requests can overlap and the family picks one.
- Unit 7 is the shared camping area, which holds several groups at once.

Status changes are a small state machine (`pending → confirmed | declined`, `confirmed → cancelled`) applied with a conditional `UPDATE … WHERE status = <expected>`. If two people press "confirm" at once, the second update matches no row and gets "already handled". A constraint violation is mapped to a friendly "conflict" error in the panel.

## Consequences

- Correct under any concurrency, without locks or transactions spanning user think-time.
- Needs the `btree_gist` extension (available on Neon and in PGlite).
- The rule is tested directly against a real Postgres engine; see [0005](0005-real-postgres-in-tests-with-pglite.md).
