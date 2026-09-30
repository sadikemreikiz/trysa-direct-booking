/**
 * Google Places API (New) ile gerçek Google yorumlarını çeker.
 * Env: GOOGLE_PLACES_API_KEY (gerekli), GOOGLE_PLACE_ID (opsiyonel; yoksa isimden bulunur).
 * Anahtar yoksa null döner → site statik örnek yorumlara düşer.
 * Google API en fazla ~5 öne çıkan yorum verir; günde bir yenilenir.
 * Dile göre istenir: Google önce o dilde yazılmış yorumları verir (EN sayfada İngilizce
 * yorumlar); çevrilmiş olanlar `translated` ile işaretlenir.
 */
import type { Locale } from "@/i18n-config";
import { site } from "./site";

export type GoogleReview = {
  author: string;
  rating: number;
  text: string;
  when: string;
  /** Google, yorumu sayfanın diline çevirdiyse true (altında "Google çevirisi" yazar) */
  translated: boolean;
};

export type GoogleReviewsData = {
  rating: number;
  count: number;
  reviews: GoogleReview[];
};

const KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACE_ID = process.env.GOOGLE_PLACE_ID;
const QUERY = "Trysa Restaurant Camping, Davazlar, Demre";

type SearchResponse = { places?: { id?: string }[] };
type PlaceResponse = {
  rating?: number;
  userRatingCount?: number;
  reviews?: {
    rating?: number;
    relativePublishTimeDescription?: string;
    text?: { text?: string; languageCode?: string };
    originalText?: { text?: string; languageCode?: string };
    authorAttribution?: { displayName?: string };
  }[];
};

async function resolvePlaceId(): Promise<string | null> {
  if (PLACE_ID) return PLACE_ID;
  if (!KEY) return null;
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": KEY,
        "X-Goog-FieldMask": "places.id",
      },
      body: JSON.stringify({ textQuery: QUERY, languageCode: "tr" }),
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as SearchResponse;
    return data.places?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

export type RatingSummary = { rating: number; count: number };

/** Sitede gösterilen puan ve yorum sayısı: Google'dan canlı, ulaşılamazsa son bilinen değer. */
export async function getRatingSummary(): Promise<RatingSummary> {
  const google = await getGoogleReviews();
  if (google && google.count > 0) return { rating: google.rating, count: google.count };
  return site.ratingFallback;
}

/** "4,9" (tr/de) veya "4.9" (en) */
export function formatRating(rating: number, lang: Locale): string {
  return new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating);
}

/** Metindeki {rating} ve {count} yerlerini doldurur. */
export function fillRating(template: string, summary: RatingSummary, lang: Locale): string {
  return template
    .replaceAll("{rating}", formatRating(summary.rating, lang))
    .replaceAll("{count}", new Intl.NumberFormat(lang).format(summary.count));
}

const ANONYMOUS: Record<Locale, string> = { tr: "Google kullanıcısı", en: "Google user", de: "Google-Nutzer" };

export async function getGoogleReviews(lang: Locale = "tr"): Promise<GoogleReviewsData | null> {
  if (!KEY) return null;
  const placeId = await resolvePlaceId();
  if (!placeId) return null;
  try {
    // languageCode adrese yazılır: her dil ayrı önbelleğe alınır
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=${lang}`, {
      headers: {
        "X-Goog-Api-Key": KEY,
        "X-Goog-FieldMask": "rating,userRatingCount,reviews",
        "Accept-Language": lang,
      },
      next: { revalidate: 86_400 }, // günde bir yenile
    });
    if (!res.ok) return null;
    const data = (await res.json()) as PlaceResponse;
    const reviews: GoogleReview[] = (data.reviews ?? [])
      .map((r) => ({
        author: r.authorAttribution?.displayName ?? ANONYMOUS[lang],
        rating: r.rating ?? 5,
        text: r.text?.text ?? r.originalText?.text ?? "",
        when: r.relativePublishTimeDescription ?? "",
        translated: Boolean(
          r.text?.languageCode && r.originalText?.languageCode && r.text.languageCode !== r.originalText.languageCode,
        ),
      }))
      .filter((r) => r.text.trim().length > 0)
      .slice(0, 6);
    return {
      rating: data.rating ?? 0,
      count: data.userRatingCount ?? 0,
      reviews,
    };
  } catch {
    return null;
  }
}
