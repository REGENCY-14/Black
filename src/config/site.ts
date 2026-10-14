/**
 * Public origin of the site, used for canonical URLs, the sitemap, robots.txt and social previews.
 * Order: NEXT_PUBLIC_SITE_URL (set this once you have a real domain), then the address Vercel assigns
 * to this deployment, then localhost for development.
 */
const fromVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? (fromVercel ? `https://${fromVercel}` : "http://localhost:3000")
).replace(/\/$/, "");
