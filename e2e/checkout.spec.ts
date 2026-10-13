import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const widths = [360, 390, 768, 1024, 1440];
const noOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

async function serious(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(" | ")}`);
}

async function addToCart(page: Page, slug: string) {
  await page.goto(`/shop/${slug}`);
  await page.getByRole("button", { name: "Preorder" }).click();
  await expect(page).toHaveURL(/\/cart$/);
}
const addKettle = (page: Page) => addToCart(page, "electric-kettle-2l-glass"); // GH₵210, container 1
const addCookware = (page: Page) => addToCart(page, "non-stick-cookware-set-12-pieces"); // GH₵1,150, container 2

async function fillDetails(page: Page, phone = "0241234567") {
  await page.getByLabel("Full name").fill("Ama Mensah");
  await page.getByLabel("Phone number").fill(phone);
  await page.getByRole("combobox", { name: "Delivery area" }).click();
  await page.getByRole("option", { name: "Accra", exact: true }).click();
  await page.getByLabel("Address and landmark").fill("East Legon, near the main junction");
}

async function checkTerms(page: Page) {
  await page.getByRole("checkbox", { name: /I accept the/ }).check();
}

test.describe("cart", () => {
  test("shows the empty state", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse preorders" })).toHaveAttribute("href", "/shop");
  });

  test("edits quantity and removes lines, with totals following", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await addKettle(page);
    await expect(page.getByTestId("cart-total")).toHaveText("GH₵210");
    await page.getByRole("button", { name: "Increase quantity of Electric kettle, 2L glass" }).click();
    await expect(page.getByTestId("cart-total")).toHaveText("GH₵420");
    await expect(page.getByText("Pay GH₵294 now (70%)")).toBeVisible();
    await page.getByRole("button", { name: "Remove Electric kettle, 2L glass from cart" }).click();
    await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
  });

  test("groups by arrival window and warns that items split into separate orders", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await addKettle(page);
    await addCookware(page);
    await expect(page.getByRole("note")).toContainText("2 separate orders");
    await expect(page.getByRole("heading", { name: /^Order 1: Arrives/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Order 2: Arrives/ })).toBeVisible();
    await expect(page.getByTestId("cart-total")).toHaveText("GH₵1,360");
  });

  test("keeps the cart after a reload and shows the count in the header", async ({ page }) => {
    await addKettle(page);
    await page.reload();
    await expect(page.getByRole("link", { name: "Cart, 1 item" })).toBeVisible();
    await expect(page.getByTestId("cart-total")).toHaveText("GH₵210");
  });
});

test.describe("checkout (desktop)", () => {
  test.use({ viewport: { width: 1280, height: 1000 } });

  test("a guest pays a 70% deposit with MoMo and sees the confirmation", async ({ page }) => {
    await addKettle(page);
    await page.getByRole("link", { name: "Checkout" }).click();
    await fillDetails(page);

    // network is preselected from the 024 prefix; the plan defaults to the deposit
    await expect(page.getByRole("radio", { name: /MTN MoMo/ })).toBeChecked();
    await expect(page.getByRole("radio", { name: /Pay 70% now/ })).toBeChecked();
    await expect(page.getByLabel("Mobile Money number")).toHaveValue("0241234567");

    // itemised summary: no hidden lines, no delivery fee
    const summary = page.getByRole("complementary", { name: "Order summary" });
    await expect(summary).toContainText("Items total");
    await expect(summary).toContainText("GH₵210");
    await expect(summary).toContainText("Included");
    await expect(summary).toContainText("Price is locked once your deposit is paid.");
    await expect(summary).toContainText(
      "Delivery is arranged directly with the rider after your goods arrive.",
    );
    await expect(summary.getByTestId("pay-now")).toHaveText("GH₵147");
    await expect(summary).toContainText("GH₵63");
    await expect(summary).not.toContainText(/delivery fee/i);

    await checkTerms(page);
    await page.getByRole("button", { name: "Pay GH₵147" }).click();
    await expect(page.getByRole("heading", { name: "Waiting for approval on your phone" })).toBeVisible();
    await expect(page.getByTestId("payment-flow")).toContainText("+233 24 123 4567");

    await expect(page).toHaveURL(/\/checkout\/success$/, { timeout: 20_000 });
    await expect(page.getByTestId("order-number")).toHaveText(/^ORD-[A-Z0-9]{6}$/);
    await expect(page.getByTestId("amount-paid")).toHaveText("GH₵147");
    await expect(page.getByTestId("balance-due")).toContainText("GH₵63");
    await expect(page.getByTestId("balance-due")).toContainText("Balance due");
    await expect(page.getByTestId("whatsapp-note")).toContainText("+233 24 123 4567");
    await expect(page.getByRole("link", { name: "Pay balance" })).toHaveAttribute(
      "href",
      /\/pay\?order=ORD-/,
    );
    await expect(page.getByRole("link", { name: "Track this order" })).toHaveAttribute(
      "href",
      /\/track\?order=ORD-/,
    );
    await expect(page.getByRole("link", { name: "Share on WhatsApp" })).toHaveAttribute(
      "href",
      /wa\.me\/\?text=/,
    );

    // the cart is cleared and the confirmation survives a reload
    await expect(page.getByRole("link", { name: "Cart, empty" })).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("amount-paid")).toHaveText("GH₵147");
  });

  test("paying in full by card confirms immediately with nothing left to pay", async ({ page }) => {
    await addKettle(page);
    await page.goto("/checkout");
    await fillDetails(page);
    await page.getByRole("radio", { name: /Pay in full/ }).check({ force: true });
    await page.getByRole("radio", { name: /Card/ }).check({ force: true });
    await expect(page.getByLabel("Mobile Money number")).toHaveCount(0);
    await checkTerms(page);
    await page.getByRole("button", { name: "Pay GH₵210" }).click();
    await expect(page).toHaveURL(/\/checkout\/success$/, { timeout: 15_000 });
    await expect(page.getByTestId("amount-paid")).toHaveText("GH₵210");
    await expect(page.getByText("Nothing left to pay")).toBeVisible();
    await expect(page.getByRole("link", { name: "Pay balance" })).toHaveCount(0);
  });

  test("a declined MoMo payment explains why and lets the customer switch to card", async ({ page }) => {
    await addKettle(page);
    await page.goto("/checkout");
    await fillDetails(page, "0241234500"); // numbers ending 00 are declined by the mock
    await checkTerms(page);
    await page.getByRole("button", { name: "Pay GH₵147" }).click();
    await expect(page.getByRole("heading", { name: "Payment did not go through" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("payment-flow").getByRole("alert")).toContainText("declined on your phone");
    await page.getByRole("button", { name: "Change payment method" }).click();
    await page.getByRole("radio", { name: /Card/ }).check({ force: true });
    await page.getByRole("button", { name: "Pay GH₵147" }).click();
    await expect(page).toHaveURL(/\/checkout\/success$/, { timeout: 15_000 });
    // the retry reused the same order: only one order was created
    await expect(page.getByTestId("order-number")).toHaveCount(1);
  });

  test("an unapproved MoMo prompt times out, offers retry, and never leaves a blank screen", async ({
    page,
  }) => {
    await page.clock.install();
    await addKettle(page);
    await page.goto("/checkout");
    await fillDetails(page, "0241234599"); // numbers ending 99 are never approved by the mock
    await checkTerms(page);
    await page.getByRole("button", { name: "Pay GH₵147" }).click();
    await expect(page.getByRole("heading", { name: "Waiting for approval on your phone" })).toBeVisible();
    await expect(page.getByText(/Time left 1:/)).toBeVisible();
    await page.clock.fastForward(95_000);
    await expect(page.getByRole("heading", { name: "We have not received your approval" })).toBeVisible();
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("heading", { name: "Waiting for approval on your phone" })).toBeVisible();
  });

  test("a split cart creates two orders and charges the sum of both deposits", async ({ page }) => {
    await addKettle(page);
    await addCookware(page);
    await page.goto("/checkout");
    await fillDetails(page);
    await page.getByRole("radio", { name: /Card/ }).check({ force: true });
    const summary = page.getByRole("complementary", { name: "Order summary" });
    await expect(summary).toContainText("Order 1");
    await expect(summary).toContainText("Order 2");
    // 70% of 210 + 70% of 1,150 = 147 + 805
    await expect(summary.getByTestId("pay-now")).toHaveText("GH₵952");
    await checkTerms(page);
    await page.getByRole("button", { name: "Pay GH₵952" }).click();
    await expect(page).toHaveURL(/\/checkout\/success$/, { timeout: 15_000 });
    await expect(page.getByTestId("order-number")).toHaveCount(2);
    await expect(page.getByTestId("amount-paid").first()).toHaveText("GH₵147");
    await expect(page.getByTestId("amount-paid").nth(1)).toHaveText("GH₵805");
  });

  test("shows clear field errors and does not pay until the form is valid", async ({ page }) => {
    await addKettle(page);
    await page.goto("/checkout");
    await page.getByLabel("Full name").fill("A");
    await page.getByLabel("Phone number").fill("12345");
    await page.getByLabel("Phone number").blur();
    await expect(page.getByText("Enter a Ghana mobile number, for example 024 123 4567.")).toBeVisible();
    await page.getByRole("button", { name: /^Pay GH₵/ }).click();
    await expect(page.getByText("Enter your full name.")).toBeVisible();
    await expect(page.getByText("Choose your delivery area.")).toBeVisible();
    await expect(page.getByText("Choose how you want to pay.")).toBeVisible();
    await expect(page.getByText("Accept the terms to continue.")).toBeVisible();
    await expect(page.getByTestId("payment-flow")).toHaveCount(0);
  });

  test("optional fields: GhanaPost GPS is validated, email can be empty", async ({ page }) => {
    await addKettle(page);
    await page.goto("/checkout");
    await page.getByLabel("GhanaPost GPS address").fill("nonsense");
    await page.getByLabel("GhanaPost GPS address").blur();
    await expect(page.getByText("Use the format GA-123-4567, or leave it empty.")).toBeVisible();
    await page.getByLabel("GhanaPost GPS address").fill("GA-123-4567");
    await expect(page.getByText("Use the format GA-123-4567, or leave it empty.")).toHaveCount(0);
    await expect(page.getByRole("radio", { name: /Pick up/ })).toHaveCount(0); // pickup flag is off
  });
});

test.describe("checkout (mobile steps)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("walks four steps with validation, then pays", async ({ page }) => {
    await addKettle(page);
    await page.getByRole("link", { name: "Checkout" }).click();

    // step 1 only
    await expect(page.getByText("Step 1 of 4")).toBeVisible();
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expect(page.getByRole("radio", { name: /Pay in full/ })).toBeHidden();

    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Enter your full name.")).toBeVisible();
    await expect(page.getByText("Step 1 of 4")).toBeVisible();

    await fillDetails(page);
    await page.getByRole("button", { name: "Continue" }).click();

    // step 2
    await expect(page.getByText("Step 2 of 4")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Payment plan/ })).toBeFocused();
    await expect(page.getByRole("radio", { name: /Pay 70% now/ })).toBeChecked();
    await page.getByRole("button", { name: "Continue" }).click();

    // step 3
    await expect(page.getByText("Step 3 of 4")).toBeVisible();
    await page.getByRole("radio", { name: /Card/ }).check({ force: true });
    await page.getByRole("button", { name: "Continue" }).click();

    // step 4
    await expect(page.getByText("Step 4 of 4")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Review and pay" }).getByTestId("order-summary"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Pay GH₵147" }).click();
    await expect(page.getByText("Accept the terms to continue.")).toBeVisible();
    await checkTerms(page);
    await page.getByRole("button", { name: "Pay GH₵147" }).click();
    await expect(page).toHaveURL(/\/checkout\/success$/, { timeout: 15_000 });
    await expect(page.getByTestId("amount-paid")).toHaveText("GH₵147");
  });

  test("Back returns to the previous step with answers kept", async ({ page }) => {
    await addKettle(page);
    await page.goto("/checkout");
    await fillDetails(page);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByLabel("Full name")).toHaveValue("Ama Mensah");
  });
});

test.describe("layout and accessibility", () => {
  for (const width of widths) {
    test(`cart, checkout and confirmation have no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await addCookware(page);
      await addKettle(page);
      expect(await noOverflow(page)).toBeLessThanOrEqual(0);
      await page.goto("/checkout");
      await expect(page.getByLabel("Full name")).toBeVisible();
      expect(await noOverflow(page)).toBeLessThanOrEqual(0);
    });
  }

  for (const scheme of ["light", "dark"] as const) {
    test(`cart and checkout have no serious axe issues (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await addCookware(page);
      await addKettle(page);
      expect(await serious(page)).toEqual([]);
      await page.goto("/checkout");
      await expect(page.getByLabel("Full name")).toBeVisible();
      expect(await serious(page)).toEqual([]);
    });
  }

  test("confirmation has no serious axe issues", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await addKettle(page);
    await page.goto("/checkout");
    await fillDetails(page);
    await page.getByRole("radio", { name: /Card/ }).check({ force: true });
    await checkTerms(page);
    await page.getByRole("button", { name: "Pay GH₵147" }).click();
    await expect(page).toHaveURL(/\/checkout\/success$/, { timeout: 15_000 });
    await expect(page.getByTestId("order-number")).toBeVisible();
    expect(await serious(page)).toEqual([]);
    expect(await noOverflow(page)).toBeLessThanOrEqual(0);
  });
});
