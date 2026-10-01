"use client";

export default function PrintButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-clay px-4 py-3 text-base font-bold text-white"
    >
      {children}
    </button>
  );
}
