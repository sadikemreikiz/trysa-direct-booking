import type { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { analyticsEvents, outbox, reservationEvents, reservations } from "@/db/schema";
import { createTestDb, resetTestDb } from "@/db/test-db";
import {
  createReservation,
  ReservationValidationError,
  type ReservationRequest,
} from "./reservations";

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

/** Extracts the constraint violation message (Drizzle may wrap the error). */
async function dbError(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    const err = e as { message?: string; cause?: { message?: string } };
    return `${err.message ?? ""} ${err.cause?.message ?? ""}`;
  }
  throw new Error("Expected an error but the operation succeeded");
}

async function insertReservation(
  unitId: number | null,
  checkIn: string,
  checkOut: string,
  status: "pending" | "confirmed" = "confirmed",
) {
  return db.insert(reservations).values({
    reference: `TRY-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    unitId,
    checkIn,
    checkOut,
    adults: 2,
    guestName: "Test",
    phone: "0000000",
    locale: "tr",
    status,
    consentAt: NOW,
  });
}

describe("createReservation", () => {
  it("writes the booking, audit event, outbox and analytics event in one go", async () => {
    const { reservation, outboxId } = await createReservation(db, valid, { now: NOW });

    expect(reservation.reference).toMatch(/^TRY-[2-9A-HJ-NP-Z]{5}$/);
    expect(reservation.status).toBe("pending");
    expect(reservation.unitId).toBe(1);

    const events = await db.select().from(reservationEvents);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "created", toStatus: "pending", actor: "guest" });

    const [message] = await db.select().from(outbox).where(eq(outbox.id, outboxId));
    expect(message).toMatchObject({
      status: "pending",
      payload: { reservationId: reservation.id },
    });

    const tracked = await db.select().from(analyticsEvents);
    expect(tracked.map((e) => e.name)).toEqual(["reservation_submitted"]);
  });

  it("saves without a unit when 'not sure' is chosen", async () => {
    const { reservation } = await createReservation(db, { ...valid, unit: "" }, { now: NOW });
    expect(reservation.unitId).toBeNull();
  });

  it.each([
    ["çıkış girişten önce", { checkout: "2026-11-09" }],
    ["aynı gün giriş-çıkış", { checkout: "2026-11-10" }],
    ["60 geceden uzun", { checkout: "2027-02-01" }],
    ["KVKK onayı yok", { consent: false as unknown as true }],
    ["geçersiz e-posta", { email: "not-an-email" }],
    ["boş ad", { name: "   " }],
  ])("geçersiz talebi reddeder: %s", async (_label, patch) => {
    await expect(createReservation(db, { ...valid, ...patch }, { now: NOW })).rejects.toThrow(
      ReservationValidationError,
    );
    expect(await db.select().from(reservations)).toHaveLength(0);
  });

  it("rejects a check-in in the past (in the business's time zone)", async () => {
    await expect(
      createReservation(
        db,
        { ...valid, checkin: "2026-09-30", checkout: "2026-10-02" },
        { now: NOW },
      ),
    ).rejects.toThrow(/checkin:in_past/);
  });

  it("rejects an unknown unit and writes nothing", async () => {
    await expect(
      createReservation(db, { ...valid, unit: "villa-99" }, { now: NOW }),
    ).rejects.toThrow(/unit:unknown/);
    expect(await db.select().from(reservations)).toHaveLength(0);
  });

  it("if a step inside the transaction fails, the booking is rolled back too", async () => {
    await client.exec(`
      CREATE FUNCTION fail_outbox() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'outbox yazılamadı'; END; $$ LANGUAGE plpgsql;
      CREATE TRIGGER fail_outbox BEFORE INSERT ON outbox FOR EACH ROW EXECUTE FUNCTION fail_outbox();
    `);
    try {
      await expect(createReservation(db, valid, { now: NOW })).rejects.toThrow();
      expect(await db.select().from(reservations)).toHaveLength(0);
      expect(await db.select().from(reservationEvents)).toHaveLength(0);
    } finally {
      await client.exec("DROP TRIGGER fail_outbox ON outbox; DROP FUNCTION fail_outbox();");
    }
  });
});

describe("double-booking protection (database constraint)", () => {
  it("does not allow two overlapping CONFIRMED bookings in the same room", async () => {
    await insertReservation(1, "2026-11-10", "2026-11-13");
    const msg = await dbError(insertReservation(1, "2026-11-12", "2026-11-15"));
    expect(msg).toMatch(/reservations_no_overlap_confirmed/);
  });

  it("a checkout day can be the next guest's check-in day", async () => {
    await insertReservation(1, "2026-11-10", "2026-11-13");
    await expect(insertReservation(1, "2026-11-13", "2026-11-15")).resolves.toBeDefined();
  });

  it("pending requests may overlap: the family chooses which one to confirm", async () => {
    await insertReservation(1, "2026-11-10", "2026-11-13", "pending");
    await expect(
      insertReservation(1, "2026-11-11", "2026-11-12", "pending"),
    ).resolves.toBeDefined();
  });

  it("a pending request cannot be confirmed while an overlapping confirmed one exists", async () => {
    await insertReservation(1, "2026-11-10", "2026-11-13");
    await insertReservation(1, "2026-11-11", "2026-11-12", "pending");
    const msg = await dbError(
      db
        .update(reservations)
        .set({ status: "confirmed" })
        .where(eq(reservations.status, "pending")),
    );
    expect(msg).toMatch(/reservations_no_overlap_confirmed/);
  });

  it("different rooms and the shared camping area may overlap", async () => {
    await insertReservation(1, "2026-11-10", "2026-11-13");
    await expect(insertReservation(2, "2026-11-10", "2026-11-13")).resolves.toBeDefined();
    await insertReservation(7, "2026-11-10", "2026-11-13");
    await expect(insertReservation(7, "2026-11-10", "2026-11-13")).resolves.toBeDefined();
  });

  it("a booking without a unit cannot be confirmed", async () => {
    const msg = await dbError(insertReservation(null, "2026-11-10", "2026-11-13", "confirmed"));
    expect(msg).toMatch(/reservations_confirmed_has_unit/);
  });

  it("checkout cannot be before check-in (even if the app is bypassed)", async () => {
    const msg = await dbError(insertReservation(1, "2026-11-13", "2026-11-10", "pending"));
    expect(msg).toMatch(/reservations_dates_order/);
  });
});
