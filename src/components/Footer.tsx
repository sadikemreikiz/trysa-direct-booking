import { site } from "@/lib/site";

export default function Footer() {
  return (
    <footer id="iletisim" className="mt-auto bg-ink px-5 py-10 text-[#c9cdbf] md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 font-display text-xl font-bold tracking-wide text-ivory">
            TRYSA
          </div>
          <div className="space-y-1 text-sm leading-relaxed">
            <div>{site.address}</div>
            <div className="pt-1">
              ☎ {site.phoneLabel} · WhatsApp mevcut
            </div>
            <div>Instagram: {site.instagramLabel}</div>
          </div>
          <div className="mt-4 text-xs text-[#6e7364]">
            © {new Date().getFullYear()} Trysa · Gizlilik / KVKK
          </div>
        </div>
        <div className="flex h-28 w-full items-center justify-center rounded-xl border border-dashed border-[#4a543e] bg-[#333a2e] text-xs text-[#8da089] md:w-72">
          HARİTA: konum
        </div>
      </div>
    </footer>
  );
}
