import { container, type T } from "./shared";

export function Experiences({ t }: T) {
  return (
    <section className={`${container} pt-10`}>
      <h2 className="font-display text-3xl font-semibold text-pine md:text-4xl">{t.experiences.title}</h2>
      <p className="mt-1 text-muted md:text-[15px]">{t.experiences.sub}</p>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {t.experiences.items.map((e) => (
          <div key={e.t} className="rounded-2xl border border-line bg-white p-4 md:p-5">
            <div className="font-display text-base font-semibold text-pine md:text-xl">{e.t}</div>
            <div className="mt-1 text-xs text-muted md:text-sm">{e.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
