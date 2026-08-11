/* ============================================
   Home Page — Config-driven Section Renderer
   Preserves all data/API logic
   ============================================ */

// ========== CONFIG ==========
var HOME_CONFIG = {
  // Banners array — images, links, sizes
  banners: [
    {
      url: "../assets/images/Home/635dfc4a-f491-4ddc-b387-779481dcd825_20260630152617.png",
      link: "category.html?cat=beauty-and-care",
      size: "wide",
    },
    {
      url: "../assets/images/Home/ar_mb_eg-top-01_(14).1781699877.4536443_20260701034725.png",
      link: "category.html?cat=phones",
      size: "half",
    },
    {
      url: "../assets/images/Home/ar_mb_eg-sfu-01.1781687106.8404653_20260701054336.png",
      link: "category.html?cat=headphones",
      size: "half",
    },
    {
      url: "../assets/images/Home/ar_mb_eg-sfu-01_(36).1779700929.093184_20260701054401.png",
      link: "category.html?cat=sports",
      size: "wide",
    },
    {
      url: "../assets/images/Home/ar_mb_eg-ump-01_(2).1782398198.6748698_20260701054420.png",
      link: "products.html",
      size: "wide",
    },
    {
      url: "../assets/images/Home/ar_mb_eg-sfu-01_(14).1782231635.9679332_20260701054344.png",
      link: "products.html",
      size: "half",
    },
    {
      url: "../assets/images/Home/ar_mb_eg-sfu-01.1782196424.5733478_20260701065112.png",
      link: "products.html",
      size: "half",
    },
  ],
  // Hero slides
  heroSlides: [
    {
      img: "../assets/images/Home/b4962b5d-b1ac-403b-b7fe-5fa53bf556b4_20260703174859.png",
    },
    {
      img: "",
      link: "category.html?cat=beauty-and-care",
    },
    { img: "../assets/images/Home/ChatGPT Image Jul 4, 2026, 05_06_56 AM.png" },
    {
      img: "",
      link: "category.html?cat=phones",
    },
    { img: "../assets/images/Home/Jul 4, 2026, 05_00_52 AM.png" },
    {
      img: "",
      link: "category.html?cat=headphones",
    },
    { img: "../assets/images/Home/ChatGPT Image Jul 4, 2026, 05_04_03 AM.png" },
    {
      img: "",
      link: "category.html?cat=sports",
    },
    {
      img: "../assets/images/Home/ChatGPT Image Jul 4, 2026, 04_06_37 AM - Copy.png",
    },
  ],
  // Categories — curated product images matching each category
  categories: [
    {
      name: "إلكترونيات",
      img: "../assets/images/categories/electronics.png",
      link: "category.html?cat=electronics",
    },
    {
      name: "موبايلات",
      img: "",
      link: "category.html?cat=phones",
    },
    {
      name: "ملابس وأحذية",
      img: "../assets/images/categories/fashion.png",
      link: "category.html?cat=clothes",
    },
    {
      name: "تجميل وعناية",
      img: "../assets/images/categories/beauty.png",
      link: "category.html?cat=beauty-and-care",
    },
    {
      name: "عطور",
      img: "../assets/images/categories/perfume.jpg",
      link: "category.html?cat=perfume",
    },
    {
      name: "رياضة",
      img: "../assets/images/categories/sports.png",
      link: "category.html?cat=sports",
    },
    {
      name: "منزل ومطبخ",
      img: "",
      link: "category.html?cat=home",
    },
    {
      name: "ساعات",
      img: "../assets/images/categories/watches.png",
      link: "category.html?cat=watches",
    },
    {
      name: "سماعات",
      img: "../assets/images/categories/headphones.png",
      link: "category.html?cat=headphones",
    },
    {
      name: "ألعاب",
      img: "",
      link: "category.html?cat=toys",
    },
    {
      name: "أطفال",
      img: "",
      link: "category.html?cat=baby",
    },
    {
      name: "أثاث وديكور",
      img: "",
      link: "category.html?cat=furniture",
    },
    {
      name: "مكتب ودراسة",
      img: "",
      link: "category.html?cat=office",
    },
    {
      name: "كاميرات",
      img: "",
      link: "category.html?cat=cameras",
    },
    {
      name: "مجوهرات",
      img: "",
      link: "category.html?cat=jewelry",
    },
    {
      name: "هدايا",
      img: "",
      link: "category.html?cat=gifts",
    },
  ],
  // Brands
  brands: [
    {
      name: "نايك",
      img: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg",
      link: "#",
    },
    {
      name: "أديداس",
      img: "https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg",
      link: "#",
    },
    {
      name: "أبل",
      img: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
      link: "#",
    },
    {
      name: "لوريال",
      img: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 80'%3E%3Crect width='220' height='80' rx='14' fill='%23ffffff'/%3E%3Crect x='24' y='20' width='40' height='40' rx='8' fill='%23f5d9b0'/%3E%3Cpath d='M44 30c8 0 14 6 14 14s-6 14-14 14-14-6-14-14 6-14 14-14z' fill='%23d48f1d'/%3E%3Ctext x='78' y='49' font-size='30' font-family='Georgia, serif' font-weight='700' fill='%23111'%3ELoreal%3C/text%3E%3C/svg%3E",
      link: "#",
    },
    {
      name: "باناسونيك",
      img: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 80'%3E%3Crect width='240' height='80' rx='14' fill='%23ffffff'/%3E%3Crect x='26' y='20' width='44' height='40' rx='10' fill='%230b5cff'/%3E%3Ccircle cx='48' cy='40' r='10' fill='%23ffffff'/%3E%3Ctext x='86' y='49' font-size='28' font-family='Arial, sans-serif' font-weight='700' fill='%23111'%3EPanasonic%3C/text%3E%3C/svg%3E",
      link: "#",
    },
    {
      name: "فيليبس",
      img: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 80'%3E%3Crect width='220' height='80' rx='14' fill='%23ffffff'/%3E%3Ccircle cx='48' cy='40' r='18' fill='%23007bff'/%3E%3Ccircle cx='48' cy='40' r='8' fill='%23ffffff'/%3E%3Ctext x='84' y='49' font-size='28' font-family='Arial, sans-serif' font-weight='700' fill='%23111'%3EPHILIPS%3C/text%3E%3C/svg%3E",
      link: "#",
    },
  ],
  // Section order — types: hero, banner, categories, brands, offers, for-you, category-products, daily, random, taager-extra, shein-trend, shein-style, shein-deal
  sections: [
    { type: "banner", index: 0 },
    { type: "hero" },
    { type: "categories" },
    { type: "features" },
    { type: "mega-offers", id: "hm-mega-offers" },
    { type: "banner", index: 1 },
    {
      type: "shein-trend",
      id: "hm-trend-1",
      title: "اختيار الجميع",
      badge: "تريند",
    },
    { type: "banner", index: 2 },
    {
      type: "smart-categories",
      id: "hm-smart-cats",
      title: "تسوق حسب الفئة",
    },
    {
      type: "offers",
      id: "hm-offers",
      title: "عروض لك",
      subtitle: "خصم أكبر من 30%",
    },
    { type: "for-you", id: "hm-for-you", title: "قد يعجبك" },
    {
      type: "shein-deal",
      id: "hm-sdeal-1",
      title: "عرض مميز",
      discountFilter: 40,
    },
    { type: "banner", index: 3 },
    {
      type: "category-products",
      id: "hm-beauty",
      title: "روتين جمالك يبدأ هنا",
      mapKey: "beauty-products",
    },
    {
      type: "category-products",
      id: "hm-electronics",
      title: "تقنية وصوت بجودة أعلى",
      mapKey: "electronics-products",
    },
    { type: "banner", index: 4 },
    { type: "brands" },
    { type: "daily", id: "hm-daily", title: "اكتشافات جديدة كل يوم" },
    {
      type: "shein-trend",
      id: "hm-trend-2",
      title: "الأكثر طلباً",
      badge: "مبيعاً",
    },
    {
      type: "shein-new",
      id: "hm-new-1",
      title: "جديدنا",
      badge: "جديد",
    },
    { type: "random", id: "hm-random", title: "مفاجآت تستحق التجربة" },
    {
      type: "taager-extra",
      id: "hm-extra-1",
      title: "خصومات قوية ومميزة",
      sortKey: "discount",
    },
    {
      type: "taager-extra",
      id: "hm-extra-2",
      title: "منتجات تحظى بأعلى التقييمات",
      sortKey: "rating",
    },
    { type: "banner", index: 5 },
    {
      type: "shein-deal",
      id: "hm-sdeal-2",
      title: " تخفيضات نهاية الأسبوع",
      discountFilter: 30,
    },
    { type: "banner", index: 6 },
    {
      type: "taager-extra",
      id: "hm-extra-3",
      title: "اختيارات بأسعار معقولة",
      sortKey: "price",
    },
    {
      type: "taager-extra",
      id: "hm-extra-4",
      title: "تجارب متنوعة من المنتجات",
      sortKey: "random",
    },
    { type: "banner", index: 7 },
  ],
};

// Override banners from config
window.__HOME_BANNER_INDEX = 0;

// ========== CONSTANTS (kept from original) ==========
const CATEGORY_MAP = {
  "beauty-products": [
    "منتجات تجميل وعناية",
    "جمال وعناية",
    "beauty-and-care",
    "beauty",
    "تجميل",
    "عناية",
    "skincare",
    "makeup",
    "مكياج",
    "عطر",
    "perfume",
    "كريم",
    "cream",
  ],
  "electronics-products": [
    "سماعة",
    "سماعات",
    "سماعات رأس",
    "سماعة رأس",
    "headphone",
    "headphones",
    "earphone",
    "earphones",
    "earbuds",
    "airpods",
    "headset",
    "هاندز فري",
    "سماعة بلوتوث",
    "سماعة لاسلكية",
    "wireless earphone",
    "speaker",
    "speakers",
    "ميكروفون",
    "microphone",
    "bluetooth earphone",
    "سماعة أذن",
    "سماعة رياضية",
    "سماعة محمولة",
  ],
};
const ARABIC_CATEGORY_MAP = {
  phones: "هواتف",
  watches: "ساعات",
  keyboards: "لوحات مفاتيح",
  headphones: "سماعات رأس",
  children: "ملابس أطفال",
  clothes: "ملابس أطفال",
  "beauty-and-care": "منتجات تجميل وعناية",
  sports: "منتجات رياضية",
};
const HOME_SUPABASE_BACKOFF_MS = 5 * 60 * 1000;
const RANDOM_PRODUCTS_ROTATION_MS = 40 * 1000;
const TAAGER_EXTRA_ROTATION_MS = 15 * 1000;
const RANDOM_PRODUCTS_COUNT = 10;
const TODAY_PRODUCTS_COUNT = 13;
const DAILY_PRODUCTS_COUNT = 8;
const HOME_PRODUCTS_SOURCE_CACHE_MS = 45 * 1000;
let randomProductsRotationTimer = null;
let lastRandomProductIds = [];
let taagerExtraRotationOffset = 0;
let taagerExtraRotationTimer = null;
let homeSourceCache = [];
let homeSourceCacheTimestamp = 0;

