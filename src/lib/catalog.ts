import { cacheLife } from "next/cache";
import { api } from "@/lib/api/client";
import type { ProductQuery } from "@/lib/api/types";

/**
 * Server-side catalogue reads for statically generated pages (home, product).
 * Cached with `use cache`; the interactive shop list uses the client hooks instead.
 */
export async function getCategories() {
  "use cache";
  cacheLife("hours");
  return api.listCategories();
}

export async function getProducts(query: ProductQuery = {}) {
  "use cache";
  cacheLife("minutes");
  return api.listProducts(query);
}

export async function getProduct(slug: string) {
  "use cache";
  cacheLife("minutes");
  return api.getProduct(slug);
}

export async function getBatches() {
  "use cache";
  cacheLife("hours");
  return api.listBatches();
}
