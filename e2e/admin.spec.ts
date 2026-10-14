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

const accounts = {
  owner: { email: "owner@example.com", password: "owner123", name: "Bawuah" },
  staff: { email: "staff@example.com", password: "staff123", name: "Kwesi" },
};

async function signIn(page: Page, who: keyof typeof accounts = "owner") {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(accounts[who].email);
  await page.getByLabel("Password").fill(accounts[who].password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: new RegExp(`Hello, ${accounts[who].name}`) }),
  ).toBeVisible();
}

const adminNav = (page: Page) => page.getByRole("navigation", { name: "Admin" }).locator("visible=true");

/** Open an order from the list by its number. */
async function openOrder(page: Page, orderNumber: string) {
  await page.goto("/admin/orders");
  await page.getByRole("searchbox", { name: "Search orders" }).fill(orderNumber);
  await page.locator(`a[href^="/admin/orders/"]:visible`, { hasText: orderNumber }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: orderNumber })).toBeVisible();
}

// 1x1 PNG, enough for the browser to decode, shrink and re-encode
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const photo = (name: string) => ({ name, mimeType: "image/png", buffer: PNG });

test.describe("sign in", () => {
  test("signed-out visitors are sent to the login page from every admin screen", async ({ page }) => {
    for (const path of ["/admin", "/admin/orders", "/admin/batches", "/admin/products", "/admin/staff"]) {
      await page.goto(path);
      // the redirect happens after the page hydrates and the session check returns; allow for a busy machine
      await expect(page).toHaveURL(/\/admin\/login$/, { timeout: 20_000 });
    }
  });

  test("rejects a wrong password with one message, then signs in and survives a reload", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill("owner@example.com");
    await page.getByLabel("Password").fill("wrong");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Check your email and password and try again.")).toBeVisible();

    await signIn(page);
    await expect(page.getByText("Owner").first()).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Hello, Bawuah");
  });

  test("validates the form, and signing out locks the area again", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Enter the email you sign in with.")).toBeVisible();
    await expect(page.getByText("Enter your password.")).toBeVisible();

    await signIn(page);
    await page.getByRole("button", { name: "Sign out" }).locator("visible=true").click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("the admin area is marked noindex", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("a signed-in user visiting the login page goes to the dashboard", async ({ page }) => {
    await signIn(page);
    await page.goto("/admin/login");
    await expect(page).toHaveURL(/\/admin$/);
  });
});

test.describe("roles: Ghana staff are limited", () => {
  test("staff see only Dashboard, Orders and Batches in the menu (desktop)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await signIn(page, "staff");
    const nav = page.getByRole("navigation", { name: "Admin" });
    await expect(nav.getByRole("link")).toHaveText(["Dashboard", "Orders", "Batches"]);
    for (const hidden of ["Products", "Categories", "Staff"]) {
      await expect(page.getByRole("link", { name: hidden, exact: true })).toHaveCount(0);
    }
    await expect(page.getByText("Ghana staff").first()).toBeVisible();
  });

  test("staff see only three menu items on a phone too", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, "staff");
    await expect(adminNav(page).getByRole("link")).toHaveText(["Dashboard", "Orders", "Batches"]);
  });

  test("the owner sees every screen in the menu", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await signIn(page, "owner");
    await expect(page.getByRole("navigation", { name: "Admin" }).getByRole("link")).toHaveText([
      "Dashboard",
      "Orders",
      "Batches",
      "Products",
      "Categories",
      "Staff",
    ]);
  });

  for (const path of [
    "/admin/products",
    "/admin/products/new",
    "/admin/products/p01",
    "/admin/categories",
    "/admin/staff",
  ]) {
    test(`staff cannot open ${path}: a no-access panel and none of the owner's data`, async ({ page }) => {
      await signIn(page, "staff");
      await page.goto(path);
      await expect(page.getByTestId("no-access")).toBeVisible();
      await expect(page.getByRole("heading", { name: "You do not have access to this page" })).toBeVisible();
      // nothing from the owner screens leaks through
      for (const leaked of [
        "Add product",
        "Oversized cotton hoodie",
        "Add staff login",
        "owner@example.com",
        "New category",
        "Publish",
      ]) {
        await expect(page.getByText(leaked, { exact: false })).toHaveCount(0);
      }
      await expect(page.getByTestId("product-row")).toHaveCount(0);
      await expect(page.getByTestId("staff-row")).toHaveCount(0);
      await expect(page.getByTestId("category-row")).toHaveCount(0);
    });
  }

  test("staff have no Add product shortcut and no Cancel order button, but can update status", async ({
    page,
  }) => {
    await signIn(page, "staff");
    await expect(page.getByRole("link", { name: "Add product" })).toHaveCount(0);
    await openOrder(page, "ORD-E9H2KP");
    await expect(page.getByRole("button", { name: /Mark as Sourcing/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Record payment" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark delayed" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel order" })).toHaveCount(0);
  });

  test("the owner has Cancel order and the Add product shortcut", async ({ page }) => {
    await signIn(page, "owner");
    await expect(page.getByRole("link", { name: "Add product" }).first()).toBeVisible();
    await openOrder(page, "ORD-E9H2KP");
    await expect(page.getByRole("button", { name: "Cancel order" })).toBeVisible();
  });
});

test.describe("orders", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("lists all orders in a table and filters by status, balance, container and search", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/admin/orders");
    await expect(page.locator("table tbody tr")).toHaveCount(16);

    await page.getByRole("combobox", { name: "Filter by status" }).click();
    await page.getByRole("option", { name: "Delayed" }).click();
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr").first()).toContainText("ORD-V9C6YE");

    await page.getByRole("combobox", { name: "Filter by status" }).click();
    await page.getByRole("option", { name: "All statuses" }).click();
    await page.getByRole("button", { name: "Balance outstanding" }).click();
    await expect.poll(() => page.locator("table tbody tr").count()).toBeGreaterThan(3);
    await expect.poll(() => page.locator("table tbody tr").count()).toBeLessThan(16);
    await expect(page.locator("table tbody tr", { hasText: "Cancelled" })).toHaveCount(0);

    await page.getByRole("button", { name: "Balance outstanding" }).click();
    await page.getByRole("combobox", { name: "Filter by container" }).click();
    await page.getByRole("option", { name: /Container 0/ }).click();
    await expect(page.locator("table tbody tr")).toHaveCount(4);

    await page.getByRole("combobox", { name: "Filter by container" }).click();
    await page.getByRole("option", { name: "All containers" }).click();
    await page.getByRole("searchbox", { name: "Search orders" }).fill("0551112233");
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr").first()).toContainText("ORD-K4T9QX");

    await page.getByRole("searchbox", { name: "Search orders" }).fill("zzzz");
    await expect(page.getByText("No orders match")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.locator("table tbody tr")).toHaveCount(16);
  });

  test("the dashboard 'who owes' link opens the list already filtered", async ({ page }) => {
    await signIn(page);
    await page.getByRole("link", { name: "See who owes" }).click();
    await expect(page.getByRole("button", { name: "Balance outstanding" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("shows cards instead of a table on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await page.goto("/admin/orders");
    await expect(page.locator("table")).toBeHidden();
    await expect(page.getByRole("list", { name: "Orders" }).getByRole("link")).toHaveCount(16);
  });

  test("moves an order along step by step and records history", async ({ page }) => {
    await signIn(page, "staff");
    await openOrder(page, "ORD-E9H2KP"); // confirmed, deposit paid
    await page.getByRole("button", { name: /Mark as Sourcing/ }).click();
    await expect(page.getByText("Moved to Sourcing", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Mark as Shipped from China/ })).toBeVisible();
    await expect(page.getByTestId("admin-history")).toContainText("Sourcing");
    await page.getByRole("button", { name: /Mark as Shipped from China/ }).click();
    await expect(page.getByRole("button", { name: /Mark as Arrived in Ghana/ })).toBeVisible();

    // the customer sees it on Track
    await page.goto("/track");
    await page.getByLabel("Order number").fill("ORD-E9H2KP");
    await page.getByLabel("Phone number or email").fill("0279990000");
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.getByTestId("status-badge")).toHaveText("Shipped from China");
  });

  test("an unpaid order cannot move on until a payment is recorded", async ({ page }) => {
    await signIn(page, "staff");
    await openOrder(page, "ORD-H3L6NS");
    await expect(page.getByText("Record a payment before moving this order on.")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Mark as/ })).toHaveCount(0);

    await page.getByRole("button", { name: "Record payment" }).click();
    const sheet = page.getByRole("dialog", { name: "Record a payment" });
    await sheet.getByLabel("Amount received").fill("");
    await sheet.getByRole("button", { name: "Confirm payment received" }).click();
    await expect(sheet.getByText("Enter an amount above zero")).toBeVisible();
    await sheet.getByLabel("Amount received").fill("100");
    await sheet.getByRole("button", { name: "Confirm payment received" }).click();
    await expect(page.getByTestId("admin-paid")).toHaveText("GH₵100");
    await expect(page.getByTestId("admin-history")).toContainText("Payment confirmed by Kwesi Adomako");
    await expect(page.getByRole("button", { name: /Mark as Sourcing/ })).toBeVisible();
  });

  test("a payment above the balance is refused", async ({ page }) => {
    await signIn(page, "staff");
    await openOrder(page, "ORD-H3L6NS");
    await page.getByRole("button", { name: "Record payment" }).click();
    const sheet = page.getByRole("dialog", { name: "Record a payment" });
    await sheet.getByLabel("Amount received").fill("999999");
    await sheet.getByRole("button", { name: "Confirm payment received" }).click();
    await expect(sheet.getByRole("alert")).toContainText("more than the balance");
  });

  test("marking delayed needs a note, shows to the customer, and the delay can be cleared", async ({
    page,
  }) => {
    await signIn(page, "staff");
    await openOrder(page, "ORD-M7P2LA"); // sourcing
    await page.getByRole("button", { name: "Mark delayed" }).click();
    const sheet = page.getByRole("dialog", { name: "Mark this order as delayed" });
    await sheet.getByRole("button", { name: "Mark as delayed" }).click();
    await expect(sheet.getByText("Add a short note the customer will see.")).toBeVisible();
    await sheet.getByLabel("Note for the customer").fill("The factory is closed for a public holiday.");
    await sheet.getByLabel("New expected arrival").fill("2027-02-01");
    await sheet.getByRole("button", { name: "Mark as delayed" }).click();
    await expect(page.getByTestId("admin-history")).toContainText(
      "The factory is closed for a public holiday.",
    );
    await expect(page.getByText("This order is delayed. Clear the delay to move it on.")).toBeVisible();

    await page.goto("/track");
    await page.getByLabel("Order number").fill("ORD-M7P2LA");
    await page.getByLabel("Phone number or email").fill("0201998877");
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.getByTestId("delayed-banner")).toContainText(
      "The factory is closed for a public holiday.",
    );
    await expect(page.getByTestId("delayed-banner")).toContainText("1 Feb 2027");

    await openOrder(page, "ORD-M7P2LA");
    await page.getByRole("button", { name: "Clear delay" }).click();
    await expect(page.getByRole("button", { name: /Mark as Shipped from China/ })).toBeVisible();
  });

  test("the owner can cancel an order, which starts a refund, and then mark it refunded", async ({
    page,
  }) => {
    await signIn(page, "owner");
    await openOrder(page, "ORD-E9H2KP");
    await page.getByRole("button", { name: "Cancel order" }).click();
    const sheet = page.getByRole("dialog", { name: "Cancel this order?" });
    await expect(sheet).toContainText("GH₵115.50 will be marked for refund");
    await sheet.getByLabel("Note for the customer").fill("Sold out at the factory.");
    await sheet.getByRole("button", { name: "Yes, cancel order" }).click();
    await expect(page.getByTestId("admin-refund")).toContainText("Refund pending: GH₵115.50");
    await expect(page.getByText("This order was cancelled.")).toBeVisible();

    await page.getByRole("button", { name: "Mark refund as done" }).click();
    await expect(page.getByTestId("admin-refund")).toContainText("Refund done");

    await page.goto("/track");
    await page.getByLabel("Order number").fill("ORD-E9H2KP");
    await page.getByLabel("Phone number or email").fill("0279990000");
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.getByTestId("refund-status")).toContainText("Refunded");
    await expect(page.getByText("Sold out at the factory.")).toBeVisible();
  });
});

