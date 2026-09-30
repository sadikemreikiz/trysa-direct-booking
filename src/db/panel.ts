/**
 * Panel işlemleri: listeleme, müsaitlik, durum geçişleri (state machine).
 *
 * Geçişler:  pending → confirmed | declined      confirmed → cancelled
 * Her geçiş koşullu UPDATE ile yapılır (WHERE status = beklenen durum): iki kişi aynı
 * anda işlem yaparsa ikincisi "zaten işlendi" hatası alır, veri tutarlı kalır.
 */
import { and, asc, desc, eq, gte, inArray, lt, gt, ne } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "./index";
import { generateReference } from "./reservations";
import { reservationEvents, reservations, units, user, type Reservation } from "./schema";

export type ReservationStatus = Reservation["status"];

const TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ["confirmed", "declined"],
  confirmed: ["cancelled"],
  declined: [],
  cancelled: [],
};

export function canTransition(from: ReservationStatus, to: ReservationStatus) {
  return TRANSITIONS[from].includes(to);
}

export class TransitionError extends Error {
  constructor(public readonly code: "not_found" | "invalid_transition" | "conflict" | "unit_required") {
    super(code);
  }
}

/** Kamp alanı ortak alan: aynı anda birden çok misafir olabilir (bkz. migration 0001). */
export const SHARED_UNIT_SLUG = "kamp";

/* ------------------------------- Listeleme ------------------------------- */

export async function listPanelReservations(db: Db, today: string) {
  const rows = await db
    .select({ r: reservations, unitName: units.name })
    .from(reservations)
    .leftJoin(units, eq(units.id, reservations.unitId))
    .where(
      inArray(reservations.status, ["pending", "confirmed"]),
    )
    .orderBy(asc(reservations.checkIn));

  const pending = rows.filter((x) => x.r.status === "pending");
  // Bekleyenler: en eski talep en üstte (en uzun süredir cevap bekleyen)
  pending.sort((a, b) => a.r.createdAt.getTime() - b.r.createdAt.getTime());
  const upcoming = rows.filter((x) => x.r.status === "confirmed" && x.r.checkOut >= today);
  return { pending, upcoming };
}

export async function getReservationDetail(db: Db, id: string) {
  const [row] = await db
    .select({ r: reservations, unitName: units.name, unitSlug: units.slug })
    .from(reservations)
    .leftJoin(units, eq(units.id, reservations.unitId))
    .where(eq(reservations.id, id));
  if (!row) return null;

  const events = await db
    .select()
    .from(reservationEvents)
    .where(eq(reservationEvents.reservationId, id))
    .orderBy(desc(reservationEvents.createdAt));

  // actor "user:<id>" → isim
  const userIds = events
    .map((e) => (e.actor.startsWith("user:") ? e.actor.slice(5) : null))
    .filter((x): x is string => Boolean(x));
  const names = userIds.length
    ? await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, userIds))
    : [];
  const nameOf = new Map(names.map((n) => [n.id, n.name]));

  return {
    ...row,
    events: events.map((e) => ({
      ...e,
      actorName: e.actor.startsWith("user:")
        ? (nameOf.get(e.actor.slice(5)) ?? "Panel kullanıcısı")
        : e.actor === "guest"
          ? "Misafir"
          : "Sistem",
    })),
  };
}

/* ------------------------------- Müsaitlik ------------------------------- */

export type UnitAvailability = {
  id: number;
  slug: string;
  name: string;
  free: boolean;
  reason?: "confirmed" | "airbnb";
};

/**
 * Tarih aralığı [checkIn, checkOut) için her ünitenin durumu.
 * airbnbLocked: ünite adı → Airbnb'de dolu günler (YYYY-MM-DD), bkz. lib/availability.
 */
