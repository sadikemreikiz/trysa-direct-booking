import type { Dict, Locale } from "@/content/dictionaries";
import type { RatingSummary } from "@/features/reviews/google-reviews";

export const container = "mx-auto max-w-6xl px-5 md:px-8";

export type T = { t: Dict };
export type TL = { t: Dict; lang: Locale };
export type TLR = TL & { rating: RatingSummary };

export function Stars({ className = "" }: { className?: string }) {
  return <span className={`tracking-wide text-gold ${className}`}>★★★★★</span>;
}
