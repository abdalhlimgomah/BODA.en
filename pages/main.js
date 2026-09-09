document.addEventListener("DOMContentLoaded", async () => {
  const productsGrid = document.getElementById("productsGrid");
  const filterContainer = document.getElementById("filterContainer");
  const paginationEl = document.getElementById("pagination");
  if (!productsGrid || !filterContainer) return;

  if (window.skeletonLoader) window.skeletonLoader.hideSkeleton(document.body);

  // Two-step image fallback: resized -> original -> placeholder.
  window.__spImgFallback = function (el) {
    if (!el.getAttribute("data-fb-step")) {
      el.setAttribute("data-fb-step", "1");
      var full = el.getAttribute("data-full");
      if (full && el.src !== full) { el.src = full; return; }
    }
    el.onerror = null;
    var ph = el.getAttribute("data-ph");
    if (ph) el.src = ph;
  };

  // ---- Shared render state -----------------------------------------------
  // MUST be declared before the snapshot-paint block below: that block renders
  // immediately, and a `var` assigned later in this closure reads as undefined
  // there (pageSize=undefined made getPageItems return [] and wiped the just-
  // painted grid with the "no products" empty state until the network render).
  var allProducts = [];
  var currentPage = 1;
  var pageSize = 32;
  var currentProducts = [];

  // ---- Phase 2: instant paint from a local snapshot of the last render ----
  var LIST_SNAPSHOTS_KEY = 'buda_listing_snapshots_v1';
  var LIST_SNAPSHOT_TTL = 24 * 60 * 60 * 1000; // ignore snapshots older than 24h
  var LIST_SNAPSHOT_MAX_KEYS = 10;             // LRU cap so localStorage stays small
  var hydrationPromise = null;
  var paintedFromSnapshot = false;
  var lastPaintedSig = "";

  function getViewBaseKey() {
    try {
      var params = new URLSearchParams(window.location.search);
      return [
        "v1",
        localStorage.getItem("userCountry") || "EG",
        params.get("category") || "",
        params.get("branch") || ""
      ].join("|");
    } catch (_) {
      return "v1|EG||";
    }
  }

  function loadSnapMap() {
    try {
      var parsed = JSON.parse(localStorage.getItem(LIST_SNAPSHOTS_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function trimProductForSnapshot(product) {
    var out = {};
    for (var key in product) {
      if (!Object.prototype.hasOwnProperty.call(product, key)) continue;
      var value = product[key];
      if (value && typeof value === "object" && !Array.isArray(value)) continue;
      if (typeof value === "string") {
        // Keep image URLs intact, truncate long text (cards never show it).
        if (value.length > 300 && !/^https?:\/\/|^data:image\//i.test(value)) value = value.slice(0, 300);
      } else if (Array.isArray(value)) {
        value = value.filter(function (entry) { return typeof entry === "string" && entry.length < 500; }).slice(0, 6);
      }
      out[key] = value;
    }
    return out;
  }

  function saveListingSnapshot(key, list) {
    try {
      if (!key || !list || !list.length) return;
      var map = loadSnapMap();
      map[key] = {
        t: Date.now(),
        total: list.length,
        items: list.slice(0, pageSize).map(trimProductForSnapshot),
        ids: list.map(function (p) { return String(p.id); })
      };
      var keys = Object.keys(map);
      if (keys.length > LIST_SNAPSHOT_MAX_KEYS) {
        keys.sort(function (a, b) { return (map[a].t || 0) - (map[b].t || 0); });
        while (keys.length > LIST_SNAPSHOT_MAX_KEYS) delete map[keys.shift()];
      }
      localStorage.setItem(LIST_SNAPSHOTS_KEY, JSON.stringify(map));
    } catch (_) {}
  }

  function listSignature(list) {
    try {
      var prices = [];
      for (var i = 0; i < list.length && i < pageSize; i++) {
        var p = list[i];
        if (!p) return "bad" + Date.now();
        prices.push(String(p.id) + ":" + Math.round((resolvePrice(p).finalPrice || 0) * 100));
      }
      var firstId = list.length ? String(list[0].id) : "";
      var lastId = list.length ? String(list[list.length - 1].id) : "";
      return list.length + "|" + firstId + ">" + lastId + "|" + prices.join(",");
    } catch (_) {
      return "err" + Date.now(); // force re-render on any signature failure
    }
  }

  function ensureHydrated() {
    return hydrationPromise || Promise.resolve();
  }

  // Paint instantly from the snapshot when we have one for this exact view;
  // otherwise fall back to the skeleton placeholder as before.
  (function paintFromSnapshot() {
    try {
      var params = new URLSearchParams(window.location.search);
      var cat = params.get("category") || "";
      var branch = params.get("branch") || "";
      var suffix = branch ? ("slug:" + cat + "|br:" + branch) : (cat ? "slug:" + cat : "");
      var key = getViewBaseKey() + "|" + suffix;
      var candidate = loadSnapMap()[key];
      if (
        candidate && Array.isArray(candidate.items) && candidate.items.length &&
        Array.isArray(candidate.ids) && candidate.ids.length >= candidate.items.length &&
        Date.now() - Number(candidate.t || 0) < LIST_SNAPSHOT_TTL
      ) {
        var stubs = candidate.ids.slice(candidate.items.length).map(function (id) {
          return { id: id, __stub: true };
        });
        currentProducts = candidate.items.concat(stubs);
        paintedFromSnapshot = true;
        window.__spPerf = { paintStart: Math.round(performance.now()) };
        renderProducts(currentProducts, { persist: false });
        window.__spPerf.paintedAt = Math.round(performance.now());
      }
    } catch (_snapErr) {}
  })();

  if (!paintedFromSnapshot) {
    productsGrid.innerHTML = [
    '<div class="noon-grid">',
    Array.from({ length: 6 }, function () {
      return (
        '<div class="skeleton-product-card" style="padding:0">' +
        '<div class="skeleton skeleton-product-image" style="aspect-ratio:3/4;border-radius:14px 14px 0 0;margin:0"></div>' +
        '<div style="padding:10px 12px 14px">' +
        '<div class="skeleton skeleton-product-title" style="margin:0 auto 8px"></div>' +
        '<div class="skeleton skeleton-product-rating" style="margin:0 auto 8px"></div>' +
        '<div class="skeleton-product-price-line" style="margin:0">' +
        '<div class="skeleton skeleton-product-price"></div>' +
        '<div class="skeleton skeleton-product-old-price"></div>' +
        '</div>' +
        '</div>' +
        '</div>'
      );
    }).join(''),
    '</div>'
  ].join('');
  }

  const CATEGORIES_CACHE_KEY = 'buda_categories_cache';

  function getCurrencyConfig() {
    if (window.BudaStore && typeof window.BudaStore.resolveCurrencyConfig === 'function') {
      return window.BudaStore.resolveCurrencyConfig();
    }
    var code = localStorage.getItem('userCountry') || 'EG';
    return { locale: code === 'SA' ? 'ar-SA' : 'ar-EG', currency: code === 'SA' ? 'SAR' : 'EGP' };
  }

  function formatMoney(value) {
    var cfg = getCurrencyConfig();
    var num = Number(value) || 0;
    var formatted = new Intl.NumberFormat(cfg.locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
    var labels = { EGP: 'ج.م.', SAR: 'ريال' };
    return formatted + ' ' + (labels[cfg.currency] || cfg.currency);
  }

  var priceFormatter = formatMoney;

  var catPromiseMap = {};

  async function loadCategoryFromDb(slug) {
    if (!window.supabaseClient) return null;
    try {
      var { data } = await window.supabaseClient.from('categories').select('*').eq('slug', slug).eq('is_active', true).single();
      if (data) {
        var { data: branches } = await window.supabaseClient.from('category_branches').select('*').eq('category_id', data.id).eq('is_active', true).order('sort_order');
        data.branches = branches || [];
      }
      // Write back so repeat visits skip both roundtrips entirely.
      if (data) {
        try {
          var raw = localStorage.getItem(CATEGORIES_CACHE_KEY);
          var obj = raw ? JSON.parse(raw) : null;
          if (!obj || !Array.isArray(obj.data)) obj = { timestamp: Date.now(), data: [] };
          obj.timestamp = Date.now();
          obj.data = obj.data.filter(function (c) { return c && c.slug !== slug; });
          obj.data.push(data);
          localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(obj));
        } catch (_) {}
      }
      return data;
    } catch (_) {
      return null;
    }
  }

  async function getCategoryBySlug(slug) {
    try {
      var cached = localStorage.getItem(CATEGORIES_CACHE_KEY);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          var found = (parsed.data || []).find(function (c) { return c.slug === slug; });
          if (found) return found;
        }
      }
    } catch (_) {}
    if (!catPromiseMap[slug]) catPromiseMap[slug] = loadCategoryFromDb(slug);
    return catPromiseMap[slug];
  }

  function matchProductByKeywords(product, keywords) {
    if (!keywords || !keywords.length) return false;
    var searchText = ((product.name || '') + ' ' + (product.category || '') + ' ' + (product.description || '') + ' ' + ((product.keywords || []) || []).join(' ')).toLowerCase();
    searchText = searchText.replace(/\s+/g, '');
    var keywordSet = keywords.map(function (k) { return k.toLowerCase().trim().replace(/\s+/g, ''); }).filter(Boolean);
    return keywordSet.some(function (kw) { return searchText.indexOf(kw) !== -1; });
  }

  const categories = [
    "الكل",
    "هواتف",
    "ساعات",
    "لوحات مفاتيح",
    "سماعات رأس",
    "ملابس",
    "منتجات تجميل وعناية",
    "منتجات رياضية",
  ];

  const categoryMap = {
    phones: "هواتف",
    watches: "ساعات",
    keyboards: "لوحات مفاتيح",
    headphones: "سماعات رأس",
    children: "ملابس",
    clothes: "ملابس",
    "beauty-and-care": "منتجات تجميل وعناية",
    sports: "منتجات رياضية",
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getImage(product) {
    const candidates = window.BudaStore?.getProductImages
      ? window.BudaStore.getProductImages(product)
      : [product?.image || "assets/images/unnamed.png"];
    const source = candidates[0] || "assets/images/unnamed.png";
    if (window.BudaStore?.getImagePath) return window.BudaStore.getImagePath(source);
    return source || "../assets/images/unnamed.png";
  }

  function normalizeCategoryLabel(category) {
    const value = String(category || "").trim();
    if (value === "ملابس أطفال") return "ملابس";
    return value;
  }

  function resolvePrice(product) {
    if (window.BudaStore?.resolveProductPrice) {
      const { currentPrice, originalPrice, hasDiscount, discountPercent } =
        window.BudaStore.resolveProductPrice(product);
      return { finalPrice: currentPrice, originalPrice, hasDiscount, discountPercent };
    }
    const value = Number(product?.price) || 0;
    return { finalPrice: value, originalPrice: value, hasDiscount: false, discountPercent: 0 };
  }

  function resolveRating(product) {
    if (window.BudaStore?.resolveProductRating) {
      const resolved = window.BudaStore.resolveProductRating(product);
      return { rating: resolved.rating, reviewCount: resolved.reviewCount };
    }
    return { rating: 0, reviewCount: 0 };
  }

  function renderRatingStars(rating) {
    if (window.BudaStore?.renderProductStars) {
      return window.BudaStore.renderProductStars(rating);
    }
    return "";
  }

  function setWishlistButtonState(button, active) {
    if (!button) return;
    const icon = button.querySelector(".material-icons-outlined");
    button.classList.toggle("is-active", Boolean(active));
    button.setAttribute("aria-pressed", active ? "true" : "false");
    if (icon) icon.textContent = active ? "favorite" : "favorite_border";
  }

  function syncWishlistButtons(container) {
    container.querySelectorAll("[data-wishlist]").forEach((button) => {
      const productId = button.getAttribute("data-wishlist");
      const active = window.BudaStore?.isInWishlist ? window.BudaStore.isInWishlist(productId) : false;
      setWishlistButtonState(button, active);
    });
  }

  function getPageCount(total) {
    return Math.ceil(total / pageSize) || 1;
  }

  function getPageItems(products, page) {
    var start = (page - 1) * pageSize;
    return products.slice(start, start + pageSize);
  }

  function renderPagination(products) {
    if (!paginationEl) return;
    var totalPages = getPageCount(products.length);
    if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }

    var html = '';
    if (currentPage > 1) {
      html += '<button type="button" class="page-btn" data-page="' + (currentPage - 1) + '">‹</button>';
    }
    for (var i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        html += '<button type="button" class="page-btn' + (i === currentPage ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
      } else if (i === currentPage - 2 || i === currentPage + 2) {
        html += '<span class="page-ellipsis">…</span>';
      }
    }
    if (currentPage < totalPages) {
      html += '<button type="button" class="page-btn" data-page="' + (currentPage + 1) + '">›</button>';
    }
    paginationEl.innerHTML = html;

    paginationEl.querySelectorAll('.page-btn').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var page = parseInt(this.getAttribute('data-page'), 10);
        if (!page || page === currentPage) return;
        // Stub zone (snapshot-painted pages beyond page 1): wait for fresh data.
        var target = currentProducts[(page - 1) * pageSize];
        if (target && target.__stub) {
          this.disabled = true;
          try { await ensureHydrated(); } catch (_e) {}
        }
        if (!currentProducts.length) return;
        currentPage = Math.min(Math.max(1, page), getPageCount(currentProducts.length));
        renderProductsPage(getPageItems(currentProducts, currentPage), currentProducts);
        window.scrollTo({ top: productsGrid.offsetTop - 80, behavior: 'smooth' });
      });
    });
  }

  function renderProducts(products, opts) {
    opts = opts || {};
    if (window.skeletonLoader && typeof window.skeletonLoader.hideSkeleton === 'function') {
      window.skeletonLoader.hideSkeleton(document.body);
    }
    productsGrid.classList.remove('skeleton', 'skeleton-grid');

    // Persist BEFORE the signature check so identical data still refreshes
    // the snapshot timestamp (proves the data is fresh).
    if (products.length && opts.persist !== false && opts.snapKey) {
      saveListingSnapshot(opts.snapKey, products);
    }

    var sig = listSignature(products);
    if (sig === lastPaintedSig && lastPaintedSig !== "") {
      // Same content already on screen — swap state silently, no DOM churn.
      currentProducts = products;
      currentPage = 1;
      return;
    }
    lastPaintedSig = sig;

    currentProducts = products;
    currentPage = 1;

    if (!products.length) {
      productsGrid.innerHTML = '<div class="noon-muted">لا توجد منتجات في هذا القسم.</div>';
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }

    var pageItems = getPageItems(products, 1);
    renderProductsPage(pageItems, products);
  }

  function renderProductsPage(pageItems, allItems) {
    // Invariant: this module's render state must be initialized before ANY
    // render runs. If it isn't, fail loudly — a silent empty page here wipes
    // already-painted cards and looks like "no products" to real users.
    if (typeof pageSize !== "number" || !(pageSize > 0)) {
      console.error("[Main] render invoked before state init (pageSize=" + pageSize + ") — refusing to wipe grid");
      return;
    }
    var totalPages = getPageCount(allItems.length);

    productsGrid.innerHTML = '';
    if (!pageItems.length) {
      productsGrid.innerHTML = '<div class="noon-muted">لا توجد منتجات في هذا القسم.</div>';
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }

    var grid = document.createElement('div');
    grid.className = 'noon-grid';

    pageItems.forEach(function (product, idx) {
      var { finalPrice, originalPrice, hasDiscount, discountPercent } = resolvePrice(product);
      var { rating, reviewCount } = resolveRating(product);
      var id = String(product.id);
      var isWishlisted = window.BudaStore?.isInWishlist ? window.BudaStore.isInWishlist(id) : false;
      var fallbackImage = window.BudaStore?.getImagePath
        ? window.BudaStore.getImagePath(window.BudaStore.DEFAULT_PRODUCT_IMAGE || "assets/images/unnamed.png")
        : "../assets/images/unnamed.png";
      var imgSrc = getImage(product);
      // Grid cards are ~250px wide: request a resized WebP instead of the
      // full-size original (166KB -> ~10KB). Falls back to the original on
      // error, then to the placeholder image.
      var gridSrc = imgSrc;
      if (window.BudaStore && typeof window.BudaStore.getResizedImageUrl === "function") {
        gridSrc = window.BudaStore.getResizedImageUrl(imgSrc, 420) || imgSrc;
      }
      var loadAttr = idx < 8 ? ' fetchpriority="high" loading="eager" decoding="async"' : ' loading="lazy" decoding="async"';

      var card = document.createElement('article');
      card.className = 'noon-product-card';
      card.setAttribute('data-product-id', id);

      card.innerHTML =
        '<div class="noon-product-media-wrap">' +
        '<button class="icon-btn noon-wishlist-btn' + (isWishlisted ? ' is-active' : '') + '" data-wishlist="' + id + '" aria-label="إضافة إلى المفضلة" aria-pressed="' + (isWishlisted ? 'true' : 'false') + '">' +
        '<span class="material-icons-outlined" style="font-size:18px;">' + (isWishlisted ? 'favorite' : 'favorite_border') + '</span></button>' +
        '<button class="noon-product-media" data-view="' + id + '" aria-label="عرض المنتج">' +
        '<div class="buda-pulse-dot"><div class="buda-pulse-dot-inner"><div class="buda-pulse-dot-circle"></div></div></div>' +
        '<img src="' + escapeHtml(gridSrc) + '" alt="' + escapeHtml(product.name || 'منتج') + '"' + loadAttr +
        ' data-full="' + escapeHtml(imgSrc) + '" data-ph="' + escapeHtml(fallbackImage) + '" onerror="__spImgFallback(this)" /></button>' +
        '<button class="noon-add-square" data-add="' + id + '" aria-label="إضافة إلى السلة">+</button>' +
        '</div>' +
        '<div class="noon-product-body">' +
        (reviewCount > 0 ? '<div class="noon-rating-pill"><span>' + rating.toFixed(1) + '</span> <span class="noon-rating-stars">' + renderRatingStars(rating) + '</span> <span>(' + reviewCount + ')</span></div>' : '') +
        '<h3 class="noon-title">' + escapeHtml(product.name || 'منتج') + '</h3>' +
        '<div class="noon-price-line">' +
        '<p class="noon-price">' + formatMoney(finalPrice) + '</p>' +
        (hasDiscount ? '<p class="noon-old-price">' + formatMoney(originalPrice) + '</p>' : '') +
        (hasDiscount ? '<span class="noon-discount-pill">' + discountPercent + '% خصم</span>' : '') +
        '</div>';

      grid.appendChild(card);
    });

    productsGrid.appendChild(grid);
    renderPagination(allItems);

    productsGrid.querySelectorAll("[data-view]").forEach(function (button) {
      button.addEventListener("click", async function () {
        var pid = this.getAttribute("data-view");
        if (!pid) return;
        var selected = allItems.find(function (item) { return String(item?.id) === String(pid); });
        if ((!selected || selected.__stub || !selected.name) && hydrationPromise) {
          try { await ensureHydrated(); } catch (_e) {}
          selected =
            (currentProducts || []).find(function (item) { return String(item?.id) === String(pid); }) ||
            (allProducts || []).find(function (item) { return String(item?.id) === String(pid); }) ||
            selected;
        }
        if (!selected || selected.__stub || !selected.name) return;
        try { sessionStorage.setItem("selectedProduct", encodeURIComponent(JSON.stringify(selected))); } catch {}
        window.location.href = 'product.html?id=' + encodeURIComponent(pid);
      });
    });

    productsGrid.querySelectorAll("[data-add]").forEach(function (button) {
      button.addEventListener("click", async function () {
        var pid = this.getAttribute("data-add");
        if (!pid || !window.BudaStore) return;
        var fromList = allItems.find(function (item) { return String(item.id) === String(pid); });
        var product = fromList || window.BudaStore.getProductById(pid);
        if (!product || product.__stub || !product.name) {
          // Snapshot stub: wait for fresh data, then use the real product.
          try { await ensureHydrated(); } catch (_e) {}
          product =
            (currentProducts || []).find(function (item) { return String(item.id) === String(pid); }) ||
            (allProducts || []).find(function (item) { return String(item.id) === String(pid); }) ||
            window.BudaStore.getProductById(pid);
        }
        if (!product || product.__stub || !product.name) return;
        window.BudaStore.addToCart(product, 1);
        window.BudaStore.updateCartCount();
        window.BudaUI?.refreshShell();
      });
    });

    productsGrid.querySelectorAll("[data-wishlist]").forEach(function (button) {
      button.addEventListener("click", function () {
        var pid = this.getAttribute("data-wishlist");
        if (!pid || !window.BudaStore) return;
        var state = window.BudaStore.toggleWishlist(pid);
        setWishlistButtonState(button, state);
      });
    });

    syncWishlistButtons(productsGrid);
  }

  function applyCategoryFilter(selected) {
    var suffix = selected === "الكل" ? "" : "label:" + selected;
    var snapKey = getViewBaseKey() + "|" + suffix;
    if (selected === "الكل") {
      renderProducts(allProducts, { snapKey: snapKey });
      return;
    }
    renderProducts(
      allProducts.filter(function (product) { return normalizeCategoryLabel(product.category) === selected; }),
      { snapKey: snapKey }
    );
  }

  function renderFilters() {
    filterContainer.innerHTML = categories
      .map(function (cat) { return '<button type="button" class="filter-btn">' + cat + '</button>'; })
      .join("");

    var buttons = [].slice.call(filterContainer.querySelectorAll(".filter-btn"));

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        buttons.forEach(function (b) { b.classList.remove("active"); });
        this.classList.add("active");
        applyCategoryFilter(this.textContent.trim());
      });
    });

    var params = new URLSearchParams(window.location.search);
    var urlCategory = params.get("category");
    var urlBranch = params.get("branch");

    if (!urlCategory) {
      if (buttons[0]) buttons[0].click();
      return;
    }

    if (urlBranch) {
      handleBranchFilter(urlCategory, urlBranch);
      return;
    }

    handleKeywordCategory(urlCategory);
  }

  async function handleKeywordCategory(slug) {
    var cat = await getCategoryBySlug(slug);
    if (!cat) { renderProducts([]); return; }
    var keywords = cat.keywords || [];
    if (!keywords.length) { renderProducts([]); return; }
    var filtered = allProducts.filter(function (p) { return matchProductByKeywords(p, keywords); });
    renderProducts(filtered, { snapKey: getViewBaseKey() + "|slug:" + slug });
  }

  async function handleBranchFilter(categorySlug, branchName) {
    var cat = await getCategoryBySlug(categorySlug);
    if (!cat || !cat.branches) { renderProducts([]); return; }
    var branch = cat.branches.find(function (b) { return b.branch_name === branchName; });
    if (!branch || !branch.branch_keywords || !branch.branch_keywords.length) { renderProducts([]); return; }
    var filtered = allProducts.filter(function (p) { return matchProductByKeywords(p, branch.branch_keywords); });
    renderProducts(filtered, { snapKey: getViewBaseKey() + "|slug:" + categorySlug + "|br:" + branchName });
  }

  async function runFetchProducts() {
    if (window.supabaseClient?.fetchAllProductsWithTaager) {
      try {
        var countryCode = localStorage.getItem('userCountry') || 'EG';
        allProducts = (await window.supabaseClient.fetchAllProductsWithTaager(countryCode)) || [];
      } catch (error) {
        console.warn("failed fetching products", error);
        allProducts = window.BudaStore ? Object.values(window.BudaStore.getAllProducts()) : [];
      }
      renderFilters();
      return;
    }
    if (window.supabaseClient?.fetchTaagerProducts) {
      try {
        var countryCode = localStorage.getItem('userCountry') || 'EG';
        allProducts = (await window.supabaseClient.fetchTaagerProducts(countryCode)) || [];
        if (!allProducts.length) {
          allProducts = (await window.supabaseClient.fetchTaagerProducts()) || [];
        }
      } catch (error) {
        console.warn("failed fetching products", error);
        allProducts = window.BudaStore ? Object.values(window.BudaStore.getAllProducts()) : [];
      }
      renderFilters();
      return;
    }
    if (!window.supabaseClient || typeof window.supabaseClient.fetchAllProducts !== "function") {
      allProducts = window.BudaStore ? Object.values(window.BudaStore.getAllProducts()) : [];
      renderFilters();
      return;
    }
    try {
      allProducts = (await window.supabaseClient.fetchAllProducts()) || [];
    } catch (error) {
      console.warn("failed fetching products", error);
      allProducts = window.BudaStore ? Object.values(window.BudaStore.getAllProducts()) : [];
    }
    renderFilters();
  }

  // Hydration: the single in-flight load that replaces/validates the snapshot.
  function fetchProducts() {
    hydrationPromise = runFetchProducts();
    return hydrationPromise;
  }

  // Prewarm the category query in parallel with the products fetch —
  // previously it only started AFTER all products finished downloading.
  (function () {
    try {
      var slug = new URLSearchParams(window.location.search).get("category");
      if (slug) getCategoryBySlug(slug)["catch"](function () {});
    } catch (_) {}
  })();

  fetchProducts();

  // If pricing tiers arrive AFTER the snapshot was painted, repaint so every
  // price shows its real markup (normally tiers are already cached & instant).
  document.addEventListener("boda:pricing-updated", function () {
    if (paintedFromSnapshot && currentProducts.length) {
      lastPaintedSig = "";
      renderProductsPage(getPageItems(currentProducts, currentPage), currentProducts);
    }
  });

  document.addEventListener("boda:wishlist-updated", function () { syncWishlistButtons(productsGrid); });
});