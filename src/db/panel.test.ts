import type { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "./index";
import {
  addReservationNote,
  availabilityForRange,
  cancelReservation,
  canTransition,
  confirmedStaysForUnit,
  confirmReservation,
  declineReservation,
  getReservationDetail,
  listPanelReservations,
  TransitionError,
} from "./panel";
import { createReservation, type ReservationRequest } from "./reservations";
import { reservations, user } from "./schema";
import { AuthorizationError, createStaffForNewUser, decideAccess, getStaffMember } from "./staff";
import { createTestDb, resetTestDb } from "./test-db";

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

describe("durum makinesi", () => {
  it("izin verilen geçişler", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("pending", "declined")).toBe(true);
    expect(canTransition("confirmed", "cancelled")).toBe(true);
    expect(canTransition("declined", "confirmed")).toBe(false);
    expect(canTransition("cancelled", "confirmed")).toBe(false);
    expect(canTransition("confirmed", "declined")).toBe(false);
  });

  it("onaylar, denetim kaydına kimin yaptığını yazar", async () => {
    const dayi = await makeUser("u-dayi", "dayi@example.com", "Dayı");
    const r = await request();

    await confirmReservation(db, r.id, dayi, 1, { note: "Telefonda konuştuk", now: NOW });

    const detail = await getReservationDetail(db, r.id);
    expect(detail?.r.status).toBe("confirmed");
    expect(detail?.events[0]).toMatchObject({
      type: "status_changed",
      fromStatus: "pending",
      toStatus: "confirmed",
      actorName: "Dayı",
      note: "Telefonda konuştuk",
    });
    expect(detail?.events.at(-1)?.actorName).toBe("Misafir");
  });

  it("'emin değilim' talebini onaylarken ünite atanır; ünitesiz onay reddedilir", async () => {
    const u = await makeUser("u1", "a@example.com");
    const r = await request({ unit: "" });
    await expect(
      confirmReservation(db, r.id, u, undefined as unknown as number),
    ).rejects.toMatchObject({ code: "unit_required" });
    const updated = await confirmReservation(db, r.id, u, 4);
    expect(updated.unitId).toBe(4);
  });

  it("aynı odaya çakışan ikinci onay 'conflict' hatası verir", async () => {
    const u = await makeUser("u1", "a@example.com");
    const first = await request();
    const second = await request({ checkin: "2026-11-12", checkout: "2026-11-14" });
    await confirmReservation(db, first.id, u, 1);
    await expect(confirmReservation(db, second.id, u, 1)).rejects.toMatchObject({ code: "conflict" });

    const [still] = await db.select().from(reservations).where(eq(reservations.id, second.id));
    expect(still.status).toBe("pending");
  });

  it("reddedilmiş talep sonradan onaylanamaz", async () => {
    const u = await makeUser("u1", "a@example.com");
    const r = await request();
    await declineReservation(db, r.id, u, { note: "Dolu" });
    await expect(confirmReservation(db, r.id, u, 1)).rejects.toMatchObject({
      code: "invalid_transition",
    });
  });

  it("iki kişi aynı anda işlem yaparsa ikincisi başarısız olur", async () => {
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

  it("onaylı rezervasyon iptal edilince oda tekrar boşa çıkar", async () => {
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
    expect(detail?.events[0]).toMatchObject({ type: "note_added", note: "Misafir geç gelecek", actorName: "Emre" });
  });
});

describe("müsaitlik", () => {
  it("onaylı rezervasyonları ve Airbnb doluluğunu birlikte hesaba katar", async () => {
    const u = await makeUser("u1", "a@example.com");
    const r = await request();
    await confirmReservation(db, r.id, u, 1);

    const avail = await availabilityForRange(db, "2026-11-11", "2026-11-15", {
      "Ambar-2": ["2026-11-14"],
      "Ambar-3": ["2026-11-15"], // çıkış günü — çakışma sayılmaz
    });
    const bySlug = Object.fromEntries(avail.map((a) => [a.slug, a]));
    expect(bySlug["ambar-1"]).toMatchObject({ free: false, reason: "confirmed" });
    expect(bySlug["ambar-2"]).toMatchObject({ free: false, reason: "airbnb" });
    expect(bySlug["ambar-3"].free).toBe(true);
    expect(bySlug["kamp"].free).toBe(true);
    expect(avail).toHaveLength(7);
  });

  it("detay ekranında talebin kendisi çakışma sayılmaz", async () => {
    const u = await makeUser("u1", "a@example.com");
    const r = await request();
    await confirmReservation(db, r.id, u, 1);
    const avail = await availabilityForRange(db, r.checkIn, r.checkOut, {}, r.id);
    expect(avail.find((a) => a.slug === "ambar-1")?.free).toBe(true);
  });

  it("listede bekleyenler en eski talep önce, onaylılar giriş tarihine göre", async () => {
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
    expect(list.upcoming).toHaveLength(0); // çıkışı geçmiş rezervasyon listede yok
  });

  it("Airbnb takvimi için sadece onaylı ve geçmemiş rezervasyonları verir", async () => {
    const u = await makeUser("u1", "a@example.com");
    const a = await request();
    const b = await request({ checkin: "2026-12-01", checkout: "2026-12-03" });
    await request({ checkin: "2026-12-10", checkout: "2026-12-12" }); // pending — dahil değil
    await confirmReservation(db, a.id, u, 1);
    await confirmReservation(db, b.id, u, 1);
    const stays = await confirmedStaysForUnit(db, "ambar-1", "2026-11-20");
    expect(stays.map((s) => s.checkIn)).toEqual(["2026-12-01"]);
  });
});

describe("panel yetkisi", () => {
  it("yönetici listesindeki e-posta onaylı admin başlar, diğerleri erişim isteği", async () => {
    await makeUser("u-emre", "Emre@Example.com");
    await makeUser("u-dayi", "dayi@example.com");
    await createStaffForNewUser(db, { id: "u-emre", email: "Emre@Example.com" }, ["emre@example.com"]);
    await createStaffForNewUser(db, { id: "u-dayi", email: "dayi@example.com" }, ["emre@example.com"]);

    expect(await getStaffMember(db, "u-emre")).toMatchObject({ role: "admin", status: "approved" });
    expect(await getStaffMember(db, "u-dayi")).toMatchObject({ role: "staff", status: "pending" });
  });

  it("admin erişim isteğini onaylar; onaylanmamış kişi karar veremez; kimse kendini değiştiremez", async () => {
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