test.describe("batches", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("lists containers with counts, and advancing one shows who is notified before it happens", async ({
    page,
  }) => {
    await signIn(page, "staff");
    await page.goto("/admin/batches");
    await expect(page.locator('[data-testid^="batch-b"]')).toHaveCount(4);
    const b2 = page.getByTestId("batch-b2");
    await expect(b2).toContainText("Container 2");
    await expect(b2.getByTestId("batch-status")).toHaveText("Sourcing");

    await b2.getByRole("button", { name: /Mark as Shipped from China/ }).click();
    const sheet = page.getByRole("dialog", { name: /Move Container 2/ });
    await expect(sheet.getByTestId("impact-orders")).toHaveText("1");
    await expect(sheet.getByTestId("impact-customers")).toHaveText("1");
    await expect(sheet).toContainText("1 delayed order stays as it is");
    await expect(sheet).toContainText("notified on WhatsApp");

    // declining changes nothing
    await sheet.getByRole("button", { name: "Not yet" }).click();
    await expect(b2.getByTestId("batch-status")).toHaveText("Sourcing");

    await b2.getByRole("button", { name: /Mark as Shipped from China/ }).click();
    await page.getByRole("button", { name: "Yes, mark as Shipped from China" }).click();
    await expect(page.getByText("1 order moved", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("1 customer notified.", { exact: true }).first()).toBeVisible();
    await expect(b2.getByTestId("batch-status")).toHaveText("Shipped from China");

    // the customer sees the new status
    await page.goto("/track");
    await page.getByLabel("Order number").fill("ORD-M7P2LA");
    await page.getByLabel("Phone number or email").fill("0201998877");
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.getByTestId("status-badge")).toHaveText("Shipped from China");
  });

  test("a batch that has arrived cannot be advanced further, and its page lists its orders", async ({
    page,
  }) => {
    await signIn(page, "owner");
    await page.goto("/admin/batches");
    const b0 = page.getByTestId("batch-b0");
    await expect(b0.getByText("Arrived in Ghana").first()).toBeVisible();
    await expect(b0.getByRole("button", { name: /^Mark as/ })).toHaveCount(0);
    await b0.getByRole("link", { name: "See orders" }).click();
    await expect(page.getByRole("heading", { level: 1, name: /Container 0/ })).toBeVisible();
    await expect(page.locator("table tbody tr")).toHaveCount(4);
  });
});

