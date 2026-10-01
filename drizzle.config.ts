import { defineConfig } from "drizzle-kit";

// Migrations live in `drizzle/` as versioned SQL files.
// Generate: npm run db:generate  ·  Apply: npm run db:migrate (needs DATABASE_URL)
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
});
