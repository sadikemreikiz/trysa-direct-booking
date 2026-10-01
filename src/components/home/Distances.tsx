import { place } from "@/content/site";
import { container, type TL } from "./shared";

export function Distances({ t, lang }: TL) {
  return (
    <section className={`${container} pt-10`}>
      <h2 className="font-display text-2xl font-semibold text-pine md:text-3xl">
        {t.distances.title}
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 md:gap-6">
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          {t.distances.places.map((d, i) => (
            <div
              key={d.p}
              className={`flex items-center justify-between px-4 py-3.5 ${
                i < t.distances.places.length - 1 ? "border-b border-line/60" : ""
              }`}
            >
              <span className="text-sm text-ink md:text-[15px]">{d.p}</span>
              <span className="text-sm font-bold text-muted">{d.t}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <div className="min-h-[16rem] flex-1 overflow-hidden rounded-2xl border border-line">
            <iframe
              title="Trysa"
              src={`https://maps.google.com/maps?q=${place.lat},${place.lng}&hl=${lang}&z=15&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-64 w-full border-0 md:h-full"
            />
          </div>
          <a
            href={place.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start text-sm font-bold text-clay"
          >
            {t.distances.yolTarifi}
          </a>
        </div>
      </div>
    </section>
  );
}
