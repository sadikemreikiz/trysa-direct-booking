-- Health of things that fail quietly (Airbnb calendars, the 15-minute scheduler), so the
-- admins get an alert when one stops working.
CREATE TABLE "health_checks" (
	"name" text PRIMARY KEY NOT NULL,
	"ok_at" timestamp with time zone,
	"failing_since" timestamp with time zone,
	"last_error" text,
	"alerted_at" timestamp with time zone
);
