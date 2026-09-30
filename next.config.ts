import type { NextConfig } from "next";
import { place } from "./src/lib/site";

const isDev = process.env.NODE_ENV === "development";
// Vercel önizleme sürümlerinde yorum/araç çubuğu (vercel.live) yüklenir; canlıda yok.
const vercelLive = process.env.VERCEL_ENV === "preview" ? " https://vercel.live" : "";

/**
 * İçerik güvenliği politikası (CSP), nonce'suz: sayfalar statik üretildiği için nonce
 * kullanılamaz (her istekte dinamik render gerekirdi). Yine de dışarıdan script yükleme,
 * sitenin başka sitede çerçeveye alınması (clickjacking) ve form yönlendirme engellenir.
 * Dış kaynaklar: Google Haritalar gömme (iframe). Vercel Analytics aynı alan adından çalışır.
 */
const csp = [
  "default-src 'self'",
  // Geliştirmede: React hata ayıklama (eval) ve Vercel Analytics'in debug script'i
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
  // Site ve panelin ayrı kök düzenleri var → tüm uygulama için tek 404 sayfası (app/global-not-found.tsx)
  experimental: { globalNotFound: true },
  // Kısa linkler (kartvizit, masa kartı, WhatsApp mesajı, tabela):
  //   yol tarifi → Google Haritalar navigasyonu, yorum → Google'da "yorum yaz" ekranı
  async redirects() {
    const to = (destination: string) => (source: string) => ({ source, destination, permanent: false });
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
