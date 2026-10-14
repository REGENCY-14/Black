// Downloads stock photos for the product catalogue (and the home hero) from a stock-photo API.
//
//   PEXELS_API_KEY=...     node scripts/fetch-photos.mjs     https://www.pexels.com/api/   (free, instant)
//   PIXABAY_API_KEY=...    node scripts/fetch-photos.mjs     https://pixabay.com/api/docs/ (free)
//   UNSPLASH_ACCESS_KEY=.. node scripts/fetch-photos.mjs     https://unsplash.com/developers (free)
//   add --refresh to download and resize everything again
//
// Why keys: stock sites block anonymous scraping, and the free open-licence aggregator (Openverse) has
// almost nothing for modern consumer products (tried: it returned wrong photos for most items), so
// the official APIs are the dependable route. All three licences allow commercial use and cropping.
//
// Only photos whose title/tags/description match a product's `must` words are accepted, and every
// pick is pinned in scripts/photos.config.json so reruns are deterministic. LOOK at the results before
// shipping them. These are PLACEHOLDERS: a store that sells real products should use its own photos
// (put them in public/products as p01.jpg, p01-b.jpg ... and see src/config/images.ts).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const CONFIG = "scripts/photos.config.json";
const cfg = JSON.parse(readFileSync(CONFIG, "utf8"));
const refresh = process.argv.includes("--refresh");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_BYTES = 30 * 1024 * 1024;
const UA = { "User-Agent": "preorder-store-placeholder-photos/1.0" };

/* ---------- providers: each returns [{ id, text, url, width, height, creator, creatorUrl, sourceUrl, license, licenseUrl, source }] ---------- */

