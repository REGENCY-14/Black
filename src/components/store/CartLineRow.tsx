"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { IconButton } from "@/components/ui/Button";
import { SmartImage } from "@/components/ui/SmartImage";
import { Stepper } from "@/components/ui/Stepper";
import { formatGHS } from "@/lib/money";
import { MAX_LINE_QUANTITY, type CartLine, useCart } from "@/stores/cart";

export function CartLineRow({ line }: { line: CartLine }) {
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const variants = Object.entries(line.variantLabels);
  return (
    <li className="flex gap-4 py-4 first:pt-0 last:pb-0">
      <Link
        href={`/shop/${line.slug}`}
        aria-hidden
        tabIndex={-1}
        className="relative size-20 shrink-0 overflow-hidden rounded-btn bg-subtle sm:size-24"
      >
        <SmartImage src={line.imageSrc} alt="" sizes="96px" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/shop/${line.slug}`} className="font-medium hover:underline">
              {line.name}
            </Link>
            {variants.length > 0 && (
              <p className="text-sm text-fg-muted">{variants.map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
            )}
            <p className="text-sm text-fg-muted tabular-nums">{formatGHS(line.unitPriceMinor)} each</p>
          </div>
          <p className="shrink-0 font-semibold tabular-nums">
            {formatGHS(line.unitPriceMinor * line.quantity)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <Stepper
            value={line.quantity}
            onChange={(q) => setQuantity(line.key, q)}
            max={MAX_LINE_QUANTITY}
            label={`Quantity of ${line.name}`}
          />
          <IconButton
            variant="ghost"
            aria-label={`Remove ${line.name} from cart`}
            icon={<Trash2 className="size-5" aria-hidden />}
            onClick={() => remove(line.key)}
          />
        </div>
      </div>
    </li>
  );
}
