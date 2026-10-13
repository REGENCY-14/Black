/**
 * Real HTTP implementation of the API contract. Point NEXT_PUBLIC_API_URL at the backend and set
 * NEXT_PUBLIC_USE_MOCKS=false. Route shapes below are the proposed contract for the backend team.
 */
import { ApiError, type Api, type ApiErrorCode } from "../types";

const base = () => process.env.NEXT_PUBLIC_API_URL ?? "";

async function request<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base()}${path}`, {
      ...init,
      credentials: "include", // session cookie for the admin area
      headers: { "content-type": "application/json", ...init?.headers },
      body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    });
  } catch {
    throw new ApiError("network", "We could not reach the server. Check your connection and try again.");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { code?: ApiErrorCode; message?: string };
    throw new ApiError(
      body.code ?? (res.status === 404 ? "not_found" : "unknown"),
      body.message ?? "Something went wrong.",
    );
  }
  return (await res.json()) as T;
}

const qs = (o: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};

export const httpApi: Api = {
  listCategories: () => request("/categories"),
  listProducts: (q = {}) => request(`/products${qs({ ...q })}`),
  getProduct: (slug) => request(`/products/${encodeURIComponent(slug)}`),
  listBatches: () => request("/batches"),
  getBatch: (id) => request(`/batches/${encodeURIComponent(id)}`),
  createOrder: (input) => request("/orders", { method: "POST", json: input }),
  lookupOrder: (l) => request("/orders/lookup", { method: "POST", json: l }),
  requestCancellation: (l) => request("/orders/cancel-request", { method: "POST", json: l }),
  admin: {
    login: (input) => request("/admin/login", { method: "POST", json: input }),
    logout: () => request("/admin/logout", { method: "POST" }),
    session: () => request("/admin/session"),
    dashboard: () => request("/admin/dashboard"),
    listOrders: (q = {}) =>
      request(`/admin/orders${qs({ ...q, balanceOutstanding: q.balanceOutstanding ? "1" : undefined })}`),
    getOrder: (id) => request(`/admin/orders/${encodeURIComponent(id)}`),
    advanceOrder: (id) => request(`/admin/orders/${encodeURIComponent(id)}/advance`, { method: "POST" }),
    setDelayed: (id, input) =>
      request(`/admin/orders/${encodeURIComponent(id)}/delay`, { method: "POST", json: input }),
    resumeOrder: (id) => request(`/admin/orders/${encodeURIComponent(id)}/resume`, { method: "POST" }),
    recordPayment: (id, input) =>
      request(`/admin/orders/${encodeURIComponent(id)}/payments`, { method: "POST", json: input }),
    cancelOrder: (id, input) =>
      request(`/admin/orders/${encodeURIComponent(id)}/cancel`, { method: "POST", json: input }),
    markRefunded: (id) => request(`/admin/orders/${encodeURIComponent(id)}/refunded`, { method: "POST" }),
    listBatches: () => request("/admin/batches"),
    advanceBatch: (id) => request(`/admin/batches/${encodeURIComponent(id)}/advance`, { method: "POST" }),
    listProducts: (q = {}) => request(`/admin/products${qs({ ...q })}`),
    getProduct: (id) => request(`/admin/products/${encodeURIComponent(id)}`),
    saveProduct: (id, input) =>
      id
        ? request(`/admin/products/${encodeURIComponent(id)}`, { method: "PUT", json: input })
        : request("/admin/products", { method: "POST", json: input }),
    setProductStatus: (id, status) =>
      request(`/admin/products/${encodeURIComponent(id)}/status`, { method: "POST", json: { status } }),
    deleteProduct: (id) => request(`/admin/products/${encodeURIComponent(id)}`, { method: "DELETE" }),
    createCategory: (name) => request("/admin/categories", { method: "POST", json: { name } }),
    renameCategory: (id, name) =>
      request(`/admin/categories/${encodeURIComponent(id)}`, { method: "PUT", json: { name } }),
    moveCategory: (id, direction) =>
      request(`/admin/categories/${encodeURIComponent(id)}/move`, { method: "POST", json: { direction } }),
    deleteCategory: (id) => request(`/admin/categories/${encodeURIComponent(id)}`, { method: "DELETE" }),
    listStaff: () => request("/admin/staff"),
    createStaff: (input) => request("/admin/staff", { method: "POST", json: input }),
    setStaffActive: (id, active) =>
      request(`/admin/staff/${encodeURIComponent(id)}/active`, { method: "POST", json: { active } }),
  },
  payments: {
    startPayment: (input) => request("/payments", { method: "POST", json: input }),
    checkPayment: (reference) => request(`/payments/${encodeURIComponent(reference)}`),
  },
};
