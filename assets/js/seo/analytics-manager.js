(function (global) {
  "use strict";

  var Analytics = {};

  // ==============================
  // CONFIG — غيّر القيم هنا
  // ==============================
  Analytics.config = {
    GA4_MEASUREMENT_ID: "G-PRZGJW879Z",
    GSC_VERIFICATION: "google-site-verification-code-here",
    BING_VERIFICATION: "bing-verification-code-here",
    CLARITY_PROJECT_ID: "clarity-project-id-here",
    COOKIE_CONSENT: true,
  };

  // ==============================
  // GOOGLE SEARCH CONSOLE
  // ==============================
  Analytics.getGSCMetaTag = function () {
    if (!Analytics.config.GSC_VERIFICATION || Analytics.config.GSC_VERIFICATION === "google-site-verification-code-here") return "";
    return '<meta name="google-site-verification" content="' + Analytics.config.GSC_VERIFICATION + '">';
  };

  Analytics.injectGSCMeta = function () {
    var meta = Analytics.getGSCMetaTag();
    if (!meta) return;
    var existing = document.querySelector('meta[name="google-site-verification"]');
    if (!existing) {
      var head = document.head || document.querySelector("head");
      if (head) head.insertAdjacentHTML("beforeend", meta);
    }
  };

  // ==============================
  // BING WEBMASTER
  // ==============================
  Analytics.getBingMetaTag = function () {
    if (!Analytics.config.BING_VERIFICATION || Analytics.config.BING_VERIFICATION === "bing-verification-code-here") return "";
    return '<meta name="msvalidate.01" content="' + Analytics.config.BING_VERIFICATION + '">';
  };

  Analytics.injectBingMeta = function () {
    var meta = Analytics.getBingMetaTag();
    if (!meta) return;
    var existing = document.querySelector('meta[name="msvalidate.01"]');
    if (!existing) {
      var head = document.head || document.querySelector("head");
      if (head) head.insertAdjacentHTML("beforeend", meta);
    }
  };

  // ==============================
  // MICROSOFT CLARITY
  // ==============================
  Analytics.injectClarity = function () {
    var pid = Analytics.config.CLARITY_PROJECT_ID;
    if (!pid || pid === "clarity-project-id-here") return;
    if (document.getElementById("clarity-script")) return;

    var script = document.createElement("script");
    script.id = "clarity-script";
    script.innerHTML = "(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,'clarity','script','" + pid + "');";
    document.head.appendChild(script);
  };

  // ==============================
  // GOOGLE ANALYTICS 4
  // ==============================
  Analytics.injectGA4 = function () {
    var id = Analytics.config.GA4_MEASUREMENT_ID;
    if (!id || id === "G-XXXXXXXXXX") return;
    if (document.getElementById("ga4-script")) return;

    var script1 = document.createElement("script");
    script1.id = "ga4-script";
    script1.async = true;
    script1.src = "https://www.googletagmanager.com/gtag/js?id=" + id;
    document.head.appendChild(script1);

    var script2 = document.createElement("script");
    script2.innerHTML =
      "window.dataLayer = window.dataLayer || [];\n" +
      "function gtag(){dataLayer.push(arguments);}\n" +
      "gtag('js', new Date());\n" +
      "gtag('config', '" + id + "', {\n" +
      "  'user_id': '" + (Analytics.getUserId() || "") + "',\n" +
      "  'cookie_flags': 'samesite=none;secure',\n" +
      "});\n";
    document.head.appendChild(script2);
  };

  Analytics.getUserId = function () {
    try {
      var user = global.BudaStore && global.BudaStore.getCurrentUser;
      if (user) return user.id || user.email || "";
    } catch (e) {}
    return "";
  };

  // ==============================
  // E-COMMERCE EVENTS (GA4)
  // ==============================
  Analytics.gtag = function () {
    if (typeof gtag !== "undefined") {
      gtag.apply(null, arguments);
    }
  };

  Analytics.sendEvent = function (eventName, params) {
    Analytics.gtag("event", eventName, params || {});
  };

  // View Product
  Analytics.trackViewItem = function (product) {
    if (!product) return;
    Analytics.sendEvent("view_item", {
      currency: "EGP",
      value: Number(product.currentPrice || product.price || 0),
      items: [Analytics.buildItem(product)],
    });
  };

  // View Product List
  Analytics.trackViewItemList = function (items, listName) {
    if (!items || !items.length) return;
    Analytics.sendEvent("view_item_list", {
      item_list_name: listName || "products",
      items: items.map(function (p) { return Analytics.buildItem(p); }),
    });
  };

  // Add to Cart
  Analytics.trackAddToCart = function (product, quantity) {
    if (!product) return;
    Analytics.sendEvent("add_to_cart", {
      currency: "EGP",
      value: Number(product.currentPrice || product.price || 0) * (quantity || 1),
      items: [Analytics.buildItem(product, quantity)],
    });
  };

  // Remove from Cart
  Analytics.trackRemoveFromCart = function (product, quantity) {
    if (!product) return;
    Analytics.sendEvent("remove_from_cart", {
      currency: "EGP",
      value: Number(product.currentPrice || product.price || 0) * (quantity || 1),
      items: [Analytics.buildItem(product, quantity)],
    });
  };

  // Begin Checkout
  Analytics.trackBeginCheckout = function (items) {
    if (!items || !items.length) return;
    var total = items.reduce(function (sum, item) {
      return sum + (Number(item.currentPrice || item.price || 0) * (item.quantity || 1));
    }, 0);
    Analytics.sendEvent("begin_checkout", {
      currency: "EGP",
      value: total,
      items: items.map(function (p) { return Analytics.buildItem(p); }),
    });
  };

  // Purchase
  Analytics.trackPurchase = function (order, items) {
    if (!order) return;
    Analytics.sendEvent("purchase", {
      transaction_id: String(order.id || order.order_id || ""),
      value: Number(order.total || order.total_amount || 0),
      tax: Number(order.tax || 0),
      shipping: Number(order.shipping || 0),
      currency: "EGP",
      items: (items || []).map(function (p) { return Analytics.buildItem(p); }),
    });
  };

  // Search
  Analytics.trackSearch = function (searchTerm, results) {
    if (!searchTerm) return;
    Analytics.sendEvent("search", {
      search_term: searchTerm,
      results_count: (results && results.length) || 0,
    });
  };

  // Add to Wishlist
  Analytics.trackAddToWishlist = function (product) {
    if (!product) return;
    Analytics.sendEvent("add_to_wishlist", {
      currency: "EGP",
      value: Number(product.currentPrice || product.price || 0),
      items: [Analytics.buildItem(product)],
    });
  };

  // View Cart
  Analytics.trackViewCart = function (items) {
    if (!items || !items.length) return;
    Analytics.sendEvent("view_cart", {
      currency: "EGP",
      value: items.reduce(function (sum, i) { return sum + (Number(i.currentPrice || i.price || 0) * (i.quantity || 1)); }, 0),
      items: items.map(function (p) { return Analytics.buildItem(p); }),
    });
  };

  // Share
  Analytics.trackShare = function (contentType, itemId) {
    Analytics.sendEvent("share", {
      content_type: contentType || "product",
      item_id: String(itemId || ""),
    });
  };

  // Lead
  Analytics.trackLead = function (value, currency) {
    Analytics.sendEvent("generate_lead", {
      value: value || 0,
      currency: currency || "EGP",
    });
  };

  // Sign Up
  Analytics.trackSignUp = function (method) {
    Analytics.sendEvent("sign_up", { method: method || "email" });
  };

  // Login
  Analytics.trackLogin = function (method) {
    Analytics.sendEvent("login", { method: method || "email" });
  };

  // ==============================
  // ITEM BUILDER
  // ==============================
  Analytics.buildItem = function (product, quantity) {
    if (!product) return {};
    return {
      item_id: String(product.id || product.product_id || ""),
      item_name: product.name || "",
      item_brand: product.brand || product.seller_name || "",
      item_category: product.category || product.main_category || "",
      price: Number(product.currentPrice || product.price || 0),
      quantity: quantity || product.quantity || 1,
      index: product.index || 0,
    };
  };

  // ==============================
  // COOKIE CONSENT
  // ==============================
  Analytics.getConsent = function () {
    try {
      return localStorage.getItem("buda_analytics_consent");
    } catch (e) { return null; }
  };

  Analytics.setConsent = function (granted) {
    try {
      localStorage.setItem("buda_analytics_consent", granted ? "true" : "false");
      if (typeof gtag !== "undefined") {
        gtag("consent", "update", {
          analytics_storage: granted ? "granted" : "denied",
          ad_storage: granted ? "granted" : "denied",
        });
      }
    } catch (e) {}
  };

  Analytics.showConsentBanner = function () {
    if (!Analytics.config.COOKIE_CONSENT) return;
    if (Analytics.getConsent()) return;
    if (document.getElementById("cookie-consent-banner")) return;

    var banner = document.createElement("div");
    banner.id = "cookie-consent-banner";
    banner.style.cssText = "position:fixed;bottom:0;left:0;right:0;background:#1a2530;color:#fff;padding:16px 24px;z-index:9999;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;font-size:14px;direction:rtl";
    banner.innerHTML =
      '<span>نستخدم ملفات تعريف الارتباط لتحسين تجربتك. هل توافق على استخدامها؟</span>' +
      '<div style="display:flex;gap:8px">' +
      '<button id="cookie-accept" style="padding:8px 20px;background:#fff;color:#1a2530;border:none;border-radius:8px;cursor:pointer;font-weight:600">موافق</button>' +
      '<button id="cookie-decline" style="padding:8px 20px;background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:8px;cursor:pointer">رفض</button></div>';

    document.body.appendChild(banner);

    document.getElementById("cookie-accept").addEventListener("click", function () {
      Analytics.setConsent(true);
      banner.remove();
      Analytics.initTracking();
    });

    document.getElementById("cookie-decline").addEventListener("click", function () {
      Analytics.setConsent(false);
      banner.remove();
    });
  };

  // ==============================
  // INIT
  // ==============================
  Analytics.init = function () {
    Analytics.injectGSCMeta();
    Analytics.injectBingMeta();

    if (Analytics.config.COOKIE_CONSENT) {
      Analytics.showConsentBanner();
      if (Analytics.getConsent() === "true") {
        Analytics.initTracking();
      }
    } else {
      Analytics.initTracking();
    }
  };

  Analytics.initTracking = function () {
    Analytics.injectClarity();
    Analytics.injectGA4();
  };

  // Track current page (call after product data is ready)
  Analytics.trackCurrentPage = function (product) {
    if (product) {
      Analytics.trackViewItem(product);
    }
  };

  // ==============================
  // EXPOSE
  // ==============================
  global.Analytics = Analytics;

  // Auto-init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", Analytics.init);
  } else {
    Analytics.init();
  }
})(window);
