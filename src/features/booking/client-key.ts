/**
 * Key that identifies the requester for the spam limit. The IP itself is not stored:
 * a short keyed digest (HMAC) is used instead, which can't be reversed.
 */
import { createHmac } from "node:crypto";

export function clientIp(headers: Headers): string {
  // Vercel sets x-forwarded-for itself (the first value is the real client).
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export function clientKey(headers: Headers, secret = process.env.BETTER_AUTH_SECRET ?? ""): string {
  return createHmac("sha256", secret)
    .update(`rate:${clientIp(headers)}`)
    .digest("hex")
    .slice(0, 32);
}
