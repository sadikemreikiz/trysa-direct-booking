import QRCode from "qrcode";
import LogoMark from "@/components/LogoMark";

/**
 * A printable table card (A6, a quarter of A4) with a QR code to the online menu. The link
 * has no language: /menu sends each guest to the menu in their phone's language.
 */
export default async function TableCard({ url, id }: { url: string; id: string }) {
  const qr = await QRCode.toString(url, {
    type: "svg",
    // The quiet zone around the code comes from the card's white space
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#22271f", light: "#0000" },
  });

  return (
    <div className="flex h-full flex-col items-center justify-between px-[10mm] py-[9mm] text-center">
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-[2.5mm] font-display text-[9mm] leading-none font-bold tracking-wide text-pine">
          <LogoMark id={id} className="h-[9mm] w-auto" />
          TRYSA
        </div>
        {/* lang="en": uppercase in a Turkish page would turn "i" into "İ" */}
        <div
          lang="en"
          className="mt-[1.5mm] text-[2.6mm] font-semibold tracking-[0.3em] text-muted uppercase"
        >
          Restaurant Camping
        </div>
      </div>

      <div className="font-display text-[6mm] leading-tight font-semibold text-clay">
        Menü · Menu · Speisekarte
      </div>

      <div
        className="size-[58mm] [&>svg]:size-full"
        role="img"
        aria-label={`QR: ${url}`}
        dangerouslySetInnerHTML={{ __html: qr }}
      />

      <div>
        <p className="text-[3mm] leading-snug text-muted">
          Kamerayla okut · Scan with your camera
          <br />
          Mit der Kamera scannen
        </p>
        <p className="mt-[1.5mm] text-[3.6mm] font-bold text-ink">
          {url.replace(/^https?:\/\//, "")}
        </p>
      </div>
    </div>
  );
}
