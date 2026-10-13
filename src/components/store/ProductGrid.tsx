import { ProductCard } from "@/components/store/ProductCard";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Batch, Product } from "@/lib/api/types";
import { cn } from "@/lib/cn";

export const productGridClass = "grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4";

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

/** Same footprint as ProductCard so nothing shifts when data arrives. */
export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className={productGridClass} aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="flex flex-col gap-3 rounded-card bg-card p-2 shadow-card">
          <Skeleton className="aspect-[4/5] rounded-[calc(var(--radius-card)-var(--space-2))]" />
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
