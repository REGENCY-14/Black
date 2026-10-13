// Renders the brand mark to the PNG icons the app needs, using the Chromium that Playwright installs.
// Run with: node scripts/gen-icons.mjs
//   public/icons/icon-192.png          any-purpose, rounded corners
//   public/icons/icon-512.png          any-purpose, rounded corners
//   public/icons/icon-maskable-512.png full-bleed with a safe zone, so Android can crop it to any shape
//   src/app/apple-icon.png             180px, full-bleed (iOS rounds it itself)
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const TEAL = "#0b2f35";

/** Cube centred in a 32-unit box. `scale` shrinks it so maskable icons keep the mark inside the safe zone. */
const cube = (scale) => `
  <g transform="translate(16 16) scale(${scale}) translate(-16 -16)">
    <polygon points="16,6.5 24,11 16,15.5 8,11" fill="#fff"/>
    <polygon points="8,11 16,15.5 16,25.5 8,21" fill="#fff" fill-opacity="0.7"/>
    <polygon points="24,11 16,15.5 16,25.5 24,21" fill="#fff" fill-opacity="0.45"/>
  </g>`;

const svg = (size, { rounded, scale }) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">
  <rect width="32" height="32" ${rounded ? 'rx="9"' : ""} fill="${TEAL}"/>
  ${cube(scale)}
</svg>`;

const jobs = [
  { file: "public/icons/icon-192.png", size: 192, rounded: true, scale: 1 },
  { file: "public/icons/icon-512.png", size: 512, rounded: true, scale: 1 },
  // maskable: platforms crop to a circle/squircle, so keep the artwork within the central 80%
  { file: "public/icons/icon-maskable-512.png", size: 512, rounded: false, scale: 0.78 },
  { file: "src/app/apple-icon.png", size: 180, rounded: false, scale: 0.9 },
];

mkdirSync("public/icons", { recursive: true });
const browser = await chromium.launch();
for (const j of jobs) {
  const page = await browser.newPage({ viewport: { width: j.size, height: j.size }, deviceScaleFactor: 1 });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg(j.size, j)}</body></html>`,
  );
  const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: j.size, height: j.size } });
  writeFileSync(j.file, png);
  await page.close();
  console.log("wrote", j.file, png.length, "bytes");
}
await browser.close();
