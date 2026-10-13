import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/layout/Container";
import { ProductGridSkeleton } from "@/components/store/ProductGrid";
import { ShopView } from "@/components/store/ShopView";
import { Skeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = {
  title: "Shop preorders",
  description:
    "Browse products you can preorder now. Pay a deposit, pay the balance later, and track your order.",
};

export default function ShopPage() {
  return (
    <Container className="flex flex-col gap-6 py-6 md:py-10">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">Shop preorders</h1>
        <p className="mt-1 text-fg-secondary">Prices include shipping from China and duty.</p>
      </div>
      {/* useSearchParams needs a Suspense boundary so the shell can be prerendered */}
      <Suspense
        fallback={
          <div className="flex flex-col gap-5">
            <Skeleton className="h-control-md" />
            <Skeleton className="h-12 rounded-pill" />
            <ProductGridSkeleton />
          </div>
        }
      >
        <ShopView />
      </Suspense>
    </Container>
  );
}
