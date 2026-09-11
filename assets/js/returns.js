/* ============================================================
 * صفحة المرتجعات (returns.html) - قائمة طلبات العميل + حالة الإرجاع
 * ============================================================ */
(function () {
  var state = {
    orders: [],
    requests: [],
    flags: {},
    email: "",
    isAdmin: false,
  };

  var page = {
    listEl: null,
    statusEl: null,
    statsEl: null,
  };

  function notify(message, type) {
    if (window.BudaUI && typeof window.BudaUI.notify === "function") {
      window.BudaUI.notify(message, { type: type || "info", target: "#returns-status" });
      return;
    }
    if (page.statusEl) {
      page.statusEl.textContent = message;
      page.statusEl.className = "status-note " + (type || "info");
      page.statusEl.classList.remove("hidden");
      setTimeout(function () { page.statusEl.classList.add("hidden"); }, 4000);
    }
  }

  function findExistingRequests(order, orderId, productId) {
    var orderRef = window.BudaOrders.buildOrderReference(order);
    var candidateIds = [
      String(orderId || "").trim().toLowerCase(),
      String(order?.id || "").trim().toLowerCase(),
      String(order?.order_id || "").trim().toLowerCase(),
      String(order?.order_uuid || "").trim().toLowerCase(),
    ];
    var matches = [];
    for (var i = 0; i < state.requests.length; i++) {
      var r = state.requests[i];
      if (!r) continue;
      var rid = String(r.order_id || "").trim().toLowerCase();
      var rref = String(r.order_reference || "").trim();
      if (rid && candidateIds.indexOf(rid) !== -1) {
        var rpid = String(r.product_id || "").trim().toLowerCase();
        if (rpid && rpid === String(productId || "").trim().toLowerCase()) {
          matches.push(r);
          continue;
        }
      }
      if (orderRef && rref === orderRef) {
        var rpid2 = String(r.product_id || "").trim().toLowerCase();
        if (rpid2 && rpid2 === String(productId || "").trim().toLowerCase()) {
          matches.push(r);
        }
      }
    }
    return matches.sort(function (a, b) {
      return String(a.created_at || "").localeCompare(String(b.created_at || ""));
    });
  }

  function latestRequest(matches) {
    return matches.length ? matches[matches.length - 1] : null;
  }

  function hasActiveRequest(matches) {
    return (matches || []).some(function (r) {
      return r.status === "reviewing" || r.status === "accepted";
    });
  }

  function buildItemView(order, orderMeta, item, productId) {
    var windowInfo = window.BudaReturns.getReturnWindowInfo(order);
    var returnAllowed = window.BudaReturns.productReturnAllowed(state.flags, productId, item);
    var isDelivered = orderMeta.key === "delivered";
    var isFinished = orderMeta.isFinished || orderMeta.key === "returned";
    var matches = findExistingRequests(order, orderMeta.orderId, productId);
    var activeExists = hasActiveRequest(matches);
    var latest = latestRequest(matches);

    var eligible = isDelivered && returnAllowed && windowInfo.eligible && !activeExists;
    var stateLabel = "";
    var chipClass = "";
    var chipIcon = "";

    if (activeExists) {
      var meta = window.BudaReturns.RETURN_STATUS_META[latest.status] || window.BudaReturns.RETURN_STATUS_META.reviewing;
      chipClass = meta.chip;
      chipIcon = meta.icon;
      stateLabel = meta.label;
    } else if (isFinished || orderMeta.key === "cancelled" || orderMeta.key === "returned") {
      chipClass = "rs-chip-notallowed";
      chipIcon = "cancel";
      stateLabel = "لا يمكن إرجاع هذا الطلب";
    } else if (!isDelivered) {
      chipClass = "rs-chip-expired";
      chipIcon = "local_shipping";
      stateLabel = "الإرجاع متاح بعد التوصيل";
    } else if (!returnAllowed) {
      chipClass = "rs-chip-notallowed";
      chipIcon = "block";
      stateLabel = "لا يمكن إرجاع هذا المنتج";
    } else if (windowInfo.expired) {
      chipClass = "rs-chip-expired";
      chipIcon = "schedule";
      stateLabel = "انتهت مهلة الإرجاع";
    } else {
      chipClass = "rs-chip-ok";
      chipIcon = "published_with_changes";
      stateLabel = "متاح للإرجاع حتى " + window.BudaReturns.formatDeadline(windowInfo.deadline);
    }

    return {
      order: order,
      orderMeta: orderMeta,
      item: item,
      productId: productId,
      returnAllowed: returnAllowed,
      isDelivered: isDelivered,
      windowInfo: windowInfo,
      eligible: eligible,
      matches: matches,
      latest: latest,
      activeExists: activeExists,
      chipClass: chipClass,
      chipIcon: chipIcon,
      chipLabel: stateLabel,
    };
  }

  function buildVariantChip(item) {
    if (!item) return "";
    var parts = [];
    if (item.selected_color) parts.push("اللون: " + item.selected_color);
    if (item.selected_size) parts.push("المقاس: " + item.selected_size);
    if (Array.isArray(item.selected_options)) {
      for (var i = 0; i < item.selected_options.length; i++) {
        if (item.selected_options[i]) parts.push(String(item.selected_options[i]));
      }
    }
    if (!parts.length && item.variant_label) parts.push(item.variant_label);
    if (!parts.length) return "";
    return '<p class="rs-item-variant">' + window.BudaReturns.escapeHtml(parts.join(" / ")) + "</p>";
  }

  function renderRequestImages(request) {
    var images = [];
    try {
      images = JSON.parse(Array.isArray(request.images) ? JSON.stringify(request.images) : request.images || "[]");
    } catch (e) {
      images = Array.isArray(request.images) ? request.images : [];
    }
    if (!Array.isArray(images) || !images.length) return "";
    return (
      '<div class="rs-request-imgs">' +
      images
        .map(function (url) {
          return (
            '<img src="' + window.BudaReturns.escapeHtml(url) + '" alt="صورة الإرجاع" loading="lazy" data-rs-action="lightbox" data-rs-src="' + window.BudaReturns.escapeHtml(url) + '" />'
          );
        })
        .join("") +
      "</div>"
    );
  }

  function renderRequestPanel(view) {
    var request = view.latest;
    if (!request) return "";
    var meta = window.BudaReturns.RETURN_STATUS_META[request.status] || window.BudaReturns.RETURN_STATUS_META.reviewing;
    var note = request.admin_note ? '<p class="rs-request-note"><strong>ملاحظة الإدارة:</strong> ' + window.BudaReturns.escapeHtml(request.admin_note) + "</p>" : "";
    var decidedAt = request.decided_at ? "<small>· " + window.BudaReturns.formatShortDate(request.decided_at) + "</small>" : "";
    return (
      '<div class="rs-request">' +
      '<div class="rs-request-head">' +
      '<span class="rs-request-code">' + window.BudaReturns.escapeHtml(request.request_code || "طلب إرجاع") + "</span>" +
      '<span class="rs-chip ' + meta.chip + '"><span class="material-icons-outlined">' + meta.icon + "</span>" + meta.label + decidedAt + "</span>" +
      "</div>" +
      "<small style='color:#94a3b8;'>تم التقديم: " + window.BudaReturns.formatShortDate(request.created_at) + "</small>" +
      note +
      renderRequestImages(request) +
      "</div>"
    );
  }

  function renderItemRow(view) {
    var item = view.item;
    var price = Number(item.price ?? item.price_after_discount ?? view.order.total_price ?? 0);
    var qty = Number(item.quantity) || 1;
    var image = item.image || window.BudaOrders.fallbackItemImage();
    var imgTag = window.BudaOrders.buildOrderImageTag(image, item.name);

    var actionHtml = "";
    if (view.eligible) {
      actionHtml =
        '<button type="button" class="rs-btn-return" data-rs-action="create" data-order-id="' + window.BudaReturns.escapeHtml(view.orderMeta.orderId) + '" data-product-id="' + window.BudaReturns.escapeHtml(view.productId) + '">' +
        '<span class="material-icons-outlined" style="font-size:18px;">assignment_return</span> طلب استرجاع' +
        "</button>";
    } else if (view.latest) {
      actionHtml = "";
    }

    return (
      '<div class="rs-item">' +
      imgTag +
      '<div class="rs-item-copy">' +
      '<h4 class="rs-item-name">' + window.BudaReturns.escapeHtml(item.name) + "</h4>" +
      buildVariantChip(item) +
      '<div class="rs-item-meta">' +
      "<span>الكمية: " + qty + "</span>" +
      '<span class="rs-item-price">' + window.BudaOrders.formatMoney(price, view.order) + "</span>" +
      "</div>" +
      "</div>" +
      '<div class="rs-item-side">' +
      '<span class="rs-chip ' + view.chipClass + '"><span class="material-icons-outlined">' + view.chipIcon + "</span>" + window.BudaReturns.escapeHtml(view.chipLabel) + "</span>" +
      actionHtml +
      "</div>" +
      "</div>" +
      (view.latest ? renderRequestPanel(view) : "")
    );
  }

  function renderOrderCard(order) {
    var status = window.BudaOrders.statusMeta(order.status || order.order_status);
    var orderId = window.BudaOrders.getOrderId(order);
    var items = window.BudaOrders.getOrderItems(order);
    var orderRef = window.BudaOrders.buildOrderReference(order);

    if (!items || !items.length) {
      items = [
        {
          name: window.BudaOrders.pickPrimaryOrderItem(order)?.name || "اسم المنتج غير متوفر",
          image: window.BudaOrders.pickPrimaryOrderItem(order)?.image || window.BudaOrders.fallbackItemImage(),
          quantity: 1,
          price: Number(order.total_price || order.total || order.amount) || 0,
        },
      ];
    }

    var rows = items
      .map(function (item) {
        var productId = window.BudaReturns.resolveProductId(order, item);
        return renderItemRow(buildItemView(order, { key: status.key, isFinished: status.isFinished, orderId: orderId }, item, productId));
      })
      .join("");

    var statusDate = window.BudaOrders.formatOrderDate(window.BudaOrders.getOrderTime(order));

    return (
      '<article class="rs-order-card" data-order-id="' + window.BudaReturns.escapeHtml(orderId) + '">' +
      '<div class="rs-order-head">' +
      '<span class="rs-order-state-line">' + window.BudaReturns.escapeHtml(status.linePrefix || status.label) + " · " + window.BudaReturns.escapeHtml(statusDate) + "</span>" +
      '<span class="rs-order-ref" title="' + window.BudaReturns.escapeHtml(orderRef) + '">' + window.BudaReturns.escapeHtml(orderRef.substring(0, 12)) + "</span>" +
      "</div>" +
      rows +
      "</article>"
    );
  }

  function renderEmpty(icon, title, text, actionsHtml) {
    return (
      '<div class="rs-empty">' +
      '<div class="rs-empty-icon"><span class="material-icons-outlined" style="font-size:38px;">' + icon + "</span></div>" +
      "<h3>" + title + "</h3>" +
      "<p>" + text + "</p>" +
      (actionsHtml || '<a class="rs-btn-return" href="my-orders.html">عرض طلباتي</a>') +
      "</div>"
    );
  }

  function renderNotLoggedIn() {
    page.listEl.innerHTML = renderEmpty("lock_outline", "تسجيل الدخول مطلوب", "يجب تسجيل الدخول لعرض حالة مرتجعات طلباتك.", '<a class="rs-btn-return" href="signin/login.html">تسجيل الدخول</a>');
  }

  function renderError() {
    page.listEl.innerHTML = renderEmpty("error_outline", "تعذر تحميل البيانات", "حدث خطأ أثناء تحميل مرتجعاتك. حاول مرة أخرى لاحقًا.", "");
  }

  function renderStats() {
    if (!page.statsEl) return;
    var eligibleCount = 0;
    var activeCount = 0;
    var expiredCount = 0;

    for (var i = 0; i < state.orders.length; i++) {
      var order = state.orders[i];
      var meta = window.BudaOrders.statusMeta(order.status || order.order_status);
      var items = window.BudaOrders.getOrderItems(order);
      for (var j = 0; j < (items || []).length; j++) {
        var item = items[j];
        var productId = window.BudaReturns.resolveProductId(order, item);
        var view = buildItemView(order, { key: meta.key, isFinished: meta.isFinished, orderId: window.BudaOrders.getOrderId(order) }, item, productId);
        if (view.eligible) eligibleCount += 1;
        else if (view.activeExists) activeCount += 1;
        else if (view.windowInfo.expired && view.isDelivered && view.returnAllowed) expiredCount += 1;
      }
    }

    page.statsEl.innerHTML =
      '<div class="rs-stat"><div class="rs-stat-value">' + eligibleCount + '</div><div class="rs-stat-label">متاح للإرجاع</div></div>' +
      '<div class="rs-stat"><div class="rs-stat-value">' + activeCount + '</div><div class="rs-stat-label">طلبات إرجاع نشطة</div></div>' +
      '<div class="rs-stat"><div class="rs-stat-value">' + expiredCount + '</div><div class="rs-stat-label">انتهت المهلة</div></div>';
  }

  function renderList() {
    renderStats();

    if (!state.orders.length) {
      page.listEl.innerHTML = renderEmpty("assignment_return", "لا توجد طلبات للإرجاع", "عند إتمام أي طلب سيكون بإمكانك طلب استرجاع المنتجات المؤهلة من هنا خلال 14 يوم من التوصيل.", "");
      return;
    }

    var cards = state.orders.map(function (order) { return renderOrderCard(order); }).join("");
    page.listEl.innerHTML = cards;
    if (window.BudaOrders && typeof window.BudaOrders.bindOrderImageFallbacks === "function") {
      window.BudaOrders.bindOrderImageFallbacks(page.listEl);
    }
  }

  function openLightbox(src) {
    var old = document.querySelector(".rs-lightbox");
    if (old) old.remove();
    var overlay = document.createElement("div");
    overlay.className = "rs-lightbox";
    overlay.style.cssText =
      "position:fixed;inset:0;background:rgba(10,16,28,.82);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;";
    overlay.innerHTML = '<img src="' + window.BudaReturns.escapeHtml(src) + '" alt="صورة" style="max-width:100%;max-height:90vh;border-radius:12px;display:block;" />';
    overlay.addEventListener("click", function () { overlay.remove(); });
    document.body.appendChild(overlay);
  }

  function handleClick(event) {
    var createBtn = event.target.closest("[data-rs-action='create']");
    if (createBtn) {
      event.preventDefault();
      var orderId = createBtn.getAttribute("data-order-id");
      var productId = createBtn.getAttribute("data-product-id");
      if (!orderId || !productId) {
        notify("تعذر فتح طلب الإرجاع.", "error");
        return;
      }
      window.location.href = "return-request.html?id=" + encodeURIComponent(orderId) + "&pid=" + encodeURIComponent(productId);
      return;
    }

    var lb = event.target.closest("[data-rs-action='lightbox']");
    if (lb) {
      var src = lb.getAttribute("data-rs-src");
      if (src) openLightbox(src);
    }
  }

  function bindPolicyToggle() {
    var head = document.getElementById("rs-policy-head");
    if (head) {
      head.addEventListener("click", function () {
        head.closest(".rs-policy-card").classList.toggle("is-open");
      });
    }
  }

  async function loadRequests(client) {
    try {
      var query = client.from("return_requests").select("*").order("created_at", { ascending: false });
      if (!state.isAdmin && state.email) {
        query = query.eq("user_email", state.email.toLowerCase());
      }
      var resp = await query;
      if (resp && !resp.error && Array.isArray(resp.data)) {
        state.requests = resp.data;
      } else {
        console.warn("load return requests failed", resp && resp.error);
      }
    } catch (e) {
      console.warn("load return requests exception", e);
    }
  }

  async function renderOrders() {
    page.listEl = document.getElementById("returns-list");
    page.statusEl = document.getElementById("returns-status");
    page.statsEl = document.getElementById("returns-stats");
    if (!page.listEl) return;

    state.email = window.BudaReturns.getActiveEmail();
    state.isAdmin = /@example\.com$/.test(state.email);

    if (!state.email) {
      renderNotLoggedIn();
      return;
    }

    if (!window.supabaseClient || typeof window.supabaseClient.getOrders !== "function" || typeof window.supabaseClient.from !== "function") {
      notify("خدمة المرتجعات غير متاحة الآن.", "error");
      renderError();
      return;
    }

    try {
      var rawOrders = await window.supabaseClient.getOrders(state.isAdmin ? {} : { user_email: state.email.toLowerCase() });
      var hydrated = await window.BudaOrders.hydrateOrdersWithOrderItems(rawOrders || []);
      state.orders = Array.isArray(hydrated) ? hydrated : [];

      await loadRequests(window.supabaseClient);

      var productIds = [];
      state.orders.forEach(function (order) {
        var items = window.BudaOrders.getOrderItems(order);
        (items || []).forEach(function (item) {
          var pid = window.BudaReturns.resolveProductId(order, item);
          if (pid) productIds.push(pid);
        });
      });
      state.flags = await window.BudaReturns.loadReturnFlags(window.supabaseClient, productIds);
      state.flagsLoaded = true;

      renderList();
    } catch (error) {
      console.error("load returns failed", error);
      renderError();
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindPolicyToggle();

    var list = document.getElementById("returns-list");
    if (list) list.addEventListener("click", handleClick);

    var params = new URLSearchParams(window.location.search);
    if (params.get("created") === "1") {
      notify("تم إرسال طلب الإرجاع بنجاح. سيقوم فريقنا بمراجعته.", "success");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    renderOrders();
  });
})();