/**
 * Transactional outbox delivery: sends the notification rows written together with a
 * booking (see features/booking/reservations.ts). Each row is claimed with a conditional
 * UPDATE and a short lease, so two workers never send the same message; failures are
 * retried with exponential backoff.
 */
import { and, asc, eq, lte, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { outbox, reservations, units } from "@/db/schema";
import type { EmailResult } from "./email";
import { buildGuestEmail, type GuestEmailKind } from "./guest-email";
import type { PushMessage } from "./push";

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
  const months = [
    "Oca",
    "Şub",
    "Mar",
    "Nis",
    "May",
    "Haz",
    "Tem",
    "Ağu",
    "Eyl",
    "Eki",
    "Kas",
    "Ara",
  ];
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

/** Outbox kinds for emails to the guest, and the template each one uses. */
export const GUEST_EMAILS: Record<string, GuestEmailKind> = {
  guest_ack: "ack",
  guest_confirmed: "confirmed",
  guest_prearrival: "prearrival",
  guest_review: "review",
};

/**
 * Sends one guest email. Nothing is sent (and the message counts as done) when the email
 * address was deleted by the retention job, or when a message about the stay itself finds
 * the booking no longer confirmed, e.g. it was cancelled after the message was queued.
 */
async function deliverGuestEmail(
  db: Db,
  kind: GuestEmailKind,
  reservationId: string,
  handlers: OutboxHandlers,
): Promise<EmailResult> {
  const [row] = await db
    .select({ r: reservations, unitName: units.name })
    .from(reservations)
    .leftJoin(units, eq(units.id, reservations.unitId))
    .where(eq(reservations.id, reservationId));
  if (!row?.r.email) return { ok: true };
  if (kind !== "ack" && row.r.status !== "confirmed") return { ok: true };
  const email = buildGuestEmail(kind, { ...row.r, unitName: row.unitName });
  return handlers.guestEmail(row.r.email, email.subject, email.text, email.html);
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
    } else if (Object.hasOwn(GUEST_EMAILS, claimed.kind)) {
      result = await deliverGuestEmail(db, GUEST_EMAILS[claimed.kind], reservationId, handlers);
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
