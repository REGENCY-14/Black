import Link from "next/link";
import { SpotsBadge } from "@/components/store/PreorderBadge";
import { SmartImage } from "@/components/ui/SmartImage";
import type { Product } from "@/lib/api/types";
import { isSoldOut } from "@/lib/catalog-utils";
import { cn } from "@/lib/cn";
import { formatDayMonth } from "@/lib/dates";
import { formatGHS } from "@/lib/money";
import { splitProductName } from "@/lib/twoTone";

/**
 * Product tile in the reference-1 style: soft white card, nested media radius, two-tone name.
 * Padding is tighter than hero cards so two columns fit at 360px.
 */
export function ProductCard({
  product,
  expectedArrival,
  priority = false,
  className,
}: {
  product: Product;
  expectedArrival?: string;
  priority?: boolean;
  className?: string;
}) {
  const { muted, key, spec } = splitProductName(product.name);
  const soldOut = isSoldOut(product);
  return (
    <Link
      href={`/shop/${product.slug}`}
      className={cn(
        "group flex h-full flex-col gap-3 rounded-card bg-card p-2 shadow-card transition-transform active:scale-[0.99]",
        className,
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-[calc(var(--radius-card)-var(--space-2))] bg-subtle">
        <SmartImage
          src={product.images[0]!.src}
          alt={product.images[0]!.alt}
          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
          priority={priority}
          className={cn(
            "object-cover transition-transform duration-300 group-hover:scale-[1.03]",
            soldOut && "opacity-60",
          )}
        />
        <div className="absolute top-2 left-2">
          <SpotsBadge product={product} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-2 pb-2">
        <h3 className="text-sm leading-snug font-medium text-fg-faint sm:text-base">
          {muted && <span>{muted} </span>}
          <strong className="font-semibold text-fg">{key}</strong>
          {spec && <span>, {spec}</span>}
        </h3>
        <p className="mt-auto pt-1 text-sm font-semibold tabular-nums sm:text-base">
          {formatGHS(product.priceMinor)}
        </p>
        {expectedArrival && (
          <p className="text-xs text-fg-muted">Preorder · arrives {formatDayMonth(expectedArrival)}</p>
        )}
      </div>
    </Link>
  );
}
