/**
 * Spam protection: fixed-window counter in a single atomic SQL statement.
 * On serverless (Vercel) an in-memory counter would be per instance, so it lives in the database.
 */
import { lt, sql } from "drizzle-orm";
import type { Db } from "@/db/index";
import { rateLimits } from "@/db/schema";

export type RateLimitRule = { limit: number; windowMs: number };

/** Counts one request for the key; returns false if the limit is exceeded. */
export async function hitRateLimit(
  db: Db,
  key: string,
  rule: RateLimitRule,
  now: Date = new Date(),
): Promise<boolean> {
  const windowOpenedAfter = new Date(now.getTime() - rule.windowMs);
  const expired = sql`${rateLimits.windowStart} <= ${windowOpenedAfter.toISOString()}::timestamptz`;
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, windowStart: now })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${expired} then ${now.toISOString()}::timestamptz else ${rateLimits.windowStart} end`,
      },
    })
    .returning({ count: rateLimits.count });
  return row.count <= rule.limit;
}

/** Applies several rules in order (e.g. 3 per 10 minutes and 10 per day). All of them count. */
export async function hitRateLimits(
  db: Db,
  key: string,
  rules: Record<string, RateLimitRule>,
  now: Date = new Date(),
): Promise<boolean> {
  let allowed = true;
  for (const [name, rule] of Object.entries(rules)) {
    if (!(await hitRateLimit(db, `${key}:${name}`, rule, now))) allowed = false;
  }
  return allowed;
}

/** Deletes long-expired counters (IP digests are kept for at most 2 days). */
export async function pruneRateLimits(db: Db, now: Date = new Date()) {
  await db.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(now.getTime() - 2 * 86_400_000)));
}
