import { describe, expect, it } from "vitest";
import {
  detectNetwork,
  formatGhPhone,
  isValidGhPhone,
  normalizeGhPhone,
  normalizeOrderNumber,
} from "./phone";

describe("phone", () => {
  it.each([
    ["0241234567", "+233241234567"],
    ["024 123 4567", "+233241234567"],
    ["+233241234567", "+233241234567"],
    ["233241234567", "+233241234567"],
    ["+233 (24) 123-4567", "+233241234567"],
    ["241234567", "+233241234567"],
    ["0501234567", "+233501234567"],
  ])("normalises %s", (input, expected) => {
    expect(normalizeGhPhone(input)).toBe(expected);
  });

  it.each(["", "12345", "0141234567", "02412345", "+2332412345678", "abc"])("rejects %s", (input) => {
    expect(normalizeGhPhone(input)).toBeNull();
    expect(isValidGhPhone(input)).toBe(false);
  });

  it("detects the network from the prefix", () => {
    expect(detectNetwork("0241234567")).toBe("mtn");
    expect(detectNetwork("0551234567")).toBe("mtn");
    expect(detectNetwork("0201234567")).toBe("telecel");
    expect(detectNetwork("0501234567")).toBe("telecel");
    expect(detectNetwork("0271234567")).toBe("airteltigo");
    expect(detectNetwork("0571234567")).toBe("airteltigo");
    expect(detectNetwork("0231234567")).toBeNull();
    expect(detectNetwork("nonsense")).toBeNull();
  });

  it("formats for display", () => {
    expect(formatGhPhone("0241234567")).toBe("+233 24 123 4567");
    expect(formatGhPhone("bad")).toBe("bad");
  });

  it("forgives order number input", () => {
    expect(normalizeOrderNumber("  ord- 4f7k2q ")).toBe("ORD-4F7K2Q");
  });
});
