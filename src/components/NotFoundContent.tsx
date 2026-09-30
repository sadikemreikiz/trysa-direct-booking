import Link from "next/link";
import { site } from "@/lib/site";
import { WhatsAppIcon } from "./icons";
import LogoMark from "./LogoMark";

/** Bulunamayan sayfa — ziyaretçinin dili bilinmediği için üç dilde kısa metin. */
const TEXT = [
  { lang: "tr", title: "Aradığın sayfa burada değil", home: "Ana sayfaya dön" },
  { lang: "en", title: "This page isn't here", home: "Back to home" },
  { lang: "de", title: "Diese Seite gibt es nicht", home: "Zur Startseite" },
] as const;

export default function NotFoundContent() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-16 text-center">
      <Link href="/" className="flex flex-col items-center gap-3 font-display text-3xl font-semibold tracking-wide text-pine">
        <LogoMark id="logo-404" className="h-12 w-auto" />
        TRYSA
      </Link>
      <p className="mt-6 text-sm font-bold tracking-[0.2em] text-clay">404</p>
      <div className="mt-4 space-y-5">
        {TEXT.map((t) => (
          <div key={t.lang} lang={t.lang}>
            <h1 className="font-display text-2xl font-semibold text-pine">{t.title}</h1>
            <Link href={`/${t.lang}`} className="mt-1 inline-block text-sm font-bold text-clay hover:underline">
              {t.home} →
            </Link>
          </div>
        ))}
      </div>
      <a
        href={site.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-auto mt-10 flex items-center gap-2 rounded-xl bg-whatsapp px-5 py-3 text-sm font-bold text-white"
      >
        <WhatsAppIcon className="h-5 w-5" />
        WhatsApp
      </a>
    </main>
  );
}
