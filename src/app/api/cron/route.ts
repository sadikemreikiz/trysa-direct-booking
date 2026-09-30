import { timingSafeEqual } from "node:crypto";
import { getDb } from "@/db";
import { anonymizeExpiredReservations, escalateStalePending } from "@/db/maintenance";
import { pruneRateLimits } from "@/db/rate-limit";
import { deliverDueOutbox } from "@/db/reservations";
import { sendGuestEmail, sendNotificationEmail } from "@/lib/email";
import { sendPushToStaff } from "@/lib/push";

/**
 * Zamanlanmış bakım: başarısız bildirimleri tekrar dener, cevapsız talepleri Emre'ye
 * hatırlatır, süresi dolan kişisel verileri siler, eski spam sayaçlarını temizler.
 *
 * Çağıranlar (Authorization: Bearer $CRON_SECRET):
 *   - Vercel Cron (vercel.json) — Hobby planda günde bir; başlığı Vercel kendisi ekler.
 *   - GitHub Actions (.github/workflows/cron.yml) — 15 dakikada bir.
 * Her iş tekrar çalıştırılmaya dayanıklı (idempotent): sık ya da üst üste çağrılması sorun değil.
 */
export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return new Response(null, { status: 401 });
  }
  const db = getDb();
  if (!db) return Response.json({ skipped: "DATABASE_URL yok" });

  const push = (m: Parameters<typeof sendPushToStaff>[1]) => sendPushToStaff(db, m);
  const outbox = await deliverDueOutbox(db, { email: sendNotificationEmail, push, guestEmail: sendGuestEmail });
  const escalated = await escalateStalePending(db, (m) => sendPushToStaff(db, m, { roles: ["admin"] }));
  const anonymized = await anonymizeExpiredReservations(db);
  await pruneRateLimits(db);

  return Response.json({ outbox, escalated, anonymized });
}

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
