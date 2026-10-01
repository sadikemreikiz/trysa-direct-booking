import Link from "next/link";
import { listPanelReservations } from "@/features/panel/reservation-admin";
import { todayInDemre } from "@/lib/dates";
import PanelHeader from "@/features/panel/components/PanelHeader";
import PushToggle from "@/features/panel/components/PushToggle";
import { formatDay, localeFlag, nights, SLOW_RESPONSE_MS, sourceLabel, timeAgo } from "@/features/panel/format";
import { requireApprovedStaff } from "@/features/panel/session";
import { vapidPublicKey } from "@/features/notifications/push";

export default async function PanelHome() {
  const { db, staff } = await requireApprovedStaff();
  const now = new Date();
  const { pending, upcoming } = await listPanelReservations(db, todayInDemre(now));

  return (
    <>
      <PanelHeader staff={staff} />
      <p className="mb-4 text-muted">Merhaba {staff.name.split(" ")[0]} 👋</p>
      <PushToggle vapidPublicKey={vapidPublicKey()} />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          href="/panel/yeni"
          className="flex items-center justify-center rounded-2xl border-2 border-pine bg-white px-3 py-3.5 text-base font-bold text-pine"
        >
          + Rezervasyon ekle
        </Link>
        <Link
          href="/panel/takvim"
          className="flex items-center justify-center rounded-2xl border-2 border-pine bg-white px-3 py-3.5 text-base font-bold text-pine"
        >
          📅 Takvim
        </Link>
      </div>

      <h2 className="mb-3 mt-7 text-xs font-bold tracking-widest text-clay">
        YENİ TALEPLER {pending.length > 0 && `(${pending.length})`}
      </h2>
      {pending.length === 0 ? (
        <p className="rounded-2xl bg-white p-5 text-center text-muted">Bekleyen talep yok ✨</p>
      ) : (
        <ul className="space-y-3">
          {pending.map(({ r, unitName }) => {
            const slow = now.getTime() - r.createdAt.getTime() > SLOW_RESPONSE_MS;
            return (
              <li key={r.id}>
                <Link
                  href={`/panel/talep/${r.id}`}
                  className={`block rounded-2xl border-2 bg-white p-4 ${slow ? "border-clay" : "border-transparent"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg font-bold text-ink">
                      {localeFlag[r.locale]} {r.guestName}
                    </span>
                    <span className="text-2xl text-clay">›</span>
                  </div>
                  <div className="mt-1 text-base text-pine">
                    {unitName ?? "Oda seçmedi"} · {formatDay(r.checkIn)} – {formatDay(r.checkOut)} ·{" "}
                    {nights(r.checkIn, r.checkOut)} gece
                  </div>
                  <div className={`mt-1 text-sm ${slow ? "font-bold text-clay" : "text-muted"}`}>
                    {slow ? "⏱ " : ""}
                    {timeAgo(r.createdAt, now)} geldi · {r.adults + r.children} kişi
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mb-3 mt-8 text-xs font-bold tracking-widest text-clay">ONAYLI · YAKLAŞAN</h2>
      {upcoming.length === 0 ? (
        <p className="rounded-2xl bg-white p-5 text-center text-muted">Yaklaşan onaylı rezervasyon yok</p>
      ) : (
        <ul className="space-y-2">
          {upcoming.map(({ r, unitName }) => (
            <li key={r.id}>
              <Link href={`/panel/talep/${r.id}`} className="block rounded-2xl bg-white p-4">
                <div className="font-bold text-ink">
                  ✅ {unitName} · {r.guestName}
                  {r.source !== "website" && (
                    <span className="ml-1.5 text-sm font-normal text-muted">{sourceLabel[r.source]}</span>
                  )}
                </div>
                <div className="text-sm text-muted">
                  {formatDay(r.checkIn)} – {formatDay(r.checkOut)} · {r.reference}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
