import type { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PushMessage } from "@/lib/push";
import type { Db } from "./index";
import { anonymizeExpiredReservations, escalateStalePending } from "./maintenance";
import { addReservationNote, confirmReservation } from "./panel";
import { createReservation, type ReservationRequest } from "./reservations";
import { reservationEvents, reservations, user } from "./schema";
import { createTestDb, resetTestDb } from "./test-db";

const base: ReservationRequest = {
  checkin: "2026-11-10",
  checkout: "2026-11-13",
  adults: "2",
  children: "0",
  unit: "ambar-1",
  name: "Ayşe",
  phone: "0555 111 22 33",
  email: "ayse@example.com",
  note: "Geç gireceğiz",
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

async function requestAt(createdAt: Date, patch: Partial<ReservationRequest> = {}) {
  const { reservation } = await createReservation(db, { ...base, ...patch }, { now: new Date("2026-10-01T00:00:00Z") });
  await db.update(reservations).set({ createdAt }).where(eq(reservations.id, reservation.id));
  return reservation;
}

function fakePush(ok = true) {
  const sent: PushMessage[] = [];
  const push = async (m: PushMessage) => {
    sent.push(m);
    return ok ? ({ ok: true } as const) : ({ ok: false, error: "ağ hatası" } as const);
  };
  return { sent, push };
}

describe("cevapsız talep hatırlatması", () => {
  const now = new Date("2026-10-01T12:00:00Z");

  it("3 saati geçen bekleyen talep için bir kez hatırlatır", async () => {
    const old = await requestAt(new Date("2026-10-01T08:00:00Z"), { name: "Eski" });
    await requestAt(new Date("2026-10-01T11:00:00Z"), { name: "Yeni" });
    const { sent, push } = fakePush();

    expect(await escalateStalePending(db, push, now)).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toContain("Eski");
    expect(sent[0].url).toBe(`/panel/talep/${old.id}`);

    // Tekrar çalışınca aynı talep için ikinci bildirim yok
    expect(await escalateStalePending(db, push, now)).toBe(0);
    expect(sent).toHaveLength(1);
  });

  it("birden çok talebi tek bildirimde toplar; işlenmiş talepleri atlar", async () => {
    await db.insert(user).values({ id: "u1", email: "e@example.com", name: "Emre" });
    await requestAt(new Date("2026-10-01T07:00:00Z"));
    await requestAt(new Date("2026-10-01T08:00:00Z"), { unit: "ambar-2" });
    const handled = await requestAt(new Date("2026-10-01T06:00:00Z"), { unit: "ambar-3" });
    await confirmReservation(db, handled.id, "u1", 3);
    const { sent, push } = fakePush();

    expect(await escalateStalePending(db, push, now)).toBe(2);
    expect(sent[0].title).toContain("2 talep");
    expect(sent[0].url).toBe("/panel");
  });

  it("bildirim gitmezse işaretlemez, sonra tekrar dener", async () => {
    await requestAt(new Date("2026-10-01T08:00:00Z"));
    expect(await escalateStalePending(db, fakePush(false).push, now)).toBe(0);
    const { sent, push } = fakePush();
    expect(await escalateStalePending(db, push, now)).toBe(1);
    expect(sent).toHaveLength(1);
  });
});

describe("saklama süresi (2 yıl)", () => {
  it("konaklamadan 2 yıl sonra kişisel verileri siler, istatistik verisi kalır", async () => {
    const old = await requestAt(new Date("2026-10-01T00:00:00Z"));
    const recent = await requestAt(new Date("2026-10-01T00:00:00Z"), { checkin: "2027-06-01", checkout: "2027-06-03" });
    await db.insert(user).values({ id: "u1", email: "e@example.com", name: "Emre" });
    await addReservationNote(db, old.id, "u1", "Misafirin telefonu değişti: 0555 999");

    // Çıkış 2026-11-13 → 2028-11-13'ten sonra silinir
    expect(await anonymizeExpiredReservations(db, new Date("2028-11-12T00:00:00Z"))).toBe(0);
    expect(await anonymizeExpiredReservations(db, new Date("2028-11-15T00:00:00Z"))).toBe(1);

    const [a] = await db.select().from(reservations).where(eq(reservations.id, old.id));
    expect(a).toMatchObject({ guestName: "(silindi)", phone: "(silindi)", email: null, note: null });
    expect(a.anonymizedAt).not.toBeNull();
    expect(a).toMatchObject({ checkIn: "2026-11-10", adults: 2, status: "pending" });

    const notes = await db
      .select({ note: reservationEvents.note })
      .from(reservationEvents)
      .where(eq(reservationEvents.reservationId, old.id));
    expect(notes.every((n) => n.note === null)).toBe(true);

    const [b] = await db.select().from(reservations).where(eq(reservations.id, recent.id));
    expect(b.guestName).toBe("Ayşe");

    // İkinci çalıştırma bir şey değiştirmez
    expect(await anonymizeExpiredReservations(db, new Date("2028-11-15T00:00:00Z"))).toBe(0);
  });
});
