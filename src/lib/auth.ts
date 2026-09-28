/**
 * Panel girişi (Better Auth + Google). Oturumlar veritabanında tutulur (iptal edilebilir).
 *
 * Yetki modeli: Google ile giriş yapan herkes panele giremez. İlk girişte bir `staff`
 * kaydı "pending" (erişim isteği) olarak açılır; yönetici onaylayınca aktif olur.
 * ADMIN_EMAILS'teki adresler (virgülle ayrılmış) doğrudan onaylı yönetici olarak başlar.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { createStaffForNewUser } from "@/db/staff";
import { sendPushToStaff } from "./push";

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function createAuth() {
  const db = getDb();
  if (!db) throw new Error("Panel için DATABASE_URL gerekli");

  return betterAuth({
    appName: "Trysa Panel",
    database: drizzleAdapter(db, { provider: "pg", schema }),
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        prompt: "select_account",
      },
    },
    session: {
      // Dayı bir kez girsin, uzun süre tekrar sorulmasın; her gün kullanımda uzar.
      expiresIn: 60 * 60 * 24 * 90,
      updateAge: 60 * 60 * 24,
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const status = await createStaffForNewUser(db, user, adminEmails());
            if (status === "pending") {
              // Yöneticinin telefonuna: biri panele girmek istiyor.
              await sendPushToStaff(
                db,
                {
                  title: "👤 Panel erişim isteği",
                  body: `${user.name} (${user.email}) panele girmek istiyor`,
                  url: "/panel/erisim",
                },
                { roles: ["admin"] },
              ).catch(console.error);
            }
          },
        },
      },
    },
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | null = null;

/** Veritabanı bağlantısı gerektiği için ilk kullanımda oluşturulur. */
export function getAuth() {
  instance ??= createAuth();
  return instance;
}
