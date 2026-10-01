"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import type { Dict, Locale } from "@/content/dictionaries";

// The chat itself is only downloaded when a guest opens it, so it costs nothing on page load.
const ConciergePanel = dynamic(() => import("./ConciergePanel"), { ssr: false });

/** Floating "Ask us" button that opens the AI concierge. */
export default function ConciergeLauncher({
  labels,
  lang,
}: {
  labels: Dict["concierge"];
  lang: Locale;
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  return (
    <>
      {!open && (
        <button
          ref={button}
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          className="fixed right-4 bottom-24 z-40 flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-pine text-sm font-bold text-ivory shadow-[0_10px_28px_rgba(34,39,31,0.28)] transition hover:bg-[#35463a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay md:right-6 md:bottom-6 md:h-auto md:w-auto md:px-4 md:py-3"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-6 w-6 fill-current md:h-5 md:w-5"
          >
            <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-4.5 3.6A.6.6 0 0 1 3.5 21V18H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm3 6.25a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Zm5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z" />
          </svg>
          {/* Icon only on phones (it floats over the page); the label stays for screen readers */}
          <span className="sr-only md:not-sr-only">{labels.open}</span>
        </button>
      )}
      {open && (
        <ConciergePanel
          labels={labels}
          lang={lang}
          onClose={() => {
            setOpen(false);
            // Give focus back to the button that opened the chat.
            requestAnimationFrame(() => button.current?.focus());
          }}
        />
      )}
    </>
  );
}