test.describe("products (owner)", () => {
  test("posts a product from a phone in a few steps and it appears in the shop", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await page.goto("/admin/products/new");
    await expect(page.getByText("Step 1 of 5")).toBeVisible();

    // 1. photos: pick two, reorder, remove none
    await page.getByTestId("photo-input").setInputFiles([photo("a.png"), photo("b.png")]);
    await expect(page.getByRole("list", { name: "Photos" }).getByRole("listitem")).toHaveCount(2);
    await expect(page.getByAltText("Photo 1, cover")).toBeVisible();
    await page.getByRole("button", { name: "Move photo 1 later" }).click();
    await expect(page.getByAltText("Photo 1, cover")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // 2. name and price, with validation
    await expect(page.getByText("Step 2 of 5")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Enter a product name.")).toBeVisible();
    await expect(page.getByText(/Enter a price above zero/)).toBeVisible();
    await page.getByLabel("Product name").fill("Zebra desk lamp");
    await page.getByLabel("Price (GH₵)").fill("120.50");
    await page.getByLabel("Description").fill("A soft light for night reading.");
    await page.getByRole("button", { name: "Continue" }).click();

    // 3. category and options
    await expect(page.getByText("Step 3 of 5")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Choose a category.")).toBeVisible();
    await page.getByRole("combobox", { name: "Category" }).click();
    await page.getByRole("option", { name: "Home and kitchen" }).click();
    await page.getByRole("button", { name: "Add colours" }).click();
    await page.getByLabel("Options, separated by commas").fill("Black, White");
    await page.getByRole("button", { name: "Continue" }).click();

    // 4. limit and container
    await expect(page.getByText("Step 4 of 5")).toBeVisible();
    await page.getByLabel("How many people can preorder?").fill("");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText(/Enter how many people can preorder/)).toBeVisible();
    await expect(page.getByText("Choose the container this ships in.")).toBeVisible();
    await page.getByLabel("How many people can preorder?").fill("8");
    await page.getByRole("combobox", { name: "Container" }).click();
    await page.getByRole("option", { name: /Container 2/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // 5. review and publish
    await expect(page.getByText("Step 5 of 5")).toBeVisible();
    const review = page.getByTestId("product-review");
    await expect(review).toContainText("Zebra desk lamp");
    await expect(review).toContainText("GH₵120.50");
    await expect(review).toContainText("Home and kitchen");
    await expect(review).toContainText("Black, White");
    await expect(review).toContainText("8 preorders");
    await page.getByRole("button", { name: "Publish" }).click();

    await expect(page).toHaveURL(/\/admin\/products$/);
    const row = page.getByTestId("product-row").filter({ hasText: "Zebra desk lamp" });
    await expect(row).toContainText("Published");
    await expect(row).toContainText("0 of 8 ordered");

    // shoppers see it
    await page.goto("/shop?q=zebra");
    const card = page.locator("main ul a[href^='/shop/']").filter({ hasText: "desk lamp" });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("GH₵120.50");
  });

  test("a draft can be saved without photos and stays out of the shop; Publish needs a photo", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await page.goto("/admin/products/new");
    await page.getByRole("button", { name: "Continue" }).click(); // photos are optional until publishing
    await page.getByLabel("Product name").fill("Draft kettle stand");
    await page.getByLabel("Price (GH₵)").fill("45");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("combobox", { name: "Category" }).click();
    await page.getByRole("option", { name: "Gadgets" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("combobox", { name: "Container" }).click();
    await page.getByRole("option", { name: /Container 1/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Add at least one photo to publish.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(page.getByTestId("product-row").filter({ hasText: "Draft kettle stand" })).toContainText(
      "Draft",
    );

    await page.goto("/shop?q=draft kettle");
    await expect(page.getByText("Nothing matches that yet")).toBeVisible();
  });

  test("hides and shows a product, filters by status, and edits name and price", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await signIn(page);
    await page.goto("/admin/products");
    const row = page.getByTestId("product-row").filter({ hasText: "Electric kettle" });
    await row.getByRole("button", { name: "Hide Electric kettle, 2L glass" }).click();
    await expect(row).toContainText("Hidden");
    await page.getByRole("button", { name: "Hidden" }).click();
    await expect(page.getByTestId("product-row")).toHaveCount(1);

    await page.goto("/shop?q=kettle");
    await expect(page.getByText("Nothing matches that yet")).toBeVisible();

    await page.goto("/admin/products");
    await page.getByRole("button", { name: "Hidden" }).click();
    await page.getByRole("button", { name: "Show Electric kettle, 2L glass" }).click();
    await page.getByRole("button", { name: "All" }).click();
    await page
      .getByTestId("product-row")
      .filter({ hasText: "Electric kettle" })
      .getByRole("link", { name: /Edit/ })
      .click();

    await expect(page.getByLabel("Product name")).toHaveCount(0); // step 1 is photos
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByLabel("Product name")).toHaveValue("Electric kettle, 2L glass");
    await expect(page.getByLabel("Price (GH₵)")).toHaveValue("210");
    await page.getByLabel("Price (GH₵)").fill("199.99");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);

    await page.goto("/shop?q=kettle");
    await expect(page.locator("main ul a[href^='/shop/']").first()).toContainText("GH₵199.99");
  });

  test("deleting asks first, and a product with orders cannot be deleted", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await signIn(page);
    await page.goto("/admin/products");
    await page.getByRole("button", { name: "Delete Electric kettle, 2L glass" }).click();
    const sheet = page.getByRole("dialog", { name: /Delete Electric kettle/ });
    await sheet.getByRole("button", { name: "Yes, delete" }).click();
    await expect(sheet.getByRole("alert")).toContainText("already has orders");
    await sheet.getByRole("button", { name: "Keep it" }).click();
    await expect(page.getByTestId("product-row").filter({ hasText: "Electric kettle" })).toHaveCount(1);
  });
});

test.describe("categories (owner)", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("adds, renames, reorders and deletes; refuses duplicates and non-empty categories", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/admin/categories");
    await expect(page.getByTestId("category-row")).toHaveCount(5);

    await page.getByLabel("New category").fill("Garden tools");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByTestId("category-row")).toHaveCount(6);
    await page.getByLabel("New category").fill("garden tools");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("That category already exists.")).toBeVisible();

    await page.getByRole("button", { name: "Rename Garden tools" }).click();
    await page.getByLabel("Name for Garden tools").fill("Garden");
    await page.getByRole("button", { name: "Save name" }).click();
    await expect(page.getByTestId("category-row").last()).toContainText("Garden");

    await page.getByRole("button", { name: "Move Garden up" }).click();
    await expect(page.getByTestId("category-row").nth(4)).toContainText("Garden");

    await page.getByRole("button", { name: "Delete Beauty" }).click();
    await page.getByRole("button", { name: "Yes, delete" }).click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText("still has products");
    await page.getByRole("button", { name: "Keep it" }).click();

    await page.getByRole("button", { name: "Delete Garden" }).click();
    await page.getByRole("button", { name: "Yes, delete" }).click();
    await expect(page.getByTestId("category-row")).toHaveCount(5);

    // shoppers see the same list
    await page.goto("/shop");
    await expect(page.getByRole("button", { name: "Garden" })).toHaveCount(0);
  });
});

