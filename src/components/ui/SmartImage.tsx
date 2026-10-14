import Image, { type ImageProps } from "next/image";

/** Neutral blur placeholder (teal-grey) shown while real photos load. */
const BLUR =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjEwIj48cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSIxMCIgZmlsbD0iIzJhNGY1NSIvPjwvc3ZnPg==";

/**
 * next/image with the project defaults: always `fill` inside a fixed-aspect parent (no layout shift),
 * blur placeholder for photos, and SVG placeholders served as-is (next/image does not optimise SVG).
 */
export function SmartImage({
  src,
  alt,
  sizes,
  className,
  priority,
  ...rest
}: Omit<ImageProps, "fill" | "width" | "height"> & { sizes: string }) {
  // SVG placeholders and in-browser data URLs (freshly uploaded photos) cannot go through the optimiser
  const isSvg = typeof src === "string" && (src.endsWith(".svg") || src.startsWith("data:"));
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={isSvg || rest.unoptimized}
      placeholder={isSvg ? "empty" : "blur"}
      blurDataURL={isSvg ? undefined : BLUR}
      className={className ?? "object-cover"}
      {...rest}
    />
  );
}
