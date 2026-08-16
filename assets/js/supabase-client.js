// Central Supabase helper. Load once per page after supabase-js library.

if (typeof window.SUPABASE_URL === 'undefined') {
  window.SUPABASE_URL = "https://msgqzgzoslearaprgiqq.supabase.co";
  window.SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZ3F6Z3pvc2xlYXJhcHJnaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzk3MTIsImV4cCI6MjA4NTkxNTcxMn0.fQu1toCisGIly8FZqHy3yoEwnY-e7vthk8PCmkBMifE";
}

if (typeof window._clientInstance === 'undefined') {
  window._clientInstance = null;
}

// Ensure a single Supabase client per page. Direct createClient calls
// (home.js, category-landing.js, external scripts) would otherwise spawn
// extra GoTrueClient instances under the same storage key.
// Security: every REST request to this Supabase project carries a dynamic
// "x-user-email" header (from localStorage) so RLS policies can gate rows
// to their owner. Injected at the fetch layer so it works with every
// supabase-js build (vendored or CDN fallback).
function getSecUserEmail() {
  try {
    var raw = String(
      localStorage.getItem("userEmail") || localStorage.getItem("user_email") || ""
    ).trim();
    return raw.toLowerCase();
  } catch (e) {
    return "";
  }
}
(function injectSecurityFetch() {
  if (window.__bodaSecFetch) return;
  window.__bodaSecFetch = true;
  var originalFetch = window.fetch;
  if (typeof originalFetch !== "function") return;
  window.fetch = function (input, init) {
    try {
      var url = typeof input === "string" ? input : (input && input.url) || "";
      if (url.indexOf("/rest/v1/") !== -1) {
        init = init || {};
        if (!(init.headers instanceof Headers)) {
          init.headers = new Headers(init.headers || {});
        }
        var email = getSecUserEmail();
        if (email) {
          init.headers.set("x-user-email", email);
        }
      }
    } catch (e) {}
    return originalFetch.call(this, input, init);
  };
})();
(function ensureSingleSupabaseClient() {
  if (!window.supabase || typeof window.supabase.createClient !== "function") return;
  if (window.supabase.createClient.__bodaSingle) return;
  var realCreateClient = window.supabase.createClient;
  window.supabase.createClient = function () {
    if (window._clientInstance && isRealSupabaseClient(window._clientInstance)) {
      return window._clientInstance;
    }
    var fresh = realCreateClient.apply(window.supabase, arguments);
    if (fresh && typeof fresh.from === "function") {
      window._clientInstance = fresh;
    }
    return fresh;
  };
  window.supabase.createClient.__bodaSingle = true;
})();

if (typeof window._ordersColumnsCache === 'undefined') {
  window._ordersColumnsCache = null;
}

if (typeof window._keyValidated === 'undefined') {
  window._keyValidated = false;
}

if (typeof DEFAULT_ORDERS_COLUMNS === 'undefined') {
  var DEFAULT_ORDERS_COLUMNS = [
    "user_name",
    "email",
    "phone",
    "address",
    "status",
    "total_price",
    "type",
    "order_source",
    "country_code",
    "taager_order_status",
    "seller_id",
    "created_at",
    "name",
    "customer_name",
    "user_email",
    "customer_email",
    "customer_phone",
    "customer_address",
    "order_status",
    "total",
    "amount",
    "payment_method",
    "user_id",
    "items_json",
    "items",
    "order_items",
    "discount",
    "discount_amount",
    "discount_value",
    "coupon_code",
    "coupon",
    "cbon",
    "shipping_fee",
    "shipping",
    "shipping_cost",
    "order_batch_id",
    "tax",
    "tax_amount",
    "cod_fee",
    "payment_fee",
  ];
}

const TAAGER_PRODUCTS_FEED_URL = window.TAAGER_PRODUCTS_FEED_URL || "";
const TAAGER_PRODUCTS_API_KEY = window.TAAGER_PRODUCTS_API_KEY || "";

function isTaagerFeedConfigured() {
  return typeof TAAGER_PRODUCTS_FEED_URL === "string" && TAAGER_PRODUCTS_FEED_URL.trim().length > 0;
}

function parseArrayField(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];
    if ((text.startsWith("[") && text.endsWith("]")) || (text.startsWith("{") && text.endsWith("}"))) {
      try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        // Fall back to splitting below.
      }
    }
    return text
      .split(/[,\n;|]+/g)
      .map((entry) => sanitizeText(entry))
      .filter(Boolean);
  }
  return [];
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeTaagerProduct(item) {
  if (!item || typeof item !== "object") return null;
  const id = String(
    item.id ?? item.product_id ?? item.productId ?? item.sku ?? item.code ?? ""
  ).trim();
  if (!id) return null;

  const price = safeNumber(
    item.price ?? item.current_price ?? item.final_price ?? item.amount ?? item.sale_price ?? item.price_amount
  );
  const originalPrice = safeNumber(
    item.original_price ?? item.old_price ?? item.list_price ?? item.compare_at_price
  );
  const image = pickFirstImageSource(item) || sanitizeText(item.image_url || item.image || item.thumbnail || item.media);
  const category = sanitizeText(
    item.category || item.category_name || item.type || item.tags?.[0] || item.tag || "بدون تصنيف"
  );
  const description = sanitizeText(item.description || item.summary || item.details || "");

  return cleanPayload({
    id,
    product_id: item.product_id ?? item.productId ?? id,
    name: sanitizeText(item.name || item.title || item.product_name || "منتج"),
    price,
    original_price: originalPrice || undefined,
    image,
    category,
    description,
    seller_id: item.seller_id || item.vendor_id || item.owner_id,
    seller_email: sanitizeText(item.seller_email || item.vendor_email || item.owner_email),
    brand: sanitizeText(item.brand || item.vendor || item.store_name),
    url: sanitizeText(item.url || item.product_url || item.link),
  });
}

