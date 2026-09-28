// Lokal geliştirme veritabanı: PGlite (gerçek PostgreSQL motoru, WASM) + TCP sunucusu.
// Docker gerekmez. Veri .pglite/ klasöründe kalıcıdır (git'e girmez).
//   npm run db:local   →  postgres://postgres@127.0.0.1:5433/postgres
// .env.development.local içine DATABASE_URL olarak bu adresi yaz; `npm run dev` onu kullanır.
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

const PORT = 5433;

const db = await PGlite.create("./.pglite", { extensions: { btree_gist } });
await migrate(drizzle(db), { migrationsFolder: "./drizzle" });
console.log("[local-db] migration'lar uygulandı ✓");

const server = new PGLiteSocketServer({ db, port: PORT, host: "127.0.0.1", maxConnections: 10 });
await server.start();
console.log(`[local-db] hazır: postgres://postgres@127.0.0.1:${PORT}/postgres`);

async function shutdown() {
  await server.stop();
  await db.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