// ========== UTILITY FUNCTIONS (unchanged from original) ==========
function isNetworkResolutionError(error) {
  var m = String(error?.message || error?.details || "").toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("err_name_not_resolved") ||
    m.includes("networkerror") ||
    m.includes("network request failed")
  );
}
function isHomeSupabaseBackoffActive() {
  return Number(window.__Buda_SUPABASE_UNAVAILABLE_UNTIL || 0) > Date.now();
}
function markHomeSupabaseBackoff() {
  window.__Buda_SUPABASE_UNAVAILABLE_UNTIL =
    Date.now() + HOME_SUPABASE_BACKOFF_MS;
}
function getSupabaseProductsClient() {
  if (window.getSupabaseClient) return window.getSupabaseClient();
  if (window.supabaseClient && typeof window.supabaseClient.from === "function")
    return window.supabaseClient;
  if (window.supabase && typeof window.supabase.createClient === "function")
    return window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY,
    );
  return null;
}
async function annotateProductsWithSupabaseRatings(products) {
  if (!Array.isArray(products) || !products.length) return products;
  var markAsRatingsSource = function (list) {
    return list.map(function (p) {
      return Object.assign({}, p, {
        rating: 0,
        reviewCount: 0,
        ratingSource: "ratings",
        rating_source: "ratings",
        hasSupabaseRatings: true,
      });
    });
  };
  var client = getSupabaseProductsClient();
  if (!client) return markAsRatingsSource(products);
  var ids = products
    .map(function (p) {
      return String(p?.id || "").trim();
    })
    .filter(function (id) {
      return id !== "";
    });
  if (!ids.length) return markAsRatingsSource(products);
  try {
    var ratingMap = {};
    var chunkSize = 100;
    var chunks = [];
    for (var i = 0; i < ids.length; i += chunkSize) {
      chunks.push(ids.slice(i, i + chunkSize));
    }
    var results = await Promise.all(chunks.map(function(chunk) {
      return client.from("ratings").select("item_id,rating").in("item_id", chunk);
    }));
    for (var ri = 0; ri < results.length; ri++) {
      var result = results[ri];
      if (result.error) {
        console.warn("ratings fetch error", result.error);
        continue;
      }
      if (Array.isArray(result.data)) {
        result.data.forEach(function (row) {
          var itemId = String(row.item_id || "");
          var v = Number(row.rating) || 0;
          if (!itemId || v <= 0) return;
          if (!ratingMap[itemId]) ratingMap[itemId] = [];
          ratingMap[itemId].push(v);
        });
      }
    }
    return products.map(function (product) {
      var itemId = String(product?.id || "");
      var values = ratingMap[itemId] || [];
      if (!values.length)
        return Object.assign({}, product, {
          rating: 0,
          reviewCount: 0,
          ratingSource: "ratings",
          rating_source: "ratings",
          hasSupabaseRatings: true,
        });
      var avg = Number(
        (
          values.reduce(function (t, v) {
            return t + v;
          }, 0) / values.length
        ).toFixed(1),
      );
      return Object.assign({}, product, {
        rating: avg,
        reviewCount: values.length,
        ratingSource: "ratings",
        rating_source: "ratings",
        hasSupabaseRatings: true,
      });
    });
  } catch (e) {
    console.warn("ratings error", e);
    return markAsRatingsSource(products);
  }
}
function normalizeProducts(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter(function (row) {
      return row && typeof row.id !== "undefined" && row.id !== null;
    })
    .map(function (row) {
      if (window.addProductToStore) window.addProductToStore(row);
      return row;
    });
}
function formatMoney(value) {
  return window.BudaStore
    ? window.BudaStore.formatMoney(value)
    : (Number(value) || 0).toFixed(2);
}
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function getImage(product) {
  var candidates = window.BudaStore?.getProductImages
    ? window.BudaStore.getProductImages(product)
    : [product?.image || "assets/images/unnamed.png"];
  var primary = candidates[0] || "assets/images/unnamed.png";
  return window.BudaStore?.getImagePath
    ? window.BudaStore.getImagePath(primary)
    : primary;
}
function getGalleryImages(product) {
  var candidates = window.BudaStore?.getProductImages
    ? window.BudaStore.getProductImages(product)
    : [product?.image || "assets/images/unnamed.png"];
  return candidates.map(function (path) {
    return window.BudaStore?.getImagePath
      ? window.BudaStore.getImagePath(path)
      : path;
  });
}
function resolvePrice(product) {
  var supplierPrice = Number(product?.price) || 0;
  var sellingPrice = supplierPrice;
  if (window.PricingEngine && window.PricingEngine.tiersLoaded) {
    sellingPrice = window.PricingEngine.calculate(supplierPrice);
  }
  if (window.BudaStore?.resolveProductPrice) {
    var r = window.BudaStore.resolveProductPrice(product);
    var basePrice = r.currentPrice > 0 ? r.currentPrice : supplierPrice;
    var finalPrice = basePrice;
    if (window.PricingEngine && window.PricingEngine.tiersLoaded) {
      finalPrice = window.PricingEngine.calculate(basePrice);
    }
    var hasDiscount = r.hasDiscount || r.originalPrice > finalPrice;
    var origPrice =
      r.originalPrice > finalPrice
        ? r.originalPrice
        : hasDiscount
          ? finalPrice * 1.25
          : finalPrice;
    return {
      finalPrice: finalPrice,
      originalPrice: origPrice,
      hasDiscount: hasDiscount,
      discountPercent: hasDiscount
        ? Math.round(((origPrice - finalPrice) / origPrice) * 100)
        : 0,
    };
  }
  return {
    finalPrice: sellingPrice,
    originalPrice: sellingPrice,
    hasDiscount: false,
    discountPercent: 0,
  };
}
function resolveRating(product) {
  if (window.BudaStore?.resolveProductRating) {
    var r = window.BudaStore.resolveProductRating(product);
    return { rating: r.rating > 0 ? r.rating : 0, reviews: r.reviewCount };
  }
  return { rating: 0, reviews: 0 };
}
function shuffleProducts(products) {
  var items = [].concat(products);
  for (var i = items.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}
function pickRandomProducts(products, count, excludedIds) {
  var list = Array.isArray(products)
    ? products.filter(function (p) {
        return p && typeof p.id !== "undefined" && p.id !== null;
      })
    : [];
  if (!list.length) return [];
  var limit = Math.min(count, list.length);
  var excluded = new Set(
    (excludedIds || []).map(function (id) {
      return String(id);
    }),
  );
  var filtered = list.filter(function (p) {
    return !excluded.has(String(p.id));
  });
  return shuffleProducts(filtered.length >= limit ? filtered : list).slice(
    0,
    limit,
  );
}
function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}
function toProductTimestamp(product) {
  var raw =
    product?.created_at || product?.createdAt || product?.updated_at || "";
  var parsed = Date.parse(String(raw || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
function getProductSearchText(product) {
  var parts = [
    product.name,
    product.title,
    product.description,
    product.category,
    product.brand,
    product.type,
  ];
  if (Array.isArray(product.tags)) parts = parts.concat(product.tags);
  if (Array.isArray(product.categories))
    parts = parts.concat(product.categories);
  return normalizeText(parts.filter(Boolean).join(" "));
}
function filterProductsBySearchTerm(products, term) {
  var normalizedTerm = normalizeText(term || "");
  if (!normalizedTerm) return [].concat(products);
  return products.filter(function (p) {
    return getProductSearchText(p).includes(normalizedTerm);
  });
}
function filterProductsByCategoryCandidates(products, candidates) {
  var tokens = (candidates || [])
    .map(function (v) {
      return normalizeText(v);
    })
    .filter(Boolean);
  if (!tokens.length) return [];
  return products.filter(function (p) {
    var haystack = normalizeText(p?.category) + " " + normalizeText(p?.name);
    return tokens.some(function (t) {
      return haystack.includes(t);
    });
  });
}
function selectTodayProducts(products, term) {
  var filtered = filterProductsBySearchTerm(products, term);
  if (!filtered.length) return [];
  var startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  var todayStartMs = startOfToday.getTime();
  var withTs = filtered
    .map(function (p) {
      return { product: p, timestamp: toProductTimestamp(p) };
    })
    .filter(function (e) {
      return e.timestamp > 0;
    });
  var todayProducts = withTs
    .filter(function (e) {
      return e.timestamp >= todayStartMs;
    })
    .sort(function (a, b) {
      return b.timestamp - a.timestamp;
    })
    .map(function (e) {
      return e.product;
    });
  if (todayProducts.length) return todayProducts.slice(0, TODAY_PRODUCTS_COUNT);
  if (withTs.length)
    return withTs
      .sort(function (a, b) {
        return b.timestamp - a.timestamp;
      })
      .slice(0, TODAY_PRODUCTS_COUNT)
      .map(function (e) {
        return e.product;
      });
  return filtered.slice(0, TODAY_PRODUCTS_COUNT);
}
function selectDailyProducts(products) {
  if (!products.length) return [];
  var limit = Math.min(DAILY_PRODUCTS_COUNT, products.length);
  var seed = Math.floor(Date.now() / 86400000);
  var picks = [];
  for (var i = 0; i < limit; i++)
    picks.push(products[(seed + i) % products.length]);
  return picks;
}
function isWishlistedProduct(productId) {
  return window.BudaStore?.isInWishlist
    ? window.BudaStore.isInWishlist(productId)
    : false;
}
function setWishlistButtonState(button, active) {
  if (!button) return;
  var icon = button.querySelector(".material-icons-outlined");
  button.classList.toggle("is-active", Boolean(active));
  button.setAttribute("aria-pressed", active ? "true" : "false");
  if (icon) icon.textContent = active ? "favorite" : "favorite_border";
}
function syncWishlistButtons(container) {
  (container || document)
    .querySelectorAll("[data-wishlist]")
    .forEach(function (button) {
      setWishlistButtonState(
        button,
        isWishlistedProduct(button.getAttribute("data-wishlist")),
      );
    });
}

// ========== FETCH DATA ==========
async function fetchSupabaseProducts(filter) {
  if (isHomeSupabaseBackoffActive()) return [];
  var q = String(filter || "").trim().toLowerCase();
  var mapped = q ? ARABIC_CATEGORY_MAP[q] : null;
  var data = null;
  if (!window.__productsProxyUnavailable) {
    try {
      var url = "/api/products";
      if (mapped) url += "?filter=" + encodeURIComponent(mapped);
      var res = await fetch(url);
      if (res.ok) data = await res.json();
      else window.__productsProxyUnavailable = true;
    } catch (e) {
      window.__productsProxyUnavailable = true;
      console.warn("cache proxy failed, falling back:", e);
    }
  }
  if (!data) {
    var client = getSupabaseProductsClient();
    if (!client || typeof client.from !== "function") return [];
    try {
      if (typeof window.supabaseClient?.fetchAllProducts === "function") {
        data = await window.supabaseClient.fetchAllProducts();
      } else {
        var query = client.from("products").select("*");
        if (mapped) query = query.eq("category", mapped);
        var result = await query.order("created_at", { ascending: false });
        if (result.error) {
          if (isNetworkResolutionError(result.error)) markHomeSupabaseBackoff();
          console.warn("fetch error:", result.error);
          return [];
        }
        data = result.data;
      }
    } catch (e) {
      if (isNetworkResolutionError(e)) markHomeSupabaseBackoff();
      console.warn("fetch failed:", e);
      return [];
    }
  }
  var matched = normalizeProducts(data);
  var needsRatings = !matched.length || !matched.some(function (p) { return p.hasSupabaseRatings; });
  var enriched = needsRatings ? await annotateProductsWithSupabaseRatings(matched) : matched;
  if (window.addProductToStore)
    enriched.forEach(function (p) {
      window.addProductToStore(p);
    });
  if (window.TaagerIntegration) {
    var cc = (window.TaagerIntegration.getSelectedCountry() || {}).code;
    var tp = await window.TaagerIntegration.fetchTaagerProducts(cc);
    window.TaagerIntegration.mergeTaagerIntoStore(tp);
    enriched.push.apply(enriched, tp);
    var filtered = window.TaagerIntegration.filterByCountry(enriched, cc);
    if (filtered.length) enriched = filtered;
  }
  var currentCountry = (window.TaagerIntegration?.getSelectedCountry?.() || {}).code || "EG";
  enriched = filterProductsByCountry(enriched, currentCountry);
  if (q) return filterProductsBySearchTerm(enriched, q);
  return enriched;
}

// Filter products by country code (EG/SA)
function filterProductsByCountry(products, countryCode) {
  if (!Array.isArray(products)) return [];
  var cc = (countryCode || "EG").toUpperCase();
  if (window.TaagerIntegration && typeof window.TaagerIntegration.filterProductsByCountry === "function") {
    return window.TaagerIntegration.filterProductsByCountry(products, cc);
  }
  return products.filter(function(p) {
    var pCountry = (p?.country || p?.country_code || "").toUpperCase();
    if (!pCountry) return true;
    return pCountry === cc;
  });
}
function getLocalProducts() {
  var cc = (window.TaagerIntegration?.getSelectedCountry?.() || {}).code || "EG";
  return window.BudaStore?.getAllProducts
    ? normalizeProducts(
        Object.values(window.BudaStore.getAllProducts()).filter(Boolean).filter(function(p) {
          if (window.TaagerIntegration && typeof window.TaagerIntegration.matchesCountry === "function") {
            return window.TaagerIntegration.matchesCountry(p, cc);
          }
          var pCountry = (p?.country || p?.country_code || "").toUpperCase();
          if (!pCountry) return true;
          return pCountry === cc.toUpperCase();
        })
      )
    : [];
}
function invalidateHomeProductsSourceCache() {
  homeSourceCache = [];
  homeSourceCacheTimestamp = 0;
}
async function getHomeSourceProducts(options) {
  var forceRefresh = Boolean(options?.forceRefresh);
  var now = Date.now();
  if (
    !forceRefresh &&
    homeSourceCache.length &&
    now - homeSourceCacheTimestamp < HOME_PRODUCTS_SOURCE_CACHE_MS
  )
    return [].concat(homeSourceCache);
  var products = await fetchSupabaseProducts("");
  if (!products.length) products = getLocalProducts();
  // Filter products by current country
  var currentCountry = (window.TaagerIntegration?.getSelectedCountry?.() || {}).code || "EG";
  products = filterProductsByCountry(products, currentCountry);
  // Enrich products with originalPrice from store database
  var _storeAll = window.BudaStore?.getAllProducts ? window.BudaStore.getAllProducts() : {};
  products = products.map(function(p) {
    var _sp = _storeAll[p.id];
    if (_sp && (_sp.originalPrice > (Number(p.price) || 0))) {
      if (!p.originalPrice || Number(p.originalPrice) <= Number(p.price)) {
        p.originalPrice = _sp.originalPrice;
      }
    }
    return p;
  });
  homeSourceCache = normalizeProducts(products);
  homeSourceCacheTimestamp = now;
  return [].concat(homeSourceCache);
}

// ========== BUILD PRODUCT CARD ==========
function buildProductCard(product) {
  var rp = resolvePrice(product);
  if (!rp.hasDiscount) {
    var _rawOrig = Number(product.originalPrice || product.old_price || product.price_before_discount || 0);
    if (_rawOrig > 0 && _rawOrig > rp.finalPrice) {
      rp = {
        finalPrice: rp.finalPrice,
        originalPrice: _rawOrig,
        hasDiscount: true,
        discountPercent: Math.round(((_rawOrig - rp.finalPrice) / _rawOrig) * 100),
      };
    }
  }
  var rr = resolveRating(product);
  var images = getGalleryImages(product);
  var id = String(product.id);
  var isWish = isWishlistedProduct(id);
  var fb = window.BudaStore?.getImagePath
    ? window.BudaStore.getImagePath(
        window.BudaStore.DEFAULT_PRODUCT_IMAGE || "assets/images/unnamed.png",
      )
    : "../assets/images/unnamed.png";
  var imgs = "",
    dots = "",
    counter = "";
  for (var gi = 0; gi < images.length; gi++) {
    var imgLoad = gi === 0 ? ' loading="eager" fetchpriority="high" decoding="async"' : ' loading="lazy" decoding="async"';
    imgs +=
      '<img class="noon-gallery-img' +
      (gi === 0 ? " active" : "") +
      '" src="' +
      images[gi] +
      '" alt="' +
      escapeHtml(product.name || "منتج") +
      '"' + imgLoad + ' onerror="this.onerror=null;this.src=\'' +
      fb +
      "'\" />";
    if (images.length > 1)
      dots +=
        "<span" +
        (gi === 0 ? ' class="active"' : "") +
        ' data-index="' +
        gi +
        '"></span>';
  }
  if (images.length > 1) {
    counter = '<span class="noon-img-counter"><span class="noon-img-current">1</span>/<span class="noon-img-total">' + images.length + '</span></span>';
  }
  var sellerName = product.seller || product.brand || "";
  var hasFreeShipping = product.free_shipping || product.freeShipping || false;
  var hasInstallment = product.installment || product.installment_available || false;
  var isOfficial = product.official_store || product.is_official || false;
  return (
    '<article class="noon-product-card">' +
    '<div class="noon-product-media-wrap">' +
    (rp.hasDiscount && rp.discountPercent > 10
      ? '<span class="buda-badge">-' + rp.discountPercent + '%</span>'
      : "") +
    (isOfficial
      ? '<span class="buda-badge-official">المتجر الرسمي</span>'
      : "") +
    '<button class="icon-btn noon-wishlist-btn ' +
    (isWish ? "is-active" : "") +
    '" data-wishlist="' +
    id +
    '" aria-label="إضافة إلى المفضلة" aria-pressed="' +
    (isWish ? "true" : "false") +
    '">' +
    '<span class="material-icons-outlined" style="font-size:18px;">' +
    (isWish ? "favorite" : "favorite_border") +
    "</span></button>" +
    '<button class="noon-product-media" data-view-product="' + id +
    '" aria-label="عرض المنتج">' +
    '<div class="buda-pulse-dot" data-pulse-dot="' + id + '"><div class="buda-pulse-dot-inner"><div class="buda-pulse-dot-circle"></div></div></div>' +
    imgs +
    (dots ? '<span class="noon-img-dots">' + dots + "</span>" : "") +
    (counter) +
    "</button>" +
    (images.length > 1
      ? '<button class="noon-gallery-arrow noon-gallery-arrow-prev" data-gallery-prev="' +
        id +
        '" aria-label="السابق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button><button class="noon-gallery-arrow noon-gallery-arrow-next" data-gallery-next="' +
        id +
        '" aria-label="التالي"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>'
      : "") +
    '<button class="noon-add-square" data-add-to-cart="' +
    id +
    '" aria-label="إضافة إلى السلة">+</button></div>' +
    '<div class="noon-product-body">' +
    '<h4 class="noon-title">' +
    escapeHtml(product.name || "منتج") +
    "</h4>" +
    (sellerName ? '<div class="noon-seller">' + escapeHtml(sellerName) + "</div>" : "") +
    (rr.reviews > 0
      ? '<div class="noon-rating-pill"><span class="noon-rating-stars">★</span> <span>' +
        rr.rating.toFixed(1) +
        '</span> <span class="noon-rating-count">(' +
        rr.reviews +
        ")</span></div>"
      : "") +
    '<div class="noon-price-line">' +
    '<span class="noon-price">' +
    formatMoney(rp.finalPrice) +
    "</span>" +
    (rp.hasDiscount
      ? '<span class="noon-old-price">' + formatMoney(rp.originalPrice) + "</span>"
      : "") +
    (rp.hasDiscount
      ? '<span class="noon-discount-pill">' + rp.discountPercent + "%</span>"
      : "") +
    "</div>" +
    (hasFreeShipping
      ? '<div class="noon-delivery"><span class="material-icons-outlined" style="font-size:12px;">local_shipping</span> شحن مجاني</div>'
      : '<div class="noon-delivery"><span class="material-icons-outlined" style="font-size:12px;">local_shipping</span> توصيل سريع</div>') +
    (hasInstallment
      ? '<div class="noon-installment"><span class="material-icons-outlined" style="font-size:12px;">credit_card</span> تقسيط يبدأ من ' + formatMoney(rp.finalPrice / 6) + '/شهر</div>'
      : "") +
    "</div></article>"
  );
}

// ========== RE-RENDER PRICES AFTER TIERS LOAD ==========
document.addEventListener("boda:pricing-updated", function () {
  var cards = document.querySelectorAll(".noon-product-card");
  cards.forEach(function (card) {
    var pid = card.querySelector("[data-view-product]")?.getAttribute("data-view-product");
    if (!pid) return;
    var product = window.BudaStore?.getProductById
      ? window.BudaStore.getProductById(pid)
      : null;
    if (!product) return;
    var rp = resolvePrice(product);
    var priceEl = card.querySelector(".noon-price");
    var oldPriceEl = card.querySelector(".noon-old-price");
    var discountEl = card.querySelector(".noon-discount-pill");
    var installmentEl = card.querySelector(".noon-installment");
    if (priceEl) priceEl.textContent = formatMoney(rp.finalPrice);
    if (oldPriceEl) oldPriceEl.textContent = rp.hasDiscount ? formatMoney(rp.originalPrice) : "";
    if (discountEl) discountEl.textContent = rp.hasDiscount ? rp.discountPercent + "%" : "";
    if (installmentEl) installmentEl.textContent = " تقسيط يبدأ من " + formatMoney(rp.finalPrice / 6) + "/شهر";
  });
});
function navigateToProduct(pid) {
  if (!pid) return;
  var selected = window.BudaStore?.getProductById
    ? window.BudaStore.getProductById(pid)
    : null;
  if (selected) {
    try {
      sessionStorage.setItem(
        "selectedProduct",
        encodeURIComponent(JSON.stringify(selected)),
      );
    } catch {}
  }
  window.location.href = "product.html?id=" + encodeURIComponent(pid);
}

function openGalleryViewer(productId, startIndex) {
  var p = window.BudaStore?.getProductById
    ? window.BudaStore.getProductById(productId)
    : null;
  if (!p) return;
  var images = window.BudaStore?.getProductImages
    ? window.BudaStore.getProductImages(p)
    : [];
  if (images.length < 2) return;
  var current = Math.max(0, Math.min(startIndex || 0, images.length - 1));

  var overlay = document.createElement("div");
  overlay.className = "noon-gallery-overlay";
  overlay.innerHTML =
    '<div class="noon-gallery-overlay-inner">' +
    '<button class="noon-gallery-overlay-close" aria-label="إغلاق">&times;</button>' +
    '<div class="noon-gallery-overlay-main">' +
    '<button class="noon-gallery-overlay-arrow noon-gallery-overlay-prev" aria-label="السابق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>' +
    '<div class="noon-gallery-overlay-image-wrap">' +
    images.map(function(src, i) {
      return '<img src="' + src + '" alt="" class="noon-gallery-overlay-img' + (i === current ? ' active' : '') + '" data-index="' + i + '" />';
    }).join("") +
    '</div>' +
    '<button class="noon-gallery-overlay-arrow noon-gallery-overlay-next" aria-label="التالي"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>' +
    '</div>' +
    '<div class="noon-gallery-overlay-bottom">' +
    '<div class="noon-gallery-overlay-dots">' +
    images.map(function(_, i) {
      return '<span' + (i === current ? ' class="active"' : '') + ' data-index="' + i + '"></span>';
    }).join("") +
    '</div>' +
    '<div class="noon-gallery-overlay-counter"><span class="noon-gv-current">' + (current + 1) + '</span>/<span class="noon-gv-total">' + images.length + '</span></div>' +
    '</div></div>';

  document.body.appendChild(overlay);

  function updateGallery(idx) {
    if (idx < 0) idx = images.length - 1;
    if (idx >= images.length) idx = 0;
    current = idx;
    overlay.querySelectorAll(".noon-gallery-overlay-img").forEach(function(img, i) {
      img.classList.toggle("active", i === current);
    });
    overlay.querySelectorAll(".noon-gallery-overlay-dots span").forEach(function(s, i) {
      s.classList.toggle("active", i === current);
    });
    var counterEl = overlay.querySelector(".noon-gv-current");
    if (counterEl) counterEl.textContent = current + 1;
  }

  overlay.querySelector(".noon-gallery-overlay-close").addEventListener("click", function() {
    overlay.remove();
  });
  overlay.addEventListener("click", function(e) {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelector(".noon-gallery-overlay-prev").addEventListener("click", function() {
    updateGallery(current - 1);
  });
  overlay.querySelector(".noon-gallery-overlay-next").addEventListener("click", function() {
    updateGallery(current + 1);
  });
  overlay.querySelectorAll(".noon-gallery-overlay-dots span").forEach(function(s) {
    s.addEventListener("click", function() {
      var idx = parseInt(s.getAttribute("data-index"), 10);
      if (!isNaN(idx)) updateGallery(idx);
    });
  });
  document.addEventListener("keydown", function keyHandler(e) {
    if (!document.body.contains(overlay)) {
      document.removeEventListener("keydown", keyHandler);
      return;
    }
    if (e.key === "Escape") overlay.remove();
    if (e.key === "ArrowLeft") updateGallery(current - 1);
    if (e.key === "ArrowRight") updateGallery(current + 1);
  });
}

function updateCardCounter(wrap) {
  var counter = wrap && wrap.querySelector(".noon-img-counter .noon-img-current");
  if (!counter) return;
  var imgs = wrap.querySelectorAll(".noon-gallery-img");
  var active = -1;
  imgs.forEach(function(img, i) { if (img.classList.contains("active")) active = i; });
  if (active >= 0) counter.textContent = active + 1;
}

function attachProductCardEvents(container) {
  container.querySelectorAll("[data-add-to-cart]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.stopPropagation();
      var pid = b.getAttribute("data-add-to-cart");
      if (!window.BudaStore) return;
      var p = window.BudaStore.getProductById(pid);
      if (!p) return;
      window.BudaStore.addToCart(p, 1);
      window.BudaStore.updateCartCount();
      if (window.BudaUI) window.BudaUI.refreshShell();
    });
  });
  container.querySelectorAll("[data-view-product]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      if (e.target.closest(".noon-img-dots")) return;
      e.stopPropagation();
      var pid = b.getAttribute("data-view-product");
      navigateToProduct(pid);
    });
  });
  container.querySelectorAll(".noon-product-card").forEach(function (card) {
    card.addEventListener("click", function (e) {
      var target = e.target;
      if (
        target.closest("[data-add-to-cart]") ||
        target.closest("[data-wishlist]") ||
        target.closest(".noon-img-dots") ||
        target.closest("[data-view-product]")
      )
        return;
      var pid = card.querySelector("[data-view-product]")
        ?.getAttribute("data-view-product");
      navigateToProduct(pid);
    });
  });
  container.querySelectorAll("[data-wishlist]").forEach(function (b) {
    b.addEventListener("click", function () {
      var pid = b.getAttribute("data-wishlist");
      if (!window.BudaStore) return;
      setWishlistButtonState(b, window.BudaStore.toggleWishlist(pid));
    });
  });
  container.addEventListener("click", function (e) {
    var dot = e.target.closest(".noon-img-dots span");
    if (!dot) return;
    e.preventDefault();
    e.stopPropagation();
    var dots = dot.parentNode;
    var imgs = dots.parentNode.querySelectorAll(".noon-gallery-img");
    var idx = parseInt(dot.getAttribute("data-index"), 10);
    if (isNaN(idx)) return;
    dots.querySelectorAll("span").forEach(function (s) {
      s.classList.remove("active");
    });
    imgs.forEach(function (img) {
      img.classList.remove("active");
    });
    if (imgs[idx]) imgs[idx].classList.add("active");
    if (dots.children[idx]) dots.children[idx].classList.add("active");
    updateCardCounter(wrap = dots.parentNode.closest(".noon-product-media-wrap") || dots.parentNode);
  });
  // ---- Noon-style gallery arrows ----
  container.addEventListener("click", function (e) {
    var btn = e.target.closest(".noon-gallery-arrow-prev, .noon-gallery-arrow-next");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    var wrap = btn.closest(".noon-product-media-wrap");
    if (!wrap) return;
    var imgs = wrap.querySelectorAll(".noon-gallery-img");
    if (imgs.length < 2) return;
    var currentIdx = -1;
    imgs.forEach(function (img, i) {
      if (img.classList.contains("active")) currentIdx = i;
    });
    var nextIdx;
    if (btn.classList.contains("noon-gallery-arrow-next")) {
      nextIdx = currentIdx + 1 >= imgs.length ? 0 : currentIdx + 1;
    } else {
      nextIdx = currentIdx - 1 < 0 ? imgs.length - 1 : currentIdx - 1;
    }
    imgs.forEach(function (img) { img.classList.remove("active"); });
    if (imgs[nextIdx]) imgs[nextIdx].classList.add("active");
    var dots = wrap.querySelector(".noon-img-dots");
    if (dots) {
      var spans = dots.querySelectorAll("span");
      spans.forEach(function (s) { s.classList.remove("active"); });
      if (spans[nextIdx]) spans[nextIdx].classList.add("active");
    }
    updateCardCounter(wrap);
  });
  // ---- Noon-style hover auto-play & mobile swipe ----
  container.querySelectorAll(".noon-product-media-wrap").forEach(function (wrap) {
    var imgs = wrap.querySelectorAll(".noon-gallery-img");
    if (imgs.length < 2) return;
    var timer = null;
    var touchStartX = 0;
    var touchEndX = 0;
    function goTo(idx) {
      imgs.forEach(function (img) { img.classList.remove("active"); });
      if (imgs[idx]) imgs[idx].classList.add("active");
      var dots = wrap.querySelector(".noon-img-dots");
      if (dots) {
        var spans = dots.querySelectorAll("span");
        spans.forEach(function (s) { s.classList.remove("active"); });
        if (spans[idx]) spans[idx].classList.add("active");
      }
      updateCardCounter(wrap);
    }
    function nextImage() {
      var active = -1;
      imgs.forEach(function (img, i) { if (img.classList.contains("active")) active = i; });
      goTo(active + 1 >= imgs.length ? 0 : active + 1);
    }
    function resetToFirst() {
      if (timer) { clearInterval(timer); timer = null; }
      goTo(0);
    }
    wrap.addEventListener("mouseenter", function () {
      if (timer) { clearInterval(timer); timer = null; }
      timer = setInterval(nextImage, 1000);
    });
    wrap.addEventListener("mouseleave", function () {
      if (timer) { clearInterval(timer); timer = null; }
      goTo(0);
    });
    // Mobile swipe
    wrap.addEventListener("touchstart", function (e) {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    wrap.addEventListener("touchend", function (e) {
      touchEndX = e.changedTouches[0].screenX;
      var diff = touchStartX - touchEndX;
      var active = -1;
      imgs.forEach(function (img, i) { if (img.classList.contains("active")) active = i; });
      if (Math.abs(diff) > 30) {
        if (diff > 0) {
          goTo(active + 1 >= imgs.length ? 0 : active + 1);
        } else {
          goTo(active - 1 < 0 ? imgs.length - 1 : active - 1);
        }
      }
    }, { passive: true });
  });
  syncWishlistButtons(container);
}

// ========== SECTION RENDERER ==========
var HM = {};
HM.contentEl = null;
HM.allProducts = [];
HM.taagerOnly = [];
HM.sectionData = {}; // stores rendered data for each section id

// Banner size mapping
HM.bannerClass = function (size) {
  var map = {
    wide: "hm-banner-wide",
    half: "hm-banner-half",
    third: "hm-banner-third",
    small: "hm-banner-small",
    large: "hm-banner-large",
  };
  return map[size] || "hm-banner-half";
};

// Enable drag scroll on carousel
HM.enableCarouselDrag = function (container) {
  var dragData = { isDown: false, moved: false };
  var startX = 0,
    scrollLeft = 0;
  container.addEventListener("mousedown", function (e) {
    dragData.isDown = true;
    dragData.moved = false;
    container.classList.add("dragging");
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });
  container.addEventListener("mouseleave", function () {
    dragData.isDown = false;
    container.classList.remove("dragging");
  });
  container.addEventListener("mouseup", function () {
    dragData.isDown = false;
    container.classList.remove("dragging");
  });
  container.addEventListener("mousemove", function (e) {
    if (!dragData.isDown) return;
    e.preventDefault();
    var walk = (e.pageX - container.offsetLeft - startX) * 1.5;
    container.scrollLeft = scrollLeft - walk;
    if (Math.abs(walk) > 5) dragData.moved = true;
  });
  // Nav buttons
  var wrap = container.closest(".hm-carousel-wrap");
  if (!wrap) return;
  var prev = wrap.querySelector(".hm-carousel-nav.prev");
  var next = wrap.querySelector(".hm-carousel-nav.next");
  if (!prev || !next) return;
  function update() {
    prev.classList.toggle("visible", container.scrollLeft > 2);
    next.classList.toggle(
      "visible",
      container.scrollLeft < container.scrollWidth - container.clientWidth - 2,
    );
  }
  container.addEventListener("scroll", update);
  setTimeout(update, 100);
  function scrollByCard(dir) {
    var cards = container.querySelectorAll(".noon-product-card");
    if (!cards.length) return;
    container.scrollBy({
      left: dir * (cards[0].offsetWidth + 10),
      behavior: "smooth",
    });
  }
  prev.addEventListener("click", function () {
    scrollByCard(-1);
  });
  next.addEventListener("click", function () {
    scrollByCard(1);
  });
};

// Render a product carousel section
HM.renderProductCarousel = function (section, products) {
  if (!window.BudaStore || !HM.contentEl) return null;
  var list = normalizeProducts(products || []);
  var id = section.id || "hm-section-" + Math.random().toString(36).slice(2);
  var html =
    '<section class="hm-section hm-fade" id="sec-' +
    id +
    '">' +
    '<div class="hm-section-head">' +
    "<h2>" +
    escapeHtml(section.title || "") +
    "</h2>" +
    (section.viewAll
      ? '<a href="' + escapeHtml(section.viewAll) + '">/a>'
      : "") +
    "</div>" +
    '<div class="hm-section-body">' +
    '<div class="hm-carousel-wrap">' +
    '<button class="hm-carousel-nav prev" type="button" aria-label="السابق"><span class="material-icons-outlined">chevron_left</span></button>' +
    '<div class="hm-carousel" id="' +
    id +
    '"></div>' +
    '<button class="hm-carousel-nav next" type="button" aria-label="التالي"><span class="material-icons-outlined">chevron_right</span></button>' +
    "</div></div></section>";
  var temp = document.createElement("div");
  temp.innerHTML = html;
  var sectionEl = temp.firstElementChild;
  HM.contentEl.appendChild(sectionEl);
  var container = sectionEl.querySelector(".hm-carousel");
  if (!container) return null;
  if (!list.length) {
    sectionEl.style.display = "none";
    return null;
  }
  container.innerHTML = list
    .map(function (p) {
      return buildProductCard(p);
    })
    .join("");
  attachProductCardEvents(container);
  HM.enableCarouselDrag(container);
  return container;
};

// ========== RENDER SECTIONS ==========
HM.renderHero = function () {
  var slides = HOME_CONFIG.heroSlides;
  if (!slides || !slides.length) return;
  var bars = "";
  for (var bi = 0; bi < slides.length; bi++) {
    bars +=
      '<span class="hm-hero-bar' +
      (bi === 0 ? " active" : "") +
      '"><span class="hm-hero-bar-fill"></span></span>';
  }
  var slidesHtml = "";
  for (var si = 0; si < slides.length; si++) {
    var s = slides[si];
    slidesHtml +=
      '<div class="hm-hero-slide" data-idx="' +
      si +
      '">' +
      '<a href="' +
      escapeHtml(s.link || "#") +
      '">' +
      '<div class="hm-hero-slide-img"><div class="buda-pulse-dot"><div class="buda-pulse-dot-inner"><div class="buda-pulse-dot-circle"></div></div></div><img src="' +
      s.img +
      '" alt="" loading="' +
      (si === 0 ? "eager" : "lazy") +
      '" /></div>' +
      "</a></div>";
  }
  var html =
    '<div class="hm-hero-wrap hm-fade">' +
    '<div class="hm-hero" id="hm-hero">' +
    '<div class="hm-hero-track" id="hm-hero-track">' +
    slidesHtml +
    "</div>" +
    '<div class="hm-hero-bar-wrap">' +
    bars +
    "</div>" +
    "</div></div>";
  var temp = document.createElement("div");
  temp.innerHTML = html;
  HM.contentEl.appendChild(temp.firstElementChild);
};

HM.renderBanner = function (section) {
  var idx = section.index;
  var banner = HOME_CONFIG.banners[idx];
  if (!banner) return;
  var sizeClass = HM.bannerClass(banner.size);
  // Index 0 = top announcement banner
  if (idx === 0) {
    var html = '';
    var dyn = banner._dynamic;
    if (dyn && dyn.type === 'image_banner' && banner.url) {
      html = '<div class="hm-banner-top-wrap hm-fade" style="padding:0 16px 6px;">' +
        '<a href="' + escapeHtml(banner.link || '#') + '" style="display:block;border-radius:10px;overflow:hidden;">' +
        '<div class="hm-banner-img"><div class="buda-pulse-dot"><div class="buda-pulse-dot-inner"><div class="buda-pulse-dot-circle"></div></div></div><img src="' + banner.url + '" style="width:100%;display:block;border-radius:10px;" onerror="this.style.display=\'none\'" /></div>' +
        '</a></div>';
    } else if (dyn && dyn.type === 'icon_banner') {
      html = '<div class="hm-banner-top-wrap hm-fade">' +
        '<a class="hm-banner-top" href="' + escapeHtml(banner.link || '#') + '" style="background:' + (dyn.bg || '#f8f4ff') + ';border-color:' + (dyn.border || '#f3e8ff') + ';">' +
        '<span class="hm-banner-top-icon" style="background:' + (dyn.accentColor || '#7c3aed') + ';">' +
        '<span class="material-icons-outlined" style="font-size:18px;">' + (dyn.icon || 'local_shipping') + '</span></span>' +
        '<div class="hm-banner-top-text"><strong style="color:' + (dyn.textColor || '#1a2530') + ';">' + escapeHtml(dyn.heading || '') + '</strong>' +
        (dyn.subtext ? '<span style="color:' + (dyn.accentColor || '#7c3aed') + ';">' + escapeHtml(dyn.subtext) + '</span>' : '') + '</div>' +
        '<span class="hm-banner-top-arrow"><span class="material-icons-outlined" style="color:' + (dyn.accentColor || '#7c3aed') + ';">chevron_left</span></span>' +
        "</a></div>";
    } else {
      html = '<div class="hm-banner-top-wrap hm-fade">' +
        '<a class="hm-banner-top" href="' + escapeHtml(banner.link || '#') + '">' +
        '<span class="hm-banner-top-icon"><span class="material-icons-outlined">local_shipping</span></span>' +
        '<div class="hm-banner-top-text"><strong>توصيل مجاني للطلبات فوق ٩٩ ر.س</strong><span>عرض لفترة محدودة</span></div>' +
        '<span class="hm-banner-top-arrow"><span class="material-icons-outlined">chevron_left</span></span>' +
        "</a></div>";
    }
    var temp = document.createElement("div");
    temp.innerHTML = html;
    HM.contentEl.appendChild(temp.firstElementChild);
    return;
  }
  // Regular banners — use Supabase ad banners if available
  var adBanners = HOME_CONFIG._adBanners;
  if (adBanners && adBanners.length && adBanners[idx - 1]) {
    var ad = adBanners[idx - 1];
    var html =
      '<div class="hm-banner-wrap hm-fade">' +
      '<div class="hm-banner ' + sizeClass + '">' +
      '<a href="' + escapeHtml(ad.link_url || "#") + '"><div class="hm-banner-img"><div class="buda-pulse-dot"><div class="buda-pulse-dot-inner"><div class="buda-pulse-dot-circle"></div></div></div><img src="' + ad.image_url + '" alt="" loading="lazy" /></div></a>' +
      '<span class="ad-badge">' + escapeHtml(ad.badge_text || 'مدفوع') + '</span>' +
      "</div></div>";
    var temp = document.createElement("div");
    temp.innerHTML = html;
    HM.contentEl.appendChild(temp.firstElementChild);
    return;
  }
  var html =
    '<div class="hm-banner-wrap hm-fade">' +
    '<div class="hm-banner ' +
    sizeClass +
    '">' +
    '<a href="' +
    escapeHtml(banner.link || "#") +
    '"><div class="hm-banner-img"><div class="buda-pulse-dot"><div class="buda-pulse-dot-inner"><div class="buda-pulse-dot-circle"></div></div></div><img src="' +
    banner.url +
    '" alt="" loading="lazy" /></div></a>' +
    '<span class="ad-badge">مدفوع</span>' +
    "</div></div>";
  var temp = document.createElement("div");
  temp.innerHTML = html;
  HM.contentEl.appendChild(temp.firstElementChild);
};

HM.renderCategories = function () {
  var cats = HOME_CONFIG.categories;
  if (!cats || !cats.length) return;
  var pairCount = Math.ceil(cats.length / 2);
  var pairsHtml = "";
  for (var ci = 0; ci < cats.length; ci += 2) {
    pairsHtml += '<div class="hm-cats-pair">';
    var cat1 = cats[ci];
    pairsHtml +=
      '<a class="hm-cat-card" href="' +
      escapeHtml(cat1.link || "#") +
      '">' +
      '<div class="hm-cat-card-img"><img src="' +
      cat1.img +
      '" alt="' +
      escapeHtml(cat1.name) +
      '" loading="lazy" onerror="this.style.display=\'none\'" /></div>' +
      '<span class="hm-cat-card-name">' +
      escapeHtml(cat1.name) +
      "</span></a>";
    if (ci + 1 < cats.length) {
      var cat2 = cats[ci + 1];
      pairsHtml +=
        '<a class="hm-cat-card" href="' +
        escapeHtml(cat2.link || "#") +
        '">' +
        '<div class="hm-cat-card-img"><img src="' +
        cat2.img +
        '" alt="' +
        escapeHtml(cat2.name) +
        '" loading="lazy" onerror="this.style.display=\'none\'" /></div>' +
        '<span class="hm-cat-card-name">' +
        escapeHtml(cat2.name) +
        "</span></a>";
    }
    pairsHtml += "</div>";
  }
  // Indicator dots — one per pair
  var indicatorHtml = '<div class="hm-cats-indicator">';
  for (var di = 0; di < pairCount; di++) {
    indicatorHtml += "<span" + (di === 0 ? ' class="active"' : "") + "></span>";
  }
  indicatorHtml += "</div>";
  var html =
    '<div class="hm-cats-wrap hm-fade">' +
    '<div class="hm-cats-section">' +
    '<div class="hm-cats-head"></div>' +
    '<div class="hm-cats-body">' +
    '<div class="hm-cats-scroll-wrap">' +
    '<button class="hm-cats-btn prev" type="button" aria-label="السابق">❮</button>' +
    '<div class="hm-cats-scroll" id="hm-cats-scroll">' +
    pairsHtml +
    "</div>" +
    '<button class="hm-cats-btn next" type="button" aria-label="التالي">❯</button>' +
    "</div>" +
    indicatorHtml +
    "</div></div></div>";
  var temp = document.createElement("div");
  temp.innerHTML = html;
  var el = temp.firstElementChild;
  HM.contentEl.appendChild(el);
  // init arrows
  var catsWrap = el.querySelector(".hm-cats-scroll-wrap");
  var scrollEl = el.querySelector(".hm-cats-scroll");
  if (catsWrap && scrollEl) {
    var prevBtn = catsWrap.querySelector(".prev");
    var nextBtn = catsWrap.querySelector(".next");
    if (prevBtn) prevBtn.addEventListener("click", function () { scrollEl.scrollBy({ left: -250, behavior: "smooth" }); });
    if (nextBtn) nextBtn.addEventListener("click", function () { scrollEl.scrollBy({ left: 250, behavior: "smooth" }); });
  }
  // Update capsule indicator on scroll
  if (scrollEl) {
    var dots = el.querySelectorAll(".hm-cats-indicator span");
    if (dots.length) {
      scrollEl.addEventListener("scroll", function () {
        var pairElements = scrollEl.querySelectorAll(".hm-cats-pair");
        if (!pairElements.length) return;
        var scrollLeft = scrollEl.scrollLeft;
        var totalWidth = scrollEl.scrollWidth - scrollEl.clientWidth;
        var activeIdx = Math.min(
          Math.round((scrollLeft / totalWidth) * (pairCount - 1)),
          pairCount - 1,
        );
        dots.forEach(function (d, i) {
          d.classList.toggle("active", i === activeIdx);
        });
      });
    }
  }
};

HM.renderBrands = function () {
  var brands = HOME_CONFIG.brands;
  if (!brands || !brands.length) return;
  var html =
    '<section class="hm-section hm-fade">' +
    '<div class="hm-section-head"><h2>تسوق من أفضل الماركات</h2></div>' +
    '<div class="hm-section-body"><div class="hm-brands">';
  brands.forEach(function (b) {
    html +=
      '<a class="hm-brand" href="' +
      escapeHtml(b.link || "#") +
      '">' +
      '<div class="hm-brand-logo"><img src="' +
      b.img +
      '" alt="' +
      escapeHtml(b.name) +
      '" loading="lazy" /></div>' +
      "<span>" +
      escapeHtml(b.name) +
      "</span></a>";
  });
  html += "</div></div></section>";
  var temp = document.createElement("div");
  temp.innerHTML = html;
  HM.contentEl.appendChild(temp.firstElementChild);
};

/** Features section — mobile card + desktop sidebar */
HM.renderFeatures = function () {
  if (!HM.contentEl) return;
  var html =
    /* Mobile: single card with 4 horizontal items */
    '<div class="hm-features-mobile">' +
    '<div class="hm-f-card">' +
    '<div class="hm-f-item"><div class="hm-f-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6C2BFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h-1a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1"/><path d="M20 6h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1"/><path d="M6 14h2v6H6z"/><path d="M16 14h2v6h-2z"/><path d="M6 14v-2a6 6 0 0 1 12 0v2"/></svg></div><div class="hm-f-info"><span class="hm-f-title">دعم 24/7</span><span class="hm-f-desc">خدمة عملاء</span></div></div>' +
    '<div class="hm-f-divider"></div>' +
    '<div class="hm-f-item"><div class="hm-f-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6C2BFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><div class="hm-f-info"><span class="hm-f-title">دفع آمن</span><span class="hm-f-desc">حماية بياناتك</span></div></div>' +
    '<div class="hm-f-divider"></div>' +
    '<div class="hm-f-item"><div class="hm-f-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6C2BFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg></div><div class="hm-f-info"><span class="hm-f-title">جودة مضمونة</span><span class="hm-f-desc">منتجات أصلية 100%</span></div></div>' +
    '<div class="hm-f-divider"></div>' +
    '<div class="hm-f-item"><div class="hm-f-icon"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6C2BFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"/><polygon points="12 15 17 21 7 21 12 15"/><path d="M12 15V9"/></svg></div><div class="hm-f-info"><span class="hm-f-title">توصيل سريع</span><span class="hm-f-desc">إلى جميع المناطق</span></div></div>' +
    '</div></div>' +
/* Desktop: stacked vertical cards */
    '<div class="hm-features-desktop">' +

    '</div></div>';
  var temp = document.createElement("div");
  temp.innerHTML = html;
  HM.contentEl.appendChild(temp.firstElementChild);
};

// ========== SMART CATEGORY SHOWCASE (4 premium cards) ==========
HM.renderSmartCategories = function (section) {
  var cards = HOME_CONFIG._smartCategories || [];
  if (!cards || !cards.length) {
    cards = [
    ];
  }
  var html =
    '<section class="hm-section hm-fade hm-smart-cats" id="sec-' + (section.id || 'hm-smart-cats') + '">' +
    '<div class="hm-section-head"><h2>' + escapeHtml(section.title || 'تسوق حسب الفئة') + '</h2>' +
    '<a href="category-landing.html?slug=clothes">استكشف الكل</a></div>' +
    '<div class="hm-section-body"><div class="hm-cats-scroll-wrap"><button class="hm-cats-btn prev" type="button" aria-label="السابق">❮</button><div class="hm-smart-cats-grid">';
  cards.forEach(function (card, i) {
    html +=
      '<a class="hm-smart-cat-card" href="' + escapeHtml(card.link_url || '#') + '" style="--sc-gradient-from:' + (card.gradient_from || '#000') + ';--sc-gradient-to:' + (card.gradient_to || '#000') + '">' +
      '<div class="hm-smart-cat-media">' +
      '<img src="' + card.image_url + '" alt="' + escapeHtml(card.title) + '" loading="' + (i < 2 ? 'eager' : 'lazy') + '" onerror="this.style.display=\'none\'" />' +
      '</div>' +
      '<div class="hm-smart-cat-overlay"></div>' +
      '<div class="hm-smart-cat-content">' +
      '<h3 class="hm-smart-cat-title">' + escapeHtml(card.title) + '</h3>' +
      (card.subtitle ? '<p class="hm-smart-cat-subtitle">' + escapeHtml(card.subtitle) + '</p>' : '') +
      '<span class="hm-smart-cat-btn">استكشف الآن <span class="material-icons-outlined">arrow_back</span></span>' +
      '</div></a>';
  });
  html += '</div><button class="hm-cats-btn next" type="button" aria-label="التالي">❯</button></div></div></section>';
  var temp = document.createElement("div");
  temp.innerHTML = html;
  if (HM.contentEl) {
    var el2 = temp.firstElementChild;
    HM.contentEl.appendChild(el2);
    // init arrows
    var scWrap = el2.querySelector(".hm-cats-scroll-wrap");
    var scGrid = el2.querySelector(".hm-smart-cats-grid");
    if (scWrap && scGrid) {
      var pb = scWrap.querySelector(".prev");
      var nb = scWrap.querySelector(".next");
      if (pb) pb.addEventListener("click", function () { scGrid.scrollBy({ left: -250, behavior: "smooth" }); });
      if (nb) nb.addEventListener("click", function () { scGrid.scrollBy({ left: 250, behavior: "smooth" }); });
    }
  }
};

HM.renderOffers = function (section) {
  var taagerOnly = HM.taagerOnly;
  var offers = taagerOnly
    .filter(function (p) {
      var rp = resolvePrice(p);
      return rp.hasDiscount && rp.discountPercent > 30;
    })
    .sort(function (a, b) {
      return resolvePrice(b).discountPercent - resolvePrice(a).discountPercent;
    })
    .slice(0, 12);
  return HM.renderProductCarousel(section, offers.length ? offers : null);
};

HM.renderForYou = function (section) {
  var products = HM.allProducts;
  var picks = pickRandomProducts(products, 8, []);
  return HM.renderProductCarousel(section, picks);
};

HM.renderCategoryProducts = function (section) {
  var mapKey = section.mapKey;
  var candidates = CATEGORY_MAP[mapKey] || [mapKey];
  var filtered = filterProductsByCategoryCandidates(HM.allProducts, candidates);
  if (filtered.length < 4) {
    var uncategorized = HM.allProducts.filter(function (p) {
      var cat = String(p.category || "")
        .trim()
        .toLowerCase();
      return (
        cat === "" ||
        cat === "بدون تصنيف" ||
        cat === "null" ||
        cat === "undefined"
      );
    });
    var seen = new Set(
      filtered.map(function (p) {
        return p.id;
      }),
    );
    for (var i = 0; i < uncategorized.length && filtered.length < 12; i++) {
      if (!seen.has(uncategorized[i].id)) {
        filtered.push(uncategorized[i]);
        seen.add(uncategorized[i].id);
      }
    }
  }
  filtered.sort(function (a, b) {
    return (
      (resolvePrice(b).discountPercent || 0) -
        (resolvePrice(a).discountPercent || 0) ||
      (b.rating || 0) - (a.rating || 0)
    );
  });
  return HM.renderProductCarousel(section, filtered.slice(0, 12));
};

HM.renderDaily = function (section) {
  return HM.renderProductCarousel(section, selectDailyProducts(HM.allProducts));
};

HM.renderRandom = function (section) {
  var picks = pickRandomProducts(
    HM.allProducts,
    RANDOM_PRODUCTS_COUNT,
    lastRandomProductIds,
  );
  lastRandomProductIds = picks.map(function (p) {
    return String(p.id);
  });
  return HM.renderProductCarousel(section, picks);
};

HM.renderTaagerExtra = function (section) {
  var pool = HM.taagerOnly.length
    ? [].concat(HM.taagerOnly)
    : [].concat(HM.allProducts);
  if (!pool.length) return null;
  if (section.sortKey === "discount")
    pool.sort(function (a, b) {
      return resolvePrice(b).discountPercent - resolvePrice(a).discountPercent;
    });
  else if (section.sortKey === "rating")
    pool.sort(function (a, b) {
      return resolveRating(b).rating - resolveRating(a).rating;
    });
  else if (section.sortKey === "price")
    pool.sort(function (a, b) {
      return (Number(a.price) || 0) - (Number(b.price) || 0);
    });
  else pool = shuffleProducts(pool);
  var sectionIndex = HOME_CONFIG.sections.indexOf(section);
  var offset = (taagerExtraRotationOffset * 5 + sectionIndex * 7) % pool.length;
  var rotated = pool.slice(offset).concat(pool.slice(0, offset));
  return HM.renderProductCarousel(section, rotated.slice(0, 10));
};

// ========== SHEIN-STYLE RENDERERS ==========

function initSheinCarousel(sectionEl, gridSel, wrapSel) {
  var grid = sectionEl.querySelector(gridSel);
  var wrap = sectionEl.querySelector(wrapSel);
  if (!grid || !wrap) return;
  var prev = wrap.querySelector('.prev');
  var next = wrap.querySelector('.next');
  if (prev) prev.addEventListener('click', function(){ grid.scrollBy({ left: -155, behavior: 'smooth' }); });
  if (next) next.addEventListener('click', function(){ grid.scrollBy({ left: 155, behavior: 'smooth' }); });
}

/** SHEIN Trend — Bold gradient header, large product cards with trend badge */
HM.renderSheinTrend = function (section) {
  if (!HM.allProducts.length) return null;
  var pool = shuffleProducts([].concat(HM.allProducts)).slice(0, 12);
  var palettes = [
    ["#ff6b9d", "#c44dff"],
    ["#00d2ff", "#3a7bd5"],
    ["#ff9a9e", "#fad0c4"],
    ["#667eea", "#764ba2"],
    ["#f093fb", "#f5576c"],
    ["#4facfe", "#00f2fe"],
  ];
  var pal = palettes[Math.floor(Math.random() * palettes.length)];
  var html =
    '<section class="hm-section hm-fade hm-shein-trend" id="sec-' +
    section.id +
    '" style="background:linear-gradient(135deg,' +
    pal[0] +
    "08," +
    pal[1] +
    '08)">' +
    '<div class="hm-shein-trend-head">' +
    (section.badge
      ? '<span class="hm-shein-badge" style="background:rgba(0,0,0,0.06);color:' +
        pal[0] +
        ";border:1px solid " +
        pal[0] +
        '40">' +
        escapeHtml(section.badge) +
        "</span>"
      : "") +
    '<h2 class="hm-shein-title" style="color:' +
    pal[0] +
    '">' +
    escapeHtml(section.title || "رائج الآن") +
    "</h2>" +
    '<a class="hm-view-all" href="section.html?type=' +
    section.type +
    "&id=" +
    section.id +
    "&title=" +
    encodeURIComponent(section.title || "") +
    '">عرض الكل</a>' +
    "</div>" +
    '<div class="hm-shein-trend-body"><div class="hm-shein-grid-wrap"><button class="hm-shein-grid-btn prev" type="button" aria-label="السابق">❮</button><button class="hm-shein-grid-btn next" type="button" aria-label="التالي">❯</button><div class="hm-shein-grid">';
  pool.forEach(function (p) {
    var rp = resolvePrice(p);
    var rr = resolveRating(p);
    var img = getImage(p);
    var id = String(p.id);
    var isWish = isWishlistedProduct(id);
    html +=
      '<div class="hm-shein-card" data-view-product="' +
      id +
      '">' +
      '<div class="hm-shein-card-img"><div class="buda-pulse-dot" data-pulse-dot="' + id + '"><div class="buda-pulse-dot-inner"><div class="buda-pulse-dot-circle"></div></div></div><img src="' +
      img +
      '" alt="' +
      escapeHtml(p.name || "") +
      '" loading="lazy" onerror="this.style.display=\'none\'" />' +
      '<button class="hm-shein-wish ' +
      (isWish ? "active" : "") +
      '" data-wishlist="' +
      id +
      '" aria-label="مفضلة"><svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button>' +
      (rp.hasDiscount
        ? '<span class="hm-shein-discount">-' + rp.discountPercent + "%</span>"
        : "") +
      "</div>" +
      '<div class="hm-shein-card-info"><h4>' +
      escapeHtml((p.name || "").slice(0, 35)) +
      "</h4>" +
      '<div class="hm-shein-price"><span class="hm-shein-current">' +
      formatMoney(rp.finalPrice) +
      "</span>" +
      (rp.hasDiscount
        ? '<span class="hm-shein-old">' +
          formatMoney(rp.originalPrice) +
          "</span>"
        : "") +
      "</div>" +
      (rr.reviews > 0
        ? '<div class="hm-shein-rating">★ ' +
          rr.rating.toFixed(1) +
          " <small>(" +
          rr.reviews +
          ")</small></div>"
        : "") +
      '<button class="hm-shein-add" data-add-to-cart="' +
      id +
      '">+ أضف للسلة</button></div></div>';
  });
  html += "</div></div></div></section>";
  var temp = document.createElement("div");
  temp.innerHTML = html;
  var sectionEl = temp.firstElementChild;
  HM.contentEl.appendChild(sectionEl);
  attachProductCardEvents(sectionEl);
  initSheinCarousel(sectionEl, '.hm-shein-grid', '.hm-shein-grid-wrap');
  return sectionEl;
};

HM.renderSheinStyle = function (section) {
  if (!HM.allProducts.length) return null;
  var pool = shuffleProducts([].concat(HM.allProducts)).slice(0, 8);
  var hero = pool[0];
  var rest = pool.slice(1, 8);
  if (!hero) return null;
  var heroImg = getImage(hero);
  var rp = resolvePrice(hero);
  var palettes = [
    ["#2d1b69", "#11998e"],
    ["#fc5c7d", "#6a82fb"],
    ["#0f0c29", "#302b63"],
  ];
  var pal = palettes[Math.floor(Math.random() * palettes.length)];
  var html =
    '<section class="hm-section hm-fade hm-shein-style" id="sec-' +
    section.id +
    '">' +
    '<div class="hm-shein-style-head">' +
    '<h2 class="hm-shein-title" style="color:' +
    pal[0] +
    '">' +
    escapeHtml(section.title || "شاهد أيضاً") +
    "</h2>" +
    '<a class="hm-view-all" href="section.html?type=' +
    section.type +
    "&id=" +
    section.id +
    "&title=" +
    encodeURIComponent(section.title || "") +
    '">عرض الكل</a></div>' +
    '<div class="hm-shein-style-body"><div class="hm-shein-split">' +
    '<div class="hm-shein-hero" data-view-product="' +
    String(hero.id) +
    '" style="background:linear-gradient(135deg,' +
    pal[0] +
    "08," +
    pal[1] +
    '08)">' +
    '<div class="hm-shein-hero-img"><div class="buda-pulse-dot"><div class="buda-pulse-dot-inner"><div class="buda-pulse-dot-circle"></div></div></div><img src="' +
    heroImg +
    '" alt="' +
    escapeHtml(hero.name || "") +
    '" loading="lazy" onerror="this.style.display=\'none\'" /></div>' +
    '<div class="hm-shein-hero-overlay" style="background:linear-gradient(transparent, rgba(0,0,0,0.15))"><span class="hm-shein-hero-label" style="color:' +
    pal[0] +
    '">اختيار المحرر</span>' +
    '<h3 style="color:#fff;">' +
    escapeHtml((hero.name || "").slice(0, 30)) +
    "</h3>" +
    '<div class="hm-shein-price"><span class="hm-shein-current" style="color:#fff;">' +
    formatMoney(rp.finalPrice) +
    "</span>" +
    (rp.hasDiscount
      ? '<span class="hm-shein-old" style="color:rgba(255,255,255,0.5);">' +
        formatMoney(rp.originalPrice) +
        "</span>"
      : "") +
    "</div>" +
    '<button class="hm-shein-add hm-shein-add-lg" data-add-to-cart="' +
    String(hero.id) +
    '">تسوق الآن</button></div></div>' +
    '<div class="hm-shein-side-wrap"><button class="hm-shein-side-btn prev" type="button" aria-label="السابق">❮</button><button class="hm-shein-side-btn next" type="button" aria-label="التالي">❯</button><div class="hm-shein-side">';
  rest.forEach(function (p) {
    var img = getImage(p);
    var pr = resolvePrice(p);
    var pid = String(p.id);
    html +=
      '<div class="hm-shein-side-card" data-view-product="' +
      pid +
      '">' +
      '<div class="hm-shein-side-img"><div class="buda-pulse-dot" data-pulse-dot="' + pid + '"><div class="buda-pulse-dot-inner"><div class="buda-pulse-dot-circle"></div></div></div><img src="' +
      img +
      '" alt="" loading="lazy" onerror="this.style.display=\'none\'" /></div>' +
      "<div><h4>" +
      escapeHtml((p.name || "").slice(0, 20)) +
      "</h4>" +
      '<span class="hm-shein-current">' +
      formatMoney(pr.finalPrice) +
      "</span></div></div>";
  });
  html += "</div></div></div></div></section>";
  var temp = document.createElement("div");
  temp.innerHTML = html;
  var sectionEl = temp.firstElementChild;
  HM.contentEl.appendChild(sectionEl);
  attachProductCardEvents(sectionEl);
  initSheinCarousel(sectionEl, '.hm-shein-side', '.hm-shein-side-wrap');
  return sectionEl;
};

/** SHEIN Deal — Large discount hero card + product row */
HM.renderSheinDeal = function (section) {
  if (!HM.allProducts.length) return null;
  var pool = [].concat(HM.allProducts).filter(function (p) {
    var rp = resolvePrice(p);
    return (
      rp.hasDiscount && rp.discountPercent >= (section.discountFilter || 30)
    );
  });
  if (!pool.length) pool = [].concat(HM.allProducts);
  pool.sort(function (a, b) {
    return resolvePrice(b).discountPercent - resolvePrice(a).discountPercent;
  });
  var picks = pool.slice(0, 9);
  var hero = picks[0];
  var rest = picks.slice(1, 9);
  if (!hero) return null;
  var heroImg = getImage(hero);
  var rp = resolvePrice(hero);
  var html =
    '<section class="hm-section hm-fade hm-shein-deal" id="sec-' +
    section.id +
    '">' +
    '<div class="hm-shein-deal-head">' +
    '<h2 class="hm-shein-title hm-shein-deal-title">' +
    escapeHtml(section.title || "عرض مميز") +
    "</h2>" +
    '<span class="hm-shein-deal-tag">وفر ' +
    rp.discountPercent +
    "%</span>" +
    '<a class="hm-view-all" href="section.html?type=' +
    section.type +
    "&id=" +
    section.id +
    "&title=" +
    encodeURIComponent(section.title || "") +
    "&discountFilter=" +
    (section.discountFilter || 30) +
    '">عرض الكل</a></div>' +
    '<div class="hm-shein-deal-body"><div class="hm-shein-deal-hero" data-view-product="' +
    String(hero.id) +
    '">' +
    '<div class="hm-shein-deal-hero-img"><div class="buda-pulse-dot" data-pulse-dot="' + String(hero.id) + '"><div class="buda-pulse-dot-inner"><div class="buda-pulse-dot-circle"></div></div></div><img src="' +
    heroImg +
    '" alt="' +
    escapeHtml(hero.name || "") +
    '" loading="lazy" onerror="this.style.display=\'none\'" />' +
    '<div class="hm-shein-deal-circle">-' +
    rp.discountPercent +
    "%</div></div>" +
    '<div class="hm-shein-deal-hero-info"><h3>' +
    escapeHtml((hero.name || "").slice(0, 40)) +
    "</h3>" +
    '<div class="hm-shein-deal-prices"><span class="hm-shein-deal-current">' +
    formatMoney(rp.finalPrice) +
    "</span>" +
    '<span class="hm-shein-deal-old">' +
    formatMoney(rp.originalPrice) +
    "</span></div>" +
    '<button class="hm-shein-add hm-shein-add-lg" data-add-to-cart="' +
    String(hero.id) +
    '">احصل عليه الآن</button></div></div>' +
    '<div class="hm-shein-deal-row-wrap"><button class="hm-shein-row-btn prev" type="button" aria-label="السابق">❮</button><button class="hm-shein-row-btn next" type="button" aria-label="التالي">❯</button><div class="hm-shein-deal-row">';
  rest.forEach(function (p) {
    var img = getImage(p);
    var pr = resolvePrice(p);
    var pid = String(p.id);
    html +=
      '<div class="hm-shein-deal-mini" data-view-product="' +
      pid +
      '">' +
      '<div class="hm-shein-deal-mini-img"><div class="buda-pulse-dot" data-pulse-dot="' + pid + '"><div class="buda-pulse-dot-inner"><div class="buda-pulse-dot-circle"></div></div></div><img src="' +
      img +
      '" alt="" loading="lazy" onerror="this.style.display=\'none\'" /></div>' +
      (pr.hasDiscount
        ? '<span class="hm-shein-discount hm-shein-discount-sm">-' +
          pr.discountPercent +
          "%</span>"
        : "") +
      '<span class="hm-shein-current">' +
      formatMoney(pr.finalPrice) +
      "</span></div>";
  });
  html += "</div></div></div></section>";
  var temp = document.createElement("div");
  temp.innerHTML = html;
  var sectionEl = temp.firstElementChild;
  HM.contentEl.appendChild(sectionEl);
  attachProductCardEvents(sectionEl);
  initSheinCarousel(sectionEl, '.hm-shein-deal-row', '.hm-shein-deal-row-wrap');
  return sectionEl;
};

/** SHEIN New — Latest arrivals with NEW badge */
HM.renderSheinNew = function (section) {
  if (!HM.allProducts.length) return null;
  var pool = [].concat(HM.allProducts);
  pool.sort(function (a, b) {
    return (
      (b.created_at || b.createdAt || "").localeCompare(
        a.created_at || a.createdAt || "",
      ) || 0
    );
  });
  var picks = pool.slice(0, 12);
  var palettes = [
    ["#ff6b9d", "#c44dff"],
    ["#00d2ff", "#3a7bd5"],
    ["#ff9a9e", "#fad0c4"],
    ["#667eea", "#764ba2"],
    ["#f093fb", "#f5576c"],
    ["#4facfe", "#00f2fe"],
  ];
  var pal = palettes[Math.floor(Math.random() * palettes.length)];
  var html =
    '<section class="hm-section hm-fade hm-shein-trend" id="sec-' +
    section.id +
    '" style="background:linear-gradient(135deg,' +
    pal[0] +
    "08," +
    pal[1] +
    '08)">' +
    '<div class="hm-shein-trend-head">' +
    (section.badge
      ? '<span class="hm-shein-badge" style="background:rgba(0,0,0,0.06);color:' +
        pal[0] +
        ";border:1px solid " +
        pal[0] +
        '40">' +
        escapeHtml(section.badge) +
        "</span>"
      : "") +
    '<h2 class="hm-shein-title" style="color:' +
    pal[0] +
    '">' +
    escapeHtml(section.title || "وصل حديثاً") +
    "</h2>" +
    '<a class="hm-view-all" href="section.html?type=' +
    section.type +
    "&id=" +
    section.id +
    "&title=" +
    encodeURIComponent(section.title || "") +
    '">عرض الكل</a>' +
    "</div>" +
    '<div class="hm-shein-trend-body"><div class="hm-shein-grid-wrap"><button class="hm-shein-grid-btn prev" type="button" aria-label="السابق">❮</button><button class="hm-shein-grid-btn next" type="button" aria-label="التالي">❯</button><div class="hm-shein-grid">';
  picks.forEach(function (p) {
    var rp = resolvePrice(p);
    var rr = resolveRating(p);
    var img = getImage(p);
    var id = String(p.id);
    var isWish = isWishlistedProduct(id);
    html +=
      '<div class="hm-shein-card" data-view-product="' +
      id +
      '">' +
      '<div class="hm-shein-card-img"><div class="buda-pulse-dot" data-pulse-dot="' + id + '"><div class="buda-pulse-dot-inner"><div class="buda-pulse-dot-circle"></div></div></div><img src="' +
      img +
      '" alt="' +
      escapeHtml(p.name || "") +
      '" loading="lazy" onerror="this.style.display=\'none\'" />' +
      '<span class="hm-shein-discount">جديد</span>' +
      '<button class="hm-shein-wish ' +
      (isWish ? "active" : "") +
      '" data-wishlist="' +
      id +
      '" aria-label="مفضلة"><svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></button></div>' +
      '<div class="hm-shein-card-info"><h4>' +
      escapeHtml((p.name || "").slice(0, 35)) +
      "</h4>" +
      '<div class="hm-shein-price"><span class="hm-shein-current">' +
      formatMoney(rp.finalPrice) +
      "</span>" +
      (rp.hasDiscount
        ? '<span class="hm-shein-old">' +
          formatMoney(rp.originalPrice) +
          "</span>"
        : "") +
      "</div>" +
      (rr.reviews > 0
        ? '<div class="hm-shein-rating">★ ' +
          rr.rating.toFixed(1) +
          " <small>(" +
          rr.reviews +
          ")</small></div>"
        : "") +
      '<button class="hm-shein-add" data-add-to-cart="' +
      id +
      '">+ أضف للسلة</button></div></div>';
  });
  html += "</div></div></div></section>";
  var temp = document.createElement("div");
  temp.innerHTML = html;
  var sectionEl = temp.firstElementChild;
  HM.contentEl.appendChild(sectionEl);
  attachProductCardEvents(sectionEl);
  initSheinCarousel(sectionEl, '.hm-shein-grid', '.hm-shein-grid-wrap');
  return sectionEl;
};

/** SHEIN Brands — Brand cards with colored backgrounds */
HM.renderSheinBrands = function (section) {
  var brands = HOME_CONFIG.brands;
  if (!brands || !brands.length) return null;
  var brandColors = [
    "#ff6b9d22",
    "#667eea22",
    "#22c55e22",
    "#f59e0b22",
    "#e74c3c22",
    "#8b5cf622",
    "#06b6d422",
    "#f9731622",
    "#ec489922",
    "#14b8a622",
  ];
  var html =
    '<section class="hm-section hm-fade hm-shein-trend" id="sec-' +
    section.id +
    '">' +
    '<div class="hm-section-head"><h2>' +
    escapeHtml(section.title || "تسوق حسب الماركة") +
    "</h2></div>" +
    '<div class="hm-shein-brands-body"><div class="hm-shein-brands-grid">';
  brands.forEach(function (b, i) {
    var bg = brandColors[i % brandColors.length];
    var borderColor = bg.replace("22", "44");
    html +=
      '<a class="hm-shein-brand-card" href="' +
      escapeHtml(b.link || "#") +
      '" style="background:' +
      bg +
      ";border-color:" +
      borderColor +
      '">' +
      '<div class="hm-shein-brand-logo" style="border-color:' +
      borderColor +
      '"><img src="' +
      b.img +
      '" alt="' +
      escapeHtml(b.name) +
      '" loading="lazy" onerror="this.style.display=\'none\'" /></div>' +
      '<span class="hm-shein-brand-name" style="color:' +
      borderColor.replace("44", "") +
      '">' +
      escapeHtml(b.name) +
      "</span></a>";
  });
  html += "</div></div></section>";
  var temp = document.createElement("div");
  temp.innerHTML = html;
  HM.contentEl.appendChild(temp.firstElementChild);
  return temp.firstElementChild;
};

// Section dispatch
HM.renderSection = function (section) {
  switch (section.type) {
    case "hero":
      return HM.renderHero();
    case "banner":
      return HM.renderBanner(section);
    case "categories":
      return HM.renderCategories();
    case "features":
      return HM.renderFeatures();
    case "brands":
      return HM.renderBrands();
    case "offers":
      return HM.renderOffers(section);
    case "for-you":
      return HM.renderForYou(section);
    case "category-products":
      return HM.renderCategoryProducts(section);
    case "daily":
      return HM.renderDaily(section);
    case "random":
      return HM.renderRandom(section);
    case "taager-extra":
      return HM.renderTaagerExtra(section);
    case "shein-trend":
      return HM.renderSheinTrend(section);
    case "shein-style":
      return HM.renderSheinStyle(section);
    case "shein-deal":
      return HM.renderSheinDeal(section);
    case "shein-new":
      return HM.renderSheinNew(section);
    case "shein-brands":
      return HM.renderSheinBrands(section);
    case "smart-categories":
      return HM.renderSmartCategories(section);
    default:
      return null;
  }
};

HM.renderAll = function () {
  if (!HM.contentEl) return;
  HM.contentEl.innerHTML = "";
  HOME_CONFIG.sections.forEach(function (section) {
    HM.renderSection(section);
  });
};

HM.renderSectionIntoSkeleton = function (skeletonEl, section, index) {
  if (!skeletonEl || !HM.contentEl) return null;
  var originalContentEl = HM.contentEl;
  var marker = document.createComment("hm-render-marker");
  skeletonEl.appendChild(marker);
  HM.contentEl = skeletonEl;
  try {
    HM.renderSection(section);
  } finally {
    HM.contentEl = originalContentEl;
  }
  var node = marker.nextElementSibling;
  marker.remove();
  if (node) node.setAttribute("data-hm-section-index", String(index));
  return node || null;
};

HM.promoteHydratedSkeleton = function (skeletonEl) {
  if (!skeletonEl || !HM.contentEl) return;
  var frag = document.createDocumentFragment();
  while (skeletonEl.firstChild) frag.appendChild(skeletonEl.firstChild);
  HM.contentEl.insertBefore(frag, skeletonEl);
  skeletonEl.remove();
};

HM.renderInitialProgressively = function () {
  if (!HM.contentEl) return Promise.resolve();
  var skeletonEl = document.getElementById("hm-skeleton");
  if (!skeletonEl) {
    document.body.classList.remove("home-loading");
    HM.renderAll();
    HM.initHeroSlider();
    return Promise.resolve();
  }

  document.body.classList.add("home-hydrating");
  document.body.classList.remove("home-loading");

  return new Promise(function (resolve) {
    var index = 0;
    function renderOne() {
      var section = HOME_CONFIG.sections[index];
      var placeholder = skeletonEl.querySelector(
        '[data-skeleton-index="' + index + '"]',
      );
      var node = HM.renderSectionIntoSkeleton(skeletonEl, section, index);
      if (node) {
        node.classList.add("hm-reveal");
        if (placeholder && placeholder !== node) placeholder.replaceWith(node);
      } else if (placeholder) {
        placeholder.remove();
      }
      index++;
    }

    function renderBatch() {
      if (index >= HOME_CONFIG.sections.length) {
HM.promoteHydratedSkeleton(skeletonEl);
         document.body.classList.remove("home-hydrating");
         document.body.classList.add("home-loaded");
         HM.initHeroSlider();
         resolve();
        return;
      }

      var batchSize = index < 4 ? 1 : 2;
      for (var i = 0; i < batchSize && index < HOME_CONFIG.sections.length; i++)
        renderOne();
      window.setTimeout(renderBatch, index < 4 ? 90 : 70);
    }

    window.requestAnimationFrame(renderBatch);
  });
};

// ========== HERO CAROUSEL (Noon-style, Swiper-like) ==========
HM.heroIndex = 0;
HM.heroSlideCount = 0;
HM.heroTimer = null;
HM.heroProgressTimer = null;
HM.initHeroSlider = function () {
  var hero = document.getElementById("hm-hero");
  var track = document.getElementById("hm-hero-track");
  if (!hero || !track) return;
  var realSlides = Array.from(track.querySelectorAll(".hm-hero-slide"));
  var bars = hero.querySelectorAll(".hm-hero-bar");
  HM.heroSlideCount = realSlides.length;
  if (!HM.heroSlideCount) return;

  // ── Config ──
  var slidesPerView = 1; // full slide at a time
  var gap = 0; // px between slides
  var transitionMs = 350;
  var autoInterval = 4000;
  var snapThreshold = 0.25; // 25% of slide width to snap
  var dragDamping = 0.4; // resistance during drag
  var isDragging = false;
  var isAnimating = false;

  var slideWidth = 0;
  var unit = 0; // slideWidth + gap

  // ── Layout ──
  function calcWidth() {
    return (hero.offsetWidth - (slidesPerView - 1) * gap) / slidesPerView;
  }

  function setupLayout() {
    slideWidth = calcWidth();
    unit = slideWidth + gap;
    realSlides.forEach(function (s) {
      s.style.width = slideWidth + "px";
    });

    // Remove old clones
    track.querySelectorAll(".hm-hero-clone").forEach(function (c) {
      c.remove();
    });
    // Clone first & last for infinite loop
    var fc = realSlides[0].cloneNode(true);
    fc.classList.add("hm-hero-clone");
    var lc = realSlides[HM.heroSlideCount - 1].cloneNode(true);
    lc.classList.add("hm-hero-clone");
    track.appendChild(fc);
    track.insertBefore(lc, realSlides[0]);
    // Set clone widths
    track.querySelectorAll(".hm-hero-clone").forEach(function (s) {
      s.style.width = slideWidth + "px";
    });
  }

  // ── Transform helpers ──
  var currentTranslate = 0;

  function trackIdxFromX(tx) {
    return Math.round(-tx / unit);
  }

  function setTransformTo(trackIdx, instant) {
    var tx = -(trackIdx * unit);
    currentTranslate = tx;
    track.style.transition = instant
      ? "none"
      : "transform " + transitionMs + "ms cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    track.style.transform = "translate3d(" + tx + "px,0,0)";
  }

  function updateBars(idx) {
    bars.forEach(function (b, i) {
      b.classList.toggle("active", i === idx);
    });
  }

  // ── Progress ──
  function resetProgress() {
    hero.querySelectorAll(".hm-hero-bar-fill").forEach(function (f) {
      f.style.width = "0%";
    });
    if (HM.heroProgressTimer) {
      clearInterval(HM.heroProgressTimer);
      HM.heroProgressTimer = null;
    }
  }

  function startProgress() {
    resetProgress();
    if (!bars[HM.heroIndex]) return;
    var fill = bars[HM.heroIndex].querySelector(".hm-hero-bar-fill");
    if (!fill) return;
    var pct = 0,
      step = 100 / (autoInterval / 50);
    HM.heroProgressTimer = setInterval(function () {
      pct += step;
      if (pct > 100) pct = 100;
      fill.style.width = pct + "%";
    }, 50);
  }

  // ── Navigation ──
  function goTo(slideIdx, instant) {
    var newIdx =
      ((slideIdx % HM.heroSlideCount) + HM.heroSlideCount) % HM.heroSlideCount;
    HM.heroIndex = newIdx;

    var trackIdx;
    if (slideIdx < 0)
      trackIdx = 0; // clone_last
    else if (slideIdx >= HM.heroSlideCount)
      trackIdx = HM.heroSlideCount + 1; // clone_first
    else trackIdx = HM.heroIndex + 1; // real slide

    setTransformTo(trackIdx, !!instant);
    if (!instant) {
      isAnimating = true;
      updateBars(HM.heroIndex);
      resetProgress();
      startProgress();
    }
  }

  function next() {
    goTo(HM.heroIndex + 1);
  }

  function prev() {
    goTo(HM.heroIndex - 1);
  }

  // ── Infinite loop teleport ──
  track.addEventListener("transitionend", function () {
    var tidx = trackIdxFromX(currentTranslate);
    isAnimating = false;
    // At clone_last (track 0) → jump to real last (track N)
    if (tidx === 0) {
      HM.heroIndex = HM.heroSlideCount - 1;
      setTransformTo(HM.heroSlideCount, true);
      updateBars(HM.heroIndex);
    }
    // At clone_first (track N+1) → jump to real first (track 1)
    else if (tidx === HM.heroSlideCount + 1) {
      HM.heroIndex = 0;
      setTransformTo(1, true);
      updateBars(0);
    }
  });

  // ── Auto play ──
  function startAuto() {
    stopAuto();
    HM.heroTimer = setInterval(next, autoInterval);
  }

  function stopAuto() {
    if (HM.heroTimer) {
      clearInterval(HM.heroTimer);
      HM.heroTimer = null;
    }
    resetProgress();
  }

  // ── Touch ──
  var tch = { sx: 0, cx: 0, ok: false, moved: false, baseTx: 0 };
  hero.addEventListener(
    "touchstart",
    function (e) {
      if (isAnimating) return;
      var t = e.touches[0];
      tch.sx = t.clientX;
      tch.cx = t.clientX;
      tch.ok = true;
      tch.moved = false;
      tch.baseTx = currentTranslate;
      isDragging = true;
      stopAuto();
    },
    { passive: true },
  );

  hero.addEventListener(
    "touchmove",
    function (e) {
      if (!tch.ok || isAnimating) return;
      tch.cx = e.touches[0].clientX;
      var dx = tch.cx - tch.sx;
      if (Math.abs(dx) > 5) tch.moved = true;
      // Damped + clamped drag
      var maxOff = unit;
      var off = dx * dragDamping;
      if (off > maxOff) off = maxOff;
      if (off < -maxOff) off = -maxOff;
      track.style.transition = "none";
      track.style.transform = "translate3d(" + (tch.baseTx + off) + "px,0,0)";
    },
    { passive: true },
  );

  hero.addEventListener(
    "touchend",
    function () {
      if (!tch.ok) return;
      tch.ok = false;
      isDragging = false;
      var dx = tch.cx - tch.sx;
      var threshold = slideWidth * snapThreshold;
      if (tch.moved && Math.abs(dx) > threshold) {
        if (dx > 0) prev();
        else next();
      } else {
        // Snap back
        setTransformTo(trackIdxFromX(tch.baseTx), false);
      }
      // Resume auto after idle
      setTimeout(function () {
        if (!isDragging) startAuto();
      }, autoInterval + 500);
    },
    { passive: true },
  );

  // ── Mouse ──
  var mse = { down: false, sx: 0, cx: 0, baseTx: 0, moved: false };
  hero.addEventListener("mousedown", function (e) {
    if (isAnimating) return;
    mse.down = true;
    mse.moved = false;
    mse.sx = e.clientX;
    mse.cx = e.clientX;
    mse.baseTx = currentTranslate;
    isDragging = true;
    stopAuto();
  });

  window.addEventListener("mousemove", function (e) {
    if (!mse.down || isAnimating) return;
    mse.cx = e.clientX;
    var dx = mse.cx - mse.sx;
    if (Math.abs(dx) > 5) mse.moved = true;
    var maxOff = unit;
    var off = dx * dragDamping;
    if (off > maxOff) off = maxOff;
    if (off < -maxOff) off = -maxOff;
    track.style.transition = "none";
    track.style.transform = "translate3d(" + (mse.baseTx + off) + "px,0,0)";
  });

  window.addEventListener("mouseup", function () {
    if (!mse.down) return;
    mse.down = false;
    isDragging = false;
    var dx = mse.cx - mse.sx;
    var threshold = slideWidth * snapThreshold;
    if (mse.moved && Math.abs(dx) > threshold) {
      if (dx > 0) prev();
      else next();
    } else {
      setTransformTo(trackIdxFromX(mse.baseTx), false);
    }
    setTimeout(function () {
      if (!isDragging) startAuto();
    }, autoInterval + 500);
  });

  hero.addEventListener("mouseenter", stopAuto);
  hero.addEventListener("mouseleave", function () {
    if (!isDragging) startAuto();
  });

  // ── Init ──
  setupLayout();
  // Start at first real slide (track index 1)
  setTransformTo(1, true);
  updateBars(0);
  startAuto();

  // ── Resize ──
  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      slideWidth = calcWidth();
      unit = slideWidth + gap;
      hero
        .querySelectorAll(".hm-hero-slide, .hm-hero-clone")
        .forEach(function (s) {
          s.style.width = slideWidth + "px";
        });
      setTransformTo(HM.heroIndex + 1, true);
    }, 150);
  });
};

