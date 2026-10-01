import Link from "next/link";
import PrintButton from "@/features/panel/components/PrintButton";
import QrCard from "@/features/panel/components/QrCard";
import { isQrCardKey, QR_CARDS } from "@/features/panel/qr-cards";
import { requireApprovedStaff } from "@/features/panel/session";
import { SITE_URL } from "@/lib/seo";

/** Four cards per sheet (2 × 2), with cut lines between them, not along the paper's edge. */
const CUT_LINES = ["print:border-r print:border-b", "print:border-b", "print:border-r", ""];

/** Printable QR cards: four A6 cards of one kind on an A4 sheet, cut along the dashed lines. */
export default async function QrCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ tur?: string }>;
}) {
  await requireApprovedStaff();
  const { tur } = await searchParams;
  const kind = isQrCardKey(tur) ? tur : "menu";
  const card = QR_CARDS[kind];
  const url = `${SITE_URL}${card.path}`;

  return (
    <>
      {/* Only this page prints edge to edge on A4 */}
      <style>{"@page { size: A4; margin: 0; }"}</style>

      <div className="print:hidden">
        <Link href="/panel" className="text-lg font-bold text-clay">
          ← Talepler
        </Link>
        <h1 className="mt-4 mb-3 font-display text-3xl font-semibold text-pine">QR kartları</h1>

        <nav className="mb-4 grid grid-cols-2 gap-2" aria-label="Kart türü">
          {Object.entries(QR_CARDS).map(([key, c]) => (
            <Link
              key={key}
              href={`/panel/kartlar?tur=${key}`}
              aria-current={key === kind ? "page" : undefined}
              className={`rounded-2xl border-2 px-3 py-2.5 text-center ${
                key === kind ? "border-pine bg-pine text-white" : "border-line bg-white text-pine"
              }`}
            >
              <span className="block font-bold">{c.label}</span>
              <span className="block text-xs opacity-80">{c.where}</span>
            </Link>
          ))}
        </nav>

        <p className="mb-4 text-muted">{card.about}</p>
        <PrintButton>🖨 Yazdır (A4&apos;e 4 kart)</PrintButton>
        <p className="mt-3 mb-6 text-sm text-muted">
          iPhone&apos;da: Paylaş → Yazdır. Yazıcı yoksa oradan PDF olarak kaydedip fotokopiciye
          götürebilirsin. Kesik çizgilerden kes.
        </p>
      </div>

      {/* On screen one card as a preview (zoomed out to fit a phone); on paper the full sheet */}
      <div className="mx-auto grid w-[105mm] grid-cols-1 bg-white shadow-lg max-sm:[zoom:0.82] print:mx-0 print:h-[297mm] print:w-[210mm] print:grid-cols-2 print:grid-rows-2 print:shadow-none print:[zoom:1]">
        {CUT_LINES.map((cutLines, i) => (
          <div
            key={i}
            className={`h-[148.5mm] border-dashed border-sand ${cutLines} ${
              i > 0 ? "hidden print:block" : ""
            }`}
          >
            <QrCard card={card} url={url} id={`logo-card-${i}`} />
          </div>
        ))}
      </div>
    </>
  );
}
