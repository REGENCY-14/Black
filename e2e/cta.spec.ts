import { expect, test } from "@playwright/test";

for (const [name, size] of [
  ["mobile", { width: 390, height: 844 }],
  ["desktop", { width: 1440, height: 900 }],
] as const) {
  test.describe(`track order calls to action (${name})`, () => {
    test.use({ viewport: size });

    test("the home hero and How it works both lead to Track order", async ({ page }) => {
      await page.goto("/");
      const hero = page.getByRole("region", { name: /Preorder from China/ });
      await expect(hero.getByRole("link", { name: "Track order" })).toHaveAttribute("href", "/track");

      const how = page.locator("#how-it-works");
      await expect(how.getByRole("heading", { name: "4. Track your order" })).toBeVisible();
      await how.getByRole("link", { name: "Track order" }).click();
      await expect(page).toHaveURL(/\/track$/);
    });
  });
}

test.describe("shop back to top", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the arrow appears after scrolling and returns to the top", async ({ page }) => {
    await page.goto("/shop");
    const arrow = page.getByRole("button", { name: "Back to top" });
    await expect(arrow).toHaveCount(0);
    await expect(page.getByRole("link", { name: /GH₵/ }).first()).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect(arrow).toBeVisible();
    await arrow.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
    await expect(arrow).toHaveCount(0);
  });
});

test("buttons have 16px corners on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const radius = (loc: ReturnType<typeof page.locator>) =>
    loc.evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
  expect(await radius(page.getByRole("link", { name: "Browse preorders" }).first())).toBe("16px");
  expect(await radius(page.getByRole("link", { name: "Chat on WhatsApp" }))).toBe("16px");
});
