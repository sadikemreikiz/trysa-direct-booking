import { container, type T } from "./shared";

export function WhyDirect({ t }: T) {
  return (
    <section className={`${container} pt-5`}>
      <div className="grid gap-6 rounded-2xl bg-pine p-6 md:grid-cols-3 md:p-8">
        {t.why.items.map((i) => (
          <div key={i.t}>
            <div className="mb-1.5 font-display text-lg font-semibold text-white">{i.t}</div>
            <div className="text-sm text-[#b9c0ac]">{i.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
