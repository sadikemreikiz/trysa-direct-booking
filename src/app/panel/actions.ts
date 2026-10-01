"use server";

import { revalidatePath } from "next/cache";
import {
  addReservationNote,
  availabilityForRange,
  cancelReservation,
  confirmReservation,
  createManualReservation,
  declineReservation,
  getReservationDetail,
  ManualReservationError,
  TransitionError,
  type ManualReservationInput,
  type UnitAvailability,
} from "@/db/panel";
import { AuthorizationError, decideAccess } from "@/db/staff";
import { todayInDemre } from "@/db/reservations";
import { getLockedDatesByType } from "@/lib/availability";
import { requireApprovedStaff } from "@/lib/panel-session";
import { savePushSubscription } from "@/lib/push";

export type ActionResult = { ok: true } | { ok: false; error: string };

const MESSAGES: Record<TransitionError["code"], string> = {
  conflict: "Bu oda bu tarihlerde başka bir onaylı rezervasyonla dolu.",
  invalid_transition: "Bu talep zaten işlenmiş (belki başka biri az önce işlem yaptı).",
  unit_required: "Lütfen bir oda seç.",
  not_found: "Talep bulunamadı.",
};

async function run(id: string, fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    if (e instanceof TransitionError) return { ok: false, error: MESSAGES[e.code] };
    throw e;
  } finally {
    revalidatePath("/panel");
    revalidatePath(`/panel/talep/${id}`);
  }
}

/** Confirming/cancelling changes the taken dates in the guest form → revalidate the booking page. */
function refreshGuestForm() {
  revalidatePath("/[lang]/rezervasyon", "page");
}

export async function confirmAction(id: string, unitId: number, note: string): Promise<ActionResult> {
  const { db, staff } = await requireApprovedStaff();
  const detail = await getReservationDetail(db, id);
  if (!detail) return { ok: false, error: MESSAGES.not_found };

  // The database constraint protects direct bookings; Airbnb occupancy is checked here.
  const availability = await availabilityForRange(
    db,
    detail.r.checkIn,
    detail.r.checkOut,
    await getLockedDatesByType(),
    id,
  );
  const unit = availability.find((u) => u.id === unitId);
  if (!unit) return { ok: false, error: MESSAGES.unit_required };
  if (!unit.free) {
    return {
      ok: false,
      error: unit.reason === "airbnb" ? "Bu oda bu tarihlerde Airbnb'de dolu." : MESSAGES.conflict,
    };
  }
  const result = await run(id, () => confirmReservation(db, id, staff.userId, unitId, { note }));
  refreshGuestForm();
  return result;
}

/** Manual booking form: which rooms are free on the chosen dates? */
export async function availabilityAction(checkIn: string, checkOut: string): Promise<UnitAvailability[]> {
  const { db } = await requireApprovedStaff();
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(checkIn) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(checkOut) ||
    checkOut <= checkIn ||
    checkIn < todayInDemre(new Date())
  ) {
    return [];
  }
  return availabilityForRange(db, checkIn, checkOut, await getLockedDatesByType());
}

export async function createManualAction(
  input: ManualReservationInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const { db, staff } = await requireApprovedStaff();

  const availability = await availabilityForRange(db, input.checkIn, input.checkOut, await getLockedDatesByType());
  const unit = availability.find((u) => u.id === input.unitId);
  if (!unit) return { ok: false, error: MESSAGES.unit_required };
  if (!unit.free) {
    return {
      ok: false,
      error: unit.reason === "airbnb" ? "Bu oda bu tarihlerde Airbnb'de dolu." : MESSAGES.conflict,
    };
  }

  try {
    const reservation = await createManualReservation(db, staff.userId, input);
    revalidatePath("/panel");
    refreshGuestForm();
    return { ok: true, id: reservation.id };
  } catch (e) {
    if (e instanceof ManualReservationError) {
      return {
        ok: false,
        error:
          e.code === "conflict"
            ? MESSAGES.conflict
            : e.code === "unit_unknown"
              ? MESSAGES.unit_required
              : e.code === "in_past"
                ? "Geçmiş bir tarihe rezervasyon eklenemez."
                : "Bilgilerde eksik var: tarih, oda ve misafir adı gerekli.",
      };
    }
    throw e;
  }
}

export async function declineAction(id: string, note: string): Promise<ActionResult> {
  const { db, staff } = await requireApprovedStaff();
  return run(id, () => declineReservation(db, id, staff.userId, { note }));
}

export async function cancelAction(id: string, note: string): Promise<ActionResult> {
  const { db, staff } = await requireApprovedStaff();
  const result = await run(id, () => cancelReservation(db, id, staff.userId, { note }));
  refreshGuestForm();
  return result;
}

export async function noteAction(id: string, note: string): Promise<ActionResult> {
  const { db, staff } = await requireApprovedStaff();
  return run(id, () => addReservationNote(db, id, staff.userId, note));
}

export async function decideAccessAction(
  userId: string,
  status: "approved" | "revoked",
  role: "admin" | "staff",
): Promise<ActionResult> {
  const { db, staff } = await requireApprovedStaff();
  try {
    await decideAccess(db, staff, userId, { status, role });
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: e.message };
    throw e;
  } finally {
    revalidatePath("/panel/erisim");
  }
}

export async function savePushSubscriptionAction(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<ActionResult> {
  const { db, staff } = await requireApprovedStaff();
  if (!sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { ok: false, error: "Geçersiz bildirim aboneliği" };
  }
  await savePushSubscription(db, staff.userId, sub);
  return { ok: true };
}
