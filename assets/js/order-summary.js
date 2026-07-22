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

function computeFinancials(order, items) {
  const shipping = Number(order.shipping_fee ?? order.shipping ?? 19) || 19;
  const tax = Number(order.tax ?? order.vat ?? 12) || 12;
  const rawTotal = Number(order.total_price ?? order.total ?? order.amount ?? 0) || 0;
  const itemsTotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);

  const subtotal = itemsTotal > 0 ? itemsTotal : Math.max(rawTotal - shipping - tax, 0);
  const beforeDiscount = subtotal + shipping + tax;

  let discount = Number(order.discount ?? order.discount_amount ?? 0) || 0;
  if (!discount && rawTotal > 0 && beforeDiscount > rawTotal) {
    discount = beforeDiscount - rawTotal;
  }

  const total = rawTotal > 0 ? rawTotal : Math.max(beforeDiscount - discount, 0);
  return { subtotal, shipping, tax, discount, total };
}

function renderSummaryPage(order) {
  const container = document.getElementById("order-summary-content");
  if (!container) return;

  const orderId = window.BudaOrders.getOrderId(order);
  const orderRef = window.BudaOrders.buildOrderReference(order);
  const orderDate = window.BudaOrders.formatOrderDate(window.BudaOrders.getOrderTime(order));
  const items = window.BudaOrders.getOrderItems(order);
  const primaryItem = window.BudaOrders.pickPrimaryOrderItem(order) || {
    name: "اسم المنتج غير متوفر",
    image: window.BudaOrders.fallbackItemImage(),
    quantity: 1,
    price: Number(order.total_price || order.total || order.amount) || 0,
  };
  const lineTotal = (Number(primaryItem.price) || 0) * (Number(primaryItem.quantity) || 1);
  const displayPrice = lineTotal > 0 ? lineTotal : Number(order.total_price || order.total || order.amount) || 0;
  const address = window.BudaOrders.resolveOrderAddress(order) || "غير متوفر";
  const payment = window.BudaOrders.resolvePaymentLabel(order);
  const finances = computeFinancials(order, items);
  const invoiceUrl = String(order.invoice_url || "").trim();

  container.innerHTML = `
    <section class="summary-card summary-meta">
      <strong>رقم الطلب/الشحنة ${window.BudaOrders.escapeHtml(orderRef)}</strong>
      <p>تاريخ الطلب: ${window.BudaOrders.escapeHtml(orderDate)}</p>
    </section>

    <section class="summary-card summary-breakdown">
      <h3>تفاصيل الطلب</h3>
      <div class="summary-box">
        <div class="summary-row">
          <span>قيمة المنتجات (${items.length || 1} منتج)</span>
          <strong>${window.BudaOrders.formatMoney(finances.subtotal)}</strong>
        </div>
        <div class="summary-row">
          <span>رسوم الشحن</span>
          <strong>${window.BudaOrders.formatMoney(finances.shipping)}</strong>
        </div>
        <div class="summary-row">
          <span>الضريبة</span>
          <strong>${window.BudaOrders.formatMoney(finances.tax)}</strong>
        </div>
        <div class="summary-row discount">
          <span>الخصم</span>
          <strong>-${window.BudaOrders.formatMoney(finances.discount)}</strong>
        </div>
        <div class="summary-row total">
          <span>المجموع شامل الضريبة</span>
          <strong>${window.BudaOrders.formatMoney(finances.total)}</strong>
        </div>
      </div>
    </section>

    <section class="summary-card summary-address">
      <h3>عنوان التوصيل (Home)</h3>
      <p>${window.BudaOrders.escapeHtml(address)}</p>
    </section>

    <section class="summary-card summary-payment">
      <h3>تفاصيل الدفع</h3>
      <p>${window.BudaOrders.escapeHtml(payment)}</p>
    </section>

    <section class="summary-card summary-product">
      <h3>بيانات المنتج</h3>
      <div class="summary-product-row">
        <div class="summary-product-copy">
          <h4>${window.BudaOrders.escapeHtml(primaryItem.name)}</h4>
          <p class="summary-product-price">${window.BudaOrders.formatMoney(displayPrice)}</p>
        </div>
        <div class="summary-product-image">
          ${window.BudaOrders.buildOrderImageTag(primaryItem.image, primaryItem.name)}
        </div>
      </div>
      <div class="summary-product-footer">
        <span class="summary-express-pill">إكسبريس</span>
        <small class="summary-ref">معرف الطلب ${window.BudaOrders.escapeHtml(orderRef)}</small>
      </div>
    </section>
  `;

  window.BudaOrders.bindOrderImageFallbacks(container);

  const downloadButton = document.getElementById("invoice-download-btn");
  if (!downloadButton) return;

  if (!invoiceUrl) {
    downloadButton.classList.add("is-disabled");
  }

  downloadButton.addEventListener("click", () => {
    const url = String(downloadButton.getAttribute("data-invoice-url") || "").trim();
    if (!url) {
      summaryNotify("الفاتورة غير متوفرة لهذا الطلب.", "info");
      return;
    }
    window.open(url, "_blank", "noopener");
  });
}

async function initOrderSummary() {
  const orderId = getSummaryOrderId();
  if (!orderId) {
    renderSummaryEmpty("رقم الطلب غير موجود في الرابط.");
    return;
  }

  if (!window.supabaseClient || !window.BudaOrders) {
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
    summaryNotify("تعذر تحميل ملخص الطلب.", "error");
    renderSummaryEmpty("حدث خطأ أثناء تحميل الطلب.");
  }
}

document.addEventListener("DOMContentLoaded", initOrderSummary);
