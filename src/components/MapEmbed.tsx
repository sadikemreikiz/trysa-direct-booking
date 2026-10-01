"use client";

import { useState } from "react";

/**
 * Google Maps embed behind a click. The iframe pulls in about 0.5 MB of Google scripts,
 * so it is only loaded when the visitor asks for the map instead of on every page view.
 */
export default function MapEmbed({
  src,
  label,
  className = "",
}: {
  src: string;
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <iframe
        title="Trysa"
        src={src}
        referrerPolicy="no-referrer-when-downgrade"
        className={`${className} border-0`}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={`${className} flex items-center justify-center gap-2 bg-pine text-sm font-semibold text-ivory transition hover:bg-[#35463a]`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
        <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
      </svg>
      {label}
    </button>
  );
}
