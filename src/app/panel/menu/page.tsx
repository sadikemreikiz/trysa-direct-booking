import Link from "next/link";
import PanelHeader from "@/features/panel/components/PanelHeader";
import { requireApprovedStaff } from "@/features/panel/session";
import MenuEditor from "@/features/restaurant/components/MenuEditor";
import { getMenuForPanel } from "@/features/restaurant/menu-store";

/** Restaurant menu: prices and "not available today" change on the public menu right away. */
export default async function MenuPanelPage() {
  const { db, staff } = await requireApprovedStaff();
  const menu = await getMenuForPanel(db);

  return (
    <>
      <PanelHeader staff={staff} back />
      <h1 className="mb-1 font-display text-3xl font-semibold text-pine">Restoran menüsü</h1>
      <p className="mb-4 text-muted">
        Fiyatı değiştirip <b>Kaydet</b>&apos;e bas; biten yemek için <b>Bugün yok</b>. Sitedeki menü
        hemen güncellenir.
      </p>
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/menu"
          target="_blank"
          className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-pine"
        >
          Sitede gör ↗
        </Link>
        <Link
          href="/panel/kartlar?tur=menu"
          className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold text-pine"
        >
          🖨 Masa için QR kartı
        </Link>
      </div>
      <MenuEditor menu={menu} />
    </>
  );
}
