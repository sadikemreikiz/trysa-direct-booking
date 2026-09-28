// Site adresi (canlıda NEXT_PUBLIC_SITE_URL ile de ayarlı).
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://trysacamping.com";

// Google'a görünürlük: launch'ta SITE_INDEXABLE=true yap (Vercel env) → indexlenir.
// Şimdilik kapalı (staging Google'da çıkmasın).
export const SITE_INDEXABLE = process.env.SITE_INDEXABLE === "true";
