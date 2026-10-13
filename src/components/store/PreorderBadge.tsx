import { CalendarClock, Flame, PackageX, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { Product } from "@/lib/api/types";
import { isLowStock, isSoldOut, productSpotsLeft } from "@/lib/catalog-utils";
import { formatArrivalWindow, formatDayMonth } from "@/lib/dates";

/** "Preorder" plus the expected delivery window. */
export function PreorderBadge({
  availability,
  expectedArrival,
  withWindow = false,
}: {
  availability: Product["availability"];
  expectedArrival: string;
  withWindow?: boolean;
}) {
  if (availability === "in_stock") return <Badge tone="success">In stock</Badge>;
  return (
    <Badge tone="accent" icon={withWindow ? <CalendarClock /> : <ShoppingBag />}>
      {withWindow
        ? `Preorder, arrives ${formatArrivalWindow(expectedArrival)}`
        : `Preorder · ${formatDayMonth(expectedArrival)}`}
    </Badge>
  );
}

/** "12 spots left" when few remain, "Sold out" at zero, nothing otherwise (unless `always`). */
export function SpotsBadge({ product, always = false }: { product: Product; always?: boolean }) {
  if (isSoldOut(product)) {
    return (
      <Badge tone="neutral" icon={<PackageX />}>
        Sold out
      </Badge>
    );
  }
  const n = productSpotsLeft(product);
  if (isLowStock(product) || always) {
    return (
      <Badge tone={isLowStock(product) ? "warning" : "neutral"} icon={<Flame />}>
        {n} {n === 1 ? "spot" : "spots"} left
      </Badge>
    );
  }
  return null;
}
