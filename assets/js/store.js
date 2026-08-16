// the inâ€‘memory database is initially hardâ€‘coded for offline/demo mode.
// we declare it with `var` so it persists globally and survives script reloads.
if (typeof window.productsDatabase === 'undefined') {
  window.productsDatabase = {};
}

// Clear legacy test data (one-time cleanup)
try {
  window._supabaseProductCache = {};
  var _clKeys = [];
  for (var _cli = 0; _cli < localStorage.length; _cli++) _clKeys.push(localStorage.key(_cli));
  for (var _ci = 0; _ci < _clKeys.length; _ci++) {
    var _k = _clKeys[_ci];
    if (_k === "boda_all_products" || _k.indexOf("seller_products_") === 0 || _k.indexOf("partner_products_") === 0 || _k.indexOf("product_comments_") === 0) {
      localStorage.removeItem(_k);
    }
  }
} catch (_ce) {}

const getPagePrefix = () => (window.location.pathname.includes("/pages/") ? "../" : "");

const SUPABASE_BACKOFF_MS = 5 * 60 * 1000;
const DEFAULT_PRODUCT_IMAGE = "assets/images/unnamed.png";

function parseNumeric(value) {
  if (value === null || value === undefined) return 0;
  const normalized = String(value)
    .trim()
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/[٫]/g, ".")
    .replace(/[،]/g, "")
    .replace(/[^0-9.-]/g, "");
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundPrice(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function repairMojibakeText(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (!/[ÙØÂâ]/.test(text)) return text;

  try {
    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i += 1) {
      bytes[i] = text.charCodeAt(i) & 0xff;
    }
    const decoded = new TextDecoder("utf-8").decode(bytes).trim();
    if (decoded && /[\u0600-\u06FF]/.test(decoded)) return decoded;
  } catch {
    // ignore conversion failures and keep original text
  }

  return text;
}

