// Applies database migrations (versioned SQL files in drizzle/).
// - Runs automatically in the Vercel production build: if a migration fails the build stops
//   and the previous version stays live.
// - Skipped in preview/local builds; to run by hand: npm run db:migrate
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const force = process.argv.includes("--force");
const isProductionBuild = process.env.VERCEL_ENV === "production";

if (!force && !isProductionBuild) {
  console.log("[migrate] production build değil — atlandı (elle: npm run db:migrate)");
  process.exit(0);
}

// Migrations use a direct connection instead of the pooler (safer for DDL + advisory locks).
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] DATABASE_URL tanımlı değil — atlandı");
  process.exit(0);
}

const client = postgres(url, { max: 1 });
try {
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  console.log("[migrate] veritabanı güncel ✓");
} finally {
  await client.end();
}
