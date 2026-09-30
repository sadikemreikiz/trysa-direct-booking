import { site, stays, galleryImages } from "@/lib/site";
import { WhatsAppIcon } from "./icons";
import type { Dict, Locale } from "@/dictionaries";
import { responsiveImage } from "@/lib/images";
import { fillRating, formatRating, type GoogleReviewsData, type RatingSummary } from "@/lib/reviews";

const container = "mx-auto max-w-6xl px-5 md:px-8";

type T = { t: Dict };
type TL = { t: Dict; lang: Locale };
type TLR = TL & { rating: RatingSummary };

function Photo({
  label,
  tone,
  className = "",
  labelDark = false,
}: {
  label: string;
  tone: string;
  className?: string;
  labelDark?: boolean;
}) {
  return (
    <div
      className={`relative flex items-end p-2.5 ${className}`}
      style={{ backgroundColor: tone }}
    >
      <span
        className={`rounded px-2 py-1 text-[10px] ${
          labelDark ? "bg-black/25 text-white/85" : "bg-white/60 text-ink/70"
        }`}
      >
        FOTO: {label}
      </span>
    </div>
  );
}

function Stars({ className = "" }: { className?: string }) {
  return <span className={`tracking-wide text-gold ${className}`}>★★★★★</span>;
}

