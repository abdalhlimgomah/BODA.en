/* ============================================
   Category Landing Page — Dynamic sections
   Data source: Supabase (+ Taager cache for auto sections only)
   ============================================ */

// ========== CONSTANTS ==========
var CL_SLIDE_INTERVAL = 4000;
var CL_PRODUCTS_PER_SECTION = 40;

// ========== STATE ==========
var CL = {};
CL.contentEl = null;
CL.category = null;
CL.banners = [];
CL.sections = [];
CL.brands = [];
CL.collections = [];
CL.allProducts = [];
CL.heroIndex = 0;
CL.heroTimer = null;
CL.heroProgressTimer = null;

// ========== UTILITY ==========
function clGetSlug() {
  var params = new URLSearchParams(window.location.search);
  return (params.get("slug") || "").trim();
}

function clGetSupabase() {
  if (typeof getSupabaseClient === "function") return getSupabaseClient();
  if (window.supabaseClient && typeof window.supabaseClient.from === "function") return window.supabaseClient;
  if (window.supabase && typeof window.supabase.createClient === "function") return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  return null;
}

function clGetCountryCode() {
  try {
    var cc = localStorage.getItem('userCountry');
    if (cc) return cc.toUpperCase();
    if (window.TaagerIntegration && typeof window.TaagerIntegration.getSelectedCountry === 'function') {
      var sel = window.TaagerIntegration.getSelectedCountry();
      if (sel && sel.code) return sel.code.toUpperCase();
    }
  } catch (e) {}
  return 'EG';
}

function clGetAllProducts() {
  var taager = [];
  if (window.TaagerIntegration && typeof window.TaagerIntegration.getCachedProducts === "function") {
    var cached = window.TaagerIntegration.getCachedProducts();
    if (cached && Array.isArray(cached) && cached.length >= 4) taager = cached;
  }
  var merged = [].concat(taager);
  var seen = {};
  for (var mi = 0; mi < merged.length; mi++) { if (merged[mi]) seen[merged[mi].id] = true; }
  var store = window.BudaStore;
  if (store && typeof store.getAllProducts === "function") {
    var all = store.getAllProducts();
    if (all && typeof all === "object") {
      var list = Array.isArray(all) ? all : Object.values(all).filter(Boolean);
      for (var si = 0; si < list.length; si++) {
        var sp = list[si];
        if (sp && !seen[sp.id]) {
          if (!sp.available_countries) sp.available_countries = ["EG", "SA"];
          merged.push(sp);
        }
      }
    }
  }
  return merged;
}

var CL_NAME_KEYWORDS = {
  "smart-watches": ["ساع", "watch", "wearable", "smart band", "smart watch", "ساعة", "سوار"],
  "headphones": ["سماع", "headphone", "earphone", "ear bud", "earbud", "audio", "سماعة", "سمّاعة", "بلوتوث", "مكبر"],
  "shoes": ["حذاء", "أحذية", "احذية", "shoe", "sneaker", "footwear", "جزمة", "boot"],
  "clothes": ["ملابس", "clothing", "apparel", "تيشيرت", "t-shirt", "shirt", "قميص", "بنطلون", "pants", "جينز", "jeans", "فستان", "dress", "موضة", "fashion"],
};

var CL_CAT_KEYWORDS = {
  "smart-watches": ["ساعات", "watch", "wearable", "smart band", "smart watch", "إلكترونيات", "الكترونيات", "electronics", "تقنية", "tech"],
  "headphones": ["سماعات", "headphone", "earphone", "audio", "إلكترونيات", "الكترونيات", "electronics", "تقنية", "tech"],
  "shoes": ["أحذية", "احذية", "shoes", "shoe", "footwear", "حذاء", "sneaker", "boot", "جزمة"],
  "clothes": ["ملابس", "clothes", "clothing", "fashion", "apparel", "أزياء", "موضة", "لباس", "تيشيرت", "قميص", "بنطلون", "جينز"],
};

