import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "@/app/globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], display: "swap" });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Trysa Panel",
  robots: { index: false, follow: false },
  manifest: "/panel.webmanifest",
  appleWebApp: { capable: true, title: "Trysa Panel", statusBarStyle: "default" },
  icons: { apple: "/panel-icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#2c3a2e",
  width: "device-width",
  initialScale: 1,
};

/** Staff panel: a separate root layout from the rest of the site (no locale routing). */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full bg-ivory text-ink">
        <main className="mx-auto max-w-xl px-4 pb-16 pt-4">{children}</main>
      </body>
    </html>
  );
}
