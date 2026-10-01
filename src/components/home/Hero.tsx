import { site } from "@/content/site";
import { fillRating, formatRating } from "@/features/reviews/google-reviews";
import { responsiveImage } from "@/lib/images";
import { container, Stars, type TLR } from "./shared";

export function Hero({ t, lang, rating }: TLR) {
  return (
    <section className="relative overflow-hidden bg-pine">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...responsiveImage("/img/hero.jpg", "100vw")}
        alt=""
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-pine/75" />
      <div
        className={`relative ${container} flex min-h-[440px] flex-col justify-center py-16 md:min-h-[520px] md:py-24`}
      >
        <p className="mb-4 text-xs font-bold tracking-[0.2em] text-[#c99a63]">{t.hero.kicker}</p>
        <h1 className="max-w-2xl font-display text-4xl font-semibold leading-tight text-ivory md:text-6xl">
          {t.hero.title}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-[#d6dbcb] md:text-lg">
          {t.hero.subtitle}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5">
            <Stars className="text-sm" />
            <span className="text-sm font-bold text-ivory">
              {formatRating(rating.rating, lang)}
            </span>
            <span className="text-xs text-[#b9c0ac]">
              · {fillRating("{count}", rating, lang)} {t.hero.reviewsSuffix}
            </span>
          </div>
          {site.superhost && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5">
              <span className="text-sm text-[#ff5a5f]">◆</span>
              <span className="text-xs font-bold text-ivory">{t.hero.superhost}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
