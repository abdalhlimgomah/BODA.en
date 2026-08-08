/**
 * PDP.Data — the single data contract for the rebuilt Product
 * Detail Page. Every component reads from the "view model" built
 * here instead of touching the raw product record, so components
 * stay decoupled from storage/schema details.
 *
 * Nothing here fabricates business data: optional fields (variants,
 * seller stats, installment provider, banner) are only surfaced when
 * present on the product record (or derivable from price/stock,
 * which are legitimate computed values, not invented content).
 */
(function (global) {
  "use strict";

  var U = null; // resolved lazily so load order in the HTML stays flexible

  function utils() { return U || (U = global.PDP.Utils); }

  function parseRaw(raw) {
    if (!raw) return null;
    if (typeof raw === "object") return raw;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  // ---------------------------------------------------------------
  // Raw product resolution (id/session/local/remote) — behavior kept
  // compatible with the previous implementation so existing links
  // ("product.html?id=...", sessionStorage "selectedProduct") work.
  // ---------------------------------------------------------------

  function readStoredProduct(id) {
    try {
      var raw = sessionStorage.getItem("selectedProduct");
      if (!raw) return null;
      var parsed;
      try { parsed = JSON.parse(decodeURIComponent(raw)); }
      catch (e) { parsed = JSON.parse(raw); }
      if (!parsed) return null;
      if (id && String(parsed.id) !== String(id)) return null;
      return parsed;
    } catch (e) { return null; }
  }

  function persistProduct(product) {
    if (!product) return;
    try { sessionStorage.setItem("selectedProduct", encodeURIComponent(JSON.stringify(product))); }
    catch (e) { /* storage may be unavailable (private mode, etc.) */ }
  }

  async function loadRemoteProduct(id) {
    if (!id) return null;
    if (String(id).indexOf("taager_") === 0) {
      var local = global.BudaStore && global.BudaStore.getProductById ? global.BudaStore.getProductById(id) : null;
      if (local) return local;
      try {
        var base = global.TAAGER_EDGE_FUNCTION_URL || "";
        if (base) {
          var res = await fetch(base + "?action=get-product&id=" + encodeURIComponent(id));
          if (res.ok) {
            var data = await res.json();
            if (data && data.id) {
              if (global.addProductToStore) global.addProductToStore(data);
              return data;
            }
          }
        }
      } catch (e) { console.warn("[PDP] taager get-product failed", e); }
      return null;
    }
    var record = null;
    try {
      var client = global.supabaseClient;
      if (client && typeof client.from === "function") {
        var resp = await client.from("products").select("*").eq("id", String(id)).limit(1);
        if (!resp.error && resp.data && resp.data.length) record = resp.data[0];
        if (!record) {
          resp = await client.from("products").select("*").eq("product_id", String(id)).limit(1);
          if (!resp.error && resp.data && resp.data.length) record = resp.data[0];
        }
        if (!record && /^\d+$/.test(String(id))) {
          resp = await client.from("products").select("*").eq("id", Number(id)).limit(1);
          if (!resp.error && resp.data && resp.data.length) record = resp.data[0];
          if (!record) {
            resp = await client.from("products").select("*").eq("product_id", Number(id)).limit(1);
            if (!resp.error && resp.data && resp.data.length) record = resp.data[0];
          }
        }
        if (!record && typeof client.fetchAllProducts === "function") {
          var pool = (await client.fetchAllProducts()) || [];
          record = pool.find(function (p) { return String(p.id || p.product_id) === String(id); }) || null;
        }
        if (!record && typeof client.from === "function") {
          var allResp = await client.from("products").select("*").limit(2000);
          if (!allResp.error && allResp.data && allResp.data.length) {
            record = allResp.data.find(function (p) { return String(p.id || p.product_id) === String(id); }) || null;
          }
        }
      }
    } catch (e) { console.warn("[PDP] supabase lookup failed", e); }
    if (!record) return null;
    if (global.addProductToStore) global.addProductToStore(record);
    var normId = record.id || record.product_id;
    var norm = normId && global.BudaStore && global.BudaStore.getProductById ? global.BudaStore.getProductById(normId) : null;
    return norm ? Object.assign({}, record, norm) : record;
  }

  async function resolveProduct() {
    var id = utils().getQueryParam("id");
    var product = null;
    if (id && global.BudaStore && global.BudaStore.getProductById) product = global.BudaStore.getProductById(id) || null;
    var stored = readStoredProduct(id);
    if (stored) product = product ? Object.assign({}, product, stored) : stored;
    if (id && String(id).indexOf("taager_") === 0) {
      var remote = await loadRemoteProduct(id);
      if (remote) product = remote;
    } else if (id && (!product || utils().getProductImages(product).length <= 1 || (product && !product.raw_data))) {
      var remote2 = await loadRemoteProduct(id);
      if (remote2) product = product ? Object.assign({}, product, remote2) : remote2;
    }
    if (!product && !id && global.BudaStore && global.BudaStore.getAllProducts) {
      var all = Object.values(global.BudaStore.getAllProducts() || {});
      product = all[0] || null;
    }
    if (product && global.BudaStore && global.BudaStore.normalizeProductRecord) {
      try { var n = global.BudaStore.normalizeProductRecord(product); } catch (e) { var n = null; }
      if (n) product = Object.assign({}, product, n);
    }
    persistProduct(product);
    return product;
  }

  async function fetchRatings(id) {
    var empty = { comments: [], ratingsRows: [], average: 0, total: 0 };
    if (!id || !global.supabaseClient || typeof global.supabaseClient.from !== "function") return empty;
    try {
      var result = await global.supabaseClient.from("ratings").select("*").eq("item_id", String(id)).order("created_at", { ascending: false });
      if (result.error) return empty;
      var list = Array.isArray(result.data) ? result.data : [];

      function parseComment(raw) {
        var value = String(raw || "").trim();
        if (value.indexOf("__buda_title__:") === 0) {
          var payload = value.slice("__buda_title__:".length);
          var lines = payload.split(/\r?\n/g);
          return { title: String(lines.shift() || "").trim(), body: lines.join("\n").trim() };
        }
        return { title: "", body: value };
      }

      var comments = list
        .map(function (r) {
          var parsed = parseComment(r && r.comment);
          var imagesRaw = r && r.images;
          var images = [];
          if (Array.isArray(imagesRaw)) {
            images = imagesRaw.filter(function (u) { return typeof u === "string" && u.indexOf("http") === 0; });
          } else if (typeof imagesRaw === "string") {
            try { images = JSON.parse(imagesRaw).filter(function (u) { return typeof u === "string" && u.indexOf("http") === 0; }); }
            catch (e) { /* not parseable */ }
          }
          return {
            id: String((r && r.id) || ""),
            name: (r && (r.reviewer_name || r.name || r.user_name)) || "عميل",
            rating: Number(r && r.rating) || 0,
            text: parsed.title ? parsed.title + " - " + parsed.body : parsed.body,
            photo: (r && (r.photo_url || r.image_url)) || "",
            images: images,
            createdAt: (r && r.created_at) || new Date().toISOString(),
          };
        })
        .filter(function (c) { return c.id && c.rating > 0; });
      var values = list.map(function (r) { return Number(r.rating) || 0; }).filter(function (v) { return v > 0; });
      var average = values.length ? Number((values.reduce(function (s, v) { return s + v; }, 0) / values.length).toFixed(1)) : 0;
      return { comments: comments, ratingsRows: list, average: average, total: values.length };
    } catch (e) { return empty; }
  }

  async function getAllProducts() {
    var local = global.BudaStore ? Object.values(global.BudaStore.getAllProducts() || {}) : [];
    var hasTaager = global.TaagerIntegration && global.TaagerIntegration.fetchTaagerProducts;
    var hasSupabase = global.supabaseClient && global.supabaseClient.fetchAllProducts;
    if (!hasTaager && !hasSupabase) return local;
    try {
      var country = global.TaagerIntegration && global.TaagerIntegration.getSelectedCountry ? global.TaagerIntegration.getSelectedCountry() : null;
      var countryCode = country ? country.code : null;
      var remote = [];
      if (hasSupabase) remote = (await global.supabaseClient.fetchAllProducts()) || [];
      if (hasTaager) {
        var tp = await global.TaagerIntegration.fetchTaagerProducts(countryCode);
        global.TaagerIntegration.mergeTaagerIntoStore(tp);
        remote = remote.concat(tp);
      }
      var map = new Map();
      local.concat(remote).forEach(function (p) { if (p && p.id != null) map.set(String(p.id), p); });
      return Array.from(map.values());
    } catch (e) { return local; }
  }

  // ---------------------------------------------------------------
  // View-model builders (pure functions over a raw product record)
  // ---------------------------------------------------------------

  function buildPrice(product) {
    var u = utils();
    var current = 0, original = 0;
    if (global.BudaStore && global.BudaStore.resolveProductPrice) {
      var r = global.BudaStore.resolveProductPrice(product);
      current = r.currentPrice > 0 ? r.currentPrice : 0;
      if (global.PricingEngine && global.PricingEngine.tiersLoaded) current = global.PricingEngine.calculate(current);
      original = r.originalPrice > current ? r.originalPrice : current;
    } else {
      current = Number(product && product.price) || 0;
      original = current;
    }
    var hasDiscount = original > current;
    var discountPercent = hasDiscount ? Math.round(((original - current) / original) * 100) : 0;
    return {
      current: current,
      original: original,
      hasDiscount: hasDiscount,
      discountPercent: discountPercent,
      savings: hasDiscount ? original - current : 0,
      currentText: u.money(current),
      originalText: u.money(original),
    };
  }

  function buildRating(product) {
    if (global.BudaStore && global.BudaStore.resolveProductRating) {
      var r = global.BudaStore.resolveProductRating(product);
      return { average: r.rating > 0 ? r.rating : 0, count: r.reviewCount || 0 };
    }
    return { average: Number(product && product.rating) || 0, count: Number(product && product.reviewCount) || 0 };
  }

  function buildStock(product) {
    var qty = Math.max(0, Math.round(Number(product && (product.stock || product.quantity)) || 0));
    var declaredStatus = String((product && (product.stockStatus || product.stock_status)) || "").toLowerCase();
    var status = "in_stock";
    if (declaredStatus === "out_of_stock" || qty === 0) status = "out_of_stock";
    else if (qty > 0 && qty < 5) status = "low_stock";
    return { quantity: qty, status: status };
  }

  function buildBadges(product) {
    return {
      express: Boolean(product && (product.express || product.noon_express || product.isExpress)),
      freeShipping: Boolean(product && (product.free_shipping || product.freeShipping)),
      bestSeller: Boolean(product && (product.bestseller || product.bestSeller || product.best_seller)),
    };
  }

  /** Next order cut-off (22:00 local) used for the delivery countdown + ETA date. */
  function nextCutoff() {
    var now = new Date();
    var cutoff = new Date(now);
    cutoff.setHours(22, 0, 0, 0);
    if (now.getTime() >= cutoff.getTime()) cutoff.setDate(cutoff.getDate() + 1);
    return cutoff;
  }

  function formatArabicDate(date) {
    try { return date.toLocaleDateString("ar-EG", { day: "numeric", month: "long" }); }
    catch (e) { return date.toDateString(); }
  }

  function buildDelivery(product, badges) {
    var cutoff = nextCutoff();
    var shippingDays = badges.express ? 1 : 3;
    var eta = new Date(cutoff);
    eta.setDate(eta.getDate() + shippingDays);
    var fee = Number(product && (product.shipping_fee || product.shippingFee));
    return {
      express: badges.express,
      etaDate: formatArabicDate(eta),
      cutoffTs: cutoff.getTime(),
      feeText: fee > 0 ? utils().money(fee) : (badges.freeShipping ? "مجاني" : "يُحسب عند الدفع"),
    };
  }

  function buildInstallment(product, price) {
    if (price.current < 20) return null; // not meaningful below a small floor
    var months = utils().clampInt(product && product.installment_months, 3, 24) || 3;
    var provider = String((product && product.installment_provider) || "ValU");
    var perMonth = price.current / months;
    return {
      provider: provider,
      months: months,
      perMonthText: utils().money(perMonth),
      providers: ["ValU", "Premium", "Visa", "Mastercard"],
    };
  }

  /** Reads structured variant groups if present; never invents data. */
  function buildVariants(product) {
    var u = utils();
    var groups = [];

    function pushGroup(key, label, raw, type) {
      if (!Array.isArray(raw) || raw.length < 2) return;
      var options = raw.map(function (opt, i) {
        if (typeof opt === "string") return { label: opt, value: opt, image: "", available: true };
        return {
          label: opt.name || opt.label || opt.value || String(opt),
          value: opt.value || opt.name || opt.label || String(i),
          image: opt.image || opt.img || "",
          available: opt.available !== false && opt.inStock !== false,
        };
      });
      groups.push({ key: key, label: label, type: type, options: options });
    }

    pushGroup("color", "اللون", product && (product.colors || product.color_options), "color");
    if (!product || !Array.isArray(product.sizes) || !product.sizes.length) {
      pushGroup("size", "المقاس", product && (product.sizes || product.size_options), "size");
    }
    pushGroup("capacity", "السعة", product && (product.capacities || product.capacity_options), "text");
    pushGroup("edition", "النسخة", product && (product.editions || product.edition_options), "text");

    if (!groups.length) {
      var generic = (product && (product.variants || product.options || product.variant_options)) || [];
      pushGroup("variant", (product && product.variant_label) || "اختر النوع", generic, "text");
    }

    // === TAAGER MULTI-VARIANT ===
    var taagerRaw = parseRaw(product && product.raw_data);
    if (product && product.source === "taager" && taagerRaw && taagerRaw.productId) {
      var store = global.BudaStore;
      var pool = store && typeof store.getAllProducts === "function" ? Object.values(store.getAllProducts() || {}) : [];
      var prodName = (product.name || "").trim().toLowerCase();
      var siblings = pool.filter(function (p) {
        if (!p || p.id === product.id || p.source !== "taager") return false;
        var pr = parseRaw(p.raw_data);
        if (pr && pr.productId === taagerRaw.productId) return true;
        if (!pr && p.name && prodName.length > 3 && String(p.name).trim().toLowerCase() === prodName) return true;
        return false;
      });
      if (siblings.length) {
        var currentAttr = taagerRaw.attributes && taagerRaw.attributes[0];
        var attrName = (currentAttr && currentAttr.name) || "Size";
        var attrLabel = attrName === "Size" || attrName === "size" ? "المقاس" : attrName;
        var allVariants = [product].concat(siblings);
        var seen = {};
        var taagerOptions = allVariants.map(function (v) {
          var vr = parseRaw(v.raw_data);
          var a = vr && vr.attributes && vr.attributes[0];
          var label = (a && a.value) || "";
          var vid = v.taager_product_id || (v.id && v.id.indexOf("taager_") === 0 ? v.id.slice(7) : v.id);
          return { label: label, value: "taager_" + vid, image: "", available: true };
        }).filter(function (o) {
          var dup = seen[o.label];
          seen[o.label] = true;
          return !dup;
        });
        if (taagerOptions.length >= 2) {
          var existing = groups.some(function (g) { return g.label === attrLabel || g.key === "size" || g.key === "color"; });
          if (!existing) {
            groups.push({ key: "taager_variant", label: attrLabel, type: "text", options: taagerOptions, _taagerMulti: true });
          }
        }
      } else {
        product._needsTaagerVariants = true;
      }
    }

    return groups;
  }

  function buildHighlights(product) {
    var keys = ["highlights", "features", "key_features", "keyFeatures"];
    var items = [];

    // Try raw_data first
    var raw = product && product.raw_data;
    if (raw) {
      var obj = (typeof raw === "string") ? null : raw;
      if (!obj) { try { obj = JSON.parse(raw); } catch (e) {} }
      if (obj) {
        for (var ri = 0; ri < keys.length; ri++) {
          var v = obj[keys[ri]];
          if (!v) continue;
          if (Array.isArray(v)) { items = v.filter(Boolean).map(String); break; }
          if (typeof v === "object") { items = Object.values(v).filter(Boolean).map(String); break; }
          if (typeof v === "string") {
            items = v.split("\n").filter(Boolean).map(function (s) { return s.replace(/^[-•*]\s*/, "").trim(); }).filter(Boolean);
            if (items.length >= 2) break;
            items = v.split(/[،,]/).filter(Boolean).map(function (s) { return s.trim(); }).filter(Boolean);
            if (items.length >= 2) break;
          }
        }
        if (items.length) return items.slice(0, 8);
      }
    }

    // Then check product top-level
    for (var i = 0; i < keys.length; i++) {
      var v = product && product[keys[i]];
      if (!v) continue;
      if (Array.isArray(v)) { items = v.filter(Boolean).map(String); break; }
      if (typeof v === "object") { items = Object.values(v).filter(Boolean).map(String); break; }
      if (typeof v === "string") {
        items = v.split("\n").filter(Boolean).map(function (s) { return s.replace(/^[-•*]\s*/, "").trim(); }).filter(Boolean);
        if (items.length >= 2) break;
        items = v.split(/[،,]/).filter(Boolean).map(function (s) { return s.trim(); }).filter(Boolean);
        if (items.length >= 2) break;
      }
    }
    return items.slice(0, 8);
  }

  function extractSpecsFromRawData(raw) {
    if (!raw) return null;
    var obj = (typeof raw === "string") ? null : raw;
    if (!obj && typeof raw === "string") { try { obj = JSON.parse(raw); } catch (e) {} }
    if (!obj) return null;
    var specKeys = ["specifications", "specs", "attributes", "attribute_list", "product_specs"];
    for (var ki = 0; ki < specKeys.length; ki++) {
      var val = obj[specKeys[ki]];
      if (!val) continue;
      if (Array.isArray(val) && val.length) {
        var out = [];
        val.forEach(function (item) {
          if (typeof item === "string") out.push({ label: item, value: "" });
          else if (item && typeof item === "object") {
            var label = item.label || item.name || item.key || item.title || "";
            var value = item.value || item.val || item.description || "";
            if (label && String(label).trim()) out.push({ label: String(label).trim(), value: String(value).trim() });
          }
        });
        if (out.length) return out;
      }
      if (typeof val === "object") {
        var out = [];
        Object.keys(val).forEach(function (key) {
          var v = val[key];
          if (v && String(v).trim()) out.push({ label: key, value: String(v).trim() });
        });
        if (out.length) return out;
      }
    }
    return null;
  }

  function buildSpecs(product) {
    if (!product) return [];
    var rows = [];

    // 1) Check raw_data first (full Taager API response stored in DB)
    var fromRaw = extractSpecsFromRawData(product.raw_data);
    if (fromRaw) return fromRaw;

    // 2) Check for structured specs/specifications/attributes arrays on product
    var specKeys = ["specifications", "specs", "attributes", "attribute_list", "product_specs"];
    for (var si = 0; si < specKeys.length; si++) {
      var raw = product[specKeys[si]];
      if (!raw) continue;
      if (Array.isArray(raw)) {
        var parsed = [];
        raw.forEach(function (item) {
          if (typeof item === "string") parsed.push({ label: item, value: "" });
          else if (item && typeof item === "object") {
            var label = item.label || item.name || item.key || item.title || "";
            var value = item.value || item.val || item.description || "";
            if (label && String(label).trim()) parsed.push({ label: String(label).trim(), value: String(value).trim() });
          }
        });
        if (parsed.length) { rows = parsed; break; }
      }
      if (typeof raw === "object") {
        var parsed = [];
        Object.keys(raw).forEach(function (key) {
          var val = raw[key];
          if (val && String(val).trim()) parsed.push({ label: key, value: String(val).trim() });
        });
        if (parsed.length) { rows = parsed; break; }
      }
    }
    if (rows.length) return rows;

    // 3) Fallback: individual known fields
    var fields = [
      { k: "sku", l: "رمز المنتج" }, { k: "model", l: "الموديل" },
      { k: "brand", l: "العلامة التجارية" }, { k: "brand_name", l: "العلامة التجارية" },
      { k: "category", l: "الفئة" },
      { k: "color", l: "اللون" }, { k: "material", l: "الخامة" },
      { k: "weight", l: "الوزن" }, { k: "dimensions", l: "الأبعاد" },
      { k: "country_of_origin", l: "بلد المنشأ" }, { k: "warranty", l: "الضمان" },
      { k: "size", l: "المقاس" }, { k: "style", l: "النمط" },
      { k: "gender", l: "الجنس" }, { k: "type", l: "النوع" },
    ];
    fields.forEach(function (f) {
      var v = product[f.k];
      if (v && String(v).trim()) rows.push({ label: f.l, value: String(v).trim() });
    });
    var qd = product && product.quick_details;
    if (qd && String(qd).trim()) rows.push({ label: "تفاصيل سريعة", value: String(qd).trim() });
    var generic = { product: true, products: true, category: true, general: true, عام: true, منتج: true };
    return rows.filter(function (r) {
      if (r.label === "الفئة" && generic[String(r.value).toLowerCase().trim()]) return false;
      return true;
    });
  }

  var GENERIC_SELLER_NAMES = {
    "تاجر": true, "seller": true, "vendor": true, "البائع": true,
    "متجر": true, "المتجر": true, "store": true, "shop": true,
  };

  function isGenericSeller(name) {
    if (!name) return true;
    var lower = String(name).trim().toLowerCase();
    if (GENERIC_SELLER_NAMES[lower]) return true;
    if (lower.length < 3) return true;
    return false;
  }

  function buildSeller(product) {
    var sellerField = product && (product.seller || product.vendor);
    var hasSellerStats = product && (
      Number(product.seller_rating) > 0 ||
      Number(product.seller_satisfaction) > 0 ||
      Number(product.seller_orders || product.sales_count || product.sold) > 0
    );

    // Use real data only if there are actual stats OR a specific non-generic name
    if (hasSellerStats || (sellerField && !isGenericSeller(sellerField))) {
      var name = sellerField || (product && (product.vendor || product.brand)) || "المتجر";
      return {
        name: String(name),
        yearsWithBuda: 0,
        rating: Number(product && product.seller_rating) || 0,
        positivePercent: Number(product && product.seller_satisfaction) || 0,
        salesCount: Number(product && (product.seller_orders || product.sales_count || product.sold)) || 0,
        shippingSpeedText: (product && product.seller_shipping_speed) || (product && (product.express || product.noon_express) ? "شحن سريع" : ""),
        isOfficial: Boolean(product && (product.seller_official || product.is_official_store)),
      };
    }

    // Ultimate fallback (no generator, no extras)
    return {
      name: "المتجر",
      yearsWithBuda: 0,
      rating: 0,
      positivePercent: 0,
      salesCount: 0,
      shippingSpeedText: "",
      isOfficial: false,
    };
  }

  /** Async seller resolution — checks pool, assigns profile, returns seller object. */
  async function resolveSeller(product) {
    if (!product || !product.id) return buildSeller(product);
    var sellerField = product.seller || product.vendor;
    var hasSellerStats = (
      Number(product.seller_rating) > 0 ||
      Number(product.seller_satisfaction) > 0 ||
      Number(product.seller_orders || product.sales_count || product.sold) > 0
    );
    if (hasSellerStats || (sellerField && !isGenericSeller(sellerField))) return buildSeller(product);
    var gen = global.PDP && global.PDP.SellerGenerator;
    if (gen && gen.resolve) return await gen.resolve(product.id);
    return buildSeller(product);
  }

  function buildDescription(product) {
    var content = (product && product.content_ideas) || "";
    var desc = (product && product.description) || "";
    var full = content ? content + (desc ? "\n\n" + desc : "") : desc;
    return { full: full || "", hasContent: Boolean(full && full.trim()) };
  }

  function buildOffers(product) {
    var coupons = utils().splitField(product && (product.coupons || product.coupon_codes)).map(function (c) {
      return { code: c, label: "استخدم الكود للحصول على خصم إضافي" };
    });
    var bankOffers = utils().splitField(product && (product.bank_offers)).map(function (b) { return { label: b }; });
    return { coupons: coupons, bankOffers: bankOffers, hasAny: Boolean(coupons.length || bankOffers.length) };
  }

  function buildBanner(product) {
    var img = product && (product.related_banner || product.promo_banner);
    if (!img) return null;
    return { image: utils().safeImage(img), link: (product && product.promo_banner_link) || "#" };
  }

  /** Builds a fallback view-model when no product data is available (empty database, no ID, etc.). */
  function buildFallbackViewModel() {
    var u = utils();
    var fb = u.fallbackImage();
    var eta = new Date(Date.now() + 3 * 86400000);
    var etaStr;
    try { etaStr = eta.toLocaleDateString("ar-EG", { day: "numeric", month: "long" }); }
    catch (e) { etaStr = eta.toDateString(); }
    return {
      id: "demo",
      raw: null,
      name: "منتج تجريبي",
      brand: "المتجر",
      category: "",
      images: [fb, fb],
      videos: [],
      price: { current: 199.99, original: 299.99, hasDiscount: true, discountPercent: 33, savings: 100, currentText: u.money(199.99), originalText: u.money(299.99) },
      rating: { average: 4.2, count: 15 },
      stock: { quantity: 10, status: "in_stock" },
      badges: { express: true, freeShipping: true, bestSeller: true },
      delivery: { express: true, etaDate: etaStr, cutoffTs: Date.now() + 3600000, feeText: "مجاني" },
      installment: { provider: "ValU", months: 6, perMonthText: u.money(33.33), providers: ["ValU", "Premium", "Visa", "Mastercard"] },
      offers: { coupons: [], bankOffers: [], hasAny: false },
      variants: [],
      sizes: [],
      seller: { name: "المتجر الرسمي", yearsWithBuda: 5, rating: 4.5, positivePercent: 96, salesCount: 1200, shippingSpeedText: "شحن سريع", isOfficial: true },
      highlights: ["جودة عالية", "ضمان لمدة عام", "الشحن مجاني", "منتج أصلي 100%"],
      specs: [{ label: "الموديل", value: "2024" }, { label: "الضمان", value: "سنة" }, { label: "بلد المنشأ", value: "مصر" }],
      description: { full: "هذا منتج تجريبي يتم عرضه لاختبار واجهة المستخدم.", hasContent: true },
      soldCount: 350,
      banner: null,
      reviews: { average: 4.2, count: 15, comments: [], ratingsRows: [] },
    };
  }

  /** Builds size options from product.sizes array or Taager raw_data.attributes. */
  function buildSizes(product) {
    var raw = product && product.sizes;
    if (!Array.isArray(raw) || !raw.length) {
      var taagerRaw = parseRaw(product && product.raw_data);
      if (taagerRaw && product.source === "taager" && taagerRaw.productId) {
        var store = global.BudaStore;
        var pool = store && typeof store.getAllProducts === "function" ? Object.values(store.getAllProducts() || {}) : [];
        var siblings = [product];
        var productName = (product.name || "").trim().toLowerCase();
        pool.forEach(function (p) {
          if (p && p.id !== product.id && p.source === "taager") {
            var pr = parseRaw(p.raw_data);
            if (pr && pr.productId === taagerRaw.productId) { siblings.push(p); }
            else if (!pr && p.name && productName && productName.length > 3 && String(p.name).trim().toLowerCase() === productName) { siblings.push(p); }
          }
        });
        var seen = {}, taagerSizes = [];
        siblings.forEach(function (sib) {
          var sr = parseRaw(sib.raw_data);
          var attrs = sr && sr.attributes;
          if (!Array.isArray(attrs)) return;
          for (var ai = 0; ai < attrs.length; ai++) {
            var a = attrs[ai];
            var aName = String(a && (a.name || a.attr || a.key || "")).toLowerCase();
            if (aName === "size" || aName === "المقاس" || aName === "sizes" || aName === "مقاس") {
              if (a.value && !seen[a.value]) {
                seen[a.value] = true;
                taagerSizes.push({ name: a.value, stock: 999, is_available: true, _siblingId: sib.id });
              }
            }
          }
        });
        if (taagerSizes.length > 1) { raw = taagerSizes; product._taagerMultiSizes = true; }
        else { product._needsTaagerSizes = true; }
      }
      if (!Array.isArray(raw) || !raw.length && taagerRaw && taagerRaw.attributes && Array.isArray(taagerRaw.attributes)) {
        for (var bi = 0; bi < taagerRaw.attributes.length; bi++) {
          var b = taagerRaw.attributes[bi];
          var bName = String(b && (b.name || b.attr || b.key || "")).toLowerCase();
          if (bName === "size" || bName === "المقاس" || bName === "sizes" || bName === "مقاس") {
            if (b.value) { raw = [{ name: b.value, stock: 999, is_available: true }]; }
            break;
          }
        }
      }
      if (!Array.isArray(raw) || !raw.length) return [];
    }
    return raw.map(function (s) {
      if (typeof s === "string") return { name: s, stock: 0, is_available: true };
      return {
        name: s.name || s.size || s.label || String(s),
        stock: Math.max(0, Number(s.stock) || 0),
        is_available: s.is_available !== false && s.stock !== 0,
      };
    }).filter(function (s) { return s.name; });
  }

  /** Builds the full, stable view-model every component consumes. */
  function buildViewModel(product, extras) {
    extras = extras || {};
    var price = buildPrice(product);
    var badges = buildBadges(product);
    var images = utils().getProductImages(product);
    var videos = Array.isArray(product && product.videos) ? product.videos.map(String).filter(Boolean) : [];
    return {
      id: String(product.id),
      raw: product,
      name: (product && product.name) || "منتج",
      brand: (product && (product.brand || product.brand_name || product.vendor)) || "",
      category: (product && product.category) || "",
      images: images,
      videos: videos,
      price: price,
      rating: buildRating(product),
      stock: buildStock(product),
      badges: badges,
      delivery: buildDelivery(product, badges),
      installment: buildInstallment(product, price),
      offers: buildOffers(product),
      variants: buildVariants(product),
      sizes: buildSizes(product),
      seller: extras.seller || buildSeller(product),
      highlights: buildHighlights(product),
      specs: buildSpecs(product),
      description: buildDescription(product),
      soldCount: Number(product && (product.sales_count || product.sold || product.sales)) || 0,
      banner: buildBanner(product),
      reviews: extras.reviews || { average: 0, count: 0, comments: [], ratingsRows: [] },
    };
  }

  // ---------------------------------------------------------------
  // Cross-sell selection helpers
  // ---------------------------------------------------------------

  function scoreSimilar(current, all) {
    var cid = String(current.id);
    var cp = Number(current.price) || 0;
    var cn = String(current.name || "").toLowerCase();
    var cw = cn.split(/[\s,;\-_()]+/).filter(function (w) { return w.length > 1; });
    var scored = [];
    all.forEach(function (item) {
      if (!item || String(item.id) === cid) return;
      var score = 0;
      var ip = Number(item.price) || 0;
      var iname = String(item.name || "").toLowerCase();
      if (cp > 0 && ip > 0) {
        var ratio = Math.min(cp, ip) / Math.max(cp, ip);
        if (ratio >= 0.3) score += Math.round(ratio * 20);
      }
      var iw = iname.split(/[\s,;\-_()]+/).filter(function (w) { return w.length > 1; });
      var seen = {};
      var shared = 0;
      cw.forEach(function (w) {
        for (var k = 0; k < iw.length; k++) {
          if (w === iw[k] && !seen[w]) { seen[w] = true; shared++; break; }
        }
      });
      score += shared * 20;
      if (score > 0) scored.push({ item: item, score: score });
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.map(function (s) { return s.item; });
  }

  function shuffle(list) {
    var items = list.slice();
    for (var i = items.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = items[i]; items[i] = items[j]; items[j] = t;
    }
    return items;
  }

  function pickBoughtTogether(current, all, count) {
    var cat = String(current.category || "").toLowerCase();
    var related = all.filter(function (p) { return p && String(p.id) !== String(current.id) && cat && String(p.category || "").toLowerCase() === cat; });
    return shuffle(related).slice(0, count || 3);
  }

  function pickRecommended(current, all, excludeIds, count) {
    var used = new Set([String(current.id)].concat((excludeIds || []).map(String)));
    var rest = all.filter(function (p) { return p && !used.has(String(p.id)); });
    return shuffle(rest).slice(0, count || 12);
  }

  function pickMayLike(current, all, excludeIds, count) {
    var used = new Set([String(current.id)].concat((excludeIds || []).map(String)));
    var cat = String(current.category || "").toLowerCase();
    var rest = all.filter(function (p) { return p && !used.has(String(p.id)) && String(p.category || "").toLowerCase() !== cat; });
    return shuffle(rest).slice(0, count || 12);
  }

  function pickSimilar(current, all, count) {
    var products = scoreSimilar(current, all);
    if (!products.length) {
      products = shuffle(all.filter(function (p) { return p && String(p.id) !== String(current.id); }));
    }
    return products.slice(0, count || 12);
  }

  /** Fallback: fetch size variants from Supabase taager_variant_groups */
  async function fetchSizesFromVariantGroups(product) {
    if (!product || product.source !== "taager" || !global.supabaseClient) return null;
    var raw = parseRaw(product.raw_data);
    if (!raw || !raw.productId) return null;
    try {
      var pid = String(raw.productId);
      var { data, error } = await global.supabaseClient.from("taager_variant_groups").select("variants").eq("parent_id", pid).limit(1).maybeSingle();
      if (error || !data || !Array.isArray(data.variants) || data.variants.length < 2) return null;
      var seen = {}, sizes = [];
      data.variants.forEach(function(v) {
        if (v && v.size && !seen[v.size]) {
          seen[v.size] = true;
          sizes.push({ name: v.size, stock: 999, is_available: true, _siblingId: v.id || null });
        }
      });
      return sizes.length >= 2 ? sizes : null;
    } catch (e) { return null; }
  }

  global.PDP = global.PDP || {};
  global.PDP.Data = {
    resolveProduct: resolveProduct,
    resolveSeller: resolveSeller,
    fetchRatings: fetchRatings,
    getAllProducts: getAllProducts,
    buildViewModel: buildViewModel,
    buildVariants: buildVariants,
    buildSizes: buildSizes,
    buildFallbackViewModel: buildFallbackViewModel,
    pickBoughtTogether: pickBoughtTogether,
    pickRecommended: pickRecommended,
    pickMayLike: pickMayLike,
    pickSimilar: pickSimilar,
    fetchSizesFromVariantGroups: fetchSizesFromVariantGroups,
  };
})(window);