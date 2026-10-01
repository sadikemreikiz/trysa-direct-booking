import Link from "next/link";
import type { Dict, Locale } from "@/content/dictionaries";
import { place, site } from "@/content/site";
import LogoMark from "./LogoMark";
import MapEmbed from "./MapEmbed";

export default function Footer({ t, lang }: { t: Dict; lang: Locale }) {
  return (
    <footer id="iletisim" className="mt-auto bg-ink px-5 py-10 text-[#c9cdbf] md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 font-display text-xl font-bold tracking-wide text-ivory">
            <LogoMark id="logo-footer" className="h-6 w-auto" />
            TRYSA
          </div>
          <div className="space-y-1 text-sm leading-relaxed">
            <div>{site.address}</div>
            <div className="pt-1">
              ☎ {site.phoneLabel} · {t.footer.whatsappNote}
            </div>
            <div>Instagram: {site.instagramLabel}</div>
          </div>
          <div className="mt-4 text-xs text-[#a3a796]">
            © {new Date().getFullYear()} Trysa ·{" "}
            <Link href={`/${lang}/gizlilik`} className="underline hover:text-ivory">
              {t.footer.rights}
            </Link>
          </div>
        </div>
        <div className="w-full overflow-hidden rounded-xl md:w-72">
          <MapEmbed
            src={`https://maps.google.com/maps?q=${place.lat},${place.lng}&hl=${lang}&z=14&output=embed`}
            label={t.footer.showMap}
            className="h-32 w-full"
          />
        </div>
      </div>
    </footer>
  );
}
