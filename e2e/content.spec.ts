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

const policies = [
  { slug: "terms", title: "Terms of sale" },
  { slug: "refunds", title: "Refunds and cancellations" },
  { slug: "privacy", title: "Privacy" },
];

test.describe("policy pages", () => {
  for (const p of policies) {
    test(`${p.slug} renders, is clearly marked Draft, and is kept out of search engines`, async ({
      page,
    }) => {
      await page.goto(`/policies/${p.slug}`);
      await expect(page.getByRole("heading", { level: 1, name: p.title })).toBeVisible();
      const banner = page.getByTestId("draft-banner");
      await expect(banner).toContainText("Draft.");
      await expect(banner).toContainText("not been approved by the store owner");
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      // what is still undecided is flagged inside the text
      await expect(page.getByText("To confirm", { exact: false }).first()).toBeVisible();
      // contact details come from config, and no email is shown while none is configured
      await expect(page.locator('main a[href="tel:+233598863540"]')).toBeVisible();
      await expect(page.locator('main a[href="tel:+8619057256153"]')).toBeVisible();
      await expect(page.locator('main a[href^="mailto:"]')).toHaveCount(0);
      // no raw template placeholders leak through
      await expect(page.locator("main")).not.toContainText("{{");
    });
  }

  test("terms use the deposit and balance rules from config", async ({ page }) => {
    await page.goto("/policies/terms");
    const main = page.locator("main");
    await expect(main).toContainText("deposit of 70% of the order total");
    await expect(main).toContainText("due 14 days before the container arrives in Ghana");
    await expect(main).toContainText("Your price is locked once your deposit is paid");
    await expect(main).toContainText("includes shipping from China and import duty");
    await expect(main).toContainText("Delivery is arranged directly between you and the rider");
    await expect(main).toContainText("cancelled, the deposit is kept");
  });

  test("refunds explain the cancellation rule and point to Track", async ({ page }) => {
    await page.goto("/policies/refunds");
    await expect(page.getByText("before your goods ship from China", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("full refund", { exact: false }).first()).toBeVisible();
    await page.getByRole("link", { name: "tracking page" }).click();
    await expect(page).toHaveURL(/\/track$/);
  });

  test("privacy says card details and PINs are never stored", async ({ page }) => {
    await page.goto("/policies/privacy");
    await expect(page.locator("main")).toContainText("do not");
    await expect(page.locator("main")).toContainText("card number or your Mobile Money PIN");
    await expect(page.locator("main")).toContainText("Data Protection Commission");
  });

  test("an unknown policy shows the not-found page", async ({ page }) => {
    await page.goto("/policies/not-a-policy");
    await expect(page.getByText(/could not find that page/i)).toBeVisible();
  });

  test("the policies index lists all three, and the footer and checkout links reach them", async ({
    page,
  }) => {
    await page.goto("/policies");
    for (const p of policies) {
      await expect(page.locator(`main a[href="/policies/${p.slug}"]`)).toContainText(p.title);
    }
    await page.goto("/");
    await page.locator("footer").getByRole("link", { name: "Terms of sale" }).click();
    await expect(page).toHaveURL(/\/policies\/terms$/);
    await expect(page.getByRole("heading", { level: 1, name: "Terms of sale" })).toBeVisible();

    // the links beside the checkout "I accept" box lead to real pages
    for (const href of ["/policies/terms", "/policies/refunds"]) {
      const res = await page.request.get(href);
      expect(res.status()).toBe(200);
    }
  });
});

test.describe("about", () => {
  test("explains how the store works and shows delivered-order photos", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("We buy from the factory");
    await expect(page.getByRole("heading", { name: "One price, no surprises" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pay in two steps" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "See where your order is" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Delivered orders" })).toBeVisible();
    await expect(page.locator("section[aria-labelledby=delivered-title] img")).toHaveCount(6);
    await expect(page.getByRole("link", { name: "Browse preorders" })).toHaveAttribute("href", "/shop");
    await expect(page.getByRole("link", { name: "Contact us" }).first()).toHaveAttribute("href", "/contact");
  });
});

