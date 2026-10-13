// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeDeposit } from "@/lib/money";
import { ApiError, type CreateOrderInput } from "../types";
import { mockApi as api } from "./index";
import { products } from "./seed";

const customer = { name: "Test Buyer", phone: "0241112222", area: "Accra", address: "Osu" };
const lineFor = (slug: string, variants: Record<string, string> = {}) => {
  const p = products.find((x) => x.slug.startsWith(slug))!;
  return { productId: p.id, quantity: 1, variants };
};

beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }));
afterEach(() => vi.useRealTimers());

describe("mock catalogue", () => {
  it("seeds 24 products across 5 categories", async () => {
    expect((await api.listCategories()).length).toBe(5);
    expect((await api.listProducts({ limit: 100 })).total).toBe(24);
  });

  it("searches, filters, sorts and paginates", async () => {
    const found = await api.listProducts({ search: "AIR FRYER" });
    expect(found.items.map((p) => p.name)).toEqual(["Stainless steel air fryer, 6L"]);
    const beauty = await api.listProducts({ categorySlug: "beauty", limit: 100 });
    expect(beauty.total).toBe(5);
    const asc = await api.listProducts({ sort: "price_asc", limit: 100 });
    expect(asc.items[0]!.priceMinor).toBeLessThanOrEqual(asc.items[1]!.priceMinor);
    const popular = await api.listProducts({ sort: "popular", limit: 3 });
    expect(popular.items[0]!.ordered).toBeGreaterThanOrEqual(popular.items[1]!.ordered);
    const p1 = await api.listProducts({ limit: 10 });
    const p2 = await api.listProducts({ limit: 10, cursor: p1.nextCursor! });
    expect(p1.items.length + p2.items.length).toBe(20);
  });

  it("throws not_found for an unknown product", async () => {
    await expect(api.getProduct("nope")).rejects.toMatchObject({ code: "not_found" });
  });
});

describe("mock orders", () => {
  it("splits items from different batches into separate orders", async () => {
    const input: CreateOrderInput = {
      customer,
      plan: "deposit",
      lines: [lineFor("electric-kettle"), lineFor("non-stick-cookware")], // batch 1 + batch 2
    };
    const { orders, amountDueMinor } = await api.createOrder(input);
    expect(orders).toHaveLength(2);
    expect(new Set(orders.map((o) => o.batchId)).size).toBe(2);
    expect(amountDueMinor).toBe(orders.reduce((s, o) => s + computeDeposit(o.totalMinor), 0));
    expect(orders[0]!.customer.phone).toBe("+233241112222");
  });

  it("rejects an invalid phone and an empty cart", async () => {
    await expect(
      api.createOrder({
        customer: { ...customer, phone: "123" },
        plan: "full",
        lines: [lineFor("electric-kettle")],
      }),
    ).rejects.toBeInstanceOf(ApiError);
    await expect(api.createOrder({ customer, plan: "full", lines: [] })).rejects.toBeInstanceOf(ApiError);
  });

  it("confirms an order only when payment succeeds (card)", async () => {
    const { orders, amountDueMinor } = await api.createOrder({
      customer,
      plan: "deposit",
      lines: [lineFor("power-bank")],
    });
    const order = orders[0]!;
    expect(order.paidMinor).toBe(0);
    const attempt = await api.payments.startPayment({
      orderIds: [order.id],
      amountMinor: amountDueMinor,
      kind: "deposit",
      method: "card",
    });
    expect(attempt.status).toBe("success");
    const after = await api.lookupOrder({
      orderNumber: ` ${order.orderNumber.toLowerCase()} `,
      contact: customer.phone,
    });
    expect(after.paidMinor).toBe(computeDeposit(order.totalMinor));
    expect(after.history.at(-1)?.status).toBe("confirmed");
  });

  it("rejects a payment whose amount does not match what is due", async () => {
    const { orders } = await api.createOrder({ customer, plan: "deposit", lines: [lineFor("power-bank")] });
    await expect(
      api.payments.startPayment({
        orderIds: [orders[0]!.id],
        amountMinor: 1,
        kind: "deposit",
        method: "card",
      }),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("moves MoMo from pending to success, and supports decline and timeout cases", async () => {
    const run = async (phone: string) => {
      const { orders, amountDueMinor } = await api.createOrder({
        customer,
        plan: "full",
        lines: [lineFor("ring-light")],
      });
      const a = await api.payments.startPayment({
        orderIds: [orders[0]!.id],
        amountMinor: amountDueMinor,
        kind: "full",
        method: "mtn_momo",
        phone,
      });
      expect(a.status).toBe("pending");
      vi.setSystemTime(Date.now() + 5000);
      return api.payments.checkPayment(a.reference);
    };
    expect((await run("+233241110001")).status).toBe("success");
    expect((await run("+233241110000")).status).toBe("failed");
    expect((await run("+233241110099")).status).toBe("pending");
  });

  it("pays the balance on a deposit order", async () => {
    const order = await api.lookupOrder({ orderNumber: "ord-demo01", contact: "0241234567" });
    const due = order.totalMinor - order.paidMinor;
    expect(due).toBeGreaterThan(0);
    await api.payments.startPayment({
      orderIds: [order.id],
      amountMinor: due,
      kind: "balance",
      method: "card",
    });
    const paid = await api.lookupOrder({ orderNumber: "ORD-DEMO01", contact: "demo@example.com" });
    expect(paid.paidMinor).toBe(paid.totalMinor);
  });

  it("verifies ownership before revealing an order", async () => {
    await expect(api.lookupOrder({ orderNumber: "ORD-K4T9QX", contact: "0200000000" })).rejects.toMatchObject(
      { code: "not_found" },
    );
    await expect(
      api.lookupOrder({ orderNumber: "ORD-K4T9QX", contact: "0551112233" }),
    ).resolves.toMatchObject({ orderNumber: "ORD-K4T9QX" });
  });

  it("allows cancellation before shipping only", async () => {
    const ok = await api.requestCancellation({ orderNumber: "ORD-K4T9QX", contact: "0551112233" });
    expect(ok.status).toBe("cancelled");
    expect(ok.refund?.status).toBe("pending");
    await expect(
      api.requestCancellation({ orderNumber: "ORD-R3W8ZD", contact: "0271445566" }),
    ).rejects.toMatchObject({ code: "validation" });
  });

  it("seeds an order in every status", async () => {
    const statuses = new Set<string>();
    for (const [num, contact] of [
      ["DEMO01", "0241234567"],
      ["E9H2KP", "0279990000"],
      ["M7P2LA", "0201998877"],
      ["V9C6YE", "0501234000"],
      ["A2D7FJ", "0261778899"],
      ["B8E4GK", "0246660011"],
      ["C1F5HM", "0551230987"],
      ["F4J8LQ", "0532221100"],
    ]) {
      statuses.add((await api.lookupOrder({ orderNumber: `ORD-${num}`, contact })).status);
    }
    expect(statuses).toEqual(
      new Set([
        "confirmed",
        "sourcing",
        "shipped_from_china",
        "arrived_in_ghana",
        "out_for_delivery",
        "delivered",
        "delayed",
        "cancelled",
      ]),
    );
  });
});
