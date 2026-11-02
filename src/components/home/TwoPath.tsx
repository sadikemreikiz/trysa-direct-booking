import { fillRating } from "@/features/reviews/google-reviews";
import { responsiveImage } from "@/lib/images";
import { container, type TLR } from "./shared";

export function TwoPath({ t, lang, rating }: TLR) {
  return (
    <section className={`${container} pt-8`}>
      <div className="grid gap-4 md:grid-cols-2 md:gap-7">
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_10px_26px_rgba(44,58,46,0.08)]">
          {/* The photo sits inside the card in a cream frame, like the other cards on the page */}
          <div className="p-3 pb-0">
            <div className="relative rounded-lg bg-ivory p-1.5 shadow-[0_6px_16px_rgba(44,58,46,0.18)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                {...responsiveImage(
                  "/img/home/stay-in-nature.jpg",
                  "(min-width: 768px) 50vw, 100vw",
                )}
                alt={t.twoPath.stayTitle}
                loading="lazy"
                className="block h-44 w-full rounded object-cover object-[center_48%]"
              />
              <span className="absolute left-4 top-4 rounded-full bg-pine px-3 py-1.5 text-[11px] font-extrabold tracking-widest text-ivory">
                {t.twoPath.stayLabel}
              </span>
            </div>
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
          <div className="p-3 pb-0">
            <div className="relative rounded-lg bg-ivory p-1.5 shadow-[0_6px_16px_rgba(44,58,46,0.18)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                {...responsiveImage(
                  "/img/home/take-a-seat.jpg",
                  "(min-width: 768px) 50vw, 100vw",
                  1010,
                )}
                alt={t.twoPath.eatTitle}
                loading="lazy"
                className="block h-44 w-full rounded object-cover object-[center_45%]"
              />
              <span className="absolute left-4 top-4 rounded-full bg-gold px-3 py-1.5 text-[11px] font-extrabold text-[#3a2e0a]">
                ★ {fillRating("{rating} · {count}", rating, lang)} {t.twoPath.reviewsWord}
              </span>
            </div>
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
