const CAIRO_TIME_ZONE = "Africa/Cairo";
const CAIRO_PARTS_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: CAIRO_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});
const CHECKOUT_SHIPPING = 19;
function isCartSaudi() {
  try {
    var cc = String(localStorage.getItem("userCountry") || "").toUpperCase();
    if (cc) return cc === "SA";
    var selected = window.TaagerIntegration && typeof window.TaagerIntegration.getSelectedCountry === "function"
      ? window.TaagerIntegration.getSelectedCountry()
      : null;
    return !!(selected && selected.code === "SA");
  } catch (e) {
    return false;
  }
}
function getCartCodFee() {
  return isCartSaudi() ? 5 : 12;
}
const COUPON_STORAGE_KEY = "boda_active_coupon";
const DELIVERY_START_OFFSET_DAYS = 2;
const DELIVERY_END_OFFSET_DAYS = 5;
const ARABIC_DAY_MONTH_FORMATTER = new Intl.DateTimeFormat("ar-EG", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const ARABIC_NUMBER_FORMATTER = new Intl.NumberFormat("ar-EG");

const SUGGESTIONS_POOL_LIMIT = 90;
const SUGGESTIONS_CACHE_TTL_MS = 10000;
const CART_SLIDER_CACHE_TTL_MS = 10 * 60 * 1000;

const EMPTY_SLIDER_COUNT = 48;
const OFFERS_SLIDER_COUNT = 12;
const TOP_SELLING_SLIDER_COUNT = 4;
const RECOMMENDED_SLIDER_COUNT = 4;

function formatMoney(value) {
  return (Number(value) || 0).toFixed(2).replace(/\.00$/, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeProducts(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row) => row && typeof row.id !== "undefined" && row.id !== null)
    .map((row) => row);
}

let suggestionsAutoRefreshTimer = null;
let isCheckoutDetailsOpen = false;
let cartSliderCache = { expiresAt: 0, offers: [], topSelling: [], recommended: [] };

const suggestionsCache = {
  key: "",
  source: "default",
  expiresAt: 0,
  products: [],
};

function invalidateSuggestionsCache() {
  suggestionsCache.expiresAt = 0;
}

function formatEgp(value) {
  return window.BudaStore ? window.BudaStore.formatMoney(value) : (Number(value) || 0).toFixed(2).replace(/\.00$/, "");
}

function parseAmount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstPositive(...values) {
  for (const value of values) {
    const numeric = parseAmount(value);
    if (numeric > 0) return numeric;
  }
  return 0;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function renderProductsInContainer(container, products) {
  const list = normalizeProducts(products);
  if (!container || typeof container.innerHTML === "undefined") return;

  if (!list.length) {
    container.innerHTML = '<div class="noon-muted">لا توجد منتجات متاحة الآن.</div>';
    return;
  }

  const className = "home-sideways-list";

  container.innerHTML = `<div class="${className}">${list
    .map((product) => renderSuggestionCard(product, false))
    .join("")}</div>`;

  attachSuggestionsEvents(container, list);
}

window.renderProductsInContainer = renderProductsInContainer;

function cartNotify(message, type = "info") {
  if (!message) return;
  if (window.BudaUI?.notify) {
    window.BudaUI.notify(message, { type });
    return;
  }
  if (type === "error") {
    console.error(message);
    return;
  }
  console.log(message);
}

function normalizeCouponCode(value) {
  const raw = String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) return "";

  return raw
    .normalize("NFKC")
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .toLowerCase();
}

function getActiveCoupon() {
  try {
    const raw = localStorage.getItem(COUPON_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const code = normalizeCouponCode(parsed?.code);
    const rate = Number(parsed?.rate);
    if (!code || !(rate > 0)) return null;
    return { code, rate, minimum_amount: Number(parsed?.minimum_amount) || 0 };
  } catch {
    return null;
  }
}

function setActiveCoupon(coupon) {
  const code = normalizeCouponCode(coupon?.code);
  const rate = Number(coupon?.rate);
  if (!code || !(rate > 0)) {
    localStorage.removeItem(COUPON_STORAGE_KEY);
    return;
  }
  localStorage.setItem(
    COUPON_STORAGE_KEY,
    JSON.stringify({
      code,
      rate,
      minimum_amount: Number(coupon?.minimum_amount) || 0,
    })
  );
}

function clearActiveCoupon() {
  localStorage.removeItem(COUPON_STORAGE_KEY);
}

function calculateCouponDiscount(subtotal, coupon) {
  const base = Math.max(0, Number(subtotal) || 0);
  var rate = Number(coupon?.rate) || 0;
  if (base <= 0 || rate <= 0) return 0;
  if (rate > 1) rate = rate / 100;
  return Math.max(0, Math.round(base * rate * 100) / 100);
}

function setCouponStatus(message = "", type = "info") {
  const statusEl = document.getElementById("coupon-status");
  if (!statusEl) return;
  const text = String(message || "").trim();
  if (!text) {
    statusEl.classList.add("hidden");
    statusEl.textContent = "";
    statusEl.classList.remove("success", "error", "info");
    return;
  }

  statusEl.textContent = text;
  statusEl.classList.remove("hidden", "success", "error", "info");
  statusEl.classList.add(type);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatArabicDayMonth(date) {
  return ARABIC_DAY_MONTH_FORMATTER.format(date);
}

function getDeliveryWindowText() {
  const now = new Date();
  const start = formatArabicDayMonth(addDays(now, DELIVERY_START_OFFSET_DAYS));
  const end = formatArabicDayMonth(addDays(now, DELIVERY_END_OFFSET_DAYS));
  return `احصل عليها بين ${start} - ${end}`;
}

function getDeliveryCountdownText() {
  return `اطلب الآن، خلال ${DELIVERY_COUNTDOWN_HOURS} ساعات ${DELIVERY_COUNTDOWN_MINUTES} دقيقة`;
}

function getCairoParts(date = new Date()) {
  const parts = CAIRO_PARTS_FORMATTER.formatToParts(date);
  const values = {};
  for (const part of parts) {
    if (part.type === "literal") continue;
    values[part.type] = Number(part.value);
  }
  return {
    year: values.year || 0,
    month: values.month || 1,
    day: values.day || 1,
    hour: values.hour || 0,
    minute: values.minute || 0,
    second: values.second || 0,
  };
}

function getCairoNowUtc() {
  const parts = getCairoParts();
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second));
}

function addDaysUtc(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getCairoEndOfDayUtc(nowUtc) {
  const end = new Date(nowUtc);
  end.setUTCHours(23, 59, 59, 999);
  if (end.getTime() <= nowUtc.getTime()) {
    return addDaysUtc(end, 1);
  }
  return end;
}

function formatArabicNumber(value) {
  return ARABIC_NUMBER_FORMATTER.format(Number(value) || 0);
}

function normalizeProducts(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row) => row && typeof row.id !== "undefined" && row.id !== null)
    .map((row) => row);
}

function getDeliveryWindowText() {
  const nowUtc = getCairoNowUtc();
  const start = formatArabicDayMonth(addDaysUtc(nowUtc, DELIVERY_START_OFFSET_DAYS));
  const end = formatArabicDayMonth(addDaysUtc(nowUtc, DELIVERY_END_OFFSET_DAYS));
  return `\u0627\u062d\u0635\u0644 \u0639\u0644\u064a\u0647\u0627 \u0628\u064a\u0646 ${start} - ${end}`;
}

function getDeliveryCountdownText() {
  const nowUtc = getCairoNowUtc();
  const endUtc = getCairoEndOfDayUtc(nowUtc);
  const diffMs = Math.max(0, endUtc.getTime() - nowUtc.getTime());
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `\u0627\u0637\u0644\u0628 \u0627\u0644\u0622\u0646\u060c \u062e\u0644\u0627\u0644 ${formatArabicNumber(hours)} \u0633\u0627\u0639\u0629 ${formatArabicNumber(minutes)} \u062f\u0642\u064a\u0642\u0629`;
}

function resolveImagePath(path) {
  if (window.BudaStore?.getImagePath) {
    return window.BudaStore.getImagePath(path);
  }
  return String(path || "assets/images/placeholder.jpg");
}

