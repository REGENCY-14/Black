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
  payments: {
    startPayment: (input) => request("/payments", { method: "POST", json: input }),
    checkPayment: (reference) => request(`/payments/${encodeURIComponent(reference)}`),
  },
};
