/**
 * Fetches real Google reviews via the Google Places API (New).
 * Env: GOOGLE_PLACES_API_KEY (required), GOOGLE_PLACE_ID (optional; otherwise found by name).
 * Without a key it returns null → the site falls back to static sample reviews.
 * The Google API returns at most ~5 featured reviews; refreshed once a day.
 * Requested per language: Google returns reviews written in that language first (English
 * reviews on the EN page); translated ones are flagged with `translated`.
 */
import { site } from "@/content/site";
import type { Locale } from "@/lib/i18n";

export type GoogleReview = {
  author: string;
  rating: number;
  text: string;
  when: string;
  /** true if Google translated the review into the page's language (shows "Google translation" below it) */
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

/** Rating and review count shown on the site: live from Google, last known value if unreachable. */
export async function getRatingSummary(): Promise<RatingSummary> {
  const google = await getGoogleReviews();
  if (google && google.count > 0) return { rating: google.rating, count: google.count };
  return site.ratingFallback;
}

/** "4,9" (tr/de) or "4.9" (en) */
export function formatRating(rating: number, lang: Locale): string {
  return new Intl.NumberFormat(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
    rating,
  );
}

/** Fills in {rating} and {count} in the text. */
export function fillRating(template: string, summary: RatingSummary, lang: Locale): string {
  return template
    .replaceAll("{rating}", formatRating(summary.rating, lang))
    .replaceAll("{count}", new Intl.NumberFormat(lang).format(summary.count));
}

const ANONYMOUS: Record<Locale, string> = {
  tr: "Google kullanıcısı",
  en: "Google user",
  de: "Google-Nutzer",
};

export async function getGoogleReviews(lang: Locale = "tr"): Promise<GoogleReviewsData | null> {
  if (!KEY) return null;
  const placeId = await resolvePlaceId();
  if (!placeId) return null;
  try {
    // languageCode goes into the URL, so each language is cached separately
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?languageCode=${lang}`,
      {
        headers: {
          "X-Goog-Api-Key": KEY,
          "X-Goog-FieldMask": "rating,userRatingCount,reviews",
          "Accept-Language": lang,
        },
        next: { revalidate: 86_400 }, // refresh once a day
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as PlaceResponse;
    const reviews: GoogleReview[] = (data.reviews ?? [])
      .map((r) => ({
        author: r.authorAttribution?.displayName ?? ANONYMOUS[lang],
        rating: r.rating ?? 5,
        text: r.text?.text ?? r.originalText?.text ?? "",
        when: r.relativePublishTimeDescription ?? "",
        translated: Boolean(
          r.text?.languageCode &&
          r.originalText?.languageCode &&
          r.text.languageCode !== r.originalText.languageCode,
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
