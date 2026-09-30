/**
 * Zamanlanmış bakım işleri (bkz. /api/cron):
 *   - Uzun süre cevapsız kalan taleplerde yöneticiye hatırlatma (eskalasyon)
 *   - Saklama süresi dolan rezervasyonlarda kişisel verilerin silinmesi (KVKK/GDPR)
 */
import { and, eq, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import type { Db } from "./index";
import { reservationEvents, reservations } from "./schema";
import type { EmailResult } from "@/lib/email";
import type { PushMessage } from "@/lib/push";

/** Bu kadar süre cevapsız kalan talep için yöneticiye hatırlatma gider. */
export const ESCALATE_AFTER_MS = 3 * 3_600_000;

/**
 * Cevap bekleyen ve henüz hatırlatılmamış eski talepler için TEK bir bildirim gönderir.
 * Bildirim başarısız olursa işaretlenmez → bir sonraki çalışmada tekrar denenir.
 */
export async function escalateStalePending(
  db: Db,
  push: (message: PushMessage) => Promise<EmailResult>,
  now: Date = new Date(),
): Promise<number> {
  const stale = await db
    .select({ id: reservations.id, guestName: reservations.guestName })
    .from(reservations)
    .where(
      and(
        eq(reservations.status, "pending"),
        isNull(reservations.escalatedAt),
        lt(reservations.createdAt, new Date(now.getTime() - ESCALATE_AFTER_MS)),
      ),
    );
  if (stale.length === 0) return 0;

  const result = await push(
    stale.length === 1
      ? {
          title: "⏰ Talep cevap bekliyor",
          body: `${stale[0].guestName} 3 saatten uzun süredir cevap bekliyor.`,
          url: `/panel/talep/${stale[0].id}`,
        }
      : {
          title: `⏰ ${stale.length} talep cevap bekliyor`,
          body: "3 saatten uzun süredir cevap bekleyen talepler var.",
          url: "/panel",
        },
  );
  if (!result.ok) return 0;

  await db
    .update(reservations)
    .set({ escalatedAt: now })
    .where(inArray(reservations.id, stale.map((s) => s.id)));
  return stale.length;
}

/**
 * Gizlilik politikasında söz verilen saklama süresi: konaklamadan (çıkış tarihinden)
 * sonra en fazla 2 yıl. Değişirse lib/privacy metnini de güncelle.
 */
export const RETENTION_DAYS = 730;

/**
 * Süresi dolan rezervasyonlarda kişisel verileri siler; tarih, ünite ve durum kalır
 * (istatistik için). Notlarda kişisel bilgi olabileceği için geçmiş notları da siler.
 */
export async function anonymizeExpiredReservations(db: Db, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10);
  return db.transaction(async (tx) => {
    const expired = await tx
      .update(reservations)
      .set({
        guestName: "(silindi)",
        phone: "(silindi)",
        email: null,
        note: null,
        anonymizedAt: now,
      })
      .where(and(isNull(reservations.anonymizedAt), lt(reservations.checkOut, cutoff)))
      .returning({ id: reservations.id });
    if (expired.length > 0) {
      await tx
        .update(reservationEvents)
        .set({ note: null })
        .where(
          and(
            inArray(reservationEvents.reservationId, expired.map((r) => r.id)),
            isNotNull(reservationEvents.note),
          ),
        );
    }
    return expired.length;
  });
}
