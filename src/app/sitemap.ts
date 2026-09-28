import type { MetadataRoute } from "next";
import { stays } from "@/lib/site";
import { SITE_URL } from "@/lib/seo";
import { locales } from "@/i18n-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const rooms = stays.filter((s) => s.img).map((s) => `/oda/${s.slug}`);
  const paths = ["", "/menu", "/rezervasyon", "/gizlilik", ...rooms];
  return locales.flatMap((l) =>
    paths.map((p) => ({ url: `${SITE_URL}/${l}${p}`, lastModified: now })),
  );
}
