import Link from "next/link";
import type { Dict, Locale } from "@/content/dictionaries";
import { place, site } from "@/content/site";
import LogoMark from "./LogoMark";
import MapEmbed from "./MapEmbed";

const footerLink = "inline-flex min-h-6 items-center underline underline-offset-2 hover:text-ivory";

export default function Footer({ t, lang }: { t: Dict; lang: Locale }) {
  return (
    // On phones the bottom padding keeps the end of the footer clear of the fixed MobileBar
    <footer
      id="iletisim"
      className="mt-auto bg-ink px-5 pt-10 pb-28 text-[#c9cdbf] md:px-8 md:pb-10"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 font-display text-xl font-bold tracking-wide text-ivory">
            <LogoMark id="logo-footer" className="h-6 w-auto" />
            TRYSA
          </div>
          <div className="space-y-1 text-sm leading-relaxed">
            <div>{site.address}</div>
            <div>
              {t.footer.hours} {site.restaurantHours.opens}–{site.restaurantHours.closes}
            </div>
            {/* Links get at least 24 px of height so they are easy to tap on a phone */}
            <div className="pt-1">
              ☎{" "}
              <a href={site.phoneHref} className={footerLink}>
                {site.phoneLabel}
              </a>{" "}
              · {t.footer.whatsappNote}
            </div>
            <div>
              Instagram:{" "}
              <a
                href={site.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className={footerLink}
              >
                {site.instagramLabel}
              </a>
            </div>
          </div>
          <div className="mt-4 text-xs text-[#a3a796]">
            © {new Date().getFullYear()} Trysa ·{" "}
            <Link href={`/${lang}/gizlilik`} className={footerLink}>
              {t.footer.rights}
            </Link>
          </div>
        </div>
        <div className="w-full md:w-80">
          <div className="overflow-hidden rounded-xl">
            <MapEmbed
              src={`https://maps.google.com/maps?q=${place.lat},${place.lng}&hl=${lang}&z=14&output=embed`}
              label={t.footer.showMap}
              className="h-44 w-full"
            />
          </div>
          <a
            href={place.directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${footerLink} mt-2 text-sm font-bold text-ivory`}
          >
            {t.distances.yolTarifi}
          </a>
        </div>
      </div>
    </footer>
  );
}
