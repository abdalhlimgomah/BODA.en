import { chromium } from "playwright";

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

async function collectLayoutState(page, width) {
  await page.setViewportSize({ width, height: VIEWPORTS.find((item) => item.width === width)?.height || 900 });
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".cart-product-card");

  return page.evaluate(() => {
    const visible = (element) => {
      if (!element) return false;
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") return false;
      return !element.classList.contains("hidden");
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
          left: rect.left,
          right: rect.right,
        };
      })
      .filter((entry) => entry.left < -1 || entry.right > window.innerWidth + 1)
      .slice(0, 8);

    const textOverflows = visibleElements
      .filter((element) => element.scrollWidth > element.clientWidth + 1 && element.clientWidth > 0)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        className: element.className,
        text: (element.textContent || "").trim().slice(0, 80),
      }))
      .slice(0, 8);

    return {
      innerWidth: window.innerWidth,
      pageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      bodyOverflow: document.body.scrollWidth > window.innerWidth + 1,
      itemCards: document.querySelectorAll(".cart-product-card").length,
      summaryVisible: visible(document.getElementById("cart-sidebar")),
      mobileStickyVisible: visible(document.getElementById("cart-sticky-mobile")),
      recommendedVisible: visible(document.getElementById("recommended-section")),
      checkoutButtons: {
        desktop: !!document.getElementById("checkout-btn"),
        mobile: !!document.getElementById("checkout-btn-mobile"),
      },
      outOfBounds,
      textOverflows,
    };
  });
}

async function verifyInteractions(page) {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".cart-product-card");

  const before = await page.locator(".cart-product-card").count();
  const firstQty = page.locator("[data-qty-value]").first();
  const qtyBefore = Number((await firstQty.textContent()) || "0");

  await page.locator('[data-qty][data-action="increase"]').first().click();
  await page.waitForTimeout(300);
  const qtyAfterIncrease = Number((await firstQty.textContent()) || "0");

  await page.locator('[data-qty][data-action="decrease"]').first().click();
  await page.waitForTimeout(300);
  const qtyAfterDecrease = Number((await firstQty.textContent()) || "0");

  await page.locator("[data-save]").first().click();
  await page.waitForTimeout(300);
  const afterWishlistMove = await page.locator(".cart-product-card").count();

  await page.locator("[data-remove]").first().click();
  await page.waitForTimeout(300);
  const afterRemove = await page.locator(".cart-product-card").count();

  await page.click("#checkout-btn");
  await page.waitForURL(/checkout\.html/, { timeout: 5000 });

  return {
    before,
    qtyBefore,
    qtyAfterIncrease,
    qtyAfterDecrease,
    afterWishlistMove,
    afterRemove,
    checkoutUrl: page.url(),
  };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  const seeded = await seedRealCart(page);
  if (!seeded.ok) {
    console.log(JSON.stringify({ ok: false, stage: "seed", seeded }, null, 2));
    process.exit(1);
  }

  const layouts = [];
  for (const viewport of VIEWPORTS) {
    layouts.push({
      viewport,
      ...(await collectLayoutState(page, viewport.width)),
    });
  }

  const interactions = await verifyInteractions(page);

  console.log(
    JSON.stringify(
      {
        ok: true,
        seeded,
        layouts,
        interactions,
      },
      null,
      2
    )
  );
} finally {
  await browser.close();
}
