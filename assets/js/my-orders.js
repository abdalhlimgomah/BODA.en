const ordersState = {
  all: [],
  isAdmin: false,
  searchText: "",
  period: "3m",
  statusTab: "all",
  openMenuOrderId: null,
};

function ordersNotify(message, type = "info") {
  if (window.BudaUI?.notify) {
    window.BudaUI.notify(message, { type, target: "#orders-status" });
    return;
  }

  const status = document.getElementById("orders-status");
  if (!status) return;
  status.textContent = message;
  status.classList.remove("hidden", "error", "success", "info");
  status.classList.add("status-note", type === "error" ? "error" : type === "success" ? "success" : "info");
}

function getPeriodCutoff(period) {
  if (period === "all") return null;
  const now = new Date();
  if (period === "3m") now.setMonth(now.getMonth() - 3);
  if (period === "6m") now.setMonth(now.getMonth() - 6);
  if (period === "12m") now.setFullYear(now.getFullYear() - 1);
  return now.getTime();
}

function orderMatchesPeriod(order) {
  const cutoff = getPeriodCutoff(ordersState.period);
  if (!cutoff) return true;
  const stamp = window.BudaOrders.toTimestamp(window.BudaOrders.getOrderTime(order));
  if (!stamp) return true;
  return stamp >= cutoff;
}

function buildSearchableOrderText(order) {
  const orderRef = window.BudaOrders.buildOrderReference(order);
  const orderId = window.BudaOrders.getOrderId(order);
  const names = window.BudaOrders
    .getOrderItems(order)
    .map((item) => item.name)
    .join(" ");
  return `${orderRef} ${orderId} ${names}`.toLowerCase();
}

function filteredOrders() {
  const keyword = String(ordersState.searchText || "").trim().toLowerCase();
  let rows = ordersState.all.filter(orderMatchesPeriod);

  if (ordersState.statusTab !== "all") {
    rows = rows.filter(order => {
      const s = window.BudaOrders.normalizeStatusKey(order.status || order.order_status);
      if (ordersState.statusTab === "pending") return s === "pending";
      if (ordersState.statusTab === "shipped") return s === "shipped";
      if (ordersState.statusTab === "on-way") return s === "in_transit";
      if (ordersState.statusTab === "delivered") return s === "delivered";
      if (ordersState.statusTab === "returns") return s === "returned";
      return false;
    });
  }

  if (keyword) {
    rows = rows.filter((order) => buildSearchableOrderText(order).includes(keyword));
  }
  return rows;
}

