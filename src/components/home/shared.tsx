import type { Dict, Locale } from "@/content/dictionaries";
import type { RatingSummary } from "@/features/reviews/google-reviews";

export const container = "mx-auto max-w-6xl px-5 md:px-8";

export type T = { t: Dict };
export type TL = { t: Dict; lang: Locale };
export type TLR = TL & { rating: RatingSummary };

/**
 * Placeholder until real photos arrive: decorative pattern + icon, no text.
 * data-nosnippet: keeps Google from using this area in the search result description.
 */
export function Photo({
  tone,
  className = "",
  labelDark = false,
}: {
  tone: string;
  className?: string;
  labelDark?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      data-nosnippet
      className={`relative flex items-center justify-center ${className}`}
      style={{
        backgroundColor: tone,
        backgroundImage:
          "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.10) 0 22%, transparent 23%), radial-gradient(circle at 80% 75%, rgba(0,0,0,0.10) 0 28%, transparent 29%)",
      }}
    >
      <svg
        viewBox="0 0 48 32"
        className={`h-10 w-14 ${labelDark ? "text-white/25" : "text-black/15"}`}
        fill="currentColor"
      >
        {/* mountain + sun: nature */}
        <circle cx="36" cy="8" r="4" />
        <path d="M0 32 L16 10 L26 22 L32 15 L48 32 Z" />
      </svg>
    </div>
  );
}

export function Stars({ className = "" }: { className?: string }) {
  return <span className={`tracking-wide text-gold ${className}`}>★★★★★</span>;
}
