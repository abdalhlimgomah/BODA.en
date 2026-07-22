const REVIEW_TITLE_MARKER = "__buda_title__:";

const MAX_REVIEW_IMAGES = 7;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const reviewPageState = {
  product: null,
  order: null,
  primaryItem: null,
  rating: 0,
  submitting: false,
  uploadedImages: [],
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

function parseImagesField(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((u) => typeof u === "string" && u.startsWith("http"));
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((u) => typeof u === "string" && u.startsWith("http"));
    } catch {
      return [];
    }
  }
  return [];
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
        createdAt: row?.created_at || new Date().toISOString(),
        user_email: String(row?.user_email || "").toLowerCase().trim(),
        images: parseImagesField(row?.images),
      };
    })
    .filter((item) => item.rating > 0);
}

function hideComposeSection() {
  const composeSection = document.getElementById("review-compose-section");
  if (composeSection) composeSection.classList.add("hidden");
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
      <p class="review-target-meta">${window.BudaStore ? window.BudaStore.formatMoney(currentPrice, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : escapeHtml((Number(currentPrice) || 0).toFixed(2) + " " + (window.BudaStore?.getCurrencyLabel?.() || "جنيه"))} • ${escapeHtml(avgText)}</p>
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

  const currentEmail = getCurrentUserEmail();

  listEl.innerHTML = rows
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((comment) => {
      const commentDate = comment.createdAt ? new Date(comment.createdAt).toLocaleDateString("ar-EG") : "";
      const titleHtml = comment.title ? `<p class="comment-title">${escapeHtml(comment.title)}</p>` : "";
      const imagesHtml = Array.isArray(comment.images) && comment.images.length
        ? `<div class="comment-images">${comment.images.map((url) => `<div class="comment-image-item"><img src="${escapeHtml(url)}" alt="صورة التقييم" loading="lazy" onerror="this.parentElement.style.display='none'" /></div>`).join("")}</div>`
        : "";
      const isOwn = currentEmail && comment.user_email === currentEmail;
      const createdDate = comment.createdAt || new Date().toISOString();
      return `
        <article class="comment-item${isOwn ? " is-own-review" : ""}" data-review-email="${escapeHtml(comment.user_email)}" data-review-product="${escapeHtml(reviewPageState.product?.id || "")}" data-review-created="${escapeHtml(createdDate)}">
          <div class="comment-head">
            <div>
              <strong class="comment-author">${escapeHtml(comment.name || "عميل")}</strong>
              <div class="rating-stars">${renderStars(comment.rating || 0)}</div>
            </div>
            <span class="comment-date">${commentDate}</span>
            ${isOwn ? '<button type="button" class="comment-delete-btn" aria-label="حذف التقييم"><span class="material-icons-outlined">close</span></button>' : ""}
          </div>
          ${titleHtml}
          <p class="comment-body">${escapeHtml(comment.text || "")}</p>
          ${imagesHtml}
        </article>
      `;
    })
    .join("");

  listEl.querySelectorAll(".comment-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const article = btn.closest(".comment-item");
      if (!article) return;
      const productId = article.dataset.reviewProduct;
      const userEmail = article.dataset.reviewEmail;

      if (!productId || !userEmail) return;

      // Check 9-day rule
      var REVIEW_DELETE_DAYS = 9;
      var createdStr = article.dataset.reviewCreated;
      var daysLeft = 0;
      if (createdStr) {
        var createdDate = new Date(createdStr);
        var elapsedDays = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
        daysLeft = REVIEW_DELETE_DAYS - elapsedDays;
      }
      if (daysLeft > 0) {
        var msg = "يمكنك حذف التقييم بعد " + daysLeft + " " + (daysLeft === 1 ? "يوم" : "أيام") + ".";
        reviewsNotify(msg, "error");
        return;
      }

      if (!confirm("هل أنت متأكد من حذف هذا التقييم؟")) return;

      btn.disabled = true;
      btn.innerHTML = '<span class="material-icons-outlined" style="font-size:14px">hourglass_empty</span>';

      const result = await deleteReview(productId, userEmail);

      if (result.success) {
        reviewsNotify("تم حذف التقييم.", "success");
        const stats = await fetchRatings(productId);
        renderSummary(stats);
        renderCommentsList(stats.comments || []);
        renderProductCard(reviewPageState.product, reviewPageState.order, reviewPageState.primaryItem, stats);
        syncProductRatingCache(reviewPageState.product, stats);
      } else {
        reviewsNotify(result.message || "تعذر حذف التقييم.", "error");
        btn.disabled = false;
        btn.innerHTML = '<span class="material-icons-outlined">close</span>';
      }
    });
  });
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
  if (!rawName) return "عميل Buda";
  const parts = rawName.replace(/\s+/g, " ").split(" ").filter(Boolean);
  if (parts.length <= 1) return rawName;
  return `${parts[0]} ${parts[1].charAt(0)}.`;
}