export async function availabilityForRange(
  db: Db,
  checkIn: string,
  checkOut: string,
  airbnbLocked: Record<string, string[]>,
  excludeReservationId?: string,
): Promise<UnitAvailability[]> {
  const allUnits = await db
    .select()
    .from(units)
    .where(eq(units.isActive, true))
    .orderBy(asc(units.sortOrder));

  const overlapping = await db
    .select({ unitId: reservations.unitId })
    .from(reservations)
    .where(
      and(
        eq(reservations.status, "confirmed"),
        lt(reservations.checkIn, checkOut),
        gt(reservations.checkOut, checkIn),
        excludeReservationId ? ne(reservations.id, excludeReservationId) : undefined,
      ),
    );
  const takenUnitIds = new Set(overlapping.map((o) => o.unitId));

  return allUnits.map((u) => {
    if (u.slug === SHARED_UNIT_SLUG) return { id: u.id, slug: u.slug, name: u.name, free: true };
    if (takenUnitIds.has(u.id)) {
      return { id: u.id, slug: u.slug, name: u.name, free: false, reason: "confirmed" as const };
    }
    const locked = airbnbLocked[u.name] ?? [];
    if (locked.some((day) => day >= checkIn && day < checkOut)) {
      return { id: u.id, slug: u.slug, name: u.name, free: false, reason: "airbnb" as const };
    }
    return { id: u.id, slug: u.slug, name: u.name, free: true };
  });
}

/* ---------------------------- Durum geçişleri ---------------------------- */

function isExclusionViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string }; message?: string };
  return (
    err?.code === "23P01" ||
    err?.cause?.code === "23P01" ||
    /reservations_no_overlap_confirmed/.test(String(err?.message ?? "") + String(err?.cause ?? ""))
  );
}

async function transition(
  db: Db,
  id: string,
  to: ReservationStatus,
  actorUserId: string,
  opts: { unitId?: number; note?: string; now?: Date } = {},
) {
  const now = opts.now ?? new Date();
  try {
    return await db.transaction(async (tx) => {
      const [current] = await tx
        .select({ status: reservations.status, unitId: reservations.unitId })
        .from(reservations)
        .where(eq(reservations.id, id));
      if (!current) throw new TransitionError("not_found");
      if (!canTransition(current.status, to)) throw new TransitionError("invalid_transition");

      const unitId = opts.unitId ?? current.unitId;
      if (to === "confirmed" && unitId == null) throw new TransitionError("unit_required");

      const [updated] = await tx
        .update(reservations)
        .set({ status: to, unitId, updatedAt: now })
        .where(and(eq(reservations.id, id), eq(reservations.status, current.status)))
        .returning();
      // Arada başka biri işlem yaptıysa koşullu UPDATE satır bulamaz.
      if (!updated) throw new TransitionError("invalid_transition");

      await tx.insert(reservationEvents).values({
        reservationId: id,
        type: "status_changed",
        fromStatus: current.status,
        toStatus: to,
        actor: `user:${actorUserId}`,
        note: opts.note?.trim() || null,
        createdAt: now,
      });
      return updated;
    });
  } catch (e) {
    if (e instanceof TransitionError) throw e;
    if (isExclusionViolation(e)) throw new TransitionError("conflict");
    throw e;
  }
}

export function confirmReservation(
  db: Db,
  id: string,
  actorUserId: string,
  unitId: number,
  opts: { note?: string; now?: Date } = {},
) {
  return transition(db, id, "confirmed", actorUserId, { ...opts, unitId });
}

export function declineReservation(
  db: Db,
  id: string,
  actorUserId: string,
  opts: { note?: string; now?: Date } = {},
) {
  return transition(db, id, "declined", actorUserId, opts);
}

export function cancelReservation(
  db: Db,
  id: string,
  actorUserId: string,
  opts: { note?: string; now?: Date } = {},
) {
  return transition(db, id, "cancelled", actorUserId, opts);
}

/* ------------------------- Elle rezervasyon ekleme ------------------------ */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Telefonla / WhatsApp'tan / kapıdan gelen rezervasyon — panelden doğrudan onaylı girilir. */
export const manualReservationSchema = z
  .object({
    unitId: z.number().int().positive(),
    checkIn: z.string().regex(ISO_DATE),
    checkOut: z.string().regex(ISO_DATE),
    adults: z.number().int().min(1).max(20),
    children: z.number().int().min(0).max(20),
    guestName: z.string().trim().min(1).max(120),
    /** Kapıdan gelen misafir telefon vermeyebilir */
    phone: z.string().trim().max(40),
    note: z.string().trim().max(2000),
    source: z.enum(["phone", "whatsapp", "walk_in"]),
  })
  .refine((d) => d.checkOut > d.checkIn, { path: ["checkOut"], message: "checkout_before_checkin" })
  .refine((d) => (Date.parse(d.checkOut) - Date.parse(d.checkIn)) / 86_400_000 <= 60, {
    path: ["checkOut"],
    message: "stay_too_long",
  });

