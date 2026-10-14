/**
 * Where product and hero images come from. Until real photos exist these are generated SVG
 * placeholders. To use real photos: put them in /public/products as p01.jpg, p01-b.jpg ... (front and
 * detail, 4:5, at least 1000px wide) and a 16:10 hero at /public/brand/hero.jpg, then set the values
 * below to "jpg" and the .jpg path. `node scripts/fetch-photos.mjs` does this for stock photos when
 * given an UNSPLASH_ACCESS_KEY.
 */
export const images = {
  productExt: "svg" as "svg" | "jpg" | "webp",
  hero: "/brand/hero.svg",
};