test.describe("staff (owner)", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("creates a Ghana staff login that works with limited access, then disables it", async ({
    page,
    browser,
  }) => {
    await signIn(page);
    await page.goto("/admin/staff");
    await expect(page.getByTestId("staff-row")).toHaveCount(2);

    await page.getByRole("button", { name: "Add staff login" }).click();
    const sheet = page.getByRole("dialog", { name: "Add a Ghana staff login" });
    await sheet.getByLabel("Full name").fill("Efua Teye");
    await sheet.getByLabel("Email").fill("efua@example.com");
    await sheet.getByLabel("Password").fill("123");
    await sheet.getByRole("button", { name: "Create login" }).click();
    await expect(sheet.getByRole("alert")).toContainText("at least 6 characters");
    await sheet.getByLabel("Password").fill("secret1");
    await sheet.getByRole("button", { name: "Create login" }).click();
    await expect(page.getByTestId("staff-row")).toHaveCount(3);
    await expect(page.getByTestId("staff-row").filter({ hasText: "Efua Teye" })).toContainText("Ghana staff");

    // the new person signs in on another device and is limited
    const ctx = await browser.newContext({ storageState: await page.context().storageState() });
    const other = await ctx.newPage();
    // a fresh session: sign out in that copy first so we really test the new login
    await other.goto("/admin/login");
    await other.evaluate(() => localStorage.removeItem("mock-session"));
    await other.reload();
    await other.getByLabel("Email").fill("efua@example.com");
    await other.getByLabel("Password").fill("secret1");
    await other.getByRole("button", { name: "Sign in" }).click();
    await expect(other.getByRole("heading", { level: 1 })).toContainText("Hello, Efua");
    await expect(other.getByRole("navigation", { name: "Admin" }).getByRole("link")).toHaveText([
      "Dashboard",
      "Orders",
      "Batches",
    ]);
    await other.goto("/admin/staff");
    await expect(other.getByTestId("no-access")).toBeVisible();
    await ctx.close();

    // the owner disables them
    await page.getByRole("button", { name: "Disable Efua Teye" }).click();
    await page.getByRole("button", { name: "Yes, disable" }).click();
    await expect(page.getByTestId("staff-row").filter({ hasText: "Efua Teye" })).toContainText("Disabled");

    // and the owner cannot disable themselves or the owner account
    await expect(page.getByRole("button", { name: /Disable Bawuah/ })).toHaveCount(0);

    // a disabled account cannot sign in
    const ctx2 = await browser.newContext({ storageState: await page.context().storageState() });
    const again = await ctx2.newPage();
    await again.goto("/admin/login");
    await again.evaluate(() => localStorage.removeItem("mock-session"));
    await again.reload();
    await again.getByLabel("Email").fill("efua@example.com");
    await again.getByLabel("Password").fill("secret1");
    await again.getByRole("button", { name: "Sign in" }).click();
    await expect(again.getByText("This account is disabled.")).toBeVisible();
    await ctx2.close();
  });
});

