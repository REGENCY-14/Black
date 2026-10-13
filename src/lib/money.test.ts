import { describe, expect, it } from "vitest";
import { computeDeposit, formatGHS, lineTotal, splitPayment, sumPesewas } from "./money";

describe("money", () => {
  it("formats pesewas as GH₵", () => {
    expect(formatGHS(123450)).toBe("GH₵1,234.50");
    expect(formatGHS(42000)).toBe("GH₵420");
    expect(formatGHS(42000, { fixed: true })).toBe("GH₵420.00");
    expect(formatGHS(5)).toBe("GH₵0.05");
  });

  it("rejects non-integer amounts", () => {
    expect(() => formatGHS(10.5)).toThrow();
  });

  it("computes the 70% deposit with integer rounding", () => {
    expect(computeDeposit(100000)).toBe(70000);
    expect(computeDeposit(12345)).toBe(8642); // 8641.5 rounds up
    expect(computeDeposit(1)).toBe(1);
  });

  it("deposit + balance always equals the total", () => {
    for (const total of [1, 99, 12345, 99999, 250000, 1000001]) {
      const s = splitPayment(total);
      expect(s.depositMinor + s.balanceMinor).toBe(total);
      expect(Number.isInteger(s.depositMinor)).toBe(true);
    }
  });

  it("respects a custom deposit percent", () => {
    expect(splitPayment(100000, 50)).toEqual({ depositMinor: 50000, balanceMinor: 50000 });
  });

  it("sums without floating point drift", () => {
    expect(sumPesewas([10, 20, 30])).toBe(60);
    expect(lineTotal(1999, 3)).toBe(5997);
  });
});
