/**
 * Testler için gerçek PostgreSQL motoru (PGlite, bellek içinde — Docker gerekmez).
 * Canlıdakiyle aynı migration dosyaları uygulanır; kısıtlar birebir aynı çalışır.
 */
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Db } from "./index";
import * as schema from "./schema";

export async function createTestDb() {
  const client = new PGlite({ extensions: { btree_gist } });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return { db: db as unknown as Db, client };
}

export async function resetTestDb(client: PGlite) {
  await client.exec(
    `TRUNCATE reservations, reservation_events, outbox, analytics_events, rate_limits, "user"
     RESTART IDENTITY CASCADE`,
  );
}
