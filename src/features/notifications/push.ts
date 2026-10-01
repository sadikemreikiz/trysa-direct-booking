/**
 * Phone notifications (Web Push, VAPID). Every device that taps "Turn on notifications"
 * is stored in push_subscriptions; new requests go to all approved panel users.
 */
import { and, eq, inArray } from "drizzle-orm";
import webpush from "web-push";
import type { Db } from "@/db";
import { pushSubscriptions, staff, type StaffRole } from "@/db/schema";
import type { EmailResult } from "./email";

export type PushMessage = { title: string; body: string; url: string };

export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

function configure(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails("mailto:trysarestaurantcamping@gmail.com", pub, priv);
  return true;
}

/**
 * Sends to all devices of approved panel users. Expired subscriptions (404/410)
 * are deleted. If every send fails with a temporary error, an error is returned so it gets retried.
 */
export async function sendPushToStaff(
  db: Db,
  message: PushMessage,
  opts: { roles?: StaffRole[] } = {},
): Promise<EmailResult> {
  if (!configure()) return { ok: true }; // push not configured; the email still goes out

  const subs = await db
    .select({
      id: pushSubscriptions.id,
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .innerJoin(
      staff,
      and(
        eq(staff.userId, pushSubscriptions.userId),
        eq(staff.status, "approved"),
        opts.roles ? inArray(staff.role, opts.roles) : undefined,
      ),
    );
  if (subs.length === 0) return { ok: true };

  const payload = JSON.stringify(message);
  let delivered = 0;
  const errors: string[] = [];
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 60 * 60 * 24, urgency: "high" },
      );
      delivered++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
        delivered++; // the device is gone, retrying is pointless
      } else {
        errors.push(`${status ?? "ağ"}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  return delivered > 0 ? { ok: true } : { ok: false, error: errors.join("; ").slice(0, 300) };
}

export async function savePushSubscription(
  db: Db,
  userId: string,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
) {
  await db
    .insert(pushSubscriptions)
    .values({ userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
}
