"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { availabilityAction, createManualAction } from "@/app/panel/actions";
import type { UnitAvailability } from "@/db/panel";
import { nights } from "./format";

const SOURCES = [
  { value: "phone", label: "📞 Telefon" },
  { value: "whatsapp", label: "💬 WhatsApp" },
  { value: "walk_in", label: "🚶 Kapıdan" },
] as const;

type Source = (typeof SOURCES)[number]["value"];

const fld = "mt-1.5 w-full rounded-xl border border-line bg-white p-3 text-base text-ink outline-none focus:border-clay";
const lbl = "block text-sm font-bold text-muted";
const chip = (active: boolean) =>
  `rounded-xl border-2 p-3 text-base font-semibold ${
    active ? "border-pine bg-[#e4eadd] text-pine" : "border-line bg-white text-ink"
  }`;

export default function ManualReservationForm({ today }: { today: string }) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [availability, setAvailability] = useState<UnitAvailability[] | null>(null);
  const [unitId, setUnitId] = useState<number | null>(null);
  const [source, setSource] = useState<Source>("phone");
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const datesValid = Boolean(checkIn && checkOut && checkOut > checkIn && checkIn >= today);

  // Reload free rooms when the dates change
  useEffect(() => {
    if (!datesValid) return;
    let cancelled = false;
    availabilityAction(checkIn, checkOut).then((list) => {
      if (cancelled) return;
      setAvailability(list);
      setUnitId((current) => (list.some((u) => u.id === current && u.free) ? current : null));
    });
    return () => {
      cancelled = true;
    };
  }, [checkIn, checkOut, datesValid]);

  const selected = availability?.find((u) => u.id === unitId);

  function save() {
    setError(null);
    if (!datesValid || unitId == null || !guestName.trim()) {
      setError("Tarih, oda ve misafir adı gerekli.");
      return;
    }
    startSaving(async () => {
      const res = await createManualAction({
        unitId,
        checkIn,
        checkOut,
        adults,
        children,
        guestName,
        phone,
        note,
        source,
      });
      if (res.ok) router.push(`/panel/talep/${res.id}`);
      else setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={lbl}>Giriş</span>
            <input
              type="date"
              className={fld}
              min={today}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </label>
          <label className="block">
            <span className={lbl}>Çıkış</span>
            <input
              type="date"
              className={fld}
              min={checkIn || today}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </label>
        </div>
        {datesValid && <p className="mt-2 text-sm text-muted">{nights(checkIn, checkOut)} gece</p>}
        {checkIn && checkIn < today && (
          <p className="mt-2 text-sm font-semibold text-clay-dark">Geçmiş bir tarihe rezervasyon eklenemez.</p>
        )}
      </section>

      {datesValid && (
        <section className="rounded-2xl bg-white p-4">
          <h2 className="mb-3 text-base font-bold text-pine">Oda</h2>
          {availability == null ? (
            <p className="text-muted">Yükleniyor…</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {availability.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  disabled={!u.free}
                  onClick={() => setUnitId(u.id)}
                  className={
                    u.free ? chip(unitId === u.id) : "rounded-xl border-2 border-line bg-[#f1ece2] p-3 text-base font-semibold text-muted"
                  }
                >
                  <span className={u.free ? "" : "line-through"}>{u.name}</span>
                  {!u.free && (
                    <span className="block text-xs font-normal">
                      {u.reason === "airbnb" ? "Airbnb'de dolu" : "Dolu"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="space-y-3 rounded-2xl bg-white p-4">
        <div>
          <span className={lbl}>Nereden geldi?</span>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {SOURCES.map((s) => (
              <button key={s.value} type="button" onClick={() => setSource(s.value)} className={chip(source === s.value)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className={lbl}>Misafirin adı</span>
          <input className={fld} value={guestName} onChange={(e) => setGuestName(e.target.value)} autoComplete="off" />
        </label>
        <label className="block">
          <span className={lbl}>Telefon (varsa)</span>
          <input type="tel" className={fld} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Counter label="Yetişkin" value={adults} min={1} onChange={setAdults} />
          <Counter label="Çocuk" value={children} min={0} onChange={setChildren} />
        </div>
        <label className="block">
          <span className={lbl}>Not (isteğe bağlı)</span>
          <textarea
            rows={2}
            className={fld}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Örn. Kapora alındı, geç gelecek"
          />
        </label>
      </section>

      {error && <p className="rounded-xl bg-[#fbe4dc] p-3 text-base font-semibold text-clay-dark">{error}</p>}

      <button
        type="button"
        disabled={saving}
        onClick={save}
        className="flex w-full items-center justify-center rounded-2xl bg-pine px-5 py-4 text-lg font-bold text-white disabled:opacity-50"
      >
        {saving ? "Kaydediliyor…" : `✓ Kaydet${selected ? ` · ${selected.name}` : ""}`}
      </button>
    </div>
  );
}

function Counter({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (n: number) => void;
}) {
  const btn = "h-11 w-11 rounded-xl border border-line bg-white text-xl font-bold text-pine disabled:opacity-40";
  return (
    <div>
      <span className={lbl}>{label}</span>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <span className="text-lg font-bold text-ink">{value}</span>
        <button type="button" className={btn} disabled={value >= 20} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}
