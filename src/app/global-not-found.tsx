import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import NotFoundContent from "@/components/NotFoundContent";
import "./globals.css";

/**
 * Hiçbir yola uymayan adresler için (ör. /tr/olmayan-sayfa). Site ve panel ayrı kök düzenlere
 * sahip olduğu için tek bir düzenden 404 kurulamaz; bu sayfa kendi html/body'sini getirir.
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
