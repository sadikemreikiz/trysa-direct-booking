import { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";
import * as schema from "./schema";

/** Driver-independent DB type: postgres.js in production, PGlite in tests. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let cached: Db | null = null;

/**
 * Production database (Neon, pooled connection). Returns null without DATABASE_URL;
 * the caller falls back to database-less (email-only) mode and the site keeps working.
 */
export function getDb(): Db | null {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  // The Neon pooler (PgBouncer, transaction mode) doesn't support prepared statements.
  const client = postgres(url, { prepare: false, max: 1 });
  cached = drizzle(client, { schema });
  return cached;
}
