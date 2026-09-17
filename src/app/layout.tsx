import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
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
  metadataBase: new URL("https://trysa.example"),
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
  openGraph: {
    title: "Trysa — Demre'de doğada konaklama & ocakbaşı restoran",
    description:
      "Antik Trysa'nın eteğinde, doğayla baş başa. Ahşap odalar, tiny house, kamp ve restoran. Yıl boyu açık.",
    locale: "tr_TR",
    type: "website",
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
