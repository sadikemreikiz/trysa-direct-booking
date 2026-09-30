// SADECE LOKAL: panele Google'sız giriş için test kullanıcısı + oturum oluşturur ve
// tarayıcıya konacak çerezi yazdırır (manuel test ve uçtan uca testler için).
//   node --env-file=.env.development.local scripts/dev-login.mjs
// Güvenlik: yalnızca 127.0.0.1/localhost veritabanında çalışır; canlı veritabanına dokunmaz.
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
  console.error("[dev-login] sadece lokal veritabanında çalışır (DATABASE_URL 127.0.0.1 olmalı)");
  process.exit(1);
}
if (!secret) {
  console.error("[dev-login] BETTER_AUTH_SECRET tanımlı değil");
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

  // better-call imzası: encodeURIComponent(`${değer}.${base64(HMAC-SHA256)}`)
  const signature = createHmac("sha256", secret).update(token).digest("base64");
  console.log(`better-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`);
} finally {
  await sql.end();
}
