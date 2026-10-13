/**
 * In-memory mock of the API. Orders persist to localStorage in the browser so a mock
 * preorder survives a reload (tracking, balance payment). Latency only applies in the browser.
 *
 * Mock payment behaviour (so every UI state can be exercised):
 *  - Card: succeeds immediately.
 *  - MoMo: waits for "approval" about 4s, then succeeds.
 *  - MoMo wallet number ending in 00: customer declines, so the payment fails.
 *  - MoMo wallet number ending in 99: never approved, so the UI hits its timeout.
 */
import { businessRules } from "@/config";
import { balanceDueDate, isBalanceDuePassed } from "@/lib/dates";
import { computeDeposit, sumPesewas } from "@/lib/money";
import { isValidGhPhone, normalizeGhPhone, normalizeOrderNumber } from "@/lib/phone";
import { spotsLeft, variantLabels } from "@/lib/catalog-utils";
import { balanceMinor, canRequestCancellation } from "@/lib/status";
import {
  ApiError,
  type Api,
  type Batch,
  type CreateOrderInput,
  type CreateOrderResult,
  type Order,
  type OrderLookup,
  type Page,
  type PaymentAdapter,
  type PaymentAttempt,
  type Product,
  type ProductQuery,
  type StartPaymentInput,
} from "../types";
import { batches, categories, products, seedOrders } from "./seed";

const STORAGE_KEY = "mock-db-v1";
const isBrowser = typeof window !== "undefined";

const delay = (min = 120, max = 380) =>
  isBrowser ? new Promise<void>((r) => setTimeout(r, min + Math.random() * (max - min))) : Promise.resolve();

/** Set NEXT_PUBLIC_MOCK_FAILURES=true to see error states during development. */
function maybeFail() {
  if (isBrowser && !navigator.onLine) {
    throw new ApiError("network", "You are offline. Check your connection and try again.");
  }
  if (isBrowser && process.env.NEXT_PUBLIC_MOCK_FAILURES === "true" && Math.random() < 0.08) {
    throw new ApiError("network", "Something went wrong on our side. Try again in a moment.");
  }
}

/* ---------- state ---------- */

let orders: Order[] | null = null;

function load(): Order[] {
  if (orders) return orders;
  if (isBrowser) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return (orders = JSON.parse(raw) as Order[]);
    } catch {
      /* fall through to seed */
    }
  }
  return (orders = seedOrders());
}

function save() {
  if (!isBrowser || !orders) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {
    /* storage full or blocked: keep in memory only */
  }
}

