import type { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import { outbox, rateLimits } from "@/db/schema";
import { createTestDb, resetTestDb } from "@/db/test-db";
import { createReservation, type ReservationRequest } from "@/features/booking/reservations";
import {
  backoffMs,
  deliverDueOutbox,
  deliverOutboxMessage,
  MAX_ATTEMPTS,
  type OutboxHandlers,
} from "./outbox";

const NOW = new Date("2026-10-01T09:00:00Z");

const valid: ReservationRequest = {
  checkin: "2026-11-10",
  checkout: "2026-11-12",
  adults: "2",
  children: "0",
  unit: "ambar-1",
  name: "Ayşe Yılmaz",
  phone: "0555 111 22 33",
  email: "",
  note: "",
  locale: "tr",
  consent: true,
};

let db: Db;
let client: PGlite;

beforeAll(async () => {
  ({ db, client } = await createTestDb());
});
afterAll(async () => {
  await client.close();
});
beforeEach(async () => {
  await resetTestDb(client);
});

/** Fake delivery channels: email uses the given function, push succeeds by default. */
function via(
  email: ReturnType<typeof vi.fn>,
  push = vi.fn().mockResolvedValue({ ok: true }),
  guestEmail = vi.fn().mockResolvedValue({ ok: true }),
) {
  return { email, push, guestEmail } as unknown as OutboxHandlers;
}

describe("outbox delivery", () => {
  it("marks the message 'sent' on success and the email contains the reference code", async () => {
    const { reservation, outboxId } = await createReservation(db, valid, { now: NOW });
    const send = vi.fn().mockResolvedValue({ ok: true });

    expect(await deliverOutboxMessage(db, outboxId, via(send), NOW)).toBe("sent");

    const [subject, text] = send.mock.calls[0];
    expect(subject).toContain(reservation.reference);
    expect(text).toContain("Konaklama: Ambar-1");
    const [row] = await db.select().from(outbox).where(eq(outbox.id, outboxId));
    expect(row).toMatchObject({ status: "sent", attempts: 1, lastError: null });
  });

  it("the phone notification goes out as a separate message with the panel link", async () => {
    const { reservation, pushOutboxId } = await createReservation(db, valid, { now: NOW });
    const email = vi.fn();
    const push = vi.fn().mockResolvedValue({ ok: true });

    expect(await deliverOutboxMessage(db, pushOutboxId, via(email, push), NOW)).toBe("sent");

    expect(email).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith({
      title: "🔔 Yeni talep · Ayşe Yılmaz",
      body: "Ambar-1 · 10 Kas – 12 Kas · 2 kişi",
      url: `/panel/talep/${reservation.id}`,
    });
  });

  it("if the email fails only the email is retried; the push is unaffected", async () => {
    const { outboxId, pushOutboxId } = await createReservation(db, valid, { now: NOW });
    const failingEmail = vi.fn().mockResolvedValue({ ok: false, error: "Resend 500" });
    const results = await deliverDueOutbox(db, via(failingEmail), NOW);
    expect(results.sort()).toEqual(["retry_scheduled", "sent"]);

    const rows = await db.select().from(outbox);
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(outboxId)?.status).toBe("pending");
    expect(byId.get(pushOutboxId)?.status).toBe("sent");
  });

  it("reschedules a failed delivery with exponential backoff", async () => {
    const { outboxId } = await createReservation(db, valid, { now: NOW });
    const send = vi.fn().mockResolvedValue({ ok: false, error: "Resend 500" });

    expect(await deliverOutboxMessage(db, outboxId, via(send), NOW)).toBe("retry_scheduled");

    const [row] = await db.select().from(outbox).where(eq(outbox.id, outboxId));
    expect(row.status).toBe("pending");
    expect(row.lastError).toBe("Resend 500");
    expect(row.nextAttemptAt.getTime()).toBe(NOW.getTime() + backoffMs(1));
  });

  it("doesn't retry before it's due, retries once it is", async () => {
    const { outboxId, pushOutboxId } = await createReservation(db, valid, { now: NOW });
    const ok = vi.fn().mockResolvedValue({ ok: true });
    await deliverOutboxMessage(db, pushOutboxId, via(ok), NOW);
    await deliverOutboxMessage(
      db,
      outboxId,
      via(vi.fn().mockResolvedValue({ ok: false, error: "x" })),
      NOW,
    );

    expect(await deliverDueOutbox(db, via(ok), new Date(NOW.getTime() + 60_000))).toEqual([]);
    expect(await deliverDueOutbox(db, via(ok), new Date(NOW.getTime() + backoffMs(1)))).toEqual([
      "sent",
    ]);
  });

  it(`leaves it as 'failed' after ${MAX_ATTEMPTS} attempts`, async () => {
    const { outboxId } = await createReservation(db, valid, { now: NOW });
    const send = vi.fn().mockResolvedValue({ ok: false, error: "down" });
    let t = NOW.getTime();
    const results = [];
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      results.push(await deliverOutboxMessage(db, outboxId, via(send), new Date(t)));
      t += backoffMs(i + 1);
    }
    expect(results.at(-1)).toBe("failed");
    expect(send).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    // Giving up alerts the admins (one alert, kept from repeating by its cooldown counter)
    const alerts = await db.select().from(rateLimits);
    expect(alerts.map((r) => r.key)).toEqual(["alert:outbox:reservation_notification"]);
  });

  it("the same message is not sent twice by two concurrent workers", async () => {
    const { outboxId } = await createReservation(db, valid, { now: NOW });
    let release!: () => void;
    const slow = vi.fn(() => new Promise<{ ok: true }>((r) => (release = () => r({ ok: true }))));
    const first = deliverOutboxMessage(db, outboxId, via(slow), NOW);
    await vi.waitFor(() => expect(slow).toHaveBeenCalled());

    expect(await deliverOutboxMessage(db, outboxId, via(slow), NOW)).toBe("skipped");
    release();
    expect(await first).toBe("sent");
    expect(slow).toHaveBeenCalledTimes(1);
  });
});