function resolveCartItemView(item = {}) {
  const itemId = String(item.id ?? item.product_id ?? "");
  const linkedProduct = itemId && window.BudaStore?.getProductById
    ? window.BudaStore.getProductById(itemId)
    : null;

  const quantity = Math.max(1, Number(item.quantity) || 1);
  const currentPriceFromCart = parseAmount(item.price);
  const currentPriceCandidate =
    currentPriceFromCart > 0
      ? currentPriceFromCart
      : firstPositive(
          item.currentPrice,
          item.finalPrice,
          linkedProduct?.price,
          linkedProduct?.price_after_discount,
          linkedProduct?.discountPrice
        );

  const resolvedPrice =
    window.BudaStore?.resolveProductPrice?.({
      ...(linkedProduct || {}),
      ...(item || {}),
      price: currentPriceCandidate || item.price,
    }) || null;

  let currentPrice = currentPriceCandidate || firstPositive(resolvedPrice?.currentPrice);
  if (currentPrice <= 0) {
    currentPrice = firstPositive(item.originalPrice, linkedProduct?.originalPrice);
  }

  if (linkedProduct && window.PricingEngine?.tiersLoaded) {
    var rawPrice = Number(linkedProduct.price) || 0;
    if (rawPrice > 0 && currentPrice === rawPrice) {
      currentPrice = window.PricingEngine.calculate(rawPrice);
    }
  }

  let originalPrice = firstPositive(
    item.originalPrice,
    item.old_price,
    item.price_before_discount,
    item.original_price,
    resolvedPrice?.originalPrice,
    linkedProduct?.originalPrice,
    linkedProduct?.old_price,
    linkedProduct?.price_before_discount
  );

  if (originalPrice <= 0) originalPrice = currentPrice;
  if (originalPrice < currentPrice) originalPrice = currentPrice;

  const hasDiscount = currentPrice > 0 && originalPrice > currentPrice;
  const discountPercent = hasDiscount
    ? Math.max(1, Math.round(((originalPrice - currentPrice) / originalPrice) * 100))
    : 0;

  const imageCandidate =
    item.image_url ||
    item.image ||
    item.product_image ||
    item.thumbnail ||
    item.img ||
    item.imageUrl ||
    (Array.isArray(item.images) ? item.images[0] : "") ||
    linkedProduct?.image_url ||
    linkedProduct?.image ||
    linkedProduct?.product_image ||
    linkedProduct?.thumbnail ||
    linkedProduct?.img ||
    linkedProduct?.imageUrl ||
    (Array.isArray(linkedProduct?.images) ? linkedProduct.images[0] : "") ||
    "assets/images/placeholder.jpg";

  const name = String(
    item.name ||
      item.product_name ||
      item.title ||
      linkedProduct?.name ||
      linkedProduct?.product_name ||
      ""
  ).trim();

  const sellerName = String(
    item.store_name ||
      item.shop_name ||
      item.seller_name ||
      item.seller ||
      item.brand ||
      linkedProduct?.store_name ||
      linkedProduct?.shop_name ||
      linkedProduct?.seller_name ||
      linkedProduct?.seller ||
      linkedProduct?.brand ||
      ""
  ).trim();
  const currentPriceSafe = Math.max(0, currentPrice);
  const originalPriceSafe = Math.max(currentPriceSafe, originalPrice);
  const perUnitSavings = Math.max(0, originalPriceSafe - currentPriceSafe);

  const ratingInfo = window.BudaStore?.resolveProductRating
    ? window.BudaStore.resolveProductRating(linkedProduct || item)
    : { rating: 0, reviewCount: 0 };

  const variant = Array.from(
    new Set(
      [
        item.variant_label,
        item.selected_color ? "اللون: " + item.selected_color : "",
        item.selected_size ? "المقاس: " + item.selected_size : "",
        item.variant_name,
        item.variant,
        item.color,
        item.size,
        linkedProduct?.variant_name,
        linkedProduct?.variant,
        linkedProduct?.color,
        linkedProduct?.size,
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  ).join(" / ");

  const source = item.source || "internal";

  return {
    id: itemId,
    name,
    quantity,
    currentPrice: currentPriceSafe,
    originalPrice: originalPriceSafe,
    hasDiscount,
    discountPercent,
    lineTotal: currentPriceSafe * quantity,
    totalSavings: perUnitSavings * quantity,
    imageSrc: resolveImagePath(imageCandidate),
    sellerName,
    rating: Number(ratingInfo.rating) || 0,
    reviewCount: Number(ratingInfo.reviewCount) || 0,
    variant,
    deliveryWindowText: getDeliveryWindowText(),
    deliveryCountdownText: getDeliveryCountdownText(),
    stockStatus: item.stockStatus || linkedProduct?.stockStatus || "",
    freeDelivery: !!(item.freeDelivery || linkedProduct?.freeDelivery),
    bestSeller: !!(item.bestSeller || linkedProduct?.bestSeller),
    source: source,
    taager_product_id: item.taager_product_id || "",
    country_code: item.country_code || "",
  };
}

function renderCartItem(viewItem) {
  var fallbackImage = resolveImagePath(window.BudaStore?.DEFAULT_PRODUCT_IMAGE || "assets/images/placeholder.jpg");
  var ratingHtml = "";
  if (viewItem.rating > 0) {
    ratingHtml = '<div class="cart-product-rating">&#9733; ' + viewItem.rating.toFixed(1) + (viewItem.reviewCount > 0 ? ' <span class="cart-product-rating-count">(' + viewItem.reviewCount + ')</span>' : '') + '</div>';
  }
  var sellerHtml = viewItem.sellerName
    ? '<div class="cart-product-seller"><span class="material-icons-outlined" style="font-size:14px;vertical-align:middle">store</span>' + escapeHtml(viewItem.sellerName) + '</div>'
    : '';
  var variantHtml = "";
  if (viewItem.variant) variantHtml = '<div class="cart-product-variant">' + escapeHtml(viewItem.variant) + '</div>';
  if (viewItem.selected_color || viewItem.selected_size) {
    var chipColor = viewItem.selected_color_value ? '<span class="cart-variant-swatch" style="background:' + escapeHtml(viewItem.selected_color_value) + ';"></span>' : '';
    variantHtml = '<div class="cart-product-variant">' + chipColor + escapeHtml([viewItem.selected_color ? "اللون: " + viewItem.selected_color : "", viewItem.selected_size ? "المقاس: " + viewItem.selected_size : ""].filter(Boolean).join(" / ")) + '</div>';
  }
  var lineTotal = (Number(viewItem.currentPrice) || 0) * (Number(viewItem.quantity) || 0);
  var badges = "";
  if (viewItem.bestSeller) badges += '<span class="cart-product-badge best-seller">الأكثر مبيعاً</span>';
  if (viewItem.stockStatus === "low") badges += '<span class="cart-product-badge stock-low">كمية محدودة</span>';
  if (viewItem.stockStatus === "out") badges += '<span class="cart-product-badge stock-out">غير متوفر</span>';
  if (badges) badges = '<div class="cart-product-badges">' + badges + '</div>';
  var productLink = 'product.html?id=' + encodeURIComponent(viewItem.id);
  return `
    <div class="cart-product-card">
      <a class="cart-product-img-wrap" href="${productLink}">
        <img alt="${escapeHtml(viewItem.name || "منتج")}" src="${viewItem.imageSrc}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImage}'" />
      </a>
      <div class="cart-product-info">
        <a class="cart-product-name" href="${productLink}">${escapeHtml(viewItem.name || "منتج")}</a>
        ${sellerHtml}
        ${ratingHtml}
        ${variantHtml}
        <div class="cart-product-price-row">
          <span class="cart-product-current">${formatEgp(viewItem.currentPrice)}</span>
          ${viewItem.hasDiscount ? '<span class="cart-product-old">' + formatEgp(viewItem.originalPrice) + '</span><span class="cart-product-discount">-' + viewItem.discountPercent + '%</span>' : ''}
        </div>
        <div class="cart-product-delivery">${escapeHtml(viewItem.deliveryWindowText)}</div>
        ${badges}
        <div class="cart-product-line-total">المجموع: <strong>${formatEgp(lineTotal)}</strong></div>
      </div>
      <div class="cart-product-actions">
        <div class="cart-qty-wrap">
          <button class="cart-qty-btn" type="button" data-qty="${escapeHtml(viewItem.id)}" data-action="decrease" aria-label="تقليل">−</button>
          <span class="cart-qty-val" data-qty-value="${escapeHtml(viewItem.id)}">${viewItem.quantity}</span>
          <button class="cart-qty-btn" type="button" data-qty="${escapeHtml(viewItem.id)}" data-action="increase" aria-label="زيادة">+</button>
        </div>
        <div class="cart-action-btns">
          <button class="cart-action-btn wishlist" type="button" data-save="${escapeHtml(viewItem.id)}" aria-label="مفضلة"><span class="material-icons-outlined">favorite_border</span></button>
          <button class="cart-action-btn" type="button" data-remove="${escapeHtml(viewItem.id)}" aria-label="حذف"><span class="material-icons-outlined">delete_outline</span></button>
        </div>
      </div>
    </div>
  `;
}

function findElementByIds(ids) {
  for (var i = 0; i < ids.length; i += 1) {
    var element = document.getElementById(ids[i]);
    if (element) return element;
  }
  return null;
}

function setElementHidden(element, hidden) {
  if (element) element.classList.toggle("hidden", Boolean(hidden));
}

function getCouponSectionElement() {
  var input = document.getElementById("coupon-input");
  return input ? input.closest(".cart-card") : null;
}

function setCartViewState(hasItems) {
  document.body.classList.toggle("cart-has-items", Boolean(hasItems));
  document.body.classList.toggle("cart-empty-view", !hasItems);
}

function setCheckoutDetailsOpen(isOpen) {
  var sticky = findElementByIds(["cart-sticky-mobile", "cart-summary-sticky"]);
  var panel = findElementByIds(["m-details", "summary-details"]);
  var toggleBtn = findElementByIds(["m-toggle", "summary-toggle"]);
  if (!sticky || !panel || !toggleBtn) return;
  isCheckoutDetailsOpen = Boolean(isOpen);
  panel.classList.toggle("open", isCheckoutDetailsOpen);
  toggleBtn.classList.toggle("open", isCheckoutDetailsOpen);
  var icon = toggleBtn.querySelector(".material-icons-outlined");
  if (icon) icon.textContent = isCheckoutDetailsOpen ? "expand_less" : "expand_more";
}

function bindCheckoutDetailsEvents() {
  var toggleBtn = findElementByIds(["m-toggle", "summary-toggle"]);
  if (!toggleBtn) return;
  toggleBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    setCheckoutDetailsOpen(!isCheckoutDetailsOpen);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isCheckoutDetailsOpen) setCheckoutDetailsOpen(false);
  });
  document.addEventListener("click", function (e) {
    if (!isCheckoutDetailsOpen) return;
    var sticky = findElementByIds(["cart-sticky-mobile", "cart-summary-sticky"]);
    if (!sticky || !sticky.contains(e.target)) setCheckoutDetailsOpen(false);
  });
}

