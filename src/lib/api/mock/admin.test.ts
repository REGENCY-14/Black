// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { ProductInput } from "../types";
import { mockApi as api } from "./index";
import { writeSessionUserId } from "./state";

const admin = api.admin;
const loginOwner = () => admin.login({ email: "owner@example.com", password: "owner123" });
const loginStaff = () => admin.login({ email: "staff@example.com", password: "staff123" });

const productInput = (over: Partial<ProductInput> = {}): ProductInput => ({
  name: "Test lamp",
  description: "A lamp.",
  priceMinor: 9900,
  images: [{ src: "data:image/png;base64,AAAA", alt: "Test lamp" }],
  categoryId: "c1",
  batchId: "b2",
  limit: 10,
  variantGroups: [],
  status: "published",
  ...over,
});

beforeEach(() => writeSessionUserId(null));

describe("sign in", () => {
  it("rejects a wrong password with a message that does not say which part was wrong", async () => {
    await expect(admin.login({ email: "owner@example.com", password: "nope" })).rejects.toMatchObject({
      code: "validation",
      message: expect.stringContaining("Check your email and password"),
    });
    await expect(admin.login({ email: "nobody@example.com", password: "x" })).rejects.toMatchObject({
      message: expect.stringContaining("Check your email and password"),
    });
  });

  it("returns the role in the session and clears it on logout", async () => {
    expect((await loginOwner()).user.role).toBe("owner");
    expect((await admin.session())?.user.email).toBe("owner@example.com");
    await admin.logout();
    expect(await admin.session()).toBeNull();
    expect((await loginStaff()).user.role).toBe("ghana_staff");
  });
});

describe("authorisation", () => {
  const ownerOnly: [string, () => Promise<unknown>][] = [
    ["cancelOrder", () => admin.cancelOrder("o1", {})],
    ["markRefunded", () => admin.markRefunded("o1")],
    ["listProducts", () => admin.listProducts()],
    ["getProduct", () => admin.getProduct("p01")],
    ["saveProduct", () => admin.saveProduct(null, productInput())],
    ["setProductStatus", () => admin.setProductStatus("p01", "hidden")],
    ["deleteProduct", () => admin.deleteProduct("p01")],
    ["createCategory", () => admin.createCategory("Garden")],
    ["renameCategory", () => admin.renameCategory("c1", "Kitchen")],
    ["moveCategory", () => admin.moveCategory("c1", "down")],
    ["deleteCategory", () => admin.deleteCategory("c1")],
    ["listStaff", () => admin.listStaff()],
    ["createStaff", () => admin.createStaff({ name: "X Y", email: "x@y.com", password: "secret1" })],
    ["setStaffActive", () => admin.setStaffActive("u2", false)],
  ];
  const shared: [string, () => Promise<unknown>][] = [
    ["dashboard", () => admin.dashboard()],
    ["listOrders", () => admin.listOrders()],
    ["getOrder", () => admin.getOrder("o1")],
    ["listBatches", () => admin.listBatches()],
  ];

  it.each([...ownerOnly, ...shared])("signed-out callers are refused: %s", async (_name, call) => {
    await expect(call()).rejects.toMatchObject({ code: "forbidden" });
  });

  it.each(ownerOnly)("ghana_staff is refused owner-only method: %s", async (_name, call) => {
    await loginStaff();
    await expect(call()).rejects.toMatchObject({
      code: "forbidden",
      message: "You do not have access to this.",
    });
  });

  it.each(shared)("ghana_staff can use shared method: %s", async (_name, call) => {
    await loginStaff();
    await expect(call()).resolves.toBeDefined();
  });

  it("the owner can use owner-only methods", async () => {
    await loginOwner();
    await expect(admin.listProducts()).resolves.toHaveLength(24);
    await expect(admin.listStaff()).resolves.toHaveLength(2);
  });

  it("never returns passwords", async () => {
    await loginOwner();
    const staff = await admin.listStaff();
    expect(JSON.stringify(staff)).not.toContain("owner123");
    expect(staff.every((u) => !("password" in u))).toBe(true);
  });
});

