import Link from "next/link";
import { site } from "@/lib/site";
import { WhatsAppIcon } from "./icons";
import LangSwitcher from "./LangSwitcher";
import LogoMark from "./LogoMark";
import type { Dict, Locale } from "@/dictionaries";

export default function Header({ t, lang }: { t: Dict; lang: Locale }) {
  const nav = [
    { label: t.nav.konaklama, href: `/${lang}#konaklama` },
    { label: t.nav.restoran, href: `/${lang}#restoran` },
    { label: t.nav.trysa, href: `/${lang}#trysa` },
    { label: t.nav.galeri, href: `/${lang}#galeri` },
    { label: t.nav.sss, href: `/${lang}#sss` },
    { label: t.nav.iletisim, href: `/${lang}#iletisim` },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ivory/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 md:px-8">
        <Link
          href={`/${lang}`}
          aria-label="Trysa Restaurant Camping"
          className="flex items-center gap-2 font-display text-2xl font-bold tracking-wide text-pine"
        >
          <LogoMark id="logo-header" className="h-7 w-auto" />
          TRYSA
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-pine/80 lg:flex">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="hover:text-clay">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LangSwitcher current={lang} />
          <a
            href={site.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            // Telefonda alttaki sabit çubukta (MobileBar) zaten var
            className="hidden items-center gap-2 rounded-xl bg-whatsapp px-3 py-2 text-sm font-bold text-white md:inline-flex"
          >
            <WhatsAppIcon className="h-4 w-4" />
            <span className="hidden lg:inline">WhatsApp</span>
          </a>
          <Link
            href={`/${lang}/rezervasyon`}
            className="hidden rounded-xl bg-clay px-4 py-2 text-sm font-bold text-white md:inline-block"
          >
            {t.nav.rezervasyon}
          </Link>
        </div>
      </div>
    </header>
  );
}
