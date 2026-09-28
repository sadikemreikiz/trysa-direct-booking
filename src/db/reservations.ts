/**
 * Rezervasyon talebi: doğrulama → tek transaction'da kayıt → bildirim (outbox).
 *
 * Akış:
 *   1. createReservation: rezervasyon + denetim kaydı + outbox satırı + ölçüm olayı
 *      AYNI transaction'da yazılır. Ya hepsi ya hiçbiri.
 *   2. deliverOutboxMessage: e-postayı gönderir. Başarısızsa satır "pending" kalır
 *      ve üstel bekleme (exponential backoff) ile tekrar denenir.
 */
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "./index";
import { analyticsEvents, outbox, reservationEvents, reservations, units } from "./schema";
import type { EmailResult } from "@/lib/email";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NIGHTS = 60;

/** Formdan gelen ham veri (select'ler string döner: "5+", "3+"). */
export const reservationRequestSchema = z
  .object({
    checkin: z.string().regex(ISO_DATE),
    checkout: z.string().regex(ISO_DATE),
    adults: z.string().regex(/^\d+\+?$/),
    children: z.string().regex(/^\d+\+?$/),
    /** Ünite slug'ı; "" = misafir emin değil */
    unit: z.string().max(40),
    name: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(5).max(40),
    email: z.union([z.literal(""), z.email().max(200)]),
    note: z.string().trim().max(2000),
    locale: z.enum(["tr", "en", "de"]),
    consent: z.literal(true),
  })
  .refine((d) => d.checkout > d.checkin, { message: "checkout_before_checkin", path: ["checkout"] })
  .refine((d) => nightsBetween(d.checkin, d.checkout) <= MAX_NIGHTS, {
    message: "stay_too_long",
    path: ["checkout"],
  });

export type ReservationRequest = z.input<typeof reservationRequestSchema>;

