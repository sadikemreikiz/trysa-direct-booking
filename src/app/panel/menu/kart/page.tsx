import Link from "next/link";
import { requireApprovedStaff } from "@/features/panel/session";
import PrintButton from "@/features/restaurant/components/PrintButton";
import TableCard from "@/features/restaurant/components/TableCard";
import { SITE_URL } from "@/lib/seo";

/** Four cards per sheet (2 × 2), with cut lines between them, not along the paper's edge. */
const CUT_LINES = ["print:border-r print:border-b", "print:border-b", "print:border-r", ""];

/** Printable QR table cards: four A6 cards on an A4 sheet, cut along the dashed lines. */
export default async function TableCardPage() {
  await requireApprovedStaff();
  const url = `${SITE_URL}/menu`;

  return (
    <>
      {/* Only this page prints edge to edge on A4 */}
      <style>{"@page { size: A4; margin: 0; }"}</style>

      <div className="print:hidden">
        <Link href="/panel/menu" className="text-lg font-bold text-clay">
          ← Menü
        </Link>
        <h1 className="mt-4 mb-1 font-display text-3xl font-semibold text-pine">
          Masa için QR kartı
        </h1>
        <p className="mb-4 text-muted">
          Misafir telefonuyla okutunca menü kendi dilinde açılır. Fiyat değişse de kart aynı kalır,
          yeniden basmak gerekmez.
        </p>
        <PrintButton>🖨 Yazdır (A4&apos;e 4 kart)</PrintButton>
        <p className="mt-3 mb-6 text-sm text-muted">
          iPhone&apos;da: Paylaş → Yazdır. Yazıcı yoksa oradan PDF olarak kaydedip fotokopiciye
          götürebilirsin. Kesik çizgilerden kes.
        </p>
      </div>

      {/* On screen one card as a preview (zoomed out to fit a phone); on paper the full sheet */}
      <div className="mx-auto grid w-[105mm] grid-cols-1 bg-white shadow-lg max-sm:[zoom:0.82] print:mx-0 print:[zoom:1] print:h-[297mm] print:w-[210mm] print:grid-cols-2 print:grid-rows-2 print:shadow-none">
        {CUT_LINES.map((cutLines, i) => (
          <div
            key={i}
            className={`h-[148.5mm] border-dashed border-sand ${cutLines} ${
              i > 0 ? "hidden print:block" : ""
            }`}
          >
            <TableCard url={url} id={`logo-card-${i}`} />
          </div>
        ))}
      </div>
    </>
  );
}
