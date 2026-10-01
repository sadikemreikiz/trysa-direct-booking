import { fillRating } from "@/features/reviews/google-reviews";
import { responsiveImage } from "@/lib/images";
import { container, type TLR } from "./shared";

export function TwoPath({ t, lang, rating }: TLR) {
  return (
    <section className={`${container} pt-8`}>
      <div className="grid gap-4 md:grid-cols-2 md:gap-7">
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_10px_26px_rgba(44,58,46,0.08)]">
          <div className="relative h-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              {...responsiveImage(
                "/img/rooms/kulube-1/kapak.jpg",
                "(min-width: 768px) 50vw, 100vw",
              )}
              alt="Trysa"
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <span className="absolute left-3.5 top-3.5 rounded-full bg-pine px-3 py-1.5 text-[11px] font-extrabold tracking-widest text-ivory">
              {t.twoPath.stayLabel}
            </span>
          </div>
          <div className="p-6 md:p-7">
            <div className="font-display text-2xl font-semibold text-pine">
              {t.twoPath.stayTitle}
            </div>
            <p className="mt-1.5 text-sm text-muted md:text-[15px]">{t.twoPath.staySub}</p>
            <a
              href={`/${lang}/rezervasyon`}
              className="mt-4 inline-block rounded-xl bg-clay px-6 py-3 text-sm font-bold text-white"
            >
              {t.twoPath.stayCta} →
            </a>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_10px_26px_rgba(44,58,46,0.08)]">
          <div className="relative h-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              {...responsiveImage("/img/rooms/tiny-house/5.jpg", "(min-width: 768px) 50vw, 100vw")}
              alt={t.twoPath.eatTitle}
              loading="lazy"
              className="h-full w-full object-cover object-[center_35%]"
            />
            <span className="absolute left-3.5 top-3.5 rounded-full bg-gold px-3 py-1.5 text-[11px] font-extrabold text-[#3a2e0a]">
              ★ {fillRating("{rating} · {count}", rating, lang)} {t.twoPath.reviewsWord}
            </span>
          </div>
          <div className="p-6 md:p-7">
            <div className="font-display text-2xl font-semibold text-pine">
              {t.twoPath.eatTitle}
            </div>
            <p className="mt-1.5 text-sm text-muted md:text-[15px]">{t.twoPath.eatSub}</p>
            <a
              href={`/${lang}/menu`}
              className="mt-4 inline-block rounded-xl bg-pine px-6 py-3 text-sm font-bold text-ivory"
            >
              {t.twoPath.eatCta} →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
