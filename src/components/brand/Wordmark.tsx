import { brand } from "@/config";
import clsx from "clsx";

/**
 * The brand mark: the supplied artwork as two transparent PNGs, navy for light surfaces and white for dark
 * ones (swapped by the `dark:` variant, so no JavaScript). Replace both files in /public/brand to rebrand;
 * scripts/gen-logo.mjs makes them from one source image.
 */
export function LogoMark({ className }: { className?: string }) {
  const size = clsx("object-contain", className ?? "size-9 md:size-11");
  return (
    <>
      {/* eslint-disable @next/next/no-img-element */}
      <img
        src="/brand/mark.png"
        alt=""
        width={457}
        height={465}
        aria-hidden
        className={clsx(size, "dark:hidden")}
      />
      <img
        src="/brand/mark-white.png"
        alt=""
        width={457}
        height={465}
        aria-hidden
        className={clsx(size, "hidden dark:block")}
      />
    </>
  );
}

/** Mark plus the store name from config/brand.ts. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="text-xl font-bold">{brand.shortName}</span>
        <span className="mt-0.5 hidden text-xs font-semibold tracking-wide uppercase md:block">
          {brand.descriptor}
        </span>
      </span>
    </span>
  );
}
