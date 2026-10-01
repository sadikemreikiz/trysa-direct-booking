import { getDb } from "@/db";
import { clientEventSchema, recordClientEvent } from "@/db/analytics";
import { hitRateLimit } from "@/db/rate-limit";
import { clientKey } from "@/lib/client-key";

/** At most this many events per visitor per hour are counted (so bots can't inflate the stats). */
const EVENTS_PER_HOUR = 30;

/**
 * Collects conversion events (WhatsApp / phone clicks). Called via navigator.sendBeacon.
 * No personal data is stored; unknown event names are rejected. Over the limit, events are silently dropped.
 */
export async function POST(request: Request) {
  const body = await request.text();
  if (body.length > 1000) return new Response(null, { status: 413 });

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = clientEventSchema.safeParse(json);
  if (!parsed.success) return new Response(null, { status: 400 });

  const db = getDb();
  if (db) {
    try {
      const key = `ev:${clientKey(request.headers)}`;
      if (await hitRateLimit(db, key, { limit: EVENTS_PER_HOUR, windowMs: 3_600_000 })) {
        await recordClientEvent(db, parsed.data);
      }
    } catch (e) {
      console.error("Failed to write analytics event", e);
    }
  }
  return new Response(null, { status: 204 });
}
