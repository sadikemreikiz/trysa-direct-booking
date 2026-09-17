import {
  site,
  stays,
  amenities,
  experiences,
  distances,
  galleryImages,
  reviews,
  faqs,
} from "@/lib/site";
import { WhatsAppIcon } from "./icons";
import type { GoogleReviewsData } from "@/lib/reviews";

const container = "mx-auto max-w-6xl px-5 md:px-8";

/* Fotoğraf yer tutucusu — gerçek fotoğraflar buraya gelecek */
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
        FOTOĞRAF: {label}
      </span>
    </div>
  );
}

function Stars({ className = "" }: { className?: string }) {
  return <span className={`tracking-wide text-gold ${className}`}>★★★★★</span>;
}

/* ---------- HERO ---------- */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-pine">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/hero.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-pine/75" />
      <div className={`relative ${container} flex min-h-[440px] flex-col justify-center py-16 md:min-h-[520px] md:py-24`}>
        <p className="mb-4 text-xs font-bold tracking-[0.2em] text-[#c99a63]">
          DEMRE · DAVAZLAR · ANTALYA
        </p>
        <h1 className="max-w-2xl font-display text-4xl font-semibold leading-tight text-ivory md:text-6xl">
          Antik Trysa&apos;nın eteğinde, doğayla baş başa
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-[#d6dbcb] md:text-lg">
          Likya&apos;nın unutulmuş kentinin yanında; konaklama ve ocakbaşı restoran
          bir arada. Yıl boyu açık.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 self-start rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5">
          <Stars className="text-sm" />
          <span className="text-sm font-bold text-ivory">{site.rating}</span>
          <span className="text-xs text-[#b9c0ac]">· {site.reviewCount} Google yorumu</span>
        </div>
      </div>
    </section>
  );
}

/* ---------- TARİH HIZLI KUTUSU ---------- */
export function BookingBar() {
  const fld =
    "mt-1.5 w-full rounded-xl border border-line bg-white p-3 text-sm text-ink";
  const lbl = "block text-xs font-bold text-muted";
  return (
    <div className={`${container} relative z-20 -mt-8`}>
      <div className="rounded-2xl border border-line bg-white p-4 shadow-[0_14px_34px_rgba(44,58,46,0.14)] md:flex md:items-end md:gap-5">
        <label className="block flex-1">
          <span className={lbl}>Giriş tarihi</span>
          <input type="date" className={fld} />
        </label>
        <label className="mt-3 block flex-1 md:mt-0">
          <span className={lbl}>Çıkış tarihi</span>
          <input type="date" className={fld} />
        </label>
        <label className="mt-3 block flex-1 md:mt-0">
          <span className={lbl}>Kişi</span>
          <select className={fld}>
            <option>1 kişi</option>
            <option>2 kişi</option>
            <option>3 kişi</option>
            <option>4+ kişi</option>
          </select>
        </label>
        <a
          href="/rezervasyon"
          className="mt-3 block rounded-xl bg-clay px-7 py-3 text-center text-sm font-bold text-white md:mt-0"
        >
          Müsaitlik sor
        </a>
      </div>
    </div>
  );
}

