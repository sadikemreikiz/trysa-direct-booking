// LOCAL ONLY: fills the local database with fictional demo bookings so the panel
// (list, detail, calendar, statistics) can be explored without real guest data.
//   node --env-file=.env.development.local scripts/seed-demo.mjs [--reset]
// Dates are relative to today, so the demo always looks current.
// Safety: only runs against a 127.0.0.1/localhost database; never touches production.
import { randomUUID } from "node:crypto";
import postgres from "postgres";

const url = process.env.DATABASE_URL ?? "";
const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
})();
if (!["127.0.0.1", "localhost"].includes(host)) {
  console.error("[seed-demo] only runs against a local database (DATABASE_URL must be 127.0.0.1)");
  process.exit(1);
}

const ADMIN_ID = "dev-test-admin"; // same user as scripts/dev-login.mjs
const REQUESTER_ID = "demo-access-request";
const DAY = 86_400_000;
const MIN = 60_000;
const now = Date.now();

/** YYYY-MM-DD, `days` from today (Istanbul time, like the app). */
function day(days) {
  return new Date(now + days * DAY).toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
}
const ago = (ms) => new Date(now - ms);

let refCounter = 0;
const reference = () => `TRY-DEMO${String.fromCharCode(65 + refCounter++)}`;

// unit: slug or null ("not sure"); offsets in days from today; createdAgo/decidedAfter in ms
const bookings = [
  // Waiting for an answer: one is past the 3-hour mark and shows up red in the panel
  { name: "James Carter", locale: "en", unit: null, in: 20, out: 23, adults: 2, children: 1, phone: "+44 7700 900123", email: "james@example.com", note: "Travelling with a 6-year-old. Is breakfast included?", createdAgo: 4 * 60 * MIN },
  { name: "Anna Schmidt", locale: "de", unit: "ambar-2", in: 12, out: 15, adults: 2, phone: "+49 151 23456789", email: "anna@example.com", note: "Wir kommen gegen 18 Uhr an.", createdAgo: 35 * MIN },
  { name: "Elif Yılmaz", locale: "tr", unit: "tiny-house", in: 5, out: 7, adults: 2, phone: "0532 000 00 01", createdAgo: 10 * MIN },
  // Confirmed and upcoming
  { name: "Lukas Weber", locale: "de", unit: "kulube-1", in: 2, out: 6, adults: 2, phone: "+49 170 1234567", email: "lukas@example.com", createdAgo: 6 * DAY, status: "confirmed", decidedAfter: 25 * MIN },
  { name: "Sophie Martin", locale: "en", unit: "kamp", in: 1, out: 4, adults: 2, phone: "+33 6 12 34 56 78", note: "Campervan, 7 m.", createdAgo: 9 * DAY, status: "confirmed", decidedAfter: 50 * MIN },
  { name: "Zeynep Kaya", locale: "tr", unit: "ambar-1", in: 8, out: 10, adults: 3, phone: "0533 000 00 02", createdAgo: 3 * DAY, status: "confirmed", source: "phone" },
  { name: "Ahmet B.", locale: "tr", unit: "ambar-3", in: 0, out: 2, adults: 2, phone: "", createdAgo: 2 * 60 * MIN, status: "confirmed", source: "walk_in" },
  { name: "Mehmet Demir", locale: "tr", unit: "kulube-2", in: 14, out: 18, adults: 2, children: 2, phone: "0535 000 00 03", createdAgo: 1 * DAY, status: "confirmed", source: "whatsapp" },
  // Declined (the room was already taken)
  { name: "Clara Jensen", locale: "en", unit: "kulube-1", in: 3, out: 5, adults: 2, phone: "+45 20 12 34 56", email: "clara@example.com", createdAgo: 4 * DAY, status: "declined", decidedAfter: 90 * MIN },
  // Past stays, so the statistics page has a few months of history
  ...[
    [-150, "ambar-1", 40], [-140, "kulube-2", 15], [-120, "ambar-2", 70], [-95, "tiny-house", 20],
    [-80, "ambar-3", 130], [-60, "kulube-1", 35], [-45, "ambar-1", 10], [-30, "kamp", 55],
    [-20, "ambar-2", 25], [-12, "tiny-house", 45],
  ].map(([offset, unit, minutes], i) => ({
    name: `Demo Guest ${i + 1}`, locale: ["tr", "en", "de"][i % 3], unit, in: offset, out: offset + 2 + (i % 3),
    adults: 2, phone: "+90 555 000 00 00", createdAgo: (-offset + 14) * DAY, status: "confirmed", decidedAfter: minutes * MIN,
  })),
];

