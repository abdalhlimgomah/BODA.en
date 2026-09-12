/* ============================================================
 * Returns shared helpers (BudaQ store)
 * يستخدمها: returns.js (قائمة مرتجعات العميل) و return-request.js (إنشاء طلب)
 * يعتمد على: window.BudaOrders, window.BudaStore, window.getSupabaseClient
 * ============================================================ */
(function () {
  var RETURN_WINDOW_DAYS = 14;
  var DAY_MS = 24 * 60 * 60 * 1000;

  var RETURN_STATUS_META = {
    reviewing: { key: "reviewing", label: "قيد المراجعة", chip: "rs-chip-pending", icon: "schedule" },
    accepted: { key: "accepted", label: "تم طلب الإرجاع", chip: "rs-chip-accepted", icon: "assignment_returned" },
    cancelled: { key: "cancelled", label: "تم إلغاء طلبك", chip: "rs-chip-cancelled", icon: "highlight_off" },
  };

  function getActiveEmail() {
    return (
      localStorage.getItem("userEmail") ||
      sessionStorage.getItem("user_email") ||
      ""
    ).trim();
  }

  function getUserCountryCode() {
    return (localStorage.getItem("userCountry") || "EG").trim();
  }

  function escapeHtml(value) {
    if (window.BudaOrders && typeof window.BudaOrders.escapeHtml === "function") {
      return window.BudaOrders.escapeHtml(value);
    }
    return String(value ?? "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function normalizeProductId(value) {
    var normalized = String(value || "").trim();
    if (!normalized) return "";
    if (normalized === "order_fallback_item") return "";
    if (/^unknown(_\d+)?$/i.test(normalized)) return "";
    return normalized;
  }

  function resolveProductId(order, primaryItem) {
    var candidates = [
      primaryItem?.product_id,
      primaryItem?.id,
      order?.product_id,
      order?.productId,
      order?.item_id,
      order?.itemId,
    ];
    for (var i = 0; i < candidates.length; i++) {
      var id = normalizeProductId(candidates[i]);
      if (id) return id;
    }

    if (window.BudaStore && typeof window.BudaStore.getAllProducts === "function") {
      var targetName = String(primaryItem?.name || "").trim().toLowerCase();
      if (targetName) {
        var allProducts = Object.values(window.BudaStore.getAllProducts() || {});
        var exact = allProducts.find(function (p) {
          return String(p?.name || "").trim().toLowerCase() === targetName;
        });
        if (exact && exact.id !== undefined && exact.id !== null) return String(exact.id);
      }
    }
    return "";
  }

/* تاريخ تسليم الطلب: delivered_at (يهّبه النظام تلقائيًا عند التوصيل)
   ثم delivered_date / completed ... وأخيرًا updated_at كتقريب للطلبات القديمة
   بدلًا من وقت إنشاء الطلب */
  function getDeliveryStamp(order, fallbackTimestamp) {
    if (!order) return fallbackTimestamp || 0;
    var keys = [
      "delivered_at",
      "delivered_date",
      "deliveredTimestamp",
      "delivered_timestamp",
      "completed_at",
      "completion_date",
      "updated_at",
      "updatedAt",
    ];
    for (var i = 0; i < keys.length; i++) {
      var v = order[keys[i]];
      if (v) {
        var t = toStamp(v);
        if (t) return t;
      }
    }
    return fallbackTimestamp || 0;
  }

  function toStamp(value) {
    if (!value) return 0;
    var t = new Date(value).getTime();
    return Number.isFinite(t) ? t : 0;
  }

  function getOrderStamp(order) {
    var t = 0;
    if (window.BudaOrders && typeof window.BudaOrders.toTimestamp === "function") {
      t = window.BudaOrders.toTimestamp(window.BudaOrders.getOrderTime(order));
    } else {
      t = toStamp(window.BudaOrders ? window.BudaOrders.getOrderTime(order) : order?.created_at);
    }
    return t;
  }

  /* معلومات نافذة الإرجاع للطلب */
  function getReturnWindowInfo(order) {
    var orderStamp = getOrderStamp(order);
    var deliveryStamp = getDeliveryStamp(order, orderStamp);
    var deadline = deliveryStamp ? deliveryStamp + RETURN_WINDOW_DAYS * DAY_MS : 0;
    var now = Date.now();
    var daysLeft = Math.ceil((deadline - now) / DAY_MS);
    return {
      orderStamp: orderStamp,
      deliveryStamp: deliveryStamp,
      deadline: deadline,
      daysLeft: daysLeft,
      expired: Boolean(deadline) && daysLeft <= 0,
      eligible: Boolean(deadline) && daysLeft > 0,
    };
  }

  function formatDeadline(date) {
    try {
      return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric" }).format(new Date(date));
    } catch (e) {
      return new Date(date).toLocaleDateString("ar-EG");
    }
  }

  function formatShortDate(value) {
    if (!value) return "";
    try {
      return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
    } catch (e) {
      return new Date(value).toLocaleDateString("ar-EG");
    }
  }

  function requestKey(orderId, productId) {
    return String(orderId || "").trim().toLowerCase() + "::" + String(productId || "").trim().toLowerCase();
  }

  /* هل المنتج قابل للإرجاع؟ (افتراضي: مقبول ما لم يُحدَّد العكس) */
  function productReturnAllowed(flagsMap, productId, item) {
    var flag = flagsMap ? flagsMap[String(productId || "").trim().toLowerCase()] : undefined;
    if (flag !== undefined && flag !== null && flag !== "") {
      return flag === true || flag === "true" || flag === 1 || flag === "1";
    }
    var itemFlag = item ? item.return_allowed : undefined;
    if (itemFlag !== undefined && itemFlag !== null && itemFlag !== "") {
      return itemFlag === true || itemFlag === "true" || itemFlag === 1 || itemFlag === "1";
    }
    return true;
  }

  /* جلب أعلام الإرجاع من taager_products و products دفعة واحدة */
  async function loadReturnFlags(client, productIds) {
    var flags = {};
    var ids = [];
    var seen = {};
    for (var i = 0; i < (productIds || []).length; i++) {
      var id = normalizeProductId(productIds[i]);
      if (id && !seen[id]) {
        seen[id] = true;
        ids.push(id);
      }
    }
    if (!ids.length) return flags;

    var sources = ["taager_products", "products"];
    for (var s = 0; s < sources.length; s++) {
      try {
        var resp = await client
          .from(sources[s])
          .select("id, return_allowed")
          .in("id", ids);
        if (resp && !resp.error && Array.isArray(resp.data)) {
          resp.data.forEach(function (row) {
            if (row && row.id != null && !(String(row.id).trim().toLowerCase() in flags)) {
              flags[String(row.id).trim().toLowerCase()] = row.return_allowed;
            }
          });
        }
      } catch (e) {
        // ignore - default true
      }
    }
    return flags;
  }

  /* رفع صور إلى Storage (حتى 3 صور) - نمط product-reviews */
  async function uploadReturnImages(rawClient, files, requestCode) {
    var urls = [];
    for (var i = 0; i < (files || []).length; i++) {
      var file = files[i];
      var extMatch = String(file.name || "").split(".").pop();
      var ext = extMatch && extMatch.length <= 5 ? extMatch.toLowerCase() : "jpg";
      var path = "returns/" + requestCode + "/" + Date.now() + "-" + i + "." + ext;
      try {
        var upload = await rawClient.storage.from("return-images").upload(path, file, {
          contentType: file.type || "image/jpeg",
          upsert: false,
        });
        if (upload && upload.error) {
          console.warn("return image upload failed", upload.error);
          continue;
        }
        var pub = rawClient.storage.from("return-images").getPublicUrl(path);
        urls.push(pub?.data?.publicUrl || pub?.publicUrl || "");
      } catch (e) {
        console.warn("return image upload exception", e);
      }
    }
    return urls;
  }

  window.BudaReturns = {
    RETURN_WINDOW_DAYS: RETURN_WINDOW_DAYS,
    RETURN_STATUS_META: RETURN_STATUS_META,
    getActiveEmail: getActiveEmail,
    getUserCountryCode: getUserCountryCode,
    escapeHtml: escapeHtml,
    normalizeProductId: normalizeProductId,
    resolveProductId: resolveProductId,
    getReturnWindowInfo: getReturnWindowInfo,
    formatDeadline: formatDeadline,
    formatShortDate: formatShortDate,
    requestKey: requestKey,
    productReturnAllowed: productReturnAllowed,
    loadReturnFlags: loadReturnFlags,
    uploadReturnImages: uploadReturnImages,
    requestCode: function () {
      return (
        "RR-" +
        new Date().getTime().toString(36).toUpperCase() +
        Math.random().toString(36).slice(2, 6).toUpperCase()
      );
    },
  };
})();