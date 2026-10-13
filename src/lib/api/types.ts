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
/** Methods a payment can have been made with, including ones staff record by hand. */
export type RecordedMethod = PaymentMethod | "cash" | "bank_transfer";
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
  method: RecordedMethod;
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

/* ---------- admin ---------- */

export type Role = "owner" | "ghana_staff";

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface Session {
  user: Pick<StaffUser, "id" | "name" | "email" | "role">;
}

export interface AdminOrderQuery {
  status?: OrderStatus | "all";
  /** Only orders that still owe money. */
  balanceOutstanding?: boolean;
  batchId?: string;
  /** Matches order number, customer name or phone. */
  search?: string;
}

export interface DashboardStats {
  /** New paid orders and orders that arrived in Ghana: the ones that need somebody to act. */
  awaitingAction: number;
  balancesOutstandingCount: number;
  balancesOutstandingMinor: number;
  totalOrders: number;
  nextBatch?: Batch;
  recentOrders: Order[];
}

export interface BatchSummary {
  batch: Batch;
  orderCount: number;
  customerCount: number;
  delayedCount: number;
}

export interface BatchAdvanceResult {
  batch: Batch;
  updated: number;
  skippedDelayed: number;
  /** Customers who get a WhatsApp message (SMS fallback). */
  notified: number;
}

export interface RecordPaymentInput {
  amountMinor: number;
  method: Extract<
    RecordedMethod,
    "cash" | "bank_transfer" | "mtn_momo" | "telecel_cash" | "airteltigo_money"
  >;
  note?: string;
}

export interface VariantGroupInput {
  id?: string;
  name: string;
  options: { id?: string; label: string; limit?: number }[];
}

export interface ProductInput {
  name: string;
  description: string;
  priceMinor: number;
  images: ProductImage[];
  categoryId: string;
  batchId: string;
  limit: number;
  variantGroups: VariantGroupInput[];
  status: ProductStatus;
}

export interface AdminProductQuery {
  search?: string;
  status?: ProductStatus | "all";
}

export interface CreateStaffInput {
  name: string;
  email: string;
  password: string;
}

/**
 * Admin endpoints. Every call is authorised on the server: `ghana_staff` may view orders, record
 * payments, update order status and advance batches; everything else needs `owner`.
 */
export interface AdminApi {
  login(input: { email: string; password: string }): Promise<Session>;
  logout(): Promise<void>;
  session(): Promise<Session | null>;

  dashboard(): Promise<DashboardStats>;

  listOrders(query?: AdminOrderQuery): Promise<Order[]>;
  getOrder(id: string): Promise<Order>;
  advanceOrder(id: string): Promise<Order>;
  setDelayed(id: string, input: { note: string; delayedUntil?: string }): Promise<Order>;
  resumeOrder(id: string): Promise<Order>;
  recordPayment(id: string, input: RecordPaymentInput): Promise<Order>;
  /** owner only */
  cancelOrder(id: string, input: { note?: string }): Promise<Order>;
  /** owner only */
  markRefunded(id: string): Promise<Order>;

  listBatches(): Promise<BatchSummary[]>;
  advanceBatch(id: string): Promise<BatchAdvanceResult>;

  /** owner only from here down */
  listProducts(query?: AdminProductQuery): Promise<Product[]>;
  getProduct(id: string): Promise<Product>;
  saveProduct(id: string | null, input: ProductInput): Promise<Product>;
  setProductStatus(id: string, status: ProductStatus): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  createCategory(name: string): Promise<Category>;
  renameCategory(id: string, name: string): Promise<Category>;
  moveCategory(id: string, direction: "up" | "down"): Promise<Category[]>;
  deleteCategory(id: string): Promise<void>;

  listStaff(): Promise<StaffUser[]>;
  createStaff(input: CreateStaffInput): Promise<StaffUser>;
  setStaffActive(id: string, active: boolean): Promise<StaffUser>;
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
  admin: AdminApi;
}
