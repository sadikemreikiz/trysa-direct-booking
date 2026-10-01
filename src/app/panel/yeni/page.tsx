import PanelHeader from "@/features/panel/components/PanelHeader";
import ManualReservationForm from "@/features/panel/components/ManualReservationForm";
import { todayInDemre } from "@/lib/dates";
import { requireApprovedStaff } from "@/features/panel/session";

/** Manually add a booking that came in by phone, WhatsApp or walk-in. */
export default async function NewReservationPage() {
  const { staff } = await requireApprovedStaff();
  return (
    <>
      <PanelHeader staff={staff} back />
      <h1 className="mb-1 font-display text-3xl font-semibold text-pine">Rezervasyon ekle</h1>
      <p className="mb-4 text-muted">Telefon, WhatsApp ya da kapıdan gelen misafir. Kaydedince onaylı olur.</p>
      <ManualReservationForm today={todayInDemre(new Date())} />
    </>
  );
}
