import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getDictionary, isLocale, defaultLocale } from "@/content/dictionaries";
import { privacy, PRIVACY_CONTACT, PRIVACY_UPDATED } from "@/content/privacy";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const loc = isLocale(lang) ? lang : defaultLocale;
  const p = privacy[loc];
  const description = p.intro.length > 155 ? `${p.intro.slice(0, 152).trimEnd()}…` : p.intro;
  return pageMetadata(loc, "/gizlilik", { title: p.title, description });
}

export default async function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  const p = privacy[lang];

  return (
    <>
      <Header t={t} lang={lang} />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-5 py-10 md:px-8">
          <h1 className="font-display text-3xl font-semibold text-pine md:text-4xl">{p.title}</h1>
          <p className="mt-2 text-sm text-muted">
            {p.updated}: {PRIVACY_UPDATED}
          </p>
          <p className="mt-6 leading-relaxed text-ink">{p.intro}</p>
          {p.sections.map((s) => (
            <section key={s.h} className="mt-8">
              <h2 className="font-display text-xl font-semibold text-pine">{s.h}</h2>
              {s.p.map((para) => (
                <p key={para} className="mt-3 leading-relaxed text-ink">
                  {para}
                </p>
              ))}
            </section>
          ))}
          <p className="mt-10 rounded-2xl bg-white p-5 text-ink">
            ✉️{" "}
            <a href={`mailto:${PRIVACY_CONTACT}`} className="font-semibold text-clay underline">
              {PRIVACY_CONTACT}
            </a>
          </p>
        </article>
      </main>
      <Footer t={t} lang={lang} />
    </>
  );
}
