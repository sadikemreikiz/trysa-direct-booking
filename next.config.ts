import type { NextConfig } from "next";
import { place } from "./src/content/site";

const isDev = process.env.NODE_ENV === "development";
// Vercel preview deployments load the comments toolbar (vercel.live); production does not.
const vercelLive = process.env.VERCEL_ENV === "preview" ? " https://vercel.live" : "";

/**
 * Content Security Policy without nonces: pages are statically generated, so a nonce
 * is not possible (it would force dynamic rendering on every request). External scripts,
 * framing the site elsewhere (clickjacking) and form redirection are still blocked.
 * External sources: the Google Maps embed (iframe). Vercel Analytics runs on our own domain.
 */
const csp = [
  "default-src 'self'",
  // In development: React debugging (eval) and Vercel Analytics' debug script
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval' https://va.vercel-scripts.com" : ""}${vercelLive}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self'${vercelLive}`,
  `frame-src https://maps.google.com https://www.google.com${vercelLive}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // The site and the panel have separate root layouts → one 404 page for the whole app (app/global-not-found.tsx)
  experimental: { globalNotFound: true },
  // Short links (business card, table card, WhatsApp message, signboard):
  //   directions → Google Maps navigation, review → Google's "write a review" screen
  async redirects() {
    const to = (destination: string) => (source: string) => ({
      source,
      destination,
      permanent: false,
    });
    return [
      ...["/yol", "/konum", "/directions", "/anfahrt"].map(to(place.directionsUrl)),
      ...["/yorum", "/review", "/bewertung"].map(to(place.reviewUrl)),
    ];
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
