// Veritabanı migration'larını uygular (drizzle/ klasöründeki sürümlü SQL dosyaları).
// - Vercel production build'inde otomatik çalışır: migration başarısız olursa build durur,
//   canlıdaki eski sürüm yayında kalır.
// - Preview/yerel build'lerde atlanır; elle çalıştırmak için: npm run db:migrate
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const force = process.argv.includes("--force");
const isProductionBuild = process.env.VERCEL_ENV === "production";

if (!force && !isProductionBuild) {
  console.log("[migrate] production build değil — atlandı (elle: npm run db:migrate)");
  process.exit(0);
}

// Migration için pooler yerine doğrudan bağlantı (DDL + advisory lock için daha güvenli).
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
