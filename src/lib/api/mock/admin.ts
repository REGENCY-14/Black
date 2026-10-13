/**
 * Mock admin API. Authorisation is enforced here, exactly as the real backend must do it:
 *  - ghana_staff: dashboard, view orders, record payments, update order status, advance batches
 *  - owner: everything above plus cancel/refund, products, categories and staff
 * A signed-out caller, or staff calling an owner-only method, gets a "forbidden" error.
 */
import { normalizeGhPhone } from "@/lib/phone";
import { balanceMinor, hasBalanceDue, isAwaitingPayment, nextStep, stepIndex } from "@/lib/status";
import {
  ApiError,
  type AdminApi,
  type AdminOrderQuery,
  type BatchAdvanceResult,
  type BatchStatus,
  type Category,
  type Order,
  type Product,
  type ProductInput,
  type ProductStatus,
  type ProgressStep,
  type Role,
  type Session,
  type StaffUser,
  type VariantGroup,
} from "../types";
import {
  clone,
  delay,
  getState,
  maybeFail,
  randomCode,
  readSessionUserId,
  save,
  writeSessionUserId,
  type MockState,
  type StaffRecord,
} from "./state";

const OWNER: Role[] = ["owner"];
const BOTH: Role[] = ["owner", "ghana_staff"];

function currentUser(): StaffRecord | null {
  const id = readSessionUserId();
  return getState().staff.find((u) => u.id === id && u.active) ?? null;
}

function requireRole(roles: Role[]): StaffRecord {
  const user = currentUser();
  if (!user) throw new ApiError("forbidden", "Sign in to continue.");
  if (!roles.includes(user.role)) throw new ApiError("forbidden", "You do not have access to this.");
  return user;
}

/** Authorise, run against the shared state, persist, and hand back a copy. */
async function run<T>(roles: Role[], fn: (st: MockState, user: StaffRecord) => T): Promise<T> {
  await delay(80, 260);
  maybeFail();
  const user = requireRole(roles);
  const result = fn(getState(), user);
  save();
  return clone(result);
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function findOrder(st: MockState, id: string): Order {
  const o = st.orders.find((x) => x.id === id);
  if (!o) throw new ApiError("not_found", "Order not found.");
  return o;
}

function isFinished(o: Order) {
  return o.status === "cancelled" || o.step === "delivered";
}

const nowIso = () => new Date().toISOString();

/** Never send a password hash or plain password to the client. */
const publicUser = (u: StaffRecord): StaffUser => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  active: u.active,
});

/* ---------- batches ---------- */

const batchLadder: BatchStatus[] = ["sourcing", "shipped_from_china", "arrived_in_ghana"];

/* ---------- products ---------- */

function buildVariantGroups(
  input: ProductInput["variantGroups"],
  existing: VariantGroup[] = [],
): VariantGroup[] {
  return input
    .filter((g) => g.name.trim() && g.options.some((o) => o.label.trim()))
    .map((g) => {
      const id = g.id ?? slugify(g.name);
      const old = existing.find((x) => x.id === id);
      const seen = new Set<string>();
      return {
        id,
        name: g.name.trim(),
        options: g.options
          .filter((o) => o.label.trim())
          .map((o) => {
            let oid = o.id ?? slugify(o.label);
            while (seen.has(oid)) oid += "-2";
            seen.add(oid);
            return {
              id: oid,
              label: o.label.trim(),
              limit: o.limit && o.limit > 0 ? o.limit : undefined,
              ordered: old?.options.find((x) => x.id === oid)?.ordered ?? 0,
            };
          }),
      };
    });
}

function validateProduct(st: MockState, input: ProductInput) {
  if (input.name.trim().length < 2) throw new ApiError("validation", "Enter a product name.");
  if (!Number.isInteger(input.priceMinor) || input.priceMinor <= 0) {
    throw new ApiError("validation", "Enter a price above zero.");
  }
  if (!st.categories.some((c) => c.id === input.categoryId))
    throw new ApiError("validation", "Choose a category.");
  if (!st.batches.some((b) => b.id === input.batchId))
    throw new ApiError("validation", "Choose a container.");
  if (!Number.isInteger(input.limit) || input.limit < 1) {
    throw new ApiError("validation", "Set how many people can preorder (at least 1).");
  }
  if (input.status === "published" && input.images.length === 0) {
    throw new ApiError("validation", "Add at least one photo before publishing.");
  }
}

/* ---------- api ---------- */

