import type { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import { outbox, reservations } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { createReservation, type ReservationRequest } from "@/features/booking/reservations";
import { confirmReservation, cancelReservation } from "@/features/panel/reservation-admin";
import { buildGuestEmail } from "./guest-email";
import { queueGuestJourneyEmails } from "./guest-journey";
import { deliverDueOutbox, type OutboxHandlers } from "./outbox";

// 1 Oct 2026, 11:00 in Demre (UTC+3): inside the sending hours
const NOW = new Date("2026-10-01T08:00:00Z");
const NIGHT = new Date("2026-10-01T20:30:00Z"); // 23:30 in Demre
const DAY = 86_400_000;

const base: ReservationRequest = {
  checkin: "2026-10-03",
  checkout: "2026-10-05",
  adults: "2",
  children: "1",
  unit: "ambar-1",
  name: "Hans Müller",
  phone: "+49 170 1234567",
  email: "hans@example.com",
  note: "",
  locale: "de",
  consent: true,
};

let db: Db;
let client: PGlite;

beforeAll(async () => {
  ({ db, client } = await createTestDb());
  await db.execute(`insert into "user" (id, name, email) values ('u1', 'Owner', 'o@example.com')`);
});
afterAll(async () => {
  await client.close();
});
beforeEach(async () => {
  await client.exec(`TRUNCATE reservations, reservation_events, outbox RESTART IDENTITY CASCADE`);
});

/** A booking requested and confirmed `confirmedDaysAgo` days before NOW. */
async function confirmedStay(
  patch: Partial<ReservationRequest> = {},
  { confirmedDaysAgo = 10, notifyGuest = false } = {},
) {
  const at = new Date(NOW.getTime() - confirmedDaysAgo * DAY);
  const { reservation } = await createReservation(db, { ...base, ...patch }, { now: at });
  await confirmReservation(db, reservation.id, "u1", reservation.unitId!, { now: at, notifyGuest });
  return reservation;
}

const kinds = async () =>
  (await db.select({ kind: outbox.kind }).from(outbox)).map((r) => r.kind).sort();

const sentBy = () => {
  const guestEmail = vi.fn().mockResolvedValue({ ok: true });
  const handlers = {
    email: vi.fn().mockResolvedValue({ ok: true }),
    push: vi.fn().mockResolvedValue({ ok: true }),
    guestEmail,
  } as unknown as OutboxHandlers;
  return { handlers, guestEmail };
};

describe("confirmation email", () => {
  it("is queued with the status change when the guest gave an email", async () => {
    await confirmedStay({}, { notifyGuest: true });
    expect(await kinds()).toEqual(
      ["reservation_notification", "reservation_push", "guest_confirmed"].sort(),
    );
  });

  it("is not queued without an email address or when guest emails are off", async () => {
    await confirmedStay({ email: "" }, { notifyGuest: true });
    await confirmedStay({ unit: "ambar-2" }, { notifyGuest: false });
    expect(await kinds()).not.toContain("guest_confirmed");
  });

  it("is sent in the guest's language with the booking details and arrival times", async () => {
    await confirmedStay({}, { notifyGuest: true });
    const { handlers, guestEmail } = sentBy();
    await deliverDueOutbox(db, handlers, NOW);
    const [to, subject, text] = guestEmail.mock.calls[0];
    expect(to).toBe("hans@example.com");
    expect(subject).toMatch(/^Deine Buchung ist bestätigt — TRY-/);
    expect(text).toContain("2 Erwachsene, 1 Kind");
    expect(text).toContain("Ambar-1");
    expect(text).toContain("Abreise bis 12:00 Uhr");
  });
});

describe("pre-arrival email", () => {
  it("is queued two days before check-in for confirmed stays with an email", async () => {
    await confirmedStay(); // check-in 3 Oct = today + 2
    expect(await queueGuestJourneyEmails(db, { enabled: true, now: NOW })).toEqual({
      prearrival: 1,
      review: 0,
    });
  });

  it("is queued only once however often the job runs", async () => {
    await confirmedStay();
    await queueGuestJourneyEmails(db, { enabled: true, now: NOW });
    await queueGuestJourneyEmails(db, {
      enabled: true,
      now: new Date(NOW.getTime() + 15 * 60_000),
    });
    expect((await kinds()).filter((k) => k === "guest_prearrival")).toHaveLength(1);
  });

  it("skips pending requests, missing emails and stays further ahead", async () => {
    await createReservation(db, base, { now: new Date(NOW.getTime() - 10 * DAY) }); // pending
    await confirmedStay({ unit: "ambar-2", email: "" });
    await confirmedStay({ unit: "ambar-3", checkin: "2026-10-04", checkout: "2026-10-06" });
    expect((await queueGuestJourneyEmails(db, { enabled: true, now: NOW })).prearrival).toBe(0);
  });

  it("skips stays confirmed just before arrival: the confirmation already has the details", async () => {
    await confirmedStay({}, { confirmedDaysAgo: 0 }); // confirmed today, arriving in two days
    expect((await queueGuestJourneyEmails(db, { enabled: true, now: NOW })).prearrival).toBe(0);
  });

  it("never runs at night or when guest emails are off", async () => {
    await confirmedStay();
    expect(await queueGuestJourneyEmails(db, { enabled: true, now: NIGHT })).toEqual({
      prearrival: 0,
      review: 0,
    });
    expect(await queueGuestJourneyEmails(db, { enabled: false, now: NOW })).toEqual({
      prearrival: 0,
      review: 0,
    });
  });

  it("is not sent if the booking was cancelled after it was queued", async () => {
    const r = await confirmedStay();
    await queueGuestJourneyEmails(db, { enabled: true, now: NOW });
    await cancelReservation(db, r.id, "u1", { now: NOW });
    const { handlers, guestEmail } = sentBy();
    await deliverDueOutbox(db, handlers, NOW);
    const [message] = await db.select().from(outbox).where(eq(outbox.kind, "guest_prearrival"));
    expect(message.status).toBe("sent"); // done, nothing left to retry
    expect(guestEmail).not.toHaveBeenCalled();
  });
});

describe("review request", () => {
  const stayed = { checkin: "2026-09-27", checkout: "2026-09-30" }; // left yesterday

  it("is queued the day after check-out only for guests who opted in", async () => {
    await confirmedStay({ ...stayed, reviewConsent: true }, { confirmedDaysAgo: 20 });
    await confirmedStay({ ...stayed, unit: "ambar-2" }, { confirmedDaysAgo: 20 });
    expect((await queueGuestJourneyEmails(db, { enabled: true, now: NOW })).review).toBe(1);
  });

  it("is not queued once the window after check-out has passed", async () => {
    await confirmedStay(
      { checkin: "2026-09-20", checkout: "2026-09-25", reviewConsent: true },
      { confirmedDaysAgo: 20 },
    );
    expect((await queueGuestJourneyEmails(db, { enabled: true, now: NOW })).review).toBe(0);
  });

  it("consent without an email address is not stored", async () => {
    const r = await confirmedStay(
      { ...stayed, email: "", reviewConsent: true },
      { confirmedDaysAgo: 20 },
    );
    const [row] = await db.select().from(reservations).where(eq(reservations.id, r.id));
    expect(row.reviewConsentAt).toBeNull();
  });

  it("links to the review short link in the guest's language and says why it was sent", () => {
    const email = buildGuestEmail("review", {
      guestName: "Anna",
      reference: "TRY-AAAAA",
      checkIn: "2026-09-27",
      checkOut: "2026-09-30",
      unitName: "Ambar-1",
      adults: 2,
      children: 0,
      locale: "de",
    });
    expect(email.text).toContain("https://trysacamping.com/bewertung");
    expect(email.text).toContain("weil du im Buchungsformular zugestimmt hast");
    expect(email.html).toContain('href="https://trysacamping.com/bewertung"');
  });
});
