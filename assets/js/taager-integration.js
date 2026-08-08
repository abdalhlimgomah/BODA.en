(function () {
  "use strict";

  var TAAGER_MERCHANT_API = "https://merchant.api.taager.com/api";
  var TAAGER_COUNTRIES = [
    { code: "EG", name: "مصر", flag: "EG", slug: "egypt" },
    { code: "SA", name: "السعودية", flag: "🇸🇦", slug: "ksa" },
  ];

  var COUNTRY_STORAGE_KEY = "boda_selected_country";
  var CACHE_KEY = "boda_taager_products_cache_v2";
  var CACHE_TTL_MS = 10 * 60 * 1000;
  var AUTH_FAILURE_BACKOFF_MS = 2 * 60 * 1000;
  var TAAGER_PRODUCTS_PAGE_SIZE = 100;
  var TAAGER_MAX_PAGES = 50;
  var inFlightProductsRequests = {};

  var authFailureUntil = 0;
  var authFailedCountries = {};

  function getEdgeFunctionUrl() {
    return window.TAAGER_EDGE_FUNCTION_URL || "";
  }

  function getApiKey() {
    return window.TAAGER_API_KEY || "";
  }

  function getCountryRequestKey(countryCode) {
    return String(countryCode || "ALL").toUpperCase();
  }

  function createTaagerError(message, status) {
    var error = new Error(message);
    error.status = status || 0;
    error.isTaagerAuthError = status === 401 || status === 403;
    return error;
  }

  function isTaagerAuthError(error) {
    if (!error) return false;
    if (error.isTaagerAuthError) return true;
    var status = Number(error.status || 0);
    if (status === 401 || status === 403) return true;
    var message = String(error.message || "");
    return /\b(401|403)\b/.test(message);
  }

  function setAuthFailureBackoff() {
    authFailureUntil = Date.now() + AUTH_FAILURE_BACKOFF_MS;
  }

  function log(level) {
    var args = Array.prototype.slice.call(arguments, 1);
    var prefix = "[Taager]";
    if (level === "error") {
      console.error.apply(console, [prefix].concat(args));
    } else if (level === "warn") {
      console.warn.apply(console, [prefix].concat(args));
    } else {
      console.log.apply(console, [prefix].concat(args));
    }
  }

  function safeNumber(value) {
    var n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function sanitizeText(value) {
    var text = String(value || "").trim();
    if (!text) return "";
    var lowered = text.toLowerCase();
    if (lowered === "null" || lowered === "undefined" || lowered === "n/a") return "";
    return text;
  }

  function parseArrayField(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      var text = value.trim();
      if (!text) return [];
      if ((text.indexOf("[") === 0 && text.lastIndexOf("]") === text.length - 1) ||
          (text.indexOf("{") === 0 && text.lastIndexOf("}") === text.length - 1)) {
        try {
          var parsed = JSON.parse(text);
          return Array.isArray(parsed) ? parsed : [];
        } catch (_a) {}
      }
      return text
        .split(/[,\n;|]+/g)
        .map(function (entry) { return sanitizeText(entry); })
        .filter(Boolean);
    }
    return [];
  }

  var MEMORY_CACHE_TTL_MS = 5 * 60 * 1000;
  var IDB_DB_NAME = "buda_store_cache";
  var IDB_STORE_NAME = "taager_products";
  var IDB_KEY_PREFIX = "list_v3_";
  var _taagerMemoryCache = {};
  var _idbDbPromise = null;

  function getIDB() {
    if (!window.indexedDB) return null;
    if (_idbDbPromise) return _idbDbPromise;
    _idbDbPromise = new Promise(function (resolve) {
      var req;
      try {
        req = window.indexedDB.open(IDB_DB_NAME, 1);
      } catch (_e) {
        resolve(null);
        return;
      }
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          db.createObjectStore(IDB_STORE_NAME);
        }
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        _idbDbPromise = null;
        resolve(null);
      };
    });
    return _idbDbPromise;
  }

  function idbSet(key, value) {
    return getIDB()
      .then(function (db) {
        if (!db) return;
        return new Promise(function (resolve) {
          try {
            var tx = db.transaction(IDB_STORE_NAME, "readwrite");
            tx.objectStore(IDB_STORE_NAME).put(value, key);
            tx.oncomplete = resolve;
            tx.onerror = function () { resolve(); };
            tx.onabort = function () { resolve(); };
          } catch (_e) {
            resolve();
          }
        });
      });
  }

  function idbGet(key) {
    return getIDB()
      .then(function (db) {
        if (!db) return null;
        return new Promise(function (resolve) {
          try {
            var tx = db.transaction(IDB_STORE_NAME, "readonly");
            var reqGet = tx.objectStore(IDB_STORE_NAME).get(key);
            reqGet.onsuccess = function () {
              resolve(reqGet.result || null);
            };
            reqGet.onerror = function () { resolve(null); };
          } catch (_e) {
            resolve(null);
          }
        });
      });
  }

  function idbDeleteKey(key) {
    return getIDB()
      .then(function (db) {
        if (!db) return;
        return new Promise(function (resolve) {
          try {
            var tx = db.transaction(IDB_STORE_NAME, "readwrite");
            tx.objectStore(IDB_STORE_NAME).delete(key);
            tx.oncomplete = resolve;
            tx.onerror = function () { resolve(); };
            tx.onabort = function () { resolve(); };
          } catch (_e) {
            resolve();
          }
        });
      });
  }

  function idbClearAll() {
    return getIDB()
      .then(function (db) {
        if (!db) return;
        return new Promise(function (resolve) {
          try {
            var tx = db.transaction(IDB_STORE_NAME, "readwrite");
            tx.objectStore(IDB_STORE_NAME).clear();
            tx.oncomplete = resolve;
            tx.onerror = function () { resolve(); };
            tx.onabort = function () { resolve(); };
          } catch (_e) {
            resolve();
          }
        });
      });
  }

  function getCacheKeyForCountry(countryCode) {
    return IDB_KEY_PREFIX + getCountryRequestKey(countryCode);
  }

  // ===== Legacy cleanup: the old localStorage cache (boda_taager_products_cache_v2)
  // exceeded the ~5MB quota so it failed silently and caused a full-table download
  // on every page load. Remove it so it frees space and is never read again.
  try {
    if (localStorage.getItem(CACHE_KEY)) localStorage.removeItem(CACHE_KEY);
  } catch (_a) {}

  function getCachedProducts(countryCode) {
    var cacheKey = getCacheKeyForCountry(countryCode);
    var mem = _taagerMemoryCache[cacheKey];
    if (mem && Date.now() - mem.t < MEMORY_CACHE_TTL_MS) {
      return Promise.resolve(mem.products);
    }
    return idbGet(cacheKey).then(function (entry) {
      if (!entry || !entry.timestamp || !Array.isArray(entry.products)) return null;
      if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
        _taagerMemoryCache[cacheKey] = {
          t: entry.timestamp,
          products: entry.products,
        };
        return entry.products;
      }
      idbDeleteKey(cacheKey);
      return null;
    });
  }

  function setCachedProducts(products, countryCode) {
    var cacheKey = getCacheKeyForCountry(countryCode);
    _taagerMemoryCache[cacheKey] = { t: Date.now(), products: products };
    idbSet(cacheKey, { timestamp: Date.now(), products: products }).catch(function () {});
  }

  function getSelectedCountry() {
    try {
      var raw = localStorage.getItem(COUNTRY_STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.code) return parsed;
      }
    } catch (_a) {}
    return null;
  }

  function setSelectedCountry(country) {
    try {
      localStorage.setItem(COUNTRY_STORAGE_KEY, JSON.stringify(country));
      document.dispatchEvent(
        new CustomEvent("boda:country-changed", { detail: country })
      );
    } catch (_a) {}
  }

  function getAvailableCountries() {
    return TAAGER_COUNTRIES;
  }

  function normalizeTaagerProduct(item) {
    if (!item || typeof item !== "object") return null;
    var id = String(
      item.variantId || item.id || item.product_id || item.productId || item.sku || item.code || item.legacyVariantId || ""
    ).trim();
    if (!id) return null;

    var fin = item.financials || {};
    var price = safeNumber(
      fin.finalPrice || fin.price || item.price || item.current_price || item.final_price || item.amount || item.sale_price
    );
    var originalPrice = safeNumber(
      fin.originalPrice || fin.finalPriceBeforeDiscount || fin.discountedPrice ||
      item.original_price || item.old_price || item.list_price || item.compare_at_price
    );
    if (originalPrice > 0 && originalPrice >= price) {
      price = Math.min(price, originalPrice);
      originalPrice = Math.max(price, originalPrice);
    } else {
      originalPrice = 0;
    }

    var image = "";
    var thumbnail = item.thumbnail || item.thumbnailUrl || "";
    if (thumbnail) image = thumbnail;
    if (!image) {
      var imageCandidates = [
        item.image_url, item.image, item.product_image,
        item.img, item.imageUrl, item.image1, item.image_1,
      ];
      for (var i = 0; i < imageCandidates.length; i++) {
        var candidate = sanitizeText(imageCandidates[i]);
        if (candidate) {
          image = candidate;
          break;
        }
      }
    }
    if (!image && Array.isArray(item.images) && item.images.length) {
      image = sanitizeText(item.images[0]);
    }

    if (!window.__taager_debug_logged__) {
      window.__taager_debug_logged__ = true;
      console.log("[Taager] Normalize raw image fields:", {
        thumbnail: item.thumbnail,
        thumbnailUrl: item.thumbnailUrl,
        image_url: item.image_url,
        image: item.image,
        product_image: item.product_image,
        img: item.img,
        imageUrl: item.imageUrl,
        image1: item.image1,
        image_1: item.image_1,
        image2: item.image2,
        image_2: item.image_2,
        image3: item.image3,
        image_3: item.image_3,
        image4: item.image4,
        image_4: item.image_4,
        image5: item.image5,
        image_5: item.image_5,
        image6: item.image6,
        image_6: item.image_6,
        image7: item.image7,
        image_7: item.image_7,
        image8: item.image8,
        image_8: item.image_8,
        images: item.images,
        gallery: item.gallery,
        extra_images: item.extra_images,
        additional_images: item.additional_images,
        media: item.media,
        variantImages: item.variantImages,
        productImage: item.productImage,
      });
    }

    var category = sanitizeText(
      item.category || item.category_name || item.type || item.categoryId ||
      (Array.isArray(item.tags) ? item.tags[0] : item.tag) || "بدون تصنيف"
    );
    var description = sanitizeText(
      item.description || item.summary || item.details ||
      (item.additionalInfo ? item.additionalInfo.description : "") || ""
    );
    var additionalInfo = item.additionalInfo || {};
    var quickDetails = sanitizeText(
      item.quickDetails || item.quick_details || item.quickDetail || additionalInfo.quickDetails || additionalInfo.quick_details || ""
    );
    var contentIdeas = sanitizeText(
      item.contentIdeas || item.content_ideas || item.contentIdea || item.content_idea || additionalInfo.contentIdeas || additionalInfo.content_ideas || ""
    );
    var howToUse = sanitizeText(
      item.howToUse || item.how_to_use || item.usageInstructions || additionalInfo.howToUse || additionalInfo.how_to_use || ""
    );
    var videos = parseArrayField(item.videos || item.media || item.videoUrls || item.video_urls || additionalInfo.videos || []);
    var name = sanitizeText(item.name || item.title || item.product_name || "منتج من تاجِر");

    var availableCountries = [];
    if (item._taager_country) {
      availableCountries = [item._taager_country];
    } else if (Array.isArray(item.available_countries)) {
      availableCountries = item.available_countries;
    } else if (item.country || item.country_code) {
      availableCountries = [String(item.country || item.country_code)];
    } else {
      availableCountries = ["EG"];
    }

    var normalized = {
      id: "taager_" + id,
      source: "taager",
      taager_product_id: id,
      name: name,
      quick_details: quickDetails,
      content_ideas: contentIdeas,
      how_to_use: howToUse,
      videos: videos.length ? videos : [],
      price: price,
      original_price: originalPrice || undefined,
      image: image,
      images: Array.isArray(item.images) && item.images.length ? item.images : (image ? [image] : []),
      image1: item.image1 || item.image_1 || "",
      image2: item.image2 || item.image_2 || "",
      image3: item.image3 || item.image_3 || "",
      image4: item.image4 || item.image_4 || "",
      image5: item.image5 || item.image_5 || "",
      image6: item.image6 || item.image_6 || "",
      image7: item.image7 || item.image_7 || "",
      image8: item.image8 || item.image_8 || "",
      image_url: item.image_url || item.imageUrl || "",
      imageUrl: item.imageUrl || item.image_url || "",
      gallery: item.gallery || item.extra_images || item.additional_images || "",
      category: category,
      description: description,
      available_countries: availableCountries,
      seller: "تاجر",
      seller_id: "taager",
      seller_email: "",
      rating: 0,
      reviewCount: 0,
      ratingSource: "ratings",
      rating_source: "ratings",
      hasSupabaseRatings: true,
      stock: 999,
      stockStatus: "in_stock",
    };

    var stockInfo = item.stockAvailability || item.stock || {};
    if (stockInfo.stockBucket || stockInfo.stockRange) {
      var bucket = String(stockInfo.stockBucket || stockInfo.stockRange || "");
      if (bucket === "NOT_AVAILABLE" || bucket.indexOf("NOT") === 0) {
        normalized.stock = 0;
        normalized.stockStatus = "out_of_stock";
      } else if (bucket.indexOf("LESS_THAN") === 0) {
        normalized.stock = 5;
      } else if (bucket.indexOf("more_than_100") === 0) {
        normalized.stock = 999;
      } else {
        normalized.stock = 50;
      }
    }

    if (item.brand) normalized.brand = sanitizeText(item.brand);
    if (item.vendor) normalized.seller = sanitizeText(item.vendor);

    return normalized;
  }

  function normalizeStoredTaagerProduct(item) {
    if (!item || typeof item !== "object") return null;

    var storedId = sanitizeText(item.id);
    var taagerProductId = sanitizeText(
      item.taager_product_id ||
      item.product_id ||
      item.productId ||
      item.variantId ||
      (storedId.indexOf("taager_") === 0 ? storedId.slice(7) : storedId)
    );
    var id = storedId
      ? (storedId.indexOf("taager_") === 0
        ? storedId
        : (taagerProductId && storedId === taagerProductId ? "taager_" + taagerProductId : storedId))
      : (taagerProductId ? "taager_" + taagerProductId : "");
    if (!id) return null;

    var image = sanitizeText(item.image || item.image_url || item.imageUrl || item.thumbnail);
    var images = parseArrayField(item.images);
    var availableCountries = parseArrayField(item.available_countries).map(function (entry) {
      return sanitizeText(entry).toUpperCase();
    }).filter(Boolean);

    var quickDetails = sanitizeText(item.quick_details || item.quickDetails || "");
    var contentIdeas = sanitizeText(item.content_ideas || item.contentIdeas || "");
    var howToUse = sanitizeText(item.how_to_use || item.howToUse || "");
    var videos = parseArrayField(item.videos || []);

    return {
      id: id,
      source: "taager",
      raw_data: item.raw_data,
      taager_product_id: taagerProductId || (id.indexOf("taager_") === 0 ? id.slice(7) : id),
      product_id: taagerProductId || (id.indexOf("taager_") === 0 ? id.slice(7) : id),
      name: sanitizeText(item.name || item.title || item.product_name || "منتج من تاجِر"),
      description: sanitizeText(item.description || item.summary || item.details),
      quick_details: quickDetails,
      content_ideas: contentIdeas,
      how_to_use: howToUse,
      videos: videos.length ? videos : [],
      category: sanitizeText(item.category || item.category_name || item.type || "بدون تصنيف"),
      price: safeNumber(item.price || item.current_price || item.final_price || item.amount),
      original_price: safeNumber(item.original_price || item.old_price || item.list_price || item.compare_at_price) || undefined,
      image: image,
      images: images.length ? images : (image ? [image] : []),
      image1: sanitizeText(item.image1 || item.image_1),
      image2: sanitizeText(item.image2 || item.image_2),
      image3: sanitizeText(item.image3 || item.image_3),
      image4: sanitizeText(item.image4 || item.image_4),
      image5: sanitizeText(item.image5 || item.image_5),
      image6: sanitizeText(item.image6 || item.image_6),
      image7: sanitizeText(item.image7 || item.image_7),
      image8: sanitizeText(item.image8 || item.image_8),
      image_url: sanitizeText(item.image_url || item.imageUrl || image),
      imageUrl: sanitizeText(item.imageUrl || item.image_url || image),
      gallery: item.gallery || item.extra_images || item.additional_images || "",
      available_countries: availableCountries,
      seller: sanitizeText(item.seller || item.vendor || "تاجر") || "تاجر",
      seller_id: sanitizeText(item.seller_id || "taager") || "taager",
      seller_email: sanitizeText(item.seller_email || item.vendor_email || item.owner_email),
      brand: sanitizeText(item.brand || item.vendor || item.store_name),
      stock: safeNumber(item.stock || item.quantity || 999) || 0,
      stockStatus: sanitizeText(item.stock_status || item.stockStatus || "in_stock") || "in_stock",
      stock_status: sanitizeText(item.stock_status || item.stockStatus || "in_stock") || "in_stock",
      rating: safeNumber(item.rating),
      reviewCount: safeNumber(item.reviewCount || item.review_count),
      ratingSource: sanitizeText(item.ratingSource || item.rating_source || "ratings") || "ratings",
      rating_source: sanitizeText(item.rating_source || item.ratingSource || "ratings") || "ratings",
      hasSupabaseRatings: true,
      created_at: item.created_at,
      updated_at: item.updated_at,
      last_synced_at: item.last_synced_at,
      is_active: item.is_active !== false,
    };
  }

  function buildEdgeHeaders(apiKey) {
    var headers = { "Content-Type": "application/json" };
    if (window.SUPABASE_ANON_KEY) {
      headers.apikey = window.SUPABASE_ANON_KEY;
      headers.Authorization = "Bearer " + window.SUPABASE_ANON_KEY;
    }
    if (apiKey) headers["x-api-key"] = apiKey;
    return headers;
  }

  async function fetchTaagerProductsFromEdge(action, countryCode, normalizer) {
    var edgeUrl = getEdgeFunctionUrl();
    if (!edgeUrl) return [];

    var apiKey = getApiKey();
    var url = edgeUrl + "?action=" + encodeURIComponent(action);
    if (countryCode) url += "&country=" + encodeURIComponent(countryCode);

    var response = await fetch(url, { headers: buildEdgeHeaders(apiKey) });
    if (!response.ok) {
      var errorText = await response.text();
      var errorMessage = "Edge function returned " + response.status;
      if (errorText) {
        try {
          var parsedError = JSON.parse(errorText);
          if (parsedError && parsedError.error) {
            errorMessage = parsedError.error;
          }
        } catch (_b) {
          errorMessage += ": " + errorText;
        }
      }
      throw createTaagerError(errorMessage, response.status);
    }

    var data = await response.json();
    var items = Array.isArray(data)
      ? data
      : Array.isArray(data.products)
      ? data.products
      : Array.isArray(data.data)
      ? data.data
      : [];

    return items.map(normalizer).filter(Boolean);
  }

  async function fetchTaagerProductsFromSupabase(countryCode) {
    if (
      !window.supabaseClient ||
      typeof window.supabaseClient.fetchTaagerProducts !== "function"
    ) {
      return [];
    }

    try {
      var products = await window.supabaseClient.fetchTaagerProducts(countryCode);
      if (Array.isArray(products) && products.length) {
        log("info", "Loaded " + products.length + " Taager products from Supabase");
        return products;
      }
    } catch (error) {
      log("warn", "Supabase taager_products fetch failed:", error.message);
    }

    return [];
  }

  async function fetchStoredTaagerProducts(countryCode) {
    try {
      var products = await fetchTaagerProductsFromEdge("stored-products", countryCode, normalizeStoredTaagerProduct);
      if (Array.isArray(products) && products.length) {
        log("info", "Loaded " + products.length + " Taager products from stored-products");
        return products;
      }
    } catch (error) {
      log("warn", "Stored Taager products fetch failed:", error.message);
    }

    return [];
  }

  async function fetchTaagerProducts(countryCode) {
    var requestKey = getCountryRequestKey(countryCode);
    if (inFlightProductsRequests[requestKey]) {
      return inFlightProductsRequests[requestKey];
    }

    var requestPromise = (async function () {
    var cached = await getCachedProducts(countryCode);
    if (cached && cached.length) {
      return filterByCountry(cached, countryCode);
    }

    var storedProducts = await fetchStoredTaagerProducts(countryCode);
    if (storedProducts.length) {
      setCachedProducts(storedProducts, countryCode);
      document.dispatchEvent(new CustomEvent("boda:products-updated", {
        detail: { source: "taager-stored", count: storedProducts.length },
      }));
      return filterByCountry(storedProducts, countryCode);
    }

    var supabaseProducts = await fetchTaagerProductsFromSupabase(countryCode);
    if (supabaseProducts.length) {
      setCachedProducts(supabaseProducts, countryCode);
      document.dispatchEvent(new CustomEvent("boda:products-updated", {
        detail: { source: "taager-supabase", count: supabaseProducts.length },
      }));
      return filterByCountry(supabaseProducts, countryCode);
    }

    return [];
    })();

    inFlightProductsRequests[requestKey] = requestPromise;
    try {
      return await requestPromise;
    } finally {
      delete inFlightProductsRequests[requestKey];
    }
    }

  async function fetchTaagerProductDetail(productId) {
    var selectedCode = "";
    var selected = getSelectedCountry();
    if (selected && selected.code) selectedCode = selected.code;

    var cached = await getCachedProducts(selectedCode);
    if (!cached) cached = await getCachedProducts("");
    if (cached) {
      var found = null;
      for (var i = 0; i < cached.length; i++) {
        if (cached[i].id === productId || cached[i].taager_product_id === productId) {
          found = cached[i];
          break;
        }
      }
      if (found) return found;
    }

    var allProducts = await fetchTaagerProducts(selectedCode);
    for (var j = 0; j < allProducts.length; j++) {
      if (allProducts[j].id === productId || allProducts[j].taager_product_id === productId) {
        return allProducts[j];
      }
    }
    return null;
  }

  function filterByCountry(products, countryCode) {
    if (!countryCode) return products;
    return products.filter(function (product) {
      return matchesCountry(product, countryCode);
    });
  }

  function getCountrySlug(code) {
    for (var i = 0; i < TAAGER_COUNTRIES.length; i++) {
      if (TAAGER_COUNTRIES[i].code === code) return TAAGER_COUNTRIES[i].slug;
    }
    return code;
  }

  function countryKeyMatches(value, code) {
    var upp = String(value || "").toUpperCase().trim();
    if (!upp) return false;
    var upper = String(code || "").toUpperCase().trim();
    var iso3 = { EG: "EGY", SA: "SAU", AE: "ARE", IQ: "IRQ", OM: "OMN" };
    var slugs = {
      EG: ["EGYPT", "مصر"],
      SA: ["KSA", "SAUDI-ARABIA", "SAUDI ARABIA", "السعودية"],
      AE: ["UAE", "EMIRATES", "الإمارات"],
      IQ: ["IRAQ", "العراق"],
      OM: ["OMAN", "عمان"],
    };
    if (upp === upper) return true;
    if (upp === iso3[upper]) return true;
    var list = slugs[upper] || [];
    for (var i = 0; i < list.length; i++) {
      if (upp === list[i]) return true;
    }
    return false;
  }

  function matchesCountry(product, countryCode) {
    if (!product) return false;
    var upper = String(countryCode || "EG").toUpperCase().trim();
    var countryField = String(product.country || product.country_code || "").toUpperCase().trim();
    var countries = Array.isArray(product.available_countries) ? product.available_countries : [];
    if (countries.length) {
      for (var i = 0; i < countries.length; i++) {
        if (countryKeyMatches(countries[i], upper)) return true;
      }
      return false;
    }
    if (countryField) return countryKeyMatches(countryField, upper);
    return true;
  }

  function filterProductsByCountry(products, countryCode) {
    if (!Array.isArray(products)) return [];
    var upper = String(countryCode || "EG").toUpperCase().trim();
    return products.filter(function (product) {
      return matchesCountry(product, upper);
    });
  }

  function mergeTaagerIntoStore(taagerProducts) {
    if (!window.BudaStore || !taagerProducts.length) return;
    var allProducts = window.BudaStore.getAllProducts();
    var added = 0;
    for (var i = 0; i < taagerProducts.length; i++) {
      var tp = taagerProducts[i];
      if (!tp || !tp.id) continue;
      if (allProducts[tp.id]) continue;
      window._supabaseProductCache = window._supabaseProductCache || {};
      window._supabaseProductCache[tp.id] = tp;
      if (i === 0) {
        console.log("[Taager] Merging first product images:", tp.images);
        console.log("[Taager] Merging first product image1-5:", tp.image1, tp.image2, tp.image3, tp.image4, tp.image5);
      }
      added++;
    }
    if (added > 0) {
      log("info", "Merged " + added + " Taager products into store");
    }
  }

  function annotateCartItemWithSource(item, selectedCountry) {
    if (!item) return item;
    var product = window.BudaStore ? window.BudaStore.getProductById(String(item.id)) : null;
    if (product && product.source === "taager") {
      item.source = "taager";
      item.taager_product_id = product.taager_product_id || item.id;
      item.country_code = (selectedCountry && selectedCountry.code) || "EG";
    }
    return item;
  }

  function getOrderPayloadExtra(selectedCountry) {
    return {
      order_source: "taager",
      country_code: (selectedCountry && selectedCountry.code) || "EG",
      taager_order_status: "not_submitted",
    };
  }

  function hydrateSelectedCountryFromOrder(order) {
    if (!order) return null;
    var code = order.country_code || order.countryCode || "";
    if (!code) return null;
    for (var i = 0; i < TAAGER_COUNTRIES.length; i++) {
      if (TAAGER_COUNTRIES[i].code === code) return TAAGER_COUNTRIES[i];
    }
    return null;
  }

  function clearCache() {
    _taagerMemoryCache = {};
    idbClearAll();
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (_a) {}
  }

  function getTaagerConfig() {
    return {
      apiKey: getApiKey(),
      taagerId: window.TAAGER_TAAGER_ID || "",
      sessionKey: window.TAAGER_SESSION_KEY || "",
      edgeUrl: getEdgeFunctionUrl(),
      merchantApi: window.TAAGER_MERCHANT_API || TAAGER_MERCHANT_API,
    };
  }

  async function loadCredentialsFromSupabase() {
    try {
      if (window.supabaseClient && typeof window.supabaseClient.loadTaagerCredentials === "function") {
        await window.supabaseClient.loadTaagerCredentials();
        return true;
      }
    } catch (_e) {}
    return false;
  }

  window.TaagerIntegration = {
    COUNTRIES: TAAGER_COUNTRIES,
    COUNTRY_STORAGE_KEY: COUNTRY_STORAGE_KEY,
    getSelectedCountry: getSelectedCountry,
    setSelectedCountry: setSelectedCountry,
    getAvailableCountries: getAvailableCountries,
    fetchTaagerProducts: fetchTaagerProducts,
    fetchTaagerProductDetail: fetchTaagerProductDetail,
    normalizeTaagerProduct: normalizeTaagerProduct,
    filterByCountry: filterByCountry,
    matchesCountry: matchesCountry,
    filterProductsByCountry: filterProductsByCountry,
    getCountrySlug: getCountrySlug,
    mergeTaagerIntoStore: mergeTaagerIntoStore,
    annotateCartItemWithSource: annotateCartItemWithSource,
    getOrderPayloadExtra: getOrderPayloadExtra,
    hydrateSelectedCountryFromOrder: hydrateSelectedCountryFromOrder,
    clearCache: clearCache,
    getCachedProducts: getCachedProducts,
    getApiKey: getApiKey,
    getEdgeFunctionUrl: getEdgeFunctionUrl,
    getTaagerConfig: getTaagerConfig,
    loadCredentialsFromSupabase: loadCredentialsFromSupabase,
    log: log,
  };
})();

