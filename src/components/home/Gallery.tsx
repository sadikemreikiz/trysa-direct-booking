import { galleryImages } from "@/content/site";
import { responsiveImage } from "@/lib/images";
import { container, type T } from "./shared";

export function Gallery({ t }: T) {
  return (
    <section id="galeri" className={`${container} scroll-mt-20 pt-10`}>
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-3xl font-semibold text-pine md:text-4xl">
          {t.gallery.title}
        </h2>
      </div>
      {/* The photos are portrait: tall tiles keep them whole. The first one is large (two
          columns, and two rows on wide screens). */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {galleryImages.map((g, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={g.src}
            {...responsiveImage(
              g.src,
              i === 0 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw",
              g.width,
            )}
            alt={typeof g.alt === "string" ? g.alt : t.gallery[g.alt.label]}
            loading="lazy"
            className={`w-full rounded-xl object-cover ${g.focus ?? ""} ${
              i === 0
                ? "col-span-2 aspect-square md:row-span-2 md:aspect-auto md:h-full"
                : "aspect-[4/5]"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
