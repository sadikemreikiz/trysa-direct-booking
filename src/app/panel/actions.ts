"use server";

import { revalidatePath } from "next/cache";
import {
  addReservationNote,
  availabilityForRange,
  cancelReservation,
  confirmReservation,
  declineReservation,
  getReservationDetail,
  TransitionError,
} from "@/db/panel";
import { AuthorizationError, decideAccess } from "@/db/staff";
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

export async function confirmAction(id: string, unitId: number, note: string): Promise<ActionResult> {
  const { db, staff } = await requireApprovedStaff();
  const detail = await getReservationDetail(db, id);
  if (!detail) return { ok: false, error: MESSAGES.not_found };

  // Veritabanı kısıtı sitedeki onayları korur; Airbnb doluluğunu ise burada kontrol ederiz.
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
  return run(id, () => confirmReservation(db, id, staff.userId, unitId, { note }));
}

export async function declineAction(id: string, note: string): Promise<ActionResult> {
  const { db, staff } = await requireApprovedStaff();
  return run(id, () => declineReservation(db, id, staff.userId, { note }));
}

export async function cancelAction(id: string, note: string): Promise<ActionResult> {
  const { db, staff } = await requireApprovedStaff();
  return run(id, () => cancelReservation(db, id, staff.userId, { note }));
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
