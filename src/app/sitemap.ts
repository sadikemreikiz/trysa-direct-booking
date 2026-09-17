import type { MetadataRoute } from "next";
import { stays } from "@/lib/site";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = ["", "/menu", "/rezervasyon"].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
  }));
  const rooms = stays
    .filter((s) => s.img)
    .map((s) => ({
      url: `${SITE_URL}/oda/${s.slug}`,
      lastModified: now,
    }));
  return [...pages, ...rooms];
}
