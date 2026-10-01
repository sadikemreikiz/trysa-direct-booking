import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDb } from "@/db";
import { getStaffMember } from "./staff";
import { getAuth } from "@/lib/auth";

/** Session + panel permission. Every panel page and action goes through here. */
export async function getPanelContext() {
  await connection(); // the panel always renders at request time, never prerendered
  const db = getDb();
  if (!db) return null;
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return { db, session: null, staff: null };
  const staff = await getStaffMember(db, session.user.id);
  return { db, session, staff };
}

/** Redirects to sign-in if not signed in, to the waiting page if not approved. */
export async function requireApprovedStaff() {
  const ctx = await getPanelContext();
  if (!ctx) throw new Error("The panel requires a database");
  if (!ctx.session) redirect("/panel/giris");
  if (!ctx.staff || ctx.staff.status !== "approved") redirect("/panel/bekleniyor");
  return { db: ctx.db, staff: ctx.staff };
}
