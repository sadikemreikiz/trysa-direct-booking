import { stays } from "@/content/site";
import { responsiveImage } from "@/lib/images";
import { container, type TL } from "./shared";

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
            // The camping area comes last, alone on its row: on wide screens it spans the row,
            // its drawing as wide as one room photo above it.
            className={`overflow-hidden rounded-2xl border border-line bg-white ${
              s.img ? "" : "md:col-span-3 md:grid md:grid-cols-3 md:items-center md:gap-6"
            }`}
          >
            {/* The photo sits inside the card in a cream frame, like the restaurant and Trysa cards */}
            <div className={s.img ? "p-3 pb-0" : "p-3 pb-0 md:pb-3"}>
              <div className="rounded-lg bg-ivory p-1.5 shadow-[0_6px_16px_rgba(44,58,46,0.18)]">
                {s.img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    {...responsiveImage(s.img, "(min-width: 768px) 33vw, 100vw")}
                    alt={s.title}
                    loading="lazy"
                    className={`block aspect-[3/2] w-full rounded object-cover ${s.focus ?? ""}`}
                  />
                ) : (
                  <CampScene />
                )}
              </div>
            </div>
            <div className={s.img ? "p-5" : "p-5 md:col-span-2 md:max-w-md md:pl-0"}>
              <div className="font-display text-lg font-semibold md:text-xl">
                {s.slug === "kamp" ? t.stay.kampTitle : s.title}
              </div>
              <p className="mt-1.5 text-sm text-muted">{t.room.descs[s.slug] ?? s.desc}</p>
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

/** The camping area has no photo yet: a small drawn scene instead of an empty photo slot. */
function CampScene() {
  return (
    <svg
      viewBox="0 0 320 176"
      preserveAspectRatio="xMidYMax slice"
      className="block aspect-[3/2] w-full rounded"
      aria-hidden="true"
    >
      <rect width="320" height="176" fill="#efe8d8" />
      <circle cx="232" cy="58" r="20" fill="#c1622f" />
      <path d="M-20 146 L84 64 Q92 58 100 64 L214 146 Z" fill="#9aa68c" />
      <path d="M118 150 L222 84 Q230 79 238 84 L350 150 Z" fill="#2c3a2e" />
      <rect y="142" width="320" height="34" fill="#c7b79a" />
      {/* Tent */}
      <path d="M58 152 L94 100 L130 152 Z" fill="#ad5426" />
      <path d="M86 152 L94 126 L102 152 Z" fill="#f6f1e7" />
      {/* Caravan */}
      <rect
        x="164"
        y="118"
        width="74"
        height="30"
        rx="9"
        fill="#f6f1e7"
        stroke="#2c3a2e"
        strokeWidth="3"
      />
      <rect x="176" y="125" width="18" height="11" rx="2" fill="#9aa68c" />
      <rect x="204" y="125" width="14" height="23" rx="2" fill="#c7b79a" />
      <circle cx="184" cy="150" r="6" fill="#2c3a2e" />
      <circle cx="222" cy="150" r="6" fill="#2c3a2e" />
    </svg>
  );
}
