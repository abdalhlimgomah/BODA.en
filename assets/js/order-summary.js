function summaryNotify(message, type = "info") {
  if (window.BudaUI?.notify) {
    window.BudaUI.notify(message, { type, target: "#order-summary-status" });
    return;
  }

  const status = document.getElementById("order-summary-status");
  if (!status) return;
  status.textContent = message;
  status.classList.remove("hidden", "error", "success", "info");
  status.classList.add("status-note", type === "error" ? "error" : type === "success" ? "success" : "info");
}

function getSummaryOrderId() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get("id") || "").trim();
}

function renderSummaryEmpty(message) {
  const container = document.getElementById("order-summary-content");
  if (!container) return;
  container.innerHTML = `
    <article class="summary-empty">
      <h3>تعذر عرض ملخص الطلب</h3>
      <p>${window.BudaOrders.escapeHtml(message || "لم يتم العثور على الطلب المطلوب.")}</p>
      <a class="btn-secondary" href="my-orders.html">الرجوع إلى الطلبات</a>
    </article>
  `;
}

function formatInvoiceMoney(value, context) {
  var code = window.BudaOrders && typeof window.BudaOrders.resolveOrderCountryCode === "function"
    ? window.BudaOrders.resolveOrderCountryCode(context)
    : "EG";
  var num = Number(value) || 0;
  var formatted = new Intl.NumberFormat(code === "SA" ? "ar-SA" : "ar-EG", { maximumFractionDigits: 2 }).format(num);
  return formatted + (code === "SA" ? " ريال" : " جنيه");
}

function computeFinancials(order, items) {
  const COD_FEE_EG = 12; // رسوم الدفع عند الاستلام في مصر
  const COD_FEE_SA = 5;  // رسوم الدفع عند الاستلام في السعودية (ريال)

  function getCodFeeForOrder() {
    var code = String((order && (order.country_code || order.countryCode)) || "").toUpperCase();
    if (!code) {
      try {
        var selected = window.TaagerIntegration?.getSelectedCountry?.();
        code = selected ? String(selected.code || "").toUpperCase() : "";
      } catch (e) {}
    }
    return code === "SA" ? COD_FEE_SA : COD_FEE_EG;
  }

  const rawTotal = Number(order.total_price ?? order.total ?? order.amount ?? order.order_total ?? order.grand_total ?? order.final_total ?? 0) || 0;
  const itemsTotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  const subtotal = itemsTotal > 0 ? itemsTotal : 0;

  // 1. Read values directly from the order (some may be missing)
  let shipping = Math.max(0, Number(order.shipping_cost ?? order.shipping_fee ?? order.shipping ?? 0) || 0);
  let tax = Math.max(0, Number(order.tax ?? order.vat ?? 0) || 0);
  let discount = Math.max(0, Number(order.discount ?? order.discount_amount ?? order.coupon_discount ?? 0) || 0);

  // 2. Fill only the missing pieces so the breakdown matches الإجمالي
  if (rawTotal > 0) {
    if (tax <= 0) tax = getCodFeeForOrder();

    let diff = rawTotal - (subtotal - discount + shipping + tax);

    if (diff > 0.001 && shipping <= 0) {
      shipping = diff; // رسوم الشحن ناقصة من السجل
    } else if (diff < -0.001 && discount <= 0) {
      discount = Math.min(-diff, subtotal); // الخصم ناقص من السجل
    }
  }

  const total = rawTotal > 0 ? rawTotal : (subtotal - discount + shipping + tax);

  return { subtotal, shipping, tax, discount, total };
}

function buildSummaryVariantChip(item) {
  if (!item) return "";
  const parts = [];
  if (item.selected_color) parts.push("اللون: " + item.selected_color);
  if (item.selected_size) parts.push("المقاس: " + item.selected_size);
  if (Array.isArray(item.selected_options)) {
    for (const opt of item.selected_options) {
      if (opt) parts.push(String(opt));
    }
  }
  if (!parts.length && item.variant_label) parts.push(item.variant_label);
  if (!parts.length) return "";
  const dot = item.selected_color_value
    ? `<span class="os-v2-variant-swatch" style="background:${window.BudaOrders.escapeHtml(item.selected_color_value)};"></span>`
    : "";
  return `<div class="os-v2-variant">${dot}${window.BudaOrders.escapeHtml(parts.join(" / "))}</div>`;
}

