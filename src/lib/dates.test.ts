import { describe, expect, it } from "vitest";
import {
  balanceDueDate,
  daysBetween,
  formatArrivalWindow,
  formatDate,
  formatDateTime,
  isBalanceDuePassed,
  relativeDays,
} from "./dates";

describe("dates", () => {
  it("balance is due 14 days before arrival", () => {
    expect(balanceDueDate("2026-12-14T00:00:00.000Z").slice(0, 10)).toBe("2026-11-30");
    expect(balanceDueDate("2027-01-05T00:00:00.000Z").slice(0, 10)).toBe("2026-12-22");
  });

  it("detects when the due date has passed", () => {
    const now = new Date("2026-11-30T12:00:00Z");
    expect(isBalanceDuePassed("2026-12-14T00:00:00Z", now)).toBe(true); // due today
    expect(isBalanceDuePassed("2026-12-20T00:00:00Z", now)).toBe(false);
    expect(isBalanceDuePassed("2026-12-01T00:00:00Z", now)).toBe(true);
  });

  it("counts whole calendar days", () => {
    expect(daysBetween("2026-10-13T23:59:00Z", "2026-10-14T00:01:00Z")).toBe(1);
    expect(daysBetween("2026-10-14T00:00:00Z", "2026-10-13T00:00:00Z")).toBe(-1);
  });

  it("formats in Africa/Accra", () => {
    expect(formatDate("2026-12-14T00:00:00Z")).toBe("14 Dec 2026");
    expect(formatDateTime("2026-12-14T10:12:00Z")).toContain("10:12");
  });

  it("formats arrival windows", () => {
    expect(formatArrivalWindow("2026-12-14T00:00:00Z")).toBe("14 to 21 Dec 2026");
    expect(formatArrivalWindow("2026-12-28T00:00:00Z")).toBe("28 Dec to 4 Jan 2027");
  });

  it("describes relative days", () => {
    const now = new Date("2026-10-13T09:00:00Z");
    expect(relativeDays("2026-10-13T20:00:00Z", now)).toBe("today");
    expect(relativeDays("2026-10-14T00:00:00Z", now)).toBe("tomorrow");
    expect(relativeDays("2026-11-20T00:00:00Z", now)).toBe("in 38 days");
    expect(relativeDays("2026-10-10T00:00:00Z", now)).toBe("3 days ago");
  });
});
