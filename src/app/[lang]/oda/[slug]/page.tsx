import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MobileBar from "@/components/MobileBar";
import { getDictionary, isLocale, defaultLocale, locales } from "@/content/dictionaries";
import { stays } from "@/content/site";
import { responsiveImage } from "@/lib/images";
import { getRoomPhotos } from "@/lib/room-photos";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ lang: string; slug: string }> };

export function generateStaticParams() {
  const rooms = stays.filter((s) => s.img);
  return locales.flatMap((lang) => rooms.map((s) => ({ lang, slug: s.slug })));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { lang, slug } = await params;
  const loc = isLocale(lang) ? lang : defaultLocale;
  const t = getDictionary(loc);
  const room = stays.find((s) => s.slug === slug);
  if (!room) return { title: "404" };
  const meta = pageMetadata(loc, `/oda/${room.slug}`, {
    title: room.title,
    description: t.room.descs[room.slug],
  });
  // Use the room's own cover photo in link previews
  if (room.img)
    meta.openGraph = { ...meta.openGraph, images: [{ url: room.img, alt: room.title }] };
  return meta;
}

export default async function RoomPage({ params }: Params) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const room = stays.find((s) => s.slug === slug);
  if (!room || !room.img) notFound();

  const photos = getRoomPhotos(slug);
  const [cover, ...rest] = photos;

  return (
    <>
      <Header t={t} lang={lang} />
      <main className="flex-1 pb-24 md:pb-0">
        <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
          <Link
            href={`/${lang}#konaklama`}
            className="text-sm font-semibold text-muted hover:text-clay"
          >
            {t.room.all}
          </Link>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-semibold text-pine md:text-4xl">
                {room.title}
              </h1>
              <p className="mt-1 text-muted">{t.room.descs[room.slug] ?? room.desc}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted">{t.room.gecelik}</div>
              <div className="font-display text-2xl font-bold text-pine">{room.price}</div>
            </div>
          </div>

          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              {...responsiveImage(cover, "(min-width: 768px) 1100px, 100vw")}
              alt={room.title}
              fetchPriority="high"
              className="mt-5 h-64 w-full rounded-2xl object-cover md:h-[420px]"
            />
          )}

          {rest.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
              {rest.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  {...responsiveImage(src, "(min-width: 768px) 33vw, 50vw")}
                  alt={`${room.title} ${i + 2}`}
                  loading="lazy"
                  decoding="async"
                  className="h-40 w-full rounded-xl object-cover md:h-52"
                />
              ))}
            </div>
          )}

          <h2 className="mt-10 font-display text-2xl font-semibold text-pine">
            {t.room.amenitiesTitle}
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 rounded-2xl border border-line bg-white p-5 md:grid-cols-4 md:p-6">
            {/* Room-only features (air conditioning…) first, then what every guest gets */}
            {[...(room.extras ?? []).map((x) => t.amenities.extras[x]), ...t.amenities.list].map(
              (a) => (
                <div key={a} className="flex items-center gap-2 text-sm text-pine/90">
                  <span className="text-clay">•</span> {a}
                </div>
              ),
            )}
          </div>

          <div className="mt-8 rounded-2xl bg-clay p-6 text-center md:p-8">
            <h2 className="font-display text-2xl font-semibold text-white">
              {room.title} {t.room.ctaTitle}
            </h2>
            <p className="mt-1.5 text-sm text-[#fdf1e8]">{t.room.ctaSub}</p>
            <Link
              href={`/${lang}/rezervasyon?unit=${room.slug}`}
              className="mt-4 inline-block rounded-xl bg-white px-8 py-3.5 text-base font-bold text-clay"
            >
              {t.room.ctaBtn}
            </Link>
          </div>
        </div>
      </main>
      <Footer t={t} lang={lang} />
      <MobileBar t={t} lang={lang} />
    </>
  );
}