function clGetKeywordsForSlug(slug) {
  if (CL_CAT_KEYWORDS[slug] || CL_NAME_KEYWORDS[slug]) return CL_CAT_KEYWORDS[slug] || CL_NAME_KEYWORDS[slug];
  if (!CL.category) return null;
  var kw = [];
  var cn = CL.category.name || "";
  if (cn) kw.push(cn.toLowerCase());
  kw.push(slug.toLowerCase().replace(/[-_]/g, " "));
  var nw = cn.split(/\s+/);
  for (var _i = 0; _i < nw.length; _i++) { if (nw[_i].length > 2) kw.push(nw[_i].toLowerCase()); }
  return kw;
}

function clGetImage(product) {
  if (window.getImage) return window.getImage(product);
  if (window.BudaStore && typeof window.BudaStore.getImagePath === "function") return window.BudaStore.getImagePath(product.image || "");
  return product.image || "";
}

function clSkeletonHTML() {
  return '<div class="cl-skeleton-wrap">' +
    '<div class="cl-sk-hero"><div class="cl-sk-shimmer"></div></div>' +
    '<div class="cl-sk-section"><div class="cl-sk-head"><span class="cl-sk-shimmer" style="width:160px;height:18px"></span></div><div class="cl-sk-grid"><div class="cl-sk-card"></div><div class="cl-sk-card"></div><div class="cl-sk-card"></div><div class="cl-sk-card"></div><div class="cl-sk-card"></div><div class="cl-sk-card"></div></div></div>' +
    '<div class="cl-sk-section"><div class="cl-sk-head"><span class="cl-sk-shimmer" style="width:140px;height:18px"></span></div><div class="cl-sk-brands"><div class="cl-sk-brand"></div><div class="cl-sk-brand"></div><div class="cl-sk-brand"></div><div class="cl-sk-brand"></div></div></div>' +
    "</div>";
}

// ========== SUPABASE LOADING ==========
async function clLoadCategory() {
  var slug = clGetSlug();
  if (!slug) return null;
  try {
    var client = clGetSupabase();
    if (!client) return null;
    var cc = clGetCountryCode();
    var { data, error } = await client.from("categories").select("*").eq("slug", slug).eq("country_code", cc).limit(1).single();
    if (error && error.details !== "The result contains 0 rows") console.warn("[CL] cat lookup:", error);
    if (data) return data;
    var { data: list, error: err2 } = await client.from("categories").select("*").ilike("slug", slug).eq("country_code", cc).limit(1);
    if (!err2 && list && list.length) return list[0];
    return null;
  } catch (e) { return null; }
}

async function clLoadBanners(categoryId) {
  try {
    var client = clGetSupabase();
    if (!client) return [];
    var cc = clGetCountryCode();
    var { data, error } = await client.from("category_banners").select("*").eq("category_id", categoryId).eq("is_active", true).eq("country_code", cc).order("sort_order", { ascending: true });
    if (error) return [];
    return data || [];
  } catch (e) { return []; }
}

async function clLoadSections(categoryId) {
  try {
    var client = clGetSupabase();
    if (!client) return [];
    var cc = clGetCountryCode();
    var { data, error } = await client.from("category_sections").select("*").eq("category_id", categoryId).eq("is_active", true).eq("country_code", cc).order("sort_order", { ascending: true });
    if (error) return [];
    return data || [];
  } catch (e) { return []; }
}

async function clLoadSectionProducts(sectionId) {
  try {
    var client = clGetSupabase();
    if (!client) return [];
    var cc = clGetCountryCode();
    var { data: sp, error } = await client.from("category_section_products").select("product_id").eq("section_id", sectionId).eq("country_code", cc).order("sort_order", { ascending: true });
    if (error || !sp) return [];
    var ids = sp.map(function (r) { return r.product_id; }).filter(Boolean);
    if (!ids.length) return [];
    var { data: products } = await client.from("products").select("*").in("id", ids);
    if (products && products.length) {
      products = products.filter(function (p) {
        if (p.available_countries && Array.isArray(p.available_countries)) {
          return p.available_countries.indexOf(cc) !== -1 || p.available_countries.indexOf('ALL') !== -1;
        }
        if (p.country_code) return p.country_code.toUpperCase() === cc;
        if (p.country) return p.country.toUpperCase() === cc;
        return true;
      });
    }
    return products || [];
  } catch (e) { return []; }
}

