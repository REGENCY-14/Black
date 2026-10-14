// One-off generator for placeholder product and delivered-order images (SVG, 4:5 and 1:1).
// Real photos replace these later; run with: node scripts/gen-placeholders.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const tints = [
  ["#0b2f35", "#14525b"],
  ["#14525b", "#2a7f86"],
  ["#1b3a5c", "#2372f5"],
  ["#2f3d3a", "#5b7a72"],
  ["#243b4a", "#4b7a94"],
];

function svg(w, h, [a, b], label, glyph) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>
<circle cx="${w * 0.72}" cy="${h * 0.28}" r="${w * 0.22}" fill="#ffffff" fill-opacity="0.08"/>
<circle cx="${w * 0.25}" cy="${h * 0.8}" r="${w * 0.3}" fill="#ffffff" fill-opacity="0.06"/>
<text x="50%" y="52%" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${w * 0.34}" font-weight="600" fill="#ffffff" fill-opacity="0.9">${glyph}</text>
<text x="50%" y="${h - 36}" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="22" fill="#ffffff" fill-opacity="0.6">${label}</text>
</svg>`;
}

mkdirSync("public/products", { recursive: true });
mkdirSync("public/delivered", { recursive: true });
const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWX";
for (let i = 1; i <= 24; i++) {
  const id = String(i).padStart(2, "0");
  writeFileSync(
    `public/products/p${id}.svg`,
    svg(800, 1000, tints[i % tints.length], "Placeholder photo", glyphs[i - 1]),
  );
  writeFileSync(
    `public/products/p${id}-b.svg`,
    svg(800, 1000, tints[(i + 2) % tints.length], "Placeholder photo", glyphs[i - 1]),
  );
}
for (let i = 1; i <= 6; i++) {
  writeFileSync(
    `public/delivered/d${i}.svg`,
    svg(800, 800, tints[i % tints.length], "Delivered order photo", String(i)),
  );
}
console.log("done");
