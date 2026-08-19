document.addEventListener("DOMContentLoaded", async () => {
  const productsGrid = document.getElementById("productsGrid");
  const filterContainer = document.getElementById("filterContainer");
  const paginationEl = document.getElementById("pagination");
  if (!productsGrid || !filterContainer) return;

  if (window.skeletonLoader) window.skeletonLoader.hideSkeleton(document.body);

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

  const CATEGORIES_CACHE_KEY = 'buda_categories_cache';
  var allProducts = [];
  var currentPage = 1;
  var pageSize = 32;
  var currentProducts = [];

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
    if (!window.supabaseClient) return null;
    try {
      var { data } = await window.supabaseClient.from('categories').select('*').eq('slug', slug).eq('is_active', true).single();
      if (data) {
        var { data: branches } = await window.supabaseClient.from('category_branches').select('*').eq('category_id', data.id).eq('is_active', true).order('sort_order');
        data.branches = branches || [];
      }
      return data;
    } catch (_) {
      return null;
    }
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
      btn.addEventListener('click', function () {
        var page = parseInt(this.getAttribute('data-page'), 10);
        if (page && page !== currentPage) {
          currentPage = page;
          renderProducts(currentProducts);
          window.scrollTo({ top: productsGrid.offsetTop - 80, behavior: 'smooth' });
        }
      });
    });
  }

  function renderProducts(products) {
    if (window.skeletonLoader && typeof window.skeletonLoader.hideSkeleton === 'function') {
      window.skeletonLoader.hideSkeleton(document.body);
    }
    productsGrid.classList.remove('skeleton', 'skeleton-grid');

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
        '<img src="' + imgSrc + '" alt="' + escapeHtml(product.name || 'منتج') + '"' + loadAttr + ' onerror="this.onerror=null;this.src=\'' + fallbackImage + '\'" /></button>' +
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
      button.addEventListener("click", function () {
        var pid = this.getAttribute("data-view");
        if (!pid) return;
        var selected = allItems.find(function (item) { return String(item?.id) === String(pid); });
        if (selected) {
          try { sessionStorage.setItem("selectedProduct", encodeURIComponent(JSON.stringify(selected))); } catch {}
        }
        window.location.href = 'product.html?id=' + encodeURIComponent(pid);
      });
    });

    productsGrid.querySelectorAll("[data-add]").forEach(function (button) {
      button.addEventListener("click", function () {
        var pid = this.getAttribute("data-add");
        if (!pid || !window.BudaStore) return;
        var fromList = allItems.find(function (item) { return String(item.id) === String(pid); });
        var product = fromList || window.BudaStore.getProductById(pid);
        if (!product) return;
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
    if (selected === "الكل") {
      renderProducts(allProducts);
      return;
    }
    renderProducts(
      allProducts.filter(function (product) { return normalizeCategoryLabel(product.category) === selected; })
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
    renderProducts(filtered);
  }

  async function handleBranchFilter(categorySlug, branchName) {
    var cat = await getCategoryBySlug(categorySlug);
    if (!cat || !cat.branches) { renderProducts([]); return; }
    var branch = cat.branches.find(function (b) { return b.branch_name === branchName; });
    if (!branch || !branch.branch_keywords || !branch.branch_keywords.length) { renderProducts([]); return; }
    var filtered = allProducts.filter(function (p) { return matchProductByKeywords(p, branch.branch_keywords); });
    renderProducts(filtered);
  }

  async function fetchProducts() {
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

  fetchProducts();
  document.addEventListener("boda:wishlist-updated", function () { syncWishlistButtons(productsGrid); });
});