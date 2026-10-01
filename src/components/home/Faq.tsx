import { container, type T } from "./shared";

export function Faq({ t }: T) {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: t.faq.items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <section id="sss" className={`${container} scroll-mt-20 pt-10`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <h2 className="font-display text-2xl font-semibold text-pine md:text-3xl">{t.faq.title}</h2>
      <div className="mt-5 grid gap-3.5 md:grid-cols-2 md:items-start">
        {t.faq.items.map((f) => (
          <details
            key={f.q}
            className="group rounded-xl border border-line bg-white px-5 py-4"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <span className="text-sm font-semibold text-ink md:text-[15px]">{f.q}</span>
              <span className="text-xl text-clay transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
