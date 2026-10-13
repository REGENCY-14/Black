"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { keys } from "@/hooks/api";
import type {
  AdminOrderQuery,
  AdminProductQuery,
  CreateStaffInput,
  Order,
  ProductInput,
  ProductStatus,
  RecordPaymentInput,
  Session,
} from "@/lib/api/types";

const admin = api.admin;

export const akeys = {
  session: ["admin", "session"] as const,
  dashboard: ["admin", "dashboard"] as const,
  orders: (q: AdminOrderQuery) => ["admin", "orders", q] as const,
  order: (id: string) => ["admin", "order", id] as const,
  batches: ["admin", "batches"] as const,
  products: (q: AdminProductQuery) => ["admin", "products", q] as const,
  product: (id: string) => ["admin", "product", id] as const,
  staff: ["admin", "staff"] as const,
};

/** The signed-in user, or null. Everything in the admin area keys off this. */
export function useSession() {
  return useQuery({
    queryKey: akeys.session,
    queryFn: () => admin.session(),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: admin.login,
    onSuccess: (session: Session) => {
      void qc.removeQueries({ queryKey: ["admin"] });
      qc.setQueryData(akeys.session, session);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => admin.logout(),
    onSuccess: () => {
      // drop every cached admin result so the next person never sees the last person's data
      qc.removeQueries({ queryKey: ["admin"] });
      qc.setQueryData(akeys.session, null);
    },
  });
}

export function useDashboard() {
  return useQuery({ queryKey: akeys.dashboard, queryFn: () => admin.dashboard(), retry: false });
}

export function useAdminOrders(query: AdminOrderQuery = {}) {
  return useQuery({ queryKey: akeys.orders(query), queryFn: () => admin.listOrders(query), retry: false });
}

export function useAdminOrder(id: string) {
  return useQuery({ queryKey: akeys.order(id), queryFn: () => admin.getOrder(id), retry: false });
}

/** After any order change: update the open order and refresh lists, counts and batches. */
function useOrderMutation<V>(fn: (vars: V) => Promise<Order>, orderId: (vars: V) => string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (order, vars) => {
      qc.setQueryData(akeys.order(orderId(vars)), order);
      void qc.invalidateQueries({ queryKey: ["admin", "orders"] });
      void qc.invalidateQueries({ queryKey: akeys.dashboard });
      void qc.invalidateQueries({ queryKey: akeys.batches });
    },
  });
}

export const useAdvanceOrder = () =>
  useOrderMutation(
    (id: string) => admin.advanceOrder(id),
    (id) => id,
  );
export const useSetDelayed = () =>
  useOrderMutation(
    (v: { id: string; note: string; delayedUntil?: string }) =>
      admin.setDelayed(v.id, { note: v.note, delayedUntil: v.delayedUntil }),
    (v) => v.id,
  );
export const useResumeOrder = () =>
  useOrderMutation(
    (id: string) => admin.resumeOrder(id),
    (id) => id,
  );
export const useRecordPayment = () =>
  useOrderMutation(
    (v: { id: string; input: RecordPaymentInput }) => admin.recordPayment(v.id, v.input),
    (v) => v.id,
  );
export const useCancelOrder = () =>
  useOrderMutation(
    (v: { id: string; note?: string }) => admin.cancelOrder(v.id, { note: v.note }),
    (v) => v.id,
  );
export const useMarkRefunded = () =>
  useOrderMutation(
    (id: string) => admin.markRefunded(id),
    (id) => id,
  );

export function useAdminBatches() {
  return useQuery({ queryKey: akeys.batches, queryFn: () => admin.listBatches(), retry: false });
}

export function useAdvanceBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => admin.advanceBatch(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin"] });
      void qc.invalidateQueries({ queryKey: ["batches"] });
    },
  });
}

export function useAdminProducts(query: AdminProductQuery = {}) {
  return useQuery({
    queryKey: akeys.products(query),
    queryFn: () => admin.listProducts(query),
    retry: false,
  });
}

export function useAdminProduct(id: string | null) {
  return useQuery({
    queryKey: akeys.product(id ?? "new"),
    queryFn: () => admin.getProduct(id!),
    enabled: !!id,
    retry: false,
  });
}

/** Product changes must also refresh what shoppers see. */
function useProductInvalidation() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["admin", "products"] });
    void qc.invalidateQueries({ queryKey: ["admin", "product"] });
    void qc.invalidateQueries({ queryKey: ["products"] });
    void qc.invalidateQueries({ queryKey: ["product"] });
  };
}

export function useSaveProduct() {
  const refresh = useProductInvalidation();
  return useMutation({
    mutationFn: (v: { id: string | null; input: ProductInput }) => admin.saveProduct(v.id, v.input),
    onSuccess: refresh,
  });
}

export function useSetProductStatus() {
  const refresh = useProductInvalidation();
  return useMutation({
    mutationFn: (v: { id: string; status: ProductStatus }) => admin.setProductStatus(v.id, v.status),
    onSuccess: refresh,
  });
}

export function useDeleteProduct() {
  const refresh = useProductInvalidation();
  return useMutation({ mutationFn: (id: string) => admin.deleteProduct(id), onSuccess: refresh });
}

function useCategoryMutation<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.categories });
      void qc.invalidateQueries({ queryKey: ["admin", "products"] });
    },
  });
}

export const useCreateCategory = () => useCategoryMutation((name: string) => admin.createCategory(name));
export const useRenameCategory = () =>
  useCategoryMutation((v: { id: string; name: string }) => admin.renameCategory(v.id, v.name));
export const useMoveCategory = () =>
  useCategoryMutation((v: { id: string; direction: "up" | "down" }) => admin.moveCategory(v.id, v.direction));
export const useDeleteCategory = () => useCategoryMutation((id: string) => admin.deleteCategory(id));

export function useStaff() {
  return useQuery({ queryKey: akeys.staff, queryFn: () => admin.listStaff(), retry: false });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStaffInput) => admin.createStaff(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: akeys.staff }),
  });
}

export function useSetStaffActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; active: boolean }) => admin.setStaffActive(v.id, v.active),
    onSuccess: () => void qc.invalidateQueries({ queryKey: akeys.staff }),
  });
}