// ========== SUPABASE SECTIONS ==========
async function renderSupabaseSections() {
  if (!window.supabaseClient || typeof window.supabaseClient.from !== "function") return;
  var client = window.supabaseClient;
  try {
    var { data: sections, error } = await client.from("home_sections").select("*").eq("is_active", true).order("sort_order", { ascending: true });
    if (error || !sections || !sections.length) return;
    for (var si = 0; si < sections.length; si++) {
      var sec = sections[si];
      var products = [];
      if (sec.selection_mode === "manual") {
        var { data: sp } = await client.from("section_products").select("product_id").eq("section_id", sec.id).order("sort_order", { ascending: true });
        products = (sp || []).map(function(s) { return window.BudaStore ? window.BudaStore.getProductById(s.product_id) : null; }).filter(Boolean);
      } else {
        var rules = sec.auto_rules || {};
        var all = HM.allProducts || [];
        products = all.filter(function(p) {
          if (rules.category) { var pc = (p.category || "").toLowerCase(); var rc = rules.category.toLowerCase(); if (pc.indexOf(rc) === -1) return false; }
          if (rules.source && p.source !== rules.source) return false;
          if (rules.price_min > 0 && (Number(p.price) || 0) < rules.price_min) return false;
          if (rules.price_max > 0 && (Number(p.price) || 0) > rules.price_max) return false;
          if (rules.discount_min > 0 || rules.discount_max < 100) {
            var rp = window.BudaStore ? window.BudaStore.resolveProductPrice(p) : {};
            var dp = rp.discountPercent || 0;
            if (rules.discount_min > 0 && dp < rules.discount_min) return false;
            if (rules.discount_max < 100 && dp > rules.discount_max) return false;
          }
          if (rules.rating_min > 0 && (Number(p.rating) || 0) < rules.rating_min) return false;
          return true;
        });
        if (rules.sort_by === "discount") products.sort(function(a,b) { return ((window.BudaStore ? window.BudaStore.resolveProductPrice(b).discountPercent : 0) || 0) - ((window.BudaStore ? window.BudaStore.resolveProductPrice(a).discountPercent : 0) || 0); });
        else if (rules.sort_by === "rating") products.sort(function(a,b) { return (b.rating || 0) - (a.rating || 0); });
        else if (rules.sort_by === "price") products.sort(function(a,b) { return (a.price || 0) - (b.price || 0); });
        else products.sort(function() { return 0.5 - Math.random(); });
        products = products.slice(0, sec.display_count || 12);
      }
      if (!products.length) continue;
      var sectionConfig = {
        id: "supabase-" + sec.id,
        type: "custom",
        title: sec.title || "",
        subtitle: sec.subtitle || "",
        badge: sec.badge || "",
      };
      HM.renderProductCarousel(sectionConfig, products);
    }
  } catch (_e) {
    console.warn("Supabase sections error:", _e);
  }
}

