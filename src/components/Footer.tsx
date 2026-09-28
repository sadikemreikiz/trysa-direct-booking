import Link from "next/link";
import { site } from "@/lib/site";
import type { Dict, Locale } from "@/dictionaries";

export default function Footer({ t, lang }: { t: Dict; lang: Locale }) {
  return (
    <footer id="iletisim" className="mt-auto bg-ink px-5 py-10 text-[#c9cdbf] md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 font-display text-xl font-bold tracking-wide text-ivory">
            TRYSA
          </div>
          <div className="space-y-1 text-sm leading-relaxed">
            <div>{site.address}</div>
            <div className="pt-1">
              ☎ {site.phoneLabel} · {t.footer.whatsappNote}
            </div>
            <div>Instagram: {site.instagramLabel}</div>
          </div>
          <div className="mt-4 text-xs text-[#6e7364]">
            © {new Date().getFullYear()} Trysa ·{" "}
            <Link href={`/${lang}/gizlilik`} className="underline hover:text-ivory">
              {t.footer.rights}
            </Link>
          </div>
        </div>
        <div className="w-full overflow-hidden rounded-xl md:w-72">
          <iframe
            title="Trysa"
            src="https://maps.google.com/maps?q=36.262198,29.890923&hl=tr&z=14&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-32 w-full border-0"
          />
        </div>
      </div>
    </footer>
  );
}
