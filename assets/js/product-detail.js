const detailMoneyFormatter = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const getQueryParam = (key) => new URLSearchParams(window.location.search).get(key);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeImagePath(path) {
  const fallback = window.BudaStore?.DEFAULT_PRODUCT_IMAGE || "assets/images/unnamed.png";
  const resolved = window.BudaStore?.getImagePath
    ? window.BudaStore.getImagePath(path)
    : path || fallback;

  if (/^\s*javascript:/i.test(String(resolved || ""))) {
    return window.BudaStore?.getImagePath
      ? window.BudaStore.getImagePath(fallback)
      : fallback;
  }

  return resolved;
}

function getFallbackImage() {
  return safeImagePath(window.BudaStore?.DEFAULT_PRODUCT_IMAGE || "assets/images/unnamed.png");
}

function productNotify(message, type = "info") {
  const text = String(message || "").trim();
  if (!text) return;

  if (window.BudaUI?.notify) {
    try {
      window.BudaUI.notify(text, { type, target: "#product-status" });
    } catch {
      // fall back to inline status below
    }
  }

  const targets = [
    document.getElementById("product-status"),
    document.getElementById("comment-form-status"),
  ].filter(Boolean);

  if (!targets.length) {
    try {
      window.alert(text);
    } catch {
      // no-op
    }
    return;
  }

  targets.forEach((target) => {
    target.textContent = text;
    target.classList.remove("hidden", "error", "success", "info");
    target.classList.add("status-note", type === "error" ? "error" : type === "success" ? "success" : "info");
  });
}

function formatStars(ratingValue) {
  if (window.BudaStore?.renderProductStars) {
    return window.BudaStore.renderProductStars(ratingValue);
  }

  const rating = Math.max(0, Math.min(5, Number(ratingValue) || 0));
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  const stars = [];

  for (let i = 0; i < full; i += 1) stars.push("star");
  if (half) stars.push("star_half");
  for (let i = 0; i < empty; i += 1) stars.push("star_border");

  return stars
    .map((icon) => `<span class="material-icons-outlined">${icon}</span>`)
    .join("");
}

function normalizeImages(product) {
  const images = window.BudaStore?.getProductImages
    ? window.BudaStore.getProductImages(product)
    : [product?.image || "assets/images/unnamed.png"];

  return images.map((path) => safeImagePath(path));
}

