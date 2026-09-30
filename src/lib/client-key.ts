/**
 * İstek sahibini spam sınırı için tanımlayan anahtar. IP'nin kendisi saklanmaz:
 * gizli anahtarla alınmış kısa özeti (HMAC) kullanılır, geri çevrilemez.
 */
import { createHmac } from "node:crypto";

export function clientIp(headers: Headers): string {
  // Vercel, x-forwarded-for'u kendisi yazar (ilk değer gerçek istemci).
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export function clientKey(headers: Headers, secret = process.env.BETTER_AUTH_SECRET ?? ""): string {
  return createHmac("sha256", secret).update(`rate:${clientIp(headers)}`).digest("hex").slice(0, 32);
}
