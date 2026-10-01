/**
 * Panel authorization: who may sign in, who approves.
 * Google sign-in verifies identity (authentication); this module decides permissions (authorization).
 */
import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@/db/index";
import { staff, user, type StaffRole } from "@/db/schema";

/** New Google user: an approved admin if on the admin list, otherwise an access request. */
export async function createStaffForNewUser(
  db: Db,
  newUser: { id: string; email: string },
  adminEmails: string[],
) {
  const isBootstrapAdmin = adminEmails.includes(newUser.email.toLowerCase());
  const status = isBootstrapAdmin ? "approved" : "pending";
  await db
    .insert(staff)
    .values({
      userId: newUser.id,
      role: isBootstrapAdmin ? "admin" : "staff",
      status,
      decidedAt: isBootstrapAdmin ? new Date() : null,
    })
    .onConflictDoNothing();
  return status;
}

export type StaffMember = {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: StaffRole;
  status: "pending" | "approved" | "revoked";
};

export async function getStaffMember(db: Db, userId: string): Promise<StaffMember | null> {
  const [row] = await db
    .select({
      userId: staff.userId,
      name: user.name,
      email: user.email,
      image: user.image,
      role: staff.role,
      status: staff.status,
    })
    .from(staff)
    .innerJoin(user, eq(user.id, staff.userId))
    .where(eq(staff.userId, userId));
  return row ?? null;
}

export async function listStaff(db: Db) {
  return db
    .select({
      userId: staff.userId,
      name: user.name,
      email: user.email,
      role: staff.role,
      status: staff.status,
      createdAt: staff.createdAt,
    })
    .from(staff)
    .innerJoin(user, eq(user.id, staff.userId))
    .orderBy(asc(staff.createdAt));
}

export class AuthorizationError extends Error {}

/** Only approved admins can decide on access; nobody can change their own permissions. */
export async function decideAccess(
  db: Db,
  actor: StaffMember,
  targetUserId: string,
  decision: { status: "approved" | "revoked"; role?: StaffRole },
  now: Date = new Date(),
) {
  if (actor.role !== "admin" || actor.status !== "approved") {
    throw new AuthorizationError("Sadece yöneticiler erişim kararı verebilir");
  }
  if (actor.userId === targetUserId) {
    throw new AuthorizationError("Kendi yetkini değiştiremezsin");
  }
  const [updated] = await db
    .update(staff)
    .set({
      status: decision.status,
      ...(decision.role ? { role: decision.role } : {}),
      decidedBy: actor.userId,
      decidedAt: now,
    })
    .where(and(eq(staff.userId, targetUserId)))
    .returning();
  return updated ?? null;
}
