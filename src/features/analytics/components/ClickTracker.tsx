"use client";

import { useEffect } from "react";

/**
 * Counts WhatsApp and phone link clicks across the page (event delegation).
 * Doesn't touch the links themselves; links added later are tracked automatically.
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
        /* invalid referrer, ignore */
      }
      const payload = JSON.stringify({
        name,
        path: location.pathname,
        locale: ["tr", "en", "de"].includes(locale) ? locale : undefined,
        referrerHost,
      });
      // sendBeacon completes the request even if the page closes or navigates away.
      navigator.sendBeacon?.("/api/events", new Blob([payload], { type: "application/json" }));
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