var FREE_SHIPPING_THRESHOLD = 200;

function updateShippingProgress(subtotal) {
  var progressEl = document.getElementById("shipping-progress");
  var freeEl = document.getElementById("shipping-free");
  var textEl = document.getElementById("shipping-progress-text");
  var fillEl = document.getElementById("shipping-progress-fill");
  if (!progressEl || !freeEl || !textEl || !fillEl) return;

  if (subtotal >= FREE_SHIPPING_THRESHOLD) {
    progressEl.classList.add("hidden");
    freeEl.classList.remove("hidden");
    return;
  }

  progressEl.classList.remove("hidden");
  freeEl.classList.add("hidden");

  var remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  var pct = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  textEl.innerHTML = "أضف منتجات بقيمة <span>" + formatEgp(remaining) + "</span> للحصول على شحن مجاني";
  fillEl.style.width = pct + "%";
}

function updateSavingsBar(subtotal, couponDiscount) {
  var bar = document.getElementById("savings-bar");
  var text = document.getElementById("savings-bar-text");
  if (!bar || !text) return;

  var totalSavings = couponDiscount;
  if (totalSavings > 0) {
    bar.classList.remove("hidden");
    text.textContent = "لقد وفرت " + formatEgp(totalSavings);
  } else {
    bar.classList.add("hidden");
  }
}

function updateOffersCard() {
  var card = document.getElementById("offers-card");
  var offersSection = document.getElementById("offers-section");
  if (!card) return;
  if (offersSection && !offersSection.classList.contains("hidden")) {
    card.classList.remove("hidden");
  } else {
    card.classList.add("hidden");
  }
}

function showCouponApplied(coupon) {
  var applied = document.getElementById("coupon-applied");
  var text = document.getElementById("coupon-applied-text");
  var input = document.getElementById("coupon-input");
  var applyBtn = document.getElementById("coupon-apply-btn");

  if (coupon && coupon.code) {
    if (applied) applied.classList.remove("hidden");
    if (text) text.textContent = "تم تطبيق الكوبون: " + coupon.code;
    if (input) input.classList.add("hidden");
    if (applyBtn) applyBtn.classList.add("hidden");
  } else {
    if (applied) applied.classList.add("hidden");
    if (input) input.classList.remove("hidden");
    if (applyBtn) applyBtn.classList.remove("hidden");
  }
}

function bindCouponRemoveEvents() {
  var removeBtn = document.getElementById("coupon-remove-btn");
  var removeBtnSide = document.getElementById("coupon-remove-btn-side");

  function removeCoupon() {
    clearActiveCoupon();
    showCouponApplied(null);
    setCouponStatus("");
    var statusSide = document.getElementById("coupon-status-side");
    if (statusSide) statusSide.textContent = "";
    renderCart();
  }

  if (removeBtn) removeBtn.addEventListener("click", removeCoupon);
  if (removeBtnSide) removeBtnSide.addEventListener("click", removeCoupon);
}

function showCartSheet(product, quantity) {
  var overlay = document.getElementById("cart-sheet-overlay");
  var sheet = document.getElementById("cart-sheet");
  var productEl = document.getElementById("cart-sheet-product");
  var countEl = document.getElementById("cart-sheet-count");
  var totalEl = document.getElementById("cart-sheet-total");
  if (!overlay || !sheet) return;

  var cart = window.BudaStore ? window.BudaStore.getCart() : [];
  var totalItems = Array.isArray(cart) ? cart.reduce(function (c, i) { return c + (Number(i.quantity) || 0); }, 0) : 0;
  var grandTotal = 0;
  if (Array.isArray(cart)) {
    cart.forEach(function (item) {
      var price = Number(item.price) || Number(item.currentPrice) || 0;
      grandTotal += price * (Number(item.quantity) || 0);
    });
  }

  if (product && productEl) {
    productEl.innerHTML = '<img class="cart-sheet-product-img" src="' + (product.image || product.image_url || "") + '" alt="" /><div class="cart-sheet-product-info"><p class="cart-sheet-product-name">' + escapeHtml(product.name || product.product_name || "") + '</p><div class="cart-sheet-product-price">' + formatEgp(Number(product.price) || 0) + '</div></div>';
  }

  if (countEl) countEl.textContent = "لديك " + totalItems + " منتجات في السلة";
  if (totalEl) totalEl.innerHTML = "الإجمالي: <strong>" + formatEgp(grandTotal) + "</strong>";

  overlay.classList.add("open");
  sheet.classList.add("open");

  var suggestionsEl = document.getElementById("cart-sheet-suggestions");
  var suggestionsList = document.getElementById("cart-sheet-suggestions-list");
  if (suggestionsEl && suggestionsList && cartSliderCache.recommended && cartSliderCache.recommended.length) {
    suggestionsEl.classList.remove("hidden");
    suggestionsList.innerHTML = cartSliderCache.recommended.slice(0, 6).map(renderSuggestionCard).join("");
    attachSuggestionsEvents(suggestionsList, cartSliderCache.recommended.slice(0, 6));
  }
}

function closeCartSheet() {
  var overlay = document.getElementById("cart-sheet-overlay");
  var sheet = document.getElementById("cart-sheet");
  if (overlay) overlay.classList.remove("open");
  if (sheet) sheet.classList.remove("open");
}

function bindCartSheetEvents() {
  var overlay = document.getElementById("cart-sheet-overlay");
  var continueBtn = document.getElementById("cart-sheet-continue");
  if (overlay) overlay.addEventListener("click", closeCartSheet);
  if (continueBtn) continueBtn.addEventListener("click", closeCartSheet);
}

