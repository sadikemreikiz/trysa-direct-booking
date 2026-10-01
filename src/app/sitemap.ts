import type { MetadataRoute } from "next";
import { stays } from "@/content/site";
import { locales } from "@/lib/i18n";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const rooms = stays.filter((s) => s.img).map((s) => `/oda/${s.slug}`);
  const paths = ["", "/menu", "/rezervasyon", "/gizlilik", ...rooms];
  // Each URL also lists its equivalents in the other languages (so Google pairs the language versions).
  return locales.flatMap((l) =>
    paths.map((p) => ({
      url: `${SITE_URL}/${l}${p}`,
      lastModified: now,
      alternates: {
        languages: Object.fromEntries(locales.map((x) => [x, `${SITE_URL}/${x}${p}`])),
      },
    })),
  );
}
