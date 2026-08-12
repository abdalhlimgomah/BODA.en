const reviewsMoneyFormatter = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const REVIEW_TITLE_MARKER = "__buda_title__:";
const REVIEW_MAX_IMAGES = 3;
const REVIEW_ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const reviewPageState = {
  product: null,
  order: null,
  primaryItem: null,
  rating: 0,
  submitting: false,
  images: [],
  uploadingImages: false,
};

const getQueryParam = (key) => new URLSearchParams(window.location.search).get(key);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeProductId(value) {
  const id = String(value || "").trim();
  if (!id || id === "order_fallback_item" || /^unknown(_\d+)?$/i.test(id)) return "";
  return id;
}

function safeImagePath(path) {
  const fallback = window.BudaStore?.DEFAULT_PRODUCT_IMAGE || "assets/images/unnamed.png";
  const value = window.BudaStore?.getImagePath ? window.BudaStore.getImagePath(path) : path || fallback;
  if (/^\s*javascript:/i.test(String(value || ""))) {
    return window.BudaStore?.getImagePath ? window.BudaStore.getImagePath(fallback) : fallback;
  }
  return value;
}

function getFallbackImage() {
  return safeImagePath(window.BudaStore?.DEFAULT_PRODUCT_IMAGE || "assets/images/unnamed.png");
}

function reviewsNotify(message, type = "info") {
  const text = String(message || "").trim();
  if (!text) return;

  if (window.BudaUI?.notify) {
    try {
      window.BudaUI.notify(text, { type, target: "#reviews-status" });
      return;
    } catch {
      // fallback to inline status
    }
  }

  const status = document.getElementById("reviews-status");
  if (!status) return;
  status.textContent = text;
  status.classList.remove("hidden", "error", "success", "info");
  status.classList.add("status-note", type === "error" ? "error" : type === "success" ? "success" : "info");
}

function normalizeImages(product) {
  const list = window.BudaStore?.getProductImages
    ? window.BudaStore.getProductImages(product)
    : [product?.image || "assets/images/unnamed.png"];
  return list.map((item) => safeImagePath(item)).filter(Boolean);
}

function normalizePrice(product) {
  if (window.BudaStore?.resolveProductPrice) {
    return window.BudaStore.resolveProductPrice(product);
  }
  const value = Number(product?.price) || 0;
  return { currentPrice: value, originalPrice: value };
}

function readStoredSelectedProduct(productId) {
  try {
    const raw = sessionStorage.getItem("selectedProduct");
    if (!raw) return null;

    let parsed = null;
    try {
      parsed = JSON.parse(decodeURIComponent(raw));
    } catch {
      parsed = JSON.parse(raw);
    }

    if (!parsed || typeof parsed !== "object") return null;
    if (productId && String(parsed.id || "").trim() !== String(productId).trim()) return null;
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
    // ignore storage failures
  }
}

function resolveOrderProductId(order, primaryItem) {
  const candidates = [
    primaryItem?.product_id,
    primaryItem?.id,
    order?.product_id,
    order?.productId,
    order?.item_id,
    order?.itemId,
  ];

  for (const candidate of candidates) {
    const id = normalizeProductId(candidate);
    if (id) return id;
  }
  return "";
}

async function resolveOrderContext() {
  const orderId = String(getQueryParam("order") || "").trim();
  if (!orderId || !window.BudaOrders?.fetchOrderWithItems) {
    return { order: null, primaryItem: null, productId: "" };
  }

  try {
    const order = await window.BudaOrders.fetchOrderWithItems(orderId);
    if (!order) return { order: null, primaryItem: null, productId: "" };
    const primaryItem = window.BudaOrders.pickPrimaryOrderItem(order);
    return { order, primaryItem, productId: resolveOrderProductId(order, primaryItem) };
  } catch (error) {
    console.warn("resolve order context failed", error);
    return { order: null, primaryItem: null, productId: "" };
  }
}