function normalizeTaagerDbProduct(item) {
  if (!item || typeof item !== "object") return null;

  const storedId = sanitizeText(item.id);
  const taagerProductId = sanitizeText(
    item.taager_product_id ??
      item.product_id ??
      item.productId ??
      item.variantId ??
      (storedId.startsWith("taager_") ? storedId.slice(7) : storedId)
  );
  const id = storedId
    ? storedId.startsWith("taager_")
      ? storedId
      : taagerProductId && storedId === taagerProductId
      ? `taager_${taagerProductId}`
      : storedId
    : taagerProductId
    ? `taager_${taagerProductId}`
    : "";

  if (!id) return null;

  const image = pickFirstImageSource(item) || sanitizeText(item.image_url || item.image || item.thumbnail);
  const images = parseArrayField(item.images);
  const availableCountries = parseArrayField(item.available_countries).map((entry) =>
    sanitizeText(entry).toUpperCase()
  );

  const quickDetails = sanitizeText(item.quick_details || item.quickDetails || "");
  const contentIdeas = sanitizeText(item.content_ideas || item.contentIdeas || "");
  const howToUse = sanitizeText(item.how_to_use || item.howToUse || "");
  const videos = parseArrayField(item.videos || item.videoUrls || []);

  return cleanPayload({
    id,
    source: "taager",
    taager_product_id: taagerProductId || (id.startsWith("taager_") ? id.slice(7) : id),
    product_id: taagerProductId || (id.startsWith("taager_") ? id.slice(7) : id),
    name: sanitizeText(item.name || item.title || item.product_name || "منتج من تاجر"),
    description: sanitizeText(item.description || item.summary || item.details),
    quick_details: quickDetails,
    content_ideas: contentIdeas,
    how_to_use: howToUse,
    videos: videos.length ? videos : [],
    category: sanitizeText(item.category || item.category_name || item.type || "بدون تصنيف"),
    price: safeNumber(item.price ?? item.current_price ?? item.final_price ?? item.amount),
    original_price: safeNumber(
      item.original_price ?? item.old_price ?? item.list_price ?? item.compare_at_price
    ) || undefined,
    image,
    images: images.length ? images : image ? [image] : [],
    image1: sanitizeText(item.image1 || item.image_1),
    image2: sanitizeText(item.image2 || item.image_2),
    image3: sanitizeText(item.image3 || item.image_3),
    image4: sanitizeText(item.image4 || item.image_4),
    image5: sanitizeText(item.image5 || item.image_5),
    raw_data: item.raw_data,
    image_url: sanitizeText(item.image_url || item.imageUrl || image),
    imageUrl: sanitizeText(item.imageUrl || item.image_url || image),
    gallery: item.gallery || item.extra_images || item.additional_images || "",
    available_countries: availableCountries,
    seller: sanitizeText(item.seller || item.vendor || "تاجر") || "تاجر",
    seller_id: sanitizeText(item.seller_id || "taager") || "taager",
    seller_email: sanitizeText(item.seller_email || item.vendor_email || item.owner_email),
    brand: sanitizeText(item.brand || item.vendor || item.store_name),
    return_allowed: item.return_allowed,
    warranty: sanitizeText(item.warranty),
    colors: Array.isArray(item.colors) ? item.colors : [],
    sizes: Array.isArray(item.sizes) ? item.sizes : [],
    sales_count: safeNumber(item.sales_count),
    vendor: sanitizeText(item.vendor),
    company_name: sanitizeText(item.company_name),
    stock: safeNumber(item.stock ?? item.quantity ?? 999) || 0,
    stockStatus: sanitizeText(item.stock_status || item.stockStatus || "in_stock") || "in_stock",
    stock_status: sanitizeText(item.stock_status || item.stockStatus || "in_stock") || "in_stock",
    rating: safeNumber(item.rating),
    reviewCount: safeNumber(item.reviewCount ?? item.review_count),
    ratingSource: sanitizeText(item.ratingSource || item.rating_source || "ratings") || "ratings",
    rating_source: sanitizeText(item.rating_source || item.ratingSource || "ratings") || "ratings",
    hasSupabaseRatings: true,
    created_at: item.created_at,
    updated_at: item.updated_at,
    last_synced_at: item.last_synced_at,
    is_active: item.is_active !== false,
  });
}

function countryKeyMatches(value, code) {
  const upp = String(value || "").toUpperCase().trim();
  if (!upp) return false;
  const upper = String(code || "").toUpperCase().trim();
  const iso3 = { EG: "EGY", SA: "SAU", AE: "ARE", IQ: "IRQ", OM: "OMN" };
  const slugs = {
    EG: ["EGYPT", "مصر"],
    SA: ["KSA", "SAUDI-ARABIA", "SAUDI ARABIA", "السعودية"],
    AE: ["UAE", "EMIRATES", "الإمارات"],
    IQ: ["IRAQ", "العراق"],
    OM: ["OMAN", "عمان"],
  };
  if (upp === upper) return true;
  if (upp === iso3[upper]) return true;
  const list = slugs[upper] || [];
  return list.indexOf(upp) !== -1;
}

function matchesCountry(product, countryCode) {
  if (!product) return false;
  const upper = String(countryCode || "EG").toUpperCase().trim();
  const countryField = String(product.country || product.country_code || "").toUpperCase().trim();
  const countries = Array.isArray(product.available_countries) ? product.available_countries : [];
  if (countries.length) {
    for (let i = 0; i < countries.length; i++) {
      if (countryKeyMatches(countries[i], upper)) return true;
    }
    return false;
  }
  if (countryField) return countryKeyMatches(countryField, upper);
  return true;
}

function filterTaagerProductsByCountry(products = [], countryCode = "") {
  if (!countryCode) return [...products];
  return products.filter((product) => matchesCountry(product, countryCode));
}

const TAAGER_LIST_COLUMNS =
  "id,taager_product_id,name,created_at,description,quick_details,content_ideas,how_to_use,videos,category,price,original_price,image,images,image1,image2,image3,image4,image5,image6,image7,image8,available_countries,stock,stock_status,brand,seller,source,is_active,updated_at,last_synced_at,return_allowed,warranty,colors,sizes,sales_count,vendor,company_name";

const _taagerListMemoryCache = {};
const TAAGER_LIST_CACHE_TTL = 10 * 60 * 1000;

// Cross-page cache for the taager_products table (reloads don't re-download)
const TAAGER_IDB_DB = "buda_products_cache";
const TAAGER_IDB_STORE = "taager_list";
let _taagerIdbPromise = null;

function getTaagerIDB() {
  if (!window.indexedDB) return null;
  if (_taagerIdbPromise) return _taagerIdbPromise;
  _taagerIdbPromise = new Promise(function (resolve) {
    var req;
    try {
      req = window.indexedDB.open(TAAGER_IDB_DB, 1);
    } catch (_e) {
      resolve(null);
      return;
    }
    req.onupgradeneeded = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains(TAAGER_IDB_STORE)) {
        db.createObjectStore(TAAGER_IDB_STORE);
      }
    };
    req.onsuccess = function () {
      resolve(req.result);
    };
    req.onerror = function () {
      _taagerIdbPromise = null;
      resolve(null);
    };
  });
  return _taagerIdbPromise;
}

function taagerIdbGet(key) {
  return getTaagerIDB().then(function (db) {
    if (!db) return null;
    return new Promise(function (resolve) {
      try {
        var tx = db.transaction(TAAGER_IDB_STORE, "readonly");
        var getReq = tx.objectStore(TAAGER_IDB_STORE).get(key);
        getReq.onsuccess = function () {
          resolve(getReq.result || null);
        };
        getReq.onerror = function () {
          resolve(null);
        };
      } catch (_e) {
        resolve(null);
      }
    });
  });
}

function taagerIdbPut(key, entry) {
  return getTaagerIDB().then(function (db) {
    if (!db) return;
    return new Promise(function (resolve) {
      try {
        var tx = db.transaction(TAAGER_IDB_STORE, "readwrite");
        tx.objectStore(TAAGER_IDB_STORE).put(entry, key);
        tx.oncomplete = resolve;
        tx.onerror = function () { resolve(); };
      } catch (_e) {
        resolve();
      }
    });
  });
}

async function fetchTaagerProducts(countryCode = "") {
  const client = getSupabaseClient();
  const cacheKey = "TAAGER:" + String(countryCode || "EG").toUpperCase();
  const memHit = _taagerListMemoryCache[cacheKey];
  if (memHit && Date.now() - memHit.t < TAAGER_LIST_CACHE_TTL) {
    return memHit.products;
  }

  // IDB hit: survives reloads
  try {
    const idbEntry = await taagerIdbGet(cacheKey);
    if (
      idbEntry &&
      idbEntry.t &&
      Array.isArray(idbEntry.products) &&
      Date.now() - idbEntry.t < TAAGER_LIST_CACHE_TTL
    ) {
      _taagerListMemoryCache[cacheKey] = { t: idbEntry.t, products: idbEntry.products };
      return idbEntry.products;
    }
  } catch (_e) {}

  try {
    const pageSize = 1000;
    const allRows = [];
    let useActiveFilter = true;
    let columnMode = "list";

    for (let offset = 0; offset < 100000; offset += pageSize) {
      let query = client
        .from("taager_products")
        .select(columnMode === "star" ? "*" : TAAGER_LIST_COLUMNS)
        .range(offset, offset + pageSize - 1);

      if (useActiveFilter) {
        query = query.eq("is_active", true);
      }

      let { data, error } = await query;
      if (error) {
        if (columnMode === "list" && isMissingColumnError(error)) {
          columnMode = "star";
          offset -= pageSize;
          continue;
        }
        if (useActiveFilter && isMissingColumnError(error)) {
          useActiveFilter = false;
          offset -= pageSize;
          continue;
        }
      }
      if (error) {
        console.warn("failed fetching taager_products from supabase", error);
        break;
      }

      const batch = Array.isArray(data) ? data : [];
      allRows.push.apply(allRows, batch);
      if (batch.length < pageSize) break;
    }

    if (allRows.length) {
      const products = allRows.map(normalizeTaagerDbProduct).filter(Boolean);
      const filtered = filterTaagerProductsByCountry(products, countryCode);
      const annotated = await annotateProductsWithRatingsTable(client, filtered);
      _taagerListMemoryCache[cacheKey] = { t: Date.now(), products: annotated };
      taagerIdbPut(cacheKey, { t: Date.now(), products: annotated }).catch(function () {});
      return annotated;
    }
  } catch (error) {
    console.warn("failed fetching taager_products from supabase", error);
  }

  if (!isTaagerFeedConfigured()) return [];

  try {
    const headers = {};
    if (TAAGER_PRODUCTS_API_KEY) {
      headers.Authorization = `Bearer ${TAAGER_PRODUCTS_API_KEY}`;
    }

    const response = await fetch(TAAGER_PRODUCTS_FEED_URL, { headers });
    if (!response.ok) {
      throw new Error(`Taager feed request failed with status ${response.status}`);
    }

    const data = await response.json();
    const items = Array.isArray(data)
      ? data
      : Array.isArray(data.products)
      ? data.products
      : [];

    const products = items.map(normalizeTaagerProduct).filter(Boolean);
    return filterTaagerProductsByCountry(products, countryCode);
  } catch (error) {
    console.warn("failed fetching Taager products", error);
    return [];
  }
}