function bindSideCouponEvents() {
  var input = document.getElementById("coupon-input-side");
  var applyBtn = document.getElementById("coupon-apply-btn-side");
  if (!input || !applyBtn) return;

  var active = getActiveCoupon();
  if (active?.code) input.value = active.code;

  var applyCoupon = async function () {
    var code = normalizeCouponCode(input.value);
    var statusEl = document.getElementById("coupon-status-side");
    if (statusEl) statusEl.textContent = "";

    if (!code) {
      clearActiveCoupon();
      showCouponApplied(null);
      renderCart();
      return;
    }

    if (!window.supabaseClient || typeof window.supabaseClient.validateCoupon !== "function") {
      if (statusEl) { statusEl.textContent = "خدمة الكوبونات غير متاحة الآن."; statusEl.className = "cart-coupon-status error"; }
      return;
    }

    applyBtn.disabled = true;
    applyBtn.textContent = "جارٍ التحقق...";

    try {
      var result = await window.supabaseClient.validateCoupon(code);
      if (result?.valid) {
        var savedCode = normalizeCouponCode(result.code || code);
        setActiveCoupon({ code: savedCode, rate: result.rate || 5, minimum_amount: result.minimum_amount || 0 });
        input.value = savedCode;
        showCouponApplied({ code: savedCode });
        if (statusEl) { statusEl.textContent = "تم تطبيق الكوبون بنجاح."; statusEl.className = "cart-coupon-status success"; }
      } else {
        clearActiveCoupon();
        showCouponApplied(null);
        if (statusEl) { statusEl.textContent = "الكود غير صالح."; statusEl.className = "cart-coupon-status error"; }
      }
      renderCart();
    } catch (error) {
      clearActiveCoupon();
      showCouponApplied(null);
      if (statusEl) { statusEl.textContent = "تعذر التحقق من الكوبون الآن."; statusEl.className = "cart-coupon-status error"; }
      renderCart();
    } finally {
      applyBtn.disabled = false;
      applyBtn.textContent = "تطبيق";
    }
  };

  applyBtn.addEventListener("click", applyCoupon);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); applyCoupon(); }
  });
}

function bindCouponEvents() {
  const input = document.getElementById("coupon-input");
  const applyBtn = document.getElementById("coupon-apply-btn");
  if (!input || !applyBtn) return;

  const active = getActiveCoupon();
  if (active?.code) {
    input.value = active.code;
  }

  const applyCoupon = async () => {
    const code = normalizeCouponCode(input.value);
    setCouponStatus("");

    if (!code) {
      clearActiveCoupon();
      showCouponApplied(null);
      renderCart();
      return;
    }

    if (!window.supabaseClient || typeof window.supabaseClient.validateCoupon !== "function") {
      setCouponStatus("خدمة الكوبونات غير متاحة الآن.", "error");
      return;
    }

    const originalText = applyBtn.textContent;
    applyBtn.disabled = true;
    applyBtn.textContent = "جارٍ التحقق...";

    try {
      const result = await window.supabaseClient.validateCoupon(code);
      if (result?.valid) {
        const savedCode = normalizeCouponCode(result.code || code);
        setActiveCoupon({ code: savedCode, rate: result.rate || 5, minimum_amount: result.minimum_amount || 0 });
        input.value = savedCode;
        showCouponApplied({ code: savedCode });
        setCouponStatus("تم تطبيق الكوبون بنجاح.", "success");
      } else {
        clearActiveCoupon();
        showCouponApplied(null);
        setCouponStatus("الكود غير صالح.", "error");
      }
      renderCart();
    } catch (error) {
      console.error("coupon validation failed", error);
      clearActiveCoupon();
      showCouponApplied(null);
      const errorCode = String(error?.code || "").toLowerCase();
      const errorText = String(error?.message || "").toLowerCase();
      if (
        errorCode === "42501" ||
        errorText.includes("permission denied") ||
        errorText.includes("not allowed")
      ) {
        setCouponStatus("جدول الكوبونات يحتاج صلاحية قراءة من Supabase.", "error");
      } else if (errorText.includes("relation") && errorText.includes("kobon")) {
        setCouponStatus("جدول kobon غير موجود أو غير متاح.", "error");
      } else {
        setCouponStatus("تعذر التحقق من الكوبون الآن.", "error");
      }
      renderCart();
    } finally {
      applyBtn.disabled = false;
      applyBtn.textContent = originalText;
    }
  };

  applyBtn.addEventListener("click", applyCoupon);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyCoupon();
    }
  });
}