function renderSummaryPage(order) {
  const container = document.getElementById("order-summary-content");
  if (!container) return;

  const orderId = window.BudaOrders.getOrderId(order);
  const orderRef = window.BudaOrders.buildOrderReference(order);
  const orderDate = window.BudaOrders.formatOrderDate(window.BudaOrders.getOrderTime(order));
  const items = window.BudaOrders.getOrderItems(order);
  const finances = computeFinancials(order, items);
  const primaryItem = window.BudaOrders.pickPrimaryOrderItem(order) || {
    name: "اسم المنتج غير متوفر",
    image: window.BudaOrders.fallbackItemImage(),
    quantity: 1,
    price: Number(order.total_price || order.total || order.amount) || 0,
  };
  const itemSubtotal = (Number(primaryItem.price) || 0) * (Number(primaryItem.quantity) || 1);
  const address = window.BudaOrders.resolveOrderAddress(order) || "غير متوفر";
  const payment = window.BudaOrders.resolvePaymentLabel(order);
  const hasDiscount = finances.discount > 0;
  const finalPrice = finances.total - finances.shipping;

  container.innerHTML = `
    <div class="os-v2-container">
      <div class="os-v2-header">
        <h1>ملخص الطلب</h1>
        <a href="my-orders.html" class="os-v2-back-link">
          <span class="material-icons-outlined">arrow_forward</span>
          العودة إلى طلباتي
        </a>
      </div>

      <!-- Order Meta Card -->
      <div class="os-v2-card">
        <div class="os-v2-card-header">
          <span class="material-icons-outlined">receipt_long</span>
          <h2>تفاصيل الشحنة</h2>
        </div>
        <div class="os-v2-meta-grid">
          <div>
            <label>رقم الطلب</label>
            <p>${window.BudaOrders.escapeHtml(orderRef)}</p>
          </div>
          <div>
            <label>تاريخ الطلب</label>
            <p>${window.BudaOrders.escapeHtml(orderDate)}</p>
          </div>
        </div>
        <div class="os-v2-delivery-strip">
          <div class="os-v2-delivery-strip-text">احصل عليها <b>${window.BudaOrders.escapeHtml(window.BudaOrders.formatDeliveryEta(order))}</b> بحد أقصى</div>
          <div class="os-v2-delivery-strip-badge">
            <span class="os-v2-delivery-strip-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 5H14V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V5Z" fill="#3866df" opacity="0.2"/><path d="M2 5H14M6 2V5M10 2V5M3 8H5M7 8H9M11 8H13M3 11H5M7 11H9M11 11H13" stroke="#3866df" stroke-width="1.2" stroke-linecap="round"/></svg>
            </span>
          </div>
        </div>
      </div>

      <!-- Product Card -->
      <div class="os-v2-card">
        <div class="os-v2-card-header">
          <span class="material-icons-outlined">inventory_2</span>
          <h2>المنتجات</h2>
        </div>
        <div class="os-v2-product-row">
          <div class="os-v2-product-image">
            ${window.BudaOrders.buildOrderImageTag(primaryItem.image, primaryItem.name)}
          </div>
          <div class="os-v2-product-details">
            <h4>${window.BudaOrders.escapeHtml(primaryItem.name)}</h4>
            ${buildSummaryVariantChip(primaryItem)}
            <p>الكمية: ${items.reduce((q, i) => q + (Number(i.quantity) || 1), 0) || 1}</p>
          </div>
          <div class="os-v2-product-price">
            ${window.BudaOrders.formatMoney(finances.subtotal, order)}
          </div>
        </div>
      </div>

      <!-- Financials Card -->
      <div class="os-v2-card">
        <div class="os-v2-card-header">
          <span class="material-icons-outlined">payments</span>
          <h2>ملخص الدفع</h2>
        </div>
        <div class="os-v2-totals">
          <div class="os-v2-totals-row"><span>قيمة المنتجات</span><span>${window.BudaOrders.formatMoney(finances.subtotal, order)}</span></div>
          <div class="os-v2-totals-row"><span>رسوم الشحن</span><span>${window.BudaOrders.formatMoney(finances.shipping, order)}</span></div>
          <div class="os-v2-totals-row"><span>رسوم الدفع عند الاستلام</span><span>${window.BudaOrders.formatMoney(finances.tax, order)}</span></div>
          ${hasDiscount ? `<div class="os-v2-totals-row discount"><span>الخصم</span><span>-${window.BudaOrders.formatMoney(finances.discount, order)}</span></div>` : ''}
          <div class="os-v2-totals-divider"></div>
          <div class="os-v2-totals-row grand-total"><span>الإجمالي</span><span>${window.BudaOrders.formatMoney(finances.total, order)}</span></div>
        </div>
      </div>

      <!-- Address & Payment Card -->
      <div class="os-v2-card">
         <div class="os-v2-meta-grid">
          <div>
            <label>عنوان التوصيل</label>
            <p>${window.BudaOrders.escapeHtml(address)}</p>
          </div>
          <div>
            <label>طريقة الدفع</label>
            <div class="os-v2-payment-method">
              <span class="material-icons-outlined">payments</span>
              <span>${window.BudaOrders.escapeHtml(payment)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="os-v2-actions">
        <button id="summary-download-invoice-btn" class="os-v2-action-btn"><span class="material-icons-outlined">print</span> تحميل الفاتورة</button>
        <a href="contact.html?order=${window.BudaOrders.escapeHtml(orderRef)}" class="os-v2-action-btn secondary"><span class="material-icons-outlined">support_agent</span> طلب مساعدة</a>
      </div>
    </div>
  `;

  window.BudaOrders.bindOrderImageFallbacks(container);

  const downloadButton = document.getElementById("summary-download-invoice-btn");
  if (!downloadButton) return;
downloadButton.addEventListener("click", () => {
    window.location.href = "invoice.html?id=" + encodeURIComponent(orderId);
  });
}

async function initSummary() {
  const orderId = getSummaryOrderId();
  if (!orderId) {
    renderSummaryEmpty("رقم الطلب غير موجود في الرابط.");
    return;
  }

  if (!window.BudaOrders?.fetchOrderWithItems) {
    renderSummaryEmpty("خدمة الطلبات غير متاحة الآن.");
    return;
  }

  try {
    const order = await window.BudaOrders.fetchOrderWithItems(orderId);
    if (!order) {
      renderSummaryEmpty("لم يتم العثور على الطلب المطلوب.");
      return;
    }
    renderSummaryPage(order);
  } catch (error) {
    console.error("order summary load failed", error);
    summaryNotify("تعذر تحميل بيانات ملخص الطلب.", "error");
    renderSummaryEmpty("حدث خطأ أثناء تحميل الطلب.");
  }
}

function loadDynamicStyles() {
  const cssPath = "../assets/css/order-summary-v2.css";
  if (document.querySelector(`link[href="${cssPath}"]`)) {
    return;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = cssPath;
  document.head.appendChild(link);
}

document.addEventListener("DOMContentLoaded", () => {
  loadDynamicStyles();
  initSummary();
});