function compactOrderReference(reference, maxChars = 12) {
  const clean = String(reference || "").trim();
  if (!clean) return "";
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars)}...`;
}

function normalizeReviewProductId(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  if (normalized === "order_fallback_item") return "";
  if (/^unknown(_\d+)?$/i.test(normalized)) return "";
  return normalized;
}

function resolveReviewProductId(order, primaryItem) {
  const candidates = [
    primaryItem?.product_id,
    primaryItem?.id,
    order?.product_id,
    order?.productId,
    order?.item_id,
    order?.itemId,
  ];

  for (const candidate of candidates) {
    const id = normalizeReviewProductId(candidate);
    if (!id) continue;
    return id;
  }

  if (window.BudaStore?.getAllProducts) {
    const targetName = String(primaryItem?.name || "")
      .trim()
      .toLowerCase();
    if (targetName) {
      const allProducts = Object.values(window.BudaStore.getAllProducts() || {});
      const exactMatch = allProducts.find(
        (product) => String(product?.name || "").trim().toLowerCase() === targetName
      );
      if (exactMatch?.id !== undefined && exactMatch?.id !== null) {
        return String(exactMatch.id);
      }
    }
  }

  return "";
}

function seedSelectedProductForReview(order, primaryItem, productId) {
  const cleanProductId = normalizeReviewProductId(productId);
  if (!cleanProductId) return;

  const storeProduct = window.BudaStore?.getProductById
    ? window.BudaStore.getProductById(cleanProductId)
    : null;

  const fallbackPrice = Number(primaryItem?.price) || Number(order?.total_price || order?.total || order?.amount) || 0;
  const selectedProduct = storeProduct || {
    id: cleanProductId,
    name: primaryItem?.name || "منتج",
    image: primaryItem?.image || window.BudaOrders.fallbackItemImage(),
    price: fallbackPrice,
  };

  try {
    sessionStorage.setItem("selectedProduct", encodeURIComponent(JSON.stringify(selectedProduct)));
  } catch {
    // ignore storage failures
  }
}

function goToOrderReviewPage(orderId, productId) {
  const cleanOrderId = String(orderId || "").trim();
  const cleanProductId = normalizeReviewProductId(productId);
  if (!cleanOrderId || !cleanProductId) {
    ordersNotify("تعذر فتح صفحة تقييم المنتج.", "error");
    return;
  }

  const targetOrder = findOrderById(cleanOrderId);
  const primaryItem = targetOrder ? window.BudaOrders.pickPrimaryOrderItem(targetOrder) : null;
  seedSelectedProductForReview(targetOrder, primaryItem, cleanProductId);

  window.location.href = `product-reviews.html?id=${encodeURIComponent(
    cleanProductId
  )}&order=${encodeURIComponent(cleanOrderId)}`;
}

function renderOrderCard(order) {
  const status = window.BudaOrders.statusMeta(order.status || order.order_status);
  const orderId = window.BudaOrders.getOrderId(order);
  const orderRef = window.BudaOrders.buildOrderReference(order);
  const compactOrderRef = compactOrderReference(orderRef, 10);
  const orderTime = window.BudaOrders.getOrderTime(order);
  const items = window.BudaOrders.getOrderItems(order);
  const primaryItem = window.BudaOrders.pickPrimaryOrderItem(order) || {
    name: "اسم المنتج غير متوفر",
    image: window.BudaOrders.fallbackItemImage(),
    quantity: 1,
    price: Number(order.total_price || order.total || order.amount) || 0,
    brand: "",
  };
  const fallbackTotal = Number(order.total_price || order.total || order.amount) || 0;
  const shipping = Number(order.shipping_cost ?? order.shipping_fee ?? order.shipping ?? 0);
  const displayPrice = fallbackTotal > 0 ? fallbackTotal - shipping : 0;
  const moreCount = Math.max(0, items.length - 1);
  const isMenuOpen = ordersState.openMenuOrderId === orderId;
  const reviewProductId = resolveReviewProductId(order, primaryItem);
  const canReview = status.key === "delivered" && Boolean(reviewProductId);

  return `
    <article class="noon-order-card" data-order-id="${window.BudaOrders.escapeHtml(orderId)}" data-status="${status.key}">
      <div class="noon-order-top">
        <div class="noon-order-menu-wrap">
          <button class="noon-menu-btn" type="button" data-order-menu-toggle="${window.BudaOrders.escapeHtml(orderId)}" aria-label="خيارات الطلب">
            <span class="material-icons-outlined">more_vert</span>
          </button>
          <div class="noon-order-menu ${isMenuOpen ? "is-open" : ""}" role="menu">
            <button type="button" data-order-action="track" data-order-id="${window.BudaOrders.escapeHtml(orderId)}">
              <span class="material-icons-outlined">percent</span>
              تفاصيل التتبع
            </button>
            <button type="button" data-order-action="summary" data-order-id="${window.BudaOrders.escapeHtml(orderId)}">
              <span class="material-icons-outlined">description</span>
              ملخص الطلب
            </button>
            <button type="button" data-order-action="help" data-order-id="${window.BudaOrders.escapeHtml(orderId)}">
              <span class="material-icons-outlined">help_outline</span>
              تحتاج مساعدة
            </button>
            ${
              status.isFinished
                ? ""
                : `
            <button type="button" class="is-danger" data-order-action="cancel" data-order-id="${window.BudaOrders.escapeHtml(orderId)}">
              <span class="material-icons-outlined">cancel</span>
              إلغاء الطلب
            </button>`
            }
          </div>
        </div>

        <p class="noon-order-status-line">
          ${window.BudaOrders.escapeHtml(status.linePrefix)} ${window.BudaOrders.escapeHtml(window.BudaOrders.formatOrderDate(orderTime))}
        </p>

        <span class="noon-order-state-icon is-${status.key}" aria-label="${window.BudaOrders.escapeHtml(status.label)}">
          <span class="material-icons-outlined">${window.BudaOrders.escapeHtml(status.icon)}</span>
        </span>
      </div>

      ${
        canReview
          ? `
      <div class="noon-review-action-wrap">
        <button
          class="noon-review-action-btn"
          type="button"
          data-order-action="rate"
          data-order-id="${window.BudaOrders.escapeHtml(orderId)}"
          data-product-id="${window.BudaOrders.escapeHtml(reviewProductId)}"
        >
        قيّم تجربتك في المنتج  
        </button>
      </div>`
          : ""
      }

      <div class="noon-order-product">
        <div class="noon-order-copy">
          ${primaryItem.brand ? `<small>${window.BudaOrders.escapeHtml(primaryItem.brand)}</small>` : ""}
          <h3 class="noon-order-title">${window.BudaOrders.escapeHtml(primaryItem.name)}</h3>
          <p class="noon-order-price">${window.BudaOrders.formatMoney(displayPrice, order)}</p>
          ${moreCount ? `<p class="noon-order-more">+ ${moreCount} منتج إضافي</p>` : ""}
        </div>
        <div class="noon-order-image">
          ${window.BudaOrders.buildOrderImageTag(primaryItem.image, primaryItem.name)}
        </div>
      </div>

      <div class="noon-order-footer">
        <small class="noon-order-ref" title="معرف الطلب ${window.BudaOrders.escapeHtml(orderRef)}">
          معرف الطلب <span class="noon-order-ref-code">${window.BudaOrders.escapeHtml(compactOrderRef)}</span>
        </small>
      </div>
    </article>
  `;
}

function renderOrdersEmptyState() {
  return `
    <article class="my-order-empty">
      <h3>لا توجد طلبات حتى الآن</h3>
      <p>ابدأ الشراء الآن، وبعد إتمام الطلب ستظهر التفاصيل هنا.</p>
      <a class="btn-primary" href="sections.html">تصفح المنتجات</a>
    </article>
  `;
}

function renderFilterEmptyState() {
  return `
    <article class="my-order-filter-empty">
      <h3>لا توجد نتائج مطابقة</h3>
      <p>غيّر نص البحث أو اختر فترة زمنية مختلفة.</p>
    </article>
  `;
}

function renderOrdersList() {
  const container = document.getElementById("orders-list");
  if (!container) return;

  if (!ordersState.all.length) {
    container.innerHTML = renderOrdersEmptyState();
    return;
  }

  const rows = filteredOrders();
  if (ordersState.openMenuOrderId) {
    const stillExists = rows.some((order) => window.BudaOrders.getOrderId(order) === ordersState.openMenuOrderId);
    if (!stillExists) {
      ordersState.openMenuOrderId = null;
    }
  }

  if (!rows.length) {
    container.innerHTML = renderFilterEmptyState();
    return;
  }

  const activeOrders = rows.filter(
    (order) => !window.BudaOrders.statusMeta(order.status || order.order_status).isFinished
  );
  const finishedOrders = rows.filter(
    (order) => window.BudaOrders.statusMeta(order.status || order.order_status).isFinished
  );

  const groups = [];
  if (activeOrders.length) {
    groups.push(`
      <section class="orders-group">
        <h2 class="orders-group-title">جاري</h2>
        <div class="orders-group-list">
          ${activeOrders.map((order) => renderOrderCard(order)).join("")}
        </div>
      </section>
    `);
  }

  if (finishedOrders.length) {
    groups.push(`
      <section class="orders-group">
        <h2 class="orders-group-title">انتهى</h2>
        <div class="orders-group-list">
          ${finishedOrders.map((order) => renderOrderCard(order)).join("")}
        </div>
      </section>
    `);
  }

  container.innerHTML = groups.join("");
  window.BudaOrders.bindOrderImageFallbacks(container);
  requestAnimationFrame(adjustOpenOrderMenusPosition);
}

function adjustOpenOrderMenusPosition() {
  const menus = document.querySelectorAll(".noon-order-menu.is-open");
  if (!menus.length) return;

  const safePadding = 8;
  menus.forEach((menu) => {
    menu.classList.remove("is-flip-inline-end");
    menu.style.removeProperty("transform");

    let rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth - safePadding) {
      menu.classList.add("is-flip-inline-end");
      rect = menu.getBoundingClientRect();
    }

    if (rect.left < safePadding) {
      const delta = safePadding - rect.left;
      menu.style.transform = `translateX(${delta}px)`;
      rect = menu.getBoundingClientRect();
    }

    if (rect.right > window.innerWidth - safePadding) {
      const delta = rect.right - (window.innerWidth - safePadding);
      menu.style.transform = `translateX(${-delta}px)`;
    }
  });
}

function closeOrderMenu() {
  if (!ordersState.openMenuOrderId) return false;
  ordersState.openMenuOrderId = null;
  return true;
}

function toggleOrderMenu(orderId) {
  if (!orderId) return;
  ordersState.openMenuOrderId = ordersState.openMenuOrderId === orderId ? null : orderId;
  renderOrdersList();
}

function goToOrderPage(page, orderId) {
  const cleanOrderId = String(orderId || "").trim();
  if (!cleanOrderId) {
    ordersNotify("تعذر فتح تفاصيل الطلب.", "error");
    return;
  }
  window.location.href = `${page}?id=${encodeURIComponent(cleanOrderId)}`;
}

function findOrderById(orderId) {
  const targetId = String(orderId || "").trim();
  if (!targetId) return null;
  return ordersState.all.find((order) => window.BudaOrders.getOrderId(order) === targetId) || null;
}

async function cancelOrder(orderId) {
  const targetId = String(orderId || "").trim();
  if (!targetId) {
    ordersNotify("تعذر تحديد الطلب المطلوب إلغاؤه.", "error");
    return;
  }

  const targetOrder = findOrderById(targetId);
  if (!targetOrder) {
    ordersNotify("تعذر العثور على الطلب.", "error");
    return;
  }

  const status = window.BudaOrders.statusMeta(targetOrder.status || targetOrder.order_status);
  if (status.isFinished) {
    ordersNotify("لا يمكن إلغاء طلب منتهي.", "info");
    return;
  }

  const orderRef = window.BudaOrders.buildOrderReference(targetOrder);
  const confirmText = `هل تريد إلغاء الطلب ${orderRef}؟`;
  let confirmed = false;

  if (window.BudaUI?.confirm) {
    confirmed = await window.BudaUI.confirm(confirmText, {
      title: "تأكيد إلغاء الطلب",
      confirmText: "إلغاء الطلب",
      cancelText: "رجوع",
    });
  } else {
    confirmed = window.confirm(confirmText);
  }

  if (!confirmed) return;

  if (!window.supabaseClient || typeof window.supabaseClient.updateOrderStatus !== "function") {
    ordersNotify("خدمة تحديث الطلبات غير متاحة الآن.", "error");
    return;
  }

  try {
    await window.supabaseClient.updateOrderStatus(targetId, "cancelled");

    ordersState.all = ordersState.all.map((order) => {
      const currentId = window.BudaOrders.getOrderId(order);
      if (currentId !== targetId) return order;
      return {
        ...order,
        status: "cancelled",
        order_status: "cancelled",
      };
    });

    closeOrderMenu();
    renderOrdersList();
    ordersNotify("تم إلغاء الطلب بنجاح.", "success");
  } catch (error) {
    console.error("cancel order failed", error);
    ordersNotify("تعذر إلغاء الطلب الآن. حاول مرة أخرى.", "error");
  }
}

function handleOrdersListClick(event) {
  const clearFiltersButton = event.target.closest("[data-clear-order-filters]");
  if (clearFiltersButton) {
    ordersState.searchText = "";
    ordersState.period = "all";

    const searchInput = document.getElementById("orders-search-input");
    const periodSelect = document.getElementById("orders-period-select");
    if (searchInput) searchInput.value = "";
    if (periodSelect) periodSelect.value = "all";

    renderOrdersList();
    return;
  }

  const menuToggle = event.target.closest("[data-order-menu-toggle]");
  if (menuToggle) {
    event.stopPropagation();
    toggleOrderMenu(menuToggle.getAttribute("data-order-menu-toggle"));
    return;
  }

  const actionButton = event.target.closest("[data-order-action]");
  if (!actionButton) return;

  event.stopPropagation();
  const action = actionButton.getAttribute("data-order-action");
  const orderId = actionButton.getAttribute("data-order-id");

  if (action === "track") {
    goToOrderPage("order-tracking.html", orderId);
    return;
  }

  if (action === "summary") {
    goToOrderPage("order-summary.html", orderId);
    return;
  }

  if (action === "rate") {
    const productId = actionButton.getAttribute("data-product-id");
    goToOrderReviewPage(orderId, productId);
    return;
  }

  if (action === "help") {
    const targetOrder = ordersState.all.find((order) => window.BudaOrders.getOrderId(order) === String(orderId || ""));
    const orderRef = targetOrder ? window.BudaOrders.buildOrderReference(targetOrder) : "";
    window.location.href = `contact.html${orderRef ? `?order=${encodeURIComponent(orderRef)}` : ""}`;
    return;
  }

  if (action === "cancel") {
    cancelOrder(orderId);
  }
}

function bindControls() {
  const searchInput = document.getElementById("orders-search-input");
  const periodSelect = document.getElementById("orders-period-select");
  const list = document.getElementById("orders-list");
  const tabsContainer = document.querySelector(".orders-status-tabs");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      ordersState.searchText = searchInput.value || "";
      renderOrdersList();
    });
  }

  if (periodSelect) {
    periodSelect.addEventListener("change", () => {
      ordersState.period = periodSelect.value || "3m";
      renderOrdersList();
    });
  }

  if (tabsContainer) {
    tabsContainer.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-status-tab]");
      if (!tab) return;
      ordersState.statusTab = tab.getAttribute("data-status-tab");
      renderOrdersList();
      updateStatusTabs();
    });
  }

  if (list) {
    list.addEventListener("click", handleOrdersListClick);
  }

  document.addEventListener("click", (event) => {
    if (!ordersState.openMenuOrderId) return;
    if (event.target.closest(".noon-order-menu-wrap")) return;
    if (closeOrderMenu()) renderOrdersList();
  });

  window.addEventListener("resize", () => {
    if (!ordersState.openMenuOrderId) return;
    requestAnimationFrame(adjustOpenOrderMenusPosition);
  });
}

function updateStatusTabs() {
  const tabsContainer = document.querySelector(".orders-status-tabs");
  if (!tabsContainer) return;

  const tabs = tabsContainer.querySelectorAll("[data-status-tab]");
  const totalCount = ordersState.all.length;

  const counts = { all: totalCount };
  ordersState.all.forEach((order) => {
    const s = window.BudaOrders.normalizeStatusKey(order.status || order.order_status);
    if (s === "pending") counts.pending = (counts.pending || 0) + 1;
    if (s === "shipped") counts.shipped = (counts.shipped || 0) + 1;
    if (s === "in_transit") counts["on-way"] = (counts["on-way"] || 0) + 1;
    if (s === "delivered") counts.delivered = (counts.delivered || 0) + 1;
    if (s === "returned") counts.returns = (counts.returns || 0) + 1;
  });

  tabs.forEach((tab) => {
    const tabKey = tab.getAttribute("data-status-tab");
    const label = tab.textContent.trim();
    const count = counts[tabKey] || 0;
    let countSpan = tab.querySelector(".orders-tab-count");
    if (!countSpan) {
      countSpan = document.createElement("span");
      countSpan.className = "orders-tab-count";
      tab.appendChild(countSpan);
    }
    countSpan.textContent = count;

    if (tabKey === ordersState.statusTab) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });
}

async function renderOrders() {
  const container = document.getElementById("orders-list");
  if (!container) return;

  const email = (localStorage.getItem("userEmail") || "").trim().toLowerCase();
  const isAdmin = Boolean(email && email.endsWith("@example.com"));
  ordersState.isAdmin = isAdmin;

  if (!window.supabaseClient || typeof window.supabaseClient.getOrders !== "function") {
    container.innerHTML = '<div class="my-order-filter-empty"><h3>تعذر تحميل الطلبات</h3><p>حاول مرة أخرى لاحقًا.</p></div>';
    return;
  }

  if (!isAdmin && !email) {
    ordersState.all = [];
    renderOrdersList();
    updateStatusTabs();
    return;
  }

  try {
    const rawOrders = await window.supabaseClient.getOrders(isAdmin ? {} : { user_email: email });
    const hydratedOrders = await window.BudaOrders.hydrateOrdersWithOrderItems(rawOrders || []);
    ordersState.all = Array.isArray(hydratedOrders) ? hydratedOrders : [];
    renderOrdersList();
    updateStatusTabs();
  } catch (error) {
    console.error("fetch orders failed", error);
    container.innerHTML = '<div class="my-order-filter-empty"><h3>تعذر تحميل الطلبات</h3><p>حدث خطأ أثناء تحميل بيانات الطلبات.</p></div>';
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bindControls();
  renderOrders();

  document.addEventListener("boda:products-updated", () => {
    if (!ordersState.all.length) return;
    renderOrdersList();
  });
});
