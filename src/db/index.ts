import { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";
import * as schema from "./schema";

/** Sürücüden bağımsız DB tipi — canlıda postgres.js, testlerde PGlite. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let cached: Db | null = null;

/**
 * Canlı veritabanı (Neon, pooled bağlantı). DATABASE_URL yoksa null döner;
 * çağıran taraf veritabanısız (sadece e-posta) moda düşer, site çalışmaya devam eder.
 */
export function getDb(): Db | null {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  // Neon pooler (PgBouncer, transaction modu) prepared statement desteklemez.
  const client = postgres(url, { prepare: false, max: 1 });
  cached = drizzle(client, { schema });
  return cached;
}