export type ManualReservationInput = z.input<typeof manualReservationSchema>;

export class ManualReservationError extends Error {
  constructor(public readonly code: "invalid" | "conflict" | "unit_unknown") {
    super(code);
  }
}

export async function createManualReservation(
  db: Db,
  actorUserId: string,
  raw: ManualReservationInput,
  opts: { now?: Date } = {},
) {
  const now = opts.now ?? new Date();
  const parsed = manualReservationSchema.safeParse(raw);
  if (!parsed.success) throw new ManualReservationError("invalid");
  const d = parsed.data;

  try {
    return await db.transaction(async (tx) => {
      const [unit] = await tx
        .select({ id: units.id })
        .from(units)
        .where(and(eq(units.id, d.unitId), eq(units.isActive, true)));
      if (!unit) throw new ManualReservationError("unit_unknown");

      const [reservation] = await tx
        .insert(reservations)
        .values({
          reference: generateReference(),
          unitId: d.unitId,
          checkIn: d.checkIn,
          checkOut: d.checkOut,
          adults: d.adults,
          children: d.children,
          guestName: d.guestName,
          phone: d.phone,
          note: d.note || null,
          locale: "tr",
          source: d.source,
          status: "confirmed",
          // Misafir verisini işletme doğrudan aldı (sözleşme ilişkisi); kayıt anı.
          consentAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      await tx.insert(reservationEvents).values({
        reservationId: reservation.id,
        type: "created",
        toStatus: "confirmed",
        actor: `user:${actorUserId}`,
        createdAt: now,
      });
      return reservation;
    });
  } catch (e) {
    if (e instanceof ManualReservationError) throw e;
    if (isExclusionViolation(e)) throw new ManualReservationError("conflict");
    throw e;
  }
}

export async function addReservationNote(db: Db, id: string, actorUserId: string, note: string) {
  const text = note.trim();
  if (!text) return;
  await db.insert(reservationEvents).values({
    reservationId: id,
    type: "note_added",
    actor: `user:${actorUserId}`,
    note: text.slice(0, 2000),
  });
}

/**
 * Sitede onaylanmış (direkt) rezervasyonların dolu günleri, ünite adına göre
 * (Airbnb doluluğuyla aynı biçim: ad → YYYY-MM-DD[]). Kamp alanı ortak olduğu için hariç.
 */
export async function confirmedDaysByUnit(db: Db, fromDate: string): Promise<Record<string, string[]>> {
  const rows = await db
    .select({ name: units.name, slug: units.slug, checkIn: reservations.checkIn, checkOut: reservations.checkOut })
    .from(reservations)
    .innerJoin(units, eq(units.id, reservations.unitId))
    .where(and(eq(reservations.status, "confirmed"), gt(reservations.checkOut, fromDate)));

  const out: Record<string, Set<string>> = {};
  for (const r of rows) {
    if (r.slug === SHARED_UNIT_SLUG) continue;
    const days = (out[r.name] ??= new Set());
    for (let d = new Date(`${r.checkIn}T00:00:00Z`); d < new Date(`${r.checkOut}T00:00:00Z`); ) {
      const day = d.toISOString().slice(0, 10);
      if (day >= fromDate) days.add(day);
      d = new Date(d.getTime() + 86_400_000);
    }
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v].sort()]));
}

/** İki doluluk haritasını (ünite adı → günler) birleştirir. */
export function mergeLockedDays(
  a: Record<string, string[]>,
  b: Record<string, string[]>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    out[key] = [...new Set([...(a[key] ?? []), ...(b[key] ?? [])])].sort();
  }
  return out;
}

/** Onaylı rezervasyonlar — Airbnb'ye verilecek takvim (iCal) için. */
export async function confirmedStaysForUnit(db: Db, unitSlug: string, fromDate: string) {
  return db
    .select({ id: reservations.id, checkIn: reservations.checkIn, checkOut: reservations.checkOut })
    .from(reservations)
    .innerJoin(units, eq(units.id, reservations.unitId))
    .where(
      and(
        eq(units.slug, unitSlug),
        eq(reservations.status, "confirmed"),
        gte(reservations.checkOut, fromDate),
      ),
    )
    .orderBy(asc(reservations.checkIn));
}
