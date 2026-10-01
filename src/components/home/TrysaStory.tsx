import { container, type T } from "./shared";

export function TrysaStory({ t }: T) {
  return (
    <section id="trysa" className={`${container} scroll-mt-20 pt-10`}>
      <div className="overflow-hidden rounded-2xl bg-stone">
        <div className="p-6 md:p-12">
          <div className="mb-3 text-xs font-bold tracking-[0.2em] text-[#d9a05b]">
            {t.trysaStory.kicker}
          </div>
          <h2 className="font-display text-2xl font-semibold leading-tight text-[#f1e9d8] md:text-3xl">
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
      </div>
    </section>
  );
}
