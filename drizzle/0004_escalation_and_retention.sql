ALTER TABLE "reservations" ADD COLUMN "escalated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "anonymized_at" timestamp with time zone;