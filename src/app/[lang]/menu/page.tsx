import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MobileBar from "@/components/MobileBar";
import { getDictionary, isLocale, defaultLocale } from "@/content/dictionaries";
import { itemName, menu } from "@/content/menu";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const loc = isLocale(lang) ? lang : defaultLocale;
  const t = getDictionary(loc);
  return pageMetadata(loc, "/menu", { title: t.menu.title, description: t.menu.sub });
}

export default async function MenuPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);

  return (
    <>
      <Header t={t} lang={lang} />
      <main className="flex-1 pb-24 md:pb-0">
        <div className="mx-auto max-w-4xl px-5 py-10 md:px-8">
          <div className="mb-2 text-xs font-bold tracking-[0.2em] text-clay">{t.menu.kicker}</div>
          <h1 className="font-display text-4xl font-semibold text-pine md:text-5xl">
            {t.menu.title}
          </h1>
          <p className="mt-2 text-muted">{t.menu.sub}</p>

          <div className="mt-8 columns-1 gap-6 md:columns-2 [&>*]:mb-6 [&>*]:break-inside-avoid">
            {menu.map((c) => (
              <section key={c.cat} className="rounded-2xl border border-line bg-white p-5 md:p-6">
                <h2 className="font-display text-xl font-semibold text-pine">
                  {t.menu.cats[c.cat] ?? c.cat}
                </h2>
                <ul className="mt-3 divide-y divide-line/60">
                  {c.items.map((it) => (
                    <li key={it.n} className="flex items-baseline justify-between gap-3 py-2.5">
                      <span className="text-[15px] text-ink">
                        {itemName(it, lang)}
                        {it.d?.[lang] && (
                          <span className="block text-[13px] text-muted">{it.d[lang]}</span>
                        )}
                        {/* In translations also show the Turkish name (italic) so guests can find it on the printed menu */}
                        {lang !== "tr" && (
                          <span className="mt-0.5 block text-xs italic text-muted" lang="tr">
                            {it.n}
                          </span>
                        )}
                      </span>
                      <span className="whitespace-nowrap font-semibold text-pine">{it.p} ₺</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <p className="mt-6 text-xs text-muted">{t.menu.note}</p>
        </div>
      </main>
      <Footer t={t} lang={lang} />
      <MobileBar t={t} lang={lang} />
    </>
  );
}
