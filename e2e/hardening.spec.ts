import { expect, test, type Page } from "@playwright/test";

/** Wait until the service worker is active and controlling this page (it claims clients on activate). */
async function swControlling(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }),
      );
    }
  });
}

test.describe("SEO", () => {
  test("robots.txt opens the shop and closes the admin and customer-specific pages", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const txt = await res.text();
    expect(txt).toContain("Allow: /");
    for (const p of ["/admin", "/checkout", "/cart", "/pay", "/track"])
      expect(txt).toContain(`Disallow: ${p}`);
    expect(txt).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
  });

  test("the sitemap lists public pages and every product, and nothing private", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    for (const path of [
      "/shop",
      "/about",
      "/contact",
      "/shop/electric-kettle-2l-glass",
      "/shop/oversized-cotton-hoodie",
    ]) {
      expect(xml).toContain(`${path}</loc>`);
    }
    expect((xml.match(/\/shop\/[a-z0-9-]+<\/loc>/g) ?? []).length).toBe(24);
    for (const hidden of ["/admin", "/cart", "/checkout", "/track", "/pay", "/policies"]) {
      expect(xml).not.toContain(`${hidden}</loc>`);
      expect(xml).not.toContain(`${hidden}/`);
    }
  });

  test("pages carry social preview tags and a real Open Graph image", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
      "content",
      "Deen Imports and Logistics",
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(ogImage).toMatch(/^https?:\/\//); // absolute, thanks to metadataBase
    const res = await request.get(new URL(ogImage!).pathname);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  });

  test("a product page has a canonical URL and its own title", async ({ page }) => {
    await page.goto("/shop/electric-kettle-2l-glass");
    await expect(page).toHaveTitle("Electric kettle, 2L glass | Deen Imports and Logistics");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/shop\/electric-kettle-2l-glass$/,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      "Electric kettle, 2L glass",
    );
  });

  test("the home page describes the store to search engines", async ({ page }) => {
    await page.goto("/");
    const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
    const ld = JSON.parse(raw!);
    expect(ld["@type"]).toBe("Store");
    expect(ld.areaServed).toBe("GH");
    expect(ld.contactPoint.map((c: { telephone: string }) => c.telephone)).toEqual([
      "+233598863540",
      "+8619057256153",
    ]);
    expect(raw).not.toContain("<");
  });

  test("private pages are marked noindex", async ({ page }) => {
    for (const path of ["/cart", "/checkout", "/offline", "/admin/login"]) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]').first(), path).toHaveAttribute("content", /noindex/);
    }
  });
});

test.describe("security headers", () => {
  test("every page sends the basic hardening headers", async ({ request }) => {
    for (const path of ["/", "/shop", "/admin/login"]) {
      const h = (await request.get(path)).headers();
      expect(h["x-content-type-options"], path).toBe("nosniff");
      expect(h["x-frame-options"], path).toBe("DENY");
      expect(h["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
      expect(h["permissions-policy"], path).toContain("camera=(self)");
    }
  });

  test("the admin area is also noindex by header, and the service worker is never cached", async ({
    request,
  }) => {
    expect((await request.get("/admin/login")).headers()["x-robots-tag"]).toContain("noindex");
    const sw = await request.get("/sw.js");
    expect(sw.status()).toBe(200);
    expect(sw.headers()["cache-control"]).toContain("no-cache");
    expect(sw.headers()["content-type"]).toContain("javascript");
  });
});

test.describe("404", () => {
  test("an unknown page returns 404 with a friendly page and the normal navigation", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "We could not find that page" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse preorders" }).first()).toHaveAttribute(
      "href",
      "/shop",
    );
    await expect(page.getByRole("link", { name: "Track an order" }).first()).toBeVisible();
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
  });

  test("an unknown product and an unknown policy share the same friendly page", async ({ page }) => {
    for (const path of ["/shop/not-a-product", "/policies/not-a-policy"]) {
      await page.goto(path);
      await expect(page.getByTestId("not-found"), path).toBeVisible();
    }
  });
});

