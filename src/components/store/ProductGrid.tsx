import { ProductCard } from "@/components/store/ProductCard";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Batch, Product } from "@/lib/api/types";
import { cn } from "@/lib/cn";

/** One full-width card per row on phones (vertical scroll), then 2, 3 and 4 columns as the screen grows. */
export const productGridClass = "grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4";

export function ProductGrid({
  products,
  batches,
  className,
}: {
  products: Product[];
  batches?: Batch[];
  className?: string;
}) {
  const arrival = new Map(batches?.map((b) => [b.id, b.expectedArrival]));
  return (
    <ul className={cn(productGridClass, className)}>
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} expectedArrival={arrival.get(p.batchId)} priority={i < 2} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Home "Preorders open now": on phones each card is the full width of the page and the row scrolls
 * sideways, snapping one card at a time. From tablet up it is the normal grid.
 * The row is focusable so keyboard users can scroll it with the arrow keys.
 */
export function ProductCarousel({
  products,
  batches,
  label,
  className,
}: {
  products: Product[];
  batches?: Batch[];
  label: string;
  className?: string;
}) {
  const arrival = new Map(batches?.map((b) => [b.id, b.expectedArrival]));
  return (
    <ul
      tabIndex={0}
      aria-label={label}
      className={cn(
        "-mx-(--page-gutter) no-scrollbar flex snap-x snap-mandatory scroll-px-(--page-gutter) gap-3 overflow-x-auto px-(--page-gutter) pb-2",
        "md:mx-0 md:grid md:scroll-px-0 md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4",
        className,
      )}
    >
      {products.map((p, i) => (
        <li key={p.id} className="w-full shrink-0 snap-center md:w-auto">
          <ProductCard product={p} expectedArrival={arrival.get(p.batchId)} priority={i < 2} />
        </li>
      ))}
    </ul>
  );
}

/** Same footprint as ProductCard so nothing shifts when data arrives. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className={productGridClass} aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex flex-col gap-3 rounded-card bg-card p-2 shadow-card">
          <Skeleton className="aspect-[4/3] rounded-[calc(var(--radius-card)-var(--space-2))] sm:aspect-[4/5]" />
          <div className="flex flex-col gap-2 px-2 pb-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </li>
      ))}
    </ul>
  );
}
