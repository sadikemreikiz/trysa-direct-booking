import { NextResponse, type NextRequest } from "next/server";
import { locales, defaultLocale } from "@/lib/i18n";

function detectLocale(req: NextRequest): string {
  const accept = (req.headers.get("accept-language") || "").toLowerCase();
  const preferred = accept.split(",").map((s) => s.split(";")[0].trim().slice(0, 2));
  const found = preferred.find((p) => (locales as readonly string[]).includes(p));
  return found || defaultLocale;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return;

  const locale = detectLocale(req);
  req.nextUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(req.nextUrl);
}

export const config = {
  // Excludes _next, /api, /panel (staff panel, single language) and files with extensions (sitemap.xml, /img/...)
  matcher: ["/((?!_next|api/|panel|.*\\..*).*)"],
};