function validatePublicKeySafety() {
  if (_keyValidated) return;
  _keyValidated = true;

  try {
    const payloadPart = String(SUPABASE_ANON_KEY || "").split(".")[1] || "";
    const payloadJson = atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson);
    const role = String(payload?.role || "").toLowerCase();

    if (role && role !== "anon") {
      console.error("Unsafe Supabase key detected in frontend. Use anon key only.");
    }
  } catch {
    // Ignore malformed key parsing; Supabase client will fail normally if invalid.
  }
}

function cleanPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null)
  );
}

function sanitizeText(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const lowered = text.toLowerCase();
  if (lowered === "null" || lowered === "undefined" || lowered === "n/a") return "";
  return text;
}

function normalizeCouponToken(value) {
  const raw = sanitizeText(value)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) return "";

  const arabicIndicDigits = "Ù Ù¡Ù¢Ù£Ù¤Ù¥Ù¦Ù§Ù¨Ù©";
  const easternArabicDigits = "Û°Û±Û²Û³Û´ÛµÛ¶Û·Û¸Û¹";

  let normalized = "";
  for (const ch of raw) {
    const idxArabic = arabicIndicDigits.indexOf(ch);
    if (idxArabic >= 0) {
      normalized += String(idxArabic);
      continue;
    }
    const idxEastern = easternArabicDigits.indexOf(ch);
    if (idxEastern >= 0) {
      normalized += String(idxEastern);
      continue;
    }
    normalized += ch;
  }

  return normalized.normalize("NFKC").toLowerCase();
}

function normalizeCouponTokenStrict(value) {
  const raw = sanitizeText(value)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) return "";

  return raw
    .normalize("NFKC")
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .toLowerCase();
}

function pickFirstImageSource(item) {
  if (!item || typeof item !== "object") return "";

  const VIDEO_SOURCE_RE = /\.(mp4|webm|mov|m4v|ogv|mkv|avi|m3u8|mpg|mpeg|ts)([?#].*)?$/i;

  const directCandidates = [
    item.image_url,
    item.image,
    item.product_image,
    item.thumbnail,
    item.img,
    item.imageUrl,
    item.image1,
    item.image_1,
  ];

  for (const candidate of directCandidates) {
    const text = sanitizeText(candidate);
    if (text && !VIDEO_SOURCE_RE.test(text)) return text;
  }

  const collectionCandidates = [item.images, item.gallery, item.thumbnails];
  for (const listValue of collectionCandidates) {
    if (!listValue) continue;

    if (Array.isArray(listValue)) {
      const first = listValue
        .map((entry) => sanitizeText(entry))
        .find((entry) => entry && !VIDEO_SOURCE_RE.test(entry));
      if (first) return first;
      continue;
    }

    if (typeof listValue === "string") {
      const normalized = listValue.trim();
      if (!normalized) continue;

      if ((normalized.startsWith("[") && normalized.endsWith("]")) || (normalized.startsWith("{") && normalized.endsWith("}"))) {
        try {
          const parsed = JSON.parse(normalized);
          const parsedImage = pickFirstImageSource({ images: parsed });
          if (parsedImage) return parsedImage;
        } catch {
          // Continue with delimiter fallback.
        }
      }

      const first = normalized
        .split(/[,\n;|]+/g)
        .map((entry) => sanitizeText(entry))
        .find((entry) => entry && !VIDEO_SOURCE_RE.test(entry));
      if (first) return first;
    }
  }

  return "";
}

function resolvePrimaryOrderItem(items = []) {
  if (!Array.isArray(items) || !items.length) return null;
  for (const item of items) {
    if (item && typeof item === "object") return item;
  }
  return null;
}

function buildOrderTypeSnapshot(order, items = []) {
  const currentType = sanitizeText(order?.type);
  if (currentType) return currentType;

  const primary = resolvePrimaryOrderItem(items);
  if (!primary) return "";

  const productId = sanitizeText(primary.product_id ?? primary.productId ?? primary.id);
  const productName = sanitizeText(primary.product_name ?? primary.productName ?? primary.name ?? primary.title);
  const productImage = pickFirstImageSource(primary);
  const quantity = Math.max(1, Number(primary.quantity ?? primary.qty ?? 1) || 1);
  const unitPrice = Number(primary.price ?? primary.unit_price ?? primary.amount ?? 0) || 0;
  const sellerEmail = sanitizeText(primary.seller_email ?? primary.owner_email ?? order?.seller_email ?? order?.owner_email ?? (order?.__sellerIdentity && order.__sellerIdentity.primaryEmail));

  const snapshot = cleanPayload({
    product_id: productId || undefined,
    name: productName || undefined,
    image: productImage || undefined,
    quantity,
    price: unitPrice || undefined,
    seller_email: sellerEmail || undefined,
  });

  if (!Object.keys(snapshot).length) return "";

  try {
    return JSON.stringify(snapshot);
  } catch {
    return productName || productId || "";
  }
}

function saveLocalOrderSnapshot(orderId, items = []) {
  const key = String(orderId || "").trim();
  if (!key || !Array.isArray(items) || !items.length) return;

  const snapshots = items.map((item) =>
    cleanPayload({
      id: item.product_id ?? item.productId ?? item.id ?? null,
      product_id: item.product_id ?? item.productId ?? item.id ?? null,
      name: sanitizeText(item.product_name ?? item.productName ?? item.name ?? item.title) || undefined,
      image: pickFirstImageSource(item) || undefined,
      quantity: Math.max(1, Number(item.quantity ?? item.qty ?? 1) || 1),
      price: Number(item.price ?? item.unit_price ?? item.amount ?? 0) || 0,
    })
  );

  if (!snapshots.length) return;

  try {
    localStorage.setItem(`order_snapshot_${key}`, JSON.stringify(snapshots));
  } catch {
    // Ignore storage quota or privacy mode failures.
  }
}

function isRealSupabaseClient(c) {
  return (
    !!c &&
    typeof c.from === "function" &&
    c.functions !== null &&
    typeof c.functions === "object" &&
    c.auth !== null &&
    typeof c.auth === "object" &&
    c.storage !== null &&
    typeof c.storage === "object"
  );
}

function getSupabaseClient() {
  if (_clientInstance && isRealSupabaseClient(_clientInstance)) return _clientInstance;

  // Reuse an existing real client created elsewhere (e.g., empty-cart.html).
  if (window.__rawSupabase && isRealSupabaseClient(window.__rawSupabase)) {
    _clientInstance = window.__rawSupabase;
    return _clientInstance;
  }
  if (window.supabaseClient && isRealSupabaseClient(window.supabaseClient)) {
    _clientInstance = window.supabaseClient;
    return _clientInstance;
  }

  // Prefer the library already loaded on this page.
  if (window.supabase && typeof window.supabase.createClient === "function") {
    validatePublicKeySafety();
    _clientInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _clientInstance;
  }

  validatePublicKeySafety();

  // NOTE: window.supabaseClient may be a local helper shim (no .functions),
  // it must never be used as the real client here.
  throw new Error("Supabase library not loaded");
}

var _cdnSupabasePromise = null;

// Locate the locally-vendored Supabase library (same folder as supabase-client.js),
// which is always allowed by the site CSP ('self').
function getVendorSupabaseUrl() {
  var scripts = document.getElementsByTagName("script");
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].src || "";
    if (src.indexOf("supabase-client.js") !== -1) {
      return src.replace(/supabase-client\.js[^/]*$/, "") + "vendor/supabase/supabase-js@2.js?v=20260810";
    }
  }
  return "./assets/vendor/supabase/supabase-js@2.js?v=20260810";
}

