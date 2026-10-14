// Builds the transparent brand marks from the supplied logo artwork (a navy shape on a light background).
//   node scripts/gen-logo.mjs <path to logo image>
// Writes public/brand/mark.png (navy, for light surfaces) and public/brand/mark-white.png (for dark surfaces).
import sharp from "sharp";

const src = process.argv[2];
if (!src) throw new Error("Usage: node scripts/gen-logo.mjs <logo image>");

const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const px = info.width * info.height;
// background = brightest corner colour, ink = darkest colour in the artwork
const lum = (i) => 0.2126 * data[i * 3] + 0.7152 * data[i * 3 + 1] + 0.0722 * data[i * 3 + 2];
const bg = Math.max(lum(0), lum(info.width - 1), lum(px - 1), lum(px - info.width));
let ink = 255;
for (let i = 0; i < px; i++) ink = Math.min(ink, lum(i));

const alpha = Buffer.alloc(px);
for (let i = 0; i < px; i++)
  alpha[i] = Math.round(255 * Math.min(1, Math.max(0, (bg - lum(i)) / (bg - ink))));

const make = (rgb) => {
  const out = Buffer.alloc(px * 4);
  for (let i = 0; i < px; i++) {
    out[i * 4] = rgb[0];
    out[i * 4 + 1] = rgb[1];
    out[i * 4 + 2] = rgb[2];
    out[i * 4 + 3] = alpha[i];
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } });
};

// colour of the logo itself: the average of the fully dark pixels
let r = 0,
  g = 0,
  b = 0,
  n = 0;
for (let i = 0; i < px; i++)
  if (alpha[i] > 250) {
    r += data[i * 3];
    g += data[i * 3 + 1];
    b += data[i * 3 + 2];
    n++;
  }
const navy = [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
console.log("logo colour", navy, "size", info.width, "x", info.height);

await make(navy).trim({ threshold: 1 }).png({ compressionLevel: 9 }).toFile("public/brand/mark.png");
await make([255, 255, 255])
  .trim({ threshold: 1 })
  .png({ compressionLevel: 9 })
  .toFile("public/brand/mark-white.png");
