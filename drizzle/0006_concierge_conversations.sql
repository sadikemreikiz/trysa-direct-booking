-- AI concierge conversations: masked transcripts and token usage, kept 30 days.
CREATE TABLE "concierge_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"locale" text NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tool_calls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"turns" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cache_read_tokens" integer DEFAULT 0 NOT NULL,
	"cache_write_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "concierge_conversations_locale" CHECK ("concierge_conversations"."locale" in ('tr', 'en', 'de'))
);
--> statement-breakpoint
CREATE INDEX "concierge_conversations_updated_idx" ON "concierge_conversations" USING btree ("updated_at");