describe("orders", () => {
  it("advances an order one step and records history", async () => {
    await loginStaff();
    const before = await admin.getOrder("o2"); // ORD-K4T9QX, confirmed
    const after = await admin.advanceOrder("o2");
    expect(before.step).toBe("confirmed");
    expect(after.step).toBe("sourcing");
    expect(after.status).toBe("sourcing");
    expect(after.history.at(-1)?.status).toBe("sourcing");
  });

  it("will not advance an unpaid, delayed, cancelled or delivered order", async () => {
    await loginStaff();
    await expect(admin.advanceOrder("o14")).rejects.toMatchObject({
      message: expect.stringContaining("Record a payment"),
    });
    await expect(admin.advanceOrder("o6")).rejects.toMatchObject({
      message: expect.stringContaining("Clear the delay"),
    });
    await expect(admin.advanceOrder("o12")).rejects.toMatchObject({
      message: expect.stringContaining("cancelled"),
    });
    await expect(admin.advanceOrder("o9")).rejects.toMatchObject({
      message: expect.stringContaining("already delivered"),
    });
  });

  it("delay needs a note, keeps the step, and can be cleared", async () => {
    await loginStaff();
    await expect(admin.setDelayed("o3", { note: " " })).rejects.toMatchObject({ code: "validation" });
    const d = await admin.setDelayed("o3", {
      note: "Factory is late.",
      delayedUntil: "2027-01-10T00:00:00.000Z",
    });
    expect(d.status).toBe("delayed");
    expect(d.step).toBe("sourcing");
    expect(d.delayNote).toBe("Factory is late.");
    const r = await admin.resumeOrder("o3");
    expect(r.status).toBe("sourcing");
    expect(r.delayNote).toBeUndefined();
  });

  it("recording the first payment confirms the order; overpaying is refused", async () => {
    await loginStaff();
    const unpaid = await admin.getOrder("o14"); // ORD-H3L6NS, nothing paid
    expect(unpaid.paidMinor).toBe(0);
    await expect(
      admin.recordPayment("o14", { amountMinor: unpaid.totalMinor + 1, method: "cash" }),
    ).rejects.toMatchObject({
      code: "validation",
    });
    const paid = await admin.recordPayment("o14", { amountMinor: 10000, method: "cash" });
    expect(paid.paidMinor).toBe(10000);
    expect(paid.history.at(-1)?.status).toBe("confirmed");
    expect(paid.payments.at(-1)).toMatchObject({ method: "cash", kind: "deposit", status: "success" });
  });

  it("only the owner can cancel; cancelling starts a refund, which the owner can mark done", async () => {
    await loginStaff();
    await expect(admin.cancelOrder("o5", {})).rejects.toMatchObject({ code: "forbidden" });
    await loginOwner();
    const c = await admin.cancelOrder("o5", { note: "Out of stock at the factory." });
    expect(c.status).toBe("cancelled");
    expect(c.refund).toMatchObject({ status: "pending", amountMinor: c.paidMinor });
    const done = await admin.markRefunded("o5");
    expect(done.refund?.status).toBe("refunded");
    await expect(admin.cancelOrder("o9", {})).rejects.toMatchObject({ code: "validation" });
  });

  it("filters by status, outstanding balance, batch and search", async () => {
    await loginStaff();
    const delayed = await admin.listOrders({ status: "delayed" });
    expect(delayed.every((o) => o.status === "delayed")).toBe(true);
    const owing = await admin.listOrders({ balanceOutstanding: true });
    expect(owing.length).toBeGreaterThan(0);
    expect(
      owing.every((o) => o.totalMinor > o.paidMinor && o.status !== "cancelled" && o.paidMinor > 0),
    ).toBe(true);
    const b0 = await admin.listOrders({ batchId: "b0" });
    expect(b0.every((o) => o.batchId === "b0")).toBe(true);
    expect((await admin.listOrders({ search: "demo01" })).map((o) => o.orderNumber)).toEqual(["ORD-DEMO01"]);
    expect((await admin.listOrders({ search: "0241234567" })).map((o) => o.orderNumber)).toContain(
      "ORD-DEMO01",
    );
    expect((await admin.listOrders({ search: "ama mensah" })).length).toBeGreaterThan(0);
  });
});

describe("batches", () => {
  it("advancing a batch moves paid, active orders, skips delayed ones, and counts customers", async () => {
    await loginStaff();
    const before = (await admin.listBatches()).find((b) => b.batch.id === "b2")!;
    expect(before.delayedCount).toBeGreaterThan(0);
    const res = await admin.advanceBatch("b2"); // sourcing -> shipped from China
    expect(res.batch.status).toBe("shipped_from_china");
    expect(res.skippedDelayed).toBe(before.delayedCount);
    expect(res.updated).toBeGreaterThan(0);
    expect(res.notified).toBeGreaterThan(0);
    expect(res.notified).toBeLessThanOrEqual(res.updated);

    const orders = await admin.listOrders({ batchId: "b2" });
    for (const o of orders) {
      if (o.status === "cancelled" || o.paidMinor === 0) expect(o.step).not.toBe("shipped_from_china");
      else if (o.status === "delayed") expect(o.step).toBe("sourcing");
      else expect(o.step).toBe("shipped_from_china");
    }

    expect((await admin.advanceBatch("b2")).batch.status).toBe("arrived_in_ghana");
    await expect(admin.advanceBatch("b2")).rejects.toMatchObject({ code: "validation" });
  });
});

