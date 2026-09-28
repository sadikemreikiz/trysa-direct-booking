/**
 * Veritabanı şeması (PostgreSQL / Drizzle ORM).
 *
 * Tasarım ilkeleri:
 * - Veritabanı tek doğruluk kaynağıdır; e-posta sadece bildirimdir (outbox).
 * - Kurallar mümkün olduğunca DB seviyesinde: CHECK kısıtları ve onaylı
 *   rezervasyonlar için çakışma engeli (EXCLUDE USING gist — bkz. migration 0001).
 * - Her durum değişikliği reservation_events tablosuna yazılır (denetim izi).
 * - analytics_events kişisel veri tutmaz (IP / user-agent yok).
 */
import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const unitKind = pgEnum("unit_kind", ["room", "tiny_house", "camp"]);

export const reservationStatus = pgEnum("reservation_status", [
  "pending", // misafir talep etti, aile henüz bakmadı
  "confirmed", // aile onayladı — tarih o ünite için kesinleşti
  "declined", // aile reddetti (ör. dolu)
  "cancelled", // onaylıyken iptal edildi
]);

export const reservationSource = pgEnum("reservation_source", [
  "website",
  "whatsapp",
  "phone",
  "walk_in",
]);

export const outboxStatus = pgEnum("outbox_status", ["pending", "sent", "failed"]);

/** Konaklama üniteleri (6 oda + kamp alanı). Referans veri — migration ile eklenir. */
export const units = pgTable("units", {
  id: smallint("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  kind: unitKind("kind").notNull(),
  sortOrder: smallint("sort_order").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Misafirle konuşurken kullanılan kısa kod, ör. TRY-7K3Q9 */
    reference: text("reference").notNull().unique(),
    /** null = misafir "emin değilim" dedi; aile onaylarken ünite atar */
    unitId: smallint("unit_id").references(() => units.id),
    checkIn: date("check_in").notNull(),
    checkOut: date("check_out").notNull(),
    adults: smallint("adults").notNull(),
    children: smallint("children").notNull().default(0),
    guestName: text("guest_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    note: text("note"),
    locale: text("locale").notNull(),
    source: reservationSource("source").notNull().default("website"),
    status: reservationStatus("status").notNull().default("pending"),
    /** KVKK/GDPR onayının verildiği an */
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("reservations_dates_order", sql`${t.checkOut} > ${t.checkIn}`),
    check("reservations_adults_min", sql`${t.adults} >= 1`),
    check("reservations_children_min", sql`${t.children} >= 0`),
    check("reservations_locale", sql`${t.locale} in ('tr', 'en', 'de')`),
    check(
      "reservations_confirmed_has_unit",
      sql`${t.status} <> 'confirmed' or ${t.unitId} is not null`,
    ),
    index("reservations_status_created_idx").on(t.status, t.createdAt),
  ],
);

/** Denetim izi: rezervasyonda olan her şey (oluşturma, durum değişikliği, not). */
export const reservationEvents = pgTable(
  "reservation_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    fromStatus: reservationStatus("from_status"),
    toStatus: reservationStatus("to_status"),
    /** "guest", "system" veya "admin:<e-posta>" */
    actor: text("actor").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("reservation_events_type", sql`${t.type} in ('created', 'status_changed', 'note_added')`),
    index("reservation_events_reservation_idx").on(t.reservationId, t.createdAt),
  ],
);

/**
 * Transactional outbox: gönderilecek bildirimler rezervasyonla AYNI transaction'da
 * yazılır. Gönderim başarısız olursa satır kalır ve tekrar denenir — talep kaybolmaz.
 */
export const outbox = pgTable(
  "outbox",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    kind: text("kind").notNull(),
    payload: jsonb("payload").notNull(),
    status: outboxStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [
    index("outbox_pending_idx")
      .on(t.nextAttemptAt)
      .where(sql`${t.status} = 'pending'`),
  ],
);

/** Dönüşüm ölçümü (form gönderimi, WhatsApp/telefon tıklaması). Kişisel veri yok. */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull(),
    path: text("path"),
    locale: text("locale"),
    referrerHost: text("referrer_host"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "analytics_events_name",
      sql`${t.name} in ('reservation_submitted', 'whatsapp_click', 'phone_click')`,
    ),
    index("analytics_events_name_created_idx").on(t.name, t.createdAt),
  ],
);

export type Reservation = typeof reservations.$inferSelect;
export type Unit = typeof units.$inferSelect;
