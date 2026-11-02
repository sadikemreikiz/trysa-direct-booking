-- The last Airbnb calendar read successfully for each room, used when Airbnb can't be read
-- so a room never looks free just because its calendar is unreachable.
CREATE TABLE "airbnb_calendars" (
	"room" text PRIMARY KEY NOT NULL,
	"booked_days" text[] NOT NULL,
	"read_at" timestamp with time zone NOT NULL
);
