import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileBar from "@/components/MobileBar";
import { menu } from "@/lib/menu";
import { getDictionary, isLocale, defaultLocale } from "@/dictionaries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const t = getDictionary(isLocale(lang) ? lang : defaultLocale);
  return { title: t.menu.title, description: t.menu.sub };
}

export default async function MenuPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);

  return (
    <>
      <Header t={t} lang={lang} />
      <main className="flex-1 pb-24 md:pb-0">
        <div className="mx-auto max-w-4xl px-5 py-10 md:px-8">
          <div className="mb-2 text-xs font-bold tracking-[0.2em] text-clay">
            {t.menu.kicker}
          </div>
          <h1 className="font-display text-4xl font-semibold text-pine md:text-5xl">
            {t.menu.title}
          </h1>
          <p className="mt-2 text-muted">{t.menu.sub}</p>

          <div className="mt-8 columns-1 gap-6 md:columns-2 [&>*]:mb-6 [&>*]:break-inside-avoid">
            {menu.map((c) => (
              <section
                key={c.cat}
                className="rounded-2xl border border-line bg-white p-5 md:p-6"
              >
                <h2 className="font-display text-xl font-semibold text-pine">
                  {t.menu.cats[c.cat] ?? c.cat}
                </h2>
                <ul className="mt-3 divide-y divide-line/60">
                  {c.items.map((it) => (
                    <li
                      key={it.n}
                      className="flex items-baseline justify-between gap-3 py-2.5"
                    >
                      <span className="text-[15px] text-ink">{it.n}</span>
                      <span className="whitespace-nowrap font-semibold text-pine">
                        {it.p} ₺
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <p className="mt-6 text-xs text-muted/70">{t.menu.note}</p>
        </div>
      </main>
      <Footer t={t} lang={lang} />
      <MobileBar t={t} lang={lang} />
    </>
  );
}