async function clLoadBrands(categoryId) {
  try {
    var client = clGetSupabase();
    if (!client) return [];
    var cc = clGetCountryCode();
    var { data, error } = await client.from("category_brands").select("brand_id, brands(*)").eq("category_id", categoryId).eq("country_code", cc).order("sort_order", { ascending: true });
    if (error || !data) return [];
    return data.map(function (r) { return r.brands; }).filter(Boolean);
  } catch (e) { return []; }
}

async function clLoadCollections(categoryId) {
  try {
    var client = clGetSupabase();
    if (!client) return [];
    var cc = clGetCountryCode();
    var { data, error } = await client.from("featured_collections").select("*").eq("category_id", categoryId).eq("is_active", true).eq("country_code", cc).order("sort_order", { ascending: true });
    if (error) return [];
    return data || [];
  } catch (e) { return []; }
}

function clGetAutoSectionProducts(section) {
  var all = CL.allProducts || clGetAllProducts();
  if (!all.length) return [];
  var slug = CL.category && CL.category.slug ? CL.category.slug : "";
  var slugKw = slug ? clGetKeywordsForSlug(slug) : null;
  var rules = section.auto_rules || {};
  var cc = clGetCountryCode();
  var filtered = [].concat(all).filter(function (p) {
    if (slugKw) {
      var pc = (p.category || "").toLowerCase();
      var pn = (p.name || "").toLowerCase();
      var catMatch = slugKw.some(function (kw) { return pc.indexOf(kw) > -1; });
      var nameMatch = slugKw.some(function (kw) { return pn.indexOf(kw) > -1; });
      if (!catMatch && !nameMatch) return false;
    }
    if (p.available_countries && Array.isArray(p.available_countries)) {
      return p.available_countries.indexOf(cc) !== -1 || p.available_countries.indexOf('ALL') !== -1;
    }
    if (p.country_code) return p.country_code.toUpperCase() === cc;
    if (p.country) return p.country.toUpperCase() === cc;
    return true;
  });
  if (rules.discount_min) {
    filtered = filtered.filter(function (p) {
      var rp = resolvePrice(p);
      return rp.hasDiscount && rp.discountPercent >= Number(rules.discount_min);
    });
  }
  if (rules.rating_min) {
    filtered = filtered.filter(function (p) {
      var rr = resolveRating(p);
      return rr.rating >= Number(rules.rating_min);
    });
  }
  var sortKey = rules.sort_by || "default";
  if (sortKey === "rating") {
    filtered.sort(function (a, b) { return (resolveRating(b).rating || 0) - (resolveRating(a).rating || 0); });
  } else if (sortKey === "price_asc") {
    filtered.sort(function (a, b) { return (resolvePrice(a).finalPrice || 0) - (resolvePrice(b).finalPrice || 0); });
  } else if (sortKey === "price_desc") {
    filtered.sort(function (a, b) { return (resolvePrice(b).finalPrice || 0) - (resolvePrice(a).finalPrice || 0); });
  } else if (sortKey === "random") {
    for (var si = filtered.length - 1; si > 0; si--) {
      var r = Math.floor(Math.random() * (si + 1));
      var tmp = filtered[si]; filtered[si] = filtered[r]; filtered[r] = tmp;
    }
  } else {
    filtered.sort(function (a, b) { return (resolvePrice(b).discountPercent || 0) - (resolvePrice(a).discountPercent || 0); });
  }
  var count = section.display_count || CL_PRODUCTS_PER_SECTION;
  var offset = (section._offset || 0) * count;
  return filtered.slice(offset, offset + count);
}

// ========== UPDATE BREADCRUMB ==========
function clUpdateBreadcrumb(name) {
  var el = document.getElementById("clBreadcrumbCurrent");
  if (el) el.textContent = escapeHtml(name || "");
}