function getSearchHistoryTerms() {
  try {
    const parsed = JSON.parse(localStorage.getItem("searchHistory") || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((term) => normalizeText(term))
      .filter(Boolean)
      .slice(0, 4);
  } catch {
    return [];
  }
}

function resolveSuggestionPrice(product) {
  const basePrice =
    Number(product.originalPrice) ||
    Number(product.old_price) ||
    Number(product.price) ||
    0;

  const discountedCandidate =
    Number(product.price_after_discount) ||
    Number(product.discountPrice) ||
    Number(product.discount_price) ||
    0;

  let finalPrice = Number(product.price) || basePrice;
  let originalPrice = basePrice || finalPrice;

  if (discountedCandidate > 0 && discountedCandidate < originalPrice) {
    finalPrice = discountedCandidate;
  }

  // Apply pricing engine
  if (window.PricingEngine && window.PricingEngine.tiersLoaded && finalPrice > 0) {
    finalPrice = window.PricingEngine.calculate(finalPrice);
  }

  if (finalPrice > originalPrice) {
    originalPrice = finalPrice;
  }

  return {
    finalPrice,
    originalPrice,
    hasDiscount: finalPrice < originalPrice,
  };
}

function resolveSuggestionRating(product) {
  if (window.BudaStore?.resolveProductRating) {
    const { rating, reviewCount } = window.BudaStore.resolveProductRating(product);
    return { rating, reviews: reviewCount };
  }

  return { rating: 0, reviews: 0 };
}

function renderSuggestionStars(rating) {
  if (window.BudaStore?.renderProductStars) {
    return window.BudaStore.renderProductStars(rating);
  }

  const count = Math.max(1, Math.round(Number(rating) || 0));
  return Array.from({ length: count }, () => "★").join("");
}

function getProductsClient() {
  if (window.supabaseClient && typeof window.supabaseClient.from === "function") {
    return window.supabaseClient;
  }

  if (window.getSupabaseClient && typeof window.getSupabaseClient === "function") {
    try {
      return window.getSupabaseClient();
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeSuggestionProduct(row) {
  const id =
    row?.id ??
    row?.product_id ??
    row?.productId ??
    row?.uuid ??
    row?.sku;

  if (id === undefined || id === null) return null;

  const price = Number(row.price ?? row.sale_price ?? row.cost ?? 0) || 0;
  const originalPrice =
    Number(row.originalPrice ?? row.old_price ?? row.price_before_discount ?? price) ||
    price;

  const imageValue =
    row.image ||
    (Array.isArray(row.images) ? row.images[0] : row.images) ||
    row.thumbnail ||
    "assets/images/placeholder.jpg";

  const normalized = {
    id: String(id),
    name: String(row.name || row.product_name || row.title || "منتج"),
    category: String(row.category || row.cat || "منتج متنوع"),
    description: String(row.description || row.details || ""),
    image: imageValue,
    price,
    originalPrice,
    discountPrice: row.discountPrice || row.discount_price || row.price_after_discount || null,
    rating: 0,
    reviewCount: 0,
    ratingSource: "ratings",
    rating_source: "ratings",
    hasSupabaseRatings: true,
  };

  if (typeof window.addProductToStore === "function") {
    window.addProductToStore(normalized);
  }

  return normalized;
}

async function annotateSuggestionProductsWithSupabaseRatings(products, client) {
  if (!Array.isArray(products) || !products.length || !client) return products;

  const ids = products
    .map((product) => String(product?.id || "").trim())
    .filter((id) => id !== "");

  if (!ids.length) return products;

  try {
    const ratingMap = {};
    const chunkSize = 100;
    const chunks = [];

    for (let i = 0; i < ids.length; i += chunkSize) {
      chunks.push(ids.slice(i, i + chunkSize));
    }

    const results = await Promise.all(chunks.map(chunk =>
      client.from("ratings").select("item_id,rating").in("item_id", chunk)
    ));

    for (const { data, error } of results) {
      if (error) {
        console.warn("supabase suggestion ratings fetch error", error);
        continue;
      }
      if (Array.isArray(data)) {
        data.forEach((row) => {
          const itemId = String(row.item_id || "");
          const value = Number(row.rating) || 0;
          if (!itemId || value <= 0) return;
          if (!ratingMap[itemId]) ratingMap[itemId] = [];
          ratingMap[itemId].push(value);
        });
      }
    }

    return products.map((product) => {
      const itemId = String(product?.id || "");
      const values = ratingMap[itemId] || [];
      if (!values.length) {
        return {
          ...product,
          rating: 0,
          reviewCount: 0,
          ratingSource: "ratings",
          rating_source: "ratings",
          hasSupabaseRatings: true,
        };
      }

      const sum = values.reduce((total, value) => total + value, 0);
      const average = Number((sum / values.length).toFixed(1));
      return {
        ...product,
        rating: average,
        reviewCount: values.length,
        ratingSource: "ratings",
        rating_source: "ratings",
        hasSupabaseRatings: true,
      };
    });
  } catch (error) {
    console.warn("supabase suggestion ratings annotate error", error);
    return products.map((product) => ({
      ...product,
      rating: 0,
      reviewCount: 0,
      ratingSource: "ratings",
      rating_source: "ratings",
      hasSupabaseRatings: true,
    }));
  }
}

function dedupeProductsById(products) {
  const seen = new Set();
  const list = [];

  products.forEach((product) => {
    if (!product || product.id === undefined || product.id === null) return;
    const key = String(product.id);
    if (seen.has(key)) return;
    seen.add(key);
    list.push(product);
  });

  return list;
}

function buildSuggestionsCacheKey(terms) {
  return terms.join("|");
}

function sanitizeSearchToken(term) {
  return String(term || "")
    .replaceAll(",", " ")
    .replaceAll("%", "")
    .replaceAll("_", "")
    .trim();
}

function rankByHistory(products, terms) {
  if (!terms.length) return products;

  return [...products].sort((a, b) => {
    const textA = normalizeText(`${a.name || ""} ${a.category || ""} ${a.description || ""}`);
    const textB = normalizeText(`${b.name || ""} ${b.category || ""} ${b.description || ""}`);

    const scoreA =
      terms.reduce((score, term) => score + (textA.includes(term) ? 4 : 0), 0) +
      Number(a.rating || 0);
    const scoreB =
      terms.reduce((score, term) => score + (textB.includes(term) ? 4 : 0), 0) +
      Number(b.rating || 0);

    return scoreB - scoreA;
  });
}

async function fetchSuggestionsPoolFromSupabase(terms) {
  const cacheKey = buildSuggestionsCacheKey(terms);
  if (
    suggestionsCache.key === cacheKey &&
    suggestionsCache.expiresAt > Date.now() &&
    suggestionsCache.products.length
  ) {
    return {
      products: suggestionsCache.products,
      source: suggestionsCache.source,
    };
  }

  const client = getProductsClient();
  if (!client) {
    return {
      products: [],
      source: "none",
    };
  }

  try {
    const collectedRows = [];
    let foundHistoryMatches = false;

    for (const rawTerm of terms) {
      const token = sanitizeSearchToken(rawTerm);
      if (!token) continue;

      const { data, error } = await client
        .from("products")
        .select("*")
        .or(`name.ilike.%${token}%,category.ilike.%${token}%`)
        .limit(12);

      if (error || !Array.isArray(data) || !data.length) {
        continue;
      }

      foundHistoryMatches = true;
      collectedRows.push(...data);
      if (collectedRows.length >= SUGGESTIONS_POOL_LIMIT) break;
    }

    if (collectedRows.length < SUGGESTIONS_POOL_LIMIT) {
      let latestResult = await client
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(SUGGESTIONS_POOL_LIMIT);

      if (latestResult.error) {
        latestResult = await client
          .from("products")
          .select("*")
          .limit(SUGGESTIONS_POOL_LIMIT);
      }

      if (Array.isArray(latestResult.data) && latestResult.data.length) {
        collectedRows.push(...latestResult.data);
      }
    }

    const normalizedPool = dedupeProductsById(
      collectedRows.map((row) => normalizeSuggestionProduct(row)).filter(Boolean)
    );
    const ratedPool = await annotateSuggestionProductsWithSupabaseRatings(normalizedPool, client);
    if (typeof window.addProductToStore === "function") {
      ratedPool.forEach((product) => window.addProductToStore(product));
    }

    // Merge Taager products into suggestions pool
    if (window.TaagerIntegration) {
      try {
        var selectedCountry = window.TaagerIntegration.getSelectedCountry();
        var taagerPool = await window.TaagerIntegration.fetchTaagerProducts(
          selectedCountry ? selectedCountry.code : null
        );
        window.TaagerIntegration.mergeTaagerIntoStore(taagerPool);
        taagerPool.forEach(function (tp) {
          if (!normalizedPool.some(function (np) { return String(np.id) === String(tp.id); })) {
            normalizedPool.push(tp);
          }
        });
      } catch (_a) {}
    }

    suggestionsCache.key = cacheKey;
    suggestionsCache.source = foundHistoryMatches ? "history" : "default";
    suggestionsCache.expiresAt = Date.now() + SUGGESTIONS_CACHE_TTL_MS;
    suggestionsCache.products = normalizedPool;

    return {
      products: normalizedPool,
      source: suggestionsCache.source,
    };
  } catch {
    return {
      products: [],
      source: "none",
    };
  }
}

async function resolveSupabaseSuggestions(cart) {
  const terms = getSearchHistoryTerms();
  const cartIds = new Set((cart || []).map((item) => String(item.id)));

  const { products: pool, source } = await fetchSuggestionsPoolFromSupabase(terms);
  const filtered = pool.filter((product) => !cartIds.has(String(product.id)));
  const ranked = rankByHistory(filtered, terms);

  if (!ranked.length) return { products: [], source: "none" };
  return {
    products: ranked.slice(0, SUGGESTIONS_LIMIT),
    source: terms.length && source === "history" ? "history" : "default",
  };
}

function renderSuggestionCard(product) {
  const imageSrc = resolveImagePath(product.image);
  const productId = String(product.id);
  const { finalPrice, originalPrice, hasDiscount } = resolveSuggestionPrice(product);
  const discountPercent =
    hasDiscount && originalPrice > 0
      ? Math.max(1, Math.round(((originalPrice - finalPrice) / originalPrice) * 100))
      : 0;
  const { rating, reviews } = resolveSuggestionRating(product);
  const isWishlisted = window.BudaStore?.isWishlistedProduct
    ? window.BudaStore.isWishlistedProduct(productId)
    : false;
  const fallbackImage = window.BudaStore?.getImagePath
    ? window.BudaStore.getImagePath(window.BudaStore.DEFAULT_PRODUCT_IMAGE || "assets/images/unnamed.png")
    : "../assets/images/unnamed.png";

  const images = window.BudaStore?.getGalleryImages
    ? window.BudaStore.getGalleryImages(product)
    : [imageSrc];

  var galleryImgs = "";
  var dotsHtml = "";
  for (var gi = 0; gi < images.length; gi++) {
    galleryImgs += '<img class="noon-gallery-img' + (gi === 0 ? " active" : "") + '" src="' + images[gi] + '" alt="' + escapeHtml(product.name || "منتج") + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + fallbackImage + '\'" />';
    if (images.length > 1) {
      dotsHtml += '<span' + (gi === 0 ? ' class="active"' : "") + ' data-index="' + gi + '"></span>';
    }
  }

  return `
    <article class="noon-product-card">
      <div class="noon-product-media-wrap">
        <button class="icon-btn noon-wishlist-btn ${isWishlisted ? "is-active" : ""}" data-wishlist="${productId}" aria-label="إضافة إلى المفضلة" aria-pressed="${isWishlisted ? "true" : "false"}">
          <span class="material-icons-outlined" style="font-size:18px;">${isWishlisted ? "favorite" : "favorite_border"}</span>
        </button>
        <button class="noon-product-media" type="button" data-view-product="${productId}" aria-label="عرض المنتج">
          ${galleryImgs}
          <span class="noon-img-dots">${dotsHtml}</span>
        </button>
        <button class="noon-add-square" type="button" data-add-to-cart="${productId}" aria-label="إضافة إلى السلة">+</button>
      </div>
      <div class="noon-product-body">
        <h4 class="noon-title">${escapeHtml(product.name || "منتج")}</h4>
        ${
          reviews > 0
            ? `<div class="noon-rating-pill"><span class="noon-rating-stars">★</span> <span>${rating.toFixed(1)}</span> <span class="noon-rating-count">(${reviews})</span></div>`
            : ""
        }
        <div class="noon-price-line">
          <span class="noon-price">${formatEgp(finalPrice)}</span>
          ${hasDiscount ? `<span class="noon-old-price">${formatEgp(originalPrice)}</span>` : ""}
          ${hasDiscount ? `<span class="noon-discount-pill">${discountPercent}%</span>` : ""}
        </div>
        <div class="noon-card-footer">
          <span class="noon-delivery-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#22c55e" stroke-width="1.5" stroke-linejoin="round"/><path d="M2 17L12 22L22 17" stroke="#22c55e" stroke-width="1.5" stroke-linejoin="round"/><path d="M2 12L12 17L22 12" stroke="#22c55e" stroke-width="1.5" stroke-linejoin="round"/></svg>
            توصيل مجاني
          </span>
          <span class="noon-return-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4V10H7" stroke="#64748b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.51 15C4.15839 16.8404 5.38734 18.4202 7.01166 19.5014C8.63598 20.5826 10.5677 21.1067 12.5282 20.9947C14.4888 20.8828 16.3484 20.1409 17.8392 18.8798C19.33 17.6187 20.3683 15.9094 20.87 14" stroke="#64748b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M23 14V8H17" stroke="#64748b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.49 9C19.8416 7.15956 18.6127 5.57978 16.9883 4.49857C15.364 3.41735 13.4323 2.89326 11.4718 3.00528C9.51124 3.1173 7.65161 3.85911 6.16082 5.12022C4.67003 6.38134 3.63168 8.09057 3.13 10" stroke="#64748b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            اقل سعر في 30 يوم
          </span>
        </div>
        <svg class="noon-express-img" width="83" height="22" viewBox="0 0 83 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.728111 0C1.03856 1.14758 4.4252 13.3232 5.4412 16.2901C6.28786 18.8372 8.99718 21.4682 13.8514 22C14.2747 21.972 69.9671 22 70.8138 22H71.1807C71.35 22 71.5193 22 71.6887 22C77.5871 21.7481 82.272 16.9338 82.272 11.028C82.272 7.9771 81.0302 5.2341 79.0264 3.24682C77.0227 1.23155 74.2287 0 71.1807 0H0.728111Z" fill="#FEEE00"/><path d="M30.9042 10.6452V14.7598H27.8899C27.2157 14.7598 26.5811 14.4802 26.2241 14.2006C25.8275 14.5601 25.3516 14.7598 24.7567 14.7598H23.4082V15.3591C23.4082 16.7173 22.2184 18.4351 19.1644 18.4351C15.6742 18.4351 15 16.2379 15 14.9596C15 14.0408 15.357 12.0434 15.6346 10.6452L17.4987 10.765C17.221 12.1632 16.9037 14.0807 16.9037 14.6799C16.9037 15.4789 17.459 16.6374 19.1644 16.6374C20.6716 16.6374 21.4251 15.7585 21.4251 14.7998V8.12848H23.4082V12.9622H24.0824C24.8757 12.9622 25.2326 12.2431 25.2326 11.3643V8.12848H27.2157V11.3643C27.2157 11.8436 27.176 12.2831 27.057 12.7225C27.2157 12.8423 27.533 13.0021 27.8503 13.0021H28.9608V10.9648C28.9608 9.92614 28.9608 9.28697 28.8021 7.44936L30.5076 7.36947C30.6662 8.40811 30.9042 10.046 30.9042 10.6452Z" fill="#404553"/><path d="M38.4795 14.7598H35.9016V14.9196C35.9016 17.1967 35.148 18.4351 33.4822 18.4351C33.1649 18.4351 32.7683 18.3951 32.3717 18.3552V16.5974C32.6097 16.6374 32.8476 16.6374 32.9666 16.6374C33.6409 16.6374 33.9185 16.0781 33.9185 15.1993V7.36947H35.9016V12.9622H38.4795L38.6382 13.881L38.4795 14.7598Z" fill="#404553"/><path d="M44.9839 13.8411L44.8253 14.7599H38.1622L38.0432 13.8411L38.2019 12.9223H40.5419V7.32957H42.5249V12.9223H44.865L44.9839 13.8411ZM40.5815 15.9583H42.3663V17.8758H40.5419L40.5815 15.9583Z" fill="#404553"/><path d="M57.9533 13.8411L57.7947 14.7599H53.3923C52.718 14.7599 52.0835 14.4803 51.7265 14.2006C51.3299 14.5602 50.854 14.7599 50.259 14.7599H44.5478L44.3892 13.8411L44.5478 12.9223H46.9275V8.08859H48.9106V12.9223H49.2676C50.0609 12.9223 50.5368 12.2831 50.5368 11.4043V8.08859H52.5199V12.1635C52.5199 13.2022 53.0354 13.8411 54.1067 13.8411H57.9533Z" fill="#404553"/></svg>
      </div>
    </article>
  `;
}

function attachSuggestionsEvents(container, products) {
  container.querySelectorAll("[data-view-product]").forEach((button) => {
    button.addEventListener("click", (e) => {
      if (e.target.closest(".noon-img-dots")) return;
      const productId = button.getAttribute("data-view-product");
      if (!productId) return;
      const selected = products.find((item) => String(item?.id) === String(productId));
      if (selected) {
        try {
          sessionStorage.setItem("selectedProduct", encodeURIComponent(JSON.stringify(selected)));
        } catch {
          // Ignore storage failures and continue navigation.
        }
      }
      window.location.href = `product.html?id=${encodeURIComponent(productId)}`;
    });
  });

  container.querySelectorAll("[data-add-to-cart]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.getAttribute("data-add-to-cart");
      if (!productId || !window.BudaStore) return;

      const productFromList = products.find((item) => String(item.id) === String(productId));
      const productFromStore = window.BudaStore.getProductById(productId);
      const targetProduct = productFromList || productFromStore;
      if (!targetProduct) return;

      window.BudaStore.addToCart(targetProduct, 1);
      window.BudaStore.updateCartCount();
      renderCart();
    });
  });

  container.querySelectorAll("[data-wishlist]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.getAttribute("data-wishlist");
      if (!productId || !window.BudaStore) return;
      const state = window.BudaStore.toggleWishlist(productId);
      button.classList.toggle("is-active", state);
      button.setAttribute("aria-pressed", String(state));
      const icon = button.querySelector(".material-icons-outlined");
      if (icon) icon.textContent = state ? "favorite" : "favorite_border";
    });
  });

  container.addEventListener("click", function galleryHandler(e) {
    var dot = e.target.closest(".noon-img-dots span");
    if (!dot) return;
    e.preventDefault();
    e.stopPropagation();
    var dots = dot.parentNode;
    var imgs = dots.parentNode.querySelectorAll(".noon-gallery-img");
    var idx = parseInt(dot.getAttribute("data-index"), 10);
    if (isNaN(idx)) return;
    dots.querySelectorAll("span").forEach(function (s) { s.classList.remove("active"); });
    imgs.forEach(function (img) { img.classList.remove("active"); });
    if (imgs[idx]) imgs[idx].classList.add("active");
    if (dots.children[idx]) dots.children[idx].classList.add("active");
  });
}

