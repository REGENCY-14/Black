"use client";

import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { useCartLines } from "@/hooks/useHydrated";
import { formatGHS } from "@/lib/money";

/** Minimal placeholder so "Preorder" has somewhere to land. Phase 4 builds the real cart. */
export default function CartPage() {
  const { lines } = useCartLines();
  return (
    <Container className="flex flex-col gap-4 py-8">
      <h1 className="text-2xl font-semibold">Your cart</h1>
      {lines.length === 0 ? (
        <p className="text-fg-secondary">Your cart is empty.</p>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="cart-lines">
          {lines.map((l) => (
            <li key={l.key}>
              {l.quantity} × {l.name}
              {Object.values(l.variantLabels).length > 0 &&
                ` (${Object.values(l.variantLabels).join(", ")})`}{" "}
              · {formatGHS(l.unitPriceMinor * l.quantity)}
            </li>
          ))}
        </ul>
      )}
      <Button asChild variant="secondary" className="self-start">
        <Link href="/shop">Continue shopping</Link>
      </Button>
    </Container>
  );
}
