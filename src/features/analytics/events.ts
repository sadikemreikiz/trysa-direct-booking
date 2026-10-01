import { z } from "zod";
import type { Db } from "@/db";
import { analyticsEvents } from "@/db/schema";

/** Events the client may send. reservation_submitted is written only on the server. */
export const clientEventSchema = z.object({
  name: z.enum(["whatsapp_click", "phone_click"]),
  path: z.string().startsWith("/").max(200),
  locale: z.enum(["tr", "en", "de"]).optional(),
  referrerHost: z.string().max(100).optional(),
});

export type ClientEvent = z.infer<typeof clientEventSchema>;

export async function recordClientEvent(db: Db, event: ClientEvent) {
  await db.insert(analyticsEvents).values({
    name: event.name,
    path: event.path,
    locale: event.locale ?? null,
    referrerHost: event.referrerHost ?? null,
  });
}
