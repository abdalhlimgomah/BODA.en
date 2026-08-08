/* ============================================
   Product Listing Page — Filters, Sort, Pagination
   ============================================ */

var PL = {};

// ========== DEMO DATA ==========
var PL_DEMO = new URLSearchParams(window.location.search).get("demo") === "1";
var PL_DEMO_PRODUCTS = [
  { id: "pl-d1", name: "فستان صيفي أنيق بأكمام واسعة", price: 299, old_price: 599, image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300", rating: 4.5, reviews: 234, category: "أزياء", brand: "زارا", seller: "زارا", free_shipping: true, official_store: true },
  { id: "pl-d2", name: "حقيبة جلدية فاخرة كتف", price: 459, old_price: 899, image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300", rating: 4.2, reviews: 189, category: "إكسسوارات", brand: "مايكل كورس", seller: "متجر فاخر", installment: true, official_store: true },
  { id: "pl-d3", name: "نظارة شمسية عصرية راي بان", price: 199, old_price: 399, image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=300", rating: 4.0, reviews: 567, category: "إكسسوارات", brand: "راي بان", seller: "راي بان", free_shipping: true },
  { id: "pl-d4", name: "ساعة رياضية ذكية جارمن", price: 1299, image: "https://images.unsplash.com/photo-1546868871-af0de0ae72f1?w=300", rating: 4.7, reviews: 890, category: "إلكترونيات", brand: "جارمن", seller: "جارمن", free_shipping: true, installment: true },
  { id: "pl-d5", name: "حذاء رياضي نايك اير ماكس", price: 549, old_price: 799, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300", rating: 4.4, reviews: 1234, category: "أحذية", brand: "نايك", seller: "نايك", installment: true, official_store: true },
  { id: "pl-d6", name: "تيشيرت قطني أساسي", price: 89, old_price: 149, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300", rating: 3.9, reviews: 456, category: "أزياء", brand: "إتش آند إم", seller: "إتش آند إم", free_shipping: true },
  { id: "pl-d7", name: "سماعة لاسلكية بلوتوث", price: 349, old_price: 599, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300", rating: 4.3, reviews: 789, category: "إلكترونيات", brand: "سامسونج", seller: "سامسونج", free_shipping: true, installment: true, official_store: true },
  { id: "pl-d8", name: "كريم ترطيب للوجه 50مل", price: 129, old_price: 199, image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=300", rating: 4.1, reviews: 345, category: "العناية بالبشرة", brand: "نيفيا", seller: "نيفيا" },
  { id: "pl-d9", name: "بنطلون جينز كلاسيك", price: 399, old_price: 599, image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=300", rating: 4.0, reviews: 678, category: "أزياء", brand: "ليفايز", seller: "ليفايز", free_shipping: true },
  { id: "pl-d10", name: "قبعة بيسبول رياضية", price: 79, old_price: 149, image: "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=300", rating: 4.2, reviews: 234, category: "إكسسوارات", brand: "نايك", seller: "نايك" },
  { id: "pl-d11", name: "مكتب كمبيوتر خشبي", price: 899, image: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=300", rating: 4.5, reviews: 123, category: "أثاث", brand: "ايكيا", seller: "ايكيا", free_shipping: true, installment: true, official_store: true },
  { id: "pl-d12", name: "خلاط كهربائي مطبخ", price: 249, old_price: 399, image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300", rating: 4.0, reviews: 456, category: "أجهزة منزلية", brand: "فيليبس", seller: "فيليبس", official_store: true },
  { id: "pl-d13", name: "حذاء كاجوال جلدي", price: 379, old_price: 529, image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300", rating: 4.3, reviews: 567, category: "أحذية", brand: "كلاركس", seller: "كلاركس" },
  { id: "pl-d14", name: "باور بانك 20000mAh", price: 199, image: "https://images.unsplash.com/photo-1609592424813-48db849d0e0d?w=300", rating: 4.4, reviews: 890, category: "إلكترونيات", brand: "انكر", seller: "انكر", free_shipping: true },
  { id: "pl-d15", name: "عدسة كاميرا كانون", price: 2499, old_price: 3299, image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=300", rating: 4.8, reviews: 234, category: "إلكترونيات", brand: "كانون", seller: "كانون", official_store: true },
  { id: "pl-d16", name: "طقم أطباق سيراميك 12قطعة", price: 449, image: "https://images.unsplash.com/photo-1513191513771-1d5a7a1b6b9a?w=300", rating: 4.1, reviews: 345, category: "أجهزة منزلية", brand: "ايكيا", seller: "ايكيا", free_shipping: true },
  { id: "pl-d17", name: "جاكيت شتوي مبطن", price: 799, old_price: 1299, image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300", rating: 4.6, reviews: 1234, category: "أزياء", brand: "زارا", seller: "زارا", free_shipping: true, installment: true, official_store: true },
  { id: "pl-d18", name: "سيروم فيتامين C للوجه", price: 179, old_price: 299, image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300", rating: 4.3, reviews: 678, category: "العناية بالبشرة", brand: "ذا أورديناري", seller: "ذا أورديناري" },
  { id: "pl-d19", name: "حذاء رياضي أديداس", price: 499, old_price: 699, image: "https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=300", rating: 4.2, reviews: 901, category: "أحذية", brand: "أديداس", seller: "أديداس", official_store: true },
  { id: "pl-d20", name: "لابتوب محمول خفيف", price: 4999, old_price: 6999, image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300", rating: 4.5, reviews: 567, category: "إلكترونيات", brand: "ديل", seller: "ديل", free_shipping: true, installment: true, official_store: true },
  { id: "pl-d21", name: "محفظة جلدية رجالية", price: 199, old_price: 349, image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=300", rating: 4.0, reviews: 234, category: "إكسسوارات", brand: "مايكل كورس", seller: "مايكل كورس" },
  { id: "pl-d22", name: "شنطة سفر كبير 80لتر", price: 699, old_price: 999, image: "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=300", rating: 4.4, reviews: 456, category: "إكسسوارات", brand: "سامسونايت", seller: "سامسونايت", free_shipping: true },
  { id: "pl-d23", name: "ماكينة قهوة إسبريسو", price: 1299, image: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=300", rating: 4.6, reviews: 789, category: "أجهزة منزلية", brand: "فيليبس", seller: "فيليبس", installment: true, official_store: true },
  { id: "pl-d24", name: "طقم مفروشات سرير كينج", price: 899, old_price: 1499, image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=300", rating: 4.2, reviews: 345, category: "أثاث", brand: "ايكيا", seller: "ايكيا", free_shipping: true },
  { id: "pl-d25", name: "عطر فرنسي فاخر 100مل", price: 599, old_price: 899, image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=300", rating: 4.7, reviews: 1234, category: "العناية بالبشرة", brand: "شانيل", seller: "شانيل", official_store: true },
  { id: "pl-d26", name: "جهاز تعقير بالأشعة فوق بنفسجية", price: 149, image: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=300", rating: 3.8, reviews: 234, category: "إلكترونيات", brand: "شاومي", seller: "شاومي" },
  { id: "pl-d27", name: "حذاء رسمي كلاسيك أسود", price: 499, old_price: 799, image: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=300", rating: 4.1, reviews: 567, category: "أحذية", brand: "كلاركس", seller: "كلاركس" },
  { id: "pl-d28", name: "ربطة عنق حريرية", price: 129, old_price: 199, image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=300", rating: 3.9, reviews: 123, category: "إكسسوارات", brand: "زارا", seller: "زارا" },
  { id: "pl-d29", name: "مقلاة غير لاصقة 28سم", price: 179, old_price: 299, image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300", rating: 4.0, reviews: 345, category: "أجهزة منزلية", brand: "تيفال", seller: "تيفال" },
  { id: "pl-d30", name: "شاحن لاسلكي سريع 15W", price: 99, image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300", rating: 4.2, reviews: 678, category: "إلكترونيات", brand: "انكر", seller: "انكر", free_shipping: true },
  { id: "pl-d31", name: "بلوزة نسائية صيفية", price: 179, old_price: 299, image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300", rating: 4.1, reviews: 456, category: "أزياء", brand: "إتش آند إم", seller: "إتش آند إم" },
  { id: "pl-d32", name: "سجادة صلاة قطيفة", price: 89, image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300", rating: 4.5, reviews: 890, category: "أثاث", brand: "ايكيا", seller: "ايكيا" },
];

// ========== STATE ==========
PL.state = {
  allProducts: [],
  filtered: [],
  currentPage: 1,
  perPage: 20,
  sortBy: "default",
  viewMode: "grid",
  filters: {
    search: "",
    category: [],
    brand: [],
    priceMin: "",
    priceMax: "",
    rating: "0",
    discount: "0",
    availOnly: false,
  },
  activeFilterCount: 0,
};

// ========== DOM REFS ==========
PL.el = {};

PL.cacheDom = function () {
  PL.el.grid = document.getElementById("plGrid");
  PL.el.loading = document.getElementById("plLoading");
  PL.el.empty = document.getElementById("plEmpty");
  PL.el.pagination = document.getElementById("plPagination");
  PL.el.resultsCount = document.getElementById("plResultsCount");
  PL.el.breadcrumbCurrent = document.getElementById("plBreadcrumbCurrent");
  PL.el.filterCount = document.getElementById("plFilterCount");
  PL.el.sidebar = document.getElementById("plSidebar");
  PL.el.filterDrawer = document.getElementById("plFilterDrawer");
  PL.el.filterOverlay = document.getElementById("plFilterOverlay");
  PL.el.filterToggle = document.getElementById("plFilterToggle");
  PL.el.sidebarClose = document.getElementById("plSidebarClose");
  PL.el.searchInput = document.getElementById("plSearchInput");
  PL.el.priceMin = document.getElementById("plPriceMin");
  PL.el.priceMax = document.getElementById("plPriceMax");
  PL.el.priceApply = document.getElementById("plPriceApply");
  PL.el.catContainer = document.getElementById("plFilterCategories");
  PL.el.brandContainer = document.getElementById("plFilterBrands");
  PL.el.sortSelect = document.getElementById("plSortSelect");
  PL.el.viewBtns = document.querySelectorAll(".pl-view-btn");
  PL.el.clearAll = document.getElementById("plClearAll");
  PL.el.emptyClear = document.getElementById("plEmptyClear");
  PL.el.ratingRadios = document.querySelectorAll('input[name="rating"]');
  PL.el.discountRadios = document.querySelectorAll('input[name="discount"]');
  PL.el.availCheck = document.getElementById("plAvailOnly");
};

// ========== URL PARAMS ==========
PL.readUrlParams = function () {
  var params = new URLSearchParams(window.location.search);
  var f = PL.state.filters;
  f.search = params.get("search") || "";
  f.category = params.getAll("category") || [];
  f.brand = params.getAll("brand") || [];
  f.priceMin = params.get("priceMin") || "";
  f.priceMax = params.get("priceMax") || "";
  f.rating = params.get("rating") || "0";
  f.discount = params.get("discount") || "0";
  f.availOnly = params.get("availOnly") === "1";
  var page = parseInt(params.get("page"), 10);
  PL.state.currentPage = page > 0 ? page : 1;
  var sort = params.get("sort");
  if (sort) PL.state.sortBy = sort;
  var view = params.get("view");
  if (view === "grid" || view === "list") PL.state.viewMode = view;

  // Update breadcrumb
  var parts = [];
  if (f.search) parts.push("بحث: " + f.search);
  if (f.category.length) parts.push("تصنيف: " + f.category.join(", "));
  if (f.brand.length) parts.push("ماركة: " + f.brand.join(", "));
  var typeVal = params.get("type");
  if (typeVal) parts.push("نوع: " + typeVal);
  if (parts.length) {
    PL.el.breadcrumbCurrent.textContent = parts.join(" | ");
  }
};

PL.syncUrl = function () {
  var params = new URLSearchParams();
  var f = PL.state.filters;
  if (f.search) params.set("search", f.search);
  f.category.forEach(function (c) { params.append("category", c); });
  f.brand.forEach(function (b) { params.append("brand", b); });
  if (f.priceMin) params.set("priceMin", f.priceMin);
  if (f.priceMax) params.set("priceMax", f.priceMax);
  if (f.rating !== "0") params.set("rating", f.rating);
  if (f.discount !== "0") params.set("discount", f.discount);
  if (f.availOnly) params.set("availOnly", "1");
  if (PL.state.currentPage > 1) params.set("page", String(PL.state.currentPage));
  if (PL.state.sortBy !== "default") params.set("sort", PL.state.sortBy);
  if (PL.state.viewMode !== "grid") params.set("view", PL.state.viewMode);
  var qs = params.toString();
  var url = window.location.pathname + (qs ? "?" + qs : "");
  window.history.replaceState(null, "", url);
};

// ========== PER-PAGE BY VIEWPORT ==========
PL.getPerPage = function () {
  var w = window.innerWidth;
  if (w < 576) return 8;
  if (w < 992) return 12;
  return 20;
};

// ========== FILTER LOGIC ==========
PL.matchProduct = function (p) {
  var f = PL.state.filters;

  // Search
  if (f.search) {
    var haystack = ((p.name || "") + " " + (p.title || "") + " " + (p.description || "") + " " + (p.category || "") + " " + (p.brand || "")).toLowerCase();
    if (haystack.indexOf(f.search.toLowerCase()) === -1) return false;
  }

  // Category (OR within)
  if (f.category.length) {
    var pCat = (p.category || "").toLowerCase();
    var match = false;
    for (var ci = 0; ci < f.category.length; ci++) {
      if (pCat.indexOf(f.category[ci].toLowerCase()) > -1) { match = true; break; }
    }
    if (!match) return false;
  }

  // Brand (OR within)
  if (f.brand.length) {
    var pBrand = (p.brand || "").toLowerCase();
    var brandMatch = false;
    for (var bi = 0; bi < f.brand.length; bi++) {
      if (pBrand.indexOf(f.brand[bi].toLowerCase()) > -1) { brandMatch = true; break; }
    }
    if (!brandMatch) return false;
  }

  // Price range
  if (f.priceMin) {
    var minVal = Number(f.priceMin);
    var priceInfo = resolvePrice(p);
    if (priceInfo.finalPrice < minVal) return false;
  }
  if (f.priceMax) {
    var maxVal = Number(f.priceMax);
    var priceInfo2 = resolvePrice(p);
    if (priceInfo2.finalPrice > maxVal) return false;
  }

  // Rating
  if (f.rating !== "0") {
    var minRating = Number(f.rating);
    var r = resolveRating(p);
    if (r.rating < minRating) return false;
  }

  // Discount
  if (f.discount !== "0") {
    var minDisc = Number(f.discount);
    var pr = resolvePrice(p);
    if (!pr.hasDiscount || pr.discountPercent < minDisc) return false;
  }

  // Availability
  if (f.availOnly) {
    if (p.stock === 0 || p.quantity === 0 || p.is_available === false) return false;
  }

  return true;
};

PL.applyFilters = function () {
  var all = PL.state.allProducts;
  var filtered = all.filter(function (p) { return PL.matchProduct(p); });
  PL.state.filtered = filtered;
  PL.updateActiveFilterCount();
  PL.state.perPage = PL.getPerPage();
  PL.state.currentPage = 1;
  PL.render();
  PL.syncUrl();
};

// ========== SORT ==========
PL.sortProducts = function (products) {
  var sorted = [].concat(products);
  switch (PL.state.sortBy) {
    case "price-asc":
      sorted.sort(function (a, b) { return resolvePrice(a).finalPrice - resolvePrice(b).finalPrice; });
      break;
    case "price-desc":
      sorted.sort(function (a, b) { return resolvePrice(b).finalPrice - resolvePrice(a).finalPrice; });
      break;
    case "rating":
      sorted.sort(function (a, b) { return (resolveRating(b).rating || 0) - (resolveRating(a).rating || 0); });
      break;
    case "discount":
      sorted.sort(function (a, b) { return (resolvePrice(b).discountPercent || 0) - (resolvePrice(a).discountPercent || 0); });
      break;
    case "name":
      sorted.sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
      break;
    default:
      // الأحدث — sort by created_at or id
      sorted.sort(function (a, b) {
        var ta = a.created_at || a.createdAt || "";
        var tb = b.created_at || b.createdAt || "";
        if (ta && tb) return tb.localeCompare(ta);
        return String(b.id || "").localeCompare(String(a.id || ""));
      });
      break;
  }
  return sorted;
};

// ========== PAGINATION ==========
PL.getPaginated = function () {
  var sorted = PL.sortProducts(PL.state.filtered);
  var page = PL.state.currentPage;
  var perPage = PL.state.perPage;
  var totalPages = Math.ceil(sorted.length / perPage) || 1;
  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;
  PL.state.currentPage = page;
  var start = (page - 1) * perPage;
  var items = sorted.slice(start, start + perPage);
  return { items: items, total: sorted.length, totalPages: totalPages, page: page, perPage: perPage };
};

PL.renderPagination = function (total, totalPages, page) {
  var el = PL.el.pagination;
  if (totalPages <= 1) { el.innerHTML = ""; return; }

  var html = '<div class="pl-pagination-inner">';
  html += '<span class="pl-pagination-info">' + total + ' من ' + PL.state.filtered.length + ' منتج</span>';
  html += '<div class="pl-pagination-buttons">';

  // First
  html += '<button class="pl-page-btn" data-page="1"' + (page === 1 ? ' disabled' : '') + ' aria-label="الأول"><span class="material-icons-outlined">first_page</span></button>';
  // Prev
  html += '<button class="pl-page-btn" data-page="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + ' aria-label="السابق"><span class="material-icons-outlined">chevron_right</span></button>';

  // Page numbers (max 5)
  var startPage = Math.max(1, page - 2);
  var endPage = Math.min(totalPages, startPage + 4);
  if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
  for (var pi = startPage; pi <= endPage; pi++) {
    html += '<button class="pl-page-btn' + (pi === page ? ' active' : '') + '" data-page="' + pi + '">' + pi + '</button>';
  }

  // Next
  html += '<button class="pl-page-btn" data-page="' + (page + 1) + '"' + (page >= totalPages ? ' disabled' : '') + ' aria-label="التالي"><span class="material-icons-outlined">chevron_left</span></button>';
  // Last
  html += '<button class="pl-page-btn" data-page="' + totalPages + '"' + (page >= totalPages ? ' disabled' : '') + ' aria-label="الأخير"><span class="material-icons-outlined">last_page</span></button>';

  html += '</div></div>';
  el.innerHTML = html;

  el.querySelectorAll(".pl-page-btn:not([disabled])").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var p = parseInt(btn.getAttribute("data-page"), 10);
      if (p > 0 && p <= totalPages) {
        PL.state.currentPage = p;
        PL.render();
        PL.syncUrl();
        window.scrollTo({ top: document.querySelector(".pl-page").offsetTop - 100, behavior: "smooth" });
      }
    });
  });
};

// ========== RENDER ==========
PL.render = function () {
  var paginated = PL.getPaginated();
  var items = paginated.items;
  var total = paginated.total;

  // Results count
  PL.el.resultsCount.textContent = total;

  // Grid
  PL.el.grid.innerHTML = "";
  if (!items.length) {
    PL.el.grid.style.display = "none";
    PL.el.empty.style.display = "";
    PL.el.pagination.innerHTML = "";
    return;
  }
  PL.el.grid.style.display = "";
  PL.el.empty.style.display = "none";

  items.forEach(function (p) {
    PL.el.grid.insertAdjacentHTML("beforeend", buildProductCard(p));
  });
  attachProductCardEvents(PL.el.grid);

  // View mode
  PL.el.grid.className = "pl-grid";
  if (PL.state.viewMode === "list") PL.el.grid.classList.add("pl-grid-list");

  // Pagination
  PL.renderPagination(total, paginated.totalPages, paginated.page);
};

// ========== BUILD FILTER UI ==========
PL.getUniqueValues = function (key) {
  var seen = {};
  var values = [];
  PL.state.allProducts.forEach(function (p) {
    var v = String(p[key] || "").trim();
    if (v && !seen[v]) {
      seen[v] = true;
      values.push(v);
    }
  });
  values.sort();
  return values;
};

PL.buildCategoryFilters = function () {
  var cats = PL.getUniqueValues("category");
  var container = PL.el.catContainer;
  container.innerHTML = "";
  cats.forEach(function (cat) {
    var checked = PL.state.filters.category.indexOf(cat) > -1;
    var label = document.createElement("label");
    label.className = "pl-check-label";
    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = cat;
    if (checked) cb.checked = true;
    cb.addEventListener("change", function () {
      var arr = PL.state.filters.category;
      var idx = arr.indexOf(cat);
      if (cb.checked) { if (idx === -1) arr.push(cat); }
      else { if (idx > -1) arr.splice(idx, 1); }
      PL.applyFilters();
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(" " + cat));
    container.appendChild(label);
  });
};

PL.buildBrandFilters = function () {
  var brands = PL.getUniqueValues("brand");
  var container = PL.el.brandContainer;
  container.innerHTML = "";
  brands.forEach(function (brand) {
    var checked = PL.state.filters.brand.indexOf(brand) > -1;
    var label = document.createElement("label");
    label.className = "pl-check-label";
    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = brand;
    if (checked) cb.checked = true;
    cb.addEventListener("change", function () {
      var arr = PL.state.filters.brand;
      var idx = arr.indexOf(brand);
      if (cb.checked) { if (idx === -1) arr.push(brand); }
      else { if (idx > -1) arr.splice(idx, 1); }
      PL.applyFilters();
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(" " + brand));
    container.appendChild(label);
  });
};

// ========== FILTER COUNT ==========
PL.updateActiveFilterCount = function () {
  var f = PL.state.filters;
  var count = 0;
  if (f.search) count++;
  if (f.category.length) count++;
  if (f.brand.length) count++;
  if (f.priceMin || f.priceMax) count++;
  if (f.rating !== "0") count++;
  if (f.discount !== "0") count++;
  if (f.availOnly) count++;
  PL.state.activeFilterCount = count;
  PL.el.filterCount.textContent = count;
  PL.el.filterCount.style.display = count > 0 ? "" : "none";
};

// ========== SYNC UI FROM STATE ==========
PL.syncFilterUI = function () {
  var f = PL.state.filters;

  // Search
  if (PL.el.searchInput.value !== f.search) PL.el.searchInput.value = f.search;

  // Price
  if (PL.el.priceMin.value !== f.priceMin) PL.el.priceMin.value = f.priceMin;
  if (PL.el.priceMax.value !== f.priceMax) PL.el.priceMax.value = f.priceMax;

  // Category checkboxes
  PL.el.catContainer.querySelectorAll("input[type=checkbox]").forEach(function (cb) {
    cb.checked = f.category.indexOf(cb.value) > -1;
  });

  // Brand checkboxes
  PL.el.brandContainer.querySelectorAll("input[type=checkbox]").forEach(function (cb) {
    cb.checked = f.brand.indexOf(cb.value) > -1;
  });

  // Rating
  PL.el.ratingRadios.forEach(function (r) {
    r.checked = r.value === f.rating;
  });

  // Discount
  PL.el.discountRadios.forEach(function (r) {
    r.checked = r.value === f.discount;
  });

  // Avail
  if (PL.el.availCheck) PL.el.availCheck.checked = f.availOnly;

  // Sort
  PL.el.sortSelect.value = PL.state.sortBy;

  // View
  PL.el.viewBtns.forEach(function (btn) {
    btn.classList.toggle("active", btn.getAttribute("data-view") === PL.state.viewMode);
  });
};

// ========== LOADING STATE ==========
PL.showLoading = function () {
  PL.el.loading.style.display = "";
  PL.el.grid.style.display = "none";
  PL.el.empty.style.display = "none";
};

PL.hideLoading = function () {
  PL.el.loading.style.display = "none";
  PL.el.grid.style.display = "";
};

// ========== SKELETON ==========
PL.renderSkeleton = function () {
  if (!PL.el.grid) return;
  var html = "";
  for (var si = 0; si < 20; si++) {
    html += '<div class="pl-skeleton-card"><div class="pl-skeleton-img"></div><div class="pl-skeleton-line pl-skeleton-title"></div><div class="pl-skeleton-line pl-skeleton-price"></div></div>';
  }
  PL.el.grid.innerHTML = html;
  PL.el.grid.style.display = "";
  PL.el.loading.style.display = "none";
};

// ========== EVENTS ==========
PL.bindEvents = function () {
  // Mobile filter toggle
  PL.el.filterToggle.addEventListener("click", function () {
    if (PL.el.filterDrawer.innerHTML === "") {
      PL.el.filterDrawer.innerHTML = PL.el.sidebar.innerHTML;
      // Re-bind events inside drawer
      PL.bindDrawerEvents(PL.el.filterDrawer);
    }
    PL.el.filterOverlay.classList.add("active");
    PL.el.filterDrawer.classList.add("active");
    document.body.style.overflow = "hidden";
  });

  PL.el.sidebarClose.addEventListener("click", PL.closeMobileFilter);
  PL.el.filterOverlay.addEventListener("click", PL.closeMobileFilter);

  // Search (debounced)
  var debounceTimer;
  PL.el.searchInput.addEventListener("input", function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      PL.state.filters.search = PL.el.searchInput.value.trim();
      PL.applyFilters();
    }, 300);
  });

  // Price range
  PL.el.priceApply.addEventListener("click", function () {
    PL.state.filters.priceMin = PL.el.priceMin.value.trim();
    PL.state.filters.priceMax = PL.el.priceMax.value.trim();
    PL.applyFilters();
  });

  // Rating
  PL.el.ratingRadios.forEach(function (r) {
    r.addEventListener("change", function () {
      if (r.checked) {
        PL.state.filters.rating = r.value;
        PL.applyFilters();
      }
    });
  });

  // Discount
  PL.el.discountRadios.forEach(function (r) {
    r.addEventListener("change", function () {
      if (r.checked) {
        PL.state.filters.discount = r.value;
        PL.applyFilters();
      }
    });
  });

  // Availability
  PL.el.availCheck.addEventListener("change", function () {
    PL.state.filters.availOnly = PL.el.availCheck.checked;
    PL.applyFilters();
  });

  // Sort
  PL.el.sortSelect.addEventListener("change", function () {
    PL.state.sortBy = PL.el.sortSelect.value;
    PL.state.currentPage = 1;
    PL.render();
    PL.syncUrl();
  });

  // View toggle
  PL.el.viewBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      PL.state.viewMode = btn.getAttribute("data-view");
      PL.el.viewBtns.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      PL.render();
      PL.syncUrl();
    });
  });

  // Clear all
  PL.el.clearAll.addEventListener("click", function () {
    PL.state.filters = {
      search: "",
      category: [],
      brand: [],
      priceMin: "",
      priceMax: "",
      rating: "0",
      discount: "0",
      availOnly: false,
    };
    PL.state.sortBy = "default";
    PL.state.currentPage = 1;
    PL.syncFilterUI();
    PL.applyFilters();
  });

  // Empty state clear
  PL.el.emptyClear.addEventListener("click", function () {
    PL.el.clearAll.click();
  });

  // Filter group collapse
  document.querySelectorAll(".pl-filter-header").forEach(function (header) {
    header.addEventListener("click", function () {
      var body = header.nextElementSibling;
      if (!body) return;
      var isOpen = body.style.display !== "none";
      body.style.display = isOpen ? "none" : "";
      header.querySelector(".pl-filter-arrow").textContent = isOpen ? "expand_more" : "expand_less";
    });
  });

  // Resize — update perPage
  window.addEventListener("resize", function () {
    var newPerPage = PL.getPerPage();
    if (newPerPage !== PL.state.perPage) {
      PL.state.perPage = newPerPage;
      PL.state.currentPage = 1;
      PL.render();
    }
  });
};

PL.bindDrawerEvents = function (drawer) {
  // Close button inside drawer
  var closeBtn = drawer.querySelector(".pl-sidebar-close");
  if (closeBtn) closeBtn.addEventListener("click", PL.closeMobileFilter);

  // Search
  var searchInput = drawer.querySelector("#plSearchInput");
  if (searchInput) {
    var dt;
    searchInput.addEventListener("input", function () {
      clearTimeout(dt);
      dt = setTimeout(function () {
        PL.state.filters.search = searchInput.value.trim();
        PL.applyFilters();
        PL.closeMobileFilter();
      }, 300);
    });
  }

  // Price apply
  var priceApply = drawer.querySelector("#plPriceApply");
  if (priceApply) {
    priceApply.addEventListener("click", function () {
      var minInp = drawer.querySelector("#plPriceMin");
      var maxInp = drawer.querySelector("#plPriceMax");
      PL.state.filters.priceMin = minInp ? minInp.value.trim() : "";
      PL.state.filters.priceMax = maxInp ? maxInp.value.trim() : "";
      PL.applyFilters();
      PL.closeMobileFilter();
    });
  }

  // Checkboxes (categories, brands, availability)
  drawer.querySelectorAll("input[type=checkbox]").forEach(function (cb) {
    cb.addEventListener("change", function () {
      if (cb.id === "plAvailOnly") {
        PL.state.filters.availOnly = cb.checked;
      } else {
        var parent = cb.closest("#plFilterCategories, #plFilterBrands");
        if (!parent) return;
        var isCat = parent.id === "plFilterCategories";
        var arr = isCat ? PL.state.filters.category : PL.state.filters.brand;
        var idx = arr.indexOf(cb.value);
        if (cb.checked) { if (idx === -1) arr.push(cb.value); }
        else { if (idx > -1) arr.splice(idx, 1); }
      }
      PL.applyFilters();
      PL.closeMobileFilter();
    });
  });

  // Radios
  drawer.querySelectorAll('input[type=radio]').forEach(function (r) {
    r.addEventListener("change", function () {
      if (!r.checked) return;
      var name = r.getAttribute("name");
      if (name === "rating") PL.state.filters.rating = r.value;
      else if (name === "discount") PL.state.filters.discount = r.value;
      PL.applyFilters();
      PL.closeMobileFilter();
    });
  });

  // Clear all
  var clearBtn = drawer.querySelector(".pl-clear-all");
  if (clearBtn) clearBtn.addEventListener("click", function () {
    PL.el.clearAll.click();
    PL.closeMobileFilter();
  });

  // Collapse headers
  drawer.querySelectorAll(".pl-filter-header").forEach(function (header) {
    header.addEventListener("click", function () {
      var body = header.nextElementSibling;
      if (!body) return;
      var isOpen = body.style.display !== "none";
      body.style.display = isOpen ? "none" : "";
      var arrow = header.querySelector(".pl-filter-arrow");
      if (arrow) arrow.textContent = isOpen ? "expand_more" : "expand_less";
    });
  });
};

PL.closeMobileFilter = function () {
  PL.el.filterOverlay.classList.remove("active");
  PL.el.filterDrawer.classList.remove("active");
  document.body.style.overflow = "";
};

// ========== FETCH PRODUCTS ==========
PL.fetchProducts = async function () {
  var source;

  // Try Supabase first
  if (typeof getSupabaseClient === "function") {
    var client = getSupabaseClient();
    if (client) {
      try {
        var result = await client.from("products").select("*").order("created_at", { ascending: false });
        if (!result.error && Array.isArray(result.data)) {
          source = result.data.filter(function (r) { return r && typeof r.id !== "undefined"; });
          if (window.addProductToStore) source.forEach(function (p) { window.addProductToStore(p); });
        }
      } catch (e) {
        console.warn("Supabase fetch error:", e);
      }
    }
  }

  // Fallback to local store
  if (!source || !source.length) {
    source = window.BudaStore && typeof window.BudaStore.getAllProducts === "function"
      ? Object.values(window.BudaStore.getAllProducts()).filter(Boolean)
      : [];
  }

  // Taager integration
  if (window.TaagerIntegration) {
    try {
      var cc = (window.TaagerIntegration.getSelectedCountry() || {}).code;
      var tp = await window.TaagerIntegration.fetchTaagerProducts(cc);
      window.TaagerIntegration.mergeTaagerIntoStore(tp);
      source = source.concat(tp);
      var filtered = window.TaagerIntegration.filterByCountry(source, cc);
      if (filtered.length) source = filtered;
    } catch (e) {
      console.warn("Taager error:", e);
    }
  }

  // Filter by current country
  var currentCountry = (window.TaagerIntegration?.getSelectedCountry?.() || {}).code || "EG";
  source = (source || []).filter(function (p) {
    if (window.TaagerIntegration && typeof window.TaagerIntegration.matchesCountry === "function") {
      return window.TaagerIntegration.matchesCountry(p, currentCountry);
    }
    var pCountry = (p?.country || p?.country_code || "").toUpperCase();
    if (!pCountry) return true;
    return pCountry === currentCountry.toUpperCase();
  });

  // Demo fallback
  if (!source || !source.length) {
    source = PL_DEMO_PRODUCTS;
  }

  PL.state.allProducts = source;
};

// ========== INIT ==========
PL.init = async function () {
  var isPL = document.querySelector(".pl-page") !== null;
  if (!isPL) return;

  PL.cacheDom();
  PL.readUrlParams();

  // Show skeleton
  PL.renderSkeleton();

  // Fetch products
  await PL.fetchProducts();

  // Build filter UI
  PL.buildCategoryFilters();
  PL.buildBrandFilters();

  // Sync UI from state
  PL.syncFilterUI();

  // Bind events
  PL.bindEvents();

  // Apply initial filters
  PL.state.filtered = PL.state.allProducts.filter(function (p) { return PL.matchProduct(p); });
  PL.updateActiveFilterCount();

  // Read page from URL
  var pageParam = parseInt(new URLSearchParams(window.location.search).get("page"), 10);
  if (pageParam > 0) PL.state.currentPage = pageParam;

  // Render
  PL.render();
  PL.syncUrl();

  document.body.classList.remove("pl-loading");
};

document.addEventListener("DOMContentLoaded", function () {
  PL.init();
});
