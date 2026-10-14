// Builds the PNG icons the app needs from public/brand/mark.png (see scripts/gen-logo.mjs).
// Run with: node scripts/gen-icons.mjs
//   public/icons/icon-192.png          any-purpose, rounded corners
//   public/icons/icon-512.png          any-purpose, rounded corners
//   public/icons/icon-maskable-512.png full-bleed with a safe zone, so Android can crop it to any shape
//   src/app/apple-icon.png             180px, full-bleed (iOS rounds it itself)
//   src/app/icon.png                   256px browser favicon
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const jobs = [
  { file: "public/icons/icon-192.png", size: 192, rounded: true, scale: 0.68 },
  { file: "public/icons/icon-512.png", size: 512, rounded: true, scale: 0.68 },
  // maskable: platforms crop to a circle/squircle, so keep the artwork within the central 60%
  { file: "public/icons/icon-maskable-512.png", size: 512, rounded: false, scale: 0.56 },
  { file: "src/app/apple-icon.png", size: 180, rounded: false, scale: 0.64 },
  { file: "src/app/icon.png", size: 256, rounded: true, scale: 0.74 },
];

mkdirSync("public/icons", { recursive: true });
for (const j of jobs) {
  const inner = Math.round(j.size * j.scale);
  const mark = await sharp("public/brand/mark.png").resize({ height: inner, fit: "inside" }).toBuffer();
  const bg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${j.size}" height="${j.size}"><rect width="${j.size}" height="${j.size}" ${j.rounded ? `rx="${Math.round(j.size * 0.22)}"` : ""} fill="#ffffff"/></svg>`,
  );
  await sharp(bg)
    .composite([{ input: mark, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(j.file);
  console.log("wrote", j.file);
}
