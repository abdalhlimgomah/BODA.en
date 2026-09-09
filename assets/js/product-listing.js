/* ============================================
   Product Listing Page — Filters, Sort, Pagination
   ============================================ */

var PL = {};

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

  PL.state.allProducts = source || [];
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
