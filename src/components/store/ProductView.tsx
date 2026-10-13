"use client";

import { MessageCircle, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DepositPreview } from "@/components/store/DepositPreview";
import { PreorderBadge, SpotsBadge } from "@/components/store/PreorderBadge";
import { PriceBlock } from "@/components/store/PriceBlock";
import { ProductGallery } from "@/components/store/ProductGallery";
import { VariantPicker } from "@/components/store/VariantPicker";
import { BottomBar } from "@/components/layout/BottomBar";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Stepper";
import { whatsappLink } from "@/config";
import type { Batch, Category, Product } from "@/lib/api/types";
import { isSoldOut, missingVariantGroups, spotsLeft, variantLabels } from "@/lib/catalog-utils";
import { formatGHS } from "@/lib/money";
import { MAX_LINE_QUANTITY, useCart } from "@/stores/cart";

export function ProductView({
  product,
  batch,
  category,
}: {
  product: Product;
  batch: Batch;
  category?: Category;
}) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const soldOut = isSoldOut(product);
  const left = spotsLeft(product, selection);
  const maxQty = Math.max(1, Math.min(left, MAX_LINE_QUANTITY));
  const qty = Math.min(quantity, maxQty);
  const total = product.priceMinor * qty;

  const preorder = () => {
    const missing = missingVariantGroups(product, selection);
    if (missing.length) {
      setErrors(
        Object.fromEntries(
          product.variantGroups
            .filter((g) => !selection[g.id])
            .map((g) => [g.id, `Choose a ${g.name.toLowerCase()}.`]),
        ),
      );
      document
        .getElementById(`variant-${product.variantGroups.find((g) => !selection[g.id])!.id}`)
        ?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      return;
    }
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        imageSrc: product.images[0]!.src,
        unitPriceMinor: product.priceMinor,
        batchId: product.batchId,
        variants: selection,
        variantLabels: variantLabels(product, selection),
      },
      qty,
    );
    router.push("/cart");
  };

  const cta = soldOut ? (
    <Button size="lg" block="responsive" disabled>
      Sold out
    </Button>
  ) : (
    <Button size="lg" block="responsive" onClick={preorder}>
      <ShoppingBag className="size-5" aria-hidden /> Preorder
    </Button>
  );

  return (
    <div className="container-page grid gap-6 py-4 pb-32 md:gap-10 md:py-10 md:pb-10 lg:grid-cols-2">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <ProductGallery images={product.images} name={product.name} />
      </div>

      <div className="flex flex-col gap-6">
        <nav aria-label="Breadcrumb" className="text-sm text-fg-muted">
          <Link href="/shop" className="hover:text-fg">
            Shop
          </Link>
          {category && (
            <>
              {" / "}
              <Link href={`/shop?category=${category.slug}`} className="hover:text-fg">
                {category.name}
              </Link>
            </>
          )}
        </nav>

        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold md:text-3xl">{product.name}</h1>
          <PriceBlock priceMinor={product.priceMinor} size="lg" showIncludes />
          <div className="flex flex-wrap gap-2">
            <PreorderBadge
              availability={product.availability}
              expectedArrival={batch.expectedArrival}
              withWindow
            />
            <SpotsBadge product={product} always />
          </div>
        </div>

        {product.variantGroups.length > 0 && (
          <div className="flex flex-col gap-5">
            {product.variantGroups.map((g) => (
              <div key={g.id} id={`variant-${g.id}`}>
                <VariantPicker
                  group={g}
                  value={selection[g.id]}
                  error={errors[g.id]}
                  onChange={(optionId) => {
                    setSelection((s) => ({ ...s, [g.id]: optionId }));
                    setErrors((e) => ({ ...e, [g.id]: "" }));
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {!soldOut && (
          <div className="flex flex-wrap items-center gap-4">
            <Stepper value={qty} onChange={setQuantity} max={maxQty} label="Quantity" />
            <p className="text-sm text-fg-muted">
              {left < MAX_LINE_QUANTITY ? `Up to ${left} per order` : ""}
            </p>
          </div>
        )}

        {!soldOut && <DepositPreview totalMinor={total} expectedArrival={batch.expectedArrival} />}

        <div className="hidden flex-wrap gap-3 md:flex">{cta}</div>

        <Button asChild variant="secondary" block="responsive" className="self-start">
          <a
            href={whatsappLink(`Hi, I have a question about "${product.name}".`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="size-5" aria-hidden /> Ask about this item
          </a>
        </Button>

        <section aria-labelledby="about-item" className="flex flex-col gap-2 border-t border-line pt-6">
          <h2 id="about-item" className="text-lg font-semibold">
            About this item
          </h2>
          <p className="max-w-prose text-fg-secondary">{product.description}</p>
          <p className="max-w-prose text-sm text-fg-muted">
            Delivery is arranged directly with the rider after your goods arrive in Ghana.
          </p>
        </section>
      </div>

      <BottomBar>
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <p className="text-sm text-fg-muted">{qty > 1 ? `${qty} items` : "Total"}</p>
            <p className="font-semibold tabular-nums">{formatGHS(total)}</p>
          </div>
          <div className="flex-1">{cta}</div>
        </div>
      </BottomBar>
    </div>
  );
}
