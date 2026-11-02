import { foodPhotos } from "@/content/site";
import { fillRating } from "@/features/reviews/google-reviews";
import { responsiveImage } from "@/lib/images";
import { container, type TLR } from "./shared";

export function Restaurant({ t, lang, rating }: TLR) {
  return (
    <section id="restoran" className={`${container} scroll-mt-20 pt-10`}>
      <h2 className="font-display text-3xl font-semibold text-pine md:text-4xl">
        {t.restaurant.title}
      </h2>
      <p className="mt-1 text-muted md:text-[15px]">{fillRating(t.restaurant.sub, rating, lang)}</p>
      <div className="mt-5 overflow-hidden rounded-2xl bg-pine md:flex md:items-center">
        <div className="p-6 md:flex-1 md:p-11">
          <div className="mb-3 text-xs font-bold tracking-[0.2em] text-[#c99a63]">
            {t.restaurant.kicker}
          </div>
          <h3 className="font-display text-2xl font-semibold text-ivory md:text-3xl">
            {t.restaurant.h}
          </h3>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#d6dbcb] md:text-base">
            {t.restaurant.desc}
          </p>
          <a
            href={`/${lang}/menu`}
            className="mt-5 inline-block rounded-xl bg-ivory px-5 py-3 text-sm font-bold text-pine"
          >
            {t.restaurant.cta}
          </a>
        </div>
        {/* The breakfast spread large, a grill and gözleme below it, each in a cream frame like the
            photos in the Trysa story card */}
        <div className="grid grid-cols-2 gap-3 px-6 pb-6 md:w-2/5 md:py-10 md:pr-10 md:pl-0 lg:w-[420px]">
          {foodPhotos.map((p, i) => (
            <div
              key={p.src}
              className={`rounded-lg bg-ivory p-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.35)] ${i === 0 ? "col-span-2" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                {...responsiveImage(
                  p.src,
                  i === 0
                    ? "(min-width: 1024px) 380px, (min-width: 768px) 35vw, 100vw"
                    : "(min-width: 1024px) 185px, (min-width: 768px) 17vw, 50vw",
                  p.width,
                )}
                alt={t.gallery[p.label]}
                loading="lazy"
                className={`w-full rounded object-cover ${p.focus} ${i === 0 ? "aspect-[2/1]" : "aspect-[4/3]"}`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
