/**
 * PDP.Utils — shared helpers reused by every Product Detail Page
 * component. Plain namespaced script (no bundler / no ES modules)
 * to stay compatible with the rest of the project, including
 * file:// usage.
 */
(function (global) {
  "use strict";

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getQueryParam(name) {
    try { return new URLSearchParams(window.location.search).get(name); }
    catch (e) { return null; }
  }

  /** Get market/country from the URL only. Priority: country/market/cc/countryCode */
  function getUrlMarket() {
    try {
      var params = new URLSearchParams(window.location.search);
      var m = params.get("country") || params.get("market") || params.get("cc") || params.get("countryCode") || params.get("country_code") || "";
      if (m) {
        var canon = marketCodeFromValue(m);
        return canon || String(m).toUpperCase().trim();
      }
    } catch (e) {}
    return "";
  }

  /** The visitor's currently selected country (the market the site is showing). */
  function getUserMarket() {
    var code = "";
    try {
      var ti = global.TaagerIntegration;
      if (ti && typeof ti.getSelectedCountry === "function") {
        var c = ti.getSelectedCountry();
        if (c && c.code) code = c.code;
      }
    } catch (e) {}
    if (!code) {
      try {
        var ls = localStorage.getItem("boda_selected_country") || localStorage.getItem("userCountry");
        if (ls) {
          try { var o = JSON.parse(ls); if (o && o.code) code = o.code; else code = ls; }
          catch (e2) { code = ls; }
        }
      } catch (e3) {}
    }
    return marketCodeFromValue(code) || String(code || "").toUpperCase().trim();
  }

  /**
   * The market that governs what the visitor is allowed to see.
   * The visitor's selected country is authoritative (this is what is shown
   * "in front of them"); the URL's country param is only a fallback when the
   * selected country cannot be resolved. This prevents a link carrying another
   * country's code from exposing a product that is not sold in the visitor's market.
   */
  function getRequestedMarket() {
    var user = getUserMarket();
    if (user) return user;
    return getUrlMarket();
  }

  /** Canonical market aliases: map any stored form (ISO2/ISO3/slug/name) to EG/SA/AE/IQ/OM */
  var MARKET_ALIASES = {
    EG: ["EG", "EGY", "EGYPT", "مصر"],
    SA: ["SA", "SAU", "KSA", "SAUDI-ARABIA", "SAUDI ARABIA", "SAUDI", "السعودية", "المملكة العربية السعودية"],
    AE: ["AE", "ARE", "UAE", "EMIRATES", "الإمارات"],
    IQ: ["IQ", "IRQ", "IRAQ", "العراق"],
    OM: ["OM", "OMN", "OMAN", "عمان"],
  };

  function marketCodeFromValue(value) {
    var upp = String(value == null ? "" : value).toUpperCase().trim();
    if (!upp) return "";
    for (var code in MARKET_ALIASES) {
      var list = MARKET_ALIASES[code];
      for (var i = 0; i < list.length; i++) {
        if (upp === list[i].toUpperCase()) return code;
      }
    }
    return "";
  }

  /** All canonical market codes a product belongs to (handles available_countries arrays). */
  function productMarketCodes(p) {
    var out = [];
    if (!p) return out;
    var candidates = [];
    if (Array.isArray(p.available_countries)) candidates = candidates.concat(p.available_countries);
    if (p.country_code) candidates.push(p.country_code);
    if (p.country) candidates.push(p.country);
    if (p.countryCode) candidates.push(p.countryCode);
    candidates.forEach(function (v) {
      var code = marketCodeFromValue(v);
      if (code && out.indexOf(code) === -1) out.push(code);
    });
    return out;
  }

  /** Primary canonical market code for a product ("" when unknown). */
  function getProductMarket(p) {
    var codes = productMarketCodes(p);
    return codes.length ? codes[0] : "";
  }

  /**
   * Check if a product may be shown in the given market.
   * Returns false ONLY when the product carries market metadata that excludes
   * the requested market (this is what stops a cross-market product from being
   * shown). Products with no market metadata cannot be proven foreign, so they
   * are allowed (keeps internal/legacy products working).
   */
  function productMatchesMarket(p, requestedMarket) {
    if (!p) return false;
    if (!requestedMarket) return true;
    var req = marketCodeFromValue(requestedMarket) || String(requestedMarket).toUpperCase().trim();
    var codes = productMarketCodes(p);
    if (!codes.length) return true; // no metadata -> cannot prove it's foreign
    return codes.indexOf(req) !== -1;
  }

  /** Convert a Western-digit string to Arabic-Indic digits with ٫ decimal separator. */
  function arabicNumeral(text) {
    var digits = { "0": "٠", "1": "١", "2": "٢", "3": "٣", "4": "٤", "5": "٥", "6": "٦", "7": "٧", "8": "٨", "9": "٩" };
    return String(text).replace(/[0-9.]/g, function (ch) { return ch === "." ? "٫" : digits[ch] || ch; });
  }

  function money(value, options) {
    if (global.BudaStore && typeof global.BudaStore.formatMoney === "function") {
      return global.BudaStore.formatMoney(value, { plain: true });
    }
    var v = Number(value) || 0;
    var formatted = v.toFixed(2).replace(/\.00$/, "");
    return arabicNumeral(formatted) + " " + (global.BudaStore?.getCurrencyLabel?.() || "جنيه");
  }

  function getImagePath(path) {
    if (global.BudaStore && typeof global.BudaStore.getImagePath === "function") {
      return global.BudaStore.getImagePath(path);
    }
    return path;
  }

  function fallbackImage() {
    var isFile = window.location && window.location.protocol === "file:";
    var base = (global.BudaStore && global.BudaStore.DEFAULT_PRODUCT_IMAGE) || "assets/images/unnamed.png";
    if (isFile) return window.location.pathname.includes("/pages/") ? "../" + base : base;
    return "/" + base;
  }

  function safeImage(src) {
    var s = String(src || "").trim();
    if (!s) return fallbackImage();
    return getImagePath(s);
  }

  /**
   * Extracts product image URLs. Optional opts.width routes REMOTE images
   * through the shared resizer BEFORE getImagePath processing, so card-sized
   * slots request small WebP files instead of full-size originals. The main
   * gallery must keep calling this WITHOUT opts (production /api/img w=800).
   */
  function getProductImages(product, opts) {
    var cardWidth = Number(opts && opts.width) || 0;
    function processCandidate(raw) {
      var s = String(raw == null ? "" : raw).trim();
      if (!s) return "";
      if (cardWidth && global.BudaStore && typeof global.BudaStore.getResizedImageUrl === "function") {
        s = global.BudaStore.getResizedImageUrl(s, cardWidth) || s;
      }
      return safeImage(s);
    }
    if (global.BudaStore && typeof global.BudaStore.getProductImages === "function") {
      var list = global.BudaStore.getProductImages(product) || [];
      var out = list.map(processCandidate).filter(Boolean);
      var seen = {};
      var uniq = [];
      out.forEach(function (u) { if (!seen[u]) { seen[u] = true; uniq.push(u); } });
      return uniq.length ? uniq : [fallbackImage()];
    }
    if (!product) return [fallbackImage()];
    var candidates = [];
    var directFields = ["image","image1","image_1","image2","image_2","image3","image_3","image4","image_4","image5","image_5","image6","image_6","image7","image_7","image8","image_8","image_url","img","thumbnail","product_image"];
    directFields.forEach(function (k) {
      var v = product[k];
      if (v && String(v).trim()) candidates.push(String(v).trim());
    });
    if (Array.isArray(product.images)) candidates = candidates.concat(product.images.map(String));
    if (!candidates.length) return [fallbackImage()];
    var seen2 = {}, uniq2 = [];
    candidates.forEach(function (u) { var key = u.toUpperCase(); if (!seen2[key]) { seen2[key] = true; uniq2.push(u); } });
    return uniq2.map(processCandidate).filter(Boolean);
  }

  function starsMarkup(rating, size) {
    var r = Math.max(0, Math.min(5, Number(rating) || 0));
    var full = Math.floor(r);
    var half = r - full >= 0.5 ? 1 : 0;
    var empty = 5 - full - half;
    var html = "";
    var i;
    var sz = size ? ' style="font-size:' + size + 'px"' : "";
    for (i = 0; i < full; i++) html += '<span class="material-icons-outlined"' + sz + ">star</span>";
    if (half) html += '<span class="material-icons-outlined"' + sz + ">star_half</span>";
    for (i = 0; i < empty; i++) html += '<span class="material-icons-outlined is-empty"' + sz + ">star_border</span>";
    return html;
  }

  function splitField(v) {
    if (Array.isArray(v)) return v.flatMap(splitField);
    var s = String(v || "").trim();
    if (!s) return [];
    if (/^data:image\//i.test(s) || /^(https?:|blob:)/i.test(s)) return [s.replace(/^['"]|['"]$/g, "")];
    if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
      try {
        var parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.flatMap(splitField);
      } catch (e) { /* ignore */ }
    }
    if (/[;\n\r|]/.test(s)) return s.split(/[;\n\r|]+/g).map(function (x) { return x.trim().replace(/^['"]|['"]$/g, ""); }).filter(Boolean);
    if (s.includes(",")) return s.split(/\s*,\s*/g).map(function (x) { return x.trim().replace(/^['"]|['"]$/g, ""); }).filter(Boolean);
    return [s.replace(/^['"]|['"]$/g, "")];
  }

  function debounce(fn, wait) {
    var t = null;
    return function () {
      var args = arguments, ctx = this;
      window.clearTimeout(t);
      t = window.setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  /** Formats a millisecond duration as "Hh Mm" (Arabic-friendly, no seconds churn beyond 1 tick/min). */
  function formatDuration(ms) {
    var total = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    if (h > 0) return h + " ساعة " + m + " دقيقة";
    if (m > 0) return m + " دقيقة " + s + " ثانية";
    return s + " ثانية";
  }

  /** Ticks a countdown into `el.textContent` once per second until targetTs; returns a stop() fn. */
  function startCountdown(el, targetTs, onDone) {
    if (!el || !targetTs) return function () {};
    var timer = window.setInterval(tick, 1000);
    tick();
    function tick() {
      var remaining = targetTs - Date.now();
      if (remaining <= 0) {
        window.clearInterval(timer);
        el.textContent = "";
        if (typeof onDone === "function") onDone();
        return;
      }
      el.textContent = "اطلب خلال " + formatDuration(remaining);
    }
    return function stop() { window.clearInterval(timer); };
  }

  function notify(message, options) {
    if (global.BudaUI && typeof global.BudaUI.notify === "function") {
      global.BudaUI.notify(message, options || {});
      return;
    }
    console.log("[PDP]", message);
  }

  function shuffle(list) {
    var items = list.slice();
    for (var i = items.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = items[i]; items[i] = items[j]; items[j] = t;
    }
    return items;
  }

  function clampInt(v, min, max) {
    var n = Math.round(Number(v) || 0);
    if (n < min) return min;
    if (max != null && n > max) return max;
    return n;
  }

  global.PDP = global.PDP || {};
  global.PDP.Utils = {
    qs: qs,
    qsa: qsa,
    escapeHtml: escapeHtml,
    getQueryParam: getQueryParam,
    getRequestedMarket: getRequestedMarket,
    getProductMarket: getProductMarket,
    productMarketCodes: productMarketCodes,
    marketCodeFromValue: marketCodeFromValue,
    productMatchesMarket: productMatchesMarket,
    arabicNumeral: arabicNumeral,
    money: money,
    getImagePath: getImagePath,
    safeImage: safeImage,
    fallbackImage: fallbackImage,
    getProductImages: getProductImages,
    starsMarkup: starsMarkup,
    splitField: splitField,
    debounce: debounce,
    formatDuration: formatDuration,
    startCountdown: startCountdown,
    notify: notify,
    shuffle: shuffle,
    clampInt: clampInt,
  };
})(window);