/* ========== CART SLIDER: Fetch & Render ========== */

async function fetchSliderProducts(count) {
  var client = getProductsClient();
  if (!client) return [];

  var CACHE_TTL = 10 * 60 * 1000;
  var nowMs = Date.now();
  if (cartSliderCache._loadedAt && nowMs - cartSliderCache._loadedAt < CACHE_TTL) {
    var cachedAll = [].concat(cartSliderCache.offers || [], cartSliderCache.topSelling || [], cartSliderCache.recommended || [])
      .filter(Boolean);
    var uniqueCached = [];
    var seenSet = new Set();
    cachedAll.forEach(function (p) { if (p && p.id && !seenSet.has(p.id)) { seenSet.add(p.id); uniqueCached.push(p); } });
    if (uniqueCached.length) return uniqueCached;
  }

  try {
    var data = [];
    if (typeof window.supabaseClient?.fetchAllProducts === "function") {
      data = await window.supabaseClient.fetchAllProducts();
      data = data.slice().sort(function (a, b) {
        return new Date(b?.created_at || 0) - new Date(a?.created_at || 0);
      }).slice(0, count * 2);
    } else {
      var raw = await client
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(count * 2);
      if (raw.error || !Array.isArray(raw.data) || !raw.data.length) return [];
      data = raw.data;
    }
    if (!Array.isArray(data) || !data.length) return [];
    var normalized = data.map(normalizeSuggestionProduct).filter(Boolean);
    var rated = await annotateSuggestionProductsWithSupabaseRatings(normalized, client);
    cartSliderCache._loadedAt = Date.now();
    if (typeof window.addProductToStore === "function") {
      rated.forEach(function (p) { window.addProductToStore(p); });
    }
    // Merge Taager
    if (window.TaagerIntegration) {
      try {
        var selCountry = window.TaagerIntegration.getSelectedCountry();
        var taager = await window.TaagerIntegration.fetchTaagerProducts(selCountry ? selCountry.code : null);
        window.TaagerIntegration.mergeTaagerIntoStore(taager);
        taager.forEach(function (tp) {
          if (!rated.some(function (r) { return String(r.id) === String(tp.id); })) {
            rated.push(tp);
          }
        });
      } catch (_a) {}
    }
    return rated;
  } catch (_b) { return []; }
}