function getCurrentUserEmail() {
  return (localStorage.getItem("userEmail") || "").toString().trim().toLowerCase();
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
  const canSubmit = reviewPageState.rating >= 1 && title.length >= 3 && body.length >= 10 && !reviewPageState.submitting;
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

/* ===== Image Upload ===== */
function getReviewStoragePath(productId) {
  const email = (localStorage.getItem("userEmail") || "anonymous").replace(/[^a-z0-9]/gi, "_");
  const ts = Date.now();
  return `review-images/${String(productId).replace(/[^a-z0-9]/gi, "_")}/${email}_${ts}`;
}

async function uploadReviewImage(file, productId) {
  const ext = file.name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "");
  const storagePath = `${getReviewStoragePath(productId)}_${Date.now()}.${ext}`;

  try {
    const raw = window.supabaseClient.raw();
    const { data, error } = await raw.storage.from("review-images").upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

    if (error) throw error;

    const { data: urlData } = await raw.storage.from("review-images").getPublicUrl(storagePath);
    return urlData?.publicUrl || null;
  } catch (err) {
    console.warn("uploadReviewImage via lib failed, trying direct REST:", err);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const supabaseUrl = window.SUPABASE_URL || "https://msgqzgzoslearaprgiqq.supabase.co";
      const anonKey = window.SUPABASE_ANON_KEY || "";
      const uploadUrl = `${supabaseUrl}/storage/v1/object/review-images/${storagePath}`;

      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${anonKey}`,
          "x-upsert": "false",
        },
        body: file,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "unknown");
        console.error("direct REST upload failed:", res.status, errText);

        if (res.status === 404) {
          console.warn("Bucket may not exist. Create 'review-images' bucket in Supabase dashboard.");
        }
        return null;
      }

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/review-images/${storagePath}`;
      return publicUrl;
    } catch (fallbackErr) {
      console.error("direct REST upload fallback also failed:", fallbackErr);
      return null;
    }
  }
}

function handleImageFiles(files) {
  const errorEl = document.getElementById("review-image-error");
  const previewsEl = document.getElementById("review-image-previews");

  if (!files || !files.length) return;

  const remaining = MAX_REVIEW_IMAGES - reviewPageState.uploadedImages.length;

  if (remaining <= 0) {
    if (errorEl) {
      errorEl.textContent = `يمكنك إضافة ${MAX_REVIEW_IMAGES} صور فقط.`;
      errorEl.classList.remove("hidden");
    }
    return;
  }

  const toAdd = Math.min(files.length, remaining);

  for (let i = 0; i < toAdd; i++) {
    const file = files[i];

    if (!file.type.startsWith("image/")) {
      if (errorEl) {
        errorEl.textContent = "الرجاء اختيار صور فقط (JPG/PNG/WebP).";
        errorEl.classList.remove("hidden");
      }
      continue;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      if (errorEl) {
        errorEl.textContent = "حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت.";
        errorEl.classList.remove("hidden");
      }
      continue;
    }

    const preview = {
      file,
      blobUrl: URL.createObjectURL(file),
      status: "pending",
      url: null,
    };

    reviewPageState.uploadedImages.push(preview);
    appendImagePreview(preview, previewsEl);
  }

  if (errorEl) errorEl.classList.add("hidden");
  updateImageUploadVisibility();
}

