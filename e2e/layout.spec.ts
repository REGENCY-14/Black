import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const widths = [360, 390, 768, 1024, 1440];

for (const width of widths) {
  test(`home has no horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Next container arrives" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("mobile nav opens, lists links and closes on navigate", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const dialog = page.getByRole("dialog", { name: "Menu" });
  await expect(dialog.getByRole("link", { name: "Shop" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: /chat on whatsapp/i })).toHaveAttribute(
    "href",
    /wa\.me\/233598863540/,
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("desktop shows the main nav, footer contacts and WhatsApp pill", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(
    page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Track order" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "+233 59 886 3540 (Ghana)" })).toBeVisible();
  await expect(page.getByRole("link", { name: "+86 190 5725 6153 (China)" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Chat on WhatsApp" })).toBeVisible();
  // email is empty in config, so it must not render
  await expect(page.locator('footer a[href^="mailto:"]')).toHaveCount(0);
});

for (const scheme of ["light", "dark"] as const) {
  test(`home has no serious axe violations (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Next container arrives" })).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).analyze();
    const bad = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`)).toEqual([]);
  });
}

test("WhatsApp pill and header icon buttons meet the 44px hit area", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  for (const name of ["Open menu", /^Cart/, "Chat on WhatsApp"]) {
    const box = await page
      .getByRole(name === "Chat on WhatsApp" ? "link" : name === "Open menu" ? "button" : "link", { name })
      .boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(43.5);
    expect(box!.height).toBeGreaterThanOrEqual(43.5);
  }
});
