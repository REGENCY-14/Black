/**
 * API contracts. Every endpoint the UI needs is declared here and implemented twice:
 * `mock/` (in-memory, used by default) and `http/` (fetch to NEXT_PUBLIC_API_URL).
 * Components never call fetch; they use the hooks in src/hooks/api.ts.
 * Money is integer pesewas. Dates are ISO strings.
 */
import type { MomoNetwork } from "@/lib/phone";

/* ---------- catalogue ---------- */

export interface Category {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
}

export interface ProductImage {
  src: string;
  alt: string;
}

export interface VariantOption {
  id: string;
  label: string;
  /** Preorder limit for this option. Omit to share the product-level limit. */
  limit?: number;
  ordered: number;
}

export interface VariantGroup {
  id: string;
  name: string; // "Size", "Colour"
  options: VariantOption[];
}

export type Availability = "preorder" | "in_stock";
export type ProductStatus = "published" | "draft" | "hidden";

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceMinor: number;
  images: ProductImage[];
  categoryId: string;
  availability: Availability;
  /** The batch (container) this product ships in; drives the expected arrival date. */
  batchId: string;
  variantGroups: VariantGroup[];
  /** Total preorder limit across all variants. */
  limit: number;
  /** Units ordered so far; "Popular" sorts by this. */
  ordered: number;
  status: ProductStatus;
  createdAt: string;
}

export type BatchStatus = "sourcing" | "shipped_from_china" | "arrived_in_ghana";

export interface Batch {
  id: string;
  name: string;
  status: BatchStatus;
  expectedArrival: string;
  shippedAt?: string;
  arrivedAt?: string;
}

export type ProductSort = "newest" | "price_asc" | "price_desc" | "popular";

export interface ProductQuery {
  search?: string;
  categorySlug?: string;
  sort?: ProductSort;
  cursor?: string;
  limit?: number;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  total: number;
}

/* ---------- orders ---------- */

export type OrderStatus =
  | "confirmed"
  | "sourcing"
  | "shipped_from_china"
  | "arrived_in_ghana"
  | "out_for_delivery"
  | "delivered"
  | "delayed"
  | "cancelled";

/** The six steps on the customer-facing timeline. */
export type ProgressStep = Exclude<OrderStatus, "delayed" | "cancelled">;

export type PaymentMethod = "mtn_momo" | "telecel_cash" | "airteltigo_money" | "card";
export type PaymentPlan = "deposit" | "full";

export interface Customer {
  name: string;
  /** Normalised +233 number. */
  phone: string;
  email?: string;
  area: string;
  address: string;
  ghanaPostGps?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  imageSrc: string;
  unitPriceMinor: number;
  quantity: number;
  /** Chosen variants as display labels, e.g. { Size: "M", Colour: "Black" }. */
  variants: Record<string, string>;
}

export interface Payment {
  id: string;
  kind: "deposit" | "full" | "balance";
  amountMinor: number;
  method: PaymentMethod;
  status: "pending" | "success" | "failed";
  reference: string;
  createdAt: string;
}

export interface StatusEntry {
  status: OrderStatus;
  note?: string;
  at: string;
}

export interface Refund {
  status: "none" | "pending" | "refunded";
  amountMinor: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: Customer;
  items: OrderItem[];
  totalMinor: number;
  paidMinor: number;
  /** Current status. "delayed" and "cancelled" overlay the timeline. */
  status: OrderStatus;
  /** Last progress step reached. Kept while delayed or cancelled so the timeline position survives. */
  step: ProgressStep;
  delayNote?: string;
  /** New expected date when delayed. */
  delayedUntil?: string;
  history: StatusEntry[];
  payments: Payment[];
  batchId: string;
  batchName: string;
  expectedArrival: string;
  /** expectedArrival minus businessRules.balance.dueDaysBeforeArrival days. */
  balanceDueDate: string;
  refund?: Refund;
  createdAt: string;
}

export interface CartLineInput {
  productId: string;
  quantity: number;
  /** groupId -> optionId */
  variants: Record<string, string>;
}

export interface CreateOrderInput {
  customer: Customer;
  lines: CartLineInput[];
  plan: PaymentPlan;
}

export interface CreateOrderResult {
  /** One order per batch: items arriving at different times split into separate orders. */
  orders: Order[];
  /** Total due now across all orders for the chosen plan. */
  amountDueMinor: number;
}

export interface OrderLookup {
  orderNumber: string;
  /** Phone or email used to verify ownership. */
  contact: string;
}

/* ---------- payments ---------- */

export interface StartPaymentInput {
  orderIds: string[];
  amountMinor: number;
  kind: Payment["kind"];
  method: PaymentMethod;
  /** MoMo wallet number (normalised +233) when method is a mobile-money method. */
  phone?: string;
  network?: MomoNetwork;
}

export type PaymentState = "pending" | "success" | "failed";

export interface PaymentAttempt {
  reference: string;
  status: PaymentState;
  failureReason?: string;
  /** For MoMo: the customer must approve the prompt on their phone. */
  awaitingApproval?: boolean;
}

/** A real Paystack/Hubtel/Moolre adapter drops in behind this interface. */
export interface PaymentAdapter {
  startPayment(input: StartPaymentInput): Promise<PaymentAttempt>;
  checkPayment(reference: string): Promise<PaymentAttempt>;
}

/* ---------- api ---------- */

export type ApiErrorCode = "not_found" | "validation" | "network" | "forbidden" | "unknown";

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface Api {
  listCategories(): Promise<Category[]>;
  listProducts(query?: ProductQuery): Promise<Page<Product>>;
  getProduct(slug: string): Promise<Product>;
  listBatches(): Promise<Batch[]>;
  getBatch(id: string): Promise<Batch>;

  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  /** Verifies ownership (phone or email) before returning an order. */
  lookupOrder(lookup: OrderLookup): Promise<Order>;
  requestCancellation(lookup: OrderLookup): Promise<Order>;

  payments: PaymentAdapter;
}
