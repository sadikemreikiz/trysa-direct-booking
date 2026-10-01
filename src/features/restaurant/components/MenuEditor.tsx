"use client";

import { useState, useTransition } from "react";
import type { MenuCategory, MenuItem } from "@/content/menu";
import {
  addMenuItemAction,
  deleteMenuItemAction,
  editMenuItemAction,
  setAvailableAction,
  setPriceAction,
  type MenuActionResult,
} from "@/features/restaurant/actions";
import type { MenuItemInput } from "@/features/restaurant/menu-store";

/** Staff menu editor: prices and "not available today" in one tap, details behind "Düzenle". */
export default function MenuEditor({ menu }: { menu: MenuCategory[] }) {
  return (
    <div className="space-y-6">
      {menu.map((c) => (
        <section key={c.cat}>
          <h2 className="mb-2 text-xs font-bold tracking-widest text-clay">
            {c.cat.toLocaleUpperCase("tr")}
          </h2>
          <ul className="space-y-2">
            {c.items.map((item) => (
              <ItemRow key={item.id} category={c.cat} item={item} />
            ))}
          </ul>
          <AddItem category={c.cat} />
        </section>
      ))}
    </div>
  );
}

function useAction() {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  function act(action: () => Promise<MenuActionResult>, done?: string, onSuccess?: () => void) {
    setMessage(null);
    start(async () => {
      const result = await action();
      if (result.ok) onSuccess?.();
      setMessage(
        result.ok ? (done ? { ok: true, text: done } : null) : { ok: false, text: result.error },
      );
    });
  }
  return { pending, message, act };
}

function Message({ message }: { message: { ok: boolean; text: string } | null }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className={`mt-2 text-sm font-semibold ${message.ok ? "text-[#1e6b3a]" : "text-clay-dark"}`}
    >
      {message.text}
    </p>
  );
}

function ItemRow({ category, item }: { category: string; item: MenuItem }) {
  const id = item.id!;
  // A price being typed; otherwise the saved one (which "Düzenle" may also change)
  const [draft, setDraft] = useState<string | null>(null);
  const price = draft ?? item.p;
  const [editing, setEditing] = useState(false);
  const { pending, message, act } = useAction();
  const available = item.available !== false;
  const priceChanged = price !== item.p;

  return (
    <li className={`rounded-2xl bg-white p-3 ${available ? "" : "ring-2 ring-[#f1c6b4]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`font-semibold ${available ? "text-ink" : "text-muted line-through"}`}>
            {item.n}
          </div>
          {item.en !== item.n && <div className="truncate text-xs text-muted">{item.en}</div>}
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => act(() => setAvailableAction(id, !available))}
          className={`shrink-0 rounded-xl px-3 py-2 text-sm font-bold ${
            available ? "bg-[#e4eadd] text-pine" : "bg-[#fbe4dc] text-clay-dark"
          }`}
          aria-pressed={!available}
        >
          {available ? "Var" : "Bugün yok"}
        </button>
      </div>

      <form
        className="mt-2 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (priceChanged)
            act(
              () => setPriceAction(id, Number(price)),
              "Fiyat kaydedildi ✓",
              () => setDraft(null),
            );
        }}
      >
        <label className="flex items-center gap-1.5 text-sm text-muted">
          Fiyat
          <input
            inputMode="numeric"
            value={price}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
            className="w-24 rounded-lg border border-line bg-ivory px-2.5 py-2 text-right text-base font-semibold text-ink"
            aria-label={`${item.n} fiyatı`}
          />
          ₺
        </label>
        {priceChanged && (
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-clay px-3 py-2 text-sm font-bold text-white"
          >
            Kaydet
          </button>
        )}
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="ml-auto text-sm font-semibold text-pine underline-offset-2 hover:underline"
        >
          {editing ? "Kapat" : "Düzenle"}
        </button>
      </form>
      <Message message={message} />

      {editing && (
        <ItemForm
          initial={{
            category,
            nameTr: item.n,
            nameEn: item.en === item.n ? "" : item.en,
            nameDe: item.de === item.n ? "" : item.de,
            // Untranslated descriptions arrive filled with the Turkish text; keep them empty
            descTr: item.d?.tr ?? "",
            descEn: item.d && item.d.en !== item.d.tr ? item.d.en : "",
            descDe: item.d && item.d.de !== item.d.tr ? item.d.de : "",
            price: item.p,
          }}
          submitLabel="Değişiklikleri kaydet"
          onSubmit={(input) => act(() => editMenuItemAction(id, input), "Kaydedildi ✓")}
          onDelete={() => {
            if (confirm(`"${item.n}" menüden silinsin mi?`)) act(() => deleteMenuItemAction(id));
          }}
          pending={pending}
        />
      )}
    </li>
  );
}

function AddItem({ category }: { category: string }) {
  const [open, setOpen] = useState(false);
  const { pending, message, act } = useAction();
  return (
    <div className="mt-2">
      {open ? (
        <div className="rounded-2xl border-2 border-dashed border-line bg-white p-3">
          <ItemForm
            initial={{ category, nameTr: "", price: "" }}
            submitLabel="Menüye ekle"
            onSubmit={(input) =>
              act(
                () => addMenuItemAction(input),
                "Eklendi ✓",
                () => setOpen(false),
              )
            }
            pending={pending}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-semibold text-clay underline-offset-2 hover:underline"
        >
          + {category} kategorisine yemek ekle
        </button>
      )}
      <Message message={message} />
    </div>
  );
}

const FIELDS: [key: keyof MenuItemInput, label: string, optional: boolean][] = [
  ["nameTr", "Türkçe ad", false],
  ["nameEn", "İngilizce ad", true],
  ["nameDe", "Almanca ad", true],
  ["descTr", "Türkçe açıklama", true],
  ["descEn", "İngilizce açıklama", true],
  ["descDe", "Almanca açıklama", true],
];

function ItemForm({
  initial,
  submitLabel,
  onSubmit,
  onDelete,
  pending,
}: {
  initial: MenuItemInput;
  submitLabel: string;
  onSubmit: (input: MenuItemInput) => void;
  onDelete?: () => void;
  pending: boolean;
}) {
  const [values, setValues] = useState(initial);
  const field = "mt-1 w-full rounded-lg border border-line bg-ivory px-2.5 py-2 text-sm text-ink";
  return (
    <form
      className="mt-3 space-y-2.5 border-t border-line/70 pt-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
    >
      {FIELDS.map(([key, label, optional]) => (
        <label key={key} className="block text-xs font-bold text-muted">
          {label}{" "}
          {optional && <span className="font-normal">(boş bırakılırsa Türkçesi görünür)</span>}
          <input
            value={String(values[key] ?? "")}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            required={!optional}
            className={field}
          />
        </label>
      ))}
      <label className="block text-xs font-bold text-muted">
        Fiyat (₺)
        <input
          inputMode="numeric"
          required
          value={String(values.price ?? "")}
          onChange={(e) => setValues((v) => ({ ...v, price: e.target.value.replace(/\D/g, "") }))}
          className={`${field} w-28`}
        />
      </label>
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-clay px-4 py-2 text-sm font-bold text-white"
        >
          {submitLabel}
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="ml-auto text-sm font-semibold text-clay-dark"
          >
            Menüden sil
          </button>
        )}
      </div>
    </form>
  );
}
