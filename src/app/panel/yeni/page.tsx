import PanelHeader from "@/components/panel/PanelHeader";
import ManualReservationForm from "@/components/panel/ManualReservationForm";
import { todayInDemre } from "@/db/reservations";
import { requireApprovedStaff } from "@/lib/panel-session";

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
