import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { SITE_URL, SITE_INDEXABLE } from "@/lib/seo";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Trysa — Demre'de doğada ahşap oda, tiny house & kamp",
    template: "%s · Trysa",
  },
  description:
    "Antik Trysa'nın eteğinde, Demre ile Kaş arasında doğayla iç içe konaklama: ahşap odalar, tiny house, kamp ve ocakbaşı restoran. Kekova'ya 15 dk, yıl boyu açık.",
  keywords: [
    "Demre konaklama",
    "Demre kamping",
    "Kekova yakını pansiyon",
    "Kaş doğa konaklama",
    "tiny house Antalya",
    "Trysa Restaurant Camping",
  ],
  alternates: { canonical: "/" },
  // Launch'a kadar Google'a kapalı; SITE_INDEXABLE=true olunca açılır.
  robots: SITE_INDEXABLE
    ? { index: true, follow: true }
    : { index: false, follow: false },
  openGraph: {
    title: "Trysa — Demre'de doğada konaklama & ocakbaşı restoran",
    description:
      "Antik Trysa'nın eteğinde, doğayla baş başa. Ahşap odalar, tiny house, kamp ve restoran. Yıl boyu açık.",
    url: SITE_URL,
    siteName: "Trysa",
    locale: "tr_TR",
    type: "website",
    images: [{ url: "/img/hero.jpg", width: 1200, height: 900, alt: "Trysa" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Trysa — Demre'de doğada konaklama & ocakbaşı restoran",
    description:
      "Antik Trysa'nın eteğinde, doğayla baş başa. Yıl boyu açık.",
    images: ["/img/hero.jpg"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ivory text-ink">
        {children}
      </body>
    </html>
  );
}