function appendImagePreview(preview, container) {
  if (!container) return;

  const div = document.createElement("div");
  div.className = "review-image-preview";
  div.dataset.index = String(reviewPageState.uploadedImages.indexOf(preview));

  const img = document.createElement("img");
  img.src = preview.blobUrl;
  img.alt = "صورة التقييم";
  img.loading = "lazy";

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "review-image-preview-remove";
  removeBtn.innerHTML = "&times;";
  removeBtn.setAttribute("aria-label", "إزالة الصورة");

  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    removeImagePreview(preview);
  });

  div.appendChild(img);
  div.appendChild(removeBtn);
  container.appendChild(div);
}

function removeImagePreview(preview) {
  if (preview.blobUrl) URL.revokeObjectURL(preview.blobUrl);

  const idx = reviewPageState.uploadedImages.indexOf(preview);
  if (idx !== -1) reviewPageState.uploadedImages.splice(idx, 1);

  renderImagePreviews();
  updateImageUploadVisibility();
}

function renderImagePreviews() {
  const container = document.getElementById("review-image-previews");
  if (!container) return;
  container.innerHTML = "";

  reviewPageState.uploadedImages.forEach((preview) => {
    appendImagePreview(preview, container);
  });
}

function updateImageUploadVisibility() {
  const uploadEl = document.getElementById("review-image-upload");
  if (!uploadEl) return;

  if (reviewPageState.uploadedImages.length >= MAX_REVIEW_IMAGES) {
    uploadEl.style.display = "none";
  } else {
    uploadEl.style.display = "flex";
  }
}

function clearImageUploads() {
  reviewPageState.uploadedImages.forEach((preview) => {
    if (preview.blobUrl) URL.revokeObjectURL(preview.blobUrl);
  });
  reviewPageState.uploadedImages = [];
  renderImagePreviews();
  updateImageUploadVisibility();
}

async function uploadPendingImages(productId) {
  const pending = reviewPageState.uploadedImages.filter((p) => p.status === "pending");
  if (!pending.length) return [];

  const uploadEl = document.getElementById("review-image-upload");
  if (uploadEl) uploadEl.classList.add("review-image-uploading");

  const urls = [];

  for (const preview of pending) {
    preview.status = "uploading";
    const url = await uploadReviewImage(preview.file, productId);
    if (url) {
      preview.status = "done";
      preview.url = url;
      urls.push(url);
    } else {
      preview.status = "failed";
    }
  }

  if (uploadEl) uploadEl.classList.remove("review-image-uploading");
  renderImagePreviews();
  return urls;
}

function bindImageUpload() {
  const uploadEl = document.getElementById("review-image-upload");
  const inputEl = document.getElementById("review-image-input");

  if (!uploadEl || !inputEl) return;

  uploadEl.addEventListener("click", () => {
    inputEl.click();
  });

  uploadEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputEl.click();
    }
  });

  inputEl.addEventListener("change", () => {
    if (inputEl.files && inputEl.files.length) {
      handleImageFiles(inputEl.files);
      inputEl.value = "";
    }
  });
}

/* ===== End Image Upload ===== */

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

