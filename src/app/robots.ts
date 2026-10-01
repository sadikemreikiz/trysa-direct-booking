import type { MetadataRoute } from "next";
import { SITE_URL, SITE_INDEXABLE } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // Closed to Google until launch (so staging doesn't get indexed).
  if (!SITE_INDEXABLE) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    // The staff panel and the API are closed to search engines.
    rules: { userAgent: "*", allow: "/", disallow: ["/panel", "/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
