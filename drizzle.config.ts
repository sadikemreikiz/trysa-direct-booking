import { defineConfig } from "drizzle-kit";

// Migration'lar `drizzle/` klasöründe sürümlü SQL dosyaları olarak tutulur.
// Üretmek: npm run db:generate  ·  Uygulamak: npm run db:migrate (DATABASE_URL gerekir)
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
});