async function loadProductFromSupabase(productId) {
  if (!productId || !window.supabaseClient?.from) return null;

  try {
    let response = await window.supabaseClient.from("products").select("*").eq("id", String(productId)).limit(1);
    if (!response.error && Array.isArray(response.data) && response.data.length) {
      return response.data[0];
    }

    if (/^\d+$/.test(String(productId))) {
      response = await window.supabaseClient.from("products").select("*").eq("id", Number(productId)).limit(1);
      if (!response.error && Array.isArray(response.data) && response.data.length) {
        return response.data[0];
      }
    }

    if (typeof window.supabaseClient.fetchTaagerProducts === "function" && window.TAAGER_PRODUCTS_FEED_URL) {
      const all = (await window.supabaseClient.fetchTaagerProducts()) || [];
      return all.find((item) => String(item?.id || "").trim() === String(productId).trim()) || null;
    }

    if (typeof window.supabaseClient.fetchAllProducts === "function") {
      const all = (await window.supabaseClient.fetchAllProducts()) || [];
      return all.find((item) => String(item?.id || "").trim() === String(productId).trim()) || null;
    }
  } catch (error) {
    console.warn("load product from supabase failed", error);
  }

  return null;
}

function createFallbackProduct(primaryItem, fallbackId = "") {
  if (!primaryItem) return null;
  const id = normalizeProductId(fallbackId || primaryItem.product_id || primaryItem.id);
  if (!id) return null;

  return {
    id,
    name: primaryItem.name || "منتج",
    image: primaryItem.image || getFallbackImage(),
    price: Number(primaryItem.price) || 0,
    description: "",
    brand: primaryItem.brand || "",
  };
}

async function resolveCurrentProduct(orderContext) {
  const queryProductId = normalizeProductId(getQueryParam("id"));
  const orderProductId = normalizeProductId(orderContext?.productId);
  const targetId = queryProductId || orderProductId;

  const localProduct = targetId ? window.BudaStore?.getProductById?.(targetId) || null : null;
  const storedProduct = readStoredSelectedProduct(targetId);

  let product = localProduct && storedProduct
    ? { ...localProduct, ...storedProduct }
    : localProduct || storedProduct || null;

  if (!product && targetId) {
    const remoteProduct = await loadProductFromSupabase(targetId);
    if (remoteProduct) product = remoteProduct;
  }

  if (!product) {
    product = createFallbackProduct(orderContext?.primaryItem, targetId);
  }

  if (!product) return null;

  persistSelectedProduct(product);
  return product;
}

function parseStoredComment(commentText) {
  const value = String(commentText || "").trim();
  if (!value.startsWith(REVIEW_TITLE_MARKER)) {
    return { title: "", body: value };
  }

  const payload = value.slice(REVIEW_TITLE_MARKER.length);
  const lines = payload.split(/\r?\n/g);
  const title = String(lines.shift() || "").trim();
  const body = lines.join("\n").trim();
  return { title, body };
}

function buildStoredComment(title, body) {
  const cleanTitle = String(title || "").trim();
  const cleanBody = String(body || "").trim();
  if (!cleanTitle) return cleanBody;
  return `${REVIEW_TITLE_MARKER}${cleanTitle}\n${cleanBody}`;
}

function mapRatingsRows(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((row, index) => {
      const parsedComment = parseStoredComment(row?.comment);
      return {
        id: String(row?.id || `review-${index}`),
        rating: Number(row?.rating) || 0,
        name: String(row?.reviewer_name || row?.name || row?.user_name || row?.author_name || "عميل").trim() || "عميل",
        title: parsedComment.title,
        text: parsedComment.body,
        images: Array.isArray(row?.images) ? row.images.filter(Boolean) : [],
        createdAt: row?.created_at || new Date().toISOString(),
      };
    })
    .filter((item) => item.rating > 0);
}

async function fetchRatings(productId) {
  if (!productId || !window.supabaseClient?.from) {
    return { average: 0, total: 0, comments: [] };
  }

  try {
    const { data, error } = await window.supabaseClient
      .from("ratings")
      .select("*")
      .eq("item_id", String(productId))
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("supabase ratings fetch error", error);
      return { average: 0, total: 0, comments: [] };
    }

    const rows = mapRatingsRows(data || []);
    const values = rows.map((item) => item.rating).filter((value) => value > 0);
    const comments = rows.filter((item) => String(item.title || item.text || "").trim() !== "");
    const average = values.length
      ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1))
      : 0;

    return { average, total: values.length, comments };
  } catch (error) {
    console.warn("supabase ratings catch", error);
    return { average: 0, total: 0, comments: [] };
  }
}

