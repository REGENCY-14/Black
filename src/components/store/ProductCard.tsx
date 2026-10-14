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
 * Full width on phones (4:3 image, so a long list does not need endless scrolling), then 4:5 in the grid.
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
      <div className="relative aspect-[4/3] overflow-hidden rounded-[calc(var(--radius-card)-var(--space-2))] bg-subtle sm:aspect-[4/5]">
        <SmartImage
          src={product.images[0]!.src}
          alt={product.images[0]!.alt}
          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, (min-width: 640px) 46vw, 92vw"
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
        <h3 className="text-base leading-snug font-medium text-fg-faint">
          {muted && <span>{muted} </span>}
          <strong className="font-semibold text-fg">{key}</strong>
          {spec && <span>, {spec}</span>}
        </h3>
        <p className="mt-auto pt-1 text-base font-semibold tabular-nums">{formatGHS(product.priceMinor)}</p>
        {expectedArrival && (
          <p className="text-xs text-fg-muted">Preorder · arrives {formatDayMonth(expectedArrival)}</p>
        )}
      </div>
    </Link>
  );
}