test.describe("PWA: installable and works offline", () => {
  test("the service worker installs and takes control", async ({ page }) => {
    await page.goto("/");
    await swControlling(page);
    const state = await page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state);
    expect(state).toBe("activated");
    // the page cache is created the first time a page is saved, so only the static cache exists at install
    const caches = await page.evaluate(async () => (await window.caches.keys()).sort());
    expect(caches).toContain("static-v2");
  });

  test("the offline page and icons are saved at install time", async ({ page }) => {
    await page.goto("/");
    await swControlling(page);
    const saved = await page.evaluate(async () => {
      const c = await window.caches.open("static-v2");
      return (await c.keys()).map((r) => new URL(r.url).pathname);
    });
    expect(saved).toEqual(expect.arrayContaining(["/offline", "/icons/icon-192.png", "/icons/icon-512.png"]));
    expect(saved.some((p) => p.startsWith("/_next/static/"))).toBe(true); // the offline page's own scripts and styles
  });

  test("pages already opened still load offline; new ones get the offline page", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await swControlling(page);
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("We buy from the factory");
    // let the worker finish writing the copy
    await page.waitForFunction(async () => {
      const c = await window.caches.open("pages-v2");
      return !!(await c.match("/about"));
    });

    await context.setOffline(true);
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("We buy from the factory");
    await expect(page.getByTestId("offline-notice")).toContainText("No internet connection");

    await page.goto("/contact"); // never opened before
    await expect(page.getByTestId("offline-page")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "You are offline" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();

    await context.setOffline(false);
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page).toHaveURL(/\/contact$/);
  });

  test("the admin area is never served from the cache", async ({ page, context }) => {
    await page.goto("/admin/login");
    await swControlling(page);
    await page.goto("/admin/login");
    await context.setOffline(true);
    await expect(page.goto("/admin/login")).rejects.toThrow();
    await context.setOffline(false);
  });

  test("a customer can still see their last tracked order offline", async ({ page, context }) => {
    await page.goto("/track");
    await swControlling(page);
    await page.goto("/track");
    await page.getByLabel("Order number").fill("ORD-DEMO01");
    await page.getByLabel("Phone number or email").fill("0241234567");
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.getByTestId("tracked-order-number")).toBeVisible();
    await page.waitForFunction(async () => !!(await (await window.caches.open("pages-v2")).match("/track")));
    await page.getByRole("button", { name: "Track a different order" }).click();

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByTestId("offline-notice")).toBeVisible();
    await page.getByRole("button", { name: "Track order" }).click();
    await expect(page.getByText("You are offline.")).toBeVisible();
    await expect(page.getByTestId("status-badge")).toHaveText("Shipped from China");
    await context.setOffline(false);
  });
});

test.describe("PWA: install prompt", () => {
  const fireInstallPrompt = (page: Page) =>
    page.evaluate(() => {
      const e = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: string }>;
      };
      e.prompt = async () => {
        (window as unknown as { __prompted: boolean }).__prompted = true;
      };
      e.userChoice = Promise.resolve({ outcome: "accepted" });
      window.dispatchEvent(e);
    });

  test("Android and desktop Chrome: shows an Install button and uses the browser's prompt", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("install-prompt")).toHaveCount(0);
    await fireInstallPrompt(page);
    const card = page.getByTestId("install-prompt");
    await expect(card).toContainText("on your phone");
    await card.getByRole("button", { name: "Install" }).click();
    await expect(card).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __prompted?: boolean }).__prompted)).toBe(true);
  });

  test("'Not now' hides the card and it stays hidden on later visits", async ({ page }) => {
    await page.goto("/");
    await fireInstallPrompt(page);
    await page.getByTestId("install-prompt").getByRole("button", { name: "Not now" }).click();
    await expect(page.getByTestId("install-prompt")).toHaveCount(0);
    await page.reload();
    await fireInstallPrompt(page);
    await expect(page.getByTestId("install-prompt")).toHaveCount(0);
  });

  test("iPhone Safari: shows an Add to Home Screen hint, because iOS has no install prompt", async ({
    browser,
  }) => {
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await page.goto("/");
    const card = page.getByTestId("install-prompt");
    await expect(card).toContainText("Add to Home Screen");
    await expect(card.getByRole("button", { name: "Install" })).toHaveCount(0);
    await card.getByRole("button", { name: "Got it" }).click();
    await expect(card).toHaveCount(0);
    await ctx.close();
  });

  test("iPhone Chrome cannot install, so it gets no hint", async ({ browser }) => {
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0 Mobile/15E148 Safari/604.1",
      viewport: { width: 390, height: 844 },
    });
    const page = await ctx.newPage();
    await page.goto("/");
    await expect(page.getByTestId("install-prompt")).toHaveCount(0);
    await ctx.close();
  });

  test("an installed app (standalone display mode) never shows the card", async ({ page }) => {
    await page.addInitScript(() => {
      const real = window.matchMedia.bind(window);
      window.matchMedia = (q: string) =>
        q.includes("display-mode: standalone") ? ({ ...real(q), matches: true } as MediaQueryList) : real(q);
    });
    await page.goto("/");
    await fireInstallPrompt(page);
    await expect(page.getByTestId("install-prompt")).toHaveCount(0);
  });
});
