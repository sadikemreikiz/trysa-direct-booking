import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import ClickTracker from "@/components/ClickTracker";
import { HOME_DESCRIPTION, HOME_TITLE, openGraphBase, pageAlternates, SITE_URL, SITE_INDEXABLE } from "@/lib/seo";
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

/** Telefon tarayıcısının üst çubuğu sitenin başlığıyla aynı renk (krem) */
export const viewport: Viewport = { themeColor: "#f6f1e7" };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const loc = isLocale(lang) ? lang : defaultLocale;
  const title = HOME_TITLE[loc];
  // Arama sonucu açıklaması: işletmenin tam adı + ne sunduğu (Google bunu yoksa sayfadan rastgele metin toplar)
  const description = HOME_DESCRIPTION[loc];

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
