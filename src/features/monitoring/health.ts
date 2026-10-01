/**
 * Health checks for things that fail quietly. Each check records whether it worked; once it
 * has been failing for longer than its grace period the admins are alerted once, and once
 * more when it works again.
 */
import { and, eq, isNull, lte, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { healthChecks } from "@/db/schema";

export type CheckResult = { ok: true } | { ok: false; error: string };

/** What the caller should tell the admins after recording a check. */
export type HealthChange =
  { kind: "none" } | { kind: "failing"; since: Date; error: string } | { kind: "recovered" };

export async function recordCheck(
  db: Db,
  name: string,
  result: CheckResult,
  graceMs: number,
  now: Date = new Date(),
): Promise<HealthChange> {
  if (result.ok) {
    // Clears the failure; the returned row is the state before, to know if an alert went out.
    const [before] = await db
      .select({ alertedAt: healthChecks.alertedAt })
      .from(healthChecks)
      .where(eq(healthChecks.name, name));
    await db
      .insert(healthChecks)
      .values({ name, okAt: now })
      .onConflictDoUpdate({
        target: healthChecks.name,
        set: { okAt: now, failingSince: null, lastError: null, alertedAt: null },
      });
    return before?.alertedAt ? { kind: "recovered" } : { kind: "none" };
  }

  const error = result.error.slice(0, 300);
  await db
    .insert(healthChecks)
    .values({ name, failingSince: now, lastError: error })
    .onConflictDoUpdate({
      target: healthChecks.name,
      set: {
        failingSince: sql`coalesce(${healthChecks.failingSince}, ${now})`,
        lastError: error,
      },
    });
  // Alert once per failure, after the grace period. The conditional update makes two
  // overlapping runs agree on who sends it.
  const [alerted] = await db
    .update(healthChecks)
    .set({ alertedAt: now })
    .where(
      and(
        eq(healthChecks.name, name),
        isNull(healthChecks.alertedAt),
        lte(healthChecks.failingSince, new Date(now.getTime() - graceMs)),
      ),
    )
    .returning({ since: healthChecks.failingSince });
  return alerted?.since ? { kind: "failing", since: alerted.since, error } : { kind: "none" };
}

/** When a check last worked (null: never recorded). */
export async function lastOk(db: Db, name: string): Promise<Date | null> {
  const [row] = await db
    .select({ okAt: healthChecks.okAt })
    .from(healthChecks)
    .where(eq(healthChecks.name, name));
  return row?.okAt ?? null;
}
