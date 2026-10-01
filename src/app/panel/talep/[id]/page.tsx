import { notFound } from "next/navigation";
import { availabilityForRange, getReservationDetail } from "@/features/panel/reservation-admin";
import PanelHeader from "@/features/panel/components/PanelHeader";
import ReservationActions from "@/features/panel/components/ReservationActions";
import { formatDay, localeFlag, nights, sourceLabel } from "@/features/panel/format";
import { getLockedDatesByType } from "@/features/airbnb-sync/airbnb-calendar";
import { requireApprovedStaff } from "@/features/panel/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const statusLabel: Record<string, string> = {
  pending: "Bekliyor",
  confirmed: "Onaylandı",
  declined: "Reddedildi",
  cancelled: "İptal edildi",
};

const eventTime = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

export default async function ReservationPage({ params }: { params: Promise<{ id: string }> }) {
  const { db, staff } = await requireApprovedStaff();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const detail = await getReservationDetail(db, id);
  if (!detail) notFound();
  const { r, unitName, events } = detail;

  const availability = await availabilityForRange(
    db,
    r.checkIn,
    r.checkOut,
    await getLockedDatesByType(),
    r.id,
  );

  return (
    <>
      <PanelHeader staff={staff} back />

      <section className="rounded-2xl bg-white p-5">
        <div className="text-xs font-bold tracking-widest text-clay">
          {r.reference} · {statusLabel[r.status]}
          {r.source !== "website" && ` · ${sourceLabel[r.source]}`}
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold text-pine">
          {localeFlag[r.locale]} {r.guestName}
        </h1>
        <dl className="mt-4 space-y-2 text-lg">
          <Row k="Tarih" v={`${formatDay(r.checkIn)} → ${formatDay(r.checkOut)} (${nights(r.checkIn, r.checkOut)} gece)`} />
          <Row k="Kişi" v={`${r.adults} yetişkin${r.children > 0 ? `, ${r.children} çocuk` : ""}`} />
          <Row
            k={r.status === "confirmed" ? "Oda" : "İstediği"}
            v={unitName ?? "Oda seçmedi"}
          />
          {r.phone && <Row k="Telefon" v={r.phone} />}
          {r.email && <Row k="E-posta" v={r.email} />}
        </dl>
        {r.note && (
          <p className="mt-4 rounded-xl bg-cream p-3 text-base text-ink">
            <span className="font-bold">{r.source === "website" ? "Misafirin notu" : "Not"}:</span> {r.note}
          </p>
        )}
      </section>

      <div className="mt-4">
        <ReservationActions
          reservation={{
            id: r.id,
            status: r.status,
            guestName: r.guestName,
            phone: r.phone,
            checkIn: r.checkIn,
            checkOut: r.checkOut,
            reference: r.reference,
            locale: r.locale,
            unitId: r.unitId,
          }}
          unitName={unitName}
          availability={availability}
        />
      </div>

      <h2 className="mb-2 mt-8 text-xs font-bold tracking-widest text-clay">GEÇMİŞ</h2>
      <ol className="space-y-2">
        {events.map((e) => (
          <li key={e.id} className="rounded-xl bg-white p-3 text-sm">
            <div className="text-muted">
              {eventTime.format(e.createdAt)} · {e.actorName}
            </div>
            <div className="font-semibold text-ink">
              {e.type === "created"
                ? e.actor === "guest"
                  ? "Talep geldi"
                  : "Elle eklendi"
                : e.type === "status_changed"
                  ? `${statusLabel[e.fromStatus ?? ""] ?? ""} → ${statusLabel[e.toStatus ?? ""] ?? ""}`
                  : "Not eklendi"}
            </div>
            {e.note && <div className="mt-1 text-ink">“{e.note}”</div>}
          </li>
        ))}
      </ol>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/60 pb-2">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-semibold text-ink">{v}</dd>
    </div>
  );
}
