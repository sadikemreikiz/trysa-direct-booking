import { createHmac, randomBytes } from "node:crypto";
import type { BrowserContext, Page } from "@playwright/test";
import postgres from "postgres";
import { addDays, todayInDemre } from "@/lib/dates";
import { E2E_ENV } from "./env";

/** A date `days` from today in Demre (YYYY-MM-DD). */
export function daysFromToday(days: number): string {
  return addDays(todayInDemre(new Date()), days);
}

const dayName = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** A day in the booking calendar (English page), found by its accessible name. */
export function calendarDay(page: Page, iso: string) {
  const name = dayName.format(new Date(`${iso}T00:00:00Z`));
  return page.getByRole("button", { name: new RegExp(`^${name},`) });
}

/** Picks a day, paging forward through the months like a guest would. */
export async function pickDay(page: Page, iso: string) {
  const day = calendarDay(page, iso);
  for (let i = 0; i < 12 && !(await day.isVisible()); i++) {
    await page.getByRole("button", { name: "Next month" }).click();
  }
  await day.click();
}

/**
 * Signs the browser in as an approved admin, without Google: the user, staff row and
 * session go straight into the test database, and the session cookie is signed the way
 * Better Auth signs it (as scripts/dev-login.mjs does for local development).
 */
export async function signInAsStaff(context: BrowserContext) {
  const sql = postgres(E2E_ENV.DATABASE_URL, { max: 1 });
  const token = randomBytes(24).toString("base64url");
  try {
    await sql`
      insert into "user" (id, name, email, email_verified)
      values ('e2e-admin', 'Test Yönetici', 'e2e-admin@trysa.test', true)
      on conflict (id) do nothing`;
    await sql`
      insert into staff (user_id, role, status) values ('e2e-admin', 'admin', 'approved')
      on conflict (user_id) do nothing`;
    await sql`
      insert into session (id, token, user_id, expires_at)
      values (${randomBytes(12).toString("hex")}, ${token}, 'e2e-admin', now() + interval '1 hour')`;
  } finally {
    await sql.end();
  }
  const signature = createHmac("sha256", E2E_ENV.BETTER_AUTH_SECRET).update(token).digest("base64");
  await context.addCookies([
    {
      name: "better-auth.session_token",
      value: encodeURIComponent(`${token}.${signature}`),
      url: E2E_ENV.BETTER_AUTH_URL,
    },
  ]);
}

/** Accepts the next confirm() dialog, as staff do before confirming or deleting. */
export function acceptNextDialog(page: Page) {
  page.once("dialog", (dialog) => dialog.accept());
}