describe("products and categories (owner)", () => {
  it("validates before saving", async () => {
    await loginOwner();
    await expect(admin.saveProduct(null, productInput({ name: "A" }))).rejects.toMatchObject({
      code: "validation",
    });
    await expect(admin.saveProduct(null, productInput({ priceMinor: 0 }))).rejects.toMatchObject({
      code: "validation",
    });
    await expect(admin.saveProduct(null, productInput({ images: [] }))).rejects.toMatchObject({
      message: expect.stringContaining("at least one photo"),
    });
    await expect(admin.saveProduct(null, productInput({ limit: 0 }))).rejects.toMatchObject({
      code: "validation",
    });
    await expect(admin.saveProduct(null, productInput({ categoryId: "nope" }))).rejects.toMatchObject({
      code: "validation",
    });
    // a draft may be saved without photos
    await expect(
      admin.saveProduct(null, productInput({ images: [], status: "draft", name: "Draft only" })),
    ).resolves.toMatchObject({
      status: "draft",
    });
  });

  it("a published product appears in the public catalogue; a draft or hidden one does not", async () => {
    await loginOwner();
    const p = await admin.saveProduct(
      null,
      productInput({
        name: "Zebra lamp",
        variantGroups: [{ name: "Colour", options: [{ label: "Black" }, { label: "White", limit: 3 }] }],
      }),
    );
    expect(p.slug).toBe("zebra-lamp");
    expect(p.variantGroups[0]!.options.map((o) => o.id)).toEqual(["black", "white"]);
    expect((await api.listProducts({ search: "zebra" })).items).toHaveLength(1);

    await admin.setProductStatus(p.id, "hidden");
    expect((await api.listProducts({ search: "zebra" })).items).toHaveLength(0);
    await expect(api.getProduct("zebra-lamp")).rejects.toMatchObject({ code: "not_found" });

    await admin.setProductStatus(p.id, "published");
    expect((await api.listProducts({ search: "zebra" })).items).toHaveLength(1);

    const edited = await admin.saveProduct(p.id, productInput({ name: "Zebra lamp XL", priceMinor: 12000 }));
    expect(edited.slug).toBe("zebra-lamp"); // links stay stable when renamed
    expect(edited.priceMinor).toBe(12000);
  });

  it("keeps the slug unique and refuses to delete a product that has orders", async () => {
    await loginOwner();
    const a = await admin.saveProduct(null, productInput({ name: "Twin item" }));
    const b = await admin.saveProduct(null, productInput({ name: "Twin item" }));
    expect(a.slug).not.toBe(b.slug);
    await expect(admin.deleteProduct("p01")).rejects.toMatchObject({
      message: expect.stringContaining("Hide it instead"),
    });
    await admin.deleteProduct(a.id);
    await expect(admin.getProduct(a.id)).rejects.toMatchObject({ code: "not_found" });
  });

  it("creates, renames, reorders and deletes categories, but not while products use them", async () => {
    await loginOwner();
    const cat = await admin.createCategory("Garden tools");
    expect(cat.slug).toBe("garden-tools");
    await expect(admin.createCategory("garden tools")).rejects.toMatchObject({ code: "validation" });
    expect((await admin.renameCategory(cat.id, "Garden")).slug).toBe("garden");

    const moved = await admin.moveCategory(cat.id, "up");
    expect(moved.findIndex((c) => c.id === cat.id)).toBe(moved.length - 2);

    await expect(admin.deleteCategory("c1")).rejects.toMatchObject({
      message: expect.stringContaining("still has products"),
    });
    await admin.deleteCategory(cat.id);
    expect((await api.listCategories()).some((c) => c.id === cat.id)).toBe(false);
  });
});

describe("staff (owner)", () => {
  it("creates a Ghana staff login, who can sign in, until the owner disables it", async () => {
    await loginOwner();
    await expect(
      admin.createStaff({ name: "A B", email: "owner@example.com", password: "secret1" }),
    ).rejects.toMatchObject({
      code: "validation",
    });
    await expect(
      admin.createStaff({ name: "A B", email: "ab@example.com", password: "123" }),
    ).rejects.toMatchObject({ code: "validation" });
    const u = await admin.createStaff({ name: "Efua Teye", email: "efua@example.com", password: "secret1" });
    expect(u).toMatchObject({ role: "ghana_staff", active: true });

    expect((await admin.login({ email: "EFUA@example.com", password: "secret1" })).user.role).toBe(
      "ghana_staff",
    );
    await loginOwner();
    expect((await admin.setStaffActive(u.id, false)).active).toBe(false);
    await expect(admin.login({ email: "efua@example.com", password: "secret1" })).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("a disabled account loses its existing session", async () => {
    await loginOwner();
    const u = await admin.createStaff({
      name: "Temp Person",
      email: "temp@example.com",
      password: "secret1",
    });
    await admin.login({ email: "temp@example.com", password: "secret1" });
    await expect(admin.dashboard()).resolves.toBeDefined();
    await loginOwner();
    await admin.setStaffActive(u.id, false);
    await admin.login({ email: "temp@example.com", password: "secret1" }).catch(() => undefined);
    writeSessionUserId(u.id); // stale session cookie from before it was disabled
    await expect(admin.dashboard()).rejects.toMatchObject({ code: "forbidden" });
  });

  it("the owner cannot disable themselves", async () => {
    await loginOwner();
    await expect(admin.setStaffActive("u1", false)).rejects.toMatchObject({ code: "validation" });
  });
});