export const adminApi: AdminApi = {
  async login({ email, password }) {
    await delay(300, 600);
    const user = getState().staff.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || user.password !== password) {
      throw new ApiError("validation", "Check your email and password and try again.");
    }
    if (!user.active)
      throw new ApiError("forbidden", "This account is disabled. Ask the owner to turn it back on.");
    writeSessionUserId(user.id);
    const session: Session = { user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    return session;
  },

  async logout() {
    await delay(50, 120);
    writeSessionUserId(null);
  },

  async session() {
    await delay(40, 120);
    const u = currentUser();
    return u ? { user: { id: u.id, name: u.name, email: u.email, role: u.role } } : null;
  },

  dashboard: () =>
    run(BOTH, (st) => {
      const live = st.orders.filter((o) => o.status !== "cancelled");
      const awaitingAction = live.filter(
        (o) =>
          isAwaitingPayment(o) ||
          (o.paidMinor > 0 && (o.status === "confirmed" || o.status === "arrived_in_ghana")),
      ).length;
      const owing = st.orders.filter(hasBalanceDue);
      const next = st.batches
        .filter((b) => b.status !== "arrived_in_ghana")
        .sort((a, b) => a.expectedArrival.localeCompare(b.expectedArrival))[0];
      return {
        awaitingAction,
        balancesOutstandingCount: owing.length,
        balancesOutstandingMinor: owing.reduce((n, o) => n + balanceMinor(o), 0),
        totalOrders: st.orders.length,
        nextBatch: next,
        recentOrders: [...st.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
      };
    }),

  listOrders: (q: AdminOrderQuery = {}) =>
    run(BOTH, (st) => {
      const term = q.search?.trim().toLowerCase() ?? "";
      const digits = term.replace(/\D/g, "");
      return st.orders
        .filter((o) => !q.status || q.status === "all" || o.status === q.status)
        .filter((o) => !q.balanceOutstanding || hasBalanceDue(o))
        .filter((o) => !q.batchId || o.batchId === q.batchId)
        .filter(
          (o) =>
            !term ||
            o.orderNumber.toLowerCase().includes(term) ||
            o.customer.name.toLowerCase().includes(term) ||
            (digits.length >= 4 &&
              o.customer.phone
                .replace(/\D/g, "")
                .includes(normalizeGhPhone(digits)?.replace(/\D/g, "") ?? digits)),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }),

  getOrder: (id) => run(BOTH, (st) => findOrder(st, id)),

  advanceOrder: (id) =>
    run(BOTH, (st) => {
      const o = findOrder(st, id);
      if (o.status === "cancelled") throw new ApiError("validation", "This order was cancelled.");
      if (o.status === "delayed")
        throw new ApiError("validation", "Clear the delay first, then move the order on.");
      if (isAwaitingPayment(o))
        throw new ApiError("validation", "Record a payment before moving this order on.");
      const next = nextStep(o.step);
      if (!next) throw new ApiError("validation", "This order is already delivered.");
      o.step = next;
      o.status = next;
      o.history.push({ status: next, at: nowIso() });
      return o;
    }),

  setDelayed: (id, { note, delayedUntil }) =>
    run(BOTH, (st) => {
      const o = findOrder(st, id);
      if (isFinished(o)) throw new ApiError("validation", "A finished order cannot be marked delayed.");
      if (note.trim().length < 3) throw new ApiError("validation", "Add a short note the customer will see.");
      o.status = "delayed";
      o.delayNote = note.trim();
      o.delayedUntil = delayedUntil;
      o.history.push({ status: "delayed", note: note.trim(), at: nowIso() });
      return o;
    }),

  resumeOrder: (id) =>
    run(BOTH, (st) => {
      const o = findOrder(st, id);
      if (o.status !== "delayed") throw new ApiError("validation", "This order is not delayed.");
      o.status = o.step;
      o.delayNote = undefined;
      o.delayedUntil = undefined;
      o.history.push({ status: o.step, note: "Delay cleared.", at: nowIso() });
      return o;
    }),

  recordPayment: (id, input) =>
    run(BOTH, (st, user) => {
      const o = findOrder(st, id);
      if (o.status === "cancelled") throw new ApiError("validation", "This order was cancelled.");
      const owed = balanceMinor(o);
      if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
        throw new ApiError("validation", "Enter an amount above zero.");
      }
      if (input.amountMinor > owed)
        throw new ApiError("validation", "That is more than the balance on this order.");
      const first = o.paidMinor === 0;
      const kind = first ? (input.amountMinor === o.totalMinor ? "full" : "deposit") : "balance";
      o.paidMinor += input.amountMinor;
      o.payments.push({
        id: `pay-man-${randomCode(6)}`,
        kind,
        amountMinor: input.amountMinor,
        method: input.method,
        status: "success",
        reference: `MAN-${randomCode(8)}`,
        createdAt: nowIso(),
      });
      if (first) {
        o.history.push({ status: "confirmed", note: `Payment confirmed by ${user.name}.`, at: nowIso() });
      }
      return o;
    }),

  cancelOrder: (id, { note }) =>
    run(OWNER, (st) => {
      const o = findOrder(st, id);
      if (isFinished(o)) throw new ApiError("validation", "This order can no longer be cancelled.");
      o.status = "cancelled";
      o.delayNote = undefined;
      o.delayedUntil = undefined;
      o.history.push({ status: "cancelled", note: note?.trim() || "Cancelled by the store.", at: nowIso() });
      o.refund = { status: o.paidMinor > 0 ? "pending" : "none", amountMinor: o.paidMinor };
      return o;
    }),

  markRefunded: (id) =>
    run(OWNER, (st) => {
      const o = findOrder(st, id);
      if (o.status !== "cancelled" || o.refund?.status !== "pending") {
        throw new ApiError("validation", "There is no pending refund on this order.");
      }
      o.refund = { ...o.refund, status: "refunded" };
      return o;
    }),

  listBatches: () =>
    run(BOTH, (st) =>
      st.batches
        .map((batch) => {
          const inBatch = st.orders.filter((o) => o.batchId === batch.id && o.status !== "cancelled");
          return {
            batch,
            orderCount: inBatch.length,
            customerCount: new Set(inBatch.map((o) => o.customer.phone)).size,
            delayedCount: inBatch.filter((o) => o.status === "delayed").length,
          };
        })
        .sort((a, b) => a.batch.expectedArrival.localeCompare(b.batch.expectedArrival)),
    ),

  advanceBatch: (id) =>
    run(BOTH, (st): BatchAdvanceResult => {
      const batch = st.batches.find((b) => b.id === id);
      if (!batch) throw new ApiError("not_found", "Batch not found.");
      const target = batchLadder[batchLadder.indexOf(batch.status) + 1];
      if (!target) throw new ApiError("validation", "This container has already arrived in Ghana.");
      const targetStep = target as ProgressStep;

      let updated = 0;
      let skippedDelayed = 0;
      const phones = new Set<string>();
      for (const o of st.orders) {
        if (o.batchId !== id || isFinished(o) || o.paidMinor === 0) continue;
        if (o.status === "delayed") {
          skippedDelayed++;
          continue;
        }
        if (stepIndex(o.step) >= stepIndex(targetStep)) continue;
        o.step = targetStep;
        o.status = targetStep;
        o.history.push({ status: targetStep, at: nowIso() });
        phones.add(o.customer.phone);
        updated++;
      }
      batch.status = target;
      if (target === "shipped_from_china") batch.shippedAt = nowIso();
      if (target === "arrived_in_ghana") batch.arrivedAt = nowIso();
      return { batch, updated, skippedDelayed, notified: phones.size };
    }),

  listProducts: ({ search, status } = {}) =>
    run(OWNER, (st) => {
      const term = search?.trim().toLowerCase();
      return st.products
        .filter((p) => !status || status === "all" || p.status === status)
        .filter((p) => !term || p.name.toLowerCase().includes(term))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }),

  getProduct: (id) =>
    run(OWNER, (st) => {
      const p = st.products.find((x) => x.id === id);
      if (!p) throw new ApiError("not_found", "Product not found.");
      return p;
    }),

  saveProduct: (id, input) =>
    run(OWNER, (st): Product => {
      validateProduct(st, input);
      if (id) {
        const p = st.products.find((x) => x.id === id);
        if (!p) throw new ApiError("not_found", "Product not found.");
        Object.assign(p, {
          name: input.name.trim(),
          description: input.description.trim(),
          priceMinor: input.priceMinor,
          images: input.images,
          categoryId: input.categoryId,
          batchId: input.batchId,
          limit: input.limit,
          status: input.status,
          variantGroups: buildVariantGroups(input.variantGroups, p.variantGroups),
        });
        return p;
      }
      let slug = slugify(input.name) || "product";
      while (st.products.some((x) => x.slug === slug)) slug += `-${randomCode(2).toLowerCase()}`;
      const created: Product = {
        id: `p${String(st.products.length + 1).padStart(2, "0")}-${randomCode(3).toLowerCase()}`,
        slug,
        name: input.name.trim(),
        description: input.description.trim(),
        priceMinor: input.priceMinor,
        images: input.images,
        categoryId: input.categoryId,
        availability: "preorder",
        batchId: input.batchId,
        variantGroups: buildVariantGroups(input.variantGroups),
        limit: input.limit,
        ordered: 0,
        status: input.status,
        createdAt: nowIso(),
      };
      st.products.push(created);
      return created;
    }),

  setProductStatus: (id, status: ProductStatus) =>
    run(OWNER, (st) => {
      const p = st.products.find((x) => x.id === id);
      if (!p) throw new ApiError("not_found", "Product not found.");
      if (status === "published" && p.images.length === 0) {
        throw new ApiError("validation", "Add at least one photo before publishing.");
      }
      p.status = status;
      return p;
    }),

  deleteProduct: (id) =>
    run(OWNER, (st) => {
      const p = st.products.find((x) => x.id === id);
      if (!p) throw new ApiError("not_found", "Product not found.");
      if (p.ordered > 0) {
        throw new ApiError(
          "validation",
          "This product already has orders, so it cannot be deleted. Hide it instead.",
        );
      }
      st.products = st.products.filter((x) => x.id !== id);
    }),

  createCategory: (name) =>
    run(OWNER, (st): Category => {
      const n = name.trim();
      if (n.length < 2) throw new ApiError("validation", "Enter a category name.");
      const slug = slugify(n);
      if (st.categories.some((c) => c.slug === slug))
        throw new ApiError("validation", "That category already exists.");
      const cat: Category = {
        id: `c${Date.now().toString(36)}`,
        slug,
        name: n,
        sortOrder: Math.max(0, ...st.categories.map((c) => c.sortOrder)) + 1,
      };
      st.categories.push(cat);
      return cat;
    }),

  renameCategory: (id, name) =>
    run(OWNER, (st) => {
      const c = st.categories.find((x) => x.id === id);
      if (!c) throw new ApiError("not_found", "Category not found.");
      const n = name.trim();
      if (n.length < 2) throw new ApiError("validation", "Enter a category name.");
      const slug = slugify(n);
      if (st.categories.some((x) => x.id !== id && x.slug === slug)) {
        throw new ApiError("validation", "That category already exists.");
      }
      c.name = n;
      c.slug = slug;
      return c;
    }),

  moveCategory: (id, direction) =>
    run(OWNER, (st) => {
      const sorted = [...st.categories].sort((a, b) => a.sortOrder - b.sortOrder);
      const i = sorted.findIndex((c) => c.id === id);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i === -1) throw new ApiError("not_found", "Category not found.");
      if (j >= 0 && j < sorted.length) {
        const a = sorted[i]!;
        const b = sorted[j]!;
        [a.sortOrder, b.sortOrder] = [b.sortOrder, a.sortOrder];
      }
      return [...st.categories].sort((a, b) => a.sortOrder - b.sortOrder);
    }),

  deleteCategory: (id) =>
    run(OWNER, (st) => {
      if (st.products.some((p) => p.categoryId === id)) {
        throw new ApiError("validation", "This category still has products. Move or delete them first.");
      }
      st.categories = st.categories.filter((c) => c.id !== id);
    }),

  listStaff: () => run(OWNER, (st) => st.staff.map(publicUser)),

  createStaff: ({ name, email, password }) =>
    run(OWNER, (st) => {
      if (name.trim().length < 2) throw new ApiError("validation", "Enter the person's name.");
      if (!/^\S+@\S+\.\S+$/.test(email.trim()))
        throw new ApiError("validation", "Enter a valid email address.");
      if (password.length < 6) throw new ApiError("validation", "Use a password of at least 6 characters.");
      if (st.staff.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
        throw new ApiError("validation", "Someone already uses that email.");
      }
      const user: StaffRecord = {
        id: `u${Date.now().toString(36)}`,
        name: name.trim(),
        email: email.trim(),
        password,
        role: "ghana_staff",
        active: true,
      };
      st.staff.push(user);
      return publicUser(user);
    }),

  setStaffActive: (id, active) =>
    run(OWNER, (st, me) => {
      const u = st.staff.find((x) => x.id === id);
      if (!u) throw new ApiError("not_found", "Account not found.");
      if (u.id === me.id) throw new ApiError("validation", "You cannot disable your own account.");
      if (u.role === "owner") throw new ApiError("validation", "The owner account cannot be disabled.");
      u.active = active;
      return publicUser(u);
    }),
};