// ========== RENDER HERO BANNER ==========
function clRenderHero(banners) {
  if (!banners || !banners.length || !CL.contentEl) return;
  var slidesHtml = "", dotsHtml = "";
  for (var si = 0; si < banners.length; si++) {
    var b = banners[si];
    var imgUrl = b.image_url || b.image || "";
    var title = b.title || "";
    var subtitle = b.subtitle || "";
    slidesHtml +=
      '<div class="cl-hero-slide' + (si === 0 ? "" : "") +
      '" data-idx="' + si +
      '" style="background-image:url(\'' + imgUrl + '\')">' +
      '<div class="cl-hero-content">' +
      (title ? '<h2 class="cl-hero-title">' + escapeHtml(title) + "</h2>" : "") +
      (subtitle ? '<p class="cl-hero-subtitle">' + escapeHtml(subtitle) + "</p>" : "") +
      '<a class="cl-hero-btn" href="' + escapeHtml(b.link_url || b.link || "#") + '">' +
      escapeHtml(b.button_text || "استكشف الآن") + "</a>" +
      "</div></div>";
    dotsHtml += '<span class="cl-hero-dot' + (si === 0 ? " active" : "") + '" data-idx="' + si + '"></span>';
  }
  var html =
    '<div class="cl-hero cl-fade" id="cl-hero">' +
    '<div class="cl-hero-track" id="cl-hero-track">' + slidesHtml + "</div>" +
    (banners.length > 1
      ? '<button class="cl-hero-arrow cl-hero-arrow-prev" aria-label="السابق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button><button class="cl-hero-arrow cl-hero-arrow-next" aria-label="التالي"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>' +
        '<div class="cl-hero-dots">' + dotsHtml + "</div>"
      : "") +
    "</div>";
  var temp = document.createElement("div");
  temp.innerHTML = html;
  CL.contentEl.appendChild(temp.firstElementChild);
  if (banners.length > 1) clInitHero();
}

function clInitHero() {
  var track = document.getElementById("cl-hero-track");
  var hero = document.getElementById("cl-hero");
  if (!track || !hero) return;
  var slides = Array.from(track.querySelectorAll(".cl-hero-slide"));
  var dots = Array.from(hero.querySelectorAll(".cl-hero-dot"));
  var prevBtn = hero.querySelector(".cl-hero-arrow-prev");
  var nextBtn = hero.querySelector(".cl-hero-arrow-next");
  if (!slides.length) return;

  CL.heroIndex = 0;
  var total = slides.length;

  function goTo(idx) {
    var target = ((idx % total) + total) % total;
    CL.heroIndex = target;
    track.style.transform = "translateX(-" + (target * 100) + "%)";
    dots.forEach(function (d) { d.classList.remove("active"); });
    if (dots[target]) dots[target].classList.add("active");
  }

  function next() { goTo(CL.heroIndex + 1); }
  function prev() { goTo(CL.heroIndex - 1); }

  function startAuto() {
    stopAuto();
    CL.heroTimer = setInterval(next, CL_SLIDE_INTERVAL);
  }
  function stopAuto() {
    if (CL.heroTimer) { clearInterval(CL.heroTimer); CL.heroTimer = null; }
  }

  if (nextBtn) nextBtn.addEventListener("click", function () { stopAuto(); next(); setTimeout(startAuto, CL_SLIDE_INTERVAL + 500); });
  if (prevBtn) prevBtn.addEventListener("click", function () { stopAuto(); prev(); setTimeout(startAuto, CL_SLIDE_INTERVAL + 500); });

  dots.forEach(function (dot) {
    dot.addEventListener("click", function () {
      var idx = parseInt(dot.getAttribute("data-idx"), 10);
      if (!isNaN(idx)) { stopAuto(); goTo(idx); setTimeout(startAuto, CL_SLIDE_INTERVAL + 500); }
    });
  });

  var tch = { sx: 0, cx: 0, ok: false };
  hero.addEventListener("touchstart", function (e) {
    tch.sx = e.touches[0].clientX; tch.cx = e.touches[0].clientX; tch.ok = true; stopAuto();
  }, { passive: true });
  hero.addEventListener("touchmove", function (e) {
    if (!tch.ok) return; tch.cx = e.touches[0].clientX;
  }, { passive: true });
  hero.addEventListener("touchend", function () {
    if (!tch.ok) return; tch.ok = false;
    var diff = tch.sx - tch.cx;
    if (Math.abs(diff) > 40) { if (diff > 0) next(); else prev(); }
    setTimeout(startAuto, CL_SLIDE_INTERVAL + 500);
  }, { passive: true });

  hero.addEventListener("mouseenter", stopAuto);
  hero.addEventListener("mouseleave", function () { if (!tch.ok) startAuto(); });
  startAuto();
}