function splitGalleryField(value) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => splitGalleryField(entry));
  }

  const raw = String(value || "").trim();
  if (!raw) return [];
  if (/^data:image\//i.test(raw) || /^(https?:|blob:)/i.test(raw)) {
    return [raw.replace(/^['"]|['"]$/g, "")];
  }

  if ((raw.startsWith("[") && raw.endsWith("]")) || (raw.startsWith("{") && raw.endsWith("}"))) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.flatMap((entry) => splitGalleryField(entry));
      }
    } catch {
      // Fall through to plain-text splitting below.
    }
  }

  if (/[;\n\r|]/.test(raw)) {
    return raw
      .split(/[;\n\r|]+/g)
      .map((entry) => entry.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }

  if (raw.includes(",")) {
    return raw
      .split(/\s*,\s*/g)
      .map((entry) => entry.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }

  return [raw.replace(/^['"]|['"]$/g, "")];
}

function normalizeGalleryImages(product) {
  const orderedSlots = [
    product?.image,
    product?.image1,
    product?.image2,
    product?.image3,
    product?.image4,
    product?.image5,
    product?.image_1,
    product?.image_2,
    product?.image_3,
    product?.image_4,
    product?.image_5,
  ]
    .flatMap((value) => splitGalleryField(value))
    .map((path) => safeImagePath(path))
    .filter(Boolean);

  const uniqueSlots = [];
  const seen = new Set();

  orderedSlots.forEach((path) => {
    if (seen.has(path)) return;
    seen.add(path);
    uniqueSlots.push(path);
  });

  return uniqueSlots.length ? uniqueSlots : normalizeImages(product);
}

function normalizePrice(product) {
  if (window.BudaStore?.resolveProductPrice) {
    const { currentPrice, originalPrice } = window.BudaStore.resolveProductPrice(product);
    return { currentPrice, originalPrice };
  }

  const value = Number(product?.price) || 0;
  return { currentPrice: value, originalPrice: value };
}

function getRatingSnapshot(product) {
  if (window.BudaStore?.resolveProductRating) {
    return window.BudaStore.resolveProductRating(product);
  }

  return {
    rating: 0,
    reviewCount: 0,
  };
}

function getCurrentUser() {
  try {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (user && user.id) return user;
  } catch {
    // ignore parse errors
  }
  return null;
}

const RATINGS_COMMENT_SUPPORT_KEY = "boda_ratings_supports_comment";
const SUPABASE_ANON_DISABLED_KEY = "boda_supabase_anon_disabled";
const SUPABASE_ANON_AUTOSIGNIN_KEY = "boda_enable_supabase_anon_autosignin";
const RATINGS_USER_ID_REQUIRED_KEY = "boda_ratings_user_id_required";
const RATINGS_REVIEWER_NAME_SUPPORT_KEY = "boda_ratings_supports_reviewer_name";
const RATING_SUCCESS_MESSAGE = "تم التقييم بنجاح";
const RATING_FAILURE_MESSAGE = "فشل التقييم";
const COMMENTS_PREVIEW_LIMIT = 3;

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

function isAnonymousAuthBlocked(error) {
  const status = String(error?.status || error?.code || "").trim();
  const text = String(
    error?.message || error?.error_description || error?.msg || error?.details || ""
  ).toLowerCase();

  if (status === "422") return true;
  if (text.includes("anonymous") && (text.includes("disable") || text.includes("not enabled"))) {
    return true;
  }
  if (text.includes("signup") && (text.includes("not allowed") || text.includes("disabled"))) {
    return true;
  }
  return false;
}

function isMissingColumnError(error) {
  const code = String(error?.code || "").toLowerCase();
  const text = String(error?.message || error?.details || "").toLowerCase();
  return (
    code === "42703" ||
    code === "pgrst204" ||
    (text.includes("column") && text.includes("does not exist"))
  );
}

function getRatingsCommentSupport() {
  if (typeof window.__Buda_RATINGS_SUPPORTS_COMMENT__ === "boolean") {
    return window.__Buda_RATINGS_SUPPORTS_COMMENT__;
  }

  try {
    const raw = localStorage.getItem(RATINGS_COMMENT_SUPPORT_KEY);
    if (raw === "1") {
      window.__Buda_RATINGS_SUPPORTS_COMMENT__ = true;
      return true;
    }
    if (raw === "0") {
      window.__Buda_RATINGS_SUPPORTS_COMMENT__ = false;
      return false;
    }
  } catch {
    // ignore storage errors
  }

  return null;
}

function setRatingsCommentSupport(value) {
  const normalized = Boolean(value);
  window.__Buda_RATINGS_SUPPORTS_COMMENT__ = normalized;
  try {
    localStorage.setItem(RATINGS_COMMENT_SUPPORT_KEY, normalized ? "1" : "0");
  } catch {
    // ignore storage errors
  }
}

function getRatingsReviewerNameSupport() {
  if (typeof window.__Buda_RATINGS_SUPPORTS_REVIEWER_NAME__ === "boolean") {
    return window.__Buda_RATINGS_SUPPORTS_REVIEWER_NAME__;
  }

  try {
    const raw = localStorage.getItem(RATINGS_REVIEWER_NAME_SUPPORT_KEY);
    if (raw === "1") {
      window.__Buda_RATINGS_SUPPORTS_REVIEWER_NAME__ = true;
      return true;
    }
  } catch {
    // ignore storage errors
  }

  return null;
}

function setRatingsReviewerNameSupport(value) {
  const normalized = Boolean(value);
  window.__Buda_RATINGS_SUPPORTS_REVIEWER_NAME__ = normalized;
  try {
    if (normalized) {
      localStorage.setItem(RATINGS_REVIEWER_NAME_SUPPORT_KEY, "1");
    } else {
      localStorage.removeItem(RATINGS_REVIEWER_NAME_SUPPORT_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function detectMissingRatingsColumn(error) {
  const text = String(error?.message || error?.details || "").toLowerCase();
  if (text.includes("reviewer_name")) return "reviewer_name";
  if (text.includes("comment")) return "comment";
  return "";
}

function isSupabaseAnonDisabled() {
  if (window.__Buda_SUPABASE_ANON_DISABLED__ === true) return true;
  try {
    if (localStorage.getItem(SUPABASE_ANON_DISABLED_KEY) === "1") {
      window.__Buda_SUPABASE_ANON_DISABLED__ = true;
      return true;
    }
  } catch {
    // ignore storage errors
  }
  return false;
}

function markSupabaseAnonDisabled(reason = "") {
  window.__Buda_SUPABASE_ANON_DISABLED__ = true;
  window.__Buda_SUPABASE_ANON_DISABLED_REASON__ = String(reason || "");
  try {
    localStorage.setItem(SUPABASE_ANON_DISABLED_KEY, "1");
  } catch {
    // ignore storage errors
  }
}

function isRatingsUserIdRequired() {
  if (window.__Buda_RATINGS_USER_ID_REQUIRED__ === true) return true;
  try {
    if (sessionStorage.getItem(RATINGS_USER_ID_REQUIRED_KEY) === "1") {
      window.__Buda_RATINGS_USER_ID_REQUIRED__ = true;
      return true;
    }
  } catch {
    // ignore storage errors
  }
  return false;
}

function markRatingsUserIdRequired() {
  window.__Buda_RATINGS_USER_ID_REQUIRED__ = true;
  try {
    sessionStorage.setItem(RATINGS_USER_ID_REQUIRED_KEY, "1");
  } catch {
    // ignore storage errors
  }
}

function isSupabaseAnonAutoSignInEnabled() {
  if (window.__Buda_ENABLE_SUPABASE_ANON_AUTOSIGNIN__ === true) return true;
  if (window.Buda_ENABLE_SUPABASE_ANON_AUTOSIGNIN === true) return true;

  try {
    return localStorage.getItem(SUPABASE_ANON_AUTOSIGNIN_KEY) === "1";
  } catch {
    return false;
  }
}

function getSupabaseRawClient() {
  if (window.supabaseClient?.raw && typeof window.supabaseClient.raw === "function") {
    try {
      return window.supabaseClient.raw();
    } catch {
      // fallback below
    }
  }

  if (window.getSupabaseClient && typeof window.getSupabaseClient === "function") {
    try {
      return window.getSupabaseClient();
    } catch {
      // fallback below
    }
  }

  return null;
}

async function resolveSupabaseAuthUserId() {
  const localUser = getCurrentUser();
  const localCandidates = [
    localUser?.auth_user_id,
    localUser?.authUserId,
    localUser?.supabase_user_id,
    localUser?.supabaseUserId,
    localUser?.user_uuid,
    localUser?.uuid,
    localUser?.id,
  ];

  for (const candidate of localCandidates) {
    if (isUuid(candidate)) return String(candidate).trim();
  }

  const client = getSupabaseRawClient();
  if (!client?.auth) return null;

  try {
    const { data } = await client.auth.getUser();
    const existingUserId = data?.user?.id;
    if (isUuid(existingUserId)) return String(existingUserId).trim();
  } catch {
    // continue to anonymous sign-in attempt
  }

  if (
    typeof client.auth.signInAnonymously === "function" &&
    !isSupabaseAnonDisabled() &&
    isSupabaseAnonAutoSignInEnabled()
  ) {
    try {
      const { data, error } = await client.auth.signInAnonymously();
      if (error) {
        if (isAnonymousAuthBlocked(error)) {
          markSupabaseAnonDisabled(
            error?.message || error?.error_description || error?.msg || ""
          );
        } else {
          console.warn("supabase anonymous auth error", error);
        }
      } else if (isUuid(data?.user?.id)) {
        return String(data.user.id).trim();
      }
    } catch (error) {
      if (isAnonymousAuthBlocked(error)) {
        markSupabaseAnonDisabled(
          error?.message || error?.error_description || error?.msg || ""
        );
      }
    }
  }

  try {
    const { data } = await client.auth.getUser();
    const userId = data?.user?.id;
    if (isUuid(userId)) return String(userId).trim();
  } catch {
    // ignore
  }

  return null;
}

function mapRatingsRowsToComments(rows = []) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      const text = String(row?.comment || "").trim();
      const reviewerName = String(
        row?.reviewer_name || row?.name || row?.user_name || row?.author_name || ""
      ).trim();
      return {
        id: String(row?.id || ""),
        name: reviewerName || "عميل",
        rating: Number(row?.rating) || 0,
        text,
        createdAt: row?.created_at || new Date().toISOString(),
      };
    })
    .filter((item) => item.id && item.rating > 0 && item.text);
}

async function fetchRatingsFromSupabase(productId) {
  if (!productId || !window.supabaseClient || typeof window.supabaseClient.from !== "function") {
    return { ratings: [], comments: [], average: 0, total: 0 };
  }

  try {
    let { data, error } = await window.supabaseClient
      .from("ratings")
      .select("*")
      .eq("item_id", String(productId))
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("supabase ratings fetch error", error);
      return { ratings: [], comments: [], average: 0, total: 0 };
    }

    const ratingList = Array.isArray(data) ? data : [];
    if (ratingList.length) {
      const hasCommentField = Object.prototype.hasOwnProperty.call(ratingList[0], "comment");
      setRatingsCommentSupport(hasCommentField);
      const hasReviewerNameField = Object.prototype.hasOwnProperty.call(
        ratingList[0],
        "reviewer_name"
      );
      setRatingsReviewerNameSupport(hasReviewerNameField);
    }
    const values = ratingList.map((row) => Number(row.rating) || 0).filter((v) => v > 0);
    const comments = mapRatingsRowsToComments(ratingList);

    if (!values.length) {
      return { ratings: ratingList, comments, average: 0, total: 0 };
    }

    const average = Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
    return { ratings: ratingList, comments, average, total: values.length };
  } catch (error) {
    console.warn("supabase ratings catch", error);
    return { ratings: [], comments: [], average: 0, total: 0 };
  }
}

async function upsertRatingToSupabase(productId, rating, commentText = "", reviewerName = "") {
  const authUserId = await resolveSupabaseAuthUserId();
  const isAuthenticatedWriter = Boolean(authUserId);

  if (!isAuthenticatedWriter && isRatingsUserIdRequired()) {
    return {
      success: false,
      message: RATING_FAILURE_MESSAGE,
    };
  }

  if (!productId) {
    return { success: false, message: RATING_FAILURE_MESSAGE };
  }

  const value = Number(rating) || 0;
  const cleanComment = String(commentText || "").trim();
  const cleanReviewerName = String(reviewerName || "").trim();
  if (value < 1 || value > 5) {
    return { success: false, message: RATING_FAILURE_MESSAGE };
  }

  try {
    let commentSupport = getRatingsCommentSupport();
    let reviewerNameSupport = getRatingsReviewerNameSupport();

    const buildPayload = () => {
      const payload = {
        item_id: String(productId),
        rating: value,
      };
      if (isAuthenticatedWriter) {
        payload.user_id = authUserId;
      }
      if (commentSupport !== false) {
        payload.comment = cleanComment || null;
      }
      if (reviewerNameSupport !== false) {
        payload.reviewer_name = cleanReviewerName || null;
      }
      return payload;
    };

    const writePayload = async (payload) =>
      isAuthenticatedWriter
        ? window.supabaseClient.from("ratings").upsert(payload, { onConflict: ["user_id", "item_id"] })
        : window.supabaseClient.from("ratings").insert(payload);

    let data = null;
    let error = null;

    ({ data, error } = await writePayload(buildPayload()));

    if (!error && commentSupport !== false) {
      setRatingsCommentSupport(true);
    }
    if (!error && reviewerNameSupport !== false) {
      setRatingsReviewerNameSupport(true);
    }

    if (error && isMissingColumnError(error)) {
      const missingColumn = detectMissingRatingsColumn(error);
      let shouldRetry = false;

      if (!missingColumn || missingColumn === "comment") {
        if (commentSupport !== false) {
          setRatingsCommentSupport(false);
          commentSupport = false;
          shouldRetry = true;
        }
      }

      if (!missingColumn || missingColumn === "reviewer_name") {
        if (reviewerNameSupport !== false) {
          setRatingsReviewerNameSupport(false);
          reviewerNameSupport = false;
          shouldRetry = true;
        }
      }

      if (shouldRetry) {
        const fallbackResponse = await writePayload(buildPayload());
        data = fallbackResponse.data;
        error = fallbackResponse.error;
      }
    }

    if (error) {
      console.warn("supabase rating upsert error", error);
      if (String(error.code || "") === "22P02") {
        return { success: false, message: RATING_FAILURE_MESSAGE };
      }
      if (String(error.code || "") === "23502") {
        const message = String(error.message || "").toLowerCase();
        if (message.includes("\"user_id\"")) {
          markRatingsUserIdRequired();
          return {
            success: false,
            message: RATING_FAILURE_MESSAGE,
          };
        }
      }
      if (String(error.code || "") === "42501") {
        return {
          success: false,
          message: RATING_FAILURE_MESSAGE,
        };
      }
      return { success: false, message: RATING_FAILURE_MESSAGE };
    }

    return { success: true, data };
  } catch (error) {
    console.warn("supabase rating upsert catch", error);
    return { success: false, message: RATING_FAILURE_MESSAGE };
  }
}

function synchronizeProductRating(product, comments) {
  if (!product || !product.id || !Array.isArray(comments)) return;

  product.rating = Math.max(0, Math.min(5, Number(product.rating) || 0));
  product.reviewCount = Math.max(0, Math.round(Number(product.reviewCount) || 0));
  product.ratingSource = "ratings";
  product.rating_source = "ratings";
  product.hasSupabaseRatings = true;
  product.reviews = comments;
  product.comments = comments;

  // update BudaStore cache for product cards to pick new ratings
  window._supabaseProductCache = window._supabaseProductCache || {};
  window._supabaseProductCache[String(product.id)] = product;

  // trigger UI update in listing pages
  document.dispatchEvent(new CustomEvent("boda:products-updated", { detail: { productId: product.id } }));
}

async function loadProductFromSupabase(productId) {
  if (!productId || !window.supabaseClient?.from) return null;

  try {
    const lookupId = String(productId).trim();
    if (!lookupId) return null;

    let record = null;
    let response = await window.supabaseClient
      .from("products")
      .select("*")
      .eq("id", lookupId)
      .limit(1);

    if (!response.error && Array.isArray(response.data) && response.data.length) {
      record = response.data[0];
    }

    // Fallback for numeric IDs when DB column type is numeric.
    if (!record && /^\d+$/.test(lookupId)) {
      response = await window.supabaseClient
        .from("products")
        .select("*")
        .eq("id", Number(lookupId))
        .limit(1);

      if (!response.error && Array.isArray(response.data) && response.data.length) {
        record = response.data[0];
      }
    }

    if (!record && typeof window.supabaseClient.fetchAllProducts === "function") {
      const pool = (await window.supabaseClient.fetchAllProducts()) || [];
      record = pool.find((item) => String(item?.id) === lookupId) || null;
    }

    if (!record) return null;
    if (window.addProductToStore) window.addProductToStore(record);
    const normalized = window.BudaStore?.getProductById
      ? window.BudaStore.getProductById(record.id) || null
      : null;
    return normalized ? { ...record, ...normalized } : record;
  } catch (error) {
    console.warn("supabase lookup failed", error);
    return null;
  }
}

function readStoredSelectedProduct(productId) {
  try {
    const stored = sessionStorage.getItem("selectedProduct");
    if (!stored) return null;

    let parsed = null;
    try {
      parsed = JSON.parse(decodeURIComponent(stored));
    } catch {
      parsed = JSON.parse(stored);
    }

    if (!parsed) return null;
    if (productId && String(parsed.id) !== String(productId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistSelectedProduct(product) {
  if (!product) return;

  try {
    sessionStorage.setItem("selectedProduct", encodeURIComponent(JSON.stringify(product)));
  } catch {
    // Ignore storage failures and continue rendering.
  }
}

function setProductLoadingState(isLoading) {
  document.body?.classList.toggle("product-detail-loading", Boolean(isLoading));
}

function renderMissingProductState(message) {
  const page = document.querySelector(".product-page");
  if (!page) return;

  page.querySelectorAll(".section-block").forEach((section) => {
    if (section.id === "product-missing-state") return;
    section.classList.add("hidden");
  });

  const text = String(message || "تعذر تحميل بيانات المنتج الآن.").trim();
  const existing = document.getElementById("product-missing-state");
  if (existing) {
    existing.classList.remove("hidden");
    const empty = existing.querySelector(".comment-empty");
    if (empty) empty.textContent = text;
    return;
  }

  const stateSection = document.createElement("section");
  stateSection.id = "product-missing-state";
  stateSection.className = "section-block";
  stateSection.innerHTML = `<div class="comment-empty">${escapeHtml(text)}</div>`;
  page.appendChild(stateSection);
}

function normalizeResolvedProduct(product) {
  if (!product) return null;
  if (!window.BudaStore?.normalizeProductRecord) return product;
  const normalized = window.BudaStore.normalizeProductRecord(product);
  return normalized ? { ...product, ...normalized } : product;
}

async function getAllProductsPool() {
  const allLocal = window.BudaStore ? Object.values(window.BudaStore.getAllProducts()) : [];
  if (!window.supabaseClient?.fetchAllProducts && !window.supabaseClient?.fetchTaagerProducts) return allLocal;

  try {
    const remote = window.supabaseClient?.fetchTaagerProducts && window.TAAGER_PRODUCTS_FEED_URL
      ? (await window.supabaseClient.fetchTaagerProducts()) || []
      : (await window.supabaseClient.fetchAllProducts()) || [];
    const map = new Map();

    [...allLocal, ...remote].forEach((product) => {
      if (!product || typeof product.id === "undefined" || product.id === null) return;
      map.set(String(product.id), product);
    });

    return [...map.values()];
  } catch {
    return allLocal;
  }
}

function renderGallery(product, images) {
  const mainImageEl = document.querySelector("[data-product-image]");
  const thumbsContainer = document.getElementById("product-thumbs");
  if (!mainImageEl || !thumbsContainer) return;

  const fallback = getFallbackImage();
  const list = images.length ? images : [safeImagePath(product.image)];

  const applyImageSafety = (img, src) => {
    if (!img) return;
    img.loading = "lazy";
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
    img.src = src || fallback;
    img.onerror = () => {
      img.onerror = null;
      img.src = fallback;
    };
  };

  applyImageSafety(mainImageEl, list[0] || fallback);

  thumbsContainer.innerHTML = list
    .map(
      (src, index) => `
      <button type="button" class="product-thumb ${index === 0 ? "active" : ""}" data-thumb-index="${index}">
        <img src="${src}" alt="صورة إضافية للمنتج" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${fallback}'" />
      </button>
    `
    )
    .join("");

  thumbsContainer.querySelectorAll("[data-thumb-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.getAttribute("data-thumb-index"));
      applyImageSafety(mainImageEl, list[index] || list[0] || fallback);
      thumbsContainer.querySelectorAll(".product-thumb").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
    });
  });
}

function renderRatingBlock(product, comments) {
  const starsEl = document.getElementById("product-rating-stars");
  const reviewCountEl = document.getElementById("product-review-count");
  const averageEl = document.getElementById("comments-average");
  const commentsCountEl = document.getElementById("comments-count");

  const fallback = getRatingSnapshot(product);
  const avg = fallback.rating;
  const count = fallback.reviewCount;
  const commentsCount = Array.isArray(comments) ? comments.length : 0;

  if (starsEl) starsEl.innerHTML = formatStars(avg || 0);
  if (reviewCountEl) reviewCountEl.textContent = `${count} تقييم`;
  if (averageEl) averageEl.textContent = avg ? avg.toFixed(1) : "0.0";
  if (commentsCountEl) commentsCountEl.textContent = `${commentsCount} تعليق`;
}

function getProductReviewsUrl(productId) {
  const id = String(productId || "").trim();
  if (!id) return "product-reviews.html";
  return `product-reviews.html?id=${encodeURIComponent(id)}`;
}

function renderViewAllReviewsButton(productId, commentsCount = 0) {
  const wrapper = document.getElementById("view-all-reviews-wrap");
  const link = document.getElementById("view-all-reviews");
  if (!wrapper || !link) return;

  const total = Math.max(0, Number(commentsCount) || 0);
  const shouldShow = total > COMMENTS_PREVIEW_LIMIT && String(productId || "").trim() !== "";
  wrapper.classList.toggle("hidden", !shouldShow);

  if (!shouldShow) return;
  link.setAttribute("href", getProductReviewsUrl(productId));
}

function renderCommentsList(comments, options = {}) {
  const listEl = document.getElementById("comments-list");
  if (!listEl) return;

  const source = Array.isArray(comments) ? comments : [];
  if (!source.length) {
    listEl.innerHTML = '<div class="comment-empty">لا توجد تعليقات بعد. كن أول من يقيّم هذا المنتج.</div>';
    return;
  }

  const limit = Math.max(0, Number(options.limit) || 0);
  const sorted = [...source].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const visible = limit > 0 ? sorted.slice(0, limit) : sorted;

  listEl.innerHTML = visible
    .map((comment) => {
      const date = comment.createdAt
        ? new Date(comment.createdAt).toLocaleDateString("ar-EG")
        : "";

      return `
        <article class="comment-item">
          <div class="comment-head">
            <div>
              <strong class="comment-author">${escapeHtml(comment.name || "عميل")}</strong>
              <div class="rating-stars">${formatStars(comment.rating || 0)}</div>
            </div>
            <span class="comment-date">${date}</span>
          </div>
          <p class="comment-body">${escapeHtml(comment.text || "")}</p>
        </article>
      `;
    })
    .join("");
}

function bindCommentForm(product, comments, onUpdate) {
  const form = document.getElementById("comment-form");
  const nameInput = document.getElementById("comment-name");
  const ratingInput = document.getElementById("comment-rating");
  const textInput = document.getElementById("comment-text");

  if (!form || !nameInput || !ratingInput || !textInput) return;

  const fullName = localStorage.getItem("userFullName") || "";
  if (fullName) nameInput.value = fullName;
  const submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener(
    "invalid",
    () => {
      productNotify("اكمل الحقول المطلوبة", "error");
    },
    true
  );

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const rating = Number(ratingInput.value) || 5;
    const text = textInput.value.trim();

    if (!name || !text) {
      productNotify("اكمل الاسم والتعليق", "error");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.setAttribute("aria-busy", "true");
    }

    productNotify("جاري إرسال التعليق...", "info");

    try {
      const ratingResult = await upsertRatingToSupabase(product.id, rating, text, name);
      if (!ratingResult.success) {
        productNotify(ratingResult.message || RATING_FAILURE_MESSAGE, "error");
        return;
      }

      productNotify(RATING_SUCCESS_MESSAGE, "success");
      textInput.value = "";
      ratingInput.value = "5";

      const serverRatings = await fetchRatingsFromSupabase(product.id);
      product.rating = serverRatings.average;
      product.reviewCount = serverRatings.total;
      product.ratingSource = "ratings";
      product.rating_source = "ratings";
      product.hasSupabaseRatings = true;

      comments.splice(0, comments.length, ...(serverRatings.comments || []));
      synchronizeProductRating(product, comments);
      onUpdate();
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.removeAttribute("aria-busy");
      }
    }
  });
}

function renderProductBasics(product) {
  const titleEl = document.querySelector("[data-product-title]");
  const priceEl = document.querySelector("[data-product-price]");
  const originalEl = document.querySelector("[data-product-original]");
  const discountEl = document.querySelector("[data-product-discount]");
  const descriptionEl = document.querySelector("[data-product-description]");
  const categoryEl = document.getElementById("product-category");

  if (titleEl) titleEl.textContent = product.name || "منتج";
  if (descriptionEl) {
    descriptionEl.textContent = product.description || "لا يوجد وصف متاح لهذا المنتج.";
  }
  if (categoryEl) categoryEl.style.display = "none";

  const { currentPrice, originalPrice } = normalizePrice(product);

  if (priceEl) priceEl.textContent = detailMoneyFormatter.format(currentPrice);

  if (originalEl) {
    originalEl.textContent = originalPrice ? detailMoneyFormatter.format(originalPrice) : "";
    originalEl.style.display = originalPrice && originalPrice > currentPrice ? "inline" : "none";
  }

  if (discountEl) {
    const hasDiscount = originalPrice && originalPrice > currentPrice;
    if (hasDiscount) {
      const percent = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
      discountEl.textContent = `خصم ${percent}%`;
      discountEl.style.display = "inline-flex";
    } else {
      discountEl.style.display = "none";
    }
  }
}

function setWishlistIconState(button, isActive) {
  if (!button) return;

  const icon = button.querySelector(".material-icons-outlined");
  button.classList.toggle("is-active", Boolean(isActive));
  button.setAttribute("aria-pressed", isActive ? "true" : "false");
  if (icon) icon.textContent = isActive ? "favorite" : "favorite_border";
}

function setPrimaryWishlistState(button, isActive) {
  if (!button) return;

  button.classList.toggle("is-active", Boolean(isActive));
  button.setAttribute("aria-pressed", isActive ? "true" : "false");
  button.innerHTML = `
    <span class="material-icons-outlined" style="font-size:16px;vertical-align:middle;">${
      isActive ? "favorite" : "favorite_border"
    }</span> ${isActive ? "في المفضلة" : "أضف للمفضلة"}
  `;
}

function syncSimilarWishlistButtons(container) {
  if (!container) return;

  container.querySelectorAll("[data-similar-wishlist]").forEach((button) => {
    const productId = button.getAttribute("data-similar-wishlist");
    const state = window.BudaStore?.isInWishlist ? window.BudaStore.isInWishlist(productId) : false;
    setWishlistIconState(button, state);
  });
}

function renderSimilarProducts(currentProduct, allProducts) {
  const container = document.getElementById("similar-products");
  if (!container) return;

  const currentId = String(currentProduct.id);
  const currentCategory = String(currentProduct.category || "").toLowerCase();

  let similar = allProducts.filter((item) => {
    if (!item || String(item.id) === currentId) return false;
    return String(item.category || "").toLowerCase() === currentCategory;
  });

  if (!similar.length) {
    similar = allProducts.filter((item) => item && String(item.id) !== currentId);
  }

  const products = similar.slice(0, 8);
  const productsMap = new Map(products.map((product) => [String(product.id), product]));

  if (!products.length) {
    container.innerHTML = '<div class="comment-empty">لا توجد منتجات مشابهة متاحة الآن.</div>';
    return;
  }

  const fallback = getFallbackImage();

  container.innerHTML = products
    .map((product) => {
      const { currentPrice, originalPrice } = normalizePrice(product);
      const hasDiscount = originalPrice > currentPrice;
      const discountPercent = hasDiscount
        ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
        : 0;
      const ratingInfo = getRatingSnapshot(product);
      const rating = ratingInfo.rating;
      const reviewCount = ratingInfo.reviewCount;
      const images = normalizeImages(product);
      const imagePath = images[0] || fallback;
      const productId = String(product.id);
      const isWishlisted = window.BudaStore?.isInWishlist
        ? window.BudaStore.isInWishlist(productId)
        : false;

      return `
        <article class="noon-product-card">
          <div class="noon-product-media-wrap">
            <button class="icon-btn noon-wishlist-btn ${isWishlisted ? "is-active" : ""}" data-similar-wishlist="${productId}" aria-label="إضافة إلى المفضلة" aria-pressed="${isWishlisted ? "true" : "false"}">
              <span class="material-icons-outlined" style="font-size:18px;">${
                isWishlisted ? "favorite" : "favorite_border"
              }</span>
            </button>
            <button class="noon-product-media" type="button" data-similar-view="${productId}">
              <img src="${imagePath}" alt="${escapeHtml(product.name)}" onerror="this.onerror=null;this.src='${fallback}'" />
            </button>
            <button class="noon-add-square" type="button" data-similar-add="${productId}" aria-label="إضافة إلى السلة">+</button>
          </div>
          <div class="noon-product-body">
            ${
              reviewCount > 0
                ? `<div class="noon-rating-pill"><span>${rating.toFixed(1)}</span> <span class="noon-rating-stars">${formatStars(
                    rating
                  )}</span> <span>(${reviewCount})</span></div>`
                : ""
            }
            <h3 class="noon-title">${escapeHtml(product.name)}</h3>
            <div class="noon-price-line">
              <p class="noon-price">${detailMoneyFormatter.format(currentPrice)}</p>
              ${hasDiscount ? `<p class="noon-old-price">${detailMoneyFormatter.format(originalPrice)}</p>` : ""}
              ${hasDiscount ? `<span class="noon-discount-pill">${discountPercent}% خصم</span>` : ""}
            </div>
            <button class="btn-secondary noon-card-cta" type="button" data-similar-view="${productId}">
              <span class="material-icons-outlined" style="font-size:16px;vertical-align:middle;">shopping_bag</span> اشتري الآن
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  container.querySelectorAll("[data-similar-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.getAttribute("data-similar-view");
      const selected = productsMap.get(String(productId));
      if (selected) {
        try {
          sessionStorage.setItem("selectedProduct", encodeURIComponent(JSON.stringify(selected)));
        } catch {
          // Ignore storage failures and continue navigation.
        }
      }
      window.location.href = `product.html?id=${encodeURIComponent(productId)}`;
    });
  });

  container.querySelectorAll("[data-similar-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.getAttribute("data-similar-add");
      const product = productsMap.get(String(productId)) || window.BudaStore.getProductById(productId);
      if (!product) return;

      window.BudaStore.addToCart(product, 1);
      window.BudaStore.updateCartCount();
      window.BudaUI?.refreshShell();
    });
  });

  container.querySelectorAll("[data-similar-wishlist]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.getAttribute("data-similar-wishlist");
      if (!productId) return;

      const state = window.BudaStore.toggleWishlist(productId);
      setWishlistIconState(button, state);
      productNotify(state ? "تمت الإضافة إلى المفضلة." : "تمت الإزالة من المفضلة.", "info");
    });
  });

  syncSimilarWishlistButtons(container);
}

function bindPrimaryActions(product) {
  const addToCartButton = document.getElementById("add-to-cart");
  if (addToCartButton) {
    addToCartButton.addEventListener("click", () => {
      window.BudaStore.addToCart(product, 1);
      window.BudaStore.updateCartCount();
      window.BudaUI?.refreshShell();
    });
  }

  const wishlistButton = document.getElementById("wishlist-toggle");
  if (wishlistButton) {
    const syncPrimaryState = () => {
      const state = window.BudaStore?.isInWishlist
        ? window.BudaStore.isInWishlist(product.id)
        : false;
      setPrimaryWishlistState(wishlistButton, state);
    };

    syncPrimaryState();

    wishlistButton.addEventListener("click", () => {
      const state = window.BudaStore.toggleWishlist(product.id);
      setPrimaryWishlistState(wishlistButton, state);
      productNotify(state ? "تمت الإضافة إلى المفضلة." : "تمت الإزالة من المفضلة.", "info");
    });

    document.addEventListener("boda:wishlist-updated", syncPrimaryState);
  }
}

async function resolveCurrentProduct() {
  const productId = getQueryParam("id");
  const localProduct = productId ? window.BudaStore.getProductById(productId) : null;
  const storedProduct = readStoredSelectedProduct(productId);

  let product = localProduct && storedProduct
    ? { ...localProduct, ...storedProduct }
    : localProduct || storedProduct || null;

  const imageCount = product ? normalizeGalleryImages(product).length : 0;
  const needsHydration = Boolean(productId) && (!product || imageCount <= 1);

  if (needsHydration) {
    const remoteProduct = await loadProductFromSupabase(productId);
    if (remoteProduct) {
      product = product ? { ...product, ...remoteProduct } : remoteProduct;
    }
  }

  if (!product && !productId) {
    product = Object.values(window.BudaStore.getAllProducts())[0] || null;
  }

  const normalized = normalizeResolvedProduct(product);
  persistSelectedProduct(normalized);
  return normalized;
}

async function renderProductDetail() {
  setProductLoadingState(true);

  try {
    if (!window.BudaStore) {
      renderMissingProductState("تعذر تحميل بيانات المنتج الآن. حاول مرة أخرى.");
      productNotify("تعذر تحميل بيانات المنتج الآن. حاول مرة أخرى.", "error");
      return;
    }

    const product = await resolveCurrentProduct();
    if (!product) {
      renderMissingProductState("تعذر العثور على المنتج المطلوب.");
      productNotify("تعذر العثور على المنتج المطلوب.", "error");
      return;
    }

    const serverRatings = await fetchRatingsFromSupabase(product.id);
    product.rating = serverRatings.average;
    product.reviewCount = serverRatings.total;
    product.ratingSource = "ratings";
    product.rating_source = "ratings";
    product.hasSupabaseRatings = true;

    renderProductBasics(product);
    renderGallery(product, normalizeGalleryImages(product));
    bindPrimaryActions(product);

    const comments = Array.isArray(serverRatings.comments) ? [...serverRatings.comments] : [];
    const refreshComments = () => {
      renderCommentsList(comments, { limit: COMMENTS_PREVIEW_LIMIT });
      renderViewAllReviewsButton(product.id, comments.length);
      renderRatingBlock(product, comments);
      synchronizeProductRating(product, comments);
    };

    refreshComments();
    bindCommentForm(product, comments, refreshComments);

    const pool = await getAllProductsPool();
    renderSimilarProducts(product, pool);

    document.addEventListener("boda:wishlist-updated", () => {
      const container = document.getElementById("similar-products");
      syncSimilarWishlistButtons(container);
    });
  } catch (error) {
    console.error("render product detail failed", error);
    renderMissingProductState("تعذر تحميل بيانات المنتج الآن. حاول مرة أخرى.");
    productNotify("تعذر تحميل بيانات المنتج الآن. حاول مرة أخرى.", "error");
  } finally {
    setProductLoadingState(false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderProductDetail();
  const backButton = document.getElementById("back-button");
  backButton?.addEventListener("click", () => window.history.back());
});
