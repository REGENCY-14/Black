import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { brand } from "@/config";

export const alt = brand.tagline;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social preview: the brand colour, the logo mark, the store name and the tagline. */
export default async function OpengraphImage() {
  const mark = await readFile(join(process.cwd(), "public/brand/mark-white.png"));
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 36,
        padding: 96,
        background: brand.themeColor,
        color: "#ffffff",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/png;base64,${mark.toString("base64")}`} width={140} height={142} alt="" />
      <div style={{ display: "flex", fontSize: 88, fontWeight: 700, letterSpacing: -2 }}>{brand.name}</div>
      <div style={{ display: "flex", fontSize: 44, opacity: 0.8 }}>{brand.tagline}</div>
    </div>,
    size,
  );
}
