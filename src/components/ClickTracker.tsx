"use client";

import { useEffect } from "react";

/**
 * Sayfa genelinde WhatsApp ve telefon linki tıklamalarını sayar (event delegation).
 * Linklerin kendisine dokunmaz; sonradan eklenen linkler de otomatik ölçülür.
 */
export default function ClickTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const link = (e.target as Element | null)?.closest?.("a[href]");
      if (!link) return;
      const href = link.getAttribute("href") ?? "";
      const name = href.startsWith("https://wa.me/")
        ? "whatsapp_click"
        : href.startsWith("tel:")
          ? "phone_click"
          : null;
      if (!name) return;

      const locale = location.pathname.split("/")[1];
      let referrerHost: string | undefined;
      try {
        const host = document.referrer ? new URL(document.referrer).host : "";
        if (host && host !== location.host) referrerHost = host;
      } catch {
        /* geçersiz referrer — yok say */
      }
      const payload = JSON.stringify({
        name,
        path: location.pathname,
        locale: ["tr", "en", "de"].includes(locale) ? locale : undefined,
        referrerHost,
      });
      // sendBeacon sayfa kapansa/yönlense bile gönderimi tamamlar.
      navigator.sendBeacon?.("/api/events", new Blob([payload], { type: "application/json" }));
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
