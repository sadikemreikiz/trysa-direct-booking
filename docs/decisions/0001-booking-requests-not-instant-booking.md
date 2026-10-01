# 0001: Booking requests with human confirmation, not instant booking

**Status:** accepted (September 2026)

## Context

The same six rooms are listed on Airbnb. Airbnb's calendar export (iCal) lags by up to a few hours, so the site can never know for certain that a room is still free at the moment a guest submits. The family also wants to talk to guests before a stay (arrival time, campervan length, children), and there is no payment provider or cancellation policy in place.

## Decision

The site takes a **request**, not a booking. A request is stored as `pending`; the family confirms or declines it from the staff panel, usually after a WhatsApp message. Only a `confirmed` booking blocks a room. No payment is taken online.

## Consequences

- No overbooking risk from Airbnb's sync delay: a human makes the final call with the panel showing both Airbnb occupancy and confirmed direct bookings.
- Guests wait for an answer, so response time matters. The panel highlights requests older than 3 hours and a scheduled job pushes a reminder to the admin's phone. The panel's statistics page measures the median time to first answer.
- Pending requests may overlap each other (two guests can ask for the same room); see [0002](0002-database-constraint-against-double-booking.md).

**Revisit when** there is a channel manager with a real-time Airbnb API, or online payment becomes a requirement.
