/**
 * Spam koruması: sabit pencereli sayaç (fixed window), tek atomik SQL ile.
 * Sunucusuz ortamda (Vercel) bellek içi sayaç her örnekte ayrı olurdu; bu yüzden veritabanında.
 */
import { lt, sql } from "drizzle-orm";
import type { Db } from "./index";
import { rateLimits } from "./schema";

export type RateLimitRule = { limit: number; windowMs: number };

/** Anahtar için bir istek sayar; sınır aşıldıysa false döner. */
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

/** Birden çok kuralı sırayla uygular (ör. 10 dakikada 3 ve günde 10). Hepsi sayılır. */
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

/** Süresi çoktan dolmuş sayaçları siler (IP özetleri en fazla 2 gün tutulur). */
export async function pruneRateLimits(db: Db, now: Date = new Date()) {
  await db.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(now.getTime() - 2 * 86_400_000)));
}
