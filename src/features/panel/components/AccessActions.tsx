"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { decideAccessAction } from "@/features/panel/actions";

export function AccessActions({ userId, status }: { userId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function decide(next: "approved" | "revoked", role: "admin" | "staff") {
    setError(null);
    startTransition(async () => {
      const res = await decideAccessAction(userId, next, role);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  const btn = "rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-50";
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {status !== "approved" && (
          <>
            <button
              disabled={pending}
              onClick={() => decide("approved", "staff")}
              className={`${btn} bg-pine text-white`}
            >
              ✓ Onayla (işletme)
            </button>
            <button
              disabled={pending}
              onClick={() => decide("approved", "admin")}
              className={`${btn} border border-pine text-pine`}
            >
              ✓ Yönetici yap
            </button>
          </>
        )}
        {status !== "revoked" && (
          <button
            disabled={pending}
            onClick={() => decide("revoked", "staff")}
            className={`${btn} border border-clay text-clay`}
          >
            {status === "approved" ? "Erişimi kapat" : "Reddet"}
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm font-semibold text-clay">{error}</p>}
    </div>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="shrink-0 rounded-lg bg-pine px-3 py-1.5 text-xs font-bold text-white"
    >
      {copied ? "Kopyalandı ✓" : "Kopyala"}
    </button>
  );
}
