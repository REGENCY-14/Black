"use client";

import { Eye, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ConfirmSheet } from "@/components/admin/parts";
import { EmptyPanel, ErrorPanel, ListSkeleton, PageHeader } from "@/components/admin/states";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SmartImage } from "@/components/ui/SmartImage";
import { useToast } from "@/components/ui/Toast";
import { useAdminProducts, useDeleteProduct, useSetProductStatus } from "@/hooks/admin";
import type { Product, ProductStatus } from "@/lib/api/types";
import { formatGHS } from "@/lib/money";

const statusTone: Record<ProductStatus, "success" | "neutral" | "warning"> = {
  published: "success",
  draft: "neutral",
  hidden: "warning",
};
const statusLabel: Record<ProductStatus, string> = {
  published: "Published",
  draft: "Draft",
  hidden: "Hidden",
};

function ProductRow({ p }: { p: Product }) {
  const { toast } = useToast();
  const setStatus = useSetProductStatus();
  const del = useDeleteProduct();
  const [confirm, setConfirm] = useState(false);
  const hidden = p.status === "hidden";

  return (
    <li
      className="flex flex-col gap-3 rounded-card bg-card p-3 shadow-card sm:flex-row sm:items-center"
      data-testid="product-row"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-btn bg-subtle">
          {p.images[0] ? <SmartImage src={p.images[0].src} alt="" sizes="64px" /> : null}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">{p.name}</p>
          <p className="text-sm text-fg-muted tabular-nums">
            {formatGHS(p.priceMinor)} · {p.ordered} of {p.limit} ordered
          </p>
          <Badge tone={statusTone[p.status]} className="mt-1">
            {statusLabel[p.status]}
          </Badge>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link href={`/admin/products/${p.id}`} aria-label={`Edit ${p.name}`}>
            <Pencil className="size-4" aria-hidden /> Edit
          </Link>
        </Button>
        {p.status !== "draft" && (
          <Button
            variant="secondary"
            size="sm"
            loading={setStatus.isPending}
            aria-label={`${hidden ? "Show" : "Hide"} ${p.name}`}
            onClick={() =>
              setStatus.mutate(
                { id: p.id, status: hidden ? "published" : "hidden" },
                {
                  onSuccess: () =>
                    toast({
                      title: hidden ? "Product is live again" : "Product hidden from the shop",
                      tone: "success",
                    }),
                },
              )
            }
          >
            {hidden ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}{" "}
            {hidden ? "Show" : "Hide"}
          </Button>
        )}
        <Button variant="ghost" size="sm" aria-label={`Delete ${p.name}`} onClick={() => setConfirm(true)}>
          <Trash2 className="size-4" aria-hidden /> Delete
        </Button>
      </div>
      <ConfirmSheet
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${p.name}?`}
        confirmLabel="Yes, delete"
        cancelLabel="Keep it"
        destructive
        loading={del.isPending}
        error={del.isError ? del.error.message : undefined}
        onConfirm={() =>
          del.mutate(p.id, {
            onSuccess: () => {
              setConfirm(false);
              toast({ title: "Product deleted", tone: "success" });
            },
          })
        }
      >
        <p>This cannot be undone. A product that already has orders cannot be deleted. Hide it instead.</p>
      </ConfirmSheet>
    </li>
  );
}

export function ProductsView() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<ProductStatus | "all">("all");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const q = useAdminProducts({ search: debounced || undefined, status });

  return (
    <>
      <PageHeader
        title="Products"
        description="Post new products and manage what shoppers see."
        actions={
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus className="size-4" aria-hidden /> Add product
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-fg-muted"
            aria-hidden
          />
          <Input
            type="search"
            inputMode="search"
            aria-label="Search products"
            placeholder="Search products"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12"
          />
        </div>
        <SegmentedControl
          aria-label="Filter by status"
          value={status}
          onValueChange={(v) => setStatus(v as ProductStatus | "all")}
          items={[
            { value: "all", label: "All" },
            { value: "published", label: "Published" },
            { value: "draft", label: "Drafts" },
            { value: "hidden", label: "Hidden" },
          ]}
        />
      </div>

      {q.isPending ? (
        <ListSkeleton />
      ) : q.isError ? (
        <ErrorPanel message={q.error.message} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyPanel
          title="No products here"
          text="Nothing matches. Add a product or change the filter."
          action={
            <Button asChild>
              <Link href="/admin/products/new">Add product</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Products">
          {q.data.map((p) => (
            <ProductRow key={p.id} p={p} />
          ))}
        </ul>
      )}
    </>
  );
}
