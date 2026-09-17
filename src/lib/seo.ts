// Site adresi: alan adı alınınca NEXT_PUBLIC_SITE_URL env'ini o domaine çevir.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://trysa-sadikemreikiz.vercel.app";

// Google'a görünürlük: launch'ta SITE_INDEXABLE=true yap (Vercel env) → indexlenir.
// Şimdilik kapalı (staging Google'da çıkmasın).
export const SITE_INDEXABLE = process.env.SITE_INDEXABLE === "true";
