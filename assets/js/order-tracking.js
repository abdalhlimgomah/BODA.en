const TRACKING_STEPS = ["تم الطلب", "جاري التجهيز", "تم الشحن", "تم التوصيل"];

function trackingNotify(message, type = "info") {
  if (window.BudaUI?.notify) {
    window.BudaUI.notify(message, { type, target: "#order-track-status" });
    return;
  }

  const status = document.getElementById("order-track-status");
  if (!status) return;
  status.textContent = message;
  status.classList.remove("hidden", "error", "success", "info");
  status.classList.add("status-note", type === "error" ? "error" : type === "success" ? "success" : "info");
}

function getTrackingOrderId() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get("id") || "").trim();
}

function renderTrackingEmpty(message) {
  const container = document.getElementById("order-track-content");
  if (!container) return;
  container.innerHTML = `
    <article class="order-empty">
      <h3>تعذر عرض تفاصيل التتبع</h3>
      <p>${window.BudaOrders.escapeHtml(message || "لم يتم العثور على الطلب المطلوب.")}</p>
      <a class="btn-secondary" href="my-orders.html">الرجوع إلى الطلبات</a>
    </article>
  `;
}

function renderTrackingPage(order) {
  const container = document.getElementById("order-track-content");
  if (!container) return;

  const orderId = window.BudaOrders.getOrderId(order);
  const orderRef = window.BudaOrders.buildOrderReference(order);
  const orderDate = window.BudaOrders.formatOrderDate(window.BudaOrders.getOrderTime(order));
  const status = window.BudaOrders.statusMeta(order.status || order.order_status);
  const items = window.BudaOrders.getOrderItems(order);
  const primaryItem = window.BudaOrders.pickPrimaryOrderItem(order) || {
    name: "اسم المنتج غير متوفر",
    image: window.BudaOrders.fallbackItemImage(),
    quantity: 1,
    price: Number(order.total_price || order.total || order.amount) || 0,
  };
  const paidPrice = Number(primaryItem.currentPrice || primaryItem.price_after_discount || primaryItem.discountPrice || primaryItem.discount_price || primaryItem.price || 0);
  const address = window.BudaOrders.resolveOrderAddress(order) || "غير متوفر";
  const displayPrice = (Number(order.total_price || order.total || order.amount) || 0) - (Number(order.shipping_cost ?? order.shipping_fee ?? order.shipping ?? 0));

  container.innerHTML = `
    <div class="ot-v2-container">
      <div class="ot-v2-header">
        <h1>تتبع الطلب</h1>
        <a href="my-orders.html" class="ot-v2-back-link">
          <span class="material-icons-outlined">arrow_forward</span>
          العودة إلى طلباتي
        </a>
      </div>

      <!-- Order Info Card -->
      <div class="ot-v2-card">
        <div class="ot-v2-card-header">
          <span class="material-icons-outlined">receipt_long</span>
          <h2>تفاصيل الشحنة</h2>
        </div>
        <div class="ot-v2-meta-grid">
          <div><label>رقم الطلب</label><p>${window.BudaOrders.escapeHtml(orderRef)}</p></div>
          <div><label>تاريخ الطلب</label><p>${window.BudaOrders.escapeHtml(orderDate)}</p></div>
        </div>
      </div>

      <!-- Status Tracker Card -->
      <div class="ot-v2-card">
        <div class="ot-v2-card-header">
          <span class="material-icons-outlined">local_shipping</span>
          <h2>حالة الطلب</h2>
        </div>
        <div class="ot-v2-tracker">
          ${TRACKING_STEPS.map((step, index) => {
            const stepNumber = index + 1;
            const isPastStep = status.step > stepNumber;
            const isActive = status.step === stepNumber;
            const isComplete = isPastStep || (isActive && status.isFinished);
            const statusClass = isPastStep ? 'is-complete' : (isActive ? 'is-active' : '');
            return `
              <div class="ot-v2-tracker-step ${statusClass}">
                <div class="ot-v2-tracker-icon">
                  <span class="material-icons-outlined">${
                    isComplete ? 'check_circle' : 
                    (stepNumber === 1 ? 'receipt_long' : (stepNumber === 2 ? 'inventory_2' : (stepNumber === 3 ? 'local_shipping' : 'home')))
                  }</span>
                </div>
                <div class="ot-v2-tracker-label">${step}</div>
              </div>
            `;
          }).join('<div class="ot-v2-tracker-line"></div>')}
        </div>
        <p class="ot-v2-status-line">${window.BudaOrders.escapeHtml(status.label)}</p>
      </div>

      <!-- Product Card -->
      <div class="ot-v2-card">
        <div class="ot-v2-card-header">
          <span class="material-icons-outlined">inventory_2</span>
          <h2>المنتج</h2>
        </div>
        <div class="ot-v2-product-row">
          <div class="ot-v2-product-image">${window.BudaOrders.buildOrderImageTag(primaryItem.image, primaryItem.name)}</div>
          <div class="ot-v2-product-details">
            <h4>${window.BudaOrders.escapeHtml(primaryItem.name)}</h4>
            <p>الكمية: ${items.reduce((q, i) => q + (Number(i.quantity) || 1), 0) || 1}</p>
          </div>
          <div class="ot-v2-product-price">${window.BudaOrders.formatMoney(displayPrice, order)}</div>
        </div>
      </div>

      <!-- Actions -->
      <div class="ot-v2-actions">
        <a href="order-summary.html?id=${encodeURIComponent(orderId)}" class="ot-v2-action-btn"><span class="material-icons-outlined">description</span> عرض الفاتورة</a>
        <a href="contact.html?order=${window.BudaOrders.escapeHtml(orderRef)}" class="ot-v2-action-btn secondary"><span class="material-icons-outlined">support_agent</span> طلب مساعدة</a>
      </div>
    </div>
  `;

  window.BudaOrders.bindOrderImageFallbacks(container);
}

async function initOrderTracking() {
  const orderId = getTrackingOrderId();
  if (!orderId) {
    renderTrackingEmpty("رقم الطلب غير موجود في الرابط.");
    return;
  }

  if (!window.supabaseClient || !window.BudaOrders) {
    renderTrackingEmpty("خدمة الطلبات غير متاحة الآن.");
    return;
  }

  try {
    const order = await window.BudaOrders.fetchOrderWithItems(orderId);
    if (!order) {
      renderTrackingEmpty("لم يتم العثور على الطلب المطلوب.");
      return;
    }

    renderTrackingPage(order);
  } catch (error) {
    console.error("order tracking load failed", error);
    trackingNotify("تعذر تحميل بيانات التتبع.", "error");
    renderTrackingEmpty("حدث خطأ أثناء تحميل الطلب.");
  }
}

document.addEventListener("DOMContentLoaded", initOrderTracking);

function loadTrackingStyles() {
  const cssPath = "../assets/css/order-tracking-v2.css";
  if (document.querySelector(`link[href="${cssPath}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = cssPath;
  document.head.appendChild(link);
}

document.addEventListener("DOMContentLoaded", loadTrackingStyles);
