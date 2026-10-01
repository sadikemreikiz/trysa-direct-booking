"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { getDb } from "@/db";
import { hitRateLimits, pruneRateLimits } from "@/db/rate-limit";
import {
  createReservation,
  deliverDueOutbox,
  deliverOutboxMessage,
  ReservationValidationError,
} from "@/db/reservations";
import { rangeHasLockedDay } from "@/lib/availability";
import { clientKey } from "@/lib/client-key";
import { guestEmailEnabled, sendGuestEmail, sendNotificationEmail } from "@/lib/email";
import { getGuestLockedDates } from "@/lib/guest-availability";
import { sendPushToStaff, type PushMessage } from "@/lib/push";
import { reservationSummary, type ReservationInput } from "@/lib/reservation";
import type { Locale } from "@/i18n-config";

export type SubmitResult = {
  ok: boolean;
  error?: "required" | "invalid" | "blocked" | "rate_limited";
  emailed?: boolean;
  /** Request code shown to the guest (when the request was saved to the database) */
  reference?: string;
};

/** Request limit per visitor (IP digest): 3 per 10 minutes, 8 per day. */
const RESERVATION_LIMITS = {
  "10m": { limit: 3, windowMs: 10 * 60_000 },
  "1d": { limit: 8, windowMs: 86_400_000 },
};

/** A human can hardly fill the form faster than this (dates + name + phone). */
const MIN_FILL_MS = 3_000;

/**
 * Handles a booking request.
 * With a database: the request is saved first (single source of truth), then the email goes out
 * through the outbox; if sending fails it is retried in the background.
 * Without a database, or if it errors: legacy behaviour (direct email), so the site keeps working.
 */
export async function submitReservation(
  data: ReservationInput,
  meta: {
    unitSlug: string;
    locale: Locale;
    consent: boolean;
    /** Bot traps: hidden field (humans never see it, so it stays empty) and form fill time */
    trap?: { hp: string; elapsedMs: number };
  },
): Promise<SubmitResult> {
  if (!data.checkin || !data.checkout || !data.name.trim() || !data.phone.trim()) {
    return { ok: false, error: "required" };
  }
  // Bot: silently report "success" so it doesn't adapt; nothing is saved and no notification is sent.
  if (!meta.trap || meta.trap.hp || meta.trap.elapsedMs < MIN_FILL_MS) {
    return { ok: true, emailed: false };
  }
  // The page may have come from cache: if the chosen room was taken in the meantime, reject up front.
  if (meta.unitSlug && meta.unitSlug !== "kamp") {
    const locked = (await getGuestLockedDates())[data.unit] ?? [];
    if (rangeHasLockedDay(data.checkin, data.checkout, locked)) return { ok: false, error: "blocked" };
  }

  const db = getDb();
  if (db) {
    try {
      const allowed = await hitRateLimits(db, `res:${clientKey(await headers())}`, RESERVATION_LIMITS);
      after(() => pruneRateLimits(db).catch(console.error));
      if (!allowed) return { ok: false, error: "rate_limited" };
    } catch (e) {
      console.error("Rate limit check failed, accepting the request", e);
    }
    try {
      const { reservation, outboxId, pushOutboxId } = await createReservation(
        db,
        { ...data, unit: meta.unitSlug, locale: meta.locale, consent: meta.consent as true },
        { guestAck: guestEmailEnabled() },
      );
      const handlers = {
        email: sendNotificationEmail,
        push: (m: PushMessage) => sendPushToStaff(db, m),
        guestEmail: sendGuestEmail,
      };
      const [delivery] = await Promise.all([
        deliverOutboxMessage(db, outboxId, handlers),
        deliverOutboxMessage(db, pushOutboxId, handlers),
      ]);
      // After the response is sent: the guest's email and any previously failed notifications.
      after(() => deliverDueOutbox(db, handlers).catch(console.error));
      return { ok: true, emailed: delivery === "sent", reference: reservation.reference };
    } catch (e) {
      if (e instanceof ReservationValidationError) {
        return { ok: false, error: "invalid" };
      }
      console.error("Failed to save the booking, falling back to direct email", e);
    }
  }

  const result = await sendNotificationEmail(
    `Yeni rezervasyon talebi — ${data.name}`,
    reservationSummary(data),
  );
  return { ok: true, emailed: result.ok };
}