function loadSupabaseLibrary() {
  var urls = [
    getVendorSupabaseUrl(),
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"
  ];
  return new Promise(function (resolve, reject) {
    var idx = 0;
    function attempt() {
      if (idx >= urls.length) {
        reject(new Error("تعذر الاتصال بخدمة التحقق. تأكد من الاتصال بالإنترنت وحاول مرة أخرى."));
        return;
      }
      var s = document.createElement("script");
      s.src = urls[idx++];
      s.crossOrigin = "anonymous";
      s.onload = function () {
        try {
          if (window.supabase && typeof window.supabase.createClient === "function") {
            var c = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            if (c && typeof c.functions !== "undefined") {
              _clientInstance = c;
              resolve(c);
              return;
            }
          }
        } catch (err) {
          // Fall through to the next source.
        }
        attempt();
      };
      s.onerror = function () { attempt(); };
      document.head.appendChild(s);
    }
    attempt();
  });
}

// Returns a client guaranteed to support Edge Functions (client.functions.invoke).
// If the local Supabase library failed to load, tries a second source.
function getFunctionsClient() {
  try {
    return Promise.resolve(getSupabaseClient());
  } catch (e) {}

  if (!_cdnSupabasePromise) {
    _cdnSupabasePromise = loadSupabaseLibrary();
  }
  return _cdnSupabasePromise;
}

window.getSupabaseClient = getSupabaseClient;
window.getFunctionsClient = getFunctionsClient;

function isMissingColumnError(error) {
  if (!error) return false;
  const message = `${error.message || ""} ${error.details || ""}`.toLowerCase();
  const code = String(error.code || "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    code === "42703" ||
    message.includes("schema cache") ||
    message.includes("could not find") ||
    (message.includes("column") && message.includes("does not exist"))
  );
}

function isMissingTableError(error) {
  if (!error) return false;
  const code = String(error.code || "").toLowerCase();
  const message = `${error.message || ""} ${error.details || ""}`.toLowerCase();
  return (
    code === "42p01" ||
    message.includes("relation") && message.includes("does not exist") ||
    message.includes("table") && message.includes("does not exist") ||
    message.includes("could not find the table")
  );
}

function isPermissionError(error) {
  if (!error) return false;
  const code = String(error.code || "").toLowerCase();
  const message = `${error.message || ""}`.toLowerCase();
  return code === "42501" || message.includes("permission denied") || message.includes("not allowed");
}

async function detectOrdersColumns(client) {
  if (_ordersColumnsCache) return _ordersColumnsCache;

  // Try to learn real columns from an existing row first.
  try {
    const { data, error } = await client.from("orders").select("*").limit(1);
    if (error) {
      _ordersColumnsCache = new Set(DEFAULT_ORDERS_COLUMNS);
      return _ordersColumnsCache;
    }

    const firstRow = Array.isArray(data) && data.length ? data[0] : null;
    if (firstRow && typeof firstRow === "object") {
      _ordersColumnsCache = new Set(Object.keys(firstRow));
      return _ordersColumnsCache;
    }
  } catch {
    _ordersColumnsCache = new Set(DEFAULT_ORDERS_COLUMNS);
    return _ordersColumnsCache;
  }

  // Empty table: probe each candidate column individually, because a
  // `select * limit 1` on zero rows tells us nothing about the schema.
  const existing = [];
  const seen = new Set();
  for (const col of DEFAULT_ORDERS_COLUMNS) {
    if (seen.has(col)) continue;
    seen.add(col);
    try {
      const { error: probeError } = await client.from("orders").select(col).limit(1);
      if (!probeError) existing.push(col);
    } catch (_probeErr) {
      // Column does not exist or not readable - skip.
    }
  }

  if (existing.length) {
    const columnCandidates = existing.slice();
    if (!columnCandidates.includes("created_at")) {
      try {
        const { error: caErr } = await client.from("orders").select("created_at").limit(1);
        if (!caErr) columnCandidates.push("created_at");
      } catch (_e2) {}
    }
    if (!columnCandidates.includes("id")) columnCandidates.push("id");
    _ordersColumnsCache = new Set(columnCandidates);
    return _ordersColumnsCache;
  }

  _ordersColumnsCache = new Set(DEFAULT_ORDERS_COLUMNS);
  return _ordersColumnsCache;
}

function pickColumn(columnsSet, options) {
  for (const col of options) {
    if (columnsSet.has(col)) return col;
  }
  return null;
}

function isUuidLike(value) {
  const text = sanitizeText(value).toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(text);
}

function isIntegerLike(value) {
  return /^\d+$/.test(sanitizeText(value));
}

function normalizeSellerId(value) {
  const text = sanitizeText(value);
  if (!text) return "";
  if (isUuidLike(text) || isIntegerLike(text)) return text;
  return "";
}

function normalizeSellerEmail(value) {
  const text = sanitizeText(value).toLowerCase();
  return text.includes("@") ? text : "";
}

function collectItemProductIds(items = []) {
  const ids = [];
  const seen = new Set();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const candidates = [
      item?.id,
      item?.product_id,
      item?.productId,
      item?.legacy_my_products_id,
      item?.legacy_product_id,
      item?.product_uuid,
      item?.uuid,
    ];
    candidates.forEach((value) => {
      const id = sanitizeText(value);
      if (!id || seen.has(id)) return;
      seen.add(id);
      ids.push(id);
    });
  });
  return ids;
}

function collectSellerIdentityFromItems(items = []) {
  const idSet = new Set();
  const emailSet = new Set();

  (Array.isArray(items) ? items : []).forEach((item) => {
    const idCandidates = [
      item?.seller_id,
      item?.owner_id,
      item?.vendor_id,
      item?.merchant_id,
      item?.partner_id,
      item?.user_id,
    ];
    idCandidates.forEach((value) => {
      const id = normalizeSellerId(value);
      if (id) idSet.add(id);
    });

    const emailCandidates = [
      item?.seller_email,
      item?.owner_email,
      item?.vendor_email,
      item?.merchant_email,
      item?.partner_email,
      item?.user_email,
      item?.email,
    ];
    emailCandidates.forEach((value) => {
      const email = normalizeSellerEmail(value);
      if (email) emailSet.add(email);
    });
  });

  return {
    ids: [...idSet],
    emails: [...emailSet],
  };
}

