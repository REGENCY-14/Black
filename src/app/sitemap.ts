import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/site";
import { getProducts } from "@/lib/catalog";

/**
 * Home, shop, about, contact and every published product. Policy pages are left out while they are
 * drafts, and transactional pages (cart, checkout, track, pay) are never listed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { items } = await getProducts({ limit: 100 });
  return [
    { url: `${siteUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/contact`, changeFrequency: "monthly", priority: 0.4 },
    ...items.map((p) => ({
      url: `${siteUrl}/shop/${p.slug}`,
      lastModified: p.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
