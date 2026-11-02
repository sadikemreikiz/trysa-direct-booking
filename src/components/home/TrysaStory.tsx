import { storyPhotos } from "@/content/site";
import { responsiveImage } from "@/lib/images";
import { container, type T } from "./shared";

export function TrysaStory({ t }: T) {
  return (
    <section id="trysa" className={`${container} scroll-mt-20 pt-10`}>
      <div className="overflow-hidden rounded-2xl bg-stone md:flex md:items-center">
        <div className="p-6 md:flex-1 md:p-12">
          <div className="mb-3 text-xs font-bold tracking-[0.2em] text-[#d9a05b]">
            {t.trysaStory.kicker}
          </div>
          <h2 className="font-display text-2xl font-semibold leading-tight text-balance text-[#f1e9d8] md:text-3xl">
            {t.trysaStory.title}
          </h2>
          <p className="mt-3.5 max-w-md text-sm leading-relaxed text-[#d8cfb8] md:text-base">
            {t.trysaStory.desc}
          </p>
          <a
            href={t.trysaStory.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-block rounded-xl bg-[#d9a05b] px-5 py-3 text-sm font-bold text-[#2b2417]"
          >
            {t.trysaStory.cta}
          </a>
        </div>
        {/* A frieze panel (now in Vienna) above the view from the ruins, each in a cream frame
            like a mounted print, its credit underneath */}
        <div className="flex flex-col gap-3 px-6 pb-6 md:w-2/5 md:py-10 md:pr-10 md:pl-0 lg:w-[420px]">
          {storyPhotos.map((p) => (
            <figure key={p.src}>
              <div className="rounded-lg bg-[#f1e9d8] p-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  {...responsiveImage(
                    p.src,
                    "(min-width: 1024px) 380px, (min-width: 768px) 35vw, 100vw",
                    1200,
                  )}
                  alt={t.trysaStory.photos[p.label]}
                  loading="lazy"
                  decoding="async"
                  className={`aspect-[5/2] w-full rounded object-cover ${p.focus}`}
                />
              </div>
              <figcaption className="text-right text-[11px] text-[#bfb49c]">
                <a
                  href={p.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-6 items-center hover:underline"
                >
                  © {p.credit} · CC BY-SA 4.0 · {t.trysaStory.edited}
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
