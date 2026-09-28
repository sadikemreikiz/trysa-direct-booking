CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."reservation_source" AS ENUM('website', 'whatsapp', 'phone', 'walk_in');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('pending', 'confirmed', 'declined', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."unit_kind" AS ENUM('room', 'tiny_house', 'camp');--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"path" text,
	"locale" text,
	"referrer_host" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analytics_events_name" CHECK ("analytics_events"."name" in ('reservation_submitted', 'whatsapp_click', 'phone_click'))
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reservation_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"reservation_id" uuid NOT NULL,
	"type" text NOT NULL,
	"from_status" "reservation_status",
	"to_status" "reservation_status",
	"actor" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservation_events_type" CHECK ("reservation_events"."type" in ('created', 'status_changed', 'note_added'))
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"unit_id" smallint,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"adults" smallint NOT NULL,
	"children" smallint DEFAULT 0 NOT NULL,
	"guest_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"note" text,
	"locale" text NOT NULL,
	"source" "reservation_source" DEFAULT 'website' NOT NULL,
	"status" "reservation_status" DEFAULT 'pending' NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_reference_unique" UNIQUE("reference"),
	CONSTRAINT "reservations_dates_order" CHECK ("reservations"."check_out" > "reservations"."check_in"),
	CONSTRAINT "reservations_adults_min" CHECK ("reservations"."adults" >= 1),
	CONSTRAINT "reservations_children_min" CHECK ("reservations"."children" >= 0),
	CONSTRAINT "reservations_locale" CHECK ("reservations"."locale" in ('tr', 'en', 'de')),
	CONSTRAINT "reservations_confirmed_has_unit" CHECK ("reservations"."status" <> 'confirmed' or "reservations"."unit_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" smallint PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "unit_kind" NOT NULL,
	"sort_order" smallint NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "units_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "reservation_events" ADD CONSTRAINT "reservation_events_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_events_name_created_idx" ON "analytics_events" USING btree ("name","created_at");--> statement-breakpoint
CREATE INDEX "outbox_pending_idx" ON "outbox" USING btree ("next_attempt_at") WHERE "outbox"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "reservation_events_reservation_idx" ON "reservation_events" USING btree ("reservation_id","created_at");--> statement-breakpoint
CREATE INDEX "reservations_status_created_idx" ON "reservations" USING btree ("status","created_at");