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
  const lineTotal = (Number(primaryItem.price) || 0) * (Number(primaryItem.quantity) || 1);
  const displayPrice = lineTotal > 0 ? lineTotal : Number(order.total_price || order.total || order.amount) || 0;
  const address = window.BudaOrders.resolveOrderAddress(order) || "غير متوفر";

  container.innerHTML = `
    <section class="order-card order-meta">
      <strong>رقم الطلب/الشحنة ${window.BudaOrders.escapeHtml(orderRef)}</strong>
      <p>تاريخ الطلب: ${window.BudaOrders.escapeHtml(orderDate)}</p>
    </section>

    <section class="order-card order-status-card">
      <span class="order-status-icon is-${status.key}">
        <span class="material-icons-outlined">${window.BudaOrders.escapeHtml(status.icon)}</span>
      </span>
      <p class="order-status-line">${window.BudaOrders.escapeHtml(status.linePrefix)} ${window.BudaOrders.escapeHtml(orderDate)}</p>
    </section>

    <section class="order-card order-address-card">
      <h3>عنوان التوصيل (Home)</h3>
      <p>${window.BudaOrders.escapeHtml(address)}</p>
    </section>

    <a class="order-card order-nav-card" href="order-summary.html?id=${encodeURIComponent(orderId)}">
      <div>
        <h3>عرض ملخص الطلب / الفاتورة</h3>
        <p>شوف فاتورة الطلب والدفع وتفاصيل الشحن من هنا</p>
      </div>
      <span class="material-icons-outlined">chevron_left</span>
    </a>

    <section class="order-card order-product-card">
      <h3>بيانات المنتج</h3>
      <div class="order-product-row">
        <div class="order-product-copy">
          <h4>${window.BudaOrders.escapeHtml(primaryItem.name)}</h4>
          <p class="order-product-price">${window.BudaOrders.formatMoney(displayPrice)}</p>
        </div>
        <div class="order-product-image">
          ${window.BudaOrders.buildOrderImageTag(primaryItem.image, primaryItem.name)}
        </div>
      </div>
      <div class="order-product-footer">
        <span class="order-express-pill">إكسبريس</span>
        <small class="order-ref">معرف الطلب ${window.BudaOrders.escapeHtml(orderRef)}</small>
      </div>
    </section>
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
