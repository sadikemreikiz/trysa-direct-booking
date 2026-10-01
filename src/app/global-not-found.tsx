import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import NotFoundContent from "@/components/NotFoundContent";
import "./globals.css";

/**
 * For URLs that match no route (e.g. /tr/missing-page). The site and the panel have separate root
 * layouts, so no single layout can host the 404; this page brings its own html/body.
 */
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], display: "swap" });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "404 · Trysa",
  robots: { index: false, follow: true },
};

export default function GlobalNotFound() {
  return (
    <html lang="tr" className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-ivory text-ink">
        <NotFoundContent />
      </body>
    </html>
  );
}
