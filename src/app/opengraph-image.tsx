import { ImageResponse } from "next/og";
import { brand } from "@/config";

export const alt = brand.tagline;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social preview: the brand colour, the cube mark, the store name and the tagline. */
export default function OpengraphImage() {
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
      <svg width="140" height="140" viewBox="0 0 32 32">
        <rect width="32" height="32" rx="9" fill="#ffffff" fillOpacity="0.12" />
        <polygon points="16,6.5 24,11 16,15.5 8,11" fill="#ffffff" />
        <polygon points="8,11 16,15.5 16,25.5 8,21" fill="#ffffff" fillOpacity="0.7" />
        <polygon points="24,11 16,15.5 16,25.5 24,21" fill="#ffffff" fillOpacity="0.45" />
      </svg>
      <div style={{ display: "flex", fontSize: 88, fontWeight: 700, letterSpacing: -2 }}>{brand.name}</div>
      <div style={{ display: "flex", fontSize: 44, opacity: 0.8 }}>{brand.tagline}</div>
    </div>,
    size,
  );
}
