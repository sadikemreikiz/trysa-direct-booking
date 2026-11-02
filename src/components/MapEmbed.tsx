"use client";

import { useState } from "react";

/**
 * Google Maps embed behind a click. The iframe pulls in about 0.5 MB of Google scripts,
 * so it is only loaded when the visitor asks for the map instead of on every page view.
 * Until then a drawn map (contour lines, a road, the pin) stands in, so the box reads as a map.
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
      className={`${className} group relative flex items-center justify-center overflow-hidden bg-pine`}
    >
      <svg
        viewBox="0 0 320 176"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      >
        <g fill="none" stroke="#405343" strokeWidth="1.5">
          <path d="M-10 64 C 20 18, 108 6, 136 44 S 104 118, 46 112 S -24 96, -10 64 Z" />
          <path d="M10 66 C 30 34, 96 26, 116 52 S 92 98, 50 96 S -2 88, 10 66 Z" />
          <path d="M34 66 C 46 48, 84 44, 94 58 S 80 82, 56 80 S 26 78, 34 66 Z" />
          <path d="M196 20 C 240 -6, 334 2, 334 52 S 286 116, 236 98 S 160 46, 196 20 Z" />
          <path d="M214 32 C 248 14, 312 20, 312 54 S 278 96, 244 84 S 188 50, 214 32 Z" />
          <path d="M234 44 C 256 34, 290 38, 290 56 S 270 76, 252 70 S 220 52, 234 44 Z" />
          <path d="M150 190 C 170 150, 250 132, 300 150 S 340 196, 330 210" />
          <path d="M184 194 C 200 166, 254 154, 292 168" />
        </g>
        <path
          d="M-10 140 C 50 124, 96 150, 150 126 S 236 74, 330 96"
          fill="none"
          stroke="#4b5f4e"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M-10 140 C 50 124, 96 150, 150 126 S 236 74, 330 96"
          fill="none"
          stroke="#7d8f7a"
          strokeWidth="1"
          strokeDasharray="6 6"
        />
      </svg>
      <span className="relative flex flex-col items-center gap-2">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-9 w-9 drop-shadow">
          <path
            d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Z"
            fill="#c1622f"
            stroke="#f6f1e7"
            strokeWidth="1.2"
          />
          <circle cx="12" cy="9" r="2.6" fill="#f6f1e7" />
        </svg>
        <span className="rounded-full bg-ivory px-4 py-2 text-sm font-bold text-pine shadow-md transition group-hover:bg-white">
          {label}
        </span>
      </span>
    </button>
  );
}