// ========== MEGA OFFERS RENDERER (Noon-style 3 columns) ==========
HM.renderMegaOffers = function (section) {
  if (!HM.allProducts.length) return null;
  var pool = [].concat(HM.allProducts);
  pool.sort(function (a, b) { return resolvePrice(b).discountPercent - resolvePrice(a).discountPercent; });
  var cfg = HOME_CONFIG._megaConfig || {};
  // Col 1: اشتري أكثر
  var col1Mode = cfg.col1_mode || 'manual';
  var col1Items = [];
  if (col1Mode === 'auto') {
    col1Items = shuffleProducts(pool).slice(0, 4);
  } else {
    if (HOME_CONFIG._megaCol1Ids && HOME_CONFIG._megaCol1Ids.length) {
      var idMap1 = {};
      HM.allProducts.forEach(function (p) { idMap1[String(p.id)] = p; });
      HOME_CONFIG._megaCol1Ids.forEach(function (pid) {
        if (idMap1[pid]) col1Items.push(idMap1[pid]);
      });
    }
    if (!col1Items.length) col1Items = shuffleProducts(pool).slice(0, 4);
  }
  // Col 2: عروض ميجا
  var col2Mode = cfg.col2_mode || 'auto';
  var col2Items = [];
  if (col2Mode === 'auto') {
    col2Items = pool.slice(0, 4);
  } else {
    if (HOME_CONFIG._megaCol2Ids && HOME_CONFIG._megaCol2Ids.length) {
      var idMap2 = {};
      HM.allProducts.forEach(function (p) { idMap2[String(p.id)] = p; });
      HOME_CONFIG._megaCol2Ids.forEach(function (pid) {
        if (idMap2[pid]) col2Items.push(idMap2[pid]);
      });
    }
    if (!col2Items.length) col2Items = pool.slice(0, 4);
  }
  var html =
    '<div class="buda-mega-offers hm-fade">' +
    '  <div class="buda-mega-col buda-mega-col-1">' +
    '    <h3 class="buda-mega-col-title"><span class="material-icons-outlined">shopping_bag</span> اشتري أكثر وبالك مرتاح</h3>' +
    '    <div class="buda-mega-grid" id="buda-mega-grid-3">';
  col1Items.forEach(function (p) {
    var rp = resolvePrice(p);
    var img = getImage(p);
    html +=
      '<div class="buda-mega-product" data-view-product="' + String(p.id) + '">' +
      (rp.hasDiscount ? '<span class="buda-mega-product-badge">-' + rp.discountPercent + '%</span>' : '') +
      '<div class="buda-mega-product-img-wrap"><div class="buda-pulse-dot" data-pulse-dot="' + String(p.id) + '"><div class="buda-pulse-dot-inner"><div class="buda-pulse-dot-circle"></div></div></div><img class="buda-mega-product-img" src="' + img + '" alt="' + escapeHtml(p.name || '') + '" loading="lazy" onerror="this.style.display=\'none\'" /></div>' +
      '<div class="buda-mega-product-info">' +
      '<p class="buda-mega-product-name">' + escapeHtml((p.name || '').slice(0, 25)) + '</p>' +
      '<span class="buda-mega-product-price">' + formatMoney(rp.finalPrice) + '</span>' +
      (rp.hasDiscount ? '<span class="buda-mega-product-old">' + formatMoney(rp.originalPrice) + '</span>' : '') +
      '</div></div>';
  });
  html +=
    '    </div></div>' +
    '  <div class="buda-mega-col buda-mega-col-2">' +
    '    <h3 class="buda-mega-col-title"><span class="material-icons-outlined">bolt</span> عروض ميجا</h3>' +
    '    <div class="buda-mega-grid" id="buda-mega-grid-2">';
  col2Items.forEach(function (p) {
    var rp = resolvePrice(p);
    var img = getImage(p);
    html +=
      '<div class="buda-mega-product" data-view-product="' + String(p.id) + '">' +
      (rp.hasDiscount ? '<span class="buda-mega-product-badge">-' + rp.discountPercent + '%</span>' : '') +
      '<div class="buda-mega-product-img-wrap"><div class="buda-pulse-dot" data-pulse-dot="' + String(p.id) + '"><div class="buda-pulse-dot-inner"><div class="buda-pulse-dot-circle"></div></div></div><img class="buda-mega-product-img" src="' + img + '" alt="' + escapeHtml(p.name || '') + '" loading="lazy" onerror="this.style.display=\'none\'" /></div>' +
      '<div class="buda-mega-product-info">' +
      '<p class="buda-mega-product-name">' + escapeHtml((p.name || '').slice(0, 25)) + '</p>' +
      '<span class="buda-mega-product-price">' + formatMoney(rp.finalPrice) + '</span>' +
      (rp.hasDiscount ? '<span class="buda-mega-product-old">' + formatMoney(rp.originalPrice) + '</span>' : '') +
      (rp.hasDiscount ? '<span class="buda-mega-product-discount">-' + rp.discountPercent + '%</span>' : '') +
      '</div></div>';
  });
  // Col 3: banners from Supabase or defaults
  var banners = HOME_CONFIG._megaBanners && HOME_CONFIG._megaBanners.length ? HOME_CONFIG._megaBanners : [
    { image_url: '../assets/images/Home/ar_mb_eg-sfu-01_(14).1782231635.9679332_20260701054344.png', link_url: 'products.html?category=electronics', title: 'إلكترونيات', subtitle: 'خصم يصل إلى 50%' },
    { image_url: '../assets/images/Home/ar_mb_eg-sfu-01.1782196424.5733478_20260701065112.png', link_url: 'products.html?category=beauty-and-care', title: 'عروض التجميل', subtitle: 'تسوق الآن' }
  ];
  html +=
    '    </div></div>' +
    '  <div class="buda-mega-col buda-mega-col-3">' +
    '    <h3 class="buda-mega-col-title"><span class="material-icons-outlined">local_offer</span> شوف كل الخصومات</h3>' +
    '    <div class="buda-mega-banners">';
  banners.forEach(function (b) {
    html +=
      '      <a class="buda-mega-banner" href="' + escapeHtml(b.link_url || '#') + '">' +
      '        <div class="hm-banner-img"><div class="buda-pulse-dot"><div class="buda-pulse-dot-inner"><div class="buda-pulse-dot-circle"></div></div></div><img src="' + b.image_url + '" alt="" loading="lazy" onerror="this.closest(\'.buda-mega-banner\').style.display=\'none\'" /></div>' +
      '        <div class="buda-mega-banner-overlay"><strong>' + escapeHtml(b.title || '') + '</strong><span>' + escapeHtml(b.subtitle || '') + '</span></div>' +
      '      </a>';
  });
  html +=
    '    </div>' +
    '  </div></div>';
  var temp = document.createElement('div');
  temp.innerHTML = html;
  var el = temp.firstElementChild;
  if (!HM.contentEl) return null;
  HM.contentEl.appendChild(el);
  attachProductCardEvents(el);
  return el;
};