function renderStars(value) {
  if (window.BudaStore?.renderProductStars) {
    return window.BudaStore.renderProductStars(value);
  }

  const rating = Math.max(0, Math.min(5, Number(value) || 0));
  const full = Math.floor(rating);
  const empty = 5 - full;
  return `${'<span class="material-icons-outlined">star</span>'.repeat(full)}${'<span class="material-icons-outlined">star_border</span>'.repeat(empty)}`;
}

function renderPageHeader(product) {
  const backLink = document.getElementById("review-back-link");
  if (backLink) {
    const id = normalizeProductId(product?.id);
    backLink.href = id ? `product.html?id=${encodeURIComponent(id)}` : "product.html";
  }

  const subtitle = document.getElementById("review-page-product-name");
  if (subtitle) {
    subtitle.textContent = product?.name ? `آراء المستخدمين حول: ${product.name}` : "شاهد آراء المستخدمين قبل الشراء.";
  }
}

function renderProductCard(product, order, primaryItem, stats) {
  const card = document.getElementById("review-target-card");
  if (!card || !product) return;

  const image = normalizeImages(product)[0] || safeImagePath(primaryItem?.image) || getFallbackImage();
  const fallback = getFallbackImage();
  const { currentPrice } = normalizePrice(product);

  let orderStatusLine = "المنتج متاح الآن";
  if (order && window.BudaOrders) {
    const status = window.BudaOrders.statusMeta(order.status || order.order_status);
    const orderDate = window.BudaOrders.formatOrderDate(window.BudaOrders.getOrderTime(order));
    orderStatusLine = `${status.label} • ${orderDate}`;
  }

  const avgText = stats?.total
    ? `متوسط ${Number(stats.average || 0).toFixed(1)} من 5 (${stats.total} تقييم)`
    : "لا توجد تقييمات رقمية حتى الآن";

  card.innerHTML = `
    <div class="review-target-copy">
      ${product.brand || primaryItem?.brand ? `<p class="review-target-brand">${escapeHtml(product.brand || primaryItem.brand)}</p>` : ""}
      <h2 class="review-target-name">${escapeHtml(product.name || primaryItem?.name || "منتج")}</h2>
      ${product.description ? `<p class="review-target-description">${escapeHtml(String(product.description).slice(0, 160))}</p>` : ""}
      <p class="review-target-meta">${escapeHtml(orderStatusLine)}</p>
      <p class="review-target-meta">${escapeHtml(reviewsMoneyFormatter.format(currentPrice))} • ${escapeHtml(avgText)}</p>
    </div>
    <div class="review-target-image">
      <img src="${image}" alt="${escapeHtml(product.name || "منتج")}" onerror="this.onerror=null;this.src='${fallback}'" />
    </div>
  `;
}

function renderSummary(stats) {
  const commentsCountEl = document.getElementById("comments-count");
  const averageEl = document.getElementById("comments-average");

  const commentsCount = Array.isArray(stats?.comments) ? stats.comments.length : 0;
  const average = Number(stats?.average) || 0;

  if (commentsCountEl) commentsCountEl.textContent = `${commentsCount} تعليق`;
  if (averageEl) averageEl.textContent = average ? average.toFixed(1) : "0.0";
}

function renderCommentsList(comments = []) {
  const listEl = document.getElementById("comments-list");
  if (!listEl) return;

  const rows = Array.isArray(comments) ? comments : [];
  if (!rows.length) {
    listEl.innerHTML = '<div class="comment-empty">لا توجد تعليقات لهذا المنتج حتى الآن.</div>';
    return;
  }

  listEl.innerHTML = rows
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((comment) => {
      const commentDate = comment.createdAt ? new Date(comment.createdAt).toLocaleDateString("ar-EG") : "";
      const titleHtml = comment.title ? `<p class="comment-title">${escapeHtml(comment.title)}</p>` : "";
      const imagesHtml =
        Array.isArray(comment.images) && comment.images.length
          ? `<div class="comment-images">${comment.images
              .map(
                (image) =>
                  `<div class="comment-image-item"><img src="${image}" alt="صورة من التقييم" loading="lazy" onerror="this.closest('.comment-image-item').style.display='none'" /></div>`
              )
              .join("")}</div>`
          : "";
      return `
        <article class="comment-item">
          <div class="comment-head">
            <div>
              <strong class="comment-author">${escapeHtml(comment.name || "عميل")}</strong>
              <div class="rating-stars">${renderStars(comment.rating || 0)}</div>
            </div>
            <span class="comment-date">${commentDate}</span>
          </div>
          ${titleHtml}
          <p class="comment-body">${escapeHtml(comment.text || "")}</p>
          ${imagesHtml}
        </article>
      `;
    })
    .join("");
}

