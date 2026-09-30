import Link from "next/link";
import type { StaffMember } from "@/db/staff";
import { SignOutButton } from "./AuthButtons";
import LogoMark from "../LogoMark";

export default function PanelHeader({ staff, back }: { staff: StaffMember; back?: boolean }) {
  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      {back ? (
        <Link href="/panel" className="text-lg font-bold text-clay">
          ← Talepler
        </Link>
      ) : (
        <Link
          href="/panel"
          className="flex items-center gap-2 whitespace-nowrap font-display text-2xl font-semibold text-pine"
        >
          <LogoMark id="logo-panel" className="h-6 w-auto" />
          Trysa<span className="hidden sm:inline"> Panel</span>
        </Link>
      )}
      <div className="flex items-center gap-4">
        {staff.role === "admin" && (
          <>
            <Link href="/panel/istatistik" className="text-sm font-semibold text-pine">
              İstatistik
            </Link>
            <Link href="/panel/erisim" className="text-sm font-semibold text-pine">
              Ayarlar
            </Link>
          </>
        )}
        <SignOutButton />
      </div>
    </header>
  );
}
