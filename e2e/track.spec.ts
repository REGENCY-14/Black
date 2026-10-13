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

async function track(page: Page, orderNumber: string, contact: string) {
  await page.goto("/track");
  await page.getByLabel("Order number").fill(orderNumber);
  await page.getByLabel("Phone number or email").fill(contact);
  await page.getByRole("button", { name: "Track order" }).click();
}

const steps = (page: Page) => page.locator('ol[aria-label="Order progress"] > li');
const count = (page: Page, state: string) =>
  steps(page)
    .and(page.locator(`[data-state="${state}"]`))
    .count();

// Seeded demo orders (see src/lib/api/mock/seed.ts)
const seeded = [
  { num: "ORD-E9H2KP", contact: "0279990000", label: "Confirmed", done: 0, current: 1 },
  { num: "ORD-M7P2LA", contact: "0201998877", label: "Sourcing", done: 1, current: 1 },
  { num: "ORD-DEMO01", contact: "0241234567", label: "Shipped from China", done: 2, current: 1 },
  { num: "ORD-A2D7FJ", contact: "0261778899", label: "Arrived in Ghana", done: 3, current: 1 },
  { num: "ORD-B8E4GK", contact: "0246660011", label: "Out for delivery", done: 4, current: 1 },
  { num: "ORD-C1F5HM", contact: "0551230987", label: "Delivered", done: 6, current: 0 },
];

test.describe("tracking: every status renders", () => {
  for (const s of seeded) {
    test(`${s.label}`, async ({ page }) => {
      await track(page, s.num, s.contact);
      await expect(page.getByTestId("tracked-order-number")).toHaveText(s.num);
      await expect(page.getByTestId("status-badge")).toHaveText(s.label);
      await expect(steps(page)).toHaveCount(6);
      expect(await count(page, "done")).toBe(s.done);
      expect(await count(page, "current")).toBe(s.current);
      expect(await count(page, "upcoming")).toBe(6 - s.done - s.current);
      // dates for the steps already reached are shown in Africa/Accra time
      if (s.done > 0) await expect(steps(page).first()).toContainText(/\d{4}/);
      // status is never colour alone: text states exist for screen readers
      await expect(steps(page).first()).toContainText(s.done > 0 ? "Done" : "Current step");
    });
  }

  test("Delayed keeps the timeline position and shows the note and new date", async ({ page }) => {
    await track(page, "ORD-V9C6YE", "0501234000");
    await expect(page.getByTestId("status-badge")).toHaveText("Delayed");
    const banner = page.getByTestId("delayed-banner");
    await expect(banner).toContainText("Your order is delayed");
    await expect(banner).toContainText("The factory needs 10 more days");
    await expect(banner).toContainText("New expected arrival");
    // underlying position (Sourcing) is kept
    await expect(steps(page)).toHaveCount(6);
    expect(await count(page, "done")).toBe(1);
    await expect(steps(page).and(page.locator('[data-state="current"]'))).toContainText("Sourcing");
    await expect(steps(page).and(page.locator('[data-state="current"]'))).toContainText("Delayed here");
  });

  test("Cancelled replaces the timeline with a calm summary and the refund status", async ({ page }) => {
    await track(page, "ORD-F4J8LQ", "0532221100");
    await expect(page.getByTestId("status-badge")).toHaveText("Cancelled");
    await expect(page.getByTestId("cancelled-summary")).toBeVisible();
    await expect(page.getByTestId("refund-status")).toContainText("Refunded");
    await expect(page.locator('ol[aria-label="Order progress"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Request cancellation" })).toHaveCount(0);
    await expect(page.getByTestId("balance-banner")).toHaveCount(0);
  });

  test("Cancelled with a pending refund says it is on its way", async ({ page }) => {
    await track(page, "ORD-G7K1MR", "0246789012");
    await expect(page.getByTestId("refund-status")).toContainText("Refund on its way");
  });

  test("an order with no payment yet asks to complete payment", async ({ page }) => {
    await track(page, "ORD-H3L6NS", "0203334455");
    await expect(page.getByTestId("balance-banner")).toContainText("We have not received your payment");
    await expect(page.getByRole("button", { name: "Complete payment" })).toBeVisible();
  });
});

test.describe("tracking: lookup and privacy", () => {
  test("is forgiving about spacing, case and phone format; email works too", async ({ page }) => {
    await track(page, "  ord- demo01 ", "024 123 4567");
    await expect(page.getByTestId("tracked-order-number")).toHaveText("ORD-DEMO01");
    await track(page, "ORD-DEMO01", "+233241234567");
    await expect(page.getByTestId("tracked-order-number")).toBeVisible();
    await track(page, "ord-demo01", "DEMO@example.com");
    await expect(page.getByTestId("tracked-order-number")).toBeVisible();
  });

  test("refuses to show an order for the wrong phone or email, without saying which was wrong", async ({
    page,
  }) => {
    await track(page, "ORD-DEMO01", "0200000000");
    await expect(page.getByText("We could not find that order")).toBeVisible();
    await expect(page.getByTestId("order-result")).toHaveCount(0);
    // an unknown order number gets the same message
    await page.getByLabel("Order number").fill("ORD-NOPE00");
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.getByText("We could not find that order")).toBeVisible();
  });

  test("validates the form before looking anything up", async ({ page }) => {
    await page.goto("/track");
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.getByText("Enter your order number, for example ORD-4F7K2Q.")).toBeVisible();
    await expect(page.getByText("Enter the phone number or email you used when you ordered.")).toBeVisible();
    await page.getByLabel("Phone number or email").fill("123");
    await page.getByLabel("Order number").fill("ORD-DEMO01");
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.getByText(/Enter a Ghana phone number/)).toBeVisible();
  });

  test("remembers the last tracked order on this device", async ({ page }) => {
    await track(page, "ORD-DEMO01", "0241234567");
    await expect(page.getByTestId("tracked-order-number")).toBeVisible();
    await page.goto("/track");
    await expect(page.getByLabel("Order number")).toHaveValue("ORD-DEMO01");
    await expect(page.getByLabel("Phone number or email")).toHaveValue("+233241234567");
    // a deep link opens straight onto the order because this device knows the contact
    await page.goto("/track?order=ord-demo01");
    await expect(page.getByTestId("tracked-order-number")).toHaveText("ORD-DEMO01");
  });

  test("a deep link for an unknown device prefills the number and asks for the contact", async ({ page }) => {
    await page.goto("/track?order=ORD-M7P2LA");
    await expect(page.getByLabel("Order number")).toHaveValue("ORD-M7P2LA");
    await expect(page.getByLabel("Phone number or email")).toHaveValue("");
  });

  test("shows the last saved status when the network is down", async ({ page, context }) => {
    await track(page, "ORD-DEMO01", "0241234567");
    await expect(page.getByTestId("tracked-order-number")).toBeVisible();
    await page.getByRole("button", { name: "Track a different order" }).click();
    await context.setOffline(true);
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.getByText("You are offline.")).toBeVisible();
    await expect(page.getByTestId("status-badge")).toHaveText("Shipped from China");
    await context.setOffline(false);
  });
});

