import { container, type T } from "./shared";

export function Amenities({ t }: T) {
  return (
    <section className={`${container} pt-10`}>
      <h2 className="font-display text-2xl font-semibold text-pine md:text-3xl">
        {t.amenities.title}
      </h2>
      <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 rounded-2xl border border-line bg-white p-5 md:grid-cols-4 md:p-7">
        {t.amenities.list.map((a) => (
          <div key={a} className="flex items-center gap-2 text-sm text-pine/90 md:text-[15px]">
            <span className="text-clay">•</span> {a}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted/70">{t.amenities.note}</p>
    </section>
  );
}
