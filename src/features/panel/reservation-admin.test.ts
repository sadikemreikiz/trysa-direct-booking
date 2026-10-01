import type { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { reservations, user } from "@/db/schema";
import { createTestDb, resetTestDb } from "@/db/test-db";
import { createReservation, type ReservationRequest } from "@/features/booking/reservations";
import {
  addReservationNote,
  availabilityForRange,
  cancelReservation,
  canTransition,
  confirmedDaysByUnit,
  confirmedStaysForUnit,
  confirmReservation,
  createManualReservation,
  declineReservation,
  getReservationDetail,
  listPanelReservations,
  ManualReservationError,
  mergeLockedDays,
  TransitionError,
} from "./reservation-admin";
import { AuthorizationError, createStaffForNewUser, decideAccess, getStaffMember } from "./staff";

const NOW = new Date("2026-10-01T09:00:00Z");

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
});

async function makeUser(id: string, email: string, name = id) {
  await db.insert(user).values({ id, email, name });
  return id;
}

async function request(patch: Partial<ReservationRequest> = {}) {
  const { reservation } = await createReservation(db, { ...base, ...patch }, { now: NOW });
  return reservation;
}

describe("state machine", () => {
  it("allowed transitions", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("pending", "declined")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
    expect(canTransition("declined", "confirmed")).toBe(false);
    expect(canTransition("cancelled", "confirmed")).toBe(false);
    expect(canTransition("confirmed", "declined")).toBe(false);
  });

  it("confirms and records who did it in the audit log", async () => {
    const owner = await makeUser("u-owner", "owner@example.com", "Owner");
    const r = await request();

    await confirmReservation(db, r.id, owner, 1, { note: "Telefonda konuştuk", now: NOW });

    const detail = await getReservationDetail(db, r.id);
    expect(detail?.r.status).toBe("confirmed");
    expect(detail?.events[0]).toMatchObject({
      type: "status_changed",
      fromStatus: "pending",
      toStatus: "confirmed",
      actorName: "Owner",
      note: "Telefonda konuştuk",
    });
    expect(detail?.events.at(-1)?.actorName).toBe("Misafir");
  });

  it("a unit is assigned when confirming a 'not sure' request; confirming without a unit is rejected", async () => {
    const u = await makeUser("u1", "a@example.com");
    const r = await request({ unit: "" });
    await expect(
      confirmReservation(db, r.id, u, undefined as unknown as number),
    ).rejects.toMatchObject({ code: "unit_required" });
    const updated = await confirmReservation(db, r.id, u, 4);
    expect(updated.unitId).toBe(4);
  });

  it("a second overlapping confirmation for the same room fails with 'conflict'", async () => {
    const u = await makeUser("u1", "a@example.com");
    const first = await request();
    const second = await request({ checkin: "2026-11-12", checkout: "2026-11-14" });
    await confirmReservation(db, first.id, u, 1);
    await expect(confirmReservation(db, second.id, u, 1)).rejects.toMatchObject({
      code: "conflict",
    });

    const [still] = await db.select().from(reservations).where(eq(reservations.id, second.id));
    expect(still.status).toBe("pending");
  });

  it("a declined request cannot be confirmed later", async () => {
    const u = await makeUser("u1", "a@example.com");
    const r = await request();
    await declineReservation(db, r.id, u, { note: "Dolu" });
    await expect(confirmReservation(db, r.id, u, 1)).rejects.toMatchObject({
      code: "invalid_transition",
    });
  });

  it("if two people act at the same time, the second one fails", async () => {
    const dayi = await makeUser("u-dayi", "d@example.com");
    const emre = await makeUser("u-emre", "e@example.com");
    const r = await request();
    const results = await Promise.allSettled([
      confirmReservation(db, r.id, dayi, 1),
      declineReservation(db, r.id, emre),
    ]);
    expect(results.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((x) => x.status === "rejected") as PromiseRejectedResult;
    expect(failed.reason).toBeInstanceOf(TransitionError);
  });

  it("cancelling a confirmed booking frees the room again", async () => {
    const u = await makeUser("u1", "a@example.com");
    const r = await request();
    await confirmReservation(db, r.id, u, 1);
    await cancelReservation(db, r.id, u, { note: "Misafir vazgeçti" });
    const avail = await availabilityForRange(db, "2026-11-10", "2026-11-13", {});
    expect(avail.find((a) => a.slug === "ambar-1")?.free).toBe(true);
  });

  it("bilinmeyen rezervasyon 'not_found' verir", async () => {
    const u = await makeUser("u1", "a@example.com");
    await expect(
      confirmReservation(db, "00000000-0000-0000-0000-000000000000", u, 1),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("not ekler", async () => {
    const u = await makeUser("u1", "a@example.com", "Emre");
    const r = await request();
    await addReservationNote(db, r.id, u, "  Misafir geç gelecek  ");
    const detail = await getReservationDetail(db, r.id);
    expect(detail?.events[0]).toMatchObject({
      type: "note_added",
      note: "Misafir geç gelecek",
      actorName: "Emre",
    });
  });
});

describe("availability", () => {
  it("takes confirmed bookings and Airbnb occupancy into account together", async () => {
    const u = await makeUser("u1", "a@example.com");
    const r = await request();
    await confirmReservation(db, r.id, u, 1);

    const avail = await availabilityForRange(db, "2026-11-11", "2026-11-15", {
      "Ambar-2": ["2026-11-14"],
      "Ambar-3": ["2026-11-15"], // checkout day, not a conflict
    });
    const bySlug = Object.fromEntries(avail.map((a) => [a.slug, a]));
    expect(bySlug["ambar-1"]).toMatchObject({ free: false, reason: "confirmed" });
    expect(bySlug["ambar-2"]).toMatchObject({ free: false, reason: "airbnb" });
    expect(bySlug["ambar-3"].free).toBe(true);
    expect(bySlug["kamp"].free).toBe(true);
    expect(avail).toHaveLength(7);
  });

  it("on the detail screen the request itself doesn't count as a conflict", async () => {
    const u = await makeUser("u1", "a@example.com");
    const r = await request();
    await confirmReservation(db, r.id, u, 1);
    const avail = await availabilityForRange(db, r.checkIn, r.checkOut, {}, r.id);
    expect(avail.find((a) => a.slug === "ambar-1")?.free).toBe(true);
  });

  it("list: pending oldest first, confirmed by check-in date", async () => {
    const u = await makeUser("u1", "a@example.com");
    const older = await request({ name: "Eski" });
    const newer = await createReservation(
      db,
      { ...base, name: "Yeni", unit: "ambar-2" },
      { now: new Date(NOW.getTime() + 60_000) },
    );
    const past = await request({ unit: "ambar-3", checkin: "2026-10-02", checkout: "2026-10-03" });
    await confirmReservation(db, past.id, u, 3);

    const list = await listPanelReservations(db, "2026-10-05");
    expect(list.pending.map((x) => x.r.guestName)).toEqual(["Eski", "Yeni"]);
    expect(list.pending[0].r.id).toBe(older.id);
    expect(newer.reservation.id).toBe(list.pending[1].r.id);
    expect(list.upcoming).toHaveLength(0); // a booking whose checkout has passed is not listed
  });

  it("gives the Airbnb calendar only confirmed, upcoming bookings", async () => {
    const u = await makeUser("u1", "a@example.com");
    const a = await request();
    const b = await request({ checkin: "2026-12-01", checkout: "2026-12-03" });
    await request({ checkin: "2026-12-10", checkout: "2026-12-12" }); // pending, not included
    await confirmReservation(db, a.id, u, 1);
    await confirmReservation(db, b.id, u, 1);
    const stays = await confirmedStaysForUnit(db, "ambar-1", "2026-11-20");
    expect(stays.map((s) => s.checkIn)).toEqual(["2026-12-01"]);
  });

  it("gives the guest form confirmed days by unit name (excluding checkout day and camping)", async () => {
    const u = await makeUser("u1", "a@example.com");
    const a = await request({ checkin: "2026-11-10", checkout: "2026-11-12" });
    const b = await request({ unit: "kulube-1", checkin: "2026-11-11", checkout: "2026-11-12" });
    const kamp = await request({ unit: "kamp" });
    await request({ unit: "ambar-2" }); // pending, not included
    await confirmReservation(db, a.id, u, 1);
    await confirmReservation(db, b.id, u, 4);
    await confirmReservation(db, kamp.id, u, 7);

    expect(await confirmedDaysByUnit(db, "2026-11-11")).toEqual({
      "Ambar-1": ["2026-11-11"], // the 10th is in the past, the 12th is the checkout day
      "Kulübe-1": ["2026-11-11"],
    });
  });

  it("merges Airbnb and site occupancy", () => {
    expect(
      mergeLockedDays(
        { "Ambar-1": ["2026-11-12", "2026-11-10"], "Ambar-2": [] },
        { "Ambar-1": ["2026-11-10", "2026-11-11"], "Kulübe-1": ["2026-11-11"] },
      ),
    ).toEqual({
      "Ambar-1": ["2026-11-10", "2026-11-11", "2026-11-12"],
      "Ambar-2": [],
      "Kulübe-1": ["2026-11-11"],
    });
  });
});

describe("manual bookings", () => {
  const manual = {
    unitId: 2,
    checkIn: "2026-11-10",
    checkOut: "2026-11-12",
    adults: 2,
    children: 1,
    guestName: "Mehmet (telefon)",
    phone: "",
    note: "Kapora alındı",
    source: "phone" as const,
  };

  it("saves directly as confirmed, keeping the source and who added it", async () => {
    const u = await makeUser("u1", "a@example.com");
    const r = await createManualReservation(db, u, manual, { now: NOW });
    expect(r).toMatchObject({
      status: "confirmed",
      source: "phone",
      unitId: 2,
      phone: "",
      note: "Kapora alındı",
    });
    expect(r.reference).toMatch(/^TRY-/);

    const detail = await getReservationDetail(db, r.id);
    expect(detail?.events).toHaveLength(1);
    expect(detail?.events[0]).toMatchObject({
      type: "created",
      toStatus: "confirmed",
      actor: "user:u1",
    });

    // Also shows up in the Airbnb calendar and the guest form
    expect(await confirmedStaysForUnit(db, "ambar-2", "2026-11-01")).toHaveLength(1);
  });

  it("blocks an overlapping confirmed booking for the same room", async () => {
    const u = await makeUser("u1", "a@example.com");
    const site = await request({ unit: "ambar-2", checkin: "2026-11-11", checkout: "2026-11-14" });
    await confirmReservation(db, site.id, u, 2);

    await expect(createManualReservation(db, u, manual, { now: NOW })).rejects.toMatchObject({
      code: "conflict",
    });
    // A different room is fine
    await expect(
      createManualReservation(db, u, { ...manual, unitId: 3 }, { now: NOW }),
    ).resolves.toBeTruthy();
  });

  it("rejects missing/invalid data", async () => {
    const u = await makeUser("u1", "a@example.com");
    for (const bad of [
      { ...manual, guestName: "  " },
      { ...manual, checkOut: "2026-11-10" },
      { ...manual, adults: 0 },
    ]) {
      await expect(createManualReservation(db, u, bad, { now: NOW })).rejects.toBeInstanceOf(
        ManualReservationError,
      );
    }
    await expect(
      createManualReservation(db, u, { ...manual, unitId: 99 }, { now: NOW }),
    ).rejects.toMatchObject({
      code: "unit_unknown",
    });
    // No past dates (Airbnb doesn't share past days, so conflicts can't be checked); today is fine
    await expect(
      createManualReservation(
        db,
        u,
        { ...manual, checkIn: "2026-09-28", checkOut: "2026-09-30" },
        { now: NOW },
      ),
    ).rejects.toMatchObject({ code: "in_past" });
    await expect(
      createManualReservation(
        db,
        u,
        { ...manual, checkIn: "2026-10-01", checkOut: "2026-10-02" },
        { now: NOW },
      ),
    ).resolves.toBeTruthy();
  });
});

describe("panel authorization", () => {
  it("an email on the admin list starts as an approved admin, everyone else as an access request", async () => {
    await makeUser("u-emre", "Emre@Example.com");
    await makeUser("u-dayi", "dayi@example.com");
    await createStaffForNewUser(db, { id: "u-emre", email: "Emre@Example.com" }, [
      "emre@example.com",
    ]);
    await createStaffForNewUser(db, { id: "u-dayi", email: "dayi@example.com" }, [
      "emre@example.com",
    ]);

    expect(await getStaffMember(db, "u-emre")).toMatchObject({ role: "admin", status: "approved" });
    expect(await getStaffMember(db, "u-dayi")).toMatchObject({ role: "staff", status: "pending" });
  });

  it("an admin approves access requests; unapproved users can't decide; nobody can change their own role", async () => {
    await makeUser("u-emre", "e@example.com");
    await makeUser("u-dayi", "d@example.com");
    await makeUser("u-yabanci", "x@example.com");
    for (const [id, email] of [
      ["u-emre", "e@example.com"],
      ["u-dayi", "d@example.com"],
      ["u-yabanci", "x@example.com"],
    ]) {
      await createStaffForNewUser(db, { id, email }, ["e@example.com"]);
    }
    const emre = (await getStaffMember(db, "u-emre"))!;
    const dayi = (await getStaffMember(db, "u-dayi"))!;

    await expect(decideAccess(db, dayi, "u-yabanci", { status: "approved" })).rejects.toThrow(
      AuthorizationError,
    );
    await expect(decideAccess(db, emre, "u-emre", { status: "revoked" })).rejects.toThrow(
      AuthorizationError,
    );

    await decideAccess(db, emre, "u-dayi", { status: "approved", role: "staff" });
    await decideAccess(db, emre, "u-yabanci", { status: "revoked" });
    expect(await getStaffMember(db, "u-dayi")).toMatchObject({ status: "approved", role: "staff" });
    expect(await getStaffMember(db, "u-yabanci")).toMatchObject({ status: "revoked" });
  });
});