test.describe("balance payment", () => {
  test("shows the balance banner with amount and due date", async ({ page }) => {
    await track(page, "ORD-DEMO01", "0241234567");
    // total GH₵1,060, deposit GH₵742, balance GH₵318
    const banner = page.getByTestId("balance-banner");
    await expect(banner).toContainText("Balance GH₵318 due");
    await expect(banner).toContainText("14 days before your container arrives");
    await expect(page.getByTestId("paid-amount")).toHaveText("GH₵742");
  });

  test("can be paid from Track, and the banner clears afterwards", async ({ page }) => {
    await track(page, "ORD-DEMO01", "0241234567");
    await page.getByRole("button", { name: "Pay balance" }).click();
    const sheet = page.getByRole("dialog", { name: "Pay your balance" });
    await expect(sheet.getByTestId("balance-amount")).toHaveText("GH₵318");
    await expect(sheet.getByRole("radio", { name: /MTN MoMo/ })).toBeChecked();
    await sheet.getByRole("radio", { name: /Card/ }).check({ force: true });
    await sheet.getByRole("button", { name: "Pay GH₵318" }).click();
    await expect(sheet.getByTestId("balance-paid")).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("balance-banner")).toHaveCount(0);
    await expect(page.getByTestId("paid-amount")).toHaveText("GH₵1,060");
    await expect(page.getByText("Nothing left to pay")).toBeVisible();
  });

  test("can be paid from /pay with MoMo via a WhatsApp-style deep link", async ({ page }) => {
    await page.goto("/pay?order=ord-demo01");
    await expect(page.getByLabel("Order number")).toHaveValue("ORD-DEMO01");
    await page.getByLabel("Phone number or email").fill("0241234567");
    await page.getByRole("button", { name: "Find my balance" }).click();
    await expect(page.getByTestId("balance-amount")).toHaveText("GH₵318");
    await page.getByRole("button", { name: "Pay GH₵318" }).click();
    await expect(page.getByRole("heading", { name: "Waiting for approval on your phone" })).toBeVisible();
    await expect(page.getByTestId("balance-paid")).toBeVisible({ timeout: 20_000 });
    // Track now shows it fully paid
    await page.goto("/track?order=ORD-DEMO01");
    await expect(page.getByTestId("paid-amount")).toHaveText("GH₵1,060");
  });

  test("/pay verifies ownership and handles nothing-to-pay and cancelled orders", async ({ page }) => {
    await page.goto("/pay");
    await page.getByLabel("Order number").fill("ORD-DEMO01");
    await page.getByLabel("Phone number or email").fill("0200000000");
    await page.getByRole("button", { name: "Find my balance" }).click();
    await expect(page.getByText("We could not find that order")).toBeVisible();

    await page.getByLabel("Order number").fill("ORD-R3W8ZD"); // paid in full
    await page.getByLabel("Phone number or email").fill("0271445566");
    await page.getByRole("button", { name: "Find my balance" }).click();
    await expect(page.getByTestId("pay-nothing")).toContainText("Nothing left to pay");

    await page.getByRole("button", { name: "Pay a different order" }).click();
    await page.getByLabel("Order number").fill("ORD-F4J8LQ"); // cancelled
    await page.getByLabel("Phone number or email").fill("0532221100");
    await page.getByRole("button", { name: "Find my balance" }).click();
    await expect(page.getByTestId("pay-nothing")).toContainText("This order was cancelled");
  });

  test("a failed balance payment can be retried with another method", async ({ page }) => {
    await page.goto("/pay");
    await page.getByLabel("Order number").fill("ORD-DEMO01");
    await page.getByLabel("Phone number or email").fill("0241234567");
    await page.getByRole("button", { name: "Find my balance" }).click();
    await page.getByLabel("Mobile Money number").fill("0241234500"); // ends 00: declined by the mock
    await page.getByRole("button", { name: "Pay GH₵318" }).click();
    await expect(page.getByRole("heading", { name: "Payment did not go through" })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: "Change payment method" }).click();
    await page.getByRole("radio", { name: /Card/ }).check({ force: true });
    await page.getByRole("button", { name: "Pay GH₵318" }).click();
    await expect(page.getByTestId("balance-paid")).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("cancellation request", () => {
  test("is offered only before goods ship from China", async ({ page }) => {
    await track(page, "ORD-DEMO01", "0241234567"); // already shipped
    await expect(page.getByRole("button", { name: "Request cancellation" })).toHaveCount(0);
    await track(page, "ORD-A2D7FJ", "0261778899"); // arrived in Ghana
    await expect(page.getByRole("button", { name: "Request cancellation" })).toHaveCount(0);
    await track(page, "ORD-E9H2KP", "0279990000"); // confirmed
    await expect(page.getByRole("button", { name: "Request cancellation" })).toBeVisible();
    await track(page, "ORD-V9C6YE", "0501234000"); // delayed while sourcing
    await expect(page.getByRole("button", { name: "Request cancellation" })).toBeVisible();
  });

  test("explains the refund, can be declined, and can be confirmed", async ({ page }) => {
    await track(page, "ORD-E9H2KP", "0279990000"); // paid 70% of GH₵165 = GH₵115.50
    await page.getByRole("button", { name: "Request cancellation" }).click();
    const sheet = page.getByRole("dialog", { name: "Cancel this order?" });
    await expect(sheet).toContainText("full refund of GH₵115.50");
    await sheet.getByRole("button", { name: "Keep my order" }).click();
    await expect(sheet).toBeHidden();
    await expect(page.getByTestId("status-badge")).toHaveText("Confirmed");

    await page.getByRole("button", { name: "Request cancellation" }).click();
    await page.getByRole("button", { name: "Yes, cancel order" }).click();
    await expect(page.getByTestId("status-badge")).toHaveText("Cancelled");
    await expect(page.getByTestId("refund-status")).toContainText("Refund on its way");
    await expect(page.getByTestId("refund-status")).toContainText("GH₵115.50");
    await expect(page.getByRole("button", { name: "Request cancellation" })).toHaveCount(0);
  });
});

test.describe("layout and accessibility", () => {
  for (const width of widths) {
    test(`track and pay have no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await track(page, "ORD-V9C6YE", "0501234000");
      await expect(page.getByTestId("delayed-banner")).toBeVisible();
      expect(await noOverflow(page)).toBeLessThanOrEqual(0);
      await page.goto("/pay?order=ORD-DEMO01");
      await expect(page.getByLabel("Order number")).toBeVisible();
      expect(await noOverflow(page)).toBeLessThanOrEqual(0);
    });
  }

  for (const scheme of ["light", "dark"] as const) {
    test(`tracking screens have no serious axe issues (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/track");
      await expect(page.getByLabel("Order number")).toBeVisible();
      expect(await serious(page)).toEqual([]);

      await track(page, "ORD-V9C6YE", "0501234000"); // delayed + balance banner
      await expect(page.getByTestId("delayed-banner")).toBeVisible();
      expect(await serious(page)).toEqual([]);

      await track(page, "ORD-F4J8LQ", "0532221100"); // cancelled
      await expect(page.getByTestId("cancelled-summary")).toBeVisible();
      expect(await serious(page)).toEqual([]);

      await track(page, "ORD-DEMO01", "0241234567");
      await page.getByRole("button", { name: "Pay balance" }).click();
      await expect(page.getByTestId("balance-payment")).toBeVisible();
      expect(await serious(page)).toEqual([]);
    });
  }
});