function splitImageString(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];
  if (/^data:image\//i.test(raw)) return [raw];

  if ((raw.startsWith("[") && raw.endsWith("]")) || (raw.startsWith("{") && raw.endsWith("}"))) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || "").trim()).filter(Boolean);
      }
    } catch {
      // non-JSON text falls back to splitting below
    }
  }

  const fromPgArray = raw.startsWith("{") && raw.endsWith("}") ? raw.slice(1, -1) : raw;
  const hasExplicitSeparators = /[;\n\r|]/.test(fromPgArray);

  if (hasExplicitSeparators) {
    return fromPgArray
      .split(/[;\n\r|]+/g)
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }

  if (fromPgArray.includes(",")) {
    const httpLinks = fromPgArray.match(/https?:\/\//gi) || [];
    const startsLikeSingleUrl = /^\s*['"]?\s*(https?:|data:|blob:)/i.test(fromPgArray);
    if (startsLikeSingleUrl && httpLinks.length <= 1) {
      return [fromPgArray.trim().replace(/^['"]|['"]$/g, "")].filter(Boolean);
    }

    return fromPgArray
      .split(/\s*,\s*/g)
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }

  return [fromPgArray.trim().replace(/^['"]|['"]$/g, "")].filter(Boolean);
}

function toDirectImageUrl(value) {
  const source = String(value || "").trim().replace(/^['"]|['"]$/g, "");
  if (!source || !/^https?:\/\//i.test(source)) return source;

  const drivePathMatch = source.match(/^https?:\/\/drive\.google\.com\/file\/d\/([^/?#]+)\//i);
  if (drivePathMatch && drivePathMatch[1]) {
    return `https://drive.google.com/uc?export=view&id=${drivePathMatch[1]}`;
  }

  try {
    const parsed = new URL(source);
    const host = parsed.hostname.toLowerCase();

    if (host === "drive.google.com") {
      const openId = parsed.searchParams.get("id");
      if (openId) {
        return `https://drive.google.com/uc?export=view&id=${openId}`;
      }

      if (parsed.pathname.toLowerCase() === "/uc") {
        const ucId = parsed.searchParams.get("id");
        if (ucId) {
          parsed.searchParams.set("export", "view");
          return parsed.toString();
        }
      }
    }

    if (host.endsWith("dropbox.com") || host === "dl.dropboxusercontent.com") {
      parsed.hostname = "dl.dropboxusercontent.com";
      parsed.searchParams.delete("dl");
      parsed.searchParams.set("raw", "1");
      return parsed.toString();
    }
  } catch {
    // Keep original URL on parse errors.
  }

  return source;
}

function isVideoUrl(value) {
  return /\.(mp4|webm|mov|m4v|ogv|mkv|avi|m3u8|mpg|mpeg|ts)([?#].*)?$/i.test(value);
}

function collectImageCandidates(...values) {
  const bucket = [];

  const append = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => append(entry));
      return;
    }
    if (typeof value === "string") {
      splitImageString(value).forEach((entry) => bucket.push(entry));
      return;
    }
    if (typeof value === "object") {
      if (typeof value.url === "string") bucket.push(value.url);
      if (typeof value.src === "string") bucket.push(value.src);
    }
  };

  values.forEach((value) => append(value));

  const unique = new Set();
  bucket.forEach((entry) => {
    const normalized = toDirectImageUrl(String(entry || "").trim().replace(/\\/g, "/"));
    if (!normalized) return;
    const lowered = normalized.toLowerCase();
    if (lowered === "null" || lowered === "undefined") return;
    if (isVideoUrl(lowered)) return;
    unique.add(normalized);
  });

  return [...unique];
}

function extractProductImages(product = {}) {
  const dynamicImageFields = Object.entries(product || {})
    .filter(([key]) => {
      const normalizedKey = String(key || "").trim().toLowerCase();
      if (!normalizedKey) return false;
      return (
      /^image[\s_-]*\d+$/i.test(normalizedKey) ||
        /^img[\s_-]*\d+$/i.test(normalizedKey) ||
        /^image_link\d+$/i.test(normalizedKey) ||
        normalizedKey === "extra_links" ||
        normalizedKey === "extra_images" ||
        normalizedKey === "additional_images" ||
        normalizedKey === "more_images"
      );
    })
    .map(([, value]) => value);

  const candidates = collectImageCandidates(
    product.images,
    product.image,
    product.image1,
    product.image2,
    product.image3,
    product.image4,
    product.image5,
    product.image6,
    product.image7,
    product.image8,
    product.image_1,
    product.image_2,
    product.image_3,
    product.image_4,
    product.image_5,
    product.image_6,
    product.image_7,
    product.image_8,
    product.image_url,
    product.imageUrl,
    product.thumbnail,
    product.thumb,
    product.img,
    product.img1, product.img2, product.img3, product.img4, product.img5,
    product.img6, product.img7, product.img8,
    product.gallery,
    product.extra_links,
    product.extraImages,
    dynamicImageFields
  );

  return candidates.length ? candidates : [DEFAULT_PRODUCT_IMAGE];
}

function resolveProductPrice(product = {}) {
  const listedPrice = parseNumeric(product.price || product.currentPrice || product.finalPrice);
  var originalCandidate = 0;
  // السعر الوهمي له الأولوية دائمًا
  try {
    var _pid = product.id ?? product.product_id;
    if (_pid) {
      var _fop = window._fakeOriginalPrices && window._fakeOriginalPrices[String(_pid)];
      if (_fop) {
        var _fp = Number(_fop.fake_original_price) || 0;
        if (_fp > listedPrice && _fp <= listedPrice * 3) {
          originalCandidate = _fp;
        }
      }
    }
  } catch (_e) {
    if (String(product.id || '').indexOf('taager_') === 0) console.log("[FakePrice] error", _e);
  }
  // لو مفيش سعر وهمي، نشوف الـ originalPrice الحقيقي
  if (!(originalCandidate > 0)) {
    originalCandidate = parseNumeric(
      product.originalPrice ||
        product.original_price ||
        product.old_price ||
        product.price_before_discount ||
        product.priceBeforeDiscount
    );
  }
  const discountCandidate = parseNumeric(
    product.price_after_discount ||
      product.discountPrice ||
      product.discount_price ||
      product.sale_price ||
      product.salePrice
  );
  const discountPercentCandidate = parseNumeric(
    product.discount_percent ||
      product.discountPercent ||
      product.discountPercentage ||
      product.discount
  );

  let currentPrice = 0;
  let originalPrice = 0;

  if (listedPrice > 0 && originalCandidate > 0) {
    currentPrice = Math.min(listedPrice, originalCandidate);
    originalPrice = Math.max(listedPrice, originalCandidate);
  } else if (listedPrice > 0) {
    currentPrice = listedPrice;
    originalPrice = listedPrice;
  } else if (originalCandidate > 0) {
    currentPrice = originalCandidate;
    originalPrice = originalCandidate;
  }

  if (discountCandidate > 0) {
    if (originalPrice <= 0 && currentPrice > 0) {
      originalPrice = currentPrice;
    }
    if (currentPrice <= 0 && originalPrice > 0) {
      currentPrice = originalPrice;
    }

    if (originalPrice > 0 && discountCandidate < originalPrice) {
      currentPrice = discountCandidate;
    } else if (listedPrice > 0 && discountCandidate > listedPrice && originalCandidate <= 0) {
      // Handle swapped data where `price` is already discounted and `price_after_discount` carries old price.
      currentPrice = listedPrice;
      originalPrice = discountCandidate;
    } else if (currentPrice <= 0) {
      currentPrice = discountCandidate;
      if (originalPrice <= 0) originalPrice = discountCandidate;
    }
  }

  if (discountPercentCandidate > 0 && discountPercentCandidate < 100) {
    if (originalPrice <= 0 && currentPrice > 0) {
      originalPrice = currentPrice;
    }
    if (originalPrice > 0) {
      const percentBasedPrice = originalPrice * (1 - discountPercentCandidate / 100);
      if (percentBasedPrice > 0 && (currentPrice <= 0 || percentBasedPrice < currentPrice)) {
        currentPrice = percentBasedPrice;
      }
    }
  }

  if (currentPrice <= 0 && originalPrice > 0) currentPrice = originalPrice;
  if (originalPrice <= 0) originalPrice = currentPrice;
  if (currentPrice > originalPrice) {
    const swap = currentPrice;
    currentPrice = originalPrice;
    originalPrice = swap;
  }

  currentPrice = roundPrice(currentPrice);
  originalPrice = roundPrice(originalPrice);

  const hasDiscount = currentPrice > 0 && originalPrice > 0 && currentPrice < originalPrice;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;

  return { currentPrice, originalPrice, hasDiscount, discountPercent };
}

function resolveRatingsSource(product = {}) {
  const source = String(
    product.ratingSource ||
      product.rating_source ||
      product.ratingsSource ||
      product.ratings_source ||
      ""
  )
    .trim()
    .toLowerCase();

  if (source === "ratings" || source === "supabase_ratings" || source === "supabase") {
    return "ratings";
  }

  if (product.hasSupabaseRatings === true || product.fromRatingsTable === true) {
    return "ratings";
  }

  return "";
}

function resolveProductRating(product = {}) {
  // Ratings are considered authoritative only when they are explicitly marked
  // as coming from the `ratings` table.
  const source = resolveRatingsSource(product);
  if (source !== "ratings") {
    return { rating: 0, reviewCount: 0 };
  }

  const storedRating = parseNumeric(
    product.rating || product.rate || product.average_rating || product.avg_rating
  );
  const storedCount = Math.max(
    0,
    Math.round(
      parseNumeric(
        product.reviewCount ||
          product.review_count ||
          product.reviews_count ||
          product.ratings_count
      )
    )
  );

  return {
    rating: storedCount > 0 ? Math.max(0, Math.min(5, storedRating || 0)) : 0,
    reviewCount: storedCount > 0 ? storedCount : 0,
  };
}

function renderProductStars(ratingValue) {
  const rating = Math.max(0, Math.min(5, Number(ratingValue) || 0));
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  const icons = [];

  for (let i = 0; i < full; i += 1) icons.push("star");
  if (half) icons.push("star_half");
  for (let i = 0; i < empty; i += 1) icons.push("star_border");

  return icons.map((icon) => `<span class="material-icons-outlined">${icon}</span>`).join("");
}

function normalizeProductRecord(product = {}) {
  const productId = product.id ?? product.product_id;
  if (productId === null || typeof productId === "undefined") return null;

  const images = extractProductImages(product);
  const priceInfo = resolveProductPrice(product);
  const ratingInfo = resolveProductRating(product);
  const ratingSource = resolveRatingsSource(product);
  const sellerEmail = String(
    product.sellerEmail ||
      product.seller_email ||
      product.owner_email ||
      product.user_email ||
      product.email ||
      product.seller ||
      ""
  ).trim();
  const sellerId = String(product.seller_id ?? product.owner_id ?? product.user_id ?? "").trim();
  const ownerId = String(product.owner_id ?? product.seller_id ?? product.user_id ?? "").trim();
  const userId = String(product.user_id ?? product.owner_id ?? product.seller_id ?? "").trim();
  const ownerEmail = String(
    product.owner_email ||
      product.seller_email ||
      product.user_email ||
      product.email ||
      sellerEmail ||
      ""
  ).trim();
  const userEmail = String(
    product.user_email ||
      product.owner_email ||
      product.seller_email ||
      product.email ||
      sellerEmail ||
      ""
  ).trim();
  const genericEmail = String(product.email || userEmail || ownerEmail || sellerEmail || "").trim();

  const source = product.source || "internal";
  const availableCountries = Array.isArray(product.available_countries)
    ? product.available_countries
    : [];

return {
    id: String(productId),
    name: repairMojibakeText(
      product.name || product.productName || product.product_name || product.title || ""
    ),
    category: repairMojibakeText(product.category || product.cat || product.type || ""),
    price: priceInfo.currentPrice,
    originalPrice: priceInfo.originalPrice,
    discountPrice: priceInfo.hasDiscount ? priceInfo.currentPrice : null,
    price_after_discount: priceInfo.hasDiscount ? priceInfo.currentPrice : null,
    // Preserve original price fields for resolveProductPrice to work correctly on normalized records
    original_price: product.original_price ?? product.originalPrice ?? product.old_price ?? product.price_before_discount ?? product.priceBeforeDiscount ?? null,
    old_price: product.old_price ?? product.originalPrice ?? product.price_before_discount ?? product.priceBeforeDiscount ?? null,
    price_before_discount: product.price_before_discount ?? product.priceBeforeDiscount ?? product.originalPrice ?? product.original_price ?? product.old_price ?? null,
    priceBeforeDiscount: product.priceBeforeDiscount ?? product.originalPrice ?? product.original_price ?? product.old_price ?? null,
    price_after_discount: product.price_after_discount ?? product.discountPrice ?? product.discount_price ?? product.sale_price ?? product.salePrice ?? null,
    discountPrice: product.discountPrice ?? product.discount_price ?? product.sale_price ?? product.salePrice ?? null,
    discount_price: product.discount_price ?? product.discountPrice ?? product.sale_price ?? product.salePrice ?? null,
    discountPercent: product.discount_percent ?? product.discountPercent ?? product.discountPercentage ?? product.discount ?? null,
    discount_percent: product.discount_percent ?? product.discountPercent ?? product.discountPercentage ?? product.discount ?? null,
    discountPercentage: product.discountPercentage ?? product.discountPercent ?? product.discount ?? null,
    discount: product.discount ?? product.discountPercent ?? product.discount_percentage ?? product.discountPercentage ?? null,
    rating: ratingInfo.rating,
    reviewCount: ratingInfo.reviewCount,
    ratingSource: ratingSource || "",
    rating_source: ratingSource || "",
    image: images[0],
    images,
    image1: product.image1 || product.image_1 || images[0] || "",
    image2: product.image2 || product.image_2 || "",
    image3: product.image3 || product.image_3 || "",
    image4: product.image4 || product.image_4 || "",
    image5: product.image5 || product.image_5 || "",
    image6: product.image6 || product.image_6 || "",
    image7: product.image7 || product.image_7 || "",
    image8: product.image8 || product.image_8 || "",
    image_url: product.image_url || product.imageUrl || "",
    imageUrl: product.imageUrl || product.image_url || "",
    thumbnail: product.thumbnail || "",
    thumb: product.thumb || "",
    img: product.img || "",
    gallery: product.gallery || "",
    extra_links: product.extra_links || product.extraImages || product.additional_images || product.more_images || "",
    description: repairMojibakeText(
      product.description || product.desc || product.details || "لا يوجد وصف متاح لهذا المنتج."
    ),
    reviews: Array.isArray(product.reviews) ? product.reviews : [],
    stockStatus: product.stockStatus || product.stock_status || "in_stock",
    stock: Math.max(0, Math.round(parseNumeric(product.stock || product.quantity || 0))),
    seller: product.seller || (sellerEmail ? sellerEmail.split("@")[0] : "boda"),
    seller_id: sellerId,
    owner_id: ownerId,
    user_id: userId,
    seller_email: sellerEmail,
    owner_email: ownerEmail,
    user_email: userEmail,
    email: genericEmail,
    sellerEmail: sellerEmail,
    source: source,
    available_countries: availableCountries,
    taager_product_id: product.taager_product_id || "",
    country_code: product.country_code || product.country || "",
  };
}

function isNetworkResolutionError(error) {
  const message = String(error?.message || error?.details || "").toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("err_name_not_resolved") ||
    message.includes("networkerror") ||
    message.includes("network request failed")
  );
}

function isSupabaseTemporarilyUnavailable() {
  return Number(window.__Buda_SUPABASE_UNAVAILABLE_UNTIL || 0) > Date.now();
}

function markSupabaseUnavailable(reason = "network") {
  window.__Buda_SUPABASE_UNAVAILABLE_UNTIL = Date.now() + SUPABASE_BACKOFF_MS;
  window.__Buda_SUPABASE_UNAVAILABLE_REASON = reason;
}

// Offline-first sync: when DNS/network fails we back off and keep local products.
// تحميل فوري من localStorage عشان ما ننتظرش async fetch
window._fakeOriginalPrices = {};
try {
  var _fopCached = localStorage.getItem("_fakeOriginalPrices");
  if (_fopCached) {
    var _fopParsed = JSON.parse(_fopCached);
    if (_fopParsed && typeof _fopParsed === "object") window._fakeOriginalPrices = _fopParsed;
  }
} catch (_e) {}

async function loadFakeOriginalPrices() {
  if (isSupabaseTemporarilyUnavailable()) return;
  if (!window.supabaseClient || typeof window.supabaseClient.from !== "function") return;
  var nowMs = Date.now();
  try {
    var tsPrev = localStorage.getItem("_fakeOriginalPrices_ts");
    if (tsPrev && nowMs - Number(tsPrev) < 15 * 60 * 1000 && Object.keys(window._fakeOriginalPrices || {}).length) {
      return;
    }
  } catch (_e) {}
  try {
    var map = {};
    var pageSize = 1000;
    var from = 0;
    while (true) {
      var { data, error } = await window.supabaseClient
        .from("product_original_prices")
        .select("product_id, product_price, fake_original_price, updated_at")
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!Array.isArray(data) || !data.length) break;
      data.forEach(function (row) { if (row && row.product_id) map[String(row.product_id)] = row; });
      if (data.length < pageSize) break;
      from += pageSize;
    }
    window._fakeOriginalPrices = map;

    try {
      localStorage.setItem("_fakeOriginalPrices", JSON.stringify(map));
      localStorage.setItem("_fakeOriginalPrices_ts", String(Date.now()));
    } catch (_e) {}
  } catch (e) {
    if (!isNetworkResolutionError(e)) console.warn("loadFakeOriginalPrices error:", e);
  }
}

async function loadProductsFromSupabase() {
  if (isSupabaseTemporarilyUnavailable()) return;
  if (!window.supabaseClient || typeof window.supabaseClient.from !== "function") return;

  try {
    let data;
    if (typeof window.supabaseClient.fetchAllProducts === "function") {
      data = await window.supabaseClient.fetchAllProducts();
    } else {
      const fallback = await window.supabaseClient.from("products").select("*");
      if (fallback.error) throw fallback.error;
      data = fallback.data;
    }
    if (!Array.isArray(data) || data.length === 0) return;

    let addedCount = 0;
    data.forEach((p) => {
      const normalized = normalizeProductRecord(p);
      if (!normalized) return;

if (!window.productsDatabase[normalized.id]) {
        addedCount += 1;
      }

      var existing = window.productsDatabase[normalized.id] || {};
      var origFromSupabase = Number(p.originalPrice || p.old_price || p.price_before_discount || p.original_price || 0);
      window.productsDatabase[normalized.id] = {
        ...existing,
        ...normalized,
        originalPrice: origFromSupabase > normalized.price ? origFromSupabase : (existing.originalPrice || normalized.originalPrice),
        created_at: p.created_at || existing.created_at,
      };
    });

    if (addedCount > 0) {
      console.log("synced products from Supabase:", Object.keys(window.productsDatabase).length, "(+" + addedCount + " new)");
      if (typeof renderHomeProducts === "function") renderHomeProducts();
      if (typeof renderDailyProducts === "function") renderDailyProducts();
      document.dispatchEvent(new CustomEvent("boda:products-updated", { detail: { added: addedCount } }));
    }
  } catch (error) {
    if (isNetworkResolutionError(error)) {
      markSupabaseUnavailable("network");
      if (!window.__Buda_SUPABASE_DOWN_NOTICE_SHOWN__) {
        console.warn("Supabase is temporarily unreachable. Using local product data.");
        window.__Buda_SUPABASE_DOWN_NOTICE_SHOWN__ = true;
      }
      return;
    }

    console.error("Supabase sync error", error);
    if (error.code === "42501" || /policy/i.test(String(error.message || ""))) {
      console.warn("RLS may block product reads. Add a SELECT policy for anon users.");
    }
  }
}

function trySync() {
  if (isSupabaseTemporarilyUnavailable()) return;
  if (window.supabaseClient && typeof window.supabaseClient.from === "function") {
    loadProductsFromSupabase();
    loadFakeOriginalPrices();
    return;
  }
  requestAnimationFrame(trySync);
}

trySync();

const getImagePath = (path) => {
  const isFile = window.location && window.location.protocol === "file:";
  const fallback = isFile
    ? window.location.pathname.includes("/pages/")
      ? `../${DEFAULT_PRODUCT_IMAGE}`
      : DEFAULT_PRODUCT_IMAGE
    : `/${DEFAULT_PRODUCT_IMAGE}`;

  const source = collectImageCandidates(path)[0] || "";
  if (!source) return fallback;
  if (/^\s*javascript:/i.test(source)) return fallback;
  if (/^(https?:|data:|blob:)/i.test(source)) {
    // Decode legacy Supabase-edge proxy URLs back to the origin image.
    if (typeof source === "string" && source.indexOf("action=proxy-image") >= 0) {
      try {
        const raw = source.split("url=")[1] || "";
        if (raw) source = decodeURIComponent(raw);
      } catch (_e) { /* keep original */ }
    }
    // Resize remote images through our own Vercel optimizer (CDN-cached),
    // except when serving from a local dev server (no /api there).
    const isRemoteImage = /^https?:\/\/(media\.taager\.com|msgqzgzoslearaprgiqq\.supabase\.co)\//i.test(source);
    if (isRemoteImage) {
      const host = String(window.location && window.location.hostname || "");
      if (!/^127\.0\.0\.1$|^localhost$/i.test(host)) {
        return "/api/img?u=" + encodeURIComponent(source) + "&w=800";
      }
    }
    return source;
  }

  // If path already starts with ../, it's likely correct for a sub-page
  if (source.startsWith("../")) {
    return source;
  }

  // Check if the path already seems correct (e.g., "assets/images/...")
  if (source.startsWith("assets/")) {
    const prefix = window.location.pathname.includes("/pages/") ? "../" : "./";
    return prefix + source;
  }

  let normalized = source.replace(/^\.?\.\//, "").replace(/^\//, "");
  if (isFile) {
    const prefix = window.location.pathname.includes("/pages/") ? "../" : "";
    return prefix + normalized;
  }
  return "/" + normalized;
};

const _getAllProducts = () => {
  let all = { ...window.productsDatabase };

  // include any products cached from Supabase queries; these are stored by
  // `addProductToStore` using stringified ids, so merge them as well.
  if (window._supabaseProductCache) {
    all = { ...all, ...window._supabaseProductCache };
  }

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (
      key === "boda_all_products" ||
      key.startsWith("seller_products_") ||
      key.startsWith("partner_products_")
    ) {
      try {
        const sellerProducts = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(sellerProducts)) {
          sellerProducts.forEach((product) => {
            let sellerEmail = product.sellerEmail || product.seller_email || product.seller;
            if (!sellerEmail && key.startsWith("seller_products_")) {
              sellerEmail = key.replace("seller_products_", "");
            }

            const normalized = normalizeProductRecord({
              ...product,
              sellerEmail,
            });

            if (!normalized || all[normalized.id]) return;
            all[normalized.id] = normalized;
          });
        }
      } catch (error) {
        console.error("Error loading products:", error);
      }
    }

    // Merge local comments without overriding ratings sourced from the ratings table.
    if (key && key.startsWith("product_comments_")) {
      const productId = key.replace("product_comments_", "");
      const target = all[productId];
      if (!target) continue;

      try {
        const comments = JSON.parse(localStorage.getItem(key));
        if (!Array.isArray(comments) || !comments.length) continue;

        const validRatings = comments
          .map((item) => ({
            rating: Number(item.rating) || 0,
            text: item.text || "",
            name: item.name || "",
            createdAt: item.createdAt || "",
          }))
          .filter((item) => item.rating > 0);

        if (!validRatings.length) continue;

        all[productId] = {
          ...target,
          reviews: validRatings,
          comments: validRatings,
        };
      } catch (error) {
        console.warn("Invalid product comments for", productId, error);
      }
    }
  }

  return all;
};

const getProductById = (id) => {
  const all = _getAllProducts();
  const key = String(id);
  return all[key] || null;
};

const getCartKey = () => {
  const userEmail = localStorage.getItem("userEmail");
  return userEmail ? `cart_${userEmail}` : "cart";
};

const getCartUserEmail = () => {
  return (localStorage.getItem("userEmail") || "").toString().trim().toLowerCase();
};

const getWishlistKey = () => {
  const userEmail = localStorage.getItem("userEmail");
  return userEmail ? `wishlist_${userEmail}` : "wishlist";
};

const getSupabaseForCart = () => {
  if (window.supabaseClient && typeof window.supabaseClient.from === "function") {
    return window.supabaseClient;
  }
  if (typeof getSupabaseClient === "function") {
    try { return getSupabaseClient(); } catch { return null; }
  }
  return null;
};

async function syncCartToSupabase(cart) {
  const client = getSupabaseForCart();
  const email = getCartUserEmail();
  if (!client || !email) return;

  const items = Array.isArray(cart) ? cart : [];
  try {
    await client.from("cart_items").delete().eq("user_email", email);
    if (items.length) {
      const rows = items.map((item) => ({
        user_email: email,
        product_id: String(item.id || item.product_id || ""),
        name: String(item.name || item.product_name || ""),
        price: Number(item.price) || 0,
        quantity: Math.max(1, Number(item.quantity) || 1),
        image: String(item.image || item.image_url || item.imageUrl || item.thumbnail || ""),
        category: String(item.category || ""),
        description: String(item.description || ""),
        seller_id: String(item.seller_id || item.owner_id || ""),
        seller_email: String(item.seller_email || item.owner_email || ""),
        owner_id: String(item.owner_id || item.seller_id || ""),
        owner_email: String(item.owner_email || item.seller_email || ""),
        source: String(item.source || "internal"),
        taager_product_id: String(item.taager_product_id || ""),
        country_code: String(item.country_code || ""),
      }));
      await client.from("cart_items").insert(rows);
    }
  } catch (e) {
    console.warn("syncCartToSupabase error (non-fatal):", e);
  }
}

async function loadCartFromSupabase() {
  const client = getSupabaseForCart();
  const email = getCartUserEmail();
  if (!client || !email) return null;

  try {
    const { data, error } = await client
      .from("cart_items")
      .select("*")
      .eq("user_email", email);
    if (error) return null;
    if (!Array.isArray(data) || !data.length) return [];

    return data.map((row) => {
      var pid = String(row.product_id || "");
      var legacyColor = row.selected_color || null;
      var legacySize = row.selected_size || null;
      var m = pid.match(/_c_(.+)_s_(.+)$/);
      if (!legacyColor && m) legacyColor = m[1];
      if (!legacySize && m) legacySize = m[2];
      if (!legacySize) {
        var m2 = pid.match(/_size_(.+)$/);
        if (m2) legacySize = m2[1];
      }
      return {
        id: pid,
        product_id: pid,
        name: row.name,
        price: Number(row.price) || 0,
        quantity: Math.max(1, Number(row.quantity) || 1),
        image: row.image,
        image_url: row.image || "",
        category: row.category,
        description: row.description,
        seller_id: row.seller_id,
        seller_email: row.seller_email,
        owner_id: row.owner_id,
        owner_email: row.owner_email,
        source: row.source || "internal",
        taager_product_id: row.taager_product_id || "",
        country_code: row.country_code || "",
        selected_color: row.selected_color || legacyColor || null,
        selected_color_value: row.selected_color_value || "",
        selected_size: row.selected_size || legacySize || null,
        selected_options: (function () { try { var v = JSON.parse(row.selected_options || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } })(),
        variant_label: row.variant_label || null,
      };
    });
  } catch (e) {
    console.warn("loadCartFromSupabase error (non-fatal):", e);
    return null;
  }
}

let _cartLoadedFromSupabase = false;
let _wishlistLoadedFromSupabase = false;

async function syncWishlistToSupabase(wishlist, metadata = {}) {
  const client = getSupabaseForCart();
  const email = getCartUserEmail();
  if (!client || !email) return;

  const items = Array.isArray(wishlist) ? wishlist : [];
  
  // If a specific product was removed, delete it directly
  if (metadata.productId && !metadata.isInWishlist) {
    try {
      await client.from("wishlist_items").delete().match({ user_email: email, product_id: String(metadata.productId) });
    } catch (e) {
      console.warn("syncWishlistToSupabase (delete) error:", e);
    }
  }
  // Don't sync empty wishlist - would wipe Supabase
  if (!items.length) {
    console.log("syncWishlistToSupabase: skipping empty wishlist sync");
    return;
  }

  try {
    // Use upsert instead of delete+insert to avoid wiping data
    const rows = items.map((item) => ({
      user_email: email,
      product_id: String(item.id || item.product_id || ""),
      name: String(item.name || item.product_name || ""),
      price: Number(item.price) || 0,
      image: String(item.image || item.image_url || item.imageUrl || item.thumbnail || ""),
      image_url: String(item.image_url || item.image || item.imageUrl || ""),
      category: String(item.category || ""),
      description: String(item.description || ""),
      seller_id: String(item.seller_id || item.owner_id || ""),
      seller_email: String(item.seller_email || item.owner_email || ""),
      source: String(item.source || "internal"),
      taager_product_id: String(item.taager_product_id || ""),
    }));
    
    // Upsert instead of delete+insert
    await client.from("wishlist_items").upsert(rows, { 
      onConflict: "user_email,product_id" 
    });
  } catch (e) {
    console.warn("syncWishlistToSupabase error (non-fatal):", e);
  }
}

async function loadWishlistFromSupabase() {
  const client = getSupabaseForCart();
  const email = getCartUserEmail();
  if (!client || !email) return null;

  try {
    const { data, error } = await client
      .from("wishlist_items")
      .select("*")
      .eq("user_email", email);
    if (error) return null;
    if (!Array.isArray(data) || !data.length) return [];

    return data.map((row) => ({
      id: row.product_id,
      product_id: row.product_id,
      name: row.name,
      price: Number(row.price) || 0,
      image: row.image,
      image_url: row.image_url || row.image || "",
      category: row.category,
      description: row.description,
      seller_id: row.seller_id,
      seller_email: row.seller_email,
      source: row.source || "internal",
      taager_product_id: row.taager_product_id || "",
    }));
  } catch (e) {
    console.warn("loadWishlistFromSupabase error (non-fatal):", e);
    return null;
  }
}

async function autoLoadWishlistFromSupabase() {
  const email = getCartUserEmail();
  if (!email) {
    _wishlistLoadedFromSupabase = true;
    return;
  }

  const supabaseWishlist = await loadWishlistFromSupabase();
  const localWishlist = getWishlist();

  if (supabaseWishlist === null) {
    _wishlistLoadedFromSupabase = true;
    return;
  }

  // Only merge if Supabase has data - don't wipe local if Supabase is empty
  if (supabaseWishlist.length > 0) {
    if (localWishlist.length === 0) {
      localStorage.setItem(getWishlistKey(), JSON.stringify(supabaseWishlist));
    } else {
      const merged = [...supabaseWishlist];
      localWishlist.forEach((localItem) => {
        const exists = merged.some((s) => String(s.id) === String(localItem.id));
        if (!exists) merged.push(localItem);
      });
      localStorage.setItem(getWishlistKey(), JSON.stringify(merged));
    }
  }
  // If supabaseWishlist.length === 0, KEEP local data - don't wipe it

  _wishlistLoadedFromSupabase = true;
  const finalWishlist = getWishlist();
  if (finalWishlist.length > 0) {
    syncWishlistToSupabase(finalWishlist);
  }
  document.dispatchEvent(new CustomEvent("boda:wishlist-loaded", { detail: { wishlist: getWishlist() } }));
}

const getCart = () => {
  const cart = localStorage.getItem(getCartKey());
  return cart ? JSON.parse(cart) : [];
};

const saveCart = (cart) => {
  localStorage.setItem(getCartKey(), JSON.stringify(cart));
  updateCartCount();
  if (_cartLoadedFromSupabase) {
    syncCartToSupabase(cart);
  }
};

const getWishlist = () => {
  try {
    const wishlist = localStorage.getItem(getWishlistKey());
    const parsed = wishlist ? JSON.parse(wishlist) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveWishlist = (wishlist, metadata = {}) => {
  const normalizedWishlist = Array.isArray(wishlist)
    ? wishlist
        .map((item) => normalizeProductRecord(item))
        .filter(Boolean)
    : [];
  localStorage.setItem(getWishlistKey(), JSON.stringify(normalizedWishlist));

  // Sync to Supabase if user is logged in (has email)
  const email = getCartUserEmail();
  if (email) {
    syncWishlistToSupabase(normalizedWishlist, metadata);
  }

  document.dispatchEvent(
    new CustomEvent("boda:wishlist-updated", {
      detail: {
        ...metadata,
        wishlist: normalizedWishlist,
      },
    })
  );

  return normalizedWishlist;
};

const isInWishlist = (productId) => {
  const targetId = String(productId);
  return getWishlist().some((item) => String(item?.id) === targetId);
};

const updateCartCount = () => {
  const cart = getCart();
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  const cartCountElement = document.getElementById("cart-count");
  if (cartCountElement) {
    cartCountElement.textContent = count;
  }
  const navCartCount = document.getElementById("nav-cart-count");
  const deskCartCount = document.getElementById("nav-cart-count-desk");
  if (deskCartCount) {
    deskCartCount.textContent = count;
    if (count > 0) { deskCartCount.classList.remove("nav-cart-0"); }
    else { deskCartCount.classList.add("nav-cart-0"); }
  }
  if (navCartCount) {
    navCartCount.textContent = count;
    if (count > 0) {
      navCartCount.classList.remove("nav-cart-0");
    } else {
      navCartCount.classList.add("nav-cart-0");
    }
  }
};

// Inject cart notification CSS once
if (!window._bodaCartToastInjected) {
  window._bodaCartToastInjected = true;
  var _cartStyle = document.createElement('style');
  _cartStyle.textContent =
    '@keyframes _bodaSlideUp{0%{transform:translateY(120%) scale(0.85);opacity:0}60%{transform:translateY(-8%) scale(1.01);opacity:1}100%{transform:translateY(0) scale(1);opacity:1}}' +
    '@keyframes _bodaSlideDown{0%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(140%) scale(0.85);opacity:0}}' +
    '@keyframes _bodaSpin{0%{transform:rotate(0deg) scale(0.3);opacity:0}50%{transform:rotate(-8deg) scale(1.1);opacity:1}70%{transform:rotate(4deg) scale(0.95)}100%{transform:rotate(0deg) scale(1);opacity:1}}' +
    '@keyframes _bodaPulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,0.5)}70%{box-shadow:0 0 0 14px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}' +
    '._bodaCartToast{position:fixed;bottom:80px;left:12px;right:12px;z-index:99999;background:#fff;border-radius:20px;padding:16px;box-shadow:0 8px 40px rgba(0,0,0,0.18),0 2px 8px rgba(0,0,0,0.06);display:flex;flex-direction:column;gap:12px;direction:rtl;animation:_bodaSlideUp 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards;max-width:400px;margin:0 auto;border:1px solid rgba(0,0,0,0.04);}' +
    '._bodaCartToast._bodaHide{animation:_bodaSlideDown 0.35s ease-in forwards;}' +
    '._bodaCartToast-row{display:flex;align-items:center;gap:14px;}' +
    '._bodaCartToast-img{width:60px;height:60px;border-radius:14px;object-fit:cover;background:#f1f5f9;flex-shrink:0;animation:_bodaSpin 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both;border:2px solid #f8fafc;box-shadow:0 2px 8px rgba(0,0,0,0.08);}' +
    '._bodaCartToast-info{flex:1;min-width:0;}' +
    '._bodaCartToast-name{font-size:0.9rem;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0 0 4px;}' +
    '._bodaCartToast-qty{font-size:0.75rem;color:#64748b;margin:0 0 2px;}' +
    '._bodaCartToast-price{display:flex;align-items:center;gap:8px;}' +
    '._bodaCartToast-current{font-size:1.05rem;font-weight:700;color:#16a34a;}' +
    '._bodaCartToast-old{font-size:0.8rem;color:#94a3b8;text-decoration:line-through;}' +
    '._bodaCartToast-discount{font-size:0.7rem;background:#dcfce7;color:#16a34a;padding:2px 7px;border-radius:6px;font-weight:600;}' +
    '._bodaCartToast-btn{display:block;width:100%;padding:10px;border:0;border-radius:14px;background:#22c55e;color:#fff;font-size:0.9rem;font-weight:600;cursor:pointer;transition:background 0.18s ease,transform 0.12s ease;animation:_bodaPulse 1.5s ease 0.6s 2;}' +
    '._bodaCartToast-btn:hover{background:#16a34a;}' +
    '._bodaCartToast-btn:active{transform:scale(0.96);}' +
    '._bodaCartToast-close{position:absolute;top:-8px;left:-8px;width:26px;height:26px;border-radius:50%;border:0;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.12);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;color:#64748b;z-index:1;transition:transform 0.15s;}' +
    '._bodaCartToast-close:hover{transform:scale(1.15);}' +
    '@media(min-width:480px){._bodaCartToast{bottom:100px;}}';
  document.head.appendChild(_cartStyle);
}

const notifyCartAdded = (product, quantity = 1, priceInfo) => {
  if (!product) return;
  var pName = String(product.name || product.title || "المنتج").trim();
  var pQty = Math.max(1, Number(quantity) || 1);
  var pImg = product.image || product.image_url || product.imageUrl || product.thumbnail || (Array.isArray(product.images) ? product.images[0] : null) || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%2394a3b8" font-size="12">No Image</text></svg>';
  
  // Use passed priceInfo if provided, otherwise recalculate
  var pi = priceInfo || resolveProductPrice(product);
  var curPrice = pi.currentPrice || 0;
  var oldPrice = pi.originalPrice > curPrice ? pi.originalPrice : 0;
  var discPct = pi.discountPercent || (oldPrice > curPrice ? Math.round((1 - curPrice / oldPrice) * 100) : 0);

  var existing = document.querySelector('._bodaCartToast');
  if (existing) { existing.remove(); }

  var wrap = document.createElement('div');
  wrap.className = '_bodaCartToast';

  var closeBtn = document.createElement('button');
  closeBtn.className = '_bodaCartToast-close';
  closeBtn.innerHTML = '\u00D7';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.addEventListener('click', function(e) { e.stopPropagation(); wrap.classList.add('_bodaHide'); setTimeout(function() { wrap.remove(); }, 360); });
  wrap.appendChild(closeBtn);

  var row = document.createElement('div');
  row.className = '_bodaCartToast-row';

  var img = document.createElement('img');
  img.className = '_bodaCartToast-img';
  img.src = pImg;
  img.alt = pName;
  img.onerror = function() { this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%2394a3b8" font-size="12">No Image</text></svg>'; };
  row.appendChild(img);

  var info = document.createElement('div');
  info.className = '_bodaCartToast-info';

  var nameEl = document.createElement('div');
  nameEl.className = '_bodaCartToast-name';
  nameEl.textContent = pName;
  info.appendChild(nameEl);

  if (pQty > 1) {
    var qtyEl = document.createElement('div');
    qtyEl.className = '_bodaCartToast-qty';
    qtyEl.textContent = '\u0627\u0644\u0643\u0645\u064A\u0629: ' + pQty;
    info.appendChild(qtyEl);
  }

  var priceRow = document.createElement('div');
  priceRow.className = '_bodaCartToast-price';

  var curPriceEl = document.createElement('span');
  curPriceEl.className = '_bodaCartToast-current';
  curPriceEl.textContent = curPrice.toLocaleString('ar-EG') + ' \u062C\u0646\u064A\u0647';
  priceRow.appendChild(curPriceEl);

  if (oldPrice > curPrice) {
    var oldPriceEl = document.createElement('span');
    oldPriceEl.className = '_bodaCartToast-old';
    oldPriceEl.textContent = oldPrice.toLocaleString('ar-EG') + ' \u062C\u0646\u064A\u0647';
    priceRow.appendChild(oldPriceEl);

    var discEl = document.createElement('span');
    discEl.className = '_bodaCartToast-discount';
    discEl.textContent = '-' + discPct + '%';
    priceRow.appendChild(discEl);
  }

  info.appendChild(priceRow);
  row.appendChild(info);
  wrap.appendChild(row);

  var btn = document.createElement('button');
  btn.className = '_bodaCartToast-btn';
  btn.textContent = '\u0639\u0631\u0636 \u0627\u0644\u0639\u0631\u0628\u0629';
  btn.addEventListener('click', function() {
    wrap.classList.add('_bodaHide');
    setTimeout(function() { wrap.remove(); }, 360);
    window.location.href = (window.location.pathname.includes('/pages/') ? '' : 'pages/') + 'empty-cart.html';
  });
  wrap.appendChild(btn);

  document.body.appendChild(wrap);

  window._bodaCartTimer && clearTimeout(window._bodaCartTimer);
  window._bodaCartTimer = setTimeout(function() {
    wrap.classList.add('_bodaHide');
    setTimeout(function() { wrap.remove(); }, 360);
  }, 3800);
};
const addToCart = (product, quantity = 1, options = {}) => {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  if (!isLoggedIn) {
    // Determine correct relative path to signin page depending on current location
    const loginPath = window.location.pathname.includes('/pages/') ? 'signin/login.html' : 'pages/signin/login.html';
    window.location.href = loginPath;
    return;
  }

  const cart = getCart();
  var selectedSize = options.selectedSize || null;
  var selectedColor = options.selectedColor || null;
  var otherOptions = Array.isArray(options.otherOptions) ? options.otherOptions : [];
  var variantSuffix = "";
  if (selectedColor) {
    var colorName = selectedColor.name || String(selectedColor);
    variantSuffix += "_c_" + String(colorName).replace(/\s+/g, "_");
  }
  if (selectedSize) {
    variantSuffix += "_s_" + String(selectedSize.name || selectedSize).replace(/\s+/g, "_");
  }
  const targetId = String(product.id) + variantSuffix;
  const priceInfo = resolveProductPrice(product);
  var perSizePrice =
    selectedSize && typeof selectedSize === "object" && !Array.isArray(selectedSize)
      ? Number(selectedSize.price) || 0
      : 0;
  var finalPrice = perSizePrice > 0 ? perSizePrice : priceInfo.currentPrice;
  if (perSizePrice <= 0 && window.PricingEngine?.tiersLoaded) {
    finalPrice = window.PricingEngine.calculate(finalPrice);
  }
  const existingItem = cart.find(function (item) { return String(item.id) === targetId; });
  if (existingItem) {
    existingItem.quantity += quantity;
    if (perSizePrice > 0) {
      existingItem.price = perSizePrice;
      existingItem.selected_size_price = perSizePrice;
    }
  } else {
    var source = product.source || "internal";
    var taagerProductId = product.taager_product_id || "";
    var countryCode = product.country_code || product.country || "";
    if (!countryCode && window.TaagerIntegration) {
      var selected = window.TaagerIntegration.getSelectedCountry();
      if (selected) countryCode = selected.code;
    }

    const productImage = product.image || product.image_url || product.imageUrl || product.thumbnail || product.img || 
(Array.isArray(product.images) ? product.images[0] : product.images) || "";

    cart.push({
      id: targetId,
      product_id: product.product_id ?? product.id ?? targetId,
      legacy_my_products_id: product.legacy_my_products_id ?? "",
      legacy_product_id: product.legacy_product_id ?? "",
      product_uuid: product.product_uuid ?? product.uuid ?? "",
      name: product.name,
      price: finalPrice,
      selected_size_price: perSizePrice > 0 ? perSizePrice : undefined,
      quantity,
      image: productImage,
      image_url: product.image_url || product.imageUrl || productImage,
      category: product.category,
      description: product.description,
      seller_id: product.seller_id ?? product.owner_id ?? product.user_id ?? "",
      owner_id: product.owner_id ?? product.seller_id ?? product.owner_id ?? "",
      seller_email: product.seller_email ?? product.owner_email ?? product.user_email ?? product.email ?? "",
      owner_email: product.owner_email ?? product.seller_email ?? product.user_email ?? product.email ?? "",
      source: source,
      taager_product_id: taagerProductId,
      country_code: countryCode,
      selected_size: selectedSize ? (selectedSize.name || String(selectedSize)) : null,
      selected_color: selectedColor ? (selectedColor.name || String(selectedColor)) : null,
      selected_color_value: selectedColor ? (selectedColor.value || "") : "",
      selected_options: otherOptions.length ? otherOptions : [],
      variant_label: [selectedColor ? "اللون: " + (selectedColor.name || String(selectedColor)) : "", selectedSize ? "المقاس: " + (selectedSize.name || String(selectedSize)) : ""].concat(otherOptions).filter(Boolean).join(" / "),
    });
  }

  saveCart(cart);

  if (options?.silent !== true) {
    var toastInfo =
      perSizePrice > 0
        ? { currentPrice: finalPrice }
        : finalPrice !== priceInfo.currentPrice
          ? Object.assign({}, priceInfo, { currentPrice: finalPrice })
          : priceInfo;
    notifyCartAdded(product, quantity, toastInfo);
  }
};

const removeFromCart = (productId) => {
  const targetId = String(productId);
  const cart = getCart().filter((item) => String(item.id) !== targetId);
  saveCart(cart);
};

const updateQuantity = (productId, newQuantity) => {
  const cart = getCart();
  const targetId = String(productId);
  const item = cart.find((entry) => String(entry.id) === targetId);
  if (!item) return;
  if (newQuantity <= 0) {
    removeFromCart(targetId);
    return;
  }
  item.quantity = newQuantity;
  saveCart(cart);
};

// clear entire cart (used after checkout)
const clearCart = () => {
  saveCart([]);
  const client = getSupabaseForCart();
  const email = getCartUserEmail();
  if (client && email) {
    try {
      client.from("cart_items").delete().eq("user_email", email).then();
    } catch (_) {}
  }
};

// helper to get total item count in cart
const getCartCount = () => {
  const cart = getCart();
  return cart.reduce((total, item) => total + item.quantity, 0);
};

const toggleWishlist = (productId) => {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  if (!isLoggedIn) {
    const loginPath = window.location.pathname.includes('/pages/') ? 'signin/login.html' : 'pages/signin/login.html';
    window.location.href = loginPath;
    return false;
  }

  const targetId = String(productId);
  const wishlist = getWishlist();
  const existingIndex = wishlist.findIndex((item) => String(item?.id) === targetId);
  let wishlistState = false;

  if (existingIndex !== -1) {
    wishlist.splice(existingIndex, 1);
  } else {
    const allProducts = _getAllProducts();
    const product = allProducts[targetId];
    if (!product) return false;
    const normalizedProduct = normalizeProductRecord(product);
    if (!normalizedProduct) return false;
    wishlist.push(normalizedProduct);
    wishlistState = true;
  }

  saveWishlist(wishlist, {
    productId: targetId,
    isInWishlist: wishlistState,
  });

  return wishlistState;
};

function getLanguage() {
  return "ar";
}

function t(key) { return key; }

window.BudaStore = {
  DEFAULT_PRODUCT_IMAGE,
  getImagePath,
  getProductImages: extractProductImages,
  resolveProductPrice,
  resolveProductRating,
  renderProductStars,
  normalizeProductRecord,
  getAllProducts: _getAllProducts,
  getProductById,
  getCart,
  saveCart,
  addToCart,
  removeFromCart,
  updateQuantity,
  updateCartCount,
  clearCart,
  getCartCount,
  syncCartToSupabase,
  loadCartFromSupabase,
  syncWishlistToSupabase,
  loadWishlistFromSupabase,
  getWishlist,
  saveWishlist,
  isInWishlist,
  toggleWishlist,
  resolveCurrencyConfig: function () {
    var selected = window.TaagerIntegration ? window.TaagerIntegration.getSelectedCountry() : null;
    var code = selected ? selected.code : "EG";
    var localeMap = { "ar": { EG: "ar-EG", SA: "ar-SA" } };
    var locales = localeMap.ar;
    return { locale: locales[code] || locales.EG, currency: code === "SA" ? "SAR" : "EGP" };
  },
  formatMoney: function (value, options) {
    var cfg = this.resolveCurrencyConfig();
    var num = Number(value) || 0;
    var plain = options && options.plain;
    var formatted = new Intl.NumberFormat(cfg.locale, {
      minimumFractionDigits: options && options.minimumFractionDigits != null ? options.minimumFractionDigits : 0,
      maximumFractionDigits: options && options.maximumFractionDigits != null ? options.maximumFractionDigits : 2,
    }).format(num);
    var labels = { EGP: "جنيه", SAR: "ريال" };
    var label = labels[cfg.currency] || cfg.currency;
    if (plain) return formatted + " " + label;
    return '<span class="noon-price-num">' + formatted + '</span> <small class="noon-currency">' + label + '</small>';
  },
  getCurrencyLabel: function () {
    var cfg = this.resolveCurrencyConfig();
    var labels = { EGP: "جنيه", SAR: "ريال" };
    return labels[cfg.currency] || cfg.currency;
  },
  getLanguage: getLanguage,
  t: t,
};

// Auto-sync profile from localStorage to Supabase on any page
function autoSyncProfile() {
  var email = (localStorage.getItem("userEmail") || "").trim().toLowerCase();
  if (!email) return;
  var firstName = localStorage.getItem("userFirstName") || "";
  var lastName = localStorage.getItem("userLastName") || "";
  var phone = localStorage.getItem("userPhone") || "";
var birthDay = localStorage.getItem("userBirthDay") || "";
  var birthMonth = localStorage.getItem("userBirthMonth") || "";
  var birthYear = localStorage.getItem("userBirthYear") || "";
  var gender = localStorage.getItem("userGender") || "";
  var nationality = localStorage.getItem("userNationality") || "";
  var fullName = localStorage.getItem("userFullName") || (firstName + " " + lastName).trim();
  if (!fullName && !phone && !birthDay && !gender && !nationality) return;

  if (typeof getSupabaseClient !== "function") return;
  var client = getSupabaseClient();
  if (!client) return;

  function buildPayload(existing) {
    var payload = { email: email };
    if (firstName) payload.first_name = firstName;
    if (lastName) payload.last_name = lastName;
    if (fullName) payload.full_name = fullName;
    if (phone) payload.phone = phone;
    if (gender) payload.gender = gender;
    if (nationality) payload.nationality = nationality;
    // Only set birthday from localStorage if not already in Supabase
    if (birthDay && birthMonth && birthYear) {
      if (!existing || !existing.birth_day) {
        payload.birth_day = parseInt(birthDay) || null;
        payload.birth_month = parseInt(birthMonth) || null;
        payload.birth_year = parseInt(birthYear) || null;
      }
    }
    return payload;
  }

  client.from("profiles").select("*").eq("email", email).limit(1).then(function (result) {
    if (result.error) return;
    var existing = Array.isArray(result.data) && result.data.length ? result.data[0] : null;
    var payload = buildPayload(existing);
    if (Object.keys(payload).length <= 1) return;
    if (existing) {
      client.from("profiles").update(payload).eq("email", email).then(function (res) {
        if (res.error) console.warn("auto-sync update error", res.error);
      });
    } else {
      client.from("profiles").insert(payload).then(function (res) {
        if (res.error) console.warn("auto-sync insert error", res.error);
      });
    }
  }).catch(function (e) { console.warn("auto-sync error", e); });
}

if (document.readyState === "loading") {

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", autoSyncProfile);
} else {
  autoSyncProfile();
}

// تحميل العربة من Supabase عند تسجيل الدخول
async function autoLoadCartFromSupabase() {
  const email = getCartUserEmail();
  if (!email) {
    _cartLoadedFromSupabase = true;
    return;
  }

  const supabaseCart = await loadCartFromSupabase();
  const localCart = getCart();

  if (supabaseCart === null) {
    // Error اتصال بـ Supabase → خلينا على localStorage
    _cartLoadedFromSupabase = true;
    updateCartCount();
    document.dispatchEvent(new CustomEvent("boda:cart-loaded", { detail: { cart: localCart } }));
    return;
  }

  if (supabaseCart.length > 0) {
    // في بيانات في Supabase → دمج مع localStorage
    if (localCart.length === 0) {
      localStorage.setItem(getCartKey(), JSON.stringify(supabaseCart));
    } else {
      const merged = [...supabaseCart];
      localCart.forEach((localItem) => {
        const exists = merged.some((s) => String(s.id) === String(localItem.id));
        if (!exists) merged.push(localItem);
      });
      localStorage.setItem(getCartKey(), JSON.stringify(merged));
    }
  } else {
    // Supabase فاضي والمستخدم مسحها يدوي → طهر localStorage كمان
    if (localCart.length > 0) {
      localStorage.removeItem(getCartKey());
    }
  }

  _cartLoadedFromSupabase = true;
  const finalCart = getCart();
  if (finalCart.length > 0) {
    syncCartToSupabase(finalCart);
  }
  updateCartCount();
  document.dispatchEvent(new CustomEvent("boda:cart-loaded", { detail: { cart: getCart() } }));
}

// تنفيذ بعد تحميل الصفحة
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    autoLoadCartFromSupabase();
    autoLoadWishlistFromSupabase();
  });
} else {
  autoLoadCartFromSupabase();
  autoLoadWishlistFromSupabase();
}

// لما user يعمل تسجيل دخول، reload العربة والمفضلة
document.addEventListener("boda:user-logged-in", function () {
  _cartLoadedFromSupabase = false;
  _wishlistLoadedFromSupabase = false;
  autoLoadCartFromSupabase();
  autoLoadWishlistFromSupabase();
});



// Backwards-compat: expose old global helpers for pages that call them directly
if (typeof window !== 'undefined') {
  window.getAllProducts = window.getAllProducts || _getAllProducts;
  window.getProductById = window.getProductById || getProductById;
  window.getImagePath = window.getImagePath || getImagePath;
  window.updateCartCount = window.updateCartCount || updateCartCount;
  // Expose addToCart globally for pages that call it directly
  window.addToCart = window.addToCart || addToCart;
  // expose wishlist helpers for legacy code
  window.getWishlist = window.getWishlist || getWishlist;
  window.saveWishlist = window.saveWishlist || saveWishlist;
  window.isInWishlist = window.isInWishlist || isInWishlist;
  window.toggleWishlist = window.toggleWishlist || toggleWishlist;
  // allow other code to seed products for persistence (e.g. supabase results)
  if (!window.addProductToStore) {
    window.addProductToStore = (prod) => {
      const normalized = normalizeProductRecord(prod);
      if (!normalized) return;
      window._supabaseProductCache = window._supabaseProductCache || {};
      window._supabaseProductCache[normalized.id] = Object.assign({}, prod, normalized);
};
  }
  // expose cart helpers
  window.clearCart = window.clearCart || clearCart;
  window.getCartCount = window.getCartCount || getCartCount;
}

// Listen for country changes and filter cart items that don't match the new country
if (typeof window !== 'undefined') {
  document.addEventListener("boda:country-changed", function (e) {
    var newCountry = e?.detail?.code || "";
    if (!newCountry) return;
    
    var cart = getCart();
    var filteredCart = cart.filter(function(item) {
      // Keep items that have no country_code (legacy) or match the new country
      var itemCountry = item?.country_code || "";
      return !itemCountry || itemCountry === newCountry;
    });
    
    if (cart.length !== filteredCart.length) {
      var removedCount = cart.length - filteredCart.length;
      saveCart(filteredCart);
      updateCartCount();
      if (window.BudaUI?.notify) {
        window.BudaUI.notify("تم إزالة " + removedCount + " منتج غير متاح في " + (newCountry === "SA" ? "السعودية" : "مصر"), "info");
      }
    }
  });

  // Filter cart on initial load based on current country
  function filterCartByCountry() {
    var countryCode = "";
    try {
      var selected = window.TaagerIntegration?.getSelectedCountry?.();
      if (selected?.code) countryCode = selected.code;
    } catch (_) {}
    if (!countryCode) {
      var userCountry = localStorage.getItem("userCountry");
      if (userCountry) countryCode = userCountry.toUpperCase();
    }
    if (!countryCode) return;
    
    var cart = getCart();
    var filteredCart = cart.filter(function(item) {
      var itemCountry = item?.country_code || "";
      return !itemCountry || itemCountry === countryCode;
    });
    
    if (cart.length !== filteredCart.length) {
      var removedCount = cart.length - filteredCart.length;
      saveCart(filteredCart);
      updateCartCount();
    }
  }
  
  // Run on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', filterCartByCountry);
  } else {
    filterCartByCountry();
  }
}
}