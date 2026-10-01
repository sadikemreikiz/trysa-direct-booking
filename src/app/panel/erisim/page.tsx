import { asc, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { units } from "@/db/schema";
import { icalToken } from "@/features/airbnb-sync/ical-feed";
import { AccessActions, CopyButton } from "@/features/panel/components/AccessActions";
import PanelHeader from "@/features/panel/components/PanelHeader";
import { SHARED_UNIT_SLUG } from "@/features/panel/reservation-admin";
import { requireApprovedStaff } from "@/features/panel/session";
import { listStaff } from "@/features/panel/staff";
import { SITE_URL } from "@/lib/seo";

const statusText = {
  pending: "⏳ Erişim istiyor",
  approved: "✅ Aktif",
  revoked: "🔒 Kapalı",
} as const;
const roleText = { admin: "Yönetici", staff: "İşletme" } as const;

export default async function SettingsPage() {
  const { db, staff } = await requireApprovedStaff();
  if (staff.role !== "admin") redirect("/panel");

  const people = await listStaff(db);
  const rooms = await db
    .select()
    .from(units)
    .where(ne(units.slug, SHARED_UNIT_SLUG))
    .orderBy(asc(units.sortOrder));
  const secret = process.env.BETTER_AUTH_SECRET ?? "";

  return (
    <>
      <PanelHeader staff={staff} back />
      <h1 className="font-display text-3xl font-semibold text-pine">Ayarlar</h1>

      <h2 className="mb-3 mt-6 text-xs font-bold tracking-widest text-clay">PANEL ERİŞİMİ</h2>
      <ul className="space-y-3">
        {people.map((p) => (
          <li key={p.userId} className="rounded-2xl bg-white p-4">
            <div className="font-bold text-ink">
              {p.name} {p.userId === staff.userId && <span className="text-muted">(sen)</span>}
            </div>
            <div className="text-sm text-muted">{p.email}</div>
            <div className="mt-1 text-sm">
              {statusText[p.status]} · {roleText[p.role]}
            </div>
            {p.userId !== staff.userId && <AccessActions userId={p.userId} status={p.status} />}
          </li>
        ))}
      </ul>

      <h2 className="mb-2 mt-8 text-xs font-bold tracking-widest text-clay">
        AIRBNB TAKVİM LİNKLERİ
      </h2>
      <p className="mb-3 text-sm text-muted">
        Airbnb&apos;de her ilanın{" "}
        <b>Takvim → Müsaitlik → Takvimleri bağla → Başka bir web sitesinden takvim içe aktar</b>{" "}
        bölümüne o odanın linkini yapıştır. Sitede onaylanan rezervasyonlar Airbnb&apos;de de dolu
        görünür.
      </p>
      {secret ? (
        <ul className="space-y-2">
          {rooms.map((u) => {
            const url = `${SITE_URL}/api/ical/${u.slug}?token=${icalToken(u.slug, secret)}`;
            return (
              <li key={u.id} className="rounded-2xl bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-ink">{u.name}</span>
                  <CopyButton text={url} />
                </div>
                <div className="mt-1 break-all text-xs text-muted">{url}</div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-clay">BETTER_AUTH_SECRET tanımlı değil.</p>
      )}
    </>
  );
}
