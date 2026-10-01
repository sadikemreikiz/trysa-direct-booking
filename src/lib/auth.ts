/**
 * Panel sign-in (Better Auth + Google). Sessions live in the database (revocable).
 *
 * Permission model: signing in with Google does not grant panel access. On first sign-in a `staff`
 * row is created as "pending" (access request); it becomes active once an admin approves it.
 * Addresses in ADMIN_EMAILS (comma-separated) start directly as approved admins.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { sendPushToStaff } from "@/features/notifications/push";
import { createStaffForNewUser } from "@/features/panel/staff";

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function createAuth() {
  const db = getDb();
  if (!db) throw new Error("The panel requires DATABASE_URL");

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
      // Sign in once and don't get asked again for a long time; daily use extends the session.
      expiresIn: 60 * 60 * 24 * 90,
      updateAge: 60 * 60 * 24,
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            const status = await createStaffForNewUser(db, user, adminEmails());
            if (status === "pending") {
              // To the admin's phone: someone wants to access the panel.
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

/** Created on first use because it needs a database connection. */
export function getAuth() {
  instance ??= createAuth();
  return instance;
}
