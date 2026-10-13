"use client";

import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ErrorPanel, PageHeader } from "@/components/admin/states";
import { BottomBar } from "@/components/layout/BottomBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { useAdminBatches, useAdminProduct, useSaveProduct } from "@/hooks/admin";
import { useCategories } from "@/hooks/api";
import type { Product, ProductImage, ProductInput, ProductStatus } from "@/lib/api/types";
import { formatArrivalWindow } from "@/lib/dates";
import { formatGHS } from "@/lib/money";

const steps = ["Photos", "Name and price", "Category and options", "Limit and container", "Review"];

interface GroupDraft {
  key: string;
  id?: string;
  name: string;
  /** Comma separated, for example "S, M, L, XL". */
  options: string;
  /** Preorder limit applied to each option. Empty means they share the product limit. */
  limitEach: string;
}

interface Draft {
  images: ProductImage[];
  name: string;
  description: string;
  price: string;
  categoryId: string;
  batchId: string;
  limit: string;
  groups: GroupDraft[];
}

const emptyDraft: Draft = {
  images: [],
  name: "",
  description: "",
  price: "",
  categoryId: "",
  batchId: "",
  limit: "20",
  groups: [],
};

let groupSeq = 0;
const newKey = () => `g${++groupSeq}`;

function fromProduct(p: Product): Draft {
  return {
    images: p.images,
    name: p.name,
    description: p.description,
    price: (p.priceMinor / 100).toString(),
    categoryId: p.categoryId,
    batchId: p.batchId,
    limit: String(p.limit),
    groups: p.variantGroups.map((g) => {
      const limits = new Set(g.options.map((o) => o.limit ?? 0));
      return {
        key: newKey(),
        id: g.id,
        name: g.name,
        options: g.options.map((o) => o.label).join(", "),
        limitEach: limits.size === 1 && [...limits][0]! > 0 ? String([...limits][0]) : "",
      };
    }),
  };
}