describe("guest request email", () => {
  it("is queued only when requested and the guest gave an email", async () => {
    expect(
      (await createReservation(db, { ...valid, email: "a@example.com" }, { now: NOW }))
        .guestAckOutboxId,
    ).toBeNull();
    expect(
      (await createReservation(db, { ...valid, email: "" }, { now: NOW, guestAck: true }))
        .guestAckOutboxId,
    ).toBeNull();
    expect(
      (
        await createReservation(
          db,
          { ...valid, email: "a@example.com" },
          { now: NOW, guestAck: true },
        )
      ).guestAckOutboxId,
    ).not.toBeNull();
  });

  it("is sent in the guest's language with the request code", async () => {
    const { reservation, guestAckOutboxId } = await createReservation(
      db,
      { ...valid, name: "Hans Müller", email: "hans@example.com", locale: "de" },
      { now: NOW, guestAck: true },
    );
    const guestEmail = vi.fn().mockResolvedValue({ ok: true });
    const handlers = via(vi.fn(), undefined, guestEmail);

    expect(await deliverOutboxMessage(db, guestAckOutboxId!, handlers, NOW)).toBe("sent");
    const [to, subject, text, html] = guestEmail.mock.calls[0];
    expect(to).toBe("hans@example.com");
    expect(subject).toContain(reservation.reference);
    expect(text).toMatch(/^Hallo Hans,/);
    expect(text).toContain("noch keine Bestätigung");
    expect(text).toContain("https://trysacamping.com/anfahrt");
    // Branded HTML: logo, the guest's language, directions button
    expect(html).toContain('<html lang="de">');
    expect(html).toContain("/email-logo.png");
    expect(html).toContain('href="https://trysacamping.com/anfahrt"');
  });

  it("the name typed by the guest is escaped in the HTML email (no HTML injection)", async () => {
    const { guestAckOutboxId } = await createReservation(
      db,
      { ...valid, name: '<img src=x onerror="alert(1)">', email: "x@example.com" },
      { now: NOW, guestAck: true },
    );
    const guestEmail = vi.fn().mockResolvedValue({ ok: true });
    await deliverOutboxMessage(db, guestAckOutboxId!, via(vi.fn(), undefined, guestEmail), NOW);
    const html: string = guestEmail.mock.calls[0][3];
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });
});
