"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { Batch, OrderLookup, ProductQuery, StartPaymentInput } from "@/lib/api/types";

export const keys = {
  categories: ["categories"] as const,
  products: (q: ProductQuery) => ["products", q] as const,
  product: (slug: string) => ["product", slug] as const,
  batches: ["batches"] as const,
  order: (l: OrderLookup) => ["order", l.orderNumber, l.contact] as const,
  payment: (ref: string) => ["payment", ref] as const,
};

const minutes = (n: number) => n * 60_000;

export function useCategories() {
  return useQuery({ queryKey: keys.categories, queryFn: () => api.listCategories(), staleTime: minutes(30) });
}

export function useProducts(query: Omit<ProductQuery, "cursor"> = {}) {
  return useInfiniteQuery({
    queryKey: keys.products(query),
    queryFn: ({ pageParam }) => api.listProducts({ ...query, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    staleTime: minutes(2),
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: keys.product(slug),
    queryFn: () => api.getProduct(slug),
    staleTime: minutes(2),
  });
}

export function useBatches() {
  return useQuery({ queryKey: keys.batches, queryFn: () => api.listBatches(), staleTime: minutes(10) });
}

/** The soonest container that has not arrived yet. */
export function nextBatchOf(batches: Batch[] | undefined): Batch | undefined {
  return batches
    ?.filter((b) => b.status !== "arrived_in_ghana")
    .sort((a, b) => a.expectedArrival.localeCompare(b.expectedArrival))[0];
}

export function useNextBatch() {
  const q = useBatches();
  return { ...q, data: nextBatchOf(q.data) };
}

/** Looks an order up by order number plus phone/email. Pass null until the form is submitted. */
export function useOrder(lookup: OrderLookup | null) {
  return useQuery({
    queryKey: lookup ? keys.order(lookup) : ["order", "idle"],
    queryFn: () => api.lookupOrder(lookup!),
    enabled: !!lookup,
    retry: false,
    staleTime: 0,
  });
}

export function useCreateOrder() {
  return useMutation({ mutationFn: api.createOrder });
}

export function useRequestCancellation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (l: OrderLookup) => api.requestCancellation(l),
    onSuccess: (order, l) => qc.setQueryData(keys.order(l), order),
  });
}

export function useStartPayment() {
  return useMutation({ mutationFn: (input: StartPaymentInput) => api.payments.startPayment(input) });
}

/** Polls a pending payment (MoMo approval) every 2s until it settles or `enabled` is turned off. */
export function usePaymentStatus(reference: string | null, enabled = true) {
  return useQuery({
    queryKey: keys.payment(reference ?? "none"),
    queryFn: () => api.payments.checkPayment(reference!),
    enabled: !!reference && enabled,
    refetchInterval: (q) => (q.state.data?.status === "pending" || !q.state.data ? 2000 : false),
    retry: false,
    gcTime: 0,
  });
}
