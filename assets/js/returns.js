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
    countryCode: "EG",
  };

  var page = {
    listEl: null,
    statusEl: null,
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
    var matches = findExistingRequests(order, orderMeta.orderId, productId);
    var exists = matches.length > 0;
    var activeExists = hasActiveRequest(matches);
    var latest = latestRequest(matches);

    /* قاعدة "مرة واحدة فقط": أي طلب سابق (حتى المرفوض) يمنع إعادة التقديم */
    var eligible = isDelivered && returnAllowed && windowInfo.eligible && !exists;
    var stateLabel = "";
    var chipClass = "";
    var chipIcon = "";

    if (exists && latest) {
      var meta = window.BudaReturns.RETURN_STATUS_META[latest.status] || window.BudaReturns.RETURN_STATUS_META.reviewing;
      chipClass = meta.chip;
      chipIcon = meta.icon;
      stateLabel = meta.label;
    } else if (orderMeta.key === "cancelled" || orderMeta.key === "returned") {
      /* الطلب مُلغى أو مُرجَع فعليًا => غير قابل للإرجاع نهائيًا.
         ملاحظة: التوصيل (delivered) يأتي هنا بحالة isFinished لكنه يبقى مؤهلًا */
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
      exists: exists,
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

  function renderKebab(view) {
    if (!view.eligible) return "";
    return (
      '<div class="rs-kebab">' +
      '<button type="button" class="rs-kebab-btn" data-rs-action="toggle-kebab" data-order-id="' +
      window.BudaReturns.escapeHtml(view.orderMeta.orderId) +
      '" data-product-id="' +
      window.BudaReturns.escapeHtml(view.productId) +
      '" aria-label="خيارات الإرجاع" aria-expanded="false">' +
      '<span class="material-icons-outlined">more_vert</span>' +
      "</button>" +
      "</div>"
    );
  }

  function renderItemRow(view) {
    var item = view.item;
    var price = Number(item.price ?? item.price_after_discount ?? view.order.total_price ?? 0);
    var qty = Number(item.quantity) || 1;
    var image = item.image || window.BudaOrders.fallbackItemImage();
    var imgTag = window.BudaOrders.buildOrderImageTag(image, item.name);

    return (
      '<div class="rs-item">' +
      '<div class="rs-item-copy">' +
      '<h4 class="rs-item-name">' + window.BudaReturns.escapeHtml(item.name) + "</h4>" +
      buildVariantChip(item) +
      '<div class="rs-item-meta">' +
      '<span class="rs-qty">الكمية: ' + qty + "</span>" +
      '<span class="rs-item-price">' + window.BudaOrders.formatMoney(price, view.order) + "</span>" +
      "</div>" +
      "</div>" +
      '<span class="rs-item-imgwrap">' + imgTag + "</span>" +
      "</div>" +
      '<footer class="rs-item-return">' +
      '<span class="rs-chip ' + view.chipClass + '"><span class="material-icons-outlined">' + view.chipIcon + "</span>" + window.BudaReturns.escapeHtml(view.chipLabel) + "</span>" +
      renderKebab(view) +
      "</footer>"
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
        return renderItemRow(buildItemView(order, { key: status.key, orderId: orderId }, item, productId));
      })
      .join("");

    var statusDate = window.BudaOrders.formatOrderDate(window.BudaOrders.getOrderTime(order));
    var statusClass = "is-" + (status.key || "processing");
    if (!/^(is-delivered|is-cancelled|is-processing|is-shipped|is-returned)$/.test(statusClass)) {
      statusClass = "is-processing";
    }

    return (
      '<article class="rs-order-card" data-order-id="' + window.BudaReturns.escapeHtml(orderId) + '">' +
      '<header class="rs-order-head">' +
      '<span class="rs-order-status ' + statusClass + '">' + window.BudaReturns.escapeHtml(status.linePrefix || status.label || status) + "</span>" +
      '<span class="rs-order-date">' + window.BudaReturns.escapeHtml(statusDate) + "</span>" +
      '<span class="rs-order-ref" title="' + window.BudaReturns.escapeHtml(orderRef) + '">' + window.BudaReturns.escapeHtml(orderRef.substring(0, 12)) + "</span>" +
      "</header>" +
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

  function renderList() {
    var groupEl = document.getElementById("rs-group-title");
    if (groupEl) {
      groupEl.innerHTML = "طلباتي <span class=\"rs-group-count\">" + state.orders.length + "</span>";
    }

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

  var activeKebabBtn = null;

  function closeKebabMenus() {
    var open = document.querySelector(".rs-kebab-float");
    if (open) open.remove();
    if (activeKebabBtn) {
      activeKebabBtn.setAttribute("aria-expanded", "false");
      activeKebabBtn = null;
    }
  }

  function openKebabMenu(btn, orderId, productId) {
    if (activeKebabBtn === btn) {
      closeKebabMenus();
      return;
    }
    closeKebabMenus();
    activeKebabBtn = btn;

    var menu = document.createElement("div");
    menu.className = "rs-kebab-menu rs-kebab-float";
    menu.setAttribute("role", "menu");
    menu.innerHTML =
      '<button type="button" class="rs-kebab-item" data-rs-action="create" data-order-id="' +
      window.BudaReturns.escapeHtml(orderId) +
      '" data-product-id="' +
      window.BudaReturns.escapeHtml(productId) +
      '"><span class="material-icons-outlined">assignment_return</span>طلب إرجاع</button>';
    document.body.appendChild(menu);

    var rect = btn.getBoundingClientRect();
    var vw = window.innerWidth || document.documentElement.clientWidth;
    var menuWidth = menu.offsetWidth || 210;
    var left = Math.max(8, Math.min(rect.left, vw - menuWidth - 8));
    menu.style.position = "fixed";
    menu.style.top = Math.round(rect.bottom + 8) + "px";
    menu.style.left = Math.round(left) + "px";
    menu.classList.add("is-open");
    btn.setAttribute("aria-expanded", "true");
  }

  function goCreate(orderId, productId) {
    if (!orderId || !productId) {
      notify("تعذر فتح طلب الإرجاع.", "error");
      return;
    }
    window.location.href = "return-request.html?id=" + encodeURIComponent(orderId) + "&pid=" + encodeURIComponent(productId);
  }

  function handleClick(event) {
    var toggle = event.target.closest("[data-rs-action='toggle-kebab']");
    if (toggle) {
      event.preventDefault();
      var orderId = toggle.getAttribute("data-order-id");
      var productId = toggle.getAttribute("data-product-id");
      openKebabMenu(toggle, orderId, productId);
      return;
    }

    var createBtn = event.target.closest("[data-rs-action='create']");
    if (createBtn) {
      event.preventDefault();
      goCreate(createBtn.getAttribute("data-order-id"), createBtn.getAttribute("data-product-id"));
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

  /* هل الطلب تابع لدولة الحساب؟ (country_code / country يدعم "EG" و"مصر" و"SA" و"السعودية") */
  function orderInCountry(order, code) {
    if (!code) return true;
    var field = String(order.country_code || order.country || order.orderCountry || "").toUpperCase().trim();
    if (!field) return true; /* لا معلومة دولة => نفترض نفس دولة الحساب حتى لا نخفي الطلبات */
    if (code === "SA") return /(SA|السعودية)/.test(field) && !/EG/.test(field);
    if (code === "EG") return /(EG|مصر)/.test(field);
    return field.indexOf(code) === 0;
  }

  async function renderOrders() {
    page.listEl = document.getElementById("returns-list");
    page.statusEl = document.getElementById("returns-status");
    if (!page.listEl) return;

    state.email = window.BudaReturns.getActiveEmail();
    state.isAdmin = /@example\.com$/.test(state.email);
    state.countryCode = (window.BudaReturns.getUserCountryCode() || "EG").toUpperCase();

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
      var allOrders = Array.isArray(hydrated) ? hydrated : [];

      /* عرض طلبات دولة الحساب فقط (مصر للسعوديين والعكس) */
      state.orders = allOrders.filter(function (order) {
        return orderInCountry(order, state.countryCode);
      });

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

    document.addEventListener("click", function (event) {
      var createBtn = event.target.closest("[data-rs-action='create']");
      if (createBtn) {
        event.preventDefault();
        goCreate(createBtn.getAttribute("data-order-id"), createBtn.getAttribute("data-product-id"));
        closeKebabMenus();
        return;
      }
      if (!event.target.closest(".rs-kebab-float") && !event.target.closest(".rs-kebab")) {
        closeKebabMenus();
      }
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeKebabMenus();
    });
    ["scroll", "resize"].forEach(function (ev) {
      window.addEventListener(ev, closeKebabMenus, { passive: true });
    });

    var params = new URLSearchParams(window.location.search);
    if (params.get("created") === "1") {
      notify("تم إرسال طلب الإرجاع بنجاح. سيقوم فريقنا بمراجعته.", "success");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    renderOrders();
  });
})();