async function resolveSellerIdentityForOrder(client, items = []) {
  const fromItems = collectSellerIdentityFromItems(items);
  const idSet = new Set(fromItems.ids);
  const emailSet = new Set(fromItems.emails);
  const productIds = collectItemProductIds(items).filter(function (id) { return isUuidLike(id) || isIntegerLike(id); });

  if (productIds.length && (!idSet.size || !emailSet.size)) {
    const productTables = ["products", "my_products", "partner_products", "seller_products", "product"];
    const productIdColumns = ["id", "product_id", "legacy_my_products_id", "legacy_product_id", "product_uuid", "uuid"];

    for (const table of productTables) {
      for (let i = 0; i < productIds.length; i += 150) {
        const chunk = productIds.slice(i, i + 150);

        for (const idColumn of productIdColumns) {
          const { data, error } = await client.from(table).select("*").in(idColumn, chunk);

          if (error) {
            if (isMissingTableError(error) || isMissingColumnError(error) || isPermissionError(error)) {
              continue;
            }
            continue;
          }

          (Array.isArray(data) ? data : []).forEach((row) => {
            [
              row?.seller_id,
              row?.owner_id,
              row?.vendor_id,
              row?.merchant_id,
              row?.partner_id,
              row?.user_id,
            ].forEach((value) => {
              const id = normalizeSellerId(value);
              if (id) idSet.add(id);
            });

            [
              row?.seller_email,
              row?.owner_email,
              row?.vendor_email,
              row?.merchant_email,
              row?.partner_email,
              row?.user_email,
              row?.email,
            ].forEach((value) => {
              const email = normalizeSellerEmail(value);
              if (email) emailSet.add(email);
            });
          });
        }
      }

      if (idSet.size && emailSet.size) break;
    }
  }

  const ids = [...idSet];
  const emails = [...emailSet];

  return {
    ids,
    emails,
    primaryId: ids.length === 1 ? ids[0] : "",
    primaryEmail: emails.length === 1 ? emails[0] : "",
  };
}

function applySellerIdentityToPayload(payload = {}, columnsSet = new Set(), sellerIdentity = null) {
  const next = { ...(payload || {}) };
  const seller = sellerIdentity || {};
  const sellerId = normalizeSellerId(seller.primaryId);
  const sellerEmail = normalizeSellerEmail(seller.primaryEmail);

  const idColumns = ["seller_id", "owner_id", "partner_id", "merchant_id", "vendor_id", "store_owner_id"];
  const emailColumns = ["seller_email", "owner_email", "partner_email", "merchant_email", "vendor_email"];

  if (sellerId) {
    idColumns.forEach((column) => {
      if (columnsSet.has(column)) next[column] = sellerId;
    });
  }

  if (sellerEmail) {
    emailColumns.forEach((column) => {
      if (columnsSet.has(column)) next[column] = sellerEmail;
    });
  }

  return next;
}

function resolveItemSellerIdentity(item = {}, fallbackSellerIdentity = null) {
  const id = normalizeSellerId(
    item?.seller_id ??
      item?.owner_id ??
      item?.vendor_id ??
      item?.merchant_id ??
      item?.partner_id ??
      item?.user_id
  );
  const email = normalizeSellerEmail(
    item?.seller_email ??
      item?.owner_email ??
      item?.vendor_email ??
      item?.merchant_email ??
      item?.partner_email ??
      item?.user_email ??
      item?.email
  );

  return {
    id: id || normalizeSellerId(fallbackSellerIdentity?.primaryId),
    email: email || normalizeSellerEmail(fallbackSellerIdentity?.primaryEmail),
  };
}

function buildOrderPayload(order, items, columnsSet) {
  const payload = {};
  const serializedItems = Array.isArray(items) ? JSON.stringify(items) : "[]";
  const typeSnapshot = buildOrderTypeSnapshot(order, items);
  const sellerIdentity = order?.__sellerIdentity || null;

  const nameCol = pickColumn(columnsSet, ["user_name", "name", "customer_name"]);
  const emailCol = pickColumn(columnsSet, ["user_email", "email", "customer_email"]);
  const phoneCol = pickColumn(columnsSet, ["phone", "customer_phone"]);
  const addressCol = pickColumn(columnsSet, ["address", "customer_address"]);
  const statusCol = pickColumn(columnsSet, ["status", "order_status"]);
  const totalCol = pickColumn(columnsSet, ["total_price", "total", "amount"]);
  const paymentCol = pickColumn(columnsSet, ["payment_method"]);
  const userIdCol = pickColumn(columnsSet, ["user_id"]);
  const typeCol = pickColumn(columnsSet, ["type"]);
  const itemsCol = pickColumn(columnsSet, ["items_json", "items", "order_items"]);
  const discountCol = pickColumn(columnsSet, ["discount", "discount_amount", "discount_value"]);
  const couponCol = pickColumn(columnsSet, ["coupon_code", "coupon", "cbon"]);

  if (nameCol) payload[nameCol] = order.user_name;
  if (emailCol) payload[emailCol] = order.user_email;
  if (phoneCol) payload[phoneCol] = order.phone;
  if (addressCol) payload[addressCol] = order.address;
  if (statusCol) payload[statusCol] = order.status || "Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©";
  if (totalCol) payload[totalCol] = order.total_price;
  if (paymentCol && order.payment_method !== undefined) payload[paymentCol] = order.payment_method;
  if (userIdCol && order.user_id !== undefined && order.user_id !== null) payload[userIdCol] = order.user_id;
  if (typeCol && typeSnapshot) payload[typeCol] = typeSnapshot;
  if (itemsCol) payload[itemsCol] = serializedItems;
  if (discountCol && order.discount !== undefined && order.discount !== null) {
    payload[discountCol] = Number(order.discount) || 0;
  }
  if (couponCol && order.coupon_code) {
    payload[couponCol] = String(order.coupon_code).trim();
  }

  const shippingCol = pickColumn(columnsSet, ["shipping_fee", "shipping", "shipping_cost"]);
  if (shippingCol && order.shipping_cost !== undefined && order.shipping_cost !== null) {
    payload[shippingCol] = Number(order.shipping_cost) || 0;
  }

  // معرف مجموعة الطلبات (نفس السلة / نفس صفحة الدفع)
  const batchCol = pickColumn(columnsSet, ["order_batch_id"]);
  if (batchCol && order.order_batch_id) {
    payload[batchCol] = String(order.order_batch_id).trim();
  }

  // رسوم الدفع (COD) - تُحسب مرة واحدة لكل سلة
  const taxCol = pickColumn(columnsSet, ["tax", "tax_amount", "cod_fee", "payment_fee"]);
  if (taxCol && order.tax !== undefined && order.tax !== null) {
    payload[taxCol] = Number(order.tax) || 0;
  }

  // Taager integration fields
  const orderSourceCol = pickColumn(columnsSet, ["order_source"]);
  const countryCodeCol = pickColumn(columnsSet, ["country_code"]);
  const taagerStatusCol = pickColumn(columnsSet, ["taager_order_status"]);

  if (orderSourceCol && order.order_source) payload[orderSourceCol] = order.order_source;
  if (countryCodeCol && order.country_code) payload[countryCodeCol] = order.country_code;
  if (taagerStatusCol && order.taager_order_status) payload[taagerStatusCol] = order.taager_order_status;

  const withSellerIdentity = applySellerIdentityToPayload(payload, columnsSet, sellerIdentity);
  return cleanPayload(withSellerIdentity);
}

