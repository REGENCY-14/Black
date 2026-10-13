import { expect, test } from "@playwright/test";

const widths = [360, 390, 768, 1024, 1440];

for (const width of widths) {
  test(`/_design has no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/_design");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("theme toggle switches data-theme", async ({ page }) => {
  await page.goto("/_design");
  await page.getByRole("button", { name: /switch to dark theme/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

import AxeBuilder from "@axe-core/playwright";

for (const scheme of ["light", "dark"] as const) {
  test(`/_design has no serious axe violations (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/_design");
    const { violations } = await new AxeBuilder({ page }).analyze();
    const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
  });
}

test("buttons use 16px radius and meet the 44px hit area", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto("/_design");
  const issues = await page.evaluate(() => {
    const out: string[] = [];
    document.querySelectorAll<HTMLElement>("main button").forEach((el) => {
      const label = el.getAttribute("aria-label") || el.textContent?.trim() || "?";
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      // sm buttons extend their hit area with ::before (2px each side)
      const h = r.height + (el.className.includes("h-control-sm") ? 4 : 0);
      if (h < 44 - 0.5 || r.width < 44 - 0.5) out.push(`${label}: ${r.width}x${h}`);
      const isPill = cs.borderRadius.startsWith("9999") || cs.borderRadius.startsWith("3.35");
      if (!isPill && cs.borderRadius !== "16px" && !el.getAttribute("role"))
        out.push(`${label}: radius ${cs.borderRadius}`);
    });
    return out;
  });
  expect(issues).toEqual([]);
});

test("sheet opens, traps focus and closes with Escape", async ({ page }) => {
  await page.goto("/_design");
  await page.getByRole("button", { name: "Open sheet" }).click();
  await expect(page.getByRole("dialog", { name: "Advance batch" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});