test.describe("layout and accessibility", () => {
  const ownerScreens = [
    "/admin",
    "/admin/orders",
    "/admin/batches",
    "/admin/products",
    "/admin/products/new",
    "/admin/categories",
    "/admin/staff",
  ];

  for (const width of widths) {
    test(`admin screens have no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/admin/login");
      expect(await noOverflow(page)).toBeLessThanOrEqual(0);
      await signIn(page);
      for (const path of [...ownerScreens, "/admin/orders/o1"]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await page.waitForLoadState("networkidle");
        expect(await noOverflow(page), path).toBeLessThanOrEqual(0);
      }
    });
  }

  for (const scheme of ["light", "dark"] as const) {
    for (const path of [...ownerScreens, "/admin/orders/o1", "/admin/orders/o6"]) {
      test(`${path} has no serious axe issues (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await signIn(page);
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await page.waitForLoadState("networkidle");
        expect(await serious(page)).toEqual([]);
      });
    }
    test(`login has no serious axe issues (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/admin/login");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await serious(page)).toEqual([]);
    });
  }

  test("staff screens and the no-access panel have no serious axe issues", async ({ page }) => {
    await signIn(page, "staff");
    await page.goto("/admin/products");
    await expect(page.getByTestId("no-access")).toBeVisible();
    expect(await serious(page)).toEqual([]);
  });
});
