// LOCAL ONLY: creates a test user + session so the panel can be opened without Google, and
// prints the cookie to set in the browser (for manual and end-to-end testing).
//   node --env-file=.env.development.local scripts/dev-login.mjs
// Safety: only runs against a 127.0.0.1/localhost database; never touches production.
import { createHmac, randomBytes } from "node:crypto";
import postgres from "postgres";

const url = process.env.DATABASE_URL ?? "";
const secret = process.env.BETTER_AUTH_SECRET ?? "";
const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
})();
if (!["127.0.0.1", "localhost"].includes(host)) {
  console.error("[dev-login] only runs against a local database (DATABASE_URL must be 127.0.0.1)");
  process.exit(1);
}
if (!secret) {
  console.error("[dev-login] BETTER_AUTH_SECRET is not set");
  process.exit(1);
}

const USER_ID = "dev-test-admin";
const sql = postgres(url, { max: 1, prepare: false });
try {
  await sql`
    insert into "user" (id, name, email, email_verified)
    values (${USER_ID}, ${"Test Yönetici"}, ${"dev-admin@trysa.test"}, true)
    on conflict (id) do nothing`;
  await sql`
    insert into staff (user_id, role, status) values (${USER_ID}, 'admin', 'approved')
    on conflict (user_id) do update set role = 'admin', status = 'approved'`;

  const token = randomBytes(24).toString("base64url");
  await sql`
    insert into session (id, token, user_id, expires_at)
    values (${randomBytes(12).toString("hex")}, ${token}, ${USER_ID}, now() + interval '1 day')`;

  // better-call signature: encodeURIComponent(`${value}.${base64(HMAC-SHA256)}`)
  const signature = createHmac("sha256", secret).update(token).digest("base64");
  console.log(`better-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`);
} finally {
  await sql.end();
}