test.describe("contact", () => {
  test("shows both phone numbers, WhatsApp and TikTok, and hides the email while none is set", async ({
    page,
  }) => {
    await page.goto("/contact");
    await expect(page.getByRole("heading", { level: 1, name: "Contact us" })).toBeVisible();
    await expect(
      page.locator('main a[href="https://wa.me/233598863540?text=Hi%2C%20I%20have%20a%20question."]'),
    ).toBeVisible();
    const ghana = page.locator('main a[href="tel:+233598863540"]');
    await expect(ghana).toContainText("+233 59 886 3540");
    await expect(ghana).toContainText("Ghana");
    const china = page.locator('main a[href="tel:+8619057256153"]');
    await expect(china).toContainText("+86 190 5725 6153");
    await expect(china).toContainText("China");
    await expect(page.locator('main a[href*="tiktok.com"]')).toBeVisible();
    await expect(page.locator('main a[href^="mailto:"]')).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Email" })).toHaveCount(0);
  });

  test("external links open safely in a new tab", async ({ page }) => {
    await page.goto("/contact");
    for (const sel of ['main a[href*="wa.me"]', 'main a[href*="tiktok.com"]']) {
      const a = page.locator(sel).first();
      await expect(a).toHaveAttribute("target", "_blank");
      await expect(a).toHaveAttribute("rel", /noopener/);
    }
  });
});

test.describe("social links", () => {
  test("desktop header links to WhatsApp and TikTok", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      /wa\.me\/233598863540/,
    );
    await expect(header.getByRole("link", { name: "TikTok" })).toHaveAttribute("href", /tiktok\.com/);
  });

  test("the mobile menu and the footer link to TikTok and WhatsApp too", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const dialog = page.getByRole("dialog", { name: "Menu" });
    await expect(dialog.getByRole("link", { name: "TikTok" })).toHaveAttribute("href", /tiktok\.com/);
    await expect(dialog.getByRole("link", { name: /chat on whatsapp/i })).toHaveAttribute("href", /wa\.me/);
    await page.keyboard.press("Escape");
    await expect(page.locator("footer").getByRole("link", { name: "TikTok" })).toHaveAttribute(
      "href",
      /tiktok\.com/,
    );
    await expect(page.locator("footer").getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      /wa\.me/,
    );
  });
});

test.describe("brand and PWA assets", () => {
  test("the web manifest is valid and lists 192, 512 and maskable icons", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const m = await res.json();
    expect(m.name).toBe("STORE_NAME");
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    expect(m.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    const sizes = m.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}:${i.purpose}`);
    expect(sizes).toEqual(expect.arrayContaining(["192x192:any", "512x512:any", "512x512:maskable"]));
  });

  test("each icon is a real PNG of the stated size", async ({ request }) => {
    const m = await (await request.get("/manifest.webmanifest")).json();
    for (const icon of m.icons as { src: string; sizes: string }[]) {
      const res = await request.get(icon.src);
      expect(res.status(), icon.src).toBe(200);
      expect(res.headers()["content-type"]).toContain("image/png");
      const buf = await res.body();
      // PNG signature, then width and height in the IHDR chunk
      expect(buf.subarray(1, 4).toString()).toBe("PNG");
      const [w, h] = icon.sizes.split("x").map(Number);
      expect(buf.readUInt32BE(16)).toBe(w);
      expect(buf.readUInt32BE(20)).toBe(h);
    }
  });

  test("the page declares the favicon, Apple icon and theme colour", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute("href", /icon/);
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", /apple-icon/);
    await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute("content", /#0b2f35/i);
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", /manifest/);
  });

  test("the logo files are served", async ({ request }) => {
    for (const f of ["/brand/logo.svg", "/brand/mark.svg", "/icon.svg"]) {
      const res = await request.get(f);
      expect(res.status(), f).toBe(200);
      expect(res.headers()["content-type"]).toContain("svg");
    }
  });
});

test.describe("layout and accessibility", () => {
  const pages = [
    "/about",
    "/contact",
    "/policies",
    "/policies/terms",
    "/policies/refunds",
    "/policies/privacy",
  ];

  for (const width of widths) {
    test(`content pages have no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of pages) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        expect(await noOverflow(page), path).toBeLessThanOrEqual(0);
      }
    });
  }

  for (const scheme of ["light", "dark"] as const) {
    for (const path of pages) {
      test(`${path} has no serious axe issues (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        expect(await serious(page)).toEqual([]);
      });
    }
  }
});
