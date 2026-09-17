"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, localeNames, isLocale, type Locale } from "@/i18n-config";

export default function LangSwitcher({ current }: { current: Locale }) {
  const pathname = usePathname() || "/";
  const parts = pathname.split("/");
  const rest = isLocale(parts[1]) ? "/" + parts.slice(2).join("/") : pathname;
  const suffix = rest === "/" ? "" : rest;

  return (
    <div className="flex items-center gap-1 text-xs font-bold">
      {locales.map((loc) => (
        <Link
          key={loc}
          href={`/${loc}${suffix}`}
          className={
            loc === current
              ? "rounded-full bg-pine px-2.5 py-1 text-ivory"
              : "px-1.5 py-1 text-muted hover:text-clay"
          }
        >
          {localeNames[loc]}
        </Link>
      ))}
    </div>
  );
}