function pickProducts(products, count, sortFn) {
  var sorted = sortFn ? products.slice().sort(sortFn) : products;
  return sorted.slice(0, count);
}

function renderSingleSlider(containerId, products) {
  var container = document.getElementById(containerId);
  if (!container) return;
  if (!products.length) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = '<div class="home-sideways-list">' + products.map(renderSuggestionCard).join("") + '</div>';
  attachSuggestionsEvents(container, products);
}

function refreshSliderCache(force) {
  var now = Date.now();
  if (!force && cartSliderCache.expiresAt > now) return;
  cartSliderCache.expiresAt = now + CART_SLIDER_CACHE_TTL_MS;
  fetchSliderProducts(EMPTY_SLIDER_COUNT).then(function (all) {
    if (!all.length) return;
    // offers: highest discount
    var withDiscount = all.filter(function (p) { return p.originalPrice > p.price; });
    cartSliderCache.offers = pickProducts(withDiscount, OFFERS_SLIDER_COUNT, function (a, b) {
      var dA = a.originalPrice > 0 ? ((a.originalPrice - a.price) / a.originalPrice) : 0;
      var dB = b.originalPrice > 0 ? ((b.originalPrice - b.price) / b.originalPrice) : 0;
      return dB - dA;
    });
    // top selling: random
    var shuffledAll = all.slice().sort(function () { return Math.random() - 0.5; });
    cartSliderCache.topSelling = shuffledAll.slice(0, TOP_SELLING_SLIDER_COUNT);
    // recommended: random, exclude top selling
    var topIds = new Set(cartSliderCache.topSelling.map(function (p) { return String(p.id); }));
    var remaining = all.filter(function (p) { return !topIds.has(String(p.id)); });
    var shuffled = remaining.slice().sort(function () { return Math.random() - 0.5; });
    cartSliderCache.recommended = shuffled.slice(0, RECOMMENDED_SLIDER_COUNT);
    // Re-render if cart page is visible
    if (window.BudaStore) {
      var cart = window.BudaStore.getCart();
      if (!Array.isArray(cart) || !cart.length) {
        showHideEmptySections(false);
      } else {
        renderOffersSlider();
        renderRecommendedSlider();
      }
    }
  });
}

function renderEmptyCartSlider() {
  var section = document.getElementById("empty-slider-section");
  if (!section) return;
  var now = Date.now();
  if (cartSliderCache.expiresAt <= now) {
    refreshSliderCache(true);
    return;
  }
  var all = [];
  all = all.concat(cartSliderCache.offers, cartSliderCache.topSelling, cartSliderCache.recommended).filter(Boolean);
  var unique = [];
  var seen = new Set();
  all.forEach(function (p) { if (p && p.id && !seen.has(p.id)) { seen.add(p.id); unique.push(p); } });
  var picks = unique.slice(0, EMPTY_SLIDER_COUNT);
  renderSingleSlider("empty-slider-list", picks);
  if (picks.length) section.classList.remove("hidden");
  else section.classList.add("hidden");
}

function renderOffersSlider() {
  renderSingleSlider("offers-list", cartSliderCache.offers);
  var section = document.getElementById("offers-section");
  if (section) {
    if (cartSliderCache.offers.length) section.classList.remove("hidden");
    else section.classList.add("hidden");
  }
}

function renderTopSellingSlider() {
  renderSingleSlider("top-selling-list", cartSliderCache.topSelling);
  var section = document.getElementById("top-selling-section");
  if (section) {
    if (cartSliderCache.topSelling.length) section.classList.remove("hidden");
    else section.classList.add("hidden");
  }
}

function renderRecommendedSlider() {
  var merged = (cartSliderCache.topSelling || []).concat(cartSliderCache.recommended || []).filter(Boolean);
  var unique = [];
  var seen = new Set();
  merged.forEach(function (p) { if (p && p.id && !seen.has(p.id)) { seen.add(p.id); unique.push(p); } });
  var picks = unique.slice(0, 4);
  renderSingleSlider("recommended-list", picks);
  var section = document.getElementById("recommended-section");
  if (section) {
    if (picks.length) section.classList.remove("hidden");
    else section.classList.add("hidden");
  }
}

function startSliderAutoRefresh() {
  if (suggestionsAutoRefreshTimer) clearInterval(suggestionsAutoRefreshTimer);
  suggestionsAutoRefreshTimer = window.setInterval(function () {
    if (!window.BudaStore) return;
    refreshSliderCache(false);
  }, 60000);
}

function showHideEmptySections(show) {
  var el = document.getElementById("empty-slider-section");
  if (el) { if (show) el.classList.remove("hidden"); else el.classList.add("hidden"); }
}

function showHideWithItemsSections(show) {
  ["offers-section", "recommended-section"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) { if (show) el.classList.remove("hidden"); else el.classList.add("hidden"); }
  });
}

function showHideCoupon(show) {
  var wrap = getCouponSectionElement();
  if (wrap) { if (show) wrap.classList.remove("hidden"); else wrap.classList.add("hidden"); }
}

