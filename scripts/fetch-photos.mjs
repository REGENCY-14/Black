// Finds and downloads openly licensed stock photos for the product catalogue and the home hero.
//
//   node scripts/fetch-photos.mjs            pin picks for anything missing, download what is not on disk
//   node scripts/fetch-photos.mjs --refresh  download and resize everything again
//
// Source: Openverse (https://openverse.org), whose API is open to scripts and returns the licence and
// creator of every image. Only licences that allow commercial use AND editing are accepted (CC0,
// public domain, CC BY), because every photo is cropped and resized. CC BY needs credit, so the credits
// are written to src/config/photoCredits.ts and shown on the public /credits page.
//
// Picks are pinned in scripts/photos.config.json, so reruns are deterministic. These are PLACEHOLDERS:
// a store that sells real products should use its own product photos (see src/config/images.ts).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const CONFIG = "scripts/photos.config.json";
const cfg = JSON.parse(readFileSync(CONFIG, "utf8"));
const refresh = process.argv.includes("--refresh");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LICENCES = "cc0,pdm,by";
const MAX_BYTES = 25 * 1024 * 1024;

let lastCall = 0;
async function api(path) {
  // anonymous Openverse use is rate limited (about 20 a minute): stay well under it
  const wait = 3300 - (Date.now() - lastCall);
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`https://api.openverse.org/v1${path}`, { headers: { "User-Agent": "preorder-store-placeholder-photos/1.0" } });
    if (res.status === 429) {
      console.log("  rate limited, waiting 30s");
      await sleep(30_000);
      continue;
    }
    if (!res.ok) throw new Error(`Openverse ${res.status} for ${path}`);
    return res.json();
  }
  throw new Error("Openverse kept rate limiting; try again in a few minutes");
}

const text = (r) => `${r.title ?? ""} ${(r.tags ?? []).map((t) => t.name).join(" ")}`.toLowerCase();

async function find(query, must, aspect, want, minSide) {
  const picks = [];
  const seen = new Set();
  for (let page = 1; page <= 3 && picks.length < want; page++) {
    const q = `/images/?q=${encodeURIComponent(query)}&license=${LICENCES}&category=photograph&extension=jpg&aspect_ratio=${aspect}&page_size=20&page=${page}&mature=false&filter_dead=true`;
    const data = await api(q);
    for (const r of data.results ?? []) {
      if (picks.length >= want) break;
      if (seen.has(r.id) || !r.url || r.mature) continue;
      seen.add(r.id);
      if (Math.min(r.width ?? 0, r.height ?? 0) < minSide) continue;
      if (!must.some((m) => text(r).includes(m.toLowerCase()))) continue;
      picks.push({
        id: r.id,
        url: r.url,
        title: r.title ?? "",
        creator: r.creator ?? "Unknown",
        creatorUrl: r.creator_url ?? "",
        sourceUrl: r.foreign_landing_url ?? "",
        license: r.license,
        licenseVersion: r.license_version ?? "",
        licenseUrl: r.license_url ?? "",
        source: r.source ?? "",
        width: r.width,
        height: r.height,
      });
    }
    if (!data.results?.length || page >= (data.page_count ?? 1)) break;
  }
  return picks;
}

async function fetchResize(pick, width, height, file) {
  const res = await fetch(pick.url, { headers: { "User-Agent": "preorder-store-placeholder-photos/1.0" } });
  if (!res.ok) throw new Error(`download ${res.status}: ${pick.url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error(`too large: ${pick.url}`);
  await sharp(buf).rotate().resize(width, height, { fit: "cover", position: "attention" }).jpeg({ quality: 76, mozjpeg: true }).toFile(file);
}

mkdirSync("public/products", { recursive: true });
mkdirSync("public/brand", { recursive: true });
const credits = [];
const missing = [];

// ---- hero
{
  const h = cfg.hero;
  if (!h.picks?.length) {
    console.log("searching hero:", h.query);
    h.picks = await find(h.query, h.must, "wide", 1, 1100);
  }
  if (h.picks[0]) {
    if (refresh || !existsSync(h.file)) await fetchResize(h.picks[0], h.width, h.height, h.file);
    credits.push({ file: h.file.replace(/^public/, ""), label: "Home page hero", ...h.picks[0] });
    console.log("hero", h.picks[0].id.slice(0, 8), "|", h.picks[0].title.slice(0, 50), "|", h.picks[0].license);
  } else missing.push("hero");
  writeFileSync(CONFIG, JSON.stringify(cfg, null, 2) + "\n");
}

// ---- products: two photos each (front and detail), cropped to 4:5
for (const [id, entry] of Object.entries(cfg.products)) {
  if (!entry.picks?.length) {
    console.log("searching", id, ":", entry.query);
    entry.picks = await find(entry.query, entry.must, "tall", 2, 800);
    if (entry.picks.length < 2) entry.picks.push(...(await find(entry.query, entry.must, "square", 2 - entry.picks.length, 800)));
    writeFileSync(CONFIG, JSON.stringify(cfg, null, 2) + "\n");
  }
  if (entry.picks.length === 0) {
    missing.push(id);
    continue;
  }
  // a product needs two photos: reuse the first if only one was found
  const two = entry.picks.length === 1 ? [entry.picks[0], entry.picks[0]] : entry.picks;
  for (const [i, pick] of two.entries()) {
    const file = `public/products/${id}${i === 0 ? "" : "-b"}.jpg`;
    if (refresh || !existsSync(file)) {
      try {
        await fetchResize(pick, 1000, 1250, file);
      } catch (e) {
        console.log("  could not use", pick.id.slice(0, 8), String(e.message).slice(0, 80));
        missing.push(`${id}${i ? "-b" : ""}`);
        continue;
      }
    }
    credits.push({ file: file.replace(/^public/, ""), label: entry.query, ...pick });
  }
  console.log(id.padEnd(4), entry.picks.map((p) => `${p.id.slice(0, 6)} ${p.license}`).join(" | ").padEnd(34), entry.picks[0].title.slice(0, 44));
}

writeFileSync(CONFIG, JSON.stringify(cfg, null, 2) + "\n");

// credits shown on /credits (needed for CC BY photos, harmless for the rest)
const unique = [...new Map(credits.map((c) => [c.id, c])).values()].map((c) => ({
  file: c.file,
  label: c.label,
  title: c.title,
  creator: c.creator,
  creatorUrl: c.creatorUrl,
  sourceUrl: c.sourceUrl,
  license: c.license,
  licenseVersion: c.licenseVersion,
  licenseUrl: c.licenseUrl,
  source: c.source,
}));
writeFileSync(
  "src/config/photoCredits.ts",
  `// Generated by scripts/fetch-photos.mjs. Credits for the placeholder stock photos, shown on /credits.\n` +
    `export interface PhotoCredit {\n  file: string;\n  label: string;\n  title: string;\n  creator: string;\n  creatorUrl: string;\n  sourceUrl: string;\n  license: string;\n  licenseVersion: string;\n  licenseUrl: string;\n  source: string;\n}\n\n` +
    `export const photoCredits: PhotoCredit[] = ${JSON.stringify(unique, null, 2)};\n`,
);

if (missing.length) console.log("\nNO USABLE PHOTO for:", missing.join(", "), "\n(edit query/must in scripts/photos.config.json and rerun)");
console.log(`\ndone: ${credits.length} photos, ${unique.length} unique. Review them, then switch src/config/images.ts to jpg.`);
