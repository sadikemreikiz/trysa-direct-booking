# 0004: Sync with Airbnb in both directions over iCal

**Status:** accepted (September 2026)

## Context

The rooms are sold on Airbnb and on the site at the same time. Airbnb's partner API is only open to channel managers; the one integration available to a small host is the iCal calendar export/import per listing.

## Decision

- **Airbnb → site:** each room's Airbnb `.ics` link is read on the server (cached for 15 minutes). Taken days are blocked in the guest form, shown in the panel's room picker and calendar, and re-checked on submit in case the page came from cache.
- **Site → Airbnb:** `/api/ical/[unit]` serves the confirmed direct bookings of each room as iCal, which Airbnb imports. The URL carries an HMAC token per unit so it can't be guessed, and the feed contains dates only, no guest data.

## Consequences

- Two-way sync with zero cost and no third-party service.
- It is eventually consistent: Airbnb refreshes imported calendars every few hours. This is why direct bookings are requests confirmed by a human ([0001](0001-booking-requests-not-instant-booking.md)).
- Airbnb's export has no past days, so overlaps can't be checked for past dates; the panel therefore refuses manual bookings that start in the past.