export class ReservationValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Geçersiz rezervasyon talebi: ${issues.join(", ")}`);
  }
}

function nightsBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/** İşletmenin saat dilimine göre bugünün tarihi (YYYY-MM-DD). */
export function todayInDemre(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(now);
}

const REF_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // 0/O, 1/I karışmasın

export function generateReference(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return "TRY-" + Array.from(bytes, (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("");
}

export async function createReservation(
  db: Db,
  raw: ReservationRequest,
  opts: { now?: Date } = {},
) {
  const now = opts.now ?? new Date();
  const parsed = reservationRequestSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ReservationValidationError(
      parsed.error.issues.map((i) => `${i.path.join(".")}:${i.message}`),
    );
  }
  const d = parsed.data;
  if (d.checkin < todayInDemre(now)) {
    throw new ReservationValidationError(["checkin:in_past"]);
  }

  return db.transaction(async (tx) => {
    let unitId: number | null = null;
    if (d.unit) {
      const [unit] = await tx
        .select({ id: units.id })
        .from(units)
        .where(and(eq(units.slug, d.unit), eq(units.isActive, true)));
      if (!unit) throw new ReservationValidationError(["unit:unknown"]);
      unitId = unit.id;
    }

    const [reservation] = await tx
      .insert(reservations)
      .values({
        reference: generateReference(),
        unitId,
        checkIn: d.checkin,
        checkOut: d.checkout,
        adults: parseInt(d.adults, 10),
        children: parseInt(d.children, 10),
        guestName: d.name,
        phone: d.phone,
        email: d.email || null,
        note: d.note || null,
        locale: d.locale,
        consentAt: now,
      })
      .returning();

    await tx.insert(reservationEvents).values({
      reservationId: reservation.id,
      type: "created",
      toStatus: "pending",
      actor: "guest",
    });

    const [message] = await tx
      .insert(outbox)
      .values({ kind: "reservation_notification", payload: { reservationId: reservation.id } })
      .returning({ id: outbox.id });

    await tx
      .insert(analyticsEvents)
      .values({ name: "reservation_submitted", path: `/${d.locale}/rezervasyon`, locale: d.locale });

    return { reservation, outboxId: message.id };
  });
}

/* ---------------------------- Bildirim (outbox) ---------------------------- */

export const MAX_ATTEMPTS = 6;
/** Gönderim sürerken satırı başka bir işleyicinin almaması için kilit süresi. */
const LEASE_MS = 2 * 60_000;

/** 1. deneme sonrası 2 dk, sonra 4, 8, 16… en fazla 6 saat. */
export function backoffMs(attempts: number): number {
  return Math.min(2 ** attempts * 60_000, 6 * 3_600_000);
}

type Sender = (subject: string, text: string) => Promise<EmailResult>;

/** Rezervasyon satırından aileye gidecek e-postayı üretir. */
export async function buildReservationEmail(db: Db, reservationId: string) {
  const [row] = await db
    .select({ r: reservations, unitName: units.name })
    .from(reservations)
    .leftJoin(units, eq(units.id, reservations.unitId))
    .where(eq(reservations.id, reservationId));
  if (!row) throw new Error(`Rezervasyon bulunamadı: ${reservationId}`);
  const { r, unitName } = row;

  const lines = [
    `Yeni rezervasyon talebi — ${r.reference}`,
    "",
    `Giriş: ${r.checkIn}`,
    `Çıkış: ${r.checkOut}`,
    `Kişi: ${r.adults} yetişkin${r.children > 0 ? `, ${r.children} çocuk` : ""}`,
    `Konaklama: ${unitName ?? "Emin değil (ünite seçilmedi)"}`,
    `Ad: ${r.guestName}`,
    `Telefon: ${r.phone}`,
  ];
  if (r.email) lines.push(`E-posta: ${r.email}`);
  if (r.note) lines.push(`Not: ${r.note}`);
  lines.push(`Dil: ${r.locale.toUpperCase()}`);

  return {
    subject: `Yeni rezervasyon talebi ${r.reference} — ${r.guestName}`,
    text: lines.join("\n"),
  };
}

export type DeliveryResult = "sent" | "retry_scheduled" | "failed" | "skipped";

/**
 * Tek bir outbox mesajını göndermeyi dener. Önce satırı "kilitler" (koşullu UPDATE),
 * böylece aynı anda çalışan iki işleyici aynı e-postayı iki kez göndermez.
 */
export async function deliverOutboxMessage(
  db: Db,
  id: number,
  send: Sender,
  now: Date = new Date(),
): Promise<DeliveryResult> {
  const [claimed] = await db
    .update(outbox)
    .set({
      attempts: sql`${outbox.attempts} + 1`,
      nextAttemptAt: new Date(now.getTime() + LEASE_MS),
    })
    .where(and(eq(outbox.id, id), eq(outbox.status, "pending"), lte(outbox.nextAttemptAt, now)))
    .returning();
  if (!claimed) return "skipped";

  let result: EmailResult;
  try {
    const { reservationId } = claimed.payload as { reservationId: string };
    const email = await buildReservationEmail(db, reservationId);
    result = await send(email.subject, email.text);
  } catch (e) {
    result = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  if (result.ok) {
    await db
      .update(outbox)
      .set({ status: "sent", sentAt: now, lastError: null })
      .where(eq(outbox.id, id));
    return "sent";
  }

  const giveUp = claimed.attempts >= MAX_ATTEMPTS;
  await db
    .update(outbox)
    .set({
      status: giveUp ? "failed" : "pending",
      lastError: result.error,
      nextAttemptAt: new Date(now.getTime() + backoffMs(claimed.attempts)),
    })
    .where(eq(outbox.id, id));
  return giveUp ? "failed" : "retry_scheduled";
}

/** Zamanı gelmiş bekleyen mesajları sırayla gönderir (tekrar deneme taraması). */
export async function deliverDueOutbox(db: Db, send: Sender, now: Date = new Date(), limit = 10) {
  const due = await db
    .select({ id: outbox.id })
    .from(outbox)
    .where(and(eq(outbox.status, "pending"), lte(outbox.nextAttemptAt, now)))
    .orderBy(asc(outbox.nextAttemptAt))
    .limit(limit);
  const results: DeliveryResult[] = [];
  for (const { id } of due) results.push(await deliverOutboxMessage(db, id, send, now));
  return results;
}