function syncProductRatingCache(product, stats) {
  if (!product || !product.id || !stats) return;
  product.rating = Number(stats.average) || 0;
  product.reviewCount = Math.max(0, Number(stats.total) || 0);
  product.ratingSource = "ratings";
  product.rating_source = "ratings";
  product.hasSupabaseRatings = true;

  window._supabaseProductCache = window._supabaseProductCache || {};
  window._supabaseProductCache[String(product.id)] = product;
  document.dispatchEvent(new CustomEvent("boda:products-updated", { detail: { productId: product.id } }));
}

function shouldAllowCompose(order) {
  if (!order || !window.BudaOrders) return false;
  const statusMeta = window.BudaOrders.statusMeta(order.status || order.order_status);
  return statusMeta.key === "delivered";
}

function getCurrentPublicName() {
  const direct = [
    localStorage.getItem("userFullName"),
    localStorage.getItem("userName"),
    localStorage.getItem("username"),
  ]
    .map((value) => String(value || "").trim())
    .find(Boolean);

  const rawName = direct || String(localStorage.getItem("userEmail") || "").split("@")[0].replace(/[._-]+/g, " ").trim();
  if (!rawName) return "عميل BudoQ";
  const parts = rawName.replace(/\s+/g, " ").split(" ").filter(Boolean);
  if (parts.length <= 1) return rawName;
  return `${parts[0]} ${parts[1].charAt(0)}.`;
}

function isAnonymousReview() {
  return Boolean(document.getElementById("review-anonymous")?.checked);
}

function updatePublishNote() {
  const note = document.getElementById("review-publish-note");
  if (!note) return;
  note.textContent = isAnonymousReview()
    ? "سيتم نشر التقييم كمجهول."
    : `سيتم النشر باسم ${getCurrentPublicName()}.`;
}

function updateSubmitButtonState() {
  const submitButton = document.getElementById("review-submit-btn");
  if (!submitButton) return;

  const title = String(document.getElementById("review-title")?.value || "").trim();
  const body = String(document.getElementById("review-body")?.value || "").trim();
  const canSubmit =
    reviewPageState.rating >= 1 &&
    title.length >= 3 &&
    body.length >= 10 &&
    !reviewPageState.submitting &&
    !reviewPageState.uploadingImages;
  submitButton.disabled = !canSubmit;
}

function setSelectedRating(value) {
  reviewPageState.rating = Math.max(0, Math.min(5, Number(value) || 0));

  document.querySelectorAll(".review-star-btn").forEach((button) => {
    const starValue = Number(button.getAttribute("data-star-value")) || 0;
    const active = starValue <= reviewPageState.rating;
    button.classList.toggle("is-active", active);
    const icon = button.querySelector(".material-icons-outlined");
    if (icon) icon.textContent = active ? "star" : "star_border";
  });

  const hint = document.getElementById("review-rating-hint");
  if (hint) {
    hint.textContent = reviewPageState.rating ? `تم اختيار ${reviewPageState.rating} من 5` : "اختر عدد النجوم";
  }

  updateSubmitButtonState();
}

function cleanPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

async function resolveSupabaseUserId() {
  try {
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
    const candidates = [currentUser?.auth_user_id, currentUser?.supabase_user_id, currentUser?.id];
    const valid = candidates.find((value) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || "").trim())
    );
    if (valid) return String(valid).trim();
  } catch {
    // ignore parse errors
  }

  if (window.supabaseClient?.raw) {
    try {
      const rawClient = window.supabaseClient.raw();
      if (rawClient?.auth) {
        const { data } = await rawClient.auth.getUser();
        if (data?.user?.id) return String(data.user.id).trim();
      }
    } catch {
      // ignore auth read failures
    }
  }

  return "";
}

