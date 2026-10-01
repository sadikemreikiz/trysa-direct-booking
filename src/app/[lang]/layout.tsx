import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { locales, isLocale, defaultLocale } from "@/content/dictionaries";
import ClickTracker from "@/features/analytics/components/ClickTracker";
import {
  HOME_DESCRIPTION,
  HOME_TITLE,
  openGraphBase,
  pageAlternates,
  SITE_URL,
  SITE_INDEXABLE,
} from "@/lib/seo";
import "@/app/globals.css";

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

/** Mobile browser toolbar uses the same colour as the site header (cream) */
export const viewport: Viewport = { themeColor: "#f6f1e7" };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const loc = isLocale(lang) ? lang : defaultLocale;
  const title = HOME_TITLE[loc];
  // Search result description: the business's full name + what it offers (otherwise Google picks random page text)
  const description = HOME_DESCRIPTION[loc];

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: "%s · Trysa" },
    description,
    alternates: pageAlternates(loc, ""),
    robots: SITE_INDEXABLE ? { index: true, follow: true } : { index: false, follow: false },
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
    <html lang={htmlLang} className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-ivory text-ink">
        {children}
        {/* Visitor analytics (Vercel Web Analytics): cookie-free, collects data only in production */}
        <Analytics />
        {/* Conversion tracking: WhatsApp / phone clicks → our own database */}
        <ClickTracker />
      </body>
    </html>
  );
}
