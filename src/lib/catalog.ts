import { cacheLife } from "next/cache";
import { api } from "@/lib/api/client";
import { ApiError, type ProductQuery } from "@/lib/api/types";

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

/** Returns null when the product does not exist so pages can call notFound(). */
export async function getProduct(slug: string) {
  "use cache";
  cacheLife("minutes");
  try {
    return await api.getProduct(slug);
  } catch (e) {
    if (e instanceof ApiError && e.code === "not_found") return null;
    throw e;
  }
}

export async function getBatches() {
  "use cache";
  cacheLife("hours");
  return api.listBatches();
}