// ========== HOME-SPECIFIC HEADER ENHANCEMENTS (search autocomplete with products) ==========
function initBudaUI() {
  if (window._budaHomeUIInited) return;
  window._budaHomeUIInited = true;

  var searchInput = document.getElementById('search-input');
  var suggestionItems = document.getElementById('budaSearchSuggestionItems');
  var searchWrap = searchInput ? searchInput.closest('.buda-header__search') : null;

  function renderSuggestions(term) {
    if (!suggestionItems || !term.trim()) { if (suggestionItems) suggestionItems.innerHTML = ''; return; }
    var products = HM.allProducts || [];
    var matched = products.filter(function (p) {
      return (p.name || '').toLowerCase().indexOf(term.toLowerCase()) > -1;
    }).slice(0, 5);
    if (!matched.length) { suggestionItems.innerHTML = ''; return; }
    suggestionItems.innerHTML = matched.map(function (p) {
      return '<div class="buda-search-dd-item" data-search-term="' + escapeHtml(p.name) + '">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> ' + escapeHtml(p.name) + '</div>';
    }).join('');
    suggestionItems.querySelectorAll('[data-search-term]').forEach(function (el) {
      el.addEventListener('click', function () {
        var term = el.getAttribute('data-search-term');
        if (term) window.location.href = 'search.html?q=' + encodeURIComponent(term);
      });
    });
  }

  if (searchInput) {
    searchInput.addEventListener('focus', function () {
      var target = searchInput.getAttribute('data-search-target') || 'search.html';
      window.location.href = target;
    });
    searchInput.addEventListener('input', function () {
      var val = searchInput.value.trim();
      if (val) { renderSuggestions(val); }
    });
  }
}

