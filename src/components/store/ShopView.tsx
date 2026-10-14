"use client";

import { Check, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackToTop } from "@/components/store/BackToTop";
import { ProductGrid, ProductGridSkeleton } from "@/components/store/ProductGrid";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { useBatches, useCategories, useProducts } from "@/hooks/api";
import type { ProductSort } from "@/lib/api/types";
import { cn } from "@/lib/cn";

const sortOptions: { value: ProductSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most ordered" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

const isSort = (v: string | null): v is ProductSort => sortOptions.some((o) => o.value === v);

export function ShopView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "all";
  const sort: ProductSort = isSort(params.get("sort")) ? (params.get("sort") as ProductSort) : "newest";

  // The URL as it will be once the changes already requested have been applied. The router commits
  // asynchronously, so two quick changes (clear the search, then pick a category) must build on each
  // other here rather than on a URL that has not caught up yet.
  const latest = useRef(new URLSearchParams());
  useEffect(() => {
    latest.current = new URLSearchParams(params.toString());
  }, [params]);

  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(latest.current.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v && v !== "all" && !(k === "sort" && v === "newest")) next.set(k, v);
      else next.delete(k);
    }
    latest.current = next;
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Search box is local state, pushed to the URL after a short pause.
  const [search, setSearch] = useState(q);
  const lastPushed = useRef(q);
  useEffect(() => {
    if (q !== lastPushed.current) {
      lastPushed.current = q;
      setSearch(q);
    }
  }, [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (search.trim() !== lastPushed.current) {
        lastPushed.current = search.trim();
        setParam({ q: search.trim() || null });
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const categories = useCategories();
  const batches = useBatches();
  const products = useProducts({ search: q || undefined, categorySlug: category, sort, limit: 12 });

  const items = useMemo(() => products.data?.pages.flatMap((p) => p.items) ?? [], [products.data]);
  const total = products.data?.pages[0]?.total ?? 0;
  const [sheet, setSheet] = useState(false);

  const tabs = [
    { value: "all", label: "All" },
    ...(categories.data?.map((c) => ({ value: c.slug, label: c.name })) ?? []),
  ];
  const filtered = !!q || category !== "all";
  const clear = () => {
    setSearch("");
    lastPushed.current = "";
    latest.current = new URLSearchParams();
    router.replace(pathname, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-5">
      <BackToTop />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-fg-muted"
            aria-hidden
          />
          <Input
            type="search"
            inputMode="search"
            enterKeyHint="search"
            aria-label="Search products"
            placeholder="Search products"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setSearch("");
                lastPushed.current = "";
                setParam({ q: null });
              }}
              className="absolute top-1/2 right-1 inline-flex size-hit -translate-y-1/2 items-center justify-center rounded-pill text-fg-muted hover:bg-subtle"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
        <div className="hidden w-52 md:block">
          <Select
            aria-label="Sort products"
            value={sort}
            onValueChange={(v) => setParam({ sort: v })}
            options={sortOptions}
          />
        </div>
        <Button
          variant="secondary"
          className="md:hidden"
          onClick={() => setSheet(true)}
          aria-label="Sort and filter"
        >
          <SlidersHorizontal className="size-5" aria-hidden />
          <span className="hidden min-[400px]:inline">Sort</span>
        </Button>
      </div>

      <SegmentedControl
        aria-label="Category"
        items={tabs}
        value={category}
        onValueChange={(v) => setParam({ category: v })}
      />

      <p className="text-sm text-fg-muted" aria-live="polite">
        {products.isPending ? "Loading products" : `${total} ${total === 1 ? "product" : "products"}`}
        {q && <> for “{q}”</>}
      </p>

      {products.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-card bg-danger-soft p-5">
          <p className="font-medium text-danger">We could not load the products.</p>
          <p className="text-sm text-fg-secondary">Check your connection and try again.</p>
          <Button variant="secondary" size="sm" onClick={() => products.refetch()}>
            <RotateCcw className="size-4" aria-hidden /> Try again
          </Button>
        </div>
      ) : products.isPending ? (
        <ProductGridSkeleton />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-card bg-card p-6 shadow-card">
          <p className="text-lg font-semibold">Nothing matches that yet</p>
          <p className="text-fg-secondary">Try a different word, or browse every category.</p>
          {filtered && (
            <Button variant="secondary" onClick={clear}>
              Clear search and filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <ProductGrid products={items} batches={batches.data} />
          {products.hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                size="lg"
                block="responsive"
                loading={products.isFetchingNextPage}
                onClick={() => products.fetchNextPage()}
              >
                Load more
              </Button>
            </div>
          )}
        </>
      )}

      <Sheet
        open={sheet}
        onOpenChange={setSheet}
        title="Sort products"
        footer={
          <Button block="always" size="lg" onClick={() => setSheet(false)}>
            Show {total} {total === 1 ? "product" : "products"}
          </Button>
        }
      >
        <div>
          <fieldset className="flex flex-col">
            <legend className="sr-only">Sort by</legend>
            {sortOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={sort === o.value}
                onClick={() => setParam({ sort: o.value })}
                className={cn(
                  "flex min-h-14 items-center justify-between border-b border-line text-left text-base last:border-0",
                  sort === o.value && "font-semibold",
                )}
              >
                {o.label}
                {sort === o.value && <Check className="size-5" aria-hidden />}
              </button>
            ))}
          </fieldset>
        </div>
      </Sheet>
    </div>
  );
}
