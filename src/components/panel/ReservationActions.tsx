"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  cancelAction,
  confirmAction,
  declineAction,
  noteAction,
  type ActionResult,
} from "@/app/panel/actions";
import type { UnitAvailability } from "@/db/panel";
import { guestMessage, whatsAppLink, type MessageKind } from "@/lib/whatsapp";

type Props = {
  reservation: {
    id: string;
    status: "pending" | "confirmed" | "declined" | "cancelled";
    guestName: string;
    phone: string;
    checkIn: string;
    checkOut: string;
    reference: string;
    locale: string;
    unitId: number | null;
  };
  unitName: string | null;
  availability: UnitAvailability[];
};

const bigBtn = "flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-lg font-bold";

export default function ReservationActions({ reservation: r, unitName, availability }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const requestedFree = availability.find((u) => u.id === r.unitId && u.free);
  const [unitId, setUnitId] = useState<number | null>(requestedFree ? requestedFree.id : null);

  const selectedName = availability.find((u) => u.id === unitId)?.name ?? unitName;

  function act(fn: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      else setNote("");
      router.refresh();
    });
  }

  const waHref = (kind: MessageKind) =>
    whatsAppLink(
      r.phone,
      guestMessage(kind, r, kind === "confirmed" ? (unitName ?? selectedName) : selectedName),
    );

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl bg-[#fbe4dc] p-3 text-base font-semibold text-clay-dark">{error}</p>
      )}

      {r.status === "pending" && (
        <>
          <Step n={1} title="Misafire yaz ya da ara">
            <WhatsAppButton href={waHref("reply")} label="WhatsApp'tan yaz" />
            <a href={`tel:${r.phone}`} className={`${bigBtn} mt-2 border border-line bg-white text-pine`}>
              📞 Ara · {r.phone}
            </a>
          </Step>

          <Step n={2} title="Oda seç">
            <div className="grid grid-cols-2 gap-2">
              {availability.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  disabled={!u.free}
                  onClick={() => setUnitId(u.id)}
                  className={`rounded-xl border-2 p-3 text-left text-base font-semibold ${
                    unitId === u.id
                      ? "border-pine bg-[#e4eadd] text-pine"
                      : u.free
                        ? "border-line bg-white text-ink"
                        : "border-line bg-[#f1ece2] text-muted"
                  }`}
                >
                  <span className={u.free ? "" : "line-through"}>{u.name}</span>
                  {!u.free && (
                    <span className="block text-xs font-normal">
                      {u.reason === "airbnb" ? "Airbnb'de dolu" : "Dolu"}
                    </span>
                  )}
                  {u.id === r.unitId && u.free && (
                    <span className="block text-xs font-normal text-clay">misafirin seçtiği</span>
                  )}
                </button>
              ))}
            </div>
          </Step>

          <Step n={3} title="Karar ver">
            <button
              type="button"
              disabled={pending || unitId == null}
              onClick={() => {
                if (unitId == null) return;
                if (!confirm(`${r.guestName} · ${selectedName} için rezervasyon onaylansın mı?`)) return;
                act(() => confirmAction(r.id, unitId, note));
              }}
              className={`${bigBtn} bg-pine text-white disabled:opacity-50`}
            >
              {pending ? "Kaydediliyor…" : `✓ Onayla${selectedName ? ` · ${selectedName}` : ""}`}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm(`${r.guestName} talebi reddedilsin mi? (Yer yok)`)) return;
                act(() => declineAction(r.id, note));
              }}
              className={`${bigBtn} mt-2 border-2 border-clay bg-white text-clay disabled:opacity-50`}
            >
              ✕ Yer yok, reddet
            </button>
          </Step>
        </>
      )}

      {r.status === "confirmed" && (
        <>
          <div className="rounded-2xl bg-[#e4eadd] p-4 text-lg font-bold text-pine">
            ✅ Onaylandı · {unitName}
          </div>
          {r.phone && <WhatsAppButton href={waHref("confirmed")} label="Onay mesajını gönder" />}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (confirm("Bu rezervasyonu iptal etmek istediğine emin misin? Oda tekrar boşa çıkar.")) {
                act(() => cancelAction(r.id, note));
              }
            }}
            className="w-full py-2 text-sm font-semibold text-clay underline"
          >
            Rezervasyonu iptal et
          </button>
        </>
      )}

      {r.status === "declined" && (
        <>
          <div className="rounded-2xl bg-[#f1ece2] p-4 text-lg font-bold text-muted">✕ Reddedildi</div>
          <WhatsAppButton href={waHref("declined")} label="Misafire bilgi ver" />
        </>
      )}

      {r.status === "cancelled" && (
        <div className="rounded-2xl bg-[#f1ece2] p-4 text-lg font-bold text-muted">İptal edildi</div>
      )}

      <div className="rounded-2xl bg-white p-4">
        <label className="block text-sm font-bold text-muted" htmlFor="note">
          Not (isteğe bağlı — geçmişe kaydedilir)
        </label>
        <textarea
          id="note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Örn. Telefonda konuştuk, geç gelecek"
          className="mt-2 w-full rounded-xl border border-line p-3 text-base outline-none focus:border-clay"
        />
        {note.trim() && (
          <button
            type="button"
            disabled={pending}
            onClick={() => act(() => noteAction(r.id, note))}
            className="mt-2 rounded-xl bg-pine px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            Sadece notu kaydet
          </button>
        )}
      </div>
    </div>
  );
}

function WhatsAppButton({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${bigBtn} bg-whatsapp text-white`}>
      💬 {label}
    </a>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-pine">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-clay text-sm text-white">
          {n}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}
