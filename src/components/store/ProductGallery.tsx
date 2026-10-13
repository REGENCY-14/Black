"use client";

import { useRef, useState } from "react";
import { SmartImage } from "@/components/ui/SmartImage";
import type { ProductImage } from "@/lib/api/types";
import { cn } from "@/lib/cn";

/** Swipeable scroll-snap gallery on mobile; large image with thumbnails from md up. */
export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const scroller = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  const go = (i: number) => {
    const el = scroller.current;
    if (!el) return;
    setIndex(i);
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div
      className="flex flex-col gap-3"
      role="group"
      aria-roledescription="carousel"
      aria-label={`${name} photos`}
    >
      <div className="relative">
        <ul
          ref={scroller}
          tabIndex={0}
          aria-label={`${name} photos, scroll sideways`}
          onScroll={(e) => {
            const el = e.currentTarget;
            setIndex(Math.round(el.scrollLeft / el.clientWidth));
          }}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-card-lg bg-subtle"
        >
          {images.map((img, i) => (
            <li
              key={img.src}
              className="relative aspect-[4/5] w-full shrink-0 snap-center"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${images.length}`}
            >
              <SmartImage
                src={img.src}
                alt={img.alt}
                priority={i === 0}
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
            </li>
          ))}
        </ul>
        {images.length > 1 && (
          <p
            className="pointer-events-none absolute right-3 bottom-3 rounded-pill bg-inverse/70 px-3 py-1 text-xs font-medium text-fg-inverse md:hidden"
            aria-hidden
          >
            {index + 1} / {images.length}
          </p>
        )}
      </div>

      {images.length > 1 && (
        <ul className="hidden gap-3 md:flex">
          {images.map((img, i) => (
            <li key={img.src}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "relative block size-20 overflow-hidden rounded-btn border-2 bg-subtle",
                  i === index ? "border-line-active" : "border-transparent",
                )}
              >
                <SmartImage src={img.src} alt="" sizes="80px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