// ========== RENDER PRODUCT SECTIONS ==========
function clUpdateSectionGrid(gridEl, products) {
  if (!gridEl) return;
  gridEl.innerHTML = products.map(function (p) { return buildProductCard(p); }).join("");
  attachProductCardEvents(gridEl);
}

function clRenderProductSection(section) {
  if (!CL.contentEl) return;
  var html =
    '<section class="cl-section cl-fade" id="cl-section-' + (section.id || Math.random().toString(36).slice(2)) + '">' +
    (section.title ? '<div class="cl-section-head">' +
    '<h2 class="cl-section-title">' + escapeHtml(section.title) + "</h2>" +
    (section.view_all_link
      ? '<a class="cl-view-all" href="' + escapeHtml(section.view_all_link) + '">عرض الكل</a>'
      : '<a class="cl-view-all" href="product-listing.html?category=' + encodeURIComponent(CL.category?.slug || "") + '">عرض الكل</a>') +
    "</div>" : "") +
    '<div class="cl-section-grid" id="cl-grid-' + (section.id || "grid") + '"></div></section>';
  var temp = document.createElement("div");
  temp.innerHTML = html;
  var el = temp.firstElementChild;
  CL.contentEl.appendChild(el);
  var grid = el.querySelector(".cl-section-grid");
  if (!grid) return;

  var products = section._products || [];
  if (!products.length) {
    el.style.display = "none";
    return;
  }
  section._products_el = grid;
  clUpdateSectionGrid(grid, products);
}

// ========== RENDER BRANDS ==========
function clRenderBrands(brands) {
  if (!brands || !brands.length || !CL.contentEl) return;
  console.log("[CL] rendering brands:", brands.length);
  var html =
    '<section class="cl-section" id="cl-brands">' +
    '<div class="cl-section-head"><h2 class="cl-section-title">تسوق حسب الماركة</h2></div>' +
    '<div class="cl-brands-grid">';
  for (var bi = 0; bi < brands.length; bi++) {
    var b = brands[bi];
    var imgUrl = b.image || b.logo || b.logo_url || b.cover_image || b.cover_url || "";
    var name = b.name || "";
    html +=
      '<a class="cl-brand-card" href="brand-landing.html?slug=' + encodeURIComponent(b.slug || name) + '" title="' + escapeHtml(name) + '">' +
      '<div class="cl-brand-img-wrap">' +
      '<img src="' + imgUrl + '" alt="' + escapeHtml(name) + '" loading="lazy" onerror="this.src=\'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23eef2f6%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dominant-baseline=%22central%22 font-size=%2232%22 fill=%22%23999%22>'+encodeURIComponent(name.charAt(0))+'</text></svg>\'" />' +
      "</div></a>";
  }
  html += "</div></section>";
  var temp = document.createElement("div");
  temp.innerHTML = html;
  var el = temp.firstElementChild;
  CL.contentEl.appendChild(el);
}

