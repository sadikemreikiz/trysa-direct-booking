/**
 * Alerts for the admins when something breaks quietly: a push notification to their phones,
 * or an email to the family address when push can't be used (no database, push failing).
 * The same alert goes out at most once per cooldown, so a recurring error doesn't flood the
 * phone. Alerting never throws: a failing alert must not break the request that raised it.
 */
import type { Db } from "@/db";
import { hitRateLimit } from "@/features/booking/rate-limit";
import { sendNotificationEmail, type EmailResult } from "@/features/notifications/email";
import { sendPushToStaff, type PushMessage } from "@/features/notifications/push";

export const HOUR_MS = 60 * 60_000;

export type Alert = {
  /** Identifies the problem for the cooldown, e.g. "airbnb:Ambar-1" */
  key: string;
  title: string;
  body: string;
  /** Panel page the notification opens */
  url?: string;
};

export type AlertChannels = {
  push: (db: Db, message: PushMessage) => Promise<EmailResult>;
  email: (subject: string, text: string) => Promise<EmailResult>;
};

const defaultChannels: AlertChannels = {
  push: (db, message) => sendPushToStaff(db, message, { roles: ["admin"] }),
  email: sendNotificationEmail,
};

/** Cooldown without a database: per server instance, which is the best we can do then. */
const sentInMemory = new Map<string, number>();

export type AlertOutcome = "push" | "email" | "suppressed" | "failed";

export async function alertAdmins(
  db: Db | null,
  alert: Alert,
  opts: { cooldownMs?: number; now?: Date; channels?: AlertChannels } = {},
): Promise<AlertOutcome> {
  const { cooldownMs = HOUR_MS, now = new Date(), channels = defaultChannels } = opts;
  const body = alert.body.slice(0, 300);
  const email = async (): Promise<AlertOutcome> =>
    (await channels.email(`[Trysa uyarı] ${alert.title}`, body)).ok ? "email" : "failed";
  try {
    if (db) {
      try {
        const due = await hitRateLimit(
          db,
          `alert:${alert.key}`,
          { limit: 1, windowMs: cooldownMs },
          now,
        );
        if (!due) return "suppressed";
        const pushed = await channels.push(db, {
          title: alert.title,
          body,
          url: alert.url ?? "/panel",
        });
        return pushed.ok ? "push" : await email();
      } catch (e) {
        // The database itself may be the problem: email instead, with the in-memory cooldown.
        console.error("Push alert failed, falling back to email", e);
      }
    }
    const last = sentInMemory.get(alert.key);
    if (last !== undefined && now.getTime() - last < cooldownMs) return "suppressed";
    sentInMemory.set(alert.key, now.getTime());
    return await email();
  } catch (e) {
    console.error("Could not alert the admins", alert.key, e);
    return "failed";
  }
}
