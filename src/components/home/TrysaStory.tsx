import { storyPhotos } from "@/content/site";
import { responsiveImage } from "@/lib/images";
import { container, type T } from "./shared";

export function TrysaStory({ t }: T) {
  return (
    <section id="trysa" className={`${container} scroll-mt-20 pt-10`}>
      <div className="overflow-hidden rounded-2xl bg-stone md:flex">
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
        {/* A frieze panel (now in Vienna) above the view from the ruins, together as tall as the
            text next to them (laid out like the restaurant card) */}
        <div className="grid h-80 grid-rows-2 gap-1 md:h-auto md:w-2/5 lg:w-[460px]">
          {storyPhotos.map((p) => (
            <div key={p.src} className="relative overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                {...responsiveImage(
                  p.src,
                  "(min-width: 1024px) 460px, (min-width: 768px) 40vw, 100vw",
                  1200,
                )}
                alt={t.trysaStory.photos[p.label]}
                loading="lazy"
                decoding="async"
                className={`absolute inset-0 h-full w-full object-cover ${p.focus}`}
              />
              <a
                href={p.source}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute right-0 bottom-0 inline-flex min-h-6 items-center rounded-tl-lg bg-black/60 px-2 text-[10px] text-white hover:underline"
              >
                © {p.credit} · CC BY-SA 4.0 · {t.trysaStory.edited}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
