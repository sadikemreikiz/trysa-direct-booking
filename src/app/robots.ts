import type { MetadataRoute } from "next";
import { SITE_URL, SITE_INDEXABLE } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // Launch'a kadar Google'a kapalı (staging indexlenmesin).
  if (!SITE_INDEXABLE) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    // Yönetim paneli ve API arama motorlarına kapalı.
    rules: { userAgent: "*", allow: "/", disallow: ["/panel", "/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