// ========== RENDER COLLECTIONS ==========
function clRenderCollections(collections) {
  if (!collections || !collections.length || !CL.contentEl) return;
  console.log("[CL] rendering collections:", collections.length);
  var html =
    '<section class="cl-section" id="cl-collections">' +
    '<div class="cl-section-head"><h2 class="cl-section-title">تسوق حسب المجموعة</h2></div>' +
    '<div class="cl-collections">';
  for (var ci = 0; ci < collections.length && ci < 2; ci++) {
    var c = collections[ci];
    var imgUrl = c.image_url || c.image || "";
    var name = c.name || "";
    var link = c.link_url || c.link || "product-listing.html?collection=" + encodeURIComponent(c.slug || name);
    html +=
      '<a class="cl-collection-card" href="' + escapeHtml(link) + '">' +
      '<div class="cl-collection-img-wrap">' +
      '<img src="' + imgUrl + '" alt="' + escapeHtml(name) + '" loading="lazy" onerror="this.src=\'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23eef2f6%22 width=%22100%22 height=%22100%22/></svg>\'" />' +
      "</div>" +
      '<div class="cl-collection-overlay">' +
      '<h3 class="cl-collection-title">' + escapeHtml(name) + '</h3>' +
      '<span class="cl-collection-arrow material-icons-outlined">arrow_back</span>' +
      "</div></a>";
  }
  html += "</div></section>";
  var temp = document.createElement("div");
  temp.innerHTML = html;
  var el = temp.firstElementChild;
  console.log("[CL] collections section HTML length:", html.length, "created:", !!el);
  CL.contentEl.appendChild(el);
  if (el) console.log("[CL] collections in DOM:", document.getElementById("cl-collections") ? "YES" : "NO");
}

// ========== SKELETON LOADING ==========
function clShowSkeleton() {
  if (!CL.contentEl) return;
  CL.contentEl.innerHTML = clSkeletonHTML();
}

function clRemoveSkeleton() {
  var skeletons = CL.contentEl.querySelectorAll(".cl-skeleton-wrap");
  skeletons.forEach(function (s) { s.remove(); });
}

function clRenderEmptyState(message) {
  if (!CL.contentEl) return;
  clRemoveSkeleton();
  document.body.classList.remove("cl-loading");
  document.body.classList.add("cl-loaded");
  CL.contentEl.innerHTML =
    '<div class="noon-muted" style="padding:64px 16px;text-align:center">' +
    escapeHtml(message || "هذا القسم غير متاح حالياً.") +
    "</div>";
}

// ========== INTERSECTION OBSERVER ==========
function clInitAnimations() {
  var els = CL.contentEl.querySelectorAll(".cl-fade");
  if (!els.length) return;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("cl-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px 50px 0px" });
  els.forEach(function (el) { observer.observe(el); });
}

