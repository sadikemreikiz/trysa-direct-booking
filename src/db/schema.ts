/**
 * Database schema (PostgreSQL / Drizzle ORM).
 *
 * Design principles:
 * - The database is the single source of truth; email is only a notification (outbox).
 * - Rules live at the DB level where possible: CHECK constraints and an overlap guard for
 *   confirmed bookings (EXCLUDE USING gist, see migration 0001).
 * - Every status change is written to reservation_events (audit trail).
 * - analytics_events holds no personal data (no IP / user agent).
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
  "pending", // guest requested, the family hasn't looked yet
  "confirmed", // the family confirmed; the dates are fixed for that unit
  "declined", // the family declined (e.g. fully booked)
  "cancelled", // cancelled after being confirmed
]);

export const reservationSource = pgEnum("reservation_source", [
  "website",
  "whatsapp",
  "phone",
  "walk_in",
]);

export const outboxStatus = pgEnum("outbox_status", ["pending", "sent", "failed"]);

/** Accommodation units (6 rooms + camping area). Reference data, inserted by a migration. */
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
    /** Short code used when talking to the guest, e.g. TRY-7K3Q9 */
    reference: text("reference").notNull().unique(),
    /** null = the guest said "not sure"; the family assigns a unit when confirming */
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
    /** Moment KVKK/GDPR consent was given */
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    /** Moment the admin was reminded because the request went unanswered for too long */
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),
    /** Moment personal data was deleted because the retention period expired (see db/maintenance) */
    anonymizedAt: timestamp("anonymized_at", { withTimezone: true }),
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

/** Audit trail: everything that happens to a booking (creation, status change, note). */
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
    /** "guest", "system" or "admin:<email>" */
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
 * Transactional outbox: notifications to send are written in the SAME transaction as the
 * booking. If sending fails the row stays and is retried, so no request is lost.
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

/** Conversion tracking (form submission, WhatsApp/phone click). No personal data. */
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

/**
 * Abuse limit (spam protection): a fixed-window counter per key.
 * The key is not the IP itself but its keyed digest (HMAC); rows are deleted after 2 days.
 */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
});

/* ------------------------------------------------------------------------ */
/* Panel sign-in: Better Auth core tables (names as the library expects)   */
/* ------------------------------------------------------------------------ */

const authTimestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  ...authTimestamps,
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...authTimestamps,
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    ...authTimestamps,
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...authTimestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* ------------------------------------------------------------------------ */
/* Panel access and notifications                                           */
/* ------------------------------------------------------------------------ */

export const staffRole = pgEnum("staff_role", [
  "admin", // sees everything, approves access requests (the developer)
  "staff", // manages requests, simplified view (the owner)
]);

export const staffStatus = pgEnum("staff_status", ["pending", "approved", "revoked"]);

/** Who can use the panel? Google sign-in alone isn't enough; the user must be approved here. */
export const staff = pgTable("staff", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  role: staffRole("role").notNull().default("staff"),
  status: staffStatus("status").notNull().default("pending"),
  decidedBy: text("decided_by").references(() => user.id),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Phone notification (Web Push) subscriptions, one row per device. */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("push_subscriptions_user_idx").on(t.userId)],
);

export type Reservation = typeof reservations.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type StaffRole = (typeof staffRole.enumValues)[number];