async function submitRating(productId, rating, title, body, reviewerName, imageUrls = []) {
  const userEmail = (localStorage.getItem("userEmail") || "").toString().trim().toLowerCase();

  const payload = cleanPayload({
    item_id: String(productId),
    user_email: userEmail || undefined,
    rating: Number(rating),
    comment: buildStoredComment(title, body) || undefined,
    reviewer_name: String(reviewerName || "").trim() || undefined,
    images: imageUrls.length ? JSON.stringify(imageUrls) : undefined,
  });

  if (!payload.item_id || !payload.rating) {
    return { success: false, message: "بيانات التقييم غير مكتملة." };
  }

  const { error } = await window.supabaseClient
    .from("ratings")
    .upsert(payload, { onConflict: ["user_email", "item_id"] });

  if (error) {
    if (String(error.code) === "23503") {
      return { success: false, message: "معرف المنتج غير موجود في قاعدة البيانات. لا يمكن إضافة تقييم." };
    }
    if (String(error.code) === "23505") {
      return { success: false, message: "لقد قمت بتقييم هذا المنتج بالفعل." };
    }
    if (String(error.code) === "22P02") {
      return { success: false, message: "صيغة معرف المنتج غير صالحة. يرجى تحديث قاعدة البيانات (تشغيل SQL fix)." };
    }
    console.error("submitRating upsert error", error);
    return { success: false, message: "تعذر إرسال التقييم الآن. حاول مرة أخرى." };
  }

  return { success: true };
}

async function deleteReview(productId, userEmail) {
  if (!productId || !userEmail) {
    return { success: false, message: "بيانات الحذف غير مكتملة." };
  }

  try {
    const { error } = await window.supabaseClient
      .from("ratings")
      .delete()
      .eq("item_id", String(productId))
      .eq("user_email", userEmail);

    if (error) {
      console.error("deleteReview error:", error);
      return { success: false, message: "تعذر حذف التقييم. حاول مرة أخرى." };
    }

    return { success: true };
  } catch (err) {
    console.error("deleteReview catch:", err);
    return { success: false, message: "تعذر حذف التقييم." };
  }
}

function bindComposeForm() {
  const form = document.getElementById("review-form");
  const titleInput = document.getElementById("review-title");
  const bodyInput = document.getElementById("review-body");
  const titleCount = document.getElementById("review-title-count");
  const bodyCount = document.getElementById("review-body-count");
  const anonymousInput = document.getElementById("review-anonymous");

  if (!form || !titleInput || !bodyInput) return;

  document.querySelectorAll(".review-star-btn").forEach((button) => {
    button.addEventListener("click", () => setSelectedRating(button.getAttribute("data-star-value")));
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
  bindImageUpload();

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
    updateSubmitButtonState();
    reviewsNotify("جاري رفع الصور وإرسال التقييم...", "info");

    try {
      const imageUrls = await uploadPendingImages(productId);
      const reviewerName = isAnonymousReview() ? "مجهول" : getCurrentPublicName();
      const result = await submitRating(productId, reviewPageState.rating, title, body, reviewerName, imageUrls);

      if (!result.success) {
        reviewsNotify(result.message || "تعذر إرسال التقييم.", "error");
        return;
      }

      reviewsNotify("تم إرسال التقييم بنجاح.", "success");
      hideComposeSection();
      titleInput.value = "";
      bodyInput.value = "";
      setSelectedRating(0);
      refreshCounters();
      clearImageUploads();

      const stats = await fetchRatings(productId);
      renderSummary(stats);
      renderCommentsList(stats.comments || []);
      renderProductCard(reviewPageState.product, reviewPageState.order, reviewPageState.primaryItem, stats);
      syncProductRatingCache(reviewPageState.product, stats);
    } finally {
      reviewPageState.submitting = false;
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
  const userEmail = (localStorage.getItem("userEmail") || "").toString().trim().toLowerCase();
  const alreadyReviewed = userEmail && stats.comments.some((c) => c.user_email === userEmail);
  if (alreadyReviewed) {
    hideComposeSection();
  }
  renderSummary(stats);
  renderCommentsList(stats.comments || []);
  renderProductCard(product, reviewPageState.order, reviewPageState.primaryItem, stats);
  syncProductRatingCache(product, stats);
}

document.addEventListener("DOMContentLoaded", () => {
  renderProductReviewsPage();
});
