import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/panel/AuthButtons";
import { getPanelContext } from "@/lib/panel-session";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const ctx = await getPanelContext();
  if (ctx?.session) redirect(ctx.staff?.status === "approved" ? "/panel" : "/panel/bekleniyor");
  const { hata } = await searchParams;

  return (
    <div className="pt-16 text-center">
      <div className="font-display text-4xl font-semibold text-pine">Trysa Panel</div>
      <p className="mx-auto mt-3 max-w-xs text-muted">
        Rezervasyon taleplerini buradan görür, onaylar ve misafire WhatsApp&apos;tan yazarsın.
      </p>
      {hata && (
        <p className="mt-6 rounded-xl bg-[#fbe4dc] p-3 text-sm font-semibold text-clay-dark">
          Giriş tamamlanamadı. Tekrar dene; sorun sürerse Emre&apos;ye haber ver.
        </p>
      )}
      <div className="mt-10">
        <GoogleSignInButton />
      </div>
      <p className="mt-6 text-sm text-muted">
        İlk girişte erişim isteğin yöneticiye gider; onaylanınca panel açılır.
      </p>
    </div>
  );
}
