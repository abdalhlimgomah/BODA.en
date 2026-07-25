console.log("[category.js] loaded");
document.addEventListener("DOMContentLoaded", async function () {
  var catKey = new URLSearchParams(window.location.search).get("cat");
  if (!catKey) { window.location.href = "products.html"; return; }

  var categoryLabel = CATEGORY_LABEL_MAP[catKey.toLowerCase()] || catKey;

  // Render hero banner
  var heroBg = document.getElementById("catHeroBg");
  var titleEl = document.getElementById("catTitle");
  if (titleEl) titleEl.textContent = categoryLabel;

  // Find category image from HOME_CONFIG for banner
  var catImg = "";
  if (window.HOME_CONFIG && window.HOME_CONFIG.categories) {
    for (var ci = 0; ci < window.HOME_CONFIG.categories.length; ci++) {
      var c = window.HOME_CONFIG.categories[ci];
      if (c.name === categoryLabel || c.link.indexOf(catKey.toLowerCase()) !== -1) {
        catImg = c.img;
        break;
      }
    }
  }
  if (!catImg) catImg = "https://picsum.photos/seed/" + catKey + "-bg/800/300";

  if (heroBg) heroBg.style.backgroundImage = "url(" + catImg + ")";

  // ---- Products logic (adapted from main.js) ----
  var productsGrid = document.getElementById("productsGrid");
  var filterContainer = document.getElementById("filterContainer");
  var paginationEl = document.getElementById("pagination");
  var sidebarCats = document.getElementById("sidebarCats");
  if (!productsGrid || !filterContainer) return;

  var allProducts = [];
  var currentPage = 1;
  var currentFiltered = [];
  var PRODUCTS_PER_PAGE = 12;

  var categories = [
    "الكل", "إلكترونيات", "موبايلات وملحقاتها", "ملابس وأحذية",
    "منتجات تجميل وعناية", "عطور", "منتجات رياضية", "منزل ومطبخ",
    "مستلزمات المنزل", "مكتب ودراسة", "ساعات", "حفاضات وأطفال",
    "ألعاب", "كتب ومجلات", "حيوانات أليفة", "سيارات",
    "مجوهرات وإكسسوارات", "كاميرات وتصوير", "سماعات", "هدايا",
  ];

  function normalizeText(text) {
    return String(text || "").toLowerCase()
      .replace(/[أإآا]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي")
      .replace(/[ًٌٍَُِّْ]/g, "").trim();
  }

  function normalizeCategoryLabel(cat) {
    var v = String(cat || "").trim();
    var n = normalizeText(v);
    var map = {
      "ملابس وأحذية": "ملابس وأحذية", "ملابس": "ملابس وأحذية",
      "إلكترونيات": "إلكترونيات", "الكترونيات": "إلكترونيات",
      "جمال وعناية": "منتجات تجميل وعناية",
      "رياضة وترفيه": "منتجات رياضية",
      "منزل ومطبخ": "منزل ومطبخ",
      "منتجات عامة": "",
      "ملابس أطفال": "ملابس وأحذية",
      "تفاح": "",
    };
    if (map[v] !== undefined) return map[v];
    return v;
  }

  function getProductText(product) {
    var parts = [product.name, product.title, product.description, product.category, product.brand, product.type];
    if (Array.isArray(product.tags)) parts = parts.concat(product.tags);
    if (Array.isArray(product.categories)) parts = parts.concat(product.categories);
    return normalizeText(parts.filter(Boolean).join(" "));
  }

  var CATEGORY_KEYWORDS_LOCAL = {
    "إلكترونيات": ["هاتف", "جوال", "موبايل", "phone", "samsung", "iphone", "apple", "كمبيوتر", "laptop", "شاحن", "charger", "cable", "usb", "سماعة", "headphone", "بلوتوث", "bluetooth", "electronic", "جهاز"],
    "موبايلات وملحقاتها": ["جراب", "حافظة موبايل", "case", "cover", "شاحن موبايل", "power bank", "موبايل", "mobile", "هاتف", "جوال", "tablet", "samsung", "iphone", "xiaomi"],
    "ملابس وأحذية": ["قميص", "تيشيرت", "بنطلون", "جينز", "jeans", "فستان", "dress", "حذاء", "shoes", "sneakers", "ملابس", "clothes", "shirt", "jacket"],
    "منتجات تجميل وعناية": ["تجميل", "عناية", "كريم", "cream", "مكياج", "makeup", "beauty", "skincare", "شعر", "hair", "بشرة", "skin"],
    "عطور": ["عطر", "عطور", "perfume", "fragrance", "كولونيا", "cologne", "دهن عود", "oud", "بخور"],
    "منتجات رياضية": ["رياضي", "رياضة", "sport", "جيم", "gym", "fitness", "football", "weights", "yoga"],
    "منزل ومطبخ": ["منزل", "home", "مطبخ", "kitchen", "وسادة", "pillow", "مفروشات", "furniture", "سجاد"],
    "مستلزمات المنزل": ["أثاث", "furniture", "كنبة", "sofa", "طاولة", "table", "سرير", "bed", "ديكور", "decoration"],
    "مكتب ودراسة": ["قرطاسية", "stationery", "قلم", "pen", "دفتر", "notebook", "مكتب", "office", "حقيبة", "bag"],
    "ساعات": ["ساعة", "watch", "ساعات", "ساعه", "smartwatch"],
    "حفاضات وأطفال": ["حفاضات", "baby", "أطفال", "اطفال", "diapers", "pampers", "مولود", "newborn"],
    "ألعاب": ["لعبة", "لعبه", "toys", "games", "lego", "دمية", "doll"],
    "كتب ومجلات": ["كتاب", "books", "book", "مجلة", "magazine", "رواية", "novel"],
    "حيوانات أليفة": ["كلب", "dog", "قط", "cat", "حيوانات", "pet", "طعام كلاب", "dog food"],
    "سيارات": ["سيارة", "car", "زيت محرك", "motor oil", "بطارية سيارة", "إطارات", "tires"],
    "مجوهرات وإكسسوارات": ["مجوهرات", "jewelry", "إكسسوارات", "قلادة", "necklace", "خاتم", "ring", "نظارات", "glasses"],
    "كاميرات وتصوير": ["كاميرا", "camera", "تصوير", "photography", "عدسة", "lens", "gopro"],
    "سماعات": ["سماعة", "سماعات", "headphone", "earphone", "earbuds", "airpods", "speaker", "سماعة بلوتوث"],
    "هدايا": ["هدية", "هدايا", "gift", "طقم هدايا", "gift set"],
  };

  function findCategoryImg(catName) {
    if (!window.HOME_CONFIG || !window.HOME_CONFIG.categories) return "";
    for (var ci = 0; ci < window.HOME_CONFIG.categories.length; ci++) {
      var c = window.HOME_CONFIG.categories[ci];
      var mainName = c.name;
      var altNames = [mainName, normalizeText(mainName)];
      if (altNames.indexOf(normalizeText(catName)) !== -1) return c.img || "";
      if (catName.indexOf(mainName) !== -1 || mainName.indexOf(catName) !== -1) return c.img || "";
    }
    return "";
  }

  function applyCategoryFilter(selected) {
    currentPage = 1;
    if (selected === "الكل") {
      var originalCatLabel = CATEGORY_LABEL_MAP[catKey.toLowerCase()] || null;
      if (originalCatLabel && CATEGORY_KEYWORDS_LOCAL[originalCatLabel]) {
        var kws = CATEGORY_KEYWORDS_LOCAL[originalCatLabel];
        var seen = new Set();
        var exact = [];
        allProducts.forEach(function (p) {
          var cf = normalizeCategoryLabel(p.category);
          if (cf === originalCatLabel) { exact.push(p); seen.add(String(p.id)); }
        });
        var nameMatch = [];
        allProducts.forEach(function (p) {
          var id = String(p.id);
          if (seen.has(id)) return;
          var text = getProductText(p);
          for (var ki = 0; ki < kws.length; ki++) {
            if (text.indexOf(normalizeText(kws[ki])) !== -1) {
              nameMatch.push(p); seen.add(id); break;
            }
          }
        });
        currentFiltered = exact.concat(nameMatch);
      } else {
        currentFiltered = allProducts.slice();
      }
      renderProducts(currentFiltered);
      return;
    }

    var keywords = CATEGORY_KEYWORDS_LOCAL[selected] || [];
    var seen = new Set();
    var exact = [];

    allProducts.forEach(function (product) {
      var catField = normalizeCategoryLabel(product.category);
      if (catField === selected) {
        exact.push(product);
        seen.add(String(product.id));
      }
    });

    var nameMatch = [];
    allProducts.forEach(function (product) {
      var id = String(product.id);
      if (seen.has(id)) return;
      var text = getProductText(product);
      for (var ki = 0; ki < keywords.length; ki++) {
        if (text.indexOf(normalizeText(keywords[ki])) !== -1) {
          nameMatch.push(product);
          seen.add(id);
          break;
        }
      }
    });

    currentFiltered = exact.concat(nameMatch);
    renderProducts(currentFiltered);
  }

  function renderProducts(allItems) {
    if (!allItems.length) {
      productsGrid.innerHTML = '<div class="noon-muted">لا توجد منتجات في هذا القسم.</div>';
      if (paginationEl) paginationEl.innerHTML = "";
      return;
    }

    var start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    var pageItems = allItems.slice(start, start + PRODUCTS_PER_PAGE);

    var html = '<div class="noon-grid">';
    for (var pi = 0; pi < pageItems.length; pi++) {
      html += typeof buildProductCard === "function" ? buildProductCard(pageItems[pi]) : "<div>product</div>";
    }
    html += "</div>";
    productsGrid.innerHTML = html;

    if (typeof attachProductCardEvents === "function") {
      attachProductCardEvents(productsGrid);
    }

    renderPagination(allItems.length);
  }

  function renderPagination(total) {
    if (!paginationEl) return;
    var totalPages = Math.ceil(total / PRODUCTS_PER_PAGE);
    if (totalPages <= 1) { paginationEl.innerHTML = ""; return; }

    var parts = [];
    parts.push('<button type="button" class="page-btn page-nav" data-page="1"' + (currentPage === 1 ? " disabled" : "") + '>«</button>');
    parts.push('<button type="button" class="page-btn page-nav" data-page="' + (currentPage - 1) + '"' + (currentPage === 1 ? " disabled" : "") + '>‹</button>');

    var rangeStart = Math.max(1, currentPage - 2);
    var rangeEnd = Math.min(totalPages, currentPage + 2);

    if (rangeStart > 1) {
      parts.push('<button type="button" class="page-btn" data-page="1">1</button>');
      if (rangeStart > 2) parts.push('<span class="page-ellipsis">...</span>');
    }
    for (var p = rangeStart; p <= rangeEnd; p++) {
      parts.push('<button type="button" class="page-btn' + (p === currentPage ? " active" : "") + '" data-page="' + p + '">' + p + "</button>");
    }
    if (rangeEnd < totalPages) {
      if (rangeEnd < totalPages - 1) parts.push('<span class="page-ellipsis">...</span>');
      parts.push('<button type="button" class="page-btn" data-page="' + totalPages + '">' + totalPages + "</button>");
    }

    parts.push('<button type="button" class="page-btn page-nav" data-page="' + (currentPage + 1) + '"' + (currentPage === totalPages ? " disabled" : "") + '>›</button>');
    parts.push('<button type="button" class="page-btn page-nav" data-page="' + totalPages + '"' + (currentPage === totalPages ? " disabled" : "") + '>»</button>');

    paginationEl.innerHTML = parts.join("");
    paginationEl.querySelectorAll(".page-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        currentPage = parseInt(btn.getAttribute("data-page"), 10);
        renderProducts(currentFiltered);
        window.scrollTo({ top: productsGrid.offsetTop - 20, behavior: "smooth" });
      });
    });
  }

  function selectCategory(category) {
    filterContainer.querySelectorAll(".cat-chip-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-cat") === category);
    });
    if (sidebarCats) {
      sidebarCats.querySelectorAll(".sidebar-cat-btn").forEach(function (btn) {
        btn.classList.toggle("active", btn.getAttribute("data-cat") === category);
      });
    }
    applyCategoryFilter(category);
  }

  function renderFilters() {
    var html = categories.map(function (c) {
      var img = c === "الكل" ? "" : findCategoryImg(c);
      var activeClass = c === "الكل" ? " active" : "";
      if (img) {
        return '<button type="button" class="cat-chip-btn' + activeClass + '" data-cat="' + c + '"><img src="' + img + '" alt="" loading="lazy" onerror="this.style.display=\'none\'"><span>' + c + "</span></button>";
      }
      return '<button type="button" class="cat-chip-btn' + activeClass + '" data-cat="' + c + '"><span>' + c + "</span></button>";
    }).join("");
    filterContainer.innerHTML = html;

    filterContainer.querySelectorAll(".cat-chip-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectCategory(btn.getAttribute("data-cat"));
      });
    });
  }

  function renderSidebar() {
    if (!sidebarCats) return;
    sidebarCats.innerHTML = categories.map(function (c) {
      var activeClass = c === "الكل" ? " active" : "";
      return '<button type="button" class="sidebar-cat-btn' + activeClass + '" data-cat="' + c + '">' + c + "</button>";
    }).join("");
    sidebarCats.querySelectorAll(".sidebar-cat-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectCategory(btn.getAttribute("data-cat"));
      });
    });
  }

  async function fetchProducts() {
    var selectedCountry = window.TaagerIntegration ? window.TaagerIntegration.getSelectedCountry() : null;
    var countryCode = selectedCountry ? selectedCountry.code : null;

    if (window.supabaseClient && typeof window.supabaseClient.fetchAllProductsWithTaager === "function") {
      try {
        allProducts = await window.supabaseClient.fetchAllProductsWithTaager(countryCode);
      } catch (e) {
        console.warn("[category] fetch failed", e);
        allProducts = window.BudaStore ? Object.values(window.BudaStore.getAllProducts()) : [];
      }
    } else {
      allProducts = window.BudaStore ? Object.values(window.BudaStore.getAllProducts()) : [];
    }
    console.log("[category] loaded", allProducts.length, "products for catKey:", catKey);

    currentFiltered = allProducts.slice();
    renderProducts(currentFiltered);
  }

  // Init
  renderFilters();
  renderSidebar();
  await fetchProducts();
});

