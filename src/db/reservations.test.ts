import type { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "./index";
import {
  backoffMs,
  createReservation,
  deliverDueOutbox,
  deliverOutboxMessage,
  MAX_ATTEMPTS,
  type OutboxHandlers,
  ReservationValidationError,
  type ReservationRequest,
} from "./reservations";
import { analyticsEvents, outbox, reservationEvents, reservations } from "./schema";
import { createTestDb, resetTestDb } from "./test-db";

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

/** Kısıt ihlali mesajını yakalar (Drizzle hatayı sarmalayabilir). */
async function dbError(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    const err = e as { message?: string; cause?: { message?: string } };
    return `${err.message ?? ""} ${err.cause?.message ?? ""}`;
  }
  throw new Error("Hata bekleniyordu ama işlem başarılı oldu");
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
  it("rezervasyon, denetim kaydı, outbox ve ölçüm olayını tek seferde yazar", async () => {
    const { reservation, outboxId } = await createReservation(db, valid, { now: NOW });

    expect(reservation.reference).toMatch(/^TRY-[2-9A-HJ-NP-Z]{5}$/);
    expect(reservation.status).toBe("pending");
    expect(reservation.unitId).toBe(1);

    const events = await db.select().from(reservationEvents);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "created", toStatus: "pending", actor: "guest" });

    const [message] = await db.select().from(outbox).where(eq(outbox.id, outboxId));
    expect(message).toMatchObject({ status: "pending", payload: { reservationId: reservation.id } });

    const tracked = await db.select().from(analyticsEvents);
    expect(tracked.map((e) => e.name)).toEqual(["reservation_submitted"]);
  });

  it("'emin değilim' seçilince ünitesiz kaydeder", async () => {
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

  it("geçmiş tarihli girişi reddeder (işletme saat dilimine göre)", async () => {
    await expect(
      createReservation(db, { ...valid, checkin: "2026-09-30", checkout: "2026-10-02" }, { now: NOW }),
    ).rejects.toThrow(/checkin:in_past/);
  });

  it("bilinmeyen üniteyi reddeder ve hiçbir şey yazmaz", async () => {
    await expect(createReservation(db, { ...valid, unit: "villa-99" }, { now: NOW })).rejects.toThrow(
      /unit:unknown/,
    );
    expect(await db.select().from(reservations)).toHaveLength(0);
  });

  it("transaction içinde bir adım başarısız olursa rezervasyon da geri alınır", async () => {
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

describe("çift rezervasyon koruması (veritabanı kısıtı)", () => {
  it("aynı odada çakışan iki ONAYLI rezervasyona izin vermez", async () => {
    await insertReservation(1, "2026-11-10", "2026-11-13");
    const msg = await dbError(insertReservation(1, "2026-11-12", "2026-11-15"));
    expect(msg).toMatch(/reservations_no_overlap_confirmed/);
  });

  it("çıkış günü yeni misafirin giriş günü olabilir", async () => {
    await insertReservation(1, "2026-11-10", "2026-11-13");
    await expect(insertReservation(1, "2026-11-13", "2026-11-15")).resolves.toBeDefined();
  });

  it("bekleyen talepler çakışabilir — aile hangisini onaylayacağını seçer", async () => {
    await insertReservation(1, "2026-11-10", "2026-11-13", "pending");
    await expect(insertReservation(1, "2026-11-11", "2026-11-12", "pending")).resolves.toBeDefined();
  });

  it("bekleyen talep, çakışan onaylı varken onaylanamaz", async () => {
    await insertReservation(1, "2026-11-10", "2026-11-13");
    await insertReservation(1, "2026-11-11", "2026-11-12", "pending");
    const msg = await dbError(
      db.update(reservations).set({ status: "confirmed" }).where(eq(reservations.status, "pending")),
    );
    expect(msg).toMatch(/reservations_no_overlap_confirmed/);
  });

  it("farklı odalar ve ortak kamp alanı çakışabilir", async () => {
    await insertReservation(1, "2026-11-10", "2026-11-13");
    await expect(insertReservation(2, "2026-11-10", "2026-11-13")).resolves.toBeDefined();
    await insertReservation(7, "2026-11-10", "2026-11-13");
    await expect(insertReservation(7, "2026-11-10", "2026-11-13")).resolves.toBeDefined();
  });

  it("ünitesi olmayan rezervasyon onaylanamaz", async () => {
    const msg = await dbError(insertReservation(null, "2026-11-10", "2026-11-13", "confirmed"));
    expect(msg).toMatch(/reservations_confirmed_has_unit/);
  });

  it("çıkış tarihi girişten önce olamaz (uygulama atlansa bile)", async () => {
    const msg = await dbError(insertReservation(1, "2026-11-13", "2026-11-10", "pending"));
    expect(msg).toMatch(/reservations_dates_order/);
  });
});

/** Sahte gönderim kanalları: e-posta verilen fonksiyonla, bildirim varsayılan olarak başarılı. */
function via(
  email: ReturnType<typeof vi.fn>,
  push = vi.fn().mockResolvedValue({ ok: true }),
  guestEmail = vi.fn().mockResolvedValue({ ok: true }),
) {
  return { email, push, guestEmail } as unknown as OutboxHandlers;
}

describe("outbox teslimi", () => {
  it("başarılı gönderimde mesajı 'sent' yapar ve e-postada referans kodu olur", async () => {
    const { reservation, outboxId } = await createReservation(db, valid, { now: NOW });
    const send = vi.fn().mockResolvedValue({ ok: true });

    expect(await deliverOutboxMessage(db, outboxId, via(send), NOW)).toBe("sent");

    const [subject, text] = send.mock.calls[0];
    expect(subject).toContain(reservation.reference);
    expect(text).toContain("Konaklama: Ambar-1");
    const [row] = await db.select().from(outbox).where(eq(outbox.id, outboxId));
    expect(row).toMatchObject({ status: "sent", attempts: 1, lastError: null });
  });

  it("telefon bildirimi ayrı bir mesaj olarak panel linkiyle gider", async () => {
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

  it("e-posta başarısız olursa sadece e-posta tekrar denenir, bildirim etkilenmez", async () => {
    const { outboxId, pushOutboxId } = await createReservation(db, valid, { now: NOW });
    const failingEmail = vi.fn().mockResolvedValue({ ok: false, error: "Resend 500" });
    const results = await deliverDueOutbox(db, via(failingEmail), NOW);
    expect(results.sort()).toEqual(["retry_scheduled", "sent"]);

    const rows = await db.select().from(outbox);
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(outboxId)?.status).toBe("pending");
    expect(byId.get(pushOutboxId)?.status).toBe("sent");
  });

  it("başarısız gönderimi üstel beklemeyle yeniden planlar", async () => {
    const { outboxId } = await createReservation(db, valid, { now: NOW });
    const send = vi.fn().mockResolvedValue({ ok: false, error: "Resend 500" });

    expect(await deliverOutboxMessage(db, outboxId, via(send), NOW)).toBe("retry_scheduled");

    const [row] = await db.select().from(outbox).where(eq(outbox.id, outboxId));
    expect(row.status).toBe("pending");
    expect(row.lastError).toBe("Resend 500");
    expect(row.nextAttemptAt.getTime()).toBe(NOW.getTime() + backoffMs(1));
  });

  it("zamanı gelmeden tekrar denemez, gelince dener", async () => {
    const { outboxId, pushOutboxId } = await createReservation(db, valid, { now: NOW });
    const ok = vi.fn().mockResolvedValue({ ok: true });
    await deliverOutboxMessage(db, pushOutboxId, via(ok), NOW);
    await deliverOutboxMessage(db, outboxId, via(vi.fn().mockResolvedValue({ ok: false, error: "x" })), NOW);

    expect(await deliverDueOutbox(db, via(ok), new Date(NOW.getTime() + 60_000))).toEqual([]);
    expect(await deliverDueOutbox(db, via(ok), new Date(NOW.getTime() + backoffMs(1)))).toEqual(["sent"]);
  });

  it(`${MAX_ATTEMPTS} denemeden sonra 'failed' olarak bırakır`, async () => {
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
  });

  it("aynı mesaj eşzamanlı iki işleyici tarafından iki kez gönderilmez", async () => {
    const { outboxId } = await createReservation(db, valid, { now: NOW });
    let release!: () => void;
    const slow = vi.fn(
      () => new Promise<{ ok: true }>((r) => (release = () => r({ ok: true }))),
    );
    const first = deliverOutboxMessage(db, outboxId, via(slow), NOW);
    await vi.waitFor(() => expect(slow).toHaveBeenCalled());

    expect(await deliverOutboxMessage(db, outboxId, via(slow), NOW)).toBe("skipped");
    release();
    expect(await first).toBe("sent");
    expect(slow).toHaveBeenCalledTimes(1);
  });
});

describe("misafire talep e-postası", () => {
  it("sadece istenirse ve misafir e-posta verdiyse kuyruğa girer", async () => {
    expect((await createReservation(db, { ...valid, email: "a@example.com" }, { now: NOW })).guestAckOutboxId).toBeNull();
    expect(
      (await createReservation(db, { ...valid, email: "" }, { now: NOW, guestAck: true })).guestAckOutboxId,
    ).toBeNull();
    expect(
      (await createReservation(db, { ...valid, email: "a@example.com" }, { now: NOW, guestAck: true })).guestAckOutboxId,
    ).not.toBeNull();
  });

  it("misafirin dilinde, talep koduyla gönderilir", async () => {
    const { reservation, guestAckOutboxId } = await createReservation(
      db,
      { ...valid, name: "Hans Müller", email: "hans@example.com", locale: "de" },
      { now: NOW, guestAck: true },
    );
    const guestEmail = vi.fn().mockResolvedValue({ ok: true });
    const handlers = via(vi.fn(), undefined, guestEmail);

    expect(await deliverOutboxMessage(db, guestAckOutboxId!, handlers, NOW)).toBe("sent");
    const [to, subject, text] = guestEmail.mock.calls[0];
    expect(to).toBe("hans@example.com");
    expect(subject).toContain(reservation.reference);
    expect(text).toMatch(/^Hallo Hans,/);
    expect(text).toContain("noch keine Bestätigung");
  });
});