// Override renderSection to include mega-offers
var _origRenderSection = HM.renderSection;
HM.renderSection = function (section) {
  if (section.type === 'mega-offers') {
    return HM.renderMegaOffers(section);
  }
  return _origRenderSection(section);
};

// ========== DYNAMIC CONFIG FROM SUPABASE ==========
HM.loadDynamicConfig = async function () {
  try {
    if (typeof getSupabaseClient !== 'function') return;
    var client = getSupabaseClient();
    if (!client) return;
    var country = localStorage.getItem('userCountry') || 'EG';

    // Get section IDs for this country
    var { data: pageSections } = await client.from('home_page_sections').select('id,section_type').eq('country', country).eq('is_active', true);
    if (!pageSections || !pageSections.length) return;

    var sectionMap = {};
    pageSections.forEach(function (s) { sectionMap[s.section_type] = s.id; });

    // 1. Hero slides
    if (sectionMap.hero) {
      var { data: heroSlides } = await client.from('home_hero_slides').select('*').eq('section_id', sectionMap.hero).order('sort_order');
      if (heroSlides && heroSlides.length) {
        HOME_CONFIG.heroSlides = heroSlides.map(function (s) {
          return { img: s.image_url, link: s.link_url && s.link_url !== '#' ? s.link_url : undefined };
        });
      }
    }

    // 2. Categories
    if (sectionMap.categories) {
      var { data: cats } = await client.from('home_categories').select('*').eq('section_id', sectionMap.categories).order('sort_order');
      if (cats && cats.length) {
        HOME_CONFIG.categories = cats.map(function (c) {
          return { name: c.name, img: c.image_url, link: c.link_url };
        });
      }
    }

    // 3. Banner top — replace the first banner entry with dynamic data
    if (sectionMap.banner_top) {
      var { data: banners } = await client.from('home_banners').select('*').eq('section_id', sectionMap.banner_top).order('sort_order').limit(1);
      if (banners && banners.length) {
        var b = banners[0];
        if (b.type === 'image_banner' && b.image_url) {
          HOME_CONFIG.banners[0] = {
            url: b.image_url,
            link: b.link_url || '#',
            size: 'wide',
            _dynamic: { type: 'image_banner', bg: 'transparent', border: 'none', padding: '0' }
          };
        } else {
          HOME_CONFIG.banners[0] = {
            url: '',
            link: b.link_url || '#',
            size: 'wide',
            _dynamic: {
              type: 'icon_banner',
              icon: b.icon || 'local_shipping',
              heading: b.heading || '',
              subtext: b.subtext || '',
              bg: b.background_color || '#f8f4ff',
              border: b.border_color || '#f3e8ff',
              textColor: b.text_color || '#1a2530',
              accentColor: b.accent_color || '#7c3aed'
            }
          };
        }
      }
    }

    // 4. Mega offers
    if (sectionMap.mega_offers) {
      // Config (mode per col) — try, table may not exist
      HOME_CONFIG._megaConfig = {};
      try {
        var { data: megaCfg } = await client.from('home_section_config').select('config_key,config_value').eq('section_id', sectionMap.mega_offers);
        if (megaCfg) megaCfg.forEach(function (c) { HOME_CONFIG._megaConfig[c.config_key] = c.config_value; });
      } catch(e) { /* table not ready yet */ }

      // Helper: fetch products for a col (fallback if col column missing)
      async function _fetchMegaCol(sid, col) {
        var q = client.from('home_mega_products').select('product_id').eq('section_id', sid).order('sort_order');
        if (window.__hasMegaCol !== false) {
          q = q.eq('col', col);
        }
        try {
          var { data } = await q;
          return data ? data.map(function(p) { return p.product_id; }) : [];
        } catch(e) {
          if (window.__hasMegaCol === undefined) { window.__hasMegaCol = false; }
          return [];
        }
      }
      HOME_CONFIG._megaCol1Ids = await _fetchMegaCol(sectionMap.mega_offers, 1);
      HOME_CONFIG._megaCol2Ids = await _fetchMegaCol(sectionMap.mega_offers, 2);

      // Mega banners
      var { data: megaBanners } = await client.from('home_mega_banners').select('*').eq('section_id', sectionMap.mega_offers).order('sort_order');
      if (megaBanners && megaBanners.length) {
        HOME_CONFIG._megaBanners = megaBanners;
      }
    }

    // 5. Smart Category Showcase
    var smartCc = (window.TaagerIntegration?.getSelectedCountry?.() || {}).code || localStorage.getItem('userCountry') || 'EG';
    var { data: smartCats } = await client.from('smart_category_showcase').select('*').eq('is_active', true).eq('country_code', smartCc).order('sort_order');
    if (smartCats && smartCats.length) {
      HOME_CONFIG._smartCategories = smartCats.map(function(c) {
        return {
          title: c.title,
          subtitle: c.subtitle || '',
          image_url: c.image_url,
          link_url: c.link_url || '#',
          gradient_from: c.gradient_from || '#000',
          gradient_to: c.gradient_to || '#000',
        };
      });
    }

    // 5. Ad banners
    if (sectionMap.ad_banners) {
      var { data: adBanners } = await client.from('home_ad_banners').select('*').eq('section_id', sectionMap.ad_banners).eq('is_active', true).order('sort_order');
      if (adBanners && adBanners.length) {
        HOME_CONFIG._adBanners = adBanners;
      }
    }
  } catch (e) {
    console.warn('[HM] Failed to load dynamic config:', e);
  }
};

