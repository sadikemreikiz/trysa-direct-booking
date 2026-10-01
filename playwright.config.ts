import { readdirSync, readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { E2E_ENV } from "./e2e/env";

/**
 * Every variable any local .env file sets, blanked for the test server. Next.js never
 * overrides a variable that is already set, so real keys in .env.local (email, Airbnb
 * calendars, Google) stay switched off and the tests can't email the family or reach a
 * real database, whatever the developer has configured.
 */
function blankLocalEnv(): Record<string, string> {
  const names = readdirSync(".")
    .filter((f) => f.startsWith(".env") && f !== ".env.example")
    .flatMap((f) =>
      [...readFileSync(f, "utf8").matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]),
    );
  return Object.fromEntries(names.map((name) => [name, ""]));
}

/**
 * End-to-end tests against a production build, on a throwaway in-memory database that
 * the migrations set up from scratch on every run.
 */
export default defineConfig({
  testDir: "e2e",
  // The flows share one database and build on each other's data, so they run in order.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: E2E_ENV.BETTER_AUTH_URL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: [
    {
      command: "node scripts/local-db.mjs",
      env: { PGLITE_DATA_DIR: "memory://", PGLITE_PORT: E2E_ENV.DB_PORT },
      port: Number(E2E_ENV.DB_PORT),
      reuseExistingServer: false,
    },
    {
      command: "npx next build && npx next start --port 3100",
      env: {
        ...blankLocalEnv(),
        DATABASE_URL: E2E_ENV.DATABASE_URL,
        BETTER_AUTH_SECRET: E2E_ENV.BETTER_AUTH_SECRET,
        BETTER_AUTH_URL: E2E_ENV.BETTER_AUTH_URL,
        NEXT_PUBLIC_SITE_URL: E2E_ENV.BETTER_AUTH_URL,
      },
      url: `${E2E_ENV.BETTER_AUTH_URL}/tr`,
      timeout: 240_000,
      reuseExistingServer: false,
      stdout: "pipe",
    },
  ],
});
