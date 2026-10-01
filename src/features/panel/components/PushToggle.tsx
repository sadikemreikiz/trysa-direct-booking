"use client";

import { useEffect, useState } from "react";
import { savePushSubscriptionAction } from "@/features/panel/actions";

type State = "checking" | "unsupported" | "ios-install" | "off" | "on" | "denied" | "busy";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * "Turn on notifications": registers the service worker, asks for permission, saves the subscription on the server.
 * On iPhone notifications only work in a panel added to the home screen; in that case it shows how.
 */
export default function PushToggle({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    (async () => {
      const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setState(isIos && !standalone ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.register("/panel-sw.js", { scope: "/panel" });
      const existing = await reg.pushManager.getSubscription();
      setState(existing ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    if (!vapidPublicKey) return;
    setState("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.register("/panel-sw.js", { scope: "/panel" });
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const res = await savePushSubscriptionAction(json);
      setState(res.ok ? "on" : "off");
    } catch {
      setState("off");
    }
  }

  if (!vapidPublicKey || state === "checking" || state === "unsupported") return null;

  if (state === "on") {
    return <p className="text-sm font-semibold text-pine">🔔 Bu cihazda bildirimler açık</p>;
  }
  if (state === "ios-install") {
    return (
      <p className="rounded-xl bg-white p-3 text-sm text-muted">
        📲 iPhone&apos;da bildirim için: alttaki <b>Paylaş</b> düğmesi → <b>Ana Ekrana Ekle</b>. Sonra
        paneli ana ekrandaki ikondan aç.
      </p>
    );
  }
  if (state === "denied") {
    return (
      <p className="rounded-xl bg-white p-3 text-sm text-muted">
        🔕 Bildirim izni kapalı. Telefon ayarlarından bu site için bildirimlere izin ver.
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={enable}
      disabled={state === "busy"}
      className="w-full rounded-2xl bg-gold px-5 py-4 text-base font-bold text-ink disabled:opacity-60"
    >
      {state === "busy" ? "Açılıyor…" : "🔔 Yeni talepte telefonuma bildirim gelsin"}
    </button>
  );
}
