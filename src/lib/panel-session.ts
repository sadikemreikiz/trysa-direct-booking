import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDb } from "@/db";
import { getStaffMember } from "@/db/staff";
import { getAuth } from "./auth";

/** Oturum + panel yetkisi. Her panel sayfası ve işlemi buradan geçer. */
export async function getPanelContext() {
  await connection(); // panel her zaman istek anında çalışır, asla önceden üretilmez
  const db = getDb();
  if (!db) return null;
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return { db, session: null, staff: null };
  const staff = await getStaffMember(db, session.user.id);
  return { db, session, staff };
}

/** Giriş yapmamışsa giriş sayfasına, onaysızsa bekleme sayfasına yönlendirir. */
export async function requireApprovedStaff() {
  const ctx = await getPanelContext();
  if (!ctx) throw new Error("Panel için veritabanı gerekli");
  if (!ctx.session) redirect("/panel/giris");
  if (!ctx.staff || ctx.staff.status !== "approved") redirect("/panel/bekleniyor");
  return { db: ctx.db, staff: ctx.staff };
}
