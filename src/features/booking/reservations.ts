/**
 * Booking request: validation → saved in one transaction → notification (outbox).
 *
 * Flow:
 *   1. createReservation: booking + audit event + outbox rows + analytics event
 *      are written in the SAME transaction. All or nothing.
 *   2. deliverOutboxMessage: sends the email. On failure the row stays "pending"
 *      and is retried with exponential backoff.
 */
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db/index";
import { analyticsEvents, outbox, reservationEvents, reservations, units } from "@/db/schema";
import type { EmailResult } from "@/features/notifications/email";
import { buildGuestAck } from "@/features/notifications/guest-email";
import type { PushMessage } from "@/features/notifications/push";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NIGHTS = 60;

/** Raw form data (selects return strings: "5+", "3+"). */
export const reservationRequestSchema = z
  .object({
    checkin: z.string().regex(ISO_DATE),
    checkout: z.string().regex(ISO_DATE),
    adults: z.string().regex(/^\d+\+?$/),
    children: z.string().regex(/^\d+\+?$/),
    /** Unit slug; "" = the guest isn't sure */
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

/** Today's date in the business's time zone (YYYY-MM-DD). */
export function todayInDemre(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(now);
}

const REF_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O, 1/I mix-ups

export function generateReference(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return "TRY-" + Array.from(bytes, (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("");
}

export async function createReservation(
  db: Db,
  raw: ReservationRequest,
  /** guestAck: if the guest gave an email, a "we got your request" email is queued too */
  opts: { now?: Date; guestAck?: boolean } = {},
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
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await tx.insert(reservationEvents).values({
      reservationId: reservation.id,
      type: "created",
      toStatus: "pending",
      actor: "guest",
      createdAt: now,
    });

    // Two independent notifications: email to the family + push to panel users' phones.
    // They are separate rows, so if one fails only that one is retried.
    // Timestamps come from `now`, not the database clock: delivery compares against the same `now`.
    const queued = { nextAttemptAt: now, createdAt: now };
    const [message, push] = await tx
      .insert(outbox)
      .values([
        { kind: "reservation_notification", payload: { reservationId: reservation.id }, ...queued },
        { kind: "reservation_push", payload: { reservationId: reservation.id }, ...queued },
      ])
      .returning({ id: outbox.id });

    let guestAckOutboxId: number | null = null;
    if (opts.guestAck && d.email) {
      const [ack] = await tx
        .insert(outbox)
        .values({ kind: "guest_ack", payload: { reservationId: reservation.id }, ...queued })
        .returning({ id: outbox.id });
      guestAckOutboxId = ack.id;
    }

    await tx
      .insert(analyticsEvents)
      .values({ name: "reservation_submitted", path: `/${d.locale}/rezervasyon`, locale: d.locale });

    return { reservation, outboxId: message.id, pushOutboxId: push.id, guestAckOutboxId };
  });
}

/* ---------------------------- Notifications (outbox) ---------------------------- */

export const MAX_ATTEMPTS = 6;
/** Lease time, so no other worker picks up the row while it is being sent. */
const LEASE_MS = 2 * 60_000;

/** 2 min after the 1st attempt, then 4, 8, 16… at most 6 hours. */
export function backoffMs(attempts: number): number {
  return Math.min(2 ** attempts * 60_000, 6 * 3_600_000);
}

type Sender = (subject: string, text: string) => Promise<EmailResult>;

/** Delivery channels per outbox kind (faked in tests). */
export type OutboxHandlers = {
  email: Sender;
  push: (message: PushMessage) => Promise<EmailResult>;
  guestEmail: (to: string, subject: string, text: string, html?: string) => Promise<EmailResult>;
};

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  const months = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  return `${Number(d)} ${months[Number(m) - 1]}`;
}

/** Short notification for panel users' phones. */
export async function buildReservationPush(db: Db, reservationId: string): Promise<PushMessage> {
  const [row] = await db
    .select({ r: reservations, unitName: units.name })
    .from(reservations)
    .leftJoin(units, eq(units.id, reservations.unitId))
    .where(eq(reservations.id, reservationId));
  if (!row) throw new Error(`Reservation not found: ${reservationId}`);
  const { r, unitName } = row;
  const guests = r.adults + r.children;
  return {
    title: `🔔 Yeni talep · ${r.guestName}`,
    body: `${unitName ?? "Oda seçmedi"} · ${shortDate(r.checkIn)} – ${shortDate(r.checkOut)} · ${guests} kişi`,
    url: `/panel/talep/${r.id}`,
  };
}

/** Builds the email to the family from a booking row. */
export async function buildReservationEmail(db: Db, reservationId: string) {
  const [row] = await db
    .select({ r: reservations, unitName: units.name })
    .from(reservations)
    .leftJoin(units, eq(units.id, reservations.unitId))
    .where(eq(reservations.id, reservationId));
  if (!row) throw new Error(`Reservation not found: ${reservationId}`);
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
 * Tries to deliver a single outbox message. First it "claims" the row (conditional UPDATE),
 * so two workers running at once never send the same email twice.
 */
export async function deliverOutboxMessage(
  db: Db,
  id: number,
  handlers: OutboxHandlers,
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
    if (claimed.kind === "reservation_notification") {
      const email = await buildReservationEmail(db, reservationId);
      result = await handlers.email(email.subject, email.text);
    } else if (claimed.kind === "reservation_push") {
      result = await handlers.push(await buildReservationPush(db, reservationId));
    } else if (claimed.kind === "guest_ack") {
      const [row] = await db
        .select({ r: reservations, unitName: units.name })
        .from(reservations)
        .leftJoin(units, eq(units.id, reservations.unitId))
        .where(eq(reservations.id, reservationId));
      if (!row?.r.email) {
        result = { ok: true }; // email was deleted (e.g. retention period), nothing to send
      } else {
        const ack = buildGuestAck({ ...row.r, unitName: row.unitName });
        result = await handlers.guestEmail(row.r.email, ack.subject, ack.text, ack.html);
      }
    } else {
      result = { ok: false, error: `Unknown outbox kind: ${claimed.kind}` };
    }
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

/** Sends due pending messages in order (the retry sweep). */
export async function deliverDueOutbox(
  db: Db,
  handlers: OutboxHandlers,
  now: Date = new Date(),
  limit = 10,
) {
  const due = await db
    .select({ id: outbox.id })
    .from(outbox)
    .where(and(eq(outbox.status, "pending"), lte(outbox.nextAttemptAt, now)))
    .orderBy(asc(outbox.nextAttemptAt))
    .limit(limit);
  const results: DeliveryResult[] = [];
  for (const { id } of due) results.push(await deliverOutboxMessage(db, id, handlers, now));
  return results;
}
