import { describe, expect, it } from "vitest";
import {
  balanceMinor,
  canRequestCancellation,
  hasBalanceDue,
  nextStep,
  progressSteps,
  statusMeta,
} from "./status";

describe("status", () => {
  it("has metadata for every status", () => {
    for (const s of [...progressSteps, "delayed", "cancelled"] as const) {
      expect(statusMeta[s].label).toBeTruthy();
      expect(statusMeta[s].meaning).toBeTruthy();
    }
  });

  it("walks the six steps and stops at delivered", () => {
    expect(nextStep("confirmed")).toBe("sourcing");
    expect(nextStep("out_for_delivery")).toBe("delivered");
    expect(nextStep("delivered")).toBeNull();
  });

  it("allows cancellation only before shipping from China", () => {
    expect(canRequestCancellation({ status: "confirmed", step: "confirmed" })).toBe(true);
    expect(canRequestCancellation({ status: "sourcing", step: "sourcing" })).toBe(true);
    expect(canRequestCancellation({ status: "delayed", step: "sourcing" })).toBe(true);
    expect(canRequestCancellation({ status: "shipped_from_china", step: "shipped_from_china" })).toBe(false);
    expect(canRequestCancellation({ status: "delayed", step: "arrived_in_ghana" })).toBe(false);
    expect(canRequestCancellation({ status: "cancelled", step: "confirmed" })).toBe(false);
  });

  it("computes balances", () => {
    expect(balanceMinor({ totalMinor: 1000, paidMinor: 700 })).toBe(300);
    expect(balanceMinor({ totalMinor: 1000, paidMinor: 1000 })).toBe(0);
    expect(hasBalanceDue({ totalMinor: 1000, paidMinor: 700, status: "sourcing" })).toBe(true);
    expect(hasBalanceDue({ totalMinor: 1000, paidMinor: 0, status: "confirmed" })).toBe(false);
    expect(hasBalanceDue({ totalMinor: 1000, paidMinor: 700, status: "cancelled" })).toBe(false);
  });
});
