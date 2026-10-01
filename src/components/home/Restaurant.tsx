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
      <div className="mt-5 overflow-hidden rounded-2xl bg-pine md:flex">
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
        {/* The breakfast spread large, a grill and gözleme below it */}
        <div className="grid h-80 grid-cols-2 grid-rows-[minmax(0,3fr)_minmax(0,2fr)] gap-1 md:h-96 md:w-[460px]">
          {foodPhotos.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.src}
              {...responsiveImage(
                p.src,
                i === 0 ? "(min-width: 768px) 460px, 100vw" : "(min-width: 768px) 230px, 50vw",
                p.width,
              )}
              alt={t.gallery[p.label]}
              loading="lazy"
              className={`h-full w-full object-cover ${p.focus} ${i === 0 ? "col-span-2" : ""}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
