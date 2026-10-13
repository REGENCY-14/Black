import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductView } from "@/components/store/ProductView";
import { Skeleton } from "@/components/ui/Skeleton";
import { brand } from "@/config";
import { getBatches, getCategories, getProduct, getProducts } from "@/lib/catalog";

export async function generateStaticParams() {
  const { items } = await getProducts({ limit: 100 });
  return items.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description,
    openGraph: { title: product.name, description: product.description, images: [product.images[0]!.src] },
  };
}

export default function ProductPage(props: PageProps<"/shop/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent params={props.params} />
    </Suspense>
  );
}

async function ProductContent({ params }: { params: PageProps<"/shop/[slug]">["params"] }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const [batches, categories] = await Promise.all([getBatches(), getCategories()]);
  const batch = batches.find((b) => b.id === product.batchId);
  if (!batch) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((i) => i.src),
    brand: { "@type": "Brand", name: brand.name },
    offers: {
      "@type": "Offer",
      priceCurrency: "GHS",
      price: (product.priceMinor / 100).toFixed(2),
      availability:
        product.availability === "preorder" ? "https://schema.org/PreOrder" : "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ProductView
        product={product}
        batch={batch}
        category={categories.find((c) => c.id === product.categoryId)}
      />
    </>
  );
}

function ProductSkeleton() {
  return (
    <div className="container-page grid gap-6 py-4 md:py-10 lg:grid-cols-2">
      <Skeleton className="aspect-[4/5] rounded-card-lg" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24" />
        <Skeleton className="h-control-lg" />
      </div>
    </div>
  );
}
