// Local development database: PGlite (real PostgreSQL engine in WASM) + a TCP server.
// No Docker needed. Data persists in .pglite/ (git-ignored).
//   npm run db:local   →  postgres://postgres@127.0.0.1:5433/postgres
// Put this address in .env.development.local as DATABASE_URL; `npm run dev` picks it up.
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

const PORT = 5433;

const db = await PGlite.create("./.pglite", { extensions: { btree_gist } });
await migrate(drizzle(db), { migrationsFolder: "./drizzle" });
console.log("[local-db] migrations applied ✓");

const server = new PGLiteSocketServer({ db, port: PORT, host: "127.0.0.1", maxConnections: 10 });
await server.start();
console.log(`[local-db] ready: postgres://postgres@127.0.0.1:${PORT}/postgres`);

async function shutdown() {
  await server.stop();
  await db.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
