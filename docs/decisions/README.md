# Architecture decision records

Short notes on the decisions that shaped this system: the context at the time, what was chosen, and what it costs. Each one is a trade-off I would make again for a small business with one developer, and each one says when I would revisit it.

| #                                                          | Decision                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [0001](0001-booking-requests-not-instant-booking.md)       | Take booking requests with human confirmation instead of instant booking              |
| [0002](0002-database-constraint-against-double-booking.md) | Prevent double bookings with a PostgreSQL exclusion constraint                        |
| [0003](0003-transactional-outbox-for-notifications.md)     | Send notifications through a transactional outbox                                     |
| [0004](0004-two-way-airbnb-sync-over-ical.md)              | Sync with Airbnb in both directions over iCal                                         |
| [0005](0005-real-postgres-in-tests-with-pglite.md)         | Test against a real Postgres engine (PGlite) instead of mocks                         |
| [0006](0006-spam-protection-without-captcha.md)            | Protect the form without a CAPTCHA, with limits stored in Postgres                    |
| [0007](0007-ai-concierge-with-tools-not-free-text.md)      | Ground the AI concierge in site content and tools; links built by code, not the model |
