/**
 * Booking request: validation → saved in one transaction → notification (outbox).
 *
 * Flow:
 *   1. createReservation: booking + audit event + outbox rows + analytics event
 *      are written in the SAME transaction. All or nothing.
 *   2. Delivery happens in features/notifications/outbox.ts: on failure the row stays
 *      "pending" and is retried with exponential backoff.
 */
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db/index";
import { analyticsEvents, outbox, reservationEvents, reservations, units } from "@/db/schema";
import { todayInDemre } from "@/lib/dates";

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
    super(`Invalid booking request: ${issues.join(", ")}`);
  }
}

function nightsBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
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

    await tx.insert(analyticsEvents).values({
      name: "reservation_submitted",
      path: `/${d.locale}/rezervasyon`,
      locale: d.locale,
    });

    return { reservation, outboxId: message.id, pushOutboxId: push.id, guestAckOutboxId };
  });
}
