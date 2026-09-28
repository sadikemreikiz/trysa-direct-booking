import { getDb } from "@/db";
import { clientEventSchema, recordClientEvent } from "@/db/analytics";

/**
 * Dönüşüm olayı toplama (WhatsApp / telefon tıklaması). navigator.sendBeacon ile çağrılır.
 * Kişisel veri saklanmaz; bilinmeyen olay adları reddedilir.
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
      await recordClientEvent(db, parsed.data);
    } catch (e) {
      console.error("Ölçüm olayı yazılamadı", e);
    }
  }
  return new Response(null, { status: 204 });
}
