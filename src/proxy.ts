import { NextResponse, type NextRequest } from "next/server";
import { locales, negotiateLocale } from "@/lib/i18n";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasLocale = locales.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return;

  const locale = negotiateLocale(req.headers.get("accept-language"));
  req.nextUrl.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(req.nextUrl);
}

export const config = {
  // Excludes _next, /api, /panel (staff panel, single language) and files with extensions (sitemap.xml, /img/...)
  matcher: ["/((?!_next|api/|panel|.*\\..*).*)"],
};
