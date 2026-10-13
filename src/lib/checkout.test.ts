import { describe, expect, it } from "vitest";
import type { Batch } from "@/lib/api/types";
import type { CartLine } from "@/stores/cart";
import { canPayDeposit, groupCart, totalsFor } from "./checkout";

const NOW = new Date("2026-10-13T09:00:00Z");
const batches: Batch[] = [
  { id: "b1", name: "Nov", status: "shipped_from_china", expectedArrival: "2026-11-20T00:00:00.000Z" },
  { id: "b2", name: "Dec", status: "sourcing", expectedArrival: "2026-12-14T00:00:00.000Z" },
  { id: "bSoon", name: "Soon", status: "shipped_from_china", expectedArrival: "2026-10-20T00:00:00.000Z" },
];

const line = (productId: string, batchId: string, price: number, quantity = 1): CartLine => ({
  key: productId,
  productId,
  slug: productId,
  name: productId,
  imageSrc: "/x.svg",
  unitPriceMinor: price,
  batchId,
  variants: {},
  variantLabels: {},
  quantity,
});

describe("groupCart", () => {
  it("splits lines by batch and sorts by arrival", () => {
    const groups = groupCart(
      [line("a", "b2", 10000), line("b", "b1", 20000), line("c", "b2", 5000, 2)],
      batches,
      NOW,
    );
    expect(groups.map((g) => g.batch.id)).toEqual(["b1", "b2"]);
    expect(groups[1]!.lines.map((l) => l.productId)).toEqual(["a", "c"]);
    expect(groups[1]!.subtotalMinor).toBe(20000);
  });

  it("computes deposit, balance and the due date per group", () => {
    const [g] = groupCart([line("a", "b1", 12345)], batches, NOW);
    expect(g!.depositMinor).toBe(8642);
    expect(g!.balanceMinor).toBe(12345 - 8642);
    expect(g!.balanceDueDate.slice(0, 10)).toBe("2026-11-06");
    expect(g!.depositAllowed).toBe(true);
  });

  it("requires full payment when the balance date has passed", () => {
    const groups = groupCart([line("a", "bSoon", 10000), line("b", "b1", 10000)], batches, NOW);
    expect(groups.find((g) => g.batch.id === "bSoon")!.depositAllowed).toBe(false);
    expect(canPayDeposit(groups)).toBe(false);
    expect(canPayDeposit(groupCart([line("b", "b1", 10000)], batches, NOW))).toBe(true);
  });

  it("drops lines whose batch is unknown", () => {
    expect(groupCart([line("a", "nope", 100)], batches, NOW)).toEqual([]);
  });
});

describe("totalsFor", () => {
  const groups = groupCart([line("a", "b1", 12345), line("b", "b2", 9999)], batches, NOW);

  it("deposit plan charges the sum of per-order deposits", () => {
    const t = totalsFor(groups, "deposit");
    expect(t.totalMinor).toBe(22344);
    expect(t.dueNowMinor).toBe(8642 + 6999); // each order rounds on its own
    expect(t.dueNowMinor + t.balanceMinor).toBe(t.totalMinor);
  });

  it("full plan charges everything and leaves no balance", () => {
    const t = totalsFor(groups, "full");
    expect(t.dueNowMinor).toBe(22344);
    expect(t.balanceMinor).toBe(0);
  });
});
