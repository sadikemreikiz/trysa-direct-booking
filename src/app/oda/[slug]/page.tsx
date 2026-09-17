import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileBar from "@/components/MobileBar";
import { stays, amenities } from "@/lib/site";
import { getRoomPhotos } from "@/lib/roomPhotos";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return stays.filter((s) => s.img).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const room = stays.find((s) => s.slug === slug);
  return {
    title: room ? room.title : "Oda",
    description: room?.desc,
  };
}

export default async function RoomPage({ params }: Params) {
  const { slug } = await params;
  const room = stays.find((s) => s.slug === slug);
  if (!room || !room.img) notFound();

  const photos = getRoomPhotos(slug);
  const [cover, ...rest] = photos;

  return (
    <>
      <Header />
      <main className="flex-1 pb-24 md:pb-0">
        <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
          <Link
            href="/#konaklama"
            className="text-sm font-semibold text-muted hover:text-clay"
          >
            ← Tüm odalar
          </Link>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-semibold text-pine md:text-4xl">
                {room.title}
              </h1>
              <p className="mt-1 text-muted">{room.desc}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted">gecelik</div>
              <div className="font-display text-2xl font-bold text-pine">
                {room.price}
              </div>
            </div>
          </div>

          {/* Kapak */}
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={room.title}
              className="mt-5 h-64 w-full rounded-2xl object-cover md:h-[420px]"
            />
          )}

          {/* Diğer fotoğraflar */}
          {rest.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
              {rest.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt={`${room.title} fotoğraf ${i + 2}`}
                  loading="lazy"
                  className="h-40 w-full rounded-xl object-cover md:h-52"
                />
              ))}
            </div>
          )}

          {/* Olanaklar */}
          <h2 className="mt-10 font-display text-2xl font-semibold text-pine">
            Olanaklar
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 rounded-2xl border border-line bg-white p-5 md:grid-cols-4 md:p-6">
            {amenities.map((a) => (
              <div key={a} className="flex items-center gap-2 text-sm text-pine/90">
                <span className="text-clay">•</span> {a}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-8 rounded-2xl bg-clay p-6 text-center md:p-8">
            <h2 className="font-display text-2xl font-semibold text-white">
              {room.title} için tarih uygun mu?
            </h2>
            <p className="mt-1.5 text-sm text-[#fbe6d8]">
              Talebini gönder, müsaitliği teyit edip dönelim.
            </p>
            <Link
              href="/rezervasyon"
              className="mt-4 inline-block rounded-xl bg-white px-8 py-3.5 text-base font-bold text-clay"
            >
              Rezervasyon Talebi
            </Link>
          </div>
        </div>
      </main>
      <Footer />
      <MobileBar />
    </>
  );
}