const clone = <T>(v: T): T => structuredClone(v);

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(n: number) {
  let s = "";
  for (let i = 0; i < n; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

/* ---------- catalogue ---------- */

function listProducts(q: ProductQuery = {}): Page<Product> {
  const { search, categorySlug, sort = "newest", cursor, limit = 12 } = q;
  let list = products.filter((p) => p.status === "published");
  if (categorySlug && categorySlug !== "all") {
    const cat = categories.find((c) => c.slug === categorySlug);
    list = cat ? list.filter((p) => p.categoryId === cat.id) : [];
  }
  if (search?.trim()) {
    const term = search.trim().toLowerCase();
    list = list.filter((p) => p.name.toLowerCase().includes(term));
  }
  const sorters: Record<NonNullable<ProductQuery["sort"]>, (a: Product, b: Product) => number> = {
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    price_asc: (a, b) => a.priceMinor - b.priceMinor,
    price_desc: (a, b) => b.priceMinor - a.priceMinor,
    popular: (a, b) => b.ordered - a.ordered, // "Popular" means most ordered (Q20)
  };
  list = [...list].sort(sorters[sort]);
  const offset = cursor ? Number.parseInt(cursor, 10) || 0 : 0;
  const items = list.slice(offset, offset + limit);
  const next = offset + limit;
  return { items: clone(items), nextCursor: next < list.length ? String(next) : null, total: list.length };
}

/* ---------- orders ---------- */

function findOwned({ orderNumber, contact }: OrderLookup): Order {
  const num = normalizeOrderNumber(orderNumber);
  const c = contact.trim();
  const phone = normalizeGhPhone(c);
  const order = load().find((o) => o.orderNumber === num);
  const ok =
    order &&
    ((phone && order.customer.phone === phone) ||
      (c.includes("@") && order.customer.email?.toLowerCase() === c.toLowerCase()));
  if (!order || !ok) {
    throw new ApiError(
      "not_found",
      "We could not find that order. Check the order number and the phone or email you used.",
    );
  }
  return order;
}

function createOrder(input: CreateOrderInput): CreateOrderResult {
  const { customer, lines, plan } = input;
  if (!lines.length) throw new ApiError("validation", "Your cart is empty.");
  if (!customer.name.trim()) throw new ApiError("validation", "Enter your name.");
  if (!isValidGhPhone(customer.phone)) throw new ApiError("validation", "Enter a valid Ghana phone number.");

  const byBatch = new Map<string, { product: Product; line: (typeof lines)[number] }[]>();
  for (const line of lines) {
    const product = products.find((p) => p.id === line.productId && p.status === "published");
    if (!product) throw new ApiError("not_found", "One of the items in your cart is no longer available.");
    if (line.quantity < 1) throw new ApiError("validation", "Quantity must be at least 1.");
    if (line.quantity > spotsLeft(product, line.variants)) {
      throw new ApiError(
        "validation",
        `Only ${spotsLeft(product, line.variants)} spots left for ${product.name}.`,
      );
    }
    byBatch.set(product.batchId, [...(byBatch.get(product.batchId) ?? []), { product, line }]);
  }

  const created: Order[] = [];
  const all = load();
  for (const [batchId, group] of byBatch) {
    const batch = batches.find((b) => b.id === batchId) as Batch;
    if (plan === "deposit" && isBalanceDuePassed(batch.expectedArrival)) {
      throw new ApiError(
        "validation",
        "The balance date for this container has passed. Pay in full to order.",
      );
    }
    const items = group.map(({ product, line }) => ({
      productId: product.id,
      name: product.name,
      imageSrc: product.images[0]!.src,
      unitPriceMinor: product.priceMinor,
      quantity: line.quantity,
      variants: variantLabels(product, line.variants),
    }));
    const now = new Date().toISOString();
    const order: Order = {
      id: `o${all.length + created.length + 1}-${randomCode(3)}`,
      orderNumber: `ORD-${randomCode(6)}`,
      customer: { ...customer, phone: normalizeGhPhone(customer.phone)! },
      items,
      totalMinor: sumPesewas(items.map((i) => i.unitPriceMinor * i.quantity)),
      paidMinor: 0,
      status: "confirmed",
      step: "confirmed",
      history: [], // the "confirmed" entry is written when payment is confirmed (FR-4.3)
      payments: [],
      batchId,
      batchName: batch.name,
      expectedArrival: batch.expectedArrival,
      balanceDueDate: balanceDueDate(batch.expectedArrival, businessRules.balance.dueDaysBeforeArrival),
      createdAt: now,
    };
    group.forEach(({ product, line }) => {
      product.ordered += line.quantity;
      for (const g of product.variantGroups) {
        const opt = g.options.find((o) => o.id === line.variants[g.id]);
        if (opt) opt.ordered += line.quantity;
      }
    });
    created.push(order);
  }
  all.push(...created);
  save();

  const amountDueMinor = sumPesewas(
    created.map((o) => (plan === "full" ? o.totalMinor : computeDeposit(o.totalMinor))),
  );
  return { orders: clone(created), amountDueMinor };
}

/* ---------- payments ---------- */

interface Attempt extends PaymentAttempt {
  input: StartPaymentInput;
  startedAt: number;
  settled: boolean;
}
const attempts = new Map<string, Attempt>();

function dueFor(order: Order, kind: StartPaymentInput["kind"]): number {
  if (kind === "deposit") return order.paidMinor > 0 ? 0 : computeDeposit(order.totalMinor);
  return balanceMinor(order); // "full" and "balance" both settle what is left
}

function applyPayment(a: Attempt) {
  if (a.settled) return;
  a.settled = true;
  const now = new Date().toISOString();
  for (const id of a.input.orderIds) {
    const order = load().find((o) => o.id === id);
    if (!order) continue;
    const amount = dueFor(order, a.input.kind);
    if (amount <= 0) continue;
    const first = order.paidMinor === 0;
    order.paidMinor += amount;
    order.payments.push({
      id: `pay-${a.reference}-${order.id}`,
      kind: a.input.kind,
      amountMinor: amount,
      method: a.input.method,
      status: "success",
      reference: a.reference,
      createdAt: now,
    });
    if (first) order.history.push({ status: "confirmed", note: "Payment received.", at: now });
  }
  save();
}

const mockPayments: PaymentAdapter = {
  async startPayment(input) {
    await delay(300, 700);
    if (input.amountMinor <= 0) throw new ApiError("validation", "Nothing to pay on this order.");
    const owed = sumPesewas(
      input.orderIds.map((id) => {
        const o = load().find((x) => x.id === id);
        if (!o) throw new ApiError("not_found", "Order not found.");
        return dueFor(o, input.kind);
      }),
    );
    if (owed !== input.amountMinor) {
      throw new ApiError("validation", "The amount does not match what is due. Refresh and try again.");
    }
    const reference = `PAY-${randomCode(8)}`;
    const isMomo = input.method !== "card";
    const attempt: Attempt = {
      reference,
      status: isMomo ? "pending" : "success",
      awaitingApproval: isMomo,
      input,
      startedAt: Date.now(),
      settled: false,
    };
    attempts.set(reference, attempt);
    if (!isMomo) applyPayment(attempt);
    return { reference, status: attempt.status, awaitingApproval: attempt.awaitingApproval };
  },

  async checkPayment(reference) {
    await delay(100, 250);
    const a = attempts.get(reference);
    if (!a) throw new ApiError("not_found", "Payment not found.");
    if (a.status !== "pending") return { reference, status: a.status, failureReason: a.failureReason };
    const waited = Date.now() - a.startedAt;
    const wallet = a.input.phone ?? "";
    if (wallet.endsWith("99")) return { reference, status: "pending", awaitingApproval: true };
    if (wallet.endsWith("00") && waited > 3000) {
      a.status = "failed";
      a.failureReason = "The payment was declined on your phone. Check your MoMo balance and try again.";
      return { reference, status: "failed", failureReason: a.failureReason };
    }
    if (waited > 4000 && !wallet.endsWith("00")) {
      a.status = "success";
      a.awaitingApproval = false;
      applyPayment(a);
      return { reference, status: "success" };
    }
    return { reference, status: "pending", awaitingApproval: true };
  },
};

/* ---------- api ---------- */

export const mockApi: Api = {
  async listCategories() {
    await delay();
    maybeFail();
    return clone(categories);
  },
  async listProducts(q) {
    await delay();
    maybeFail();
    return listProducts(q);
  },
  async getProduct(slug) {
    await delay();
    maybeFail();
    const p = products.find((x) => x.slug === slug && x.status !== "draft");
    if (!p) throw new ApiError("not_found", "We could not find that product.");
    return clone(p);
  },
  async listBatches() {
    await delay();
    return clone(batches);
  },
  async getBatch(id) {
    await delay();
    const b = batches.find((x) => x.id === id);
    if (!b) throw new ApiError("not_found", "Batch not found.");
    return clone(b);
  },
  async createOrder(input) {
    await delay(300, 700);
    maybeFail();
    return createOrder(input);
  },
  async lookupOrder(lookup) {
    await delay();
    maybeFail();
    return clone(findOwned(lookup));
  },
  async requestCancellation(lookup) {
    await delay(300, 600);
    const order = findOwned(lookup);
    if (!canRequestCancellation(order)) {
      throw new ApiError(
        "validation",
        "This order has already shipped from China, so it can no longer be cancelled.",
      );
    }
    const now = new Date().toISOString();
    order.status = "cancelled";
    order.history.push({ status: "cancelled", note: "Cancelled at the customer's request.", at: now });
    order.refund = { status: order.paidMinor > 0 ? "pending" : "none", amountMinor: order.paidMinor };
    save();
    return clone(order);
  },
  payments: mockPayments,
};