/** "12" or "12.50" -> pesewas, or null. */
function parseCedis(input: string): number | null {
  const n = Number(input.replace(/,/g, "").trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

const parseOptions = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

type Errors = Partial<Record<"name" | "price" | "categoryId" | "batchId" | "limit", string>>;

function validate(step: number, d: Draft): Errors {
  const e: Errors = {};
  if (step === 1) {
    if (d.name.trim().length < 2) e.name = "Enter a product name.";
    if (!parseCedis(d.price)) e.price = "Enter a price above zero, for example 120 or 120.50.";
  }
  if (step === 2 && !d.categoryId) e.categoryId = "Choose a category.";
  if (step === 3) {
    const n = Number(d.limit);
    if (!Number.isInteger(n) || n < 1) e.limit = "Enter how many people can preorder, at least 1.";
    if (!d.batchId) e.batchId = "Choose the container this ships in.";
  }
  return e;
}

function toInput(d: Draft, status: ProductStatus): ProductInput {
  return {
    name: d.name.trim(),
    description: d.description.trim(),
    priceMinor: parseCedis(d.price) ?? 0,
    images: d.images.map((img, i) => ({ src: img.src, alt: `${d.name.trim()}, photo ${i + 1}` })),
    categoryId: d.categoryId,
    batchId: d.batchId,
    limit: Number(d.limit),
    variantGroups: d.groups
      .filter((g) => g.name.trim() && parseOptions(g.options).length)
      .map((g) => ({
        id: g.id,
        name: g.name.trim(),
        options: parseOptions(g.options).map((label) => ({
          label,
          limit: Number(g.limitEach) > 0 ? Number(g.limitEach) : undefined,
        })),
      })),
    status,
  };
}

function ProductFormInner({ product }: { product?: Product }) {
  const router = useRouter();
  const { toast } = useToast();
  const categories = useCategories();
  const batches = useAdminBatches();
  const save = useSaveProduct();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => (product ? fromProduct(product) : emptyDraft));
  const [errors, setErrors] = useState<Errors>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) heading.current?.focus();
    mounted.current = true;
  }, [step]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const last = steps.length - 1;
  const next = () => {
    const e = validate(step, draft);
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => Math.min(last, s + 1));
  };

  const submit = (status: ProductStatus) => {
    // re-check everything so a published product is never half-filled
    for (const s of [1, 2, 3]) {
      const e = validate(s, draft);
      if (Object.keys(e).length) {
        setErrors(e);
        setStep(s);
        return;
      }
    }
    save.mutate(
      { id: product?.id ?? null, input: toInput(draft, status) },
      {
        onSuccess: () => {
          toast({
            title:
              status === "published" ? (product ? "Changes saved" : "Product published") : "Saved as draft",
            tone: "success",
          });
          router.push("/admin/products");
        },
      },
    );
  };

  const category = categories.data?.find((c) => c.id === draft.categoryId);
  const batch = batches.data?.find((b) => b.batch.id === draft.batchId)?.batch;
  const price = parseCedis(draft.price);
  const noPhotos = draft.images.length === 0;

  const nav = (
    <div className="flex items-center gap-3">
      {step > 0 && (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          aria-label="Back"
          onClick={() => setStep((s) => s - 1)}
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Button>
      )}
      {step < last && (
        <Button type="button" size="lg" block="always" onClick={next}>
          Continue <ArrowRight className="size-5" aria-hidden />
        </Button>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        title={product ? "Edit product" : "Add a product"}
        description="A few quick steps. You can save a draft at any time."
      />

      <div className="flex flex-col gap-2" aria-label={`Step ${step + 1} of ${steps.length}`}>
        <div className="flex gap-1.5" aria-hidden>
          {steps.map((s, i) => (
            <span key={s} className={`h-1.5 flex-1 rounded-pill ${i <= step ? "bg-accent" : "bg-subtle"}`} />
          ))}
        </div>
        <p className="text-sm text-fg-muted">
          Step {step + 1} of {steps.length}
        </p>
      </div>

      <Card size="lg" as="section" aria-label={steps[step]} className="flex max-w-3xl flex-col gap-5">
        <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold outline-none">
          {steps[step]}
        </h2>

        {step === 0 && <ImageUploader value={draft.images} onChange={(images) => set("images", images)} />}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <Field label="Product name" error={errors.name}>
              <Input autoComplete="off" value={draft.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Price (GH₵)" hint="Includes shipping from China and duty." error={errors.price}>
              <Input inputMode="decimal" value={draft.price} onChange={(e) => set("price", e.target.value)} />
            </Field>
            <Field label="Description" optional hint="What it is, size, material. Plain words.">
              <Textarea
                rows={5}
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-5">
            <Field label="Category" error={errors.categoryId}>
              <Select
                value={draft.categoryId}
                onValueChange={(v) => set("categoryId", v)}
                placeholder="Choose a category"
                options={categories.data?.map((c) => ({ value: c.id, label: c.name })) ?? []}
              />
            </Field>

            <div className="flex flex-col gap-3">
              <div>
                <h3 className="font-medium">Sizes, colours and other options</h3>
                <p className="text-sm text-fg-muted">Optional. Customers pick one option per group.</p>
              </div>
              {draft.groups.map((g, i) => (
                <div
                  key={g.key}
                  className="flex flex-col gap-3 rounded-card bg-subtle p-4"
                  data-testid="variant-group"
                >
                  <Field label="Group name">
                    <Input
                      placeholder="Size"
                      value={g.name}
                      onChange={(e) =>
                        set(
                          "groups",
                          draft.groups.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)),
                        )
                      }
                    />
                  </Field>
                  <Field label="Options, separated by commas">
                    <Input
                      placeholder="S, M, L, XL"
                      value={g.options}
                      onChange={(e) =>
                        set(
                          "groups",
                          draft.groups.map((x, k) => (k === i ? { ...x, options: e.target.value } : x)),
                        )
                      }
                    />
                  </Field>
                  <Field label="Limit per option" optional hint="Leave empty to share the product limit.">
                    <Input
                      inputMode="numeric"
                      value={g.limitEach}
                      onChange={(e) =>
                        set(
                          "groups",
                          draft.groups.map((x, k) =>
                            k === i ? { ...x, limitEach: e.target.value.replace(/\D/g, "") } : x,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-start"
                    onClick={() =>
                      set(
                        "groups",
                        draft.groups.filter((_, k) => k !== i),
                      )
                    }
                  >
                    <Trash2 className="size-4" aria-hidden /> Remove group
                  </Button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    set("groups", [
                      ...draft.groups,
                      { key: newKey(), name: "Size", options: "S, M, L, XL", limitEach: "" },
                    ])
                  }
                >
                  <Plus className="size-4" aria-hidden /> Add sizes
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    set("groups", [
                      ...draft.groups,
                      { key: newKey(), name: "Colour", options: "", limitEach: "" },
                    ])
                  }
                >
                  <Plus className="size-4" aria-hidden /> Add colours
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <Field
              label="How many people can preorder?"
              hint="When this is reached the product shows as sold out."
              error={errors.limit}
            >
              <Input
                inputMode="numeric"
                value={draft.limit}
                onChange={(e) => set("limit", e.target.value.replace(/\D/g, ""))}
              />
            </Field>
            <Field
              label="Container"
              hint="Sets the expected arrival date and the balance due date."
              error={errors.batchId}
            >
              <Select
                value={draft.batchId}
                onValueChange={(v) => set("batchId", v)}
                placeholder="Choose a container"
                options={
                  batches.data
                    ?.filter((b) => b.batch.status !== "arrived_in_ghana" || b.batch.id === draft.batchId)
                    .map((b) => ({
                      value: b.batch.id,
                      label: `${b.batch.name}, arrives ${formatArrivalWindow(b.batch.expectedArrival)}`,
                    })) ?? []
                }
              />
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4" data-testid="product-review">
            <div className="flex gap-4">
              {draft.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.images[0].src}
                  alt="Cover photo"
                  className="size-24 shrink-0 rounded-btn object-cover"
                />
              ) : (
                <div className="flex size-24 shrink-0 items-center justify-center rounded-btn bg-subtle text-center text-xs text-fg-muted">
                  No photo
                </div>
              )}
              <div className="min-w-0">
                <p className="text-lg font-semibold">{draft.name || "Untitled"}</p>
                <p className="font-semibold tabular-nums">{price ? formatGHS(price) : "No price"}</p>
                <p className="text-sm text-fg-muted">
                  {category?.name ?? "No category"} · {draft.images.length}{" "}
                  {draft.images.length === 1 ? "photo" : "photos"}
                </p>
              </div>
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-fg-muted">Container</dt>
                <dd className="font-medium">
                  {batch ? `${batch.name}, ${formatArrivalWindow(batch.expectedArrival)}` : "None"}
                </dd>
              </div>
              <div>
                <dt className="text-fg-muted">Limit</dt>
                <dd className="font-medium">{draft.limit} preorders</dd>
              </div>
              {draft.groups
                .filter((g) => g.name.trim())
                .map((g) => (
                  <div key={g.key}>
                    <dt className="text-fg-muted">{g.name}</dt>
                    <dd className="font-medium">{parseOptions(g.options).join(", ") || "No options"}</dd>
                  </div>
                ))}
            </dl>
            {noPhotos && (
              <p role="status" className="rounded-card bg-warning-soft p-3 text-sm">
                Add at least one photo to publish. You can still save a draft.
              </p>
            )}
            {save.isError && <ErrorPanel message={save.error.message} />}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                block="responsive"
                disabled={noPhotos}
                loading={save.isPending}
                onClick={() => submit("published")}
              >
                {product ? "Save changes" : "Publish"}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                block="responsive"
                disabled={save.isPending}
                onClick={() => submit("draft")}
              >
                Save draft
              </Button>
            </div>
            {product && <Badge tone="neutral">Currently {product.status}</Badge>}
          </div>
        )}

        <div className="hidden md:block">{nav}</div>
      </Card>

      <BottomBar>{step < last ? nav : <div className="flex gap-3">{nav}</div>}</BottomBar>
      <div className="h-20 md:hidden" aria-hidden />
    </>
  );
}

/** Add (no id) or edit (id). Edit waits for the product to load, then starts from its values. */
export function ProductForm({ id }: { id?: string }) {
  const q = useAdminProduct(id ?? null);
  if (!id) return <ProductFormInner />;
  if (q.isPending) return <Skeleton className="h-64 max-w-3xl rounded-card-lg" aria-busy="true" />;
  if (q.isError) {
    return (
      <>
        <ErrorPanel message={q.error.message} onRetry={() => q.refetch()} />
        <Button asChild variant="secondary" className="self-start">
          <Link href="/admin/products">Back to products</Link>
        </Button>
      </>
    );
  }
  return <ProductFormInner product={q.data} />;
}