// ========== COUNTRY GATE (mandatory country selection before browsing) ==========
function initCountryGate() {
  var gate = document.getElementById("hm-country-gate");
  if (!gate) return;

  var optionsEl = document.getElementById("hmCountryGateOptions");
  var opened = false;

  function listCountries() {
    if (!window.TaagerIntegration || !window.TaagerIntegration.getAvailableCountries) return [];
    return window.TaagerIntegration.getAvailableCountries();
  }

  function flagEmoji(country) {
    if (!country || !country.flag) return "";
    return /[^\x00-\x7F]/.test(String(country.flag)) ? String(country.flag) : "";
  }

  function openGate() {
    if (opened) return;
    opened = true;
    gate.classList.add("is-open");
    gate.setAttribute("aria-hidden", "false");
    document.body.classList.add("hm-gate-open");
  }

  function closeGate() {
    if (!opened) return;
    opened = false;
    gate.classList.remove("is-open");
    gate.setAttribute("aria-hidden", "true");
    document.body.classList.remove("hm-gate-open");
  }

  function maybeOpen() {
    if (!window.TaagerIntegration || !window.TaagerIntegration.getSelectedCountry) return;
    var selected = window.TaagerIntegration.getSelectedCountry();
    if (selected && selected.code) closeGate();
    else openGate();
  }

  var countries = listCountries();
  if (window.TaagerIntegration && optionsEl && countries.length) {
    optionsEl.innerHTML = countries
      .map(function (country) {
        var flag = flagEmoji(country);
        return (
          '<button type="button" class="hm-country-gate__option" data-gate-country="' +
          country.code +
          '">' +
          (flag ? '<span class="hm-country-gate__flag">' + flag + "</span>" : "") +
          "<span>" +
          country.name +
          "</span>" +
          "</button>"
        );
      })
      .join("");

    optionsEl.querySelectorAll("[data-gate-country]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var code = btn.getAttribute("data-gate-country");
        var target = null;
        for (var i = 0; i < countries.length; i++) {
          if (countries[i].code === code) {
            target = countries[i];
            break;
          }
        }
        if (target) {
          window.TaagerIntegration.setSelectedCountry(target);
          closeGate();
        }
      });
    });
  }

  document.addEventListener("boda:country-changed", function () {
    maybeOpen();
  });

  // Small delay so any startup country restore (profile) can finish first
  setTimeout(maybeOpen, 250);
}