async function validateCoupon(code) {
  const normalizedCode = normalizeCouponTokenStrict(code);
  if (!normalizedCode) {
    return { valid: false, code: "" };
  }

  const client = getSupabaseClient();
  const sourceCode = sanitizeText(code);

  const exactResult = await client
    .from("kobon")
    .select("cbon, rate, minimum_amount")
    .ilike("cbon", sourceCode)
    .limit(100);
  if (exactResult.error) throw exactResult.error;

  let rows = Array.isArray(exactResult.data) ? exactResult.data : [];
  if (!rows.length) {
    const fullResult = await client
      .from("kobon")
      .select("cbon, rate, minimum_amount")
      .limit(5000);
    if (fullResult.error) throw fullResult.error;
    rows = Array.isArray(fullResult.data) ? fullResult.data : [];
  }

  const match = rows.find((row) => normalizeCouponTokenStrict(row?.cbon) === normalizedCode);
  if (!match) {
    return { valid: false, code: normalizedCode };
  }

  const rate = Number(match.rate);
  const minimumAmount = Number(match.minimum_amount);

  return {
    valid: true,
    code: sanitizeText(match.cbon) || sanitizeText(code) || normalizedCode,
    rate: rate > 0 ? rate : 0,
    minimum_amount: minimumAmount > 0 ? minimumAmount : 0,
  };
}

async function insertOrderWithFallbackPatterns(client, order, items = []) {
  const serializedItems = Array.isArray(items) ? JSON.stringify(items) : "[]";
  const typeSnapshot = buildOrderTypeSnapshot(order, items);
  const sellerIdentity = order?.__sellerIdentity || null;
  const sellerId = normalizeSellerId(order?.seller_id ?? order?.owner_id ?? sellerIdentity?.primaryId);
  const sellerEmail = normalizeSellerEmail(order?.seller_email ?? order?.owner_email ?? sellerIdentity?.primaryEmail);
  const sellerFields = cleanPayload({
    seller_id: sellerId || undefined,
    owner_id: sellerId || undefined,
    seller_email: sellerEmail || undefined,
    owner_email: sellerEmail || undefined,
  });
  const orderStatus = order.status || "Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©";
  const patterns = [
    {
      user_name: order.user_name,
      email: order.user_email,
      phone: order.phone,
      address: order.address,
      status: orderStatus,
      total_price: order.total_price,
      type: typeSnapshot || undefined,
      order_source: order.order_source || undefined,
      country_code: order.country_code || undefined,
      taager_order_status: order.taager_order_status || undefined,
    },
    {
      user_name: order.user_name,
      user_email: order.user_email,
      phone: order.phone,
      address: order.address,
      status: orderStatus,
      total_price: order.total_price,
      type: typeSnapshot || undefined,
    },
    {
      name: order.user_name,
      email: order.user_email,
      phone: order.phone,
      address: order.address,
      status: orderStatus,
      total: order.total_price,
      type: typeSnapshot || undefined,
    },
    {
      customer_name: order.user_name,
      customer_email: order.user_email,
      customer_phone: order.phone,
      customer_address: order.address,
      order_status: orderStatus,
      amount: order.total_price,
      type: typeSnapshot || undefined,
    },
    {
      user_name: order.user_name,
      user_email: order.user_email,
      phone: order.phone,
      address: order.address,
      status: order.status || "Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©",
      total_price: order.total_price,
      items_json: serializedItems,
    },
    {
      user_name: order.user_name,
      user_email: order.user_email,
      phone: order.phone,
      address: order.address,
      status: order.status || "Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©",
      total_price: order.total_price,
      items: serializedItems,
    },
    {
      user_name: order.user_name,
      user_email: order.user_email,
      phone: order.phone,
      address: order.address,
      status: order.status || "Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©",
      total_price: order.total_price,
      order_items: serializedItems,
    },
    {
      name: order.user_name,
      email: order.user_email,
      phone: order.phone,
      address: order.address,
      status: order.status || "Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©",
      total: order.total_price,
      items_json: serializedItems,
    },
    {
      name: order.user_name,
      email: order.user_email,
      phone: order.phone,
      address: order.address,
      status: order.status || "Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©",
      total: order.total_price,
      items: serializedItems,
    },
    {
      customer_name: order.user_name,
      customer_email: order.user_email,
      customer_phone: order.phone,
      customer_address: order.address,
      order_status: order.status || "Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©",
      amount: order.total_price,
      items_json: serializedItems,
    },
    {
      customer_name: order.user_name,
      customer_email: order.user_email,
      customer_phone: order.phone,
      customer_address: order.address,
      order_status: order.status || "Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©",
      amount: order.total_price,
      items: serializedItems,
    },
    {
      customer_name: order.user_name,
      customer_email: order.user_email,
      customer_phone: order.phone,
      customer_address: order.address,
      order_status: order.status || "Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©",
      amount: order.total_price,
      order_items: serializedItems,
    },
  ];

  // Taager integration fields for fallback patterns
  const taagerFields = cleanPayload({
    order_source: order.order_source || undefined,
    country_code: order.country_code || undefined,
    taager_order_status: order.taager_order_status || undefined,
  });

  const batchFields = cleanPayload({
    order_batch_id: order.order_batch_id || undefined,
    tax: order.tax || undefined,
  });

  let lastError = null;
  for (const raw of patterns) {
    const payload = cleanPayload({ ...sellerFields, ...taagerFields, ...batchFields, ...(raw || {}) });
    const { error } = await client.from("orders").insert([payload]);
    if (!error) return { payload, error: null };
    lastError = error;
  }

  return { payload: null, error: lastError };
}

async function annotateProductsWithRatingsTable(client, products = []) {
  if (!Array.isArray(products) || !products.length) return [];

  const ids = products
    .map((product) => String(product?.id || "").trim())
    .filter((id) => id !== "");

  if (!ids.length) {
    return products.map((product) => ({
      ...product,
      rating: 0,
      reviewCount: 0,
      ratingSource: "ratings",
      rating_source: "ratings",
      hasSupabaseRatings: true,
    }));
  }

  try {
    const ratingsMap = {};
    const chunkSize = 100;
    const chunks = [];

    for (let i = 0; i < ids.length; i += chunkSize) {
      chunks.push(ids.slice(i, i + chunkSize));
    }

    const results = await Promise.all(chunks.map(chunk =>
      client.from("ratings").select("item_id,rating").in("item_id", chunk)
    ));

    for (const { data, error } of results) {
      if (error) {
        console.warn("supabase ratings fetch error", error);
        continue;
      }
      if (Array.isArray(data)) {
        data.forEach((row) => {
          const itemId = String(row.item_id || "");
          const ratingValue = Number(row.rating) || 0;
          if (!itemId || ratingValue <= 0) return;
          if (!ratingsMap[itemId]) ratingsMap[itemId] = [];
          ratingsMap[itemId].push(ratingValue);
        });
      }
    }

    return products.map((product) => {
      const itemId = String(product?.id || "");
      const values = ratingsMap[itemId] || [];

      if (!values.length) {
        return {
          ...product,
          rating: 0,
          reviewCount: 0,
          ratingSource: "ratings",
          rating_source: "ratings",
          hasSupabaseRatings: true,
        };
      }

      const sum = values.reduce((total, value) => total + value, 0);
      const average = Number((sum / values.length).toFixed(1));
      return {
        ...product,
        rating: average,
        reviewCount: values.length,
        ratingSource: "ratings",
        rating_source: "ratings",
        hasSupabaseRatings: true,
      };
    });
  } catch (error) {
    console.warn("supabase ratings annotate error", error);
    return products.map((product) => ({
      ...product,
      rating: 0,
      reviewCount: 0,
      ratingSource: "ratings",
      rating_source: "ratings",
      hasSupabaseRatings: true,
    }));
  }
}

const _productsListMemoryCache = {};
const PRODUCTS_LIST_CACHE_TTL = 10 * 60 * 1000;

// ===== Cross-page products list cache (IndexedDB) =====
// fetchAllProducts was pulling the whole `products` table on every page load,
// which caused massive egress. We now persist the annotated list for 10
// minutes so reloads/navigation reuse it.
const PRODUCTS_IDB_DB = "buda_products_cache";
const PRODUCTS_IDB_STORE = "products";
const PRODUCTS_IDB_KEY = "PRODUCTS:ALL";
let _productsIdbPromise = null;

