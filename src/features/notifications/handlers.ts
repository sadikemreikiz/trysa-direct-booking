import type { Db } from "@/db";
import { sendGuestEmail, sendNotificationEmail } from "./email";
import type { OutboxHandlers } from "./outbox";
import { sendPushToStaff } from "./push";

/** The real delivery channels for outbox messages (tests pass fakes instead). */
export function outboxHandlers(db: Db): OutboxHandlers {
  return {
    email: sendNotificationEmail,
    push: (message) => sendPushToStaff(db, message),
    guestEmail: sendGuestEmail,
  };
}
