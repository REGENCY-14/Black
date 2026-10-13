/**
 * Shrink a photo in the browser before it is uploaded. Owner photos come straight from a phone
 * camera (often 4000px+ and several MB) and are posted over mobile data from China.
 * Output is a JPEG data URL no larger than `maxDim` on its longest side.
 */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

export async function compressImage(file: File, maxDim = 1200, quality = 0.78): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not a photo.`);
  if (file.size > MAX_SOURCE_BYTES) throw new Error(`${file.name} is too large. Choose a photo under 25 MB.`);

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(`${file.name} could not be read. Try another photo.`);
  });
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not process the photo.");
  // flatten transparency onto white so PNGs do not turn black as JPEG
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}
