import Link from "next/link";
import { site } from "@/lib/site";
import { WhatsAppIcon } from "./icons";
import type { Dict, Locale } from "@/dictionaries";

export default function MobileBar({ t, lang }: { t: Dict; lang: Locale }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/95 px-4 py-2.5 shadow-[0_-6px_20px_rgba(44,58,46,0.12)] backdrop-blur md:hidden">
      <div className="flex items-center gap-2.5">
        <a
          href={site.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-whatsapp py-3 text-sm font-bold text-white"
        >
          <WhatsAppIcon className="h-4 w-4" />
          WhatsApp
        </a>
        <a
          href={site.phoneHref}
          className="rounded-xl bg-line/60 px-4 py-3 text-sm font-bold text-pine"
        >
          {t.mobileBar.call}
        </a>
        <Link
          href={`/${lang}/rezervasyon`}
          className="flex-1 rounded-xl bg-clay py-3 text-center text-sm font-bold text-white"
        >
          {t.mobileBar.rezervasyon}
        </Link>
      </div>
    </div>
  );
}
