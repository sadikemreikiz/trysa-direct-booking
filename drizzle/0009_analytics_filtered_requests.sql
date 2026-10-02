-- Count booking requests the bot filter drops (no personal data), so real guests caught by
-- mistake would show up in the panel statistics.
ALTER TABLE "analytics_events" DROP CONSTRAINT "analytics_events_name";--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_name" CHECK ("analytics_events"."name" in ('reservation_submitted', 'reservation_filtered', 'whatsapp_click', 'phone_click'));