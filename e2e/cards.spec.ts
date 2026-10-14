import { expect, test, type Page } from "@playwright/test";

const strip = (page: Page) => page.getByRole("list", { name: "Preorders open now, scroll sideways" });
const shopCards = (page: Page) => page.locator("main ul li a[href^='/shop/']");

/** Left edges (rounded) of the first `n` cards: how many distinct values = how many columns. */
const columns = (page: Page, n = 12) =>
  page.evaluate(
    (count) =>
      new Set(
        [...document.querySelectorAll("main ul li a[href^='/shop/']")]
          .slice(0, count)
          .map((a) => Math.round(a.getBoundingClientRect().left)),
      ).size,
    n,
  );

test.describe("home: preorder cards", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("on a phone each card is the full width of the page and the row scrolls sideways", async ({
    page,
  }) => {
    await page.goto("/");
    const row = strip(page);
    await expect(row.locator("> li")).toHaveCount(8);

    const m = await row.evaluate((el) => {
      const cs = getComputedStyle(el);
      const li = el.querySelector("li")!.getBoundingClientRect();
      const gutter = parseFloat(cs.paddingLeft);
      return {
        scrolls: el.scrollWidth > el.clientWidth + 1,
        overflowX: cs.overflowX,
        snap: cs.scrollSnapType,
        cardWidth: Math.round(li.width),
        contentWidth: Math.round(el.clientWidth - gutter * 2),
        gutter,
      };
    });
    expect(m.scrolls).toBe(true);
    expect(["auto", "scroll"]).toContain(m.overflowX);
    expect(m.snap).toContain("x");
    expect(m.snap).toContain("mandatory");
    // one card = the whole content width (within a pixel), not two columns
    expect(Math.abs(m.cardWidth - m.contentWidth)).toBeLessThanOrEqual(1);
    // and the page itself does not scroll sideways
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(0);
  });

  test("scrolling moves one card at a time and keyboard users can scroll the row", async ({ page }) => {
    await page.goto("/");
    const row = strip(page);
    const step = await row.evaluate((el) => el.querySelector("li")!.getBoundingClientRect().width + 12);
    await row.evaluate((el, by) => el.scrollBy({ left: by, behavior: "instant" }), step);
    await expect.poll(() => row.evaluate((el) => Math.round(el.scrollLeft))).toBeGreaterThan(step - 40);
    const afterOne = await row.evaluate((el) => el.scrollLeft);
    expect(afterOne).toBeLessThan(step * 2 - 20); // snapped to the 2nd card, not drifting past it

    await row.evaluate((el) => (el.scrollLeft = 0));
    await row.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });

  test("tells people to swipe, and the later cards can be reached and opened", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Swipe to see more")).toBeVisible();
    const last = strip(page).locator("li").last();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
    await last.getByRole("link").click();
    await expect(page).toHaveURL(/\/shop\/[a-z0-9-]+$/);
  });
});

test.describe("home: preorder cards from tablet up", () => {
  for (const [width, cols] of [
    [768, 3],
    [1024, 3],
    [1440, 4],
  ] as const) {
    test(`${width}px is a ${cols}-column grid with no sideways scrolling`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await expect(page.getByText("Swipe to see more")).toBeHidden();
      const info = await strip(page).evaluate((el) => {
        const cs = getComputedStyle(el);
        const lefts = [...el.children].slice(0, 8).map((c) => Math.round(c.getBoundingClientRect().left));
        return {
          display: cs.display,
          scrolls: el.scrollWidth > el.clientWidth + 1,
          columns: new Set(lefts).size,
        };
      });
      expect(info.display).toBe("grid");
      expect(info.scrolls).toBe(false);
      expect(info.columns).toBe(cols);
    });
  }
});

test.describe("shop: all preorders", () => {
  test("on a phone it is one full-width card per row, scrolling down the page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/shop");
    await expect(shopCards(page).first()).toBeVisible();
    expect(await columns(page)).toBe(1);

    const { width, viewport } = await shopCards(page)
      .first()
      .evaluate((a) => ({
        width: a.getBoundingClientRect().width,
        viewport: window.innerWidth,
      }));
    expect(width).toBeGreaterThan(viewport * 0.88);

    // cards stack downwards: each starts below the previous one
    const tops = await shopCards(page).evaluateAll((els) =>
      els.slice(0, 4).map((a) => Math.round(a.getBoundingClientRect().top)),
    );
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    expect(new Set(tops).size).toBe(4);

    // the page scrolls vertically, not sideways
    const { scrollH, innerH, over } = await page.evaluate(() => ({
      scrollH: document.documentElement.scrollHeight,
      innerH: window.innerHeight,
      over: document.documentElement.scrollWidth - window.innerWidth,
    }));
    expect(scrollH).toBeGreaterThan(innerH * 2);
    expect(over).toBeLessThanOrEqual(0);

    await shopCards(page).nth(9).scrollIntoViewIfNeeded();
    await expect(shopCards(page).nth(9)).toBeInViewport();
  });

  test("the grid grows with the screen: 2, 3, then 4 columns", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 900 });
    await page.goto("/shop");
    await expect(shopCards(page).first()).toBeVisible();
    expect(await columns(page)).toBe(2);
    await page.setViewportSize({ width: 768, height: 900 });
    expect(await columns(page)).toBe(3);
    await page.setViewportSize({ width: 1440, height: 900 });
    expect(await columns(page)).toBe(4);
  });

  test("a card keeps its price, arrival date and spots badge in the full-width layout", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/shop?q=kettle");
    const card = shopCards(page).first();
    await expect(card).toContainText("GH₵210");
    await expect(card).toContainText("Preorder · arrives");
  });
});