async function submitRating(productId, rating, title, body, reviewerName, images) {
  const userId = await resolveSupabaseUserId();

  const basePayload = cleanPayload({
    item_id: String(productId),
    rating: Number(rating),
    comment: buildStoredComment(title, body),
    reviewer_name: String(reviewerName || "").trim(),
    user_id: userId || undefined,
    images: Array.isArray(images) && images.length ? images : undefined,
  });

  const attempts = [basePayload];
  if (basePayload.reviewer_name) attempts.push(cleanPayload({ ...basePayload, reviewer_name: undefined }));
  if (basePayload.comment) attempts.push(cleanPayload({ ...basePayload, comment: undefined }));
  if (basePayload.user_id) attempts.push(cleanPayload({ ...basePayload, user_id: undefined }));
  if (basePayload.user_id && basePayload.reviewer_name) {
    attempts.push(cleanPayload({ ...basePayload, user_id: undefined, reviewer_name: undefined }));
  }
  if (basePayload.user_id && basePayload.comment) {
    attempts.push(cleanPayload({ ...basePayload, user_id: undefined, comment: undefined }));
  }
  if (basePayload.reviewer_name && basePayload.comment) {
    attempts.push(cleanPayload({ ...basePayload, reviewer_name: undefined, comment: undefined }));
  }
  if (basePayload.user_id && basePayload.reviewer_name && basePayload.comment) {
    attempts.push(cleanPayload({ ...basePayload, user_id: undefined, reviewer_name: undefined, comment: undefined }));
  }

  const seen = new Set();
  for (const payload of attempts) {
    const key = JSON.stringify(payload);
    if (seen.has(key)) continue;
    seen.add(key);

    const request = payload.user_id
      ? window.supabaseClient.from("ratings").upsert(payload, { onConflict: ["user_id", "item_id"] })
      : window.supabaseClient.from("ratings").insert(payload);

    const { error } = await request;
    if (!error) return { success: true };
  }

  return { success: false, message: "تعذر إرسال التقييم الآن. حاول مرة أخرى." };
}

function getReviewImageElements() {
  return {
    upload: document.getElementById("review-image-upload"),
    input: document.getElementById("review-image-input"),
    previews: document.getElementById("review-image-previews"),
    error: document.getElementById("review-image-error"),
  };
}

function showReviewImageError(message) {
  const { error } = getReviewImageElements();
  if (!error) return;
  error.textContent = message || "";
  error.classList.toggle("hidden", !message);
}

function renderReviewImagePreviews() {
  const { previews, upload } = getReviewImageElements();
  if (!previews) return;

  previews.innerHTML = reviewPageState.images
    .map(
      (image) => `
      <div class="review-image-preview">
        <img src="${image.objectUrl}" alt="صورة التقييم" />
        <button type="button" class="review-image-preview-remove" data-image-id="${escapeHtml(image.id)}" aria-label="حذف الصورة">
          <span class="material-icons-outlined">close</span>
        </button>
      </div>
    `
    )
    .join("");

  if (upload) {
    upload.classList.toggle("hidden", reviewPageState.images.length >= REVIEW_MAX_IMAGES);
  }
  updateSubmitButtonState();
}

function addReviewImageFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  const remaining = REVIEW_MAX_IMAGES - reviewPageState.images.length;
  const accepted = [];
  let rejectedType = false;

  for (const file of files) {
    if (!REVIEW_ALLOWED_IMAGE_TYPES.includes(file.type)) {
      rejectedType = true;
      continue;
    }
    accepted.push(file);
  }

  if (rejectedType) {
    showReviewImageError("صيغة الصورة غير مدعومة. JPG/PNG/WebP فقط.");
  } else {
    showReviewImageError("");
  }

  if (!accepted.length) return;

  const toAdd = accepted.slice(0, remaining);
  toAdd.forEach((file) => {
    reviewPageState.images.push({
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      objectUrl: URL.createObjectURL(file),
      status: "pending",
    });
  });

  if (accepted.length > remaining) {
    showReviewImageError(`الحد الأقصى ${REVIEW_MAX_IMAGES} صور فقط.`);
  }

  renderReviewImagePreviews();
}

