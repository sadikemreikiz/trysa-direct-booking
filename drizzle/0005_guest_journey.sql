-- Guest journey emails: an idempotency key so scheduled jobs queue each message at most once,
-- and the moment a guest opted in to the post-stay review email.
ALTER TABLE "outbox" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "review_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "outbox" ADD CONSTRAINT "outbox_dedupe_key_unique" UNIQUE("dedupe_key");