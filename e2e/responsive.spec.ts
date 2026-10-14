import { expect, test, type Page } from "@playwright/test";

/**
 * Responsive sweep: every screen at 360, 390, 768, 1024 and 1440px.
 * Fails on horizontal scroll, content poking outside the viewport, interactive elements smaller than
 * 44x44, and form fields under 16px (iOS Safari zooms the page when they are focused).
 */
const widths = [360, 390, 768, 1024, 1440];

interface Finding {
  kind: "overflow" | "offscreen" | "tap-target" | "input-font";
  detail: string;
}

/** Runs inside the page. Returns a list of problems found on the current screen. */
function audit(): Finding[] {
  const findings: Finding[] = [];
  const vw = window.innerWidth;
  const describe = (el: Element) =>
    `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}.${String(el.getAttribute("class") ?? "")
      .split(/\s+/)
      .slice(0, 4)
      .join(".")} "${(el.textContent ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 40)}"`;

  const visible = (el: Element) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const isSrOnly = (el: Element) => {
    const r = el.getBoundingClientRect();
    return r.width <= 2 || r.height <= 2;
  };
  const insideHScroller = (el: Element) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if ((ox === "auto" || ox === "scroll") && p.scrollWidth > p.clientWidth) return true;
    }
    return false;
  };

  // 1. page-level horizontal scroll
  const over = document.documentElement.scrollWidth - vw;
  if (over > 0) findings.push({ kind: "overflow", detail: `page is ${over}px wider than the viewport` });

  // 2. anything drawn outside the viewport that is not inside a scroller that is meant to scroll
  for (const el of document.body.querySelectorAll("*")) {
    if (!visible(el) || isSrOnly(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.position === "fixed" && el.getBoundingClientRect().right <= vw + 1) continue;
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && !insideHScroller(el) && !el.closest("[aria-hidden='true']")) {
      // a scroller's own box is fine; only report leaf-ish content
      if (el.children.length === 0 || el.tagName === "IMG") {
        findings.push({
          kind: "offscreen",
          detail: `${describe(el)} spans ${Math.round(r.left)}..${Math.round(r.right)} of ${vw}`,
        });
      }
    }
  }

  // 3. tap targets of at least 44x44
  const interactive = document.querySelectorAll(
    "a[href], button, select, textarea, input:not([type=hidden]), summary, [role=button], [role=radio], [role=tab], [role=combobox], [role=switch]",
  );
  for (const el of interactive) {
    if (!visible(el) || isSrOnly(el)) continue;
    if (el.closest("[aria-hidden='true']") && el.getAttribute("tabindex") === "-1") continue; // duplicate image link
    // a native radio/checkbox is operated through its label
    const target =
      el instanceof HTMLInputElement && (el.type === "radio" || el.type === "checkbox")
        ? (el.closest("label") ?? el)
        : el;
    const r = target.getBoundingClientRect();
    // text links inside a sentence are exempt (WCAG "inline" exception)
    if (el.tagName === "A") {
      const block = el.closest("p, li, dd, span");
      const own = el.textContent ?? "";
      if (
        block &&
        (block.textContent ?? "").trim().length > own.trim().length + 6 &&
        getComputedStyle(el).display === "inline"
      )
        continue;
    }
    // small buttons extend their hit area to 44px with a pseudo-element (h-control-sm)
    const extra = el.className && String(el.className).includes("h-control-sm") ? 4 : 0;
    if (r.width < 43.5 || r.height + extra < 43.5) {
      findings.push({
        kind: "tap-target",
        detail: `${describe(el)} is ${Math.round(r.width)}x${Math.round(r.height)}`,
      });
    }
  }

  // 4. fields at least 16px so iOS does not zoom on focus
  for (const el of document.querySelectorAll(
    "input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select, [role=combobox]",
  )) {
    if (!visible(el) || isSrOnly(el)) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 15.99) findings.push({ kind: "input-font", detail: `${describe(el)} font-size ${fs}px` });
  }
  return findings;
}

const signInAdmin = async (page: Page, who: "owner" | "staff") => {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(`${who}@example.com`);
  await page.getByLabel("Password").fill(who === "owner" ? "owner123" : "staff123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Hello/ })).toBeVisible();
};

const settle = async (page: Page) => {
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await page.waitForLoadState("networkidle");
};

async function sweep(page: Page, routes: { name: string; go: () => Promise<void> }[], width: number) {
  const problems: string[] = [];
  for (const r of routes) {
    await r.go();
    await settle(page);
    const found = await page.evaluate(audit);
    for (const f of found) problems.push(`[${width}px] ${r.name}: ${f.kind}: ${f.detail}`);
  }
  return problems;
}

for (const width of widths) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("storefront screens", async ({ page }) => {
      test.setTimeout(240_000);
      const go = (path: string) => async () => void (await page.goto(path));
      const routes = [
        { name: "home", go: go("/") },
        { name: "shop", go: go("/shop") },
        { name: "shop filtered (empty)", go: go("/shop?q=zzzz") },
        { name: "product (variants)", go: go("/shop/oversized-cotton-hoodie") },
        { name: "product (simple)", go: go("/shop/electric-kettle-2l-glass") },
        { name: "track form", go: go("/track") },
        {
          name: "track result (delayed)",
          go: async () => {
            await page.goto("/track");
            await page.getByLabel("Order number").fill("ORD-V9C6YE");
            await page.getByLabel("Phone number or email").fill("0501234000");
            await page.getByRole("button", { name: "Track order" }).click();
            await expect(page.getByTestId("delayed-banner")).toBeVisible();
          },
        },
        { name: "pay", go: go("/pay") },
        { name: "about", go: go("/about") },
        { name: "contact", go: go("/contact") },
        { name: "policies", go: go("/policies") },
        { name: "terms", go: go("/policies/terms") },
        { name: "offline", go: go("/offline") },
        { name: "404", go: go("/no-such-page") },
      ];
      const problems = await sweep(page, routes, width);

      // cart and checkout need something in the cart
      await page.goto("/shop/electric-kettle-2l-glass");
      await page.getByRole("button", { name: "Preorder" }).click();
      await page.waitForURL("**/cart");
      const cartRoutes = [
        { name: "cart", go: async () => void (await page.goto("/cart")) },
        { name: "checkout", go: async () => void (await page.goto("/checkout")) },
      ];
      problems.push(...(await sweep(page, cartRoutes, width)));

      expect(problems, problems.join("\n")).toEqual([]);
    });

    test("admin screens (owner)", async ({ page }) => {
      test.setTimeout(240_000);
      await signInAdmin(page, "owner");
      const go = (path: string) => async () => void (await page.goto(path));
      const routes = [
        { name: "dashboard", go: go("/admin") },
        { name: "orders", go: go("/admin/orders") },
        { name: "order detail", go: go("/admin/orders/o6") },
        { name: "batches", go: go("/admin/batches") },
        { name: "batch detail", go: go("/admin/batches/b0") },
        { name: "products", go: go("/admin/products") },
        { name: "product new", go: go("/admin/products/new") },
        { name: "categories", go: go("/admin/categories") },
        { name: "staff", go: go("/admin/staff") },
      ];
      const problems = await sweep(page, routes, width);
      expect(problems, problems.join("\n")).toEqual([]);
    });

    test("admin login and staff screens", async ({ page }) => {
      test.setTimeout(180_000);
      await page.goto("/admin/login");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const problems = (await page.evaluate(audit)).map((f) => `[${width}px] login: ${f.kind}: ${f.detail}`);
      await signInAdmin(page, "staff");
      const go = (path: string) => async () => void (await page.goto(path));
      problems.push(
        ...(await sweep(
          page,
          [
            { name: "staff dashboard", go: go("/admin") },
            { name: "staff orders", go: go("/admin/orders") },
            { name: "staff no-access", go: go("/admin/products") },
          ],
          width,
        )),
      );
      expect(problems, problems.join("\n")).toEqual([]);
    });
  });
}
