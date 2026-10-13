"use client";

import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { brand } from "@/config";
import { useCategories, useNextBatch, useProducts } from "@/hooks/api";
import { formatArrivalWindow, formatDate } from "@/lib/dates";
import { formatGHS } from "@/lib/money";

/** Temporary home: proves the layout and the mock API hooks. Phase 3 replaces it with the real home page. */
export default function Home() {
  const batch = useNextBatch();
  const products = useProducts({ sort: "popular", limit: 4 });
  const categories = useCategories();

  return (
    <Container className="flex flex-col gap-6 py-10">
      <h1 className="text-2xl font-semibold">{brand.tagline}</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card data-testid="next-batch">
          <p className="text-sm text-fg-muted">Next container</p>
          {batch.data ? (
            <>
              <p className="text-xl font-semibold">{formatDate(batch.data.expectedArrival)}</p>
              <p className="text-sm text-fg-muted">{formatArrivalWindow(batch.data.expectedArrival)}</p>
            </>
          ) : (
            <Skeleton className="mt-2 h-8 w-32" />
          )}
        </Card>
        <Card data-testid="categories">
          <p className="text-sm text-fg-muted">Categories</p>
          <p className="text-xl font-semibold">{categories.data?.length ?? "…"}</p>
        </Card>
        <Card data-testid="popular">
          <p className="text-sm text-fg-muted">Most ordered</p>
          {products.data?.pages[0]?.items.slice(0, 2).map((p) => (
            <p key={p.id} className="text-sm">
              {p.name} · {formatGHS(p.priceMinor)}
            </p>
          )) ?? <Skeleton className="mt-2 h-8 w-40" />}
        </Card>
      </div>
      <Link href="/_design" className="min-h-hit self-start rounded-btn bg-primary px-5 py-3 text-primary-fg">
        Design tokens
      </Link>
    </Container>
  );
}