// ========== INIT ==========
CL.init = async function () {
  console.log("[CL] init started");
  var clContent = document.getElementById("clContent") || document.getElementById("cl-content");
  if (!clContent) { console.log("[CL] content element not found"); return; }
  CL.contentEl = clContent;
  CL.allProducts = clGetAllProducts();
  console.log("[CL] products count:", CL.allProducts.length, "(cache hit:", (CL.allProducts.length >= 4) + ")");

  // Trigger Taager fetch in background if no cached products yet
  if (CL.allProducts.length < 4 && window.TaagerIntegration && typeof window.TaagerIntegration.fetchTaagerProducts === "function") {
    window.TaagerIntegration.fetchTaagerProducts(clGetCountryCode()).then(function (products) {
      CL.allProducts = clGetAllProducts();
      if (CL.allProducts.length >= 4 && CL.sections && CL.sections.length) {
        for (var _pi = 0; _pi < CL.sections.length; _pi++) {
          var _ps = CL.sections[_pi];
          if (_ps.selection_mode === "manual") continue;
          _ps._products = clGetAutoSectionProducts(_ps);
          if (_ps._products_el) {
            clUpdateSectionGrid(_ps._products_el, _ps._products);
            if (_ps._products.length > 0) {
              var _se = _ps._products_el.closest(".cl-section");
              if (_se) _se.style.display = "";
            }
          }
        }
      }
    });
  }

  document.documentElement.lang = "ar";
  document.documentElement.dir = "rtl";
  if (window.BudaStore?.updateCartCount) window.BudaStore.updateCartCount();

  clShowSkeleton();

  var slug = clGetSlug();
  // لو في صفحة ذكية معرّفة للـ slug ده في اللوحة → ارسمها وسيب الدنيا ليها
  if (window.SmartPage && typeof window.SmartPage.tryRender === 'function') {
    var spRendered = false;
    try { spRendered = await window.SmartPage.tryRender({ slug: slug, pageType: 'category' }); }
    catch (spE) { spRendered = false; }
    if (spRendered) {
      var hmFooter = document.getElementById('hm-footer');
      if (hmFooter) hmFooter.style.display = 'none';
      console.log('[CL] smart page rendered for', slug); return;
    }
  }
  var loadOk = false;

  try {
    if (!slug) throw "no slug";
    CL.category = await Promise.race([
      clLoadCategory(),
      new Promise(function (_, rej) { setTimeout(function () { rej("timeout"); }, 4000); })
    ]);
    if (!CL.category) throw "not found";
    loadOk = true;
    console.log("[CL] category loaded from Supabase:", CL.category.name);
  } catch (e) {
    console.warn("[CL] category load failed, reason:", e);
    clRenderEmptyState();
    return;
  }

  console.log("[CL] category name:", CL.category.name);
  clUpdateBreadcrumb(CL.category.name);
  if (window.SEOEngine) SEOEngine.waitForCategory(CL.category);

  var catId = CL.category.id;
  var [banners, sections, brands, collections] = await Promise.all([
    clLoadBanners(catId), clLoadSections(catId), clLoadBrands(catId), clLoadCollections(catId),
  ]);
  CL.banners = banners;
  CL.brands = brands;
  CL.collections = collections;
  for (var si = 0; si < sections.length; si++) {
    var sec = sections[si];
    sec._offset = si;
    if (sec.selection_mode === "manual") {
      sec._products = await clLoadSectionProducts(sec.id);
    } else {
      sec._products = clGetAutoSectionProducts(sec);
    }
    sec.view_all_link = "product-listing.html?category=" + encodeURIComponent(slug || CL.category?.slug || "");
    CL.sections.push(sec);
  }

  console.log("[CL] sections count:", CL.sections.length, "banners:", CL.banners.length, "brands:", CL.brands.length);

  clRemoveSkeleton();
  document.body.classList.remove("cl-loading");
  document.body.classList.add("cl-loaded");
  console.log("[CL] skeleton removed");

  clRenderHero(CL.banners);
  console.log("[CL] hero rendered");

  for (var ri = 0; ri < CL.sections.length; ri++) {
    var sec = CL.sections[ri];
    console.log("[CL] rendering section:", sec.title, "products:", (sec._products || []).length);
    clRenderProductSection(sec);
  }

  try { clRenderBrands(CL.brands); } catch (e) { console.error("[CL] brands error:", e); }
  try { clRenderCollections(CL.collections); } catch (e) { console.error("[CL] collections error:", e); }
  console.log("[CL] content children after render:", CL.contentEl.children.length, "sections:", CL.contentEl.querySelectorAll(".cl-section").length);
  console.log("[CL] last child ID:", CL.contentEl.lastElementChild?.id || "none");

  if (!CL.contentEl.querySelector(".cl-hero") && !CL.contentEl.querySelector(".cl-section")) {
    console.warn("[CL] Supabase returned no content for this category");
    clRenderEmptyState("لا يوجد محتوى لهذا القسم بعد.");
    return;
  }

  clInitAnimations();

  document.addEventListener("boda:wishlist-updated", function () {
    syncWishlistButtons(document);
  });
  document.addEventListener("boda:products-updated", function () {
    CL.allProducts = clGetAllProducts();
    if (CL.sections && CL.sections.length) {
      for (var pi = 0; pi < CL.sections.length; pi++) {
        var ps = CL.sections[pi];
        if (ps.selection_mode === "manual") continue;
        ps._products = clGetAutoSectionProducts(ps);
        if (ps._products_el) {
          clUpdateSectionGrid(ps._products_el, ps._products);
          if (ps._products.length > 0) {
            var sectionEl = ps._products_el.closest(".cl-section");
            if (sectionEl) sectionEl.style.display = "";
          }
        } else if (ps._products.length > 0) {
          clRenderProductSection(ps);
        }
      }
    }
  });
};

document.addEventListener("DOMContentLoaded", function () {
  CL.init();
});
