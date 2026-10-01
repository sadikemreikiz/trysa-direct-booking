import type { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { analyticsEvents, reservationEvents, reservations, user } from "@/db/schema";
import { createTestDb, resetTestDb } from "@/db/test-db";
import { createReservation, type ReservationRequest } from "@/features/booking/reservations";
import {
  confirmReservation,
  createManualReservation,
  declineReservation,
} from "./reservation-admin";
import { getStats } from "./stats";

const NOW = new Date("2026-11-20T10:00:00Z");

const base: ReservationRequest = {
  checkin: "2026-11-10",
  checkout: "2026-11-13",
  adults: "2",
  children: "0",
  unit: "ambar-1",
  name: "Ayşe",
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
  await db.insert(user).values({ id: "u1", email: "e@example.com", name: "Emre" });
});

/** Saves a request as if it arrived at a given moment. */
async function request(createdAt: string, patch: Partial<ReservationRequest> = {}) {
  const { reservation } = await createReservation(
    db,
    { ...base, ...patch },
    { now: new Date("2026-09-01T00:00:00Z") },
  );
  await db
    .update(reservations)
    .set({ createdAt: new Date(createdAt) })
    .where(eq(reservations.id, reservation.id));
  return reservation;
}

describe("panel statistics", () => {
  it("returns the last 6 months in order, including empty months", async () => {
    const stats = await getStats(db, NOW);
    expect(stats.months.map((m) => m.month)).toEqual([
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
      "2026-11",
    ]);
    expect(stats.medianResponseMinutes).toBeNull();
  });

  it("spreads requests, confirmations, nights and clicks across months", async () => {
    const a = await request("2026-10-05T09:00:00Z");
    const b = await request("2026-10-20T09:00:00Z", { unit: "ambar-2" });
    await request("2026-11-02T09:00:00Z", { unit: "ambar-3" }); // unanswered
    await confirmReservation(db, a.id, "u1", 1, { now: new Date("2026-10-05T09:30:00Z") }); // 30 min
    await declineReservation(db, b.id, "u1", { now: new Date("2026-10-20T11:00:00Z") }); // 120 min
    await createManualReservation(
      db,
      "u1",
      {
        unitId: 4,
        checkIn: "2026-11-15",
        checkOut: "2026-11-17",
        adults: 2,
        children: 0,
        guestName: "Telefon misafiri",
        phone: "",
        note: "",
        source: "phone",
      },
      { now: new Date("2026-10-01T00:00:00Z") },
    );
    await db.insert(analyticsEvents).values([
      { name: "whatsapp_click", path: "/tr", createdAt: new Date("2026-10-01T10:00:00Z") },
      { name: "whatsapp_click", path: "/tr", createdAt: new Date("2026-10-02T10:00:00Z") },
      { name: "phone_click", path: "/tr", createdAt: new Date("2026-11-01T10:00:00Z") },
    ]);

    const stats = await getStats(db, NOW);
    const oct = stats.months.find((m) => m.month === "2026-10");
    const nov = stats.months.find((m) => m.month === "2026-11");
    expect(oct).toMatchObject({ requests: 2, confirmed: 1, whatsappClicks: 2, phoneClicks: 0 });
    // November: 1 site request (unanswered); nights by check-in month: site 3 nights + phone 2 nights
    expect(nov).toMatchObject({ requests: 1, confirmed: 0, nights: 5, phoneClicks: 1 });
    expect(stats.bySource).toEqual({ website: 1, phone: 1 });
    // Median of (30, 120) = 75 min; manual and unanswered requests don't count
    expect(stats.medianResponseMinutes).toBe(75);
    expect(stats.respondedCount).toBe(2);
    // NOW = 20 Nov: the stays starting 10 Nov and 15 Nov are in the past; nothing upcoming
    expect(stats.upcomingNights).toBe(0);
    expect((await getStats(db, new Date("2026-11-01T10:00:00Z"))).upcomingNights).toBe(5);
  });

  it("uses Istanbul time for month boundaries", async () => {
    // UTC 31 Oct 22:30 = Istanbul 1 Nov 01:30
    const r = await request("2026-10-31T22:30:00Z");
    await db.delete(reservationEvents).where(eq(reservationEvents.reservationId, r.id));
    const stats = await getStats(db, NOW);
    expect(stats.months.find((m) => m.month === "2026-11")?.requests).toBe(1);
    expect(stats.months.find((m) => m.month === "2026-10")?.requests).toBe(0);
  });
});
