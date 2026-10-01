import { formatRating, type GoogleReviewsData } from "@/features/reviews/google-reviews";
import { container, Stars, type TL } from "./shared";

export function Reviews({ t, lang, google }: TL & { google?: GoogleReviewsData | null }) {
  const items =
    google && google.reviews.length > 0
      ? google.reviews.map((r) => ({
          text: r.text,
          author: r.when ? `${r.author} · ${r.when}` : r.author,
          translated: r.translated,
        }))
      : [];
  if (items.length === 0) return null;
  return (
    <section className={`${container} pt-10`}>
      {google && google.count > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <Stars className="text-base" />
          <span className="font-bold text-pine">{formatRating(google.rating, lang)}</span>
          <span className="text-sm text-muted">· {google.count} {t.reviews.suffix}</span>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3 md:gap-5">
        {items.map((r, i) => (
          <div key={i} className="rounded-2xl bg-[#f0e7d3] p-6">
            <Stars className="text-[15px]" />
            <p className="mt-2.5 line-clamp-6 font-display text-[17px] italic leading-snug text-pine">
              “{r.text}”
            </p>
            <div className="mt-3 text-sm font-semibold text-muted">— {r.author}</div>
            {r.translated && <div className="mt-1 text-xs text-muted/80">{t.reviews.translated}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
