/**
 * Trysa logo işareti: iki tepe ve arkasından doğan güneş (2026-09-30, Emre onayladı).
 * Güneş ve arka tepe, öndeki şeklin çevresinde ince bir boşlukla ayrılır (maske).
 * Aynı sayfada birden çok kez kullanılırsa her birine farklı `id` ver (maske kimlikleri çakışmasın).
 */
const FRONT = "M3 80 L 34.2 31.6 Q 38 25.8 41.8 31.6 L 73 80 Z";
const BACK = "M45 80 L 66.6 47.2 Q 69.5 42.8 72.4 47.2 L 97 80 Z";

export default function LogoMark({
  id,
  className = "",
  sun = "#c1622f",
}: {
  id: string;
  className?: string;
  sun?: string;
}) {
  return (
    <svg viewBox="0 20 100 62" className={className} aria-hidden="true" focusable="false">
      <defs>
        <mask id={`${id}-back`} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill="#fff" />
          <path d={FRONT} fill="#000" stroke="#000" strokeWidth="5" strokeLinejoin="round" />
        </mask>
        <mask id={`${id}-sun`} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill="#fff" />
          <path d={FRONT} fill="#000" stroke="#000" strokeWidth="5" strokeLinejoin="round" />
          <path d={BACK} fill="#000" stroke="#000" strokeWidth="5" strokeLinejoin="round" />
        </mask>
      </defs>
      <circle cx="63" cy="39" r="16" fill={sun} mask={`url(#${id}-sun)`} />
      <path d={BACK} fill="currentColor" mask={`url(#${id}-back)`} />
      <path d={FRONT} fill="currentColor" />
    </svg>
  );
}
