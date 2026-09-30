import Link from "next/link";
import type { StaffMember } from "@/db/staff";
import { SignOutButton } from "./AuthButtons";

export default function PanelHeader({ staff, back }: { staff: StaffMember; back?: boolean }) {
  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      {back ? (
        <Link href="/panel" className="text-lg font-bold text-clay">
          ← Talepler
        </Link>
      ) : (
        <Link href="/panel" className="font-display text-2xl font-semibold text-pine">
          Trysa Panel
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
