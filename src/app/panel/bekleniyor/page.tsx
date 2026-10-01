import { redirect } from "next/navigation";
import { SignOutButton } from "@/features/panel/components/AuthButtons";
import { getPanelContext } from "@/features/panel/session";

export default async function PendingAccessPage() {
  const ctx = await getPanelContext();
  if (!ctx?.session) redirect("/panel/giris");
  if (ctx.staff?.status === "approved") redirect("/panel");

  const revoked = ctx.staff?.status === "revoked";
  return (
    <div className="pt-16 text-center">
      <div className="text-6xl">{revoked ? "🔒" : "⏳"}</div>
      <h1 className="mt-4 font-display text-3xl font-semibold text-pine">
        {revoked ? "Erişimin kapalı" : "Erişim isteğin iletildi"}
      </h1>
      <p className="mx-auto mt-3 max-w-xs text-muted">
        {revoked
          ? "Bu hesapla panele giriş izni yok. Bir yanlışlık olduğunu düşünüyorsan Emre'ye yaz."
          : "Emre onaylayınca bu sayfayı yenilemen yeterli — panel açılacak."}
      </p>
      <p className="mt-6 text-sm text-muted">Giriş yapılan hesap: {ctx.session.user.email}</p>
      <div className="mt-8">
        <SignOutButton />
      </div>
    </div>
  );
}