function getProductsIDB() {
  if (!window.indexedDB) return null;
  if (_productsIdbPromise) return _productsIdbPromise;
  _productsIdbPromise = new Promise(function (resolve) {
    var req;
    try {
      req = window.indexedDB.open(PRODUCTS_IDB_DB, 1);
    } catch (_e) {
      resolve(null);
      return;
    }
    req.onupgradeneeded = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains(PRODUCTS_IDB_STORE)) {
        db.createObjectStore(PRODUCTS_IDB_STORE);
      }
    };
    req.onsuccess = function () {
      resolve(req.result);
    };
    req.onerror = function () {
      _productsIdbPromise = null;
      resolve(null);
    };
  });
  return _productsIdbPromise;
}

function productsIdbGet() {
  return getProductsIDB().then(function (db) {
    if (!db) return null;
    return new Promise(function (resolve) {
      try {
        var tx = db.transaction(PRODUCTS_IDB_STORE, "readonly");
        var getReq = tx.objectStore(PRODUCTS_IDB_STORE).get(PRODUCTS_IDB_KEY);
        getReq.onsuccess = function () {
          resolve(getReq.result || null);
        };
        getReq.onerror = function () {
          resolve(null);
        };
      } catch (_e) {
        resolve(null);
      }
    });
  });
}

function productsIdbPut(entry) {
  return getProductsIDB().then(function (db) {
    if (!db) return;
    return new Promise(function (resolve) {
      try {
        var tx = db.transaction(PRODUCTS_IDB_STORE, "readwrite");
        tx.objectStore(PRODUCTS_IDB_STORE).put(entry, PRODUCTS_IDB_KEY);
        tx.oncomplete = resolve;
        tx.onerror = function () { resolve(); };
      } catch (_e) {
        resolve();
      }
    });
  });
}

async function fetchAllProducts() {
  const client = getSupabaseClient();
  const memKey = "PRODUCTS:ALL";
  const memHit = _productsListMemoryCache[memKey];
  if (memHit && Date.now() - memHit.t < PRODUCTS_LIST_CACHE_TTL) {
    return memHit.products;
  }

  // IDB hit: survives page reloads so reloading doesn't re-download the table
  try {
    const idbEntry = await productsIdbGet();
    if (
      idbEntry &&
      idbEntry.t &&
      Array.isArray(idbEntry.products) &&
      Date.now() - idbEntry.t < PRODUCTS_LIST_CACHE_TTL
    ) {
      _productsListMemoryCache[memKey] = { t: idbEntry.t, products: idbEntry.products };
      return idbEntry.products;
    }
  } catch (_e) {}

  try {
    const pageSize = 1000;
    const allRows = [];

    for (let offset = 0; offset < 100000; offset += pageSize) {
      const { data, error } = await client
        .from("products")
        .select("*")
        .range(offset, offset + pageSize - 1);

      if (error) throw error;
      const batch = Array.isArray(data) ? data : [];
      allRows.push.apply(allRows, batch);
      if (batch.length < pageSize) break;
    }
    const products = await annotateProductsWithRatingsTable(client, allRows);
    _productsListMemoryCache[memKey] = { t: Date.now(), products };
    productsIdbPut({ t: Date.now(), products }).catch(function () {});
    return products;
  } catch (error) {
    console.error("fetchAllProducts failed, trying single fetch fallback:", error);
    const { data, error: err2 } = await client.from("products").select("*");
    if (err2) throw err2;
    const rows = Array.isArray(data) ? data : [];
    return annotateProductsWithRatingsTable(client, rows);
  }
}

async function createOrder(order, items) {
  const client = getSupabaseClient();
  const sellerIdentity = await resolveSellerIdentityForOrder(client, items);
  const orderWithSeller = {
    ...(order || {}),
    __sellerIdentity: sellerIdentity,
    seller_id: normalizeSellerId(order?.seller_id ?? order?.owner_id ?? sellerIdentity?.primaryId),
    seller_email: normalizeSellerEmail(order?.seller_email ?? order?.owner_email ?? sellerIdentity?.primaryEmail),
  };

  // Try using discovered schema first.
  let columnsSet = await detectOrdersColumns(client);
  let payload = buildOrderPayload(orderWithSeller, items, columnsSet);

  if (!Object.keys(payload).length) {
    const fallback = await insertOrderWithFallbackPatterns(client, orderWithSeller, items);
    if (fallback.error) throw fallback.error;
    return "ORDER_CREATED";
  }

  let { error } = await client.from("orders").insert([payload]);

  // Schema cache may be stale in client; refresh detection once and retry.
  if (error && isMissingColumnError(error)) {
    _ordersColumnsCache = null;
    columnsSet = await detectOrdersColumns(client);
    payload = buildOrderPayload(orderWithSeller, items, columnsSet);

    if (!Object.keys(payload).length) {
      const fallback = await insertOrderWithFallbackPatterns(client, orderWithSeller, items);
      if (fallback.error) throw fallback.error;
      return "ORDER_CREATED";
    }

    ({ error } = await client.from("orders").insert([payload]));
  }

  if (error) {
    const fallback = await insertOrderWithFallbackPatterns(client, orderWithSeller, items);
    if (fallback.error) throw fallback.error;
    return "ORDER_CREATED";
  }

  // Best-effort order ID fetch (skip if unavailable).
  const idCol = pickColumn(columnsSet, ["id", "order_id", "uuid", "order_uuid"]);
  let orderId = null;

  if (idCol) {
    const emailCol = pickColumn(columnsSet, ["user_email", "email", "customer_email"]);
    const totalCol = pickColumn(columnsSet, ["total_price", "total", "amount"]);

    let query = client.from("orders").select(idCol).limit(1);
    const orderByCol = columnsSet.has("created_at") ? "created_at" : idCol;
    query = query.order(orderByCol, { ascending: false });
    if (emailCol && orderWithSeller.user_email) query = query.eq(emailCol, orderWithSeller.user_email);
    if (totalCol && orderWithSeller.total_price !== undefined) query = query.eq(totalCol, orderWithSeller.total_price);

    const { data: idRows } = await query;
    if (Array.isArray(idRows) && idRows.length) {
      orderId = idRows[0]?.[idCol] || null;
    }
  }

  // Best-effort order_items insert only if order_id column exists and id resolved.
  if (orderId && Array.isArray(items) && items.length) {
    const richRows = items.map((item) => {
      const itemSeller = resolveItemSellerIdentity(item, sellerIdentity);
      return cleanPayload({
        order_id: orderId,
        product_id: item.product_id ?? item.productId ?? item.id ?? null,
        quantity: item.quantity,
        price: item.price,
        product_name: item.name || item.product_name || item.title || null,
        image:
          item.image ||
          item.image_url ||
          item.product_image ||
          item.thumbnail ||
          item.img ||
          (Array.isArray(item.images) ? item.images[0] : item.images) ||
          null,
        brand: item.brand || item.vendor || item.store_name || null,
        seller_id: itemSeller.id || undefined,
        owner_id: itemSeller.id || undefined,
        seller_email: itemSeller.email || undefined,
        owner_email: itemSeller.email || undefined,
        selected_color: item.selected_color ?? item.selectedColor ?? null,
        selected_size: item.selected_size ?? item.selectedSize ?? null,
        selected_color_value: item.selected_color_value ?? item.selectedColorValue ?? "",
        variant_label: item.variant_label ?? item.variantLabel ?? null,
      });
    });

    let { error: itemsError } = await client.from("order_items").insert(richRows);

    if (itemsError && isMissingColumnError(itemsError)) {
      const fallbackRows = items.map((item) => {
        const itemSeller = resolveItemSellerIdentity(item, sellerIdentity);
        return cleanPayload({
          order_id: orderId,
          product_id: item.product_id ?? item.productId ?? item.id ?? null,
          quantity: item.quantity,
          price: item.price,
          seller_email: itemSeller.email || undefined,
          owner_email: itemSeller.email || undefined,
          selected_color: item.selected_color ?? item.selectedColor ?? null,
          selected_size: item.selected_size ?? item.selectedSize ?? null,
          selected_color_value: item.selected_color_value ?? item.selectedColorValue ?? "",
          variant_label: item.variant_label ?? item.variantLabel ?? null,
        });
      });
      ({ error: itemsError } = await client.from("order_items").insert(fallbackRows));

      if (itemsError && isMissingColumnError(itemsError)) {
        const minimalRows = items.map((item) =>
          cleanPayload({
            order_id: orderId,
            product_id: item.product_id ?? item.productId ?? item.id ?? null,
            quantity: item.quantity,
            price: item.price,
            selected_color: item.selected_color ?? item.selectedColor ?? null,
            selected_size: item.selected_size ?? item.selectedSize ?? null,
            selected_color_value: item.selected_color_value ?? item.selectedColorValue ?? "",
            variant_label: item.variant_label ?? item.variantLabel ?? null,
          })
        );
        ({ error: itemsError } = await client.from("order_items").insert(minimalRows));
      }
    }

    if (itemsError && !isMissingColumnError(itemsError) && !isPermissionError(itemsError)) {
      console.warn("order_items insert skipped:", itemsError);
    }
  }

  if (orderId) {
    saveLocalOrderSnapshot(orderId, items);
  }

  return orderId || "ORDER_CREATED";
}

