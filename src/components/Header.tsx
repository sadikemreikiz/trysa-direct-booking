import Link from "next/link";
import { site } from "@/lib/site";
import { WhatsAppIcon } from "./icons";

const nav = [
  { label: "Konaklama", href: "#konaklama" },
  { label: "Restoran", href: "#restoran" },
  { label: "Trysa", href: "#trysa" },
  { label: "Galeri", href: "#galeri" },
  { label: "SSS", href: "#sss" },
  { label: "İletişim", href: "#iletisim" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ivory/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 md:px-8">
        <Link
          href="/"
          className="font-display text-2xl font-bold tracking-wide text-pine"
        >
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
          <div className="hidden items-center gap-1 text-xs font-bold sm:flex">
            <span className="rounded-full bg-pine px-2.5 py-1 text-ivory">TR</span>
            <span className="px-1.5 py-1 text-muted">EN</span>
            <span className="px-1.5 py-1 text-muted">DE</span>
          </div>
          <a
            href={site.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-whatsapp px-3 py-2 text-sm font-bold text-white"
          >
            <WhatsAppIcon className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
          <a
            href="#rezervasyon"
            className="rounded-xl bg-clay px-4 py-2 text-sm font-bold text-white"
          >
            Rezervasyon
          </a>
        </div>
      </div>
    </header>
  );
}