/* ---------- İKİ YOL ---------- */
export function TwoPath() {
  return (
    <section className={`${container} pt-8`}>
      <div className="grid gap-4 md:grid-cols-2 md:gap-7">
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_10px_26px_rgba(44,58,46,0.08)]">
          <div className="relative h-48">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/img/rooms/kulube-1/kapak.jpg"
              alt="Trysa konaklama"
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <span className="absolute left-3.5 top-3.5 rounded-full bg-pine px-3 py-1.5 text-[11px] font-extrabold tracking-widest text-ivory">
              KONAKLAMA
            </span>
          </div>
          <div className="p-6 md:p-7">
            <div className="font-display text-2xl font-semibold text-pine">Doğada kal</div>
            <p className="mt-1.5 text-sm text-muted md:text-[15px]">
              Ahşap odalar, tiny house &amp; kamp · gecelik 1.150 ₺&apos;den
            </p>
            <a
              href="/rezervasyon"
              className="mt-4 inline-block rounded-xl bg-clay px-6 py-3 text-sm font-bold text-white"
            >
              Rezervasyon Talebi →
            </a>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-[0_10px_26px_rgba(44,58,46,0.08)]">
          <div className="relative h-48">
            <Photo label="ocakbaşı / açık hava" tone="#4a5a45" className="h-full" labelDark />
            <span className="absolute left-3.5 top-3.5 rounded-full bg-gold px-3 py-1.5 text-[11px] font-extrabold text-[#3a2e0a]">
              ★ {site.rating} · {site.reviewCount} YORUM
            </span>
          </div>
          <div className="p-6 md:p-7">
            <div className="font-display text-2xl font-semibold text-pine">Sofraya otur</div>
            <p className="mt-1.5 text-sm text-muted md:text-[15px]">
              Likya sofrası, ızgara &amp; taze balık · dışarıya da açık
            </p>
            <a
              href="/menu"
              className="mt-4 inline-block rounded-xl bg-pine px-6 py-3 text-sm font-bold text-ivory"
            >
              Menüyü Gör →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- NEDEN DİREKT ---------- */
export function WhyDirect() {
  const items = [
    { t: "Komisyonsuz en iyi fiyat", d: "Aracı yok — direkt bize, en uygun fiyata." },
    { t: "Direkt iletişim", d: "WhatsApp'tan anında yanıt, gerçek insanlar." },
    { t: "Esneklik", d: "Özel isteklerini doğrudan bize iletebilirsin." },
  ];
  return (
    <section className={`${container} pt-5`}>
      <div className="grid gap-6 rounded-2xl bg-pine p-6 md:grid-cols-3 md:p-8">
        {items.map((i) => (
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
export function Accommodation() {
  return (
    <section id="konaklama" className={`${container} scroll-mt-20 pt-10`}>
      <h2 className="font-display text-3xl font-semibold text-pine md:text-4xl">Konaklama</h2>
      <p className="mt-1 text-muted md:text-[15px]">Doğanın içinde, sade ve huzurlu seçenekler.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3 md:gap-6">
        {stays.map((s) => (
          <a
            key={s.slug}
            href={s.img ? `/oda/${s.slug}` : "/rezervasyon"}
            className="overflow-hidden rounded-2xl border border-line bg-white"
          >
            {s.img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.img}
                alt={s.title}
                loading="lazy"
                className="h-44 w-full object-cover"
              />
            ) : (
              <Photo label={s.photo} tone={s.tone} className="h-44" />
            )}
            <div className="p-5">
              <div className="font-display text-lg font-semibold md:text-xl">{s.title}</div>
              <p className="mt-1.5 text-sm text-muted">{s.desc}</p>
              <div className="mt-3.5 flex items-center justify-between">
                <span className="text-lg font-bold text-pine">{s.price}</span>
                <span className="text-sm font-bold text-clay">İncele →</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ---------- OLANAKLAR ---------- */
export function Amenities() {
  return (
    <section className={`${container} pt-10`}>
      <h2 className="font-display text-2xl font-semibold text-pine md:text-3xl">Olanaklar</h2>
      <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 rounded-2xl border border-line bg-white p-5 md:grid-cols-4 md:p-7">
        {amenities.map((a) => (
          <div key={a} className="flex items-center gap-2 text-sm text-pine/90 md:text-[15px]">
            <span className="text-clay">•</span> {a}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted/70">* Kesin liste netleştirilecek.</p>
    </section>
  );
}

/* ---------- RESTORAN ---------- */
export function Restaurant() {
  return (
    <section id="restoran" className={`${container} scroll-mt-20 pt-10`}>
      <h2 className="font-display text-3xl font-semibold text-pine md:text-4xl">Restoran</h2>
      <p className="mt-1 text-muted md:text-[15px]">
        {site.reviewCount} yorumun geldiği mutfak — misafirlere ve dışarıya açık.
      </p>
      <div className="mt-5 overflow-hidden rounded-2xl bg-pine md:flex">
        <div className="p-6 md:flex-1 md:p-11">
          <div className="mb-3 text-xs font-bold tracking-[0.2em] text-[#c99a63]">
            LİKYA SOFRASI
          </div>
          <h3 className="font-display text-2xl font-semibold text-ivory md:text-3xl">
            Ocakbaşı &amp; ev yemekleri
          </h3>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[#d6dbcb] md:text-base">
            Köy tavuğu, ızgaralar, taze balık, serpme kahvaltı ve gözleme. Açık hava
            bölümünde, doğanın içinde.
          </p>
          <a
            href="/menu"
            className="mt-5 inline-block rounded-xl bg-ivory px-5 py-3 text-sm font-bold text-pine"
          >
            Menüyü gör
          </a>
        </div>
        <Photo
          label="restoran / açık hava"
          tone="#4a5a45"
          className="h-48 md:h-auto md:w-[420px]"
          labelDark
        />
      </div>
    </section>
  );
}

/* ---------- GALERİ ---------- */
export function Gallery() {
  return (
    <section id="galeri" className={`${container} scroll-mt-20 pt-10`}>
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-3xl font-semibold text-pine md:text-4xl">Galeri</h2>
        <a href="#" className="text-sm font-bold text-clay">Tümünü gör →</a>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {galleryImages.map((g, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={g.src}
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
export function TrysaStory() {
  return (
    <section id="trysa" className={`${container} scroll-mt-20 pt-10`}>
      <div className="overflow-hidden rounded-2xl bg-stone md:flex">
        <div className="p-6 md:flex-1 md:p-12">
          <div className="mb-3 text-xs font-bold tracking-[0.2em] text-[#d9a05b]">
            TRYSA&apos;NIN HİKAYESİ
          </div>
          <h2 className="font-display text-2xl font-semibold leading-tight text-[#f1e9d8] md:text-3xl">
            Likya&apos;nın unutulmuş kentinin eteğindesiniz
          </h2>
          <p className="mt-3.5 max-w-md text-sm leading-relaxed text-[#d8cfb8] md:text-base">
            2.400 yıllık antik Trysa tam tepemizde. Dünyaca ünlü frizleri bugün
            Viyana&apos;da sergileniyor — ama kentin kendisi hâlâ burada. Tesisten
            yürüyerek harabelere çıkabilirsiniz.
          </p>
          <a
            href="#"
            className="mt-5 inline-block rounded-xl bg-[#d9a05b] px-5 py-3 text-sm font-bold text-[#2b2417]"
          >
            Trysa&apos;yı keşfet →
          </a>
        </div>
        <div className="flex h-40 items-center justify-center bg-[#4a4335] text-xs text-[#b6a985] md:h-auto md:w-[420px]">
          FOTOĞRAF: Trysa harabeleri / lahitler
        </div>
      </div>
    </section>
  );
}

/* ---------- DENEYİMLER ---------- */
export function Experiences() {
  return (
    <section className={`${container} pt-10`}>
      <h2 className="font-display text-3xl font-semibold text-pine md:text-4xl">Deneyimler</h2>
      <p className="mt-1 text-muted md:text-[15px]">Sadece yatak değil — doğa, tarih ve aile.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {experiences.map((e) => (
          <div key={e.title} className="rounded-2xl border border-line bg-white p-4 md:p-5">
            <div className="font-display text-base font-semibold text-pine md:text-xl">{e.title}</div>
            <div className="mt-1 text-xs text-muted md:text-sm">{e.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- MESAFELER ---------- */
export function Distances() {
  return (
    <section className={`${container} pt-10`}>
      <h2 className="font-display text-2xl font-semibold text-pine md:text-3xl">
        Nasıl gelinir &amp; mesafeler
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 md:gap-6">
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          {distances.map((d, i) => (
            <div
              key={d.place}
              className={`flex items-center justify-between px-4 py-3.5 ${
                i < distances.length - 1 ? "border-b border-line/60" : ""
              }`}
            >
              <span className="text-sm text-ink md:text-[15px]">{d.place}</span>
              <span className="text-sm font-bold text-muted">{d.time}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <div className="min-h-[16rem] flex-1 overflow-hidden rounded-2xl border border-line">
            <iframe
              title="Trysa konumu"
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
            Yol tarifi al →
          </a>
        </div>
      </div>
    </section>
  );
}

/* ---------- YORUMLAR ---------- */
export function Reviews({ google }: { google?: GoogleReviewsData | null }) {
  const items =
    google && google.reviews.length > 0
      ? google.reviews.map((r) => ({
          text: r.text,
          author: r.when ? `${r.author} · ${r.when}` : r.author,
        }))
      : reviews;
  return (
    <section className={`${container} pt-10`}>
      {google && google.count > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <Stars className="text-base" />
          <span className="font-bold text-pine">
            {google.rating.toLocaleString("tr-TR")}
          </span>
          <span className="text-sm text-muted">· {google.count} Google yorumu</span>
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
export function Faq() {
  return (
    <section id="sss" className={`${container} scroll-mt-20 pt-10`}>
      <h2 className="font-display text-2xl font-semibold text-pine md:text-3xl">
        Sıkça sorulanlar
      </h2>
      <div className="mt-5 grid gap-3.5 md:grid-cols-2">
        {faqs.map((q) => (
          <div
            key={q}
            className="flex items-center justify-between rounded-xl border border-line bg-white px-5 py-4"
          >
            <span className="text-sm font-semibold text-ink md:text-[15px]">{q}</span>
            <span className="text-xl text-clay">+</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- CTA ---------- */
export function CtaBand() {
  return (
    <section id="rezervasyon" className={`${container} scroll-mt-20 py-12`}>
      <div className="rounded-2xl bg-clay p-8 text-center md:p-11">
        <h2 className="font-display text-2xl font-semibold text-white md:text-3xl">
          Tarihlerini bize ilet
        </h2>
        <p className="mt-1.5 text-sm text-[#fbe6d8] md:text-base">
          Talebini gönder, en kısa sürede biz dönelim.
        </p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href="/rezervasyon"
            className="rounded-xl bg-white px-8 py-4 text-base font-bold text-clay"
          >
            Müsaitlik &amp; Rezervasyon
          </a>
          <a
            href={site.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-whatsapp px-8 py-4 text-base font-bold text-white"
          >
            <WhatsAppIcon className="h-5 w-5" />
            WhatsApp&apos;tan yaz
          </a>
        </div>
      </div>
    </section>
  );
}