function renderCart() {
  if (!window.BudaStore) return;

  var rawCart = window.BudaStore.getCart();
  var cart = Array.isArray(rawCart) ? rawCart : [];

  var skeleton = document.getElementById("cart-skeleton");
  var emptyState = document.getElementById("cart-empty-state");
  var cartSection = findElementByIds(["cart-content", "cart-items-section"]);
  var cartItems = document.getElementById("cart-items");
  var cartItemsCount = document.getElementById("cart-items-count");
  var couponInput = document.getElementById("coupon-input");
  var stickyEl = findElementByIds(["cart-sticky-mobile", "cart-summary-sticky"]);
  var sidebarEl = document.getElementById("cart-sidebar");

  var showSummary = function (show) {
    setElementHidden(stickyEl, !show);
    setElementHidden(sidebarEl, !show);
  };
  var showSkeleton = function (show) { if (skeleton) skeleton.classList.toggle("hidden", !show); };

  if (!cart.length) {
    setCartViewState(false);
    if (emptyState) emptyState.classList.remove("hidden");
    if (cartSection) cartSection.classList.add("hidden");
    showSummary(false);
    showSkeleton(false);
    setCheckoutDetailsOpen(false);
    showHideEmptySections(false);
    showHideWithItemsSections(false);
    showHideCoupon(false);
    window.BudaStore.updateCartCount();
    return;
  }

  setCartViewState(true);
  if (emptyState) emptyState.classList.add("hidden");
  if (cartSection) cartSection.classList.remove("hidden");
  showSummary(true);
  showSkeleton(false);
  showHideEmptySections(false);
  showHideWithItemsSections(true);
  showHideCoupon(true);

  var activeCoupon = getActiveCoupon();
  if (couponInput) couponInput.value = activeCoupon?.code || "";
  showCouponApplied(activeCoupon);

  var viewItems = cart.map(function (item) { return resolveCartItemView(item); }).filter(Boolean);

  if (cartItems) {
    cartItems.innerHTML = viewItems.map(function (item) { return renderCartItem(item); }).join("");
  }

  var totalUnits = viewItems.reduce(function (c, i) { return c + (Number(i.quantity) || 0); }, 0);
  var subtotal = viewItems.reduce(function (t, i) { return t + (Number(i.lineTotal) || 0); }, 0);
  var minAmount = Number(activeCoupon?.minimum_amount) || 0;
  var couponDiscount;
  if (minAmount > 0 && subtotal < minAmount) {
    couponDiscount = 0;
    setCouponStatus("الكوبون يتطلب طلب بقيمة " + formatEgp(minAmount) + " على الأقل.", "error");
  } else {
    if (activeCoupon) setCouponStatus("");
    couponDiscount = calculateCouponDiscount(subtotal, activeCoupon);
  }
  var totalItemSavings = viewItems.reduce(function (t, i) { return t + (Number(i.totalSavings) || 0); }, 0);
  var grandTotal = Math.max(subtotal + getCartCodFee() - couponDiscount, 0);
  var fmt = formatEgp;

  if (cartItemsCount) cartItemsCount.textContent = totalUnits + " " + (totalUnits === 1 ? "منتج" : "منتجات");

  updateShippingProgress(subtotal);
  updateSavingsBar(subtotal, couponDiscount);
  updateOffersCard();

  var mGrand = findElementByIds(["m-grand-total", "sticky-grand-total"]);
  var mSavings = findElementByIds(["m-savings", "sticky-savings"]);
  var mItemsCount = findElementByIds(["m-count", "m-items-count"]);
  var mSubtotal = document.getElementById("m-subtotal");
  var mDiscountRow = document.getElementById("m-discount-row");
  var mSavingsVal = findElementByIds(["m-savings-val", "m-savings"]);
  var mShipping = document.getElementById("m-shipping");
  var mTax = document.getElementById("m-tax");
  var mGrandTotal = findElementByIds(["m-grand-total-val", "m-grand-total"]);
  if (mGrand) mGrand.innerHTML = fmt(grandTotal);
  if (mItemsCount) mItemsCount.textContent = totalUnits;
  if (mSubtotal) mSubtotal.innerHTML = fmt(subtotal);
  if (mDiscountRow) mDiscountRow.classList.toggle("hidden", couponDiscount <= 0);
  if (mSavingsVal) mSavingsVal.innerHTML = "- " + fmt(couponDiscount);
  if (mShipping) mShipping.innerHTML = "__";
  if (mTax) mTax.innerHTML = fmt(getCartCodFee());
  if (mGrandTotal) mGrandTotal.innerHTML = fmt(grandTotal);
  if (mSavings) {
    if (totalItemSavings + couponDiscount > 0) { mSavings.innerHTML = "وفرت " + fmt(totalItemSavings + couponDiscount); mSavings.classList.remove("hidden"); }
    else { mSavings.classList.add("hidden"); }
  }

  var dItemsLabel = findElementByIds(["s-items-label", "d-items-label"]);
  var dSubtotal = findElementByIds(["s-subtotal", "d-subtotal"]);
  var dSavings = findElementByIds(["s-savings", "d-savings"]);
  var dDiscountRow = findElementByIds(["s-discount-row", "d-discount-row"]);
  var dShipping = findElementByIds(["s-shipping", "d-shipping"]);
  var dTax = findElementByIds(["s-tax", "d-tax"]);
  var dGrandTotal = findElementByIds(["s-grand-total", "d-grand-total"]);
  var dSummary = findElementByIds(["cart-sidebar", "cart-summary-desktop"]);
  if (dItemsLabel) dItemsLabel.textContent = "المنتجات (" + totalUnits + ")";
  if (dSubtotal) dSubtotal.innerHTML = fmt(subtotal);
  if (dDiscountRow) dDiscountRow.classList.toggle("hidden", couponDiscount <= 0);
  if (dSavings) dSavings.innerHTML = "- " + fmt(couponDiscount);
  if (dShipping) dShipping.innerHTML = "__";
  if (dTax) dTax.innerHTML = fmt(getCartCodFee());
  if (dGrandTotal) dGrandTotal.innerHTML = fmt(grandTotal);
  if (dSummary) dSummary.classList.remove("hidden");

  if (cartItems) {
    cartItems.querySelectorAll("[data-remove]").forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.getAttribute("data-remove");
        window.BudaStore.removeFromCart(id);
        renderCart();
      });
    });

    cartItems.querySelectorAll("[data-save]").forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.getAttribute("data-save");
        if (!id) return;
        var inWish = typeof window.BudaStore.isInWishlist === "function" && window.BudaStore.isInWishlist(id);
        if (inWish) { window.BudaStore.removeFromCart(id); cartNotify("نقل للمفضلة.", "success"); renderCart(); return; }
        if (typeof window.BudaStore.toggleWishlist === "function") {
          if (window.BudaStore.toggleWishlist(id)) { window.BudaStore.removeFromCart(id); cartNotify("نقل للمفضلة.", "success"); renderCart(); return; }
        }
        cartNotify("تعذر النقل.", "error");
      });
    });

    cartItems.querySelectorAll("[data-qty]").forEach(function (button) {
      button.addEventListener("click", function () {
        var id = button.getAttribute("data-qty");
        var action = button.getAttribute("data-action");
        if (!id || !action) return;
        var liveCart = window.BudaStore.getCart();
        var current = liveCart.find(function (e) { return String(e.id) === String(id); });
        if (!current) return;
        var next = action === "increase" ? (Number(current.quantity) || 1) + 1 : (Number(current.quantity) || 1) - 1;
        if (next < 1) return;
        window.BudaStore.updateQuantity(id, next);
        var qtySpan = button.parentNode.querySelector("[data-qty-value]");
        if (qtySpan) { qtySpan.classList.remove("bump"); void qtySpan.offsetWidth; qtySpan.classList.add("bump"); }
        renderCart();
      });
    });
  }

  renderOffersSlider();
  renderRecommendedSlider();
  window.BudaStore.updateCartCount();
}

function showCartSkeleton() {
  var skeleton = document.getElementById("cart-skeleton");
  var emptyState = document.getElementById("cart-empty-state");
  var cartSection = findElementByIds(["cart-content", "cart-items-section"]);
  var stickyEl = findElementByIds(["cart-sticky-mobile", "cart-summary-sticky"]);
  var sidebarEl = document.getElementById("cart-sidebar");
  setCartViewState(false);
  if (skeleton) skeleton.classList.remove("hidden");
  if (emptyState) emptyState.classList.add("hidden");
  if (cartSection) cartSection.classList.add("hidden");
  if (stickyEl) stickyEl.classList.add("hidden");
  if (sidebarEl) sidebarEl.classList.add("hidden");
}

function bindCartPageActions() {
  ["checkout-btn", "checkout-btn-mobile"].forEach(function (id) {
    var button = document.getElementById(id);
    if (!button) return;
    button.addEventListener("click", function (e) {
      if (typeof window.handleCheckoutClick === "function") {
        window.handleCheckoutClick(e);
        return;
      }
      e.preventDefault();
      window.location.href = "checkout.html";
    });
  });

  var offersLink = document.getElementById("offers-link");
  if (offersLink) {
    offersLink.addEventListener("click", function () {
      var offersSection = document.getElementById("offers-section");
      if (offersSection && !offersSection.classList.contains("hidden")) {
        offersSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  bindCheckoutDetailsEvents();
  bindCartPageActions();
  bindCouponEvents();
  bindSideCouponEvents();
  bindCouponRemoveEvents();
  bindCartSheetEvents();
  refreshSliderCache(true);
  showCartSkeleton();
  setTimeout(function () {
    renderCart();
    startSliderAutoRefresh();
  }, 300);

  var startShopping = document.getElementById("start-shopping");
  if (startShopping) {
    startShopping.addEventListener("click", function () {
      window.location.href = "home.html";
    });
  }
});

// Re-render cart when loaded from Supabase
document.addEventListener("boda:cart-loaded", function () {
  renderCart();
  refreshSliderCache(true);
});