/* ---------- HERO ---------- */
export function Hero({ t, lang, rating }: TLR) {
  return (
    <section className="relative overflow-hidden bg-pine">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...responsiveImage("/img/hero.jpg", "100vw")}
        alt=""
        fetchPriority="high"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-pine/75" />
      <div className={`relative ${container} flex min-h-[440px] flex-col justify-center py-16 md:min-h-[520px] md:py-24`}>
        <p className="mb-4 text-xs font-bold tracking-[0.2em] text-[#c99a63]">
          {t.hero.kicker}
        </p>
        <h1 className="max-w-2xl font-display text-4xl font-semibold leading-tight text-ivory md:text-6xl">
          {t.hero.title}
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-[#d6dbcb] md:text-lg">
          {t.hero.subtitle}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5">
            <Stars className="text-sm" />
            <span className="text-sm font-bold text-ivory">{formatRating(rating.rating, lang)}</span>
            <span className="text-xs text-[#b9c0ac]">
              · {fillRating("{count}", rating, lang)} {t.hero.reviewsSuffix}
            </span>
          </div>
          {site.superhost && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5">
              <span className="text-sm text-[#ff5a5f]">◆</span>
              <span className="text-xs font-bold text-ivory">{t.hero.superhost}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ---------- BOOKING BAR ---------- */
export function BookingBar({ t, lang }: TL) {
  const fld =
    "mt-1.5 w-full rounded-xl border border-line bg-white p-3 text-sm text-ink";
  const lbl = "block text-xs font-bold text-muted";
  return (
    <div className={`${container} relative z-20 -mt-8`}>
      <div className="rounded-2xl border border-line bg-white p-4 shadow-[0_14px_34px_rgba(44,58,46,0.14)] md:flex md:items-end md:gap-5">
        <label className="block flex-1">
          <span className={lbl}>{t.booking.checkin}</span>
          <input type="date" className={fld} />
        </label>
        <label className="mt-3 block flex-1 md:mt-0">
          <span className={lbl}>{t.booking.checkout}</span>
          <input type="date" className={fld} />
        </label>
        <label className="mt-3 block flex-1 md:mt-0">
          <span className={lbl}>{t.booking.guests}</span>
          <select className={fld}>
            {t.booking.guestOptions.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <a
          href={`/${lang}/rezervasyon`}
          className="mt-3 block rounded-xl bg-clay px-7 py-3 text-center text-sm font-bold text-white md:mt-0"
        >
          {t.booking.ask}
        </a>
      </div>
    </div>
  );
}

/* ---------- İKİ YOL ---------- */
export function TwoPath({ t, lang, rating }: TLR) {
  return (
    <section className={`${container} pt-8`}>
      <div className="grid gap-4 md:grid-cols-2 md:gap-7">
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_10px_26px_rgba(44,58,46,0.08)]">
          <div className="relative h-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              {...responsiveImage("/img/rooms/kulube-1/kapak.jpg", "(min-width: 768px) 50vw, 100vw")}
              alt="Trysa"
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <span className="absolute left-3.5 top-3.5 rounded-full bg-pine px-3 py-1.5 text-[11px] font-extrabold tracking-widest text-ivory">
              {t.twoPath.stayLabel}
            </span>
          </div>
          <div className="p-6 md:p-7">
            <div className="font-display text-2xl font-semibold text-pine">{t.twoPath.stayTitle}</div>
            <p className="mt-1.5 text-sm text-muted md:text-[15px]">{t.twoPath.staySub}</p>
            <a
              href={`/${lang}/rezervasyon`}
              className="mt-4 inline-block rounded-xl bg-clay px-6 py-3 text-sm font-bold text-white"
            >
              {t.twoPath.stayCta} →
            </a>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_10px_26px_rgba(44,58,46,0.08)]">
          <div className="relative h-48">
            <Photo label="ocakbaşı" tone="#4a5a45" className="h-full" labelDark />
            <span className="absolute left-3.5 top-3.5 rounded-full bg-gold px-3 py-1.5 text-[11px] font-extrabold text-[#3a2e0a]">
              ★ {fillRating("{rating} · {count}", rating, lang)} {t.twoPath.reviewsWord}
            </span>
          </div>
          <div className="p-6 md:p-7">
            <div className="font-display text-2xl font-semibold text-pine">{t.twoPath.eatTitle}</div>
            <p className="mt-1.5 text-sm text-muted md:text-[15px]">{t.twoPath.eatSub}</p>
            <a
              href={`/${lang}/menu`}
              className="mt-4 inline-block rounded-xl bg-pine px-6 py-3 text-sm font-bold text-ivory"
            >
              {t.twoPath.eatCta} →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- NEDEN DİREKT ---------- */
export function WhyDirect({ t }: T) {
  return (
    <section className={`${container} pt-5`}>
      <div className="grid gap-6 rounded-2xl bg-pine p-6 md:grid-cols-3 md:p-8">
        {t.why.items.map((i) => (
          <div key={i.t}>
            <div className="mb-1.5 font-display text-lg font-semibold text-white">{i.t}</div>
            <div className="text-sm text-[#b9c0ac]">{i.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- KONAKLAMA ---------- */
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
              <Photo label={s.photo} tone={s.tone} className="h-44" />
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

/* ---------- OLANAKLAR ---------- */
export function Amenities({ t }: T) {
  return (
    <section className={`${container} pt-10`}>
      <h2 className="font-display text-2xl font-semibold text-pine md:text-3xl">{t.amenities.title}</h2>
      <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 rounded-2xl border border-line bg-white p-5 md:grid-cols-4 md:p-7">
        {t.amenities.list.map((a) => (
          <div key={a} className="flex items-center gap-2 text-sm text-pine/90 md:text-[15px]">
            <span className="text-clay">•</span> {a}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted/70">{t.amenities.note}</p>
    </section>
  );
}

/* ---------- RESTORAN ---------- */
export function Restaurant({ t, lang, rating }: TLR) {
  return (
    <section id="restoran" className={`${container} scroll-mt-20 pt-10`}>
      <h2 className="font-display text-3xl font-semibold text-pine md:text-4xl">{t.restaurant.title}</h2>
      <p className="mt-1 text-muted md:text-[15px]">{fillRating(t.restaurant.sub, rating, lang)}</p>
      <div className="mt-5 overflow-hidden rounded-2xl bg-pine md:flex">
        <div className="p-6 md:flex-1 md:p-11">
          <div className="mb-3 text-xs font-bold tracking-[0.2em] text-[#c99a63]">{t.restaurant.kicker}</div>
          <h3 className="font-display text-2xl font-semibold text-ivory md:text-3xl">{t.restaurant.h}</h3>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#d6dbcb] md:text-base">{t.restaurant.desc}</p>
          <a
            href={`/${lang}/menu`}
            className="mt-5 inline-block rounded-xl bg-ivory px-5 py-3 text-sm font-bold text-pine"
          >
            {t.restaurant.cta}
          </a>
        </div>
        <Photo label="restoran" tone="#4a5a45" className="h-48 md:h-auto md:w-[420px]" labelDark />
      </div>
    </section>
  );
}

/* ---------- GALERİ ---------- */
export function Gallery({ t }: T) {
  return (
    <section id="galeri" className={`${container} scroll-mt-20 pt-10`}>
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-3xl font-semibold text-pine md:text-4xl">{t.gallery.title}</h2>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {galleryImages.map((g, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            {...responsiveImage(g.src, "(min-width: 768px) 25vw, 50vw")}
            alt={g.label}
            loading="lazy"
            className="h-28 w-full rounded-xl object-cover md:h-36"
          />
        ))}
      </div>
    </section>
  );
}

/* ---------- TRYSA HİKAYESİ ---------- */
export function TrysaStory({ t }: T) {
  return (
    <section id="trysa" className={`${container} scroll-mt-20 pt-10`}>
      <div className="overflow-hidden rounded-2xl bg-stone md:flex">
        <div className="p-6 md:flex-1 md:p-12">
          <div className="mb-3 text-xs font-bold tracking-[0.2em] text-[#d9a05b]">{t.trysaStory.kicker}</div>
          <h2 className="font-display text-2xl font-semibold leading-tight text-[#f1e9d8] md:text-3xl">{t.trysaStory.title}</h2>
          <p className="mt-3.5 max-w-md text-sm leading-relaxed text-[#d8cfb8] md:text-base">{t.trysaStory.desc}</p>
          <a
            href={t.trysaStory.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-block rounded-xl bg-[#d9a05b] px-5 py-3 text-sm font-bold text-[#2b2417]"
          >
            {t.trysaStory.cta}
          </a>
        </div>
        <div className="flex h-40 items-center justify-center bg-[#4a4335] text-xs text-[#b6a985] md:h-auto md:w-[420px]">
          FOTO: Trysa
        </div>
      </div>
    </section>
  );
}

/* ---------- DENEYİMLER ---------- */
export function Experiences({ t }: T) {
  return (
    <section className={`${container} pt-10`}>
      <h2 className="font-display text-3xl font-semibold text-pine md:text-4xl">{t.experiences.title}</h2>
      <p className="mt-1 text-muted md:text-[15px]">{t.experiences.sub}</p>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {t.experiences.items.map((e) => (
          <div key={e.t} className="rounded-2xl border border-line bg-white p-4 md:p-5">
            <div className="font-display text-base font-semibold text-pine md:text-xl">{e.t}</div>
            <div className="mt-1 text-xs text-muted md:text-sm">{e.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- MESAFELER ---------- */
export function Distances({ t }: T) {
  return (
    <section className={`${container} pt-10`}>
      <h2 className="font-display text-2xl font-semibold text-pine md:text-3xl">{t.distances.title}</h2>
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
              src="https://maps.google.com/maps?q=36.262198,29.890923&hl=tr&z=15&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-64 w-full border-0 md:h-full"
            />
          </div>
          <a
            href="https://www.google.com/maps/dir/?api=1&destination=36.262198,29.890923"
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

/* ---------- YORUMLAR ---------- */
export function Reviews({ t, google }: T & { google?: GoogleReviewsData | null }) {
  const items =
    google && google.reviews.length > 0
      ? google.reviews.map((r) => ({
          text: r.text,
          author: r.when ? `${r.author} · ${r.when}` : r.author,
        }))
      : [];
  if (items.length === 0) return null;
  return (
    <section className={`${container} pt-10`}>
      {google && google.count > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <Stars className="text-base" />
          <span className="font-bold text-pine">{google.rating.toLocaleString("tr-TR")}</span>
          <span className="text-sm text-muted">· {google.count} {t.reviews.suffix}</span>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3 md:gap-5">
        {items.map((r, i) => (
          <div key={i} className="rounded-2xl bg-[#f0e7d3] p-6">
            <Stars className="text-[15px]" />
            <p className="mt-2.5 line-clamp-6 font-display text-[17px] italic leading-snug text-pine">
              “{r.text}”
            </p>
            <div className="mt-3 text-sm font-semibold text-muted">— {r.author}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- SSS ---------- */
export function Faq({ t }: T) {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: t.faq.items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <section id="sss" className={`${container} scroll-mt-20 pt-10`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <h2 className="font-display text-2xl font-semibold text-pine md:text-3xl">{t.faq.title}</h2>
      <div className="mt-5 grid gap-3.5 md:grid-cols-2 md:items-start">
        {t.faq.items.map((f) => (
          <details
            key={f.q}
            className="group rounded-xl border border-line bg-white px-5 py-4"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <span className="text-sm font-semibold text-ink md:text-[15px]">{f.q}</span>
              <span className="text-xl text-clay transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ---------- CTA ---------- */
export function CtaBand({ t, lang }: TL) {
  return (
    <section id="rezervasyon" className={`${container} scroll-mt-20 py-12`}>
      <div className="rounded-2xl bg-clay p-8 text-center md:p-11">
        <h2 className="font-display text-2xl font-semibold text-white md:text-3xl">{t.cta.title}</h2>
        <p className="mt-1.5 text-sm text-[#fbe6d8] md:text-base">{t.cta.sub}</p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href={`/${lang}/rezervasyon`}
            className="rounded-xl bg-white px-8 py-4 text-base font-bold text-clay"
          >
            {t.cta.btn}
          </a>
          <a
            href={site.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-whatsapp px-8 py-4 text-base font-bold text-white"
          >
            <WhatsAppIcon className="h-5 w-5" />
            {t.cta.whatsapp}
          </a>
        </div>
      </div>
    </section>
  );
}