function removeReviewImage(imageId) {
  const index = reviewPageState.images.findIndex((image) => image.id === imageId);
  if (index === -1) return;
  const [removed] = reviewPageState.images.splice(index, 1);
  if (removed?.objectUrl) {
    try {
      URL.revokeObjectURL(removed.objectUrl);
    } catch {
      // ignore revoke failures
    }
  }
  showReviewImageError("");
  renderReviewImagePreviews();
}

let reviewImageSectionBound = false;

function bindImageUploadSection() {
  const { upload, input } = getReviewImageElements();
  if (!upload || !input || reviewImageSectionBound) return;
  reviewImageSectionBound = true;

  const blockIfFull = (event) => {
    if (reviewPageState.uploadingImages) {
      if (event && event.cancelable) event.preventDefault();
      return;
    }
    if (reviewPageState.images.length >= REVIEW_MAX_IMAGES) {
      if (event && event.cancelable) event.preventDefault();
      showReviewImageError(`الحد الأقصى ${REVIEW_MAX_IMAGES} صور فقط.`);
    }
  };

  upload.addEventListener("click", blockIfFull);
  upload.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      blockIfFull(event);
      input.click();
    }
  });

  input.addEventListener("change", () => {
    addReviewImageFiles(input.files);
    input.value = "";
  });

  document.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".review-image-preview-remove");
    if (removeButton) {
      removeReviewImage(removeButton.getAttribute("data-image-id"));
    }
  });
}

