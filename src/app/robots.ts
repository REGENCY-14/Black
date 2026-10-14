import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/site";

/** Public pages are open; the admin area and customer-specific pages are not for crawlers. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/checkout", "/cart", "/pay", "/track", "/offline", "/_design"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