const providers = {
  pexels: {
    key: process.env.PEXELS_API_KEY,
    async search(query, orientation) {
      const o = orientation === "tall" ? "portrait" : orientation === "wide" ? "landscape" : "square";
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=${o}&size=large&per_page=40`,
        { headers: { Authorization: this.key, ...UA } },
      );
      if (!res.ok) throw new Error(`Pexels ${res.status}`);
      return ((await res.json()).photos ?? []).map((p) => ({
        id: `pexels-${p.id}`,
        text: `${p.alt ?? ""} ${p.url ?? ""}`,
        url: p.src.original,
        width: p.width,
        height: p.height,
        creator: p.photographer,
        creatorUrl: p.photographer_url,
        sourceUrl: p.url,
        license: "Pexels License",
        licenseUrl: "https://www.pexels.com/license/",
        source: "pexels",
      }));
    },
  },
  pixabay: {
    key: process.env.PIXABAY_API_KEY,
    async search(query, orientation) {
      const o = orientation === "tall" ? "vertical" : orientation === "wide" ? "horizontal" : "all";
      const res = await fetch(
        `https://pixabay.com/api/?key=${this.key}&q=${encodeURIComponent(query)}&image_type=photo&orientation=${o}&safesearch=true&min_width=900&per_page=40`,
        { headers: UA },
      );
      if (!res.ok) throw new Error(`Pixabay ${res.status}`);
      return ((await res.json()).hits ?? []).map((h) => ({
        id: `pixabay-${h.id}`,
        text: `${h.tags ?? ""}`,
        url: h.largeImageURL,
        width: h.imageWidth,
        height: h.imageHeight,
        creator: h.user,
        creatorUrl: `https://pixabay.com/users/${h.user}-${h.user_id}/`,
        sourceUrl: h.pageURL,
        license: "Pixabay Content License",
        licenseUrl: "https://pixabay.com/service/license-summary/",
        source: "pixabay",
      }));
    },
  },
  unsplash: {
    key: process.env.UNSPLASH_ACCESS_KEY,
    async search(query, orientation) {
      const o = orientation === "tall" ? "portrait" : orientation === "wide" ? "landscape" : "squarish";
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=${o}&per_page=30&content_filter=high`,
        { headers: { Authorization: `Client-ID ${this.key}`, "Accept-Version": "v1", ...UA } },
      );
      if (!res.ok) throw new Error(`Unsplash ${res.status}`);
      return ((await res.json()).results ?? []).map((p) => ({
        id: `unsplash-${p.id}`,
        text: `${p.alt_description ?? ""} ${p.description ?? ""} ${(p.tags ?? []).map((t) => t.title).join(" ")}`,
        url: p.urls.raw,
        downloadLocation: p.links.download_location, // API terms: report the download before use
        width: p.width,
        height: p.height,
        creator: p.user.name,
        creatorUrl: `${p.user.links.html}?utm_source=preorder_store&utm_medium=referral`,
        sourceUrl: `${p.links.html}?utm_source=preorder_store&utm_medium=referral`,
        license: "Unsplash License",
        licenseUrl: "https://unsplash.com/license",
        source: "unsplash",
      }));
    },
  },
};

const provider = Object.entries(providers).find(([, p]) => p.key);

async function find(p, query, must, aspect, want, minSide) {
  const hits = await p.search(query, aspect);
  return hits
    .filter((h) => Math.min(h.width ?? 0, h.height ?? 0) >= minSide)
    .filter((h) => must.some((m) => h.text.toLowerCase().includes(m.toLowerCase())))
    .slice(0, want);
}

async function fetchResize(pick, width, height, file, p) {
  if (pick.downloadLocation && p?.key) {
    await fetch(pick.downloadLocation, { headers: { Authorization: `Client-ID ${p.key}`, ...UA } }).catch(
      () => undefined,
    );
  }
  const res = await fetch(pick.url, { headers: UA });
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error("file too large");
  await sharp(buf)
    .rotate()
    .resize(width, height, { fit: "cover", position: "attention" })
    .jpeg({ quality: 76, mozjpeg: true })
    .toFile(file);
}

mkdirSync("public/products", { recursive: true });
mkdirSync("public/brand", { recursive: true });
const credits = [];
const missing = [];

// ---- hero: already pinned (container ship, public domain). Re-download only on --refresh.
const hero = cfg.hero.picks?.[0];
if (hero) {
  if (refresh || !existsSync(cfg.hero.file))
    await fetchResize(hero, cfg.hero.width, cfg.hero.height, cfg.hero.file, null);
  credits.push({ file: cfg.hero.file.replace(/^public/, ""), label: "Home page hero", ...hero });
}

// ---- products
const needsSearch = Object.values(cfg.products).some((e) => !e.picks?.length);
if (needsSearch && !provider) {
  console.error(
    "\nNo product photos yet and no API key set. Set ONE of PEXELS_API_KEY, PIXABAY_API_KEY or UNSPLASH_ACCESS_KEY (all free) and run again.\n" +
      'Or skip stock photos: put your own files in public/products (p01.jpg, p01-b.jpg ...) and set images.productExt to "jpg" in src/config/images.ts.\n',
  );
  process.exit(1);
}
const [providerName, p] = provider ?? [];
if (provider) console.log("using", providerName);

for (const [id, entry] of Object.entries(cfg.products)) {
  if (!entry.picks?.length && p) {
    console.log("searching", id, ":", entry.query);
    const tall = await find(p, entry.query, entry.must, "tall", 2, 800);
    entry.picks =
      tall.length >= 2
        ? tall
        : [...tall, ...(await find(p, entry.query, entry.must, "square", 2 - tall.length, 800))].slice(0, 2);
    writeFileSync(CONFIG, JSON.stringify(cfg, null, 2) + "\n");
    await sleep(500);
  }
  if (!entry.picks?.length) {
    missing.push(id);
    continue;
  }
  const two = entry.picks.length === 1 ? [entry.picks[0], entry.picks[0]] : entry.picks;
  for (const [i, pick] of two.entries()) {
    const file = `public/products/${id}${i === 0 ? "" : "-b"}.jpg`;
    if (refresh || !existsSync(file)) {
      try {
        await fetchResize(pick, 1000, 1250, file, p);
      } catch (e) {
        console.log("  could not use", pick.id, String(e.message).slice(0, 80));
        missing.push(`${id}${i ? "-b" : ""}`);
        continue;
      }
    }
    credits.push({ file: file.replace(/^public/, ""), label: entry.query, ...pick });
  }
  console.log(
    id.padEnd(4),
    entry.picks
      .map((x) => x.id)
      .join(" | ")
      .padEnd(36),
    entry.query,
  );
}

writeFileSync(CONFIG, JSON.stringify(cfg, null, 2) + "\n");

const unique = [...new Map(credits.map((c) => [c.id, c])).values()].map(
  ({ file, label, title, creator, creatorUrl, sourceUrl, license, licenseVersion, licenseUrl, source }) => ({
    file,
    label,
    title: title ?? label,
    creator,
    creatorUrl: creatorUrl ?? "",
    sourceUrl: sourceUrl ?? "",
    license: String(license ?? ""),
    licenseVersion: licenseVersion ?? "",
    licenseUrl: licenseUrl ?? "",
    source: source ?? "",
  }),
);
writeFileSync(
  "src/config/photoCredits.ts",
  "// Credits for the stock photos in use, shown on /credits. Updated by scripts/fetch-photos.mjs.\n" +
    "export interface PhotoCredit {\n  file: string;\n  label: string;\n  title: string;\n  creator: string;\n  creatorUrl: string;\n  sourceUrl: string;\n  license: string;\n  licenseVersion: string;\n  licenseUrl: string;\n  source: string;\n}\n\n" +
    `export const photoCredits: PhotoCredit[] = ${JSON.stringify(unique, null, 2)};\n`,
);

if (missing.length) {
  console.log(
    "\nNO USABLE PHOTO for:",
    missing.join(", "),
    "\nEdit query/must in scripts/photos.config.json and rerun. The app still uses placeholders (images.productExt is unchanged).",
  );
} else {
  const f = "src/config/images.ts";
  writeFileSync(f, readFileSync(f, "utf8").replace(/productExt: "\w+"/, 'productExt: "jpg"'));
  console.log(
    "\nAll products have photos; src/config/images.ts now uses them. LOOK at them before you ship.",
  );
}
