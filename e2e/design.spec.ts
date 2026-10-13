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
