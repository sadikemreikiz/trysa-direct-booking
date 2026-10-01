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
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {galleryImages.map((g, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            {...responsiveImage(g.src, "(min-width: 768px) 25vw, 50vw")}
            alt={typeof g.alt === "string" ? g.alt : t.gallery[g.alt.label]}
            loading="lazy"
            className="h-28 w-full rounded-xl object-cover md:h-36"
          />
        ))}
      </div>
    </section>
  );
}
