const { test, expect } = require("playwright/test");

const BASE_URL = "http://127.0.0.1:4173/pages/empty-cart.html";
const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 768, height: 1024 },
  { width: 1024, height: 900 },
  { width: 1440, height: 960 },
];

async function seedRealCart(page) {
  return page.evaluate(async () => {
    if (!window.supabaseClient || !window.BudaStore) {
      return { ok: false, reason: "missing-store" };
    }

    const { data, error } = await window.supabaseClient.from("products").select("*").limit(5);
    if (error) {
      return { ok: false, reason: error.message || "products-query-failed" };
    }

    const rows = Array.isArray(data) ? data.filter(Boolean) : [];
    const cartItems = rows.map((row, index) => {
      if (typeof window.addProductToStore === "function") {
        window.addProductToStore(row);
      }

      return {
        id: String(row.id),
        product_id: row.product_id ?? row.id,
        name: row.name || row.product_name || row.title || "",
        price: Number(row.price || row.price_after_discount || row.discountPrice || 0) || 0,
        originalPrice: Number(row.originalPrice || row.old_price || row.price_before_discount || row.price || 0) || 0,
        old_price: Number(row.old_price || row.price_before_discount || row.originalPrice || 0) || 0,
        quantity: index === 0 ? 2 : 1,
        image: row.image || row.image_url || row.thumbnail || (Array.isArray(row.images) ? row.images[0] : ""),
        image_url: row.image_url || row.image || row.thumbnail || (Array.isArray(row.images) ? row.images[0] : ""),
        category: row.category || "",
        description: row.description || "",
        seller: row.store_name || row.shop_name || row.seller || row.brand || "",
        seller_name: row.seller_name || row.seller || "",
        store_name: row.store_name || row.shop_name || "",
        variant: row.variant || "",
        color: row.color || "",
        size: row.size || "",
        source: row.source || "internal",
      };
    });

    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userPhoneVerified", "true");
    window.BudaStore.saveCart(cartItems);

    return {
      ok: true,
      cartCount: cartItems.length,
      totalUnits: cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    };
  });
}

async function collectLayoutState(page) {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".cart-product-card");

  return page.evaluate(() => {
    const isVisible = (element) => {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && !element.classList.contains("hidden");
    };

    const visibleElements = Array.from(document.querySelectorAll("body *")).filter((element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
    });

    const outOfBounds = visibleElements
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          className: element.className,
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        };
      })
      .filter((entry) => entry.left < -1 || entry.right > window.innerWidth + 1)
      .slice(0, 12);

    return {
      innerWidth: window.innerWidth,
      pageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      bodyOverflow: document.body.scrollWidth > window.innerWidth + 1,
      itemCards: document.querySelectorAll(".cart-product-card").length,
      summaryVisible: isVisible(document.getElementById("cart-sidebar")),
      mobileStickyVisible: isVisible(document.getElementById("cart-sticky-mobile")),
      recommendedVisible: isVisible(document.getElementById("recommended-section")),
      outOfBounds,
    };
  });
}

test("cart page renders real items and stays responsive", async ({ page }) => {
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  const seeded = await seedRealCart(page);
  expect(seeded.ok).toBeTruthy();
  expect(seeded.cartCount).toBeGreaterThan(0);

  const layouts = [];
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    const layout = await collectLayoutState(page);
    layouts.push({ viewport, ...layout });
    expect(layout.itemCards).toBe(seeded.cartCount);
    expect(layout.pageOverflow, `page overflow at ${viewport.width}px`).toBeFalsy();
    expect(layout.bodyOverflow, `body overflow at ${viewport.width}px`).toBeFalsy();
    expect(layout.outOfBounds, `out-of-bounds elements at ${viewport.width}px`).toEqual([]);
  }

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".cart-product-card");

  const firstQty = page.locator("[data-qty-value]").first();
  const qtyBefore = Number((await firstQty.textContent()) || "0");

  await page.locator('[data-qty][data-action="increase"]').first().click();
  await page.waitForTimeout(250);
  const qtyAfterIncrease = Number((await firstQty.textContent()) || "0");
  expect(qtyAfterIncrease).toBe(qtyBefore + 1);

  await page.locator('[data-qty][data-action="decrease"]').first().click();
  await page.waitForTimeout(250);
  const qtyAfterDecrease = Number((await firstQty.textContent()) || "0");
  expect(qtyAfterDecrease).toBe(qtyBefore);

  const countBeforeWishlist = await page.locator(".cart-product-card").count();
  await page.locator("[data-save]").first().click();
  await page.waitForTimeout(300);
  const countAfterWishlist = await page.locator(".cart-product-card").count();
  expect(countAfterWishlist).toBe(countBeforeWishlist - 1);

  const countBeforeRemove = await page.locator(".cart-product-card").count();
  await page.locator("[data-remove]").first().click();
  await page.waitForTimeout(300);
  const countAfterRemove = await page.locator(".cart-product-card").count();
  expect(countAfterRemove).toBe(countBeforeRemove - 1);

  await page.click("#checkout-btn");
  await page.waitForURL(/checkout\.html/, { timeout: 5000 });
  expect(page.url()).toContain("checkout.html");

  console.log(
    JSON.stringify(
      {
        seeded,
        layouts,
        interactions: {
          qtyBefore,
          qtyAfterIncrease,
          qtyAfterDecrease,
          countAfterWishlist,
          countAfterRemove,
          finalUrl: page.url(),
        },
      },
      null,
      2
    )
  );
});