async function getOrders(filter = {}) {
  const client = getSupabaseClient();
  let columnsSet = await detectOrdersColumns(client);

  function resolveColumns() {
    return {
      emailCol: filter.user_email
        ? pickColumn(columnsSet, ["user_email", "email", "customer_email"])
        : null,
      statusCol: filter.status ? pickColumn(columnsSet, ["status", "order_status"]) : null,
      orderCol: columnsSet.has("created_at")
        ? "created_at"
        : pickColumn(columnsSet, ["id", "order_id", "uuid", "order_uuid"]),
    };
  }

  let { emailCol, statusCol, orderCol } = resolveColumns();

  async function runQuery() {
    let query = client.from("orders").select("*");
    if (orderCol) query = query.order(orderCol, { ascending: false });
    if (emailCol && filter.user_email) query = query.eq(emailCol, filter.user_email);
    if (statusCol && filter.status) query = query.eq(statusCol, filter.status);
    return query;
  }

  let { data, error } = await runQuery();

  // If schema cache was stale, re-detect once then retry.
  if (error && isMissingColumnError(error)) {
    _ordersColumnsCache = null;
    columnsSet = await detectOrdersColumns(client);
    ({ emailCol, statusCol, orderCol } = resolveColumns());
    ({ data, error } = await runQuery());
  }

  if (error) throw error;

  let rows = Array.isArray(data) ? data : [];

  // If we could not apply server-side email/status filters (because columns unknown),
  // apply best-effort client-side filtering on common keys.
  if (filter.user_email && !emailCol) {
    rows = rows.filter((row) =>
      [row.user_email, row.email, row.customer_email].some(
        (value) => String(value || "").toLowerCase() === String(filter.user_email).toLowerCase()
      )
    );
  }

  if (filter.status && !statusCol) {
    rows = rows.filter((row) =>
      [row.status, row.order_status].some(
        (value) => String(value || "").toLowerCase() === String(filter.status).toLowerCase()
      )
    );
  }

  return rows;
}

async function updateOrderStatus(orderId, status) {
  const client = getSupabaseClient();
  const variants = [{ status }, { order_status: status }];
  const idColumns = ["id", "order_id"];
  let lastError = null;

  for (const payload of variants) {
    for (const idColumn of idColumns) {
      const { error } = await client.from("orders").update(payload).eq(idColumn, orderId);
      if (!error) return true;
      lastError = error;
    }
  }

  throw lastError || new Error("Failed to update order status");
}

async function fetchAllProductsWithTaager(countryCode) {
  const all = await fetchAllProducts();
  const taagerProducts = await fetchTaagerProducts(countryCode);

  if (window.TaagerIntegration) {
    window.TaagerIntegration.mergeTaagerIntoStore(taagerProducts);
  }

  const seen = new Set();
  const merged = [];

  all.forEach((product) => {
    const id = String(product.id);
    if (!seen.has(id)) {
      seen.add(id);
      merged.push({ ...product, source: product.source || "internal" });
    }
  });

  taagerProducts.forEach((product) => {
    const id = String(product.id);
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(product);
    }
  });

  // Filter ALL products by country (not just Taager products)
  if (countryCode) {
    var iso2to3 = { EG: "EGY", SA: "SAU", AE: "ARE", IQ: "IRQ", OM: "OMN" };
    var upperCode = countryCode.toUpperCase();
    var iso3Code = iso2to3[upperCode] || upperCode;

    // Helper to get country slug
    function getCountrySlug(code) {
      var countries = {
        EG: "egypt",
        SA: "saudi-arabia",
        AE: "united-arab-emirates",
        IQ: "iraq",
        OM: "oman"
      };
      return countries[code] || code;
    }
    var slugMatch = getCountrySlug(upperCode);

    // Check if any product matches this country before filtering
    var hasCountryMatch = merged.some(function (product) {
      return matchesCountry(product, upperCode);
    });

    if (hasCountryMatch) {
      return merged.filter(function (product) {
        return matchesCountry(product, upperCode);
      });
    }
  }

  return merged;
}

async function createOrderWithTaager(order, items) {
  const selectedCountry = window.TaagerIntegration
    ? window.TaagerIntegration.getSelectedCountry()
    : null;

  const annotatedItems = Array.isArray(items)
    ? items.map((item) => {
        if (window.TaagerIntegration) {
          return window.TaagerIntegration.annotateCartItemWithSource(item, selectedCountry);
        }
        return item;
      })
    : items;

  const taagerExtra = window.TaagerIntegration
    ? window.TaagerIntegration.getOrderPayloadExtra(selectedCountry)
    : {};

  const enrichedOrder = {
    ...order,
    ...taagerExtra,
  };

  return createOrder(enrichedOrder, annotatedItems);
}

async function getTaagerOrders(filter = {}) {
  const orders = await getOrders(filter);
  return orders.filter((order) => order.order_source === "taager");
}

async function loadTaagerCredentials() {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.from("app_settings").select("key, value");
    if (error) throw error;
    if (!Array.isArray(data)) return;
    var map = {};
    data.forEach(function (row) { if (row && row.key) map[row.key] = row.value; });
    if (map.taager_api_key) window.TAAGER_API_KEY = map.taager_api_key;
    if (map.taager_taager_id) window.TAAGER_TAAGER_ID = map.taager_taager_id;
    if (map.taager_session_key) window.TAAGER_SESSION_KEY = map.taager_session_key;
    if (map.taager_merchant_api) window.TAAGER_MERCHANT_API = map.taager_merchant_api;
    if (map.taager_edge_function_url) window.TAAGER_EDGE_FUNCTION_URL = map.taager_edge_function_url;
    try { localStorage.setItem("_taagerCredentials", JSON.stringify(map)); } catch (_e) {}
  } catch (e) {
    if (!(typeof isNetworkResolutionError === "function" && isNetworkResolutionError(e))) console.warn("[Supabase] loadTaagerCredentials error:", e);
  }
}
// Load credentials from Supabase table in background
if (typeof window !== "undefined") {
  loadTaagerCredentials();
}

window.supabaseClient = {
  from: (table) => getSupabaseClient().from(table),
  raw: getSupabaseClient,
  fetchAllProducts,
  fetchTaagerProducts,
  fetchAllProductsWithTaager,
  createOrder,
  createOrderWithTaager,
  getOrders,
  getTaagerOrders,
  updateOrderStatus,
  validateCoupon,
  loadTaagerCredentials,
};
