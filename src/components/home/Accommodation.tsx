import { stays } from "@/content/site";
import { responsiveImage } from "@/lib/images";
import { container, Photo, type TL } from "./shared";

export function Accommodation({ t, lang }: TL) {
  return (
    <section id="konaklama" className={`${container} scroll-mt-20 pt-10`}>
      <h2 className="font-display text-3xl font-semibold text-pine md:text-4xl">{t.stay.title}</h2>
      <p className="mt-1 text-muted md:text-[15px]">{t.stay.sub}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3 md:gap-6">
        {stays.map((s) => (
          <a
            key={s.slug}
            href={s.img ? `/${lang}/oda/${s.slug}` : `/${lang}/rezervasyon`}
            className="overflow-hidden rounded-2xl border border-line bg-white"
          >
            {s.img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                {...responsiveImage(s.img, "(min-width: 768px) 33vw, 100vw")}
                alt={s.title}
                loading="lazy"
                className="h-44 w-full object-cover"
              />
            ) : (
              <Photo tone={s.tone} className="h-44" />
            )}
            <div className="p-5">
              <div className="font-display text-lg font-semibold md:text-xl">{s.slug === "kamp" ? t.stay.kampTitle : s.title}</div>
              <p className="mt-1.5 text-sm text-muted">
                {t.room.descs[s.slug] ?? s.desc}
              </p>
              <div className="mt-3.5 flex items-center justify-between">
                <span className="text-lg font-bold text-pine">
                  {s.slug === "kamp" ? t.stay.fiyatSor : s.price}
                </span>
                <span className="text-sm font-bold text-clay">{t.stay.incele}</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