async function uploadReviewImages(productId) {
  const pending = reviewPageState.images.filter((image) => image.status !== "uploaded");
  if (!pending.length) return [];

  const rawClient = window.supabaseClient?.raw ? window.supabaseClient.raw() : null;
  if (!rawClient?.storage) {
    showReviewImageError("تعذر الاتصال بخادم الصور.");
    return [];
  }

  const uploadedUrls = [];
  for (const image of pending) {
    image.status = "uploading";
    renderReviewImagePreviews();

    const extMatch = String(image.file.name || "").split(".").pop();
    const ext = extMatch && extMatch.length <= 5 ? extMatch.toLowerCase() : "jpg";
    const path = `reviews/${String(productId)}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    try {
      const { error } = await rawClient.storage.from("review-images").upload(path, image.file, {
        contentType: image.file.type,
        upsert: false,
      });
      if (error) {
        console.warn("review image upload failed", error);
        image.status = "error";
        showReviewImageError("تعذر رفع إحدى الصور. حاول مرة أخرى.");
        continue;
      }
      const { data: publicData } = rawClient.storage.from("review-images").getPublicUrl(path);
      image.status = "uploaded";
      image.url = publicData?.publicUrl || `${window.SUPABASE_URL}/storage/v1/object/public/review-images/${path}`;
      uploadedUrls.push(image.url);
    } catch (uploadError) {
      console.warn("review image upload exception", uploadError);
      image.status = "error";
      showReviewImageError("تعذر رفع إحدى الصور. حاول مرة أخرى.");
    }
  }

  renderReviewImagePreviews();
  return uploadedUrls;
}

function bindComposeForm() {
  const form = document.getElementById("review-form");
  const titleInput = document.getElementById("review-title");
  const bodyInput = document.getElementById("review-body");
  const titleCount = document.getElementById("review-title-count");
  const bodyCount = document.getElementById("review-body-count");
  const anonymousInput = document.getElementById("review-anonymous");

  if (!form || !titleInput || !bodyInput) return;

  bindImageUploadSection();

  document.querySelectorAll(".review-star-btn").forEach((button) => {    button.addEventListener("click", () => setSelectedRating(button.getAttribute("data-star-value")));
  });
  setSelectedRating(0);

  const refreshCounters = () => {
    if (titleCount) titleCount.textContent = String(titleInput.value.length);
    if (bodyCount) bodyCount.textContent = String(bodyInput.value.length);
    updateSubmitButtonState();
  };

  titleInput.addEventListener("input", refreshCounters);
  bodyInput.addEventListener("input", refreshCounters);
  anonymousInput?.addEventListener("change", () => {
    updatePublishNote();
    updateSubmitButtonState();
  });

  refreshCounters();
  updatePublishNote();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const productId = normalizeProductId(reviewPageState.product?.id);
    const title = String(titleInput.value || "").trim();
    const body = String(bodyInput.value || "").trim();

    if (!productId) {
      reviewsNotify("تعذر تحديد المنتج.", "error");
      return;
    }
    if (reviewPageState.rating < 1) {
      reviewsNotify("اختر عدد النجوم أولًا.", "error");
      return;
    }
    if (title.length < 3) {
      reviewsNotify("اكتب عنوانًا للتقييم (3 أحرف على الأقل).", "error");
      return;
    }
    if (body.length < 10) {
      reviewsNotify("اكتب تفاصيل التقييم (10 أحرف على الأقل).", "error");
      return;
    }

    reviewPageState.submitting = true;
    reviewPageState.uploadingImages = reviewPageState.images.some((image) => image.status !== "uploaded");
    updateSubmitButtonState();

    if (reviewPageState.images.length) {
      reviewsNotify("جاري رفع الصور...", "info");
    } else {
      reviewsNotify("جاري إرسال التقييم...", "info");
    }

    try {
      const uploadedImages = await uploadReviewImages(productId);
      if (reviewPageState.images.some((image) => image.status === "error")) {
        return;
      }

      const reviewerName = isAnonymousReview() ? "مجهول" : getCurrentPublicName();
      const result = await submitRating(productId, reviewPageState.rating, title, body, reviewerName, uploadedImages);

      if (!result.success) {
        reviewsNotify(result.message || "تعذر إرسال التقييم.", "error");
        return;
      }

      reviewsNotify("تم إرسال التقييم بنجاح.", "success");
      titleInput.value = "";
      bodyInput.value = "";
      setSelectedRating(0);
      refreshCounters();

      reviewPageState.images.forEach((image) => {
        if (image.objectUrl) {
          try {
            URL.revokeObjectURL(image.objectUrl);
          } catch {
            // ignore revoke failures
          }
        }
      });
      reviewPageState.images = [];
      renderReviewImagePreviews();
      showReviewImageError("");

      const stats = await fetchRatings(productId);
      renderSummary(stats);
      renderCommentsList(stats.comments || []);
      renderProductCard(reviewPageState.product, reviewPageState.order, reviewPageState.primaryItem, stats);
      syncProductRatingCache(reviewPageState.product, stats);
    } finally {
      reviewPageState.submitting = false;
      reviewPageState.uploadingImages = false;
      updateSubmitButtonState();
    }
  });
}

function setupComposeSection(order) {
  const composeSection = document.getElementById("review-compose-section");
  const composeNote = document.getElementById("review-compose-note");
  if (!composeSection || !composeNote) return;

  const cameFromOrder = Boolean(String(getQueryParam("order") || "").trim());
  if (!cameFromOrder) {
    composeSection.classList.add("hidden");
    return;
  }

  if (!shouldAllowCompose(order)) {
    composeSection.classList.remove("hidden");
    composeNote.textContent = "إضافة التقييم متاحة بعد استلام الطلب.";
    const form = document.getElementById("review-form");
    if (form) form.classList.add("hidden");
    return;
  }

  const orderRef = window.BudaOrders?.buildOrderReference ? window.BudaOrders.buildOrderReference(order) : "";
  composeSection.classList.remove("hidden");
  composeNote.textContent = orderRef
    ? `يمكنك إضافة تقييم لأنك اشتريت المنتج في الطلب ${orderRef}.`
    : "يمكنك إضافة تقييم لأنك اشتريت هذا المنتج.";

  bindComposeForm();
}

async function renderProductReviewsPage() {
  if (!window.BudaStore) {
    reviewsNotify("تعذر تحميل بيانات الصفحة.", "error");
    return;
  }

  const orderContext = await resolveOrderContext();
  const product = await resolveCurrentProduct(orderContext);
  if (!product) {
    reviewsNotify("تعذر العثور على المنتج المطلوب.", "error");
    return;
  }

  reviewPageState.product = product;
  reviewPageState.order = orderContext.order || null;
  reviewPageState.primaryItem = orderContext.primaryItem || null;

  renderPageHeader(product);
  setupComposeSection(reviewPageState.order);

  const stats = await fetchRatings(product.id);
  renderSummary(stats);
  renderCommentsList(stats.comments || []);
  renderProductCard(product, reviewPageState.order, reviewPageState.primaryItem, stats);
  syncProductRatingCache(product, stats);
}

document.addEventListener("DOMContentLoaded", () => {
  bindImageUploadSection();
  renderProductReviewsPage();
});
