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

function formatInvoiceMoney(value) {
  return `${(Number(value) || 0).toFixed(2)} جنيه`;
}

function computeFinancials(order, items) {
  const CHECKOUT_TAX = 12; // قيمة الضريبة الثابتة من checkout.js

  const rawTotal = Number(order.total_price ?? order.total ?? order.amount ?? order.order_total ?? order.grand_total ?? order.final_total ?? 0) || 0;
  const itemsTotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
  const subtotal = itemsTotal > 0 ? itemsTotal : 0;

  // 1. Try to read shipping & tax directly from order
  let shipping = Number(order.shipping_cost ?? order.shipping_fee ?? order.shipping ?? 0);
  let tax = Number(order.tax ?? order.vat ?? 0);
  let discount = Number(order.discount ?? order.discount_amount ?? order.coupon_discount ?? 0);

  // 2. If they are zero, calculate them from the total
  if (rawTotal > 0 && (shipping === 0 || tax === 0 || discount === 0)) {
    const totalWithoutSubtotal = rawTotal - subtotal;
    const inferredDiscount = (subtotal * 0.3); // 30% discount from checkout
    const remaining = totalWithoutSubtotal + inferredDiscount;
    shipping = Math.max(0, remaining - CHECKOUT_TAX);
    tax = CHECKOUT_TAX;
    discount = inferredDiscount;
  }

  const total = rawTotal > 0 ? rawTotal : (subtotal - discount + shipping + tax);

  return { subtotal, shipping, tax, discount, total };
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
  const invoiceUrl = String(order.invoice_url || "").trim();
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
            <p>الكمية: ${items.reduce((q, i) => q + (Number(i.quantity) || 1), 0) || 1}</p>
          </div>
          <div class="os-v2-product-price">
            ${window.BudaOrders.formatMoney(finances.subtotal)}
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
          <div class="os-v2-totals-row"><span>قيمة المنتجات</span><span>${window.BudaOrders.formatMoney(finances.subtotal)}</span></div>
          <div class="os-v2-totals-row"><span>رسوم الشحن</span><span>${window.BudaOrders.formatMoney(finances.shipping)}</span></div>
          <div class="os-v2-totals-row"><span>الضريبة</span><span>${window.BudaOrders.formatMoney(finances.tax)}</span></div>
          ${hasDiscount ? `<div class="os-v2-totals-row discount"><span>الخصم</span><span>-${window.BudaOrders.formatMoney(finances.discount)}</span></div>` : ''}
          <div class="os-v2-totals-divider"></div>
          <div class="os-v2-totals-row grand-total"><span>الإجمالي</span><span>${window.BudaOrders.formatMoney(finances.total)}</span></div>
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
    const paidPrice = Number(primaryItem.currentPrice || primaryItem.price_after_discount || primaryItem.price || 0);
    const displayPrice = finalPrice;

    const invoiceText = [
      `فاتورة الطلب ${orderRef}`,
      `تاريخ الطلب: ${orderDate}`,
      `─────────────────────────────`,
      `${primaryItem.name} × ${primaryItem.quantity}`,
      `  السعر: ${formatInvoiceMoney(paidPrice)} / ${primaryItem.quantity}  المجموع: ${formatInvoiceMoney(displayPrice)}`,
      `─────────────────────────────`,
      `قيمة المنتجات: ${formatInvoiceMoney(finances.subtotal)}`,
      `رسوم الشحن: ${formatInvoiceMoney(finances.shipping)}`,
      `الضريبة: ${formatInvoiceMoney(finances.tax)}`,
      ...(finances.discount > 0 ? [`الخصم: -${formatInvoiceMoney(finances.discount)}`] : []),
      `─────────────────────────────`,
      `المجموع الكلي: ${formatInvoiceMoney(finances.total)}`,
      `─────────────────────────────`,
      `عنوان التوصيل: ${address}`,
      `طريقة الدفع: ${payment}`,
      ...(invoiceUrl ? [`رابط الفاتورة: ${invoiceUrl}`] : []),
    ].join("\n");

    const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>فاتورة ${orderRef}</title>
  <style>
    body { font-family: Cairo, sans-serif; direction: rtl; text-align: right; padding: 20px; background: #fafbfd; color: #102c43; margin: 0; }
    .container { max-width: 700px; margin: 0 auto; text-align: center; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid #3866df; flex-wrap: wrap; gap: 10px; }
    .header h2 { margin: 0; color: #3866df; }
    #dl-btn { min-height: 36px; border: 0; border-radius: 8px; background: #3866df; color: #fff; font-family: inherit; font-size: 0.85rem; font-weight: 700; cursor: pointer; padding: 0 14px; display: inline-flex; align-items: center; gap: 5px; }
    #dl-btn:hover { background: #2d55c4; }
    pre { width: 100%; min-height: 300px; font-family: 'Courier New', monospace; font-size: 0.82rem; line-height: 1.7; background: #fff; border: 1px solid #dbe4f3; border-radius: 10px; padding: 12px; direction: ltr; white-space: pre-wrap; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>فاتورة الطلب</h2>
      <button id="dl-btn"><span>⬇</span> تحميل الملف النصي</button>
    </div>
    <pre>${invoiceText.replace(/</g, '<').replace(/>/g, '>')}</pre>
  </div>
  <script>
    document.getElementById('dl-btn').addEventListener('click', function() {
      const text = ${JSON.stringify(invoiceText)};
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'invoice-${orderRef || orderId}.txt';
      a.click();
      URL.revokeObjectURL(url);
    });
  <\/script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);

     window.open(blobUrl, "_blank");
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