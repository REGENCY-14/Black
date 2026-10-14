import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const widths = [360, 390, 768, 1024, 1440];
const noOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const productLinks = (page: Page) => page.locator("main ul a[href^='/shop/']");

async function serious(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`);
}

test.describe("home", () => {
  test("shows the hero, bento tiles, preorder strip and delivered photos", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("pay 70% now");
    await expect(page.getByRole("heading", { name: "Next container arrives" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Preorders open now" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Order updates on WhatsApp" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Delivered orders" })).toBeVisible();
    await expect(page.locator("section[aria-labelledby=open-now] a[href^='/shop/']")).toHaveCount(8);
    await expect(page.getByRole("link", { name: "Browse preorders" })).toHaveAttribute("href", "/shop");
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`home has no serious axe issues (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      expect(await serious(page)).toEqual([]);
    });
  }
});

test.describe("shop", () => {
  test("paginates, searches, filters and sorts through the URL", async ({ page }) => {
    await page.goto("/shop");
    await expect(productLinks(page)).toHaveCount(12);
    await page.getByRole("button", { name: "Load more" }).click();
    await expect(productLinks(page)).toHaveCount(24);
    await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);

    await page.getByRole("searchbox", { name: "Search products" }).fill("kettle");
    await expect(productLinks(page)).toHaveCount(1);
    await expect(page).toHaveURL(/q=kettle/);

    await page.getByRole("button", { name: "Clear search" }).click();
    await page.getByRole("button", { name: "Beauty" }).click();
    await expect(page).toHaveURL(/category=beauty/);
    await expect(productLinks(page)).toHaveCount(5);
  });

  test("sorts by price on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/shop?sort=price_asc");
    // the silk satin pillowcase is the cheapest seeded product
    await expect(productLinks(page).first()).toContainText("GH₵95");
  });

  test("shows an empty state and clears filters", async ({ page }) => {
    await page.goto("/shop?q=zzzz");
    await expect(page.getByText("Nothing matches that yet")).toBeVisible();
    await page.getByRole("button", { name: "Clear search and filters" }).click();
    await expect(productLinks(page)).toHaveCount(12);
  });

  test("mobile sort sheet changes the order", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/shop");
    await page.getByRole("button", { name: "Sort and filter" }).click();
    await page.getByRole("button", { name: "Price: high to low" }).click();
    await page.getByRole("button", { name: /^Show \d+ products/ }).click();
    await expect(page).toHaveURL(/sort=price_desc/);
    await expect(productLinks(page).first()).toContainText("GH₵1,150");
  });

  for (const width of widths) {
    test(`shop has no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/shop");
      await expect(productLinks(page).first()).toBeVisible();
      expect(await noOverflow(page)).toBeLessThanOrEqual(0);
    });
  }

  test("shop has no serious axe issues", async ({ page }) => {
    await page.goto("/shop");
    await expect(productLinks(page).first()).toBeVisible();
    expect(await serious(page)).toEqual([]);
  });
});

test.describe("product", () => {
  test("a phone user reaches Preorder in three taps and the item lands in the cart", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("link", { name: "Browse preorders" }).click(); // tap 1
    await page.waitForURL("**/shop");
    await page.getByRole("link", { name: /remote control car/i }).click(); // tap 2
    await page.getByRole("button", { name: "Preorder" }).click(); // tap 3
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Remote control car" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cart, 1 item" })).toBeVisible();
  });

  test("shows price, window, spots, deposit preview and the includes-shipping note", async ({ page }) => {
    await page.goto("/shop/electric-kettle-2l-glass");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Electric kettle, 2L glass");
    await expect(page.getByText("GH₵210").first()).toBeVisible();
    await expect(page.getByText("Price includes shipping from China and duty.")).toBeVisible();
    await expect(page.getByText(/Preorder, arrives/)).toBeVisible();
    // 70% of GH₵210 = GH₵147 now, GH₵63 balance
    const preview = page.getByTestId("deposit-preview");
    await expect(preview).toContainText("Pay GH₵147 now (70%)");
    await expect(preview).toContainText("then GH₵63 by");
    await expect(preview).toContainText("Your price is locked once your deposit is paid");
    await expect(page.getByRole("link", { name: "Ask about this item" })).toHaveAttribute(
      "href",
      /wa\.me\/233598863540\?text=/,
    );
    // no TikTok embeds on product pages (SRS 1.4)
    await expect(page.locator("iframe, video")).toHaveCount(0);
  });

  test("deposit preview follows the quantity", async ({ page }) => {
    await page.goto("/shop/electric-kettle-2l-glass");
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await expect(page.getByTestId("deposit-preview")).toContainText("Pay GH₵294 now (70%)");
  });

  test("requires variants before preordering, then adds the chosen options", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/shop/oversized-cotton-hoodie");
    await page.getByRole("button", { name: "Preorder" }).click();
    await expect(page.getByText("Choose a size.")).toBeVisible();
    await expect(page).not.toHaveURL(/cart/);
    await page.getByRole("radio", { name: "M", exact: true }).click();
    await page.getByRole("radio", { name: "Black" }).click();
    await page.getByRole("button", { name: "Preorder" }).click();
    await expect(page.getByRole("link", { name: "Oversized cotton hoodie" })).toBeVisible();
    await expect(page.getByText("Size: M · Colour: Black")).toBeVisible();
  });

  test("includes Product JSON-LD in GHS and a 404 for unknown products", async ({ page }) => {
    await page.goto("/shop/electric-kettle-2l-glass");
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent())!);
    expect(ld["@type"]).toBe("Product");
    expect(ld.offers.priceCurrency).toBe("GHS");
    expect(ld.offers.price).toBe("210.00");
    // streamed notFound() cannot change the HTTP status; the page shows the not-found UI instead
    await page.goto("/shop/not-a-product");
    await expect(page.getByText(/could not find that page/i)).toBeVisible();
  });

  test("mobile sticky bar shows the total and the WhatsApp pill sits above it", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/shop/electric-kettle-2l-glass");
    await expect(page.getByRole("button", { name: "Preorder" })).toBeVisible();
    const barBox = (await page.locator("div.fixed.bottom-0").boundingBox())!;
    expect(Math.round(barBox.y + barBox.height)).toBe(844);
    const pill = (await page.getByRole("link", { name: "Chat on WhatsApp" }).boundingBox())!;
    expect(pill.y + pill.height).toBeLessThanOrEqual(barBox.y);
  });

  for (const width of widths) {
    test(`product page has no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/shop/oversized-cotton-hoodie");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await noOverflow(page)).toBeLessThanOrEqual(0);
    });
  }

  for (const scheme of ["light", "dark"] as const) {
    test(`product page has no serious axe issues (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/shop/oversized-cotton-hoodie");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await serious(page)).toEqual([]);
    });
  }
});