const sql = postgres(url, { max: 1, prepare: false });
try {
  const [{ count }] = await sql`select count(*)::int as count from reservations`;
  if (count > 0 && !process.argv.includes("--reset")) {
    console.error(`[seed-demo] the local database already has ${count} bookings; run with --reset to replace them`);
    process.exit(1);
  }

  await sql.begin(async (tx) => {
    await tx`truncate reservations, reservation_events, outbox, analytics_events restart identity cascade`;

    await tx`
      insert into "user" (id, name, email, email_verified)
      values (${ADMIN_ID}, ${"Emre"}, ${"dev-admin@trysa.test"}, true),
             (${REQUESTER_ID}, ${"Deniz Aydın"}, ${"deniz@example.com"}, true)
      on conflict (id) do update set name = excluded.name`;
    await tx`
      insert into staff (user_id, role, status)
      values (${ADMIN_ID}, 'admin', 'approved'), (${REQUESTER_ID}, 'staff', 'pending')
      on conflict (user_id) do nothing`;

    const unitIds = new Map((await tx`select id, slug from units`).map((u) => [u.slug, u.id]));

    for (const b of bookings) {
      const id = randomUUID();
      const createdAt = ago(b.createdAgo);
      const status = b.status ?? "pending";
      const decidedAt = b.decidedAfter ? new Date(createdAt.getTime() + b.decidedAfter) : createdAt;
      const source = b.source ?? "website";
      const byStaff = source !== "website";

      await tx`
        insert into reservations (id, reference, unit_id, check_in, check_out, adults, children,
          guest_name, phone, email, note, locale, source, status, consent_at, created_at, updated_at,
          escalated_at)
        values (${id}, ${reference()}, ${b.unit ? unitIds.get(b.unit) : null}, ${day(b.in)}, ${day(b.out)},
          ${b.adults}, ${b.children ?? 0}, ${b.name}, ${b.phone}, ${b.email ?? null}, ${b.note ?? null},
          ${b.locale}, ${source}, ${status}, ${createdAt}, ${createdAt}, ${decidedAt},
          ${b.createdAgo > 3 * 60 * MIN && status === "pending" ? ago(b.createdAgo - 3 * 60 * MIN) : null})`;

      await tx`
        insert into reservation_events (reservation_id, type, to_status, actor, created_at)
        values (${id}, 'created', ${byStaff ? status : "pending"},
          ${byStaff ? `user:${ADMIN_ID}` : "guest"}, ${createdAt})`;
      if (!byStaff && status !== "pending") {
        await tx`
          insert into reservation_events (reservation_id, type, from_status, to_status, actor, note, created_at)
          values (${id}, 'status_changed', 'pending', ${status}, ${`user:${ADMIN_ID}`},
            ${status === "declined" ? "Kulübe-1 bu tarihlerde dolu." : null}, ${decidedAt})`;
      }
      if (source === "website") {
        await tx`
          insert into analytics_events (name, path, locale, created_at)
          values ('reservation_submitted', ${`/${b.locale}/rezervasyon`}, ${b.locale}, ${createdAt})`;
      }
    }

    // WhatsApp / phone clicks over the last five months
    for (let i = 0; i < 60; i++) {
      const at = ago(((i * 37) % 150) * DAY + (i % 7) * 60 * MIN);
      const name = i % 3 === 0 ? "phone_click" : "whatsapp_click";
      await tx`
        insert into analytics_events (name, path, locale, created_at)
        values (${name}, ${"/" + ["tr", "en", "de"][i % 3]}, ${["tr", "en", "de"][i % 3]}, ${at})`;
    }
  });

  console.log(`[seed-demo] ${bookings.length} demo bookings and 60 click events written ✓`);
  console.log("[seed-demo] open the panel with: node --env-file=.env.development.local scripts/dev-login.mjs");
} finally {
  await sql.end();
}