// ========== INIT ==========
HM.init = async function () {
  var isHome = document.getElementById("hm-content") !== null;
  if (!isHome) return;
  HM.contentEl = document.getElementById("hm-content");
  initBudaUI();
  initCountryGate();
  if (
    window.skeletonLoader &&
    typeof window.skeletonLoader.hideSkeleton === "function"
  ) {
    window.skeletonLoader.hideSkeleton(document.body);
  }

  document.documentElement.lang = "ar";
  document.documentElement.dir = "rtl";
  if (window.BudaStore?.updateCartCount) window.BudaStore.updateCartCount();
  var deliverTo = document.getElementById("deliver-to-text");
  if (deliverTo) {
    var email = String(localStorage.getItem("userEmail") || "").trim();
    var selected = "";
    if (email) {
      var country = "EG";
      try { country = localStorage.getItem("userCountry") || "EG"; } catch {}
      if (window.TaagerIntegration && window.TaagerIntegration.getSelectedCountry) {
        var selC = window.TaagerIntegration.getSelectedCountry();
        if (selC && selC.code) country = selC.code;
      }
      var selKey = "buda_selected_address_" + email + "_" + country;
      var allKey = "buda_saved_addresses_" + email + "_" + country;
      var selId = localStorage.getItem(selKey) || '';
      try { selId = JSON.parse(selId); } catch {}
      if (selId) {
        var all = []; try { all = JSON.parse(localStorage.getItem(allKey) || '[]'); } catch {}
        var found = all.find(function (a) { return String(a.id) === String(selId); });
        if (found) {
          selected = found.fullAddress || found.area || found.street || found.building || found.label || found.name || '';
        }
      }
      if (!selected) selected = localStorage.getItem("selected_address_" + email) || "";
    }
    deliverTo.textContent = selected || "اختر عنوان التوصيل";
  }

  // Load dynamic home config from Supabase
  await HM.loadDynamicConfig();

  // Load products
  var source = await getHomeSourceProducts();
  HM.allProducts = normalizeProducts(source);
  HM.taagerOnly = HM.allProducts.filter(function (p) {
    return p.source === "taager";
  });

  // Render skeleton -> content progressively, preserving section order and data behavior.
  await HM.renderInitialProgressively();

  // Render dynamic sections from Supabase
  renderSupabaseSections();

  // Taager extra — render once, no auto-rotation
  function refreshTaagerExtraSections() {
    taagerExtraRotationOffset++;
    HOME_CONFIG.sections.forEach(function (sec) {
      if (sec.type === "taager-extra") {
        var el = document.getElementById("sec-" + sec.id);
        if (el) el.remove();
        HM.renderTaagerExtra(sec);
      }
    });
  }

  // Wishlist sync
  document.addEventListener("boda:wishlist-updated", function () {
    syncWishlistButtons(document);
  });

  // Products updated
  document.addEventListener("boda:products-updated", async function () {
    invalidateHomeProductsSourceCache();
    lastRandomProductIds = [];
    taagerExtraRotationOffset = 0;
    var source = await getHomeSourceProducts({ forceRefresh: true });
    HM.allProducts = normalizeProducts(source);
    HM.taagerOnly = HM.allProducts.filter(function (p) {
      return p.source === "taager";
    });
    HM.contentEl.innerHTML = "";
    HM.renderAll();
  });

  // Country changed
  document.addEventListener("boda:country-changed", async function () {
    invalidateHomeProductsSourceCache();
    lastRandomProductIds = [];
    taagerExtraRotationOffset = 0;
    var source = await getHomeSourceProducts({ forceRefresh: true });
    HM.allProducts = normalizeProducts(source);
    HM.taagerOnly = HM.allProducts.filter(function (p) {
      return p.source === "taager";
    });
    HM.contentEl.innerHTML = "";
    HM.renderAll();
  });
};

document.addEventListener("DOMContentLoaded", function () {
  HM.init();
});
