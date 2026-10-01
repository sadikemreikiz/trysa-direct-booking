import { WhatsAppIcon } from "@/components/icons";
import { site } from "@/content/site";
import { container, type TL } from "./shared";

export function CtaBand({ t, lang }: TL) {
  return (
    <section id="rezervasyon" className={`${container} scroll-mt-20 py-12`}>
      <div className="rounded-2xl bg-clay p-8 text-center md:p-11">
        <h2 className="font-display text-2xl font-semibold text-white md:text-3xl">
          {t.cta.title}
        </h2>
        <p className="mt-1.5 text-sm text-[#fdf1e8] md:text-base">{t.cta.sub}</p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href={`/${lang}/rezervasyon`}
            className="rounded-xl bg-white px-8 py-4 text-base font-bold text-clay"
          >
            {t.cta.btn}
          </a>
          <a
            href={site.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-whatsapp px-8 py-4 text-base font-bold text-white"
          >
            <WhatsAppIcon className="h-5 w-5" />
            {t.cta.whatsapp}
          </a>
        </div>
      </div>
    </section>
  );
}
