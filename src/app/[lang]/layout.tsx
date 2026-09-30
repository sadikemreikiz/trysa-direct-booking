import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import ClickTracker from "@/components/ClickTracker";
import { openGraphBase, pageAlternates, SITE_URL, SITE_INDEXABLE } from "@/lib/seo";
import { locales, isLocale, defaultLocale } from "@/dictionaries";
import "../globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const loc = isLocale(lang) ? lang : defaultLocale;
  const title =
    loc === "tr"
      ? "Trysa Restaurant Camping — Demre'de doğada konaklama & ocakbaşı"
      : loc === "de"
        ? "Trysa Restaurant Camping — Natur, Unterkunft & Grill in Demre"
        : "Trysa Restaurant Camping — Nature stay & grill in Demre, Antalya";

  // Arama sonucu açıklaması: işletmenin tam adı + ne sunduğu (Google bunu yoksa sayfadan rastgele metin toplar)
  const description =
    loc === "tr"
      ? "Trysa Restaurant Camping, Demre: ahşap odalar, tiny house, kamp & karavan alanı ve ocakbaşı restoran — antik Trysa'nın eteğinde, yıl boyu açık."
      : loc === "de"
        ? "Trysa Restaurant Camping in Demre, Antalya: Holzzimmer, Tiny House, Camping- & Wohnmobilplatz und Grillrestaurant am antiken Trysa. Ganzjährig geöffnet."
        : "Trysa Restaurant Camping in Demre, Antalya: wooden rooms, a tiny house, a camping & caravan area and a grill restaurant below ancient Trysa. Open all year.";

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: "%s · Trysa" },
    description,
    alternates: pageAlternates(loc, ""),
    robots: SITE_INDEXABLE
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: { ...openGraphBase(loc), title, description, url: `${SITE_URL}/${loc}` },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.jpg"],
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const htmlLang = isLocale(lang) ? lang : defaultLocale;
  return (
    <html
      lang={htmlLang}
      className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ivory text-ink">
        {children}
        {/* Ziyaretçi ölçümü (Vercel Web Analytics) — çerezsiz, sadece canlıda veri toplar */}
        <Analytics />
        {/* Dönüşüm ölçümü: WhatsApp / telefon tıklamaları → kendi veritabanımız */}
        <ClickTracker />
      </body>
    </html>
  );
}
