/* ============================================
   Brand Landing Page — Dynamic Brand Showcase
   Data from Supabase: brands, brand_banners,
   brand_sections, promotional_banners
   ============================================ */

// ========== STATE ==========
var BL = {};
BL.brand = null;
BL.banners = [];
BL.sections = [];
BL.promoBanner = null;
BL.allProducts = [];
BL.brandProducts = [];
BL.contentEl = null;
BL.skeletonEl = null;
BL.sectionRenderedCount = 0;
BL.heroIndex = 0;
BL.heroTimer = null;
BL.heroAutoTimer = null;

// ========== URL HELPERS ==========
function getQueryParam(name) {
  var m = new RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
  return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
}

// ========== INTERSECTION OBSERVER ==========
var blObserver = null;
function initBLIntersectionObserver() {
  if (blObserver) blObserver.disconnect();
  blObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('bl-visible');
        blObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px 50px 0px' });
}
function observeBLElement(el) {
  if (blObserver) blObserver.observe(el);
}

// ========== SKELETON ==========
function blGetCountryCode() {
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

function showBLSkeleton() {
  var el = document.getElementById('blSkeleton');
  if (el) el.style.display = '';
  document.body.classList.add('bl-loading');
}
function hideBLSkeleton() {
  var el = document.getElementById('blSkeleton');
  if (el) el.style.display = 'none';
  document.body.classList.remove('bl-loading');
  document.body.classList.add('bl-loaded');
}
function renderBLEmptyState(message) {
  if (!BL.contentEl) return;
  hideBLSkeleton();
  BL.contentEl.innerHTML =
    '<div class="noon-muted" style="padding:64px 16px;text-align:center">' +
    String(message || 'هذه العلامة التجارية غير متاحة حالياً.')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') +
    '</div>';
}

// ========== FETCH BRAND ==========
async function fetchBrand(slug) {
  try {
    var client = getSupabaseClient();
    if (!client) return null;
    var cc = blGetCountryCode();
    var { data, error } = await client.from('brands').select('*').eq('slug', slug).eq('country_code', cc).limit(1).single();
    if (error || !data) {
      var { data: list, error: err2 } = await client.from('brands').select('*').ilike('slug', slug).eq('country_code', cc).limit(1);
      if (err2 || !list || !list.length) return null;
      return list[0];
    }
    return data;
  } catch (e) {
    console.warn('[BL] fetchBrand error:', e);
    return null;
  }
}

// ========== FETCH BANNERS ==========
async function fetchBrandBanners(brandId) {
  try {
    var client = getSupabaseClient();
    if (!client) return [];
    var cc = blGetCountryCode();
    var { data, error } = await client.from('brand_banners').select('*').eq('brand_id', brandId).eq('is_active', true).eq('country_code', cc).order('sort_order', { ascending: true });
    if (error || !data) return [];
    return data;
  } catch (e) {
    console.warn('[BL] fetchBrandBanners error:', e);
    return [];
  }
}

// ========== FETCH SECTIONS ==========
async function fetchBrandSections(brandId) {
  try {
    var client = getSupabaseClient();
    if (!client) return [];
    var cc = blGetCountryCode();
    var { data, error } = await client.from('brand_sections').select('*').eq('brand_id', brandId).eq('is_active', true).eq('country_code', cc).order('sort_order', { ascending: true });
    if (error || !data) return [];
    return data;
  } catch (e) {
    console.warn('[BL] fetchBrandSections error:', e);
    return [];
  }
}

// ========== FETCH SECTION PRODUCTS ==========
async function fetchSectionProducts(section) {
  var client = getSupabaseClient();
  if (!client) return [];
  try {
    var cc = blGetCountryCode();
    if (section.selection_mode === 'manual') {
      var { data: sp, error } = await client.from('brand_section_products').select('product_id').eq('section_id', section.id).eq('country_code', cc).order('sort_order', { ascending: true });
      if (error || !sp) return [];
      var products = [];
      for (var i = 0; i < sp.length; i++) {
        var pid = sp[i].product_id;
        var p = window.BudaStore ? window.BudaStore.getProductById(pid) : null;
        if (p) products.push(p);
      }
      return products.slice(0, section.display_count || 6);
    } else {
      var rules = section.auto_rules || {};
      var pool = BL.brandProducts.length ? BL.brandProducts : BL.allProducts;
      var filtered = pool.filter(function (p) {
        if (p.available_countries && Array.isArray(p.available_countries)) {
          if (p.available_countries.indexOf(cc) === -1 && p.available_countries.indexOf('ALL') === -1) return false;
        } else if (p.country_code && p.country_code.toUpperCase() !== cc) return false;
        else if (p.country && p.country.toUpperCase() !== cc) return false;
        if (rules.category) {
          var pc = (p.category || '').toLowerCase();
          var rc = String(rules.category).toLowerCase();
          if (pc.indexOf(rc) === -1) return false;
        }
        if (rules.price_min > 0 && (Number(p.price) || 0) < rules.price_min) return false;
        if (rules.price_max > 0 && (Number(p.price) || 0) > rules.price_max) return false;
        if (rules.discount_min > 0 || rules.discount_max < 100) {
          var rp = resolvePrice(p);
          var dp = rp.discountPercent || 0;
          if (rules.discount_min > 0 && dp < rules.discount_min) return false;
          if (rules.discount_max < 100 && dp > rules.discount_max) return false;
        }
        if (rules.rating_min > 0 && (Number(p.rating) || 0) < rules.rating_min) return false;
        return true;
      });
      if (rules.sort_by === 'discount') {
        filtered.sort(function (a, b) { return (resolvePrice(b).discountPercent || 0) - (resolvePrice(a).discountPercent || 0); });
      } else if (rules.sort_by === 'rating') {
        filtered.sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
      } else if (rules.sort_by === 'price') {
        filtered.sort(function (a, b) { return (a.price || 0) - (b.price || 0); });
      } else {
        filtered.sort(function () { return 0.5 - Math.random(); });
      }
      return filtered.slice(0, section.display_count || 6);
    }
  } catch (e) {
    console.warn('[BL] fetchSectionProducts error:', e);
    return [];
  }
}

// ========== FETCH PROMOTIONAL BANNER ==========
async function fetchPromotionalBanner(brandId, brandSlug) {
  try {
    var client = getSupabaseClient();
    if (!client) return null;
    var cc = blGetCountryCode();
    var { data, error } = await client.from('promotional_banners').select('*').eq('is_active', true).eq('country_code', cc).order('sort_order', { ascending: true });
    if (error || !data || !data.length) return null;
    var matched = null;
    for (var i = 0; i < data.length; i++) {
      var b = data[i];
      var bBrand = String(b.brand_id || b.brand_slug || '');
      if (bBrand === String(brandId) || bBrand === brandSlug) {
        matched = b;
        break;
      }
    }
    if (!matched) {
      for (var j = 0; j < data.length; j++) {
        if (!data[j].brand_id && !data[j].brand_slug) {
          matched = data[j];
          break;
        }
      }
    }
    return matched;
  } catch (e) {
    console.warn('[BL] fetchPromotionalBanner error:', e);
    return null;
  }
}

// ========== FETCH BRAND PRODUCTS ==========
async function fetchBrandProducts(brandName) {
  var all = [];
  if (window.BudaStore && window.BudaStore.getAllProducts) {
    var store = window.BudaStore.getAllProducts();
    for (var key in store) {
      if (store.hasOwnProperty(key)) all.push(store[key]);
    }
  }
  if (!all.length) {
    try {
      var client = getSupabaseClient();
      if (client) {
        var { data, error } = await client.from('products').select('*').limit(200);
        if (!error && data) all = data;
      }
    } catch (e) {}
  }
  if (!all.length && window.TaagerIntegration && typeof window.TaagerIntegration.getCachedProducts === "function") {
    all = window.TaagerIntegration.getCachedProducts() || [];
  }
  var term = String(brandName || '').trim().toLowerCase();
  if (!term) return all.slice(0, 50);
  return all.filter(function (p) {
    var haystack = ((p.brand || '') + ' ' + (p.name || '') + ' ' + (p.category || '') + ' ' + (p.description || '')).toLowerCase();
    return haystack.indexOf(term) > -1;
  }).slice(0, 50);
}

// ========== RENDER BREADCRUMB ==========
function renderBreadcrumb(brand) {
  var currentEl = document.getElementById('blBreadcrumbCurrent');
  var parentEl = document.getElementById('blBreadcrumbParent');
  if (currentEl) currentEl.textContent = brand.name || 'العلامة التجارية';
  if (parentEl) {
    parentEl.href = 'products.html?brand=' + encodeURIComponent(brand.slug || brand.name || '');
    parentEl.textContent = brand.name || 'المنتجات';
  }
  var titleEl = document.querySelector('title');
  if (titleEl) titleEl.textContent = (brand.name || 'العلامة التجارية') + ' - BudoQ';
}

// ========== RENDER HERO SLIDER ==========
function renderHeroSlider(banners) {
  if (!banners || !banners.length) return;
  var slidesHtml = '';
  var dotsHtml = '';
  for (var i = 0; i < banners.length; i++) {
    var b = banners[i];
    var bgColor = b.background_color || 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';
    slidesHtml +=
      '<div class="bl-hero-slide' + (i === 0 ? ' active' : '') + '" data-index="' + i + '">' +
      '<div class="bl-hero-slide-inner" style="background:' + bgColor + '">' +
      '<div class="bl-hero-overlay"></div>' +
      (b.image_url
        ? '<img class="bl-hero-img" src="' + b.image_url + '" alt="' + escapeHtml(b.title || '') + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '" />'
        : '') +
      '<div class="bl-hero-content">' +
      (b.title ? '<h2 class="bl-hero-title">' + escapeHtml(b.title) + '</h2>' : '') +
      (b.subtitle ? '<p class="bl-hero-subtitle">' + escapeHtml(b.subtitle) + '</p>' : '') +
      (b.cta_text && b.cta_link
        ? '<a class="bl-hero-cta" href="' + escapeHtml(b.cta_link) + '">' + escapeHtml(b.cta_text) + ' <span class="material-icons-outlined" style="font-size:18px;vertical-align:middle">arrow_back</span></a>'
        : '') +
      '</div></div></div>';
    dotsHtml += '<span class="bl-hero-dot' + (i === 0 ? ' active' : '') + '" data-index="' + i + '"></span>';
  }
  var html =
    '<div class="bl-hero-wrap bl-fade" id="blHero">' +
    '<div class="bl-hero-slider" id="blHeroSlider">' +
    slidesHtml +
    '</div>' +
    '<button class="bl-hero-arrow bl-hero-prev" type="button" aria-label="السابق"><span class="material-icons-outlined">chevron_right</span></button>' +
    '<button class="bl-hero-arrow bl-hero-next" type="button" aria-label="التالي"><span class="material-icons-outlined">chevron_left</span></button>' +
    '<div class="bl-hero-dots">' + dotsHtml + '</div>' +
    '</div>';
  var temp = document.createElement('div');
  temp.innerHTML = html;
  var el = temp.firstElementChild;
  var heroContainer = document.getElementById('blHeroContainer');
  if (heroContainer) {
    heroContainer.appendChild(el);
  } else {
    var insertAfter = BL.contentEl.querySelector('.bl-section-wrap:first-child');
    if (insertAfter) {
      BL.contentEl.insertBefore(el, insertAfter);
    } else {
      BL.contentEl.insertBefore(el, BL.contentEl.firstChild);
    }
  }
  initHeroCarousel(banners.length);
}

// ========== HERO CAROUSEL INIT ==========
function initHeroCarousel(slideCount) {
  var slider = document.getElementById('blHeroSlider');
  if (!slider || slideCount < 1) return;
  var slides = slider.querySelectorAll('.bl-hero-slide');
  var dots = document.querySelectorAll('.bl-hero-dot');
  BL.heroIndex = 0;
  var isAnimating = false;
  var autoInterval = 4000;

  function goTo(index) {
    if (isAnimating) return;
    isAnimating = true;
    var newIndex = ((index % slideCount) + slideCount) % slideCount;
    slides.forEach(function (s, i) {
      s.classList.toggle('active', i === newIndex);
    });
    dots.forEach(function (d, i) {
      d.classList.toggle('active', i === newIndex);
    });
    BL.heroIndex = newIndex;
    setTimeout(function () { isAnimating = false; }, 400);
  }

  function next() { goTo(BL.heroIndex + 1); }
  function prev() { goTo(BL.heroIndex - 1); }

  // Dots
  dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      var idx = parseInt(dot.getAttribute('data-index'), 10);
      if (!isNaN(idx)) goTo(idx);
    });
  });

  // Arrows
  var prevBtn = document.querySelector('.bl-hero-prev');
  var nextBtn = document.querySelector('.bl-hero-next');
  if (prevBtn) prevBtn.addEventListener('click', function (e) { e.preventDefault(); stopAuto(); prev(); startAuto(); });
  if (nextBtn) nextBtn.addEventListener('click', function (e) { e.preventDefault(); stopAuto(); next(); startAuto(); });

  // Auto play
  function startAuto() {
    stopAuto();
    BL.heroAutoTimer = setInterval(next, autoInterval);
  }
  function stopAuto() {
    if (BL.heroAutoTimer) { clearInterval(BL.heroAutoTimer); BL.heroAutoTimer = null; }
  }

  var heroWrap = document.getElementById('blHero');
  if (heroWrap) {
    heroWrap.addEventListener('mouseenter', stopAuto);
    heroWrap.addEventListener('mouseleave', startAuto);
  }

  // Touch swipe
  var touchData = { startX: 0, moved: false };
  if (slider) {
    slider.addEventListener('touchstart', function (e) {
      touchData.startX = e.changedTouches[0].screenX;
      touchData.moved = false;
      stopAuto();
    }, { passive: true });
    slider.addEventListener('touchmove', function (e) {
      var dx = e.changedTouches[0].screenX - touchData.startX;
      if (Math.abs(dx) > 10) touchData.moved = true;
    }, { passive: true });
    slider.addEventListener('touchend', function (e) {
      if (!touchData.moved) { startAuto(); return; }
      var dx = e.changedTouches[0].screenX - touchData.startX;
      if (Math.abs(dx) > 50) {
        if (dx > 0) prev(); else next();
      }
      setTimeout(startAuto, autoInterval + 500);
    }, { passive: true });
  }

  startAuto();
}

// ========== RENDER PROMOTIONAL BANNER ==========
function renderPromoBanner(banner) {
  if (!banner) return null;
  var html =
    '<div class="bl-promo-wrap bl-fade" id="blPromoBanner">' +
    '<a class="bl-promo-banner" href="' + escapeHtml(banner.link_url || '#') + '"' +
    (banner.background_color ? ' style="background:' + banner.background_color + '"' : '') +
    '>' +
    (banner.image_url
      ? '<img class="bl-promo-img" src="' + banner.image_url + '" alt="' + escapeHtml(banner.title || '') + '" loading="lazy" />'
      : '') +
    '<div class="bl-promo-content">' +
    (banner.title ? '<h3 class="bl-promo-title">' + escapeHtml(banner.title) + '</h3>' : '') +
    (banner.subtitle ? '<p class="bl-promo-subtitle">' + escapeHtml(banner.subtitle) + '</p>' : '') +
    (banner.cta_text ? '<span class="bl-promo-cta">' + escapeHtml(banner.cta_text) + '</span>' : '') +
    '</div></a></div>';
  var temp = document.createElement('div');
  temp.innerHTML = html;
  var el = temp.firstElementChild;
  var sections = BL.contentEl.querySelectorAll('.bl-section-wrap');
  if (sections.length >= 2) {
    sections[1].after(el);
  } else {
    BL.contentEl.appendChild(el);
  }
  observeBLElement(el);
  return el;
}

// ========== RENDER SECTION ==========
function renderBrandSection(section, products) {
  if (!products || !products.length) return null;
  var sectionId = 'bl-section-' + (section.id || 's-' + Math.random().toString(36).slice(2));
  var useCarousel = products.length > 4;
  var html =
    '<div class="bl-section-wrap bl-fade" id="' + sectionId + '">' +
    '<div class="bl-section-head">' +
    (section.badge ? '<span class="bl-section-badge">' + escapeHtml(section.badge) + '</span>' : '') +
    '<h2 class="bl-section-title">' + escapeHtml(section.title || '') + '</h2>' +
    (section.subtitle ? '<p class="bl-section-subtitle">' + escapeHtml(section.subtitle) + '</p>' : '') +
    '<a class="bl-section-link" href="products.html?brand=' + encodeURIComponent(BL.brand.slug || BL.brand.name || '') + '">عرض الكل <span class="material-icons-outlined" style="font-size:14px;vertical-align:middle">arrow_back</span></a>' +
    '</div>' +
    '<div class="bl-section-body">';
  if (useCarousel) {
    html +=
      '<div class="bl-carousel-wrap">' +
      '<button class="bl-carousel-nav bl-carousel-prev" type="button" aria-label="السابق"><span class="material-icons-outlined">chevron_right</span></button>' +
      '<div class="bl-carousel-track" id="blTrack-' + sectionId + '">';
    for (var ci = 0; ci < products.length; ci++) {
      html += buildProductCard(products[ci]);
    }
    html +=
      '</div>' +
      '<button class="bl-carousel-nav bl-carousel-next" type="button" aria-label="التالي"><span class="material-icons-outlined">chevron_left</span></button>' +
      '</div>';
  } else {
    html += '<div class="bl-grid" id="blTrack-' + sectionId + '">';
    for (var gi = 0; gi < products.length; gi++) {
      html += buildProductCard(products[gi]);
    }
    html += '</div>';
  }
  html += '</div></div>';
  var temp = document.createElement('div');
  temp.innerHTML = html;
  var el = temp.firstElementChild;
  BL.contentEl.appendChild(el);
  var track = el.querySelector('[id^="blTrack-"]');
  if (track) {
    attachProductCardEvents(track);
    if (useCarousel) enableCarouselDrag(track);
  }
  BL.sectionRenderedCount++;
  observeBLElement(el);
  return el;
}

// ========== RENDER MORE PRODUCTS ==========
function renderMoreProducts(products) {
  if (!products || !products.length) return null;
  var chunk = products.slice(0, 12);
  var sectionId = 'bl-more-products';
  var html =
    '<div class="bl-section-wrap bl-fade" id="' + sectionId + '">' +
    '<div class="bl-section-head">' +
    '<h2 class="bl-section-title">المزيد من ' + escapeHtml(BL.brand.name || 'المنتجات') + '</h2>' +
    '<a class="bl-section-link" href="products.html?brand=' + encodeURIComponent(BL.brand.slug || BL.brand.name || '') + '">عرض الكل <span class="material-icons-outlined" style="font-size:14px;vertical-align:middle">arrow_back</span></a>' +
    '</div>' +
    '<div class="bl-section-body"><div class="bl-grid">';
  for (var i = 0; i < chunk.length; i++) {
    html += buildProductCard(chunk[i]);
  }
  html += '</div></div></div>';
  var temp = document.createElement('div');
  temp.innerHTML = html;
  var el = temp.firstElementChild;
  BL.contentEl.appendChild(el);
  attachProductCardEvents(el);
  observeBLElement(el);
  return el;
}

// ========== CAROUSEL DRAG ==========
function enableCarouselDrag(container) {
  var dragData = { isDown: false, moved: false };
  var startX = 0, scrollLeft = 0;
  container.addEventListener('mousedown', function (e) {
    dragData.isDown = true;
    dragData.moved = false;
    container.classList.add('dragging');
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });
  container.addEventListener('mouseleave', function () {
    dragData.isDown = false;
    container.classList.remove('dragging');
  });
  container.addEventListener('mouseup', function () {
    dragData.isDown = false;
    container.classList.remove('dragging');
  });
  container.addEventListener('mousemove', function (e) {
    if (!dragData.isDown) return;
    e.preventDefault();
    var walk = (e.pageX - container.offsetLeft - startX) * 1.5;
    container.scrollLeft = scrollLeft - walk;
    if (Math.abs(walk) > 5) dragData.moved = true;
  });
  var wrap = container.closest('.bl-carousel-wrap');
  if (!wrap) return;
  var prev = wrap.querySelector('.bl-carousel-prev');
  var next = wrap.querySelector('.bl-carousel-next');
  if (!prev || !next) return;
  function updateNav() {
    prev.classList.toggle('visible', container.scrollLeft > 2);
    next.classList.toggle('visible', container.scrollLeft < container.scrollWidth - container.clientWidth - 2);
  }
  container.addEventListener('scroll', updateNav);
  setTimeout(updateNav, 100);
  function scrollBy(dir) {
    var cards = container.querySelectorAll('.noon-product-card');
    if (!cards.length) return;
    container.scrollBy({ left: dir * (cards[0].offsetWidth + 10), behavior: 'smooth' });
  }
  prev.addEventListener('click', function () { scrollBy(-1); });
  next.addEventListener('click', function () { scrollBy(1); });
}

// ========== INIT ==========
BL.init = async function () {
  BL.contentEl = document.getElementById('blContent');
  if (!BL.contentEl) return;
  BL.skeletonEl = document.getElementById('blSkeleton');
  showBLSkeleton();
  initBLIntersectionObserver();
  if (window.BudaStore && window.BudaStore.updateCartCount) {
    window.BudaStore.updateCartCount();
  }
  document.documentElement.lang = 'ar';
  document.documentElement.dir = 'rtl';

  var slug = getQueryParam('slug');

  // لو في صفحة ذكية معرّفة للـ slug ده في اللوحة → ارسمها وسيب الدنيا ليها
  if (window.SmartPage && typeof window.SmartPage.tryRender === 'function') {
    var spRendered = false;
    try { spRendered = await window.SmartPage.tryRender({ slug: slug, pageType: 'brand' }); }
    catch (spE) { spRendered = false; }
    if (spRendered) {
      var hmFooter = document.getElementById('hm-footer');
      if (hmFooter) hmFooter.style.display = 'none';
      console.log('[BL] smart page rendered for', slug); return;
    }
  }

  try {
    if (!slug) throw "no slug";
    BL.brand = await Promise.race([
      fetchBrand(slug),
      new Promise(function (_, rej) { setTimeout(function () { rej("timeout"); }, 4000); })
    ]);
    if (!BL.brand) throw "not found";
  } catch (e) {
    console.warn('[BL] brand load failed, reason:', e);
    renderBLEmptyState();
    return;
  }
  renderBreadcrumb(BL.brand);
  if (window.SEOEngine) SEOEngine.waitForBrand(BL.brand);

  if (window.ProductSEO && BL.brand) {
    var brandContainer = document.getElementById("blContent") || document.querySelector(".bl-content") || document.body;
    var faqDiv = document.createElement("div");
    faqDiv.id = "bl-faq-container";
    faqDiv.style.display = "none";
    brandContainer.parentNode.insertBefore(faqDiv, brandContainer.nextSibling);

    ProductSEO.getBrandSEO(BL.brand.slug || BL.brand.name || "").then(function (seoData) {
      if (seoData) {
        ProductSEO.applyBrandSEO(BL.brand, seoData);
        ProductSEO.renderBrandFAQ(seoData, "bl-faq-container");
      }
    });
  }

  // 2. Fetch background data in parallel
  var [banners, sections, promoBanner] = await Promise.all([
    fetchBrandBanners(BL.brand.id),
    fetchBrandSections(BL.brand.id),
    fetchPromotionalBanner(BL.brand.id, BL.brand.slug || slug)
  ]);
  BL.banners = banners;
  BL.sections = sections;
  BL.promoBanner = promoBanner;

  // 3. Fetch all products & brand products
  var allProducts = [];
  if (window.BudaStore && window.BudaStore.getAllProducts) {
    var store = window.BudaStore.getAllProducts();
    for (var key in store) {
      if (store.hasOwnProperty(key)) allProducts.push(store[key]);
    }
  }
  if (!allProducts.length) {
    try {
      var client = getSupabaseClient();
      if (client) {
        var { data } = await client.from('products').select('*').limit(200);
        if (data) allProducts = data;
      }
    } catch (e) {}
  }
  if (!allProducts.length && window.TaagerIntegration && typeof window.TaagerIntegration.getCachedProducts === "function") {
    allProducts = window.TaagerIntegration.getCachedProducts() || [];
  }
  BL.allProducts = allProducts;

  var brandTerm = String(BL.brand.name || '').trim().toLowerCase();
  BL.brandProducts = allProducts.filter(function (p) {
    var haystack = ((p.brand || '') + ' ' + (p.name || '') + ' ' + (p.category || '')).toLowerCase();
    return haystack.indexOf(brandTerm) > -1;
  });

  // 4. Clear skeleton, render hero
  BL.contentEl.innerHTML = '';

  // Hero container
  var heroContainer = document.createElement('div');
  heroContainer.id = 'blHeroContainer';
  BL.contentEl.appendChild(heroContainer);

  renderHeroSlider(BL.banners);

  // 5. Render sections
  var promoInserted = false;
  for (var si = 0; si < BL.sections.length; si++) {
    var sec = BL.sections[si];
    var secProducts = sec._products || await fetchSectionProducts(sec);
    renderBrandSection(sec, secProducts);

    // Insert promo banner after section 2
    if (!promoInserted && si >= 1 && BL.promoBanner) {
      renderPromoBanner(BL.promoBanner);
      promoInserted = true;
    }
  }

  // If promo not inserted yet, insert after last section
  if (!promoInserted && BL.promoBanner) {
    renderPromoBanner(BL.promoBanner);
  }

  // 6. Render more products
  var remainingProducts = BL.brandProducts.filter(function (p) {
    var alreadyShown = false;
    var allSectionCards = BL.contentEl.querySelectorAll('[data-view-product]');
    allSectionCards.forEach(function (card) {
      if (card.getAttribute('data-view-product') === String(p.id)) alreadyShown = true;
    });
    return !alreadyShown;
  });
  if (remainingProducts.length) {
    renderMoreProducts(remainingProducts);
  }

  // 7. Hide skeleton
  hideBLSkeleton();

  if (!BL.contentEl.querySelector('#blHero') && !BL.contentEl.querySelector('.bl-section-wrap')) {
    console.warn('[BL] Supabase returned no content for this brand');
    renderBLEmptyState('لا يوجد محتوى لهذه العلامة التجارية بعد.');
    return;
  }

  // 8. Trigger visibility animations
  requestAnimationFrame(function () {
    BL.contentEl.querySelectorAll('.bl-fade').forEach(function (el) {
      observeBLElement(el);
    });
  });

  // 9. Wishlist sync
  document.addEventListener('boda:wishlist-updated', function () {
    var list = BL.contentEl.querySelectorAll('[data-wishlist]');
    for (var wi = 0; wi < list.length; wi++) {
      var b = list[wi];
      var pid = b.getAttribute('data-wishlist');
      if (window.BudaStore) {
        b.classList.toggle('is-active', window.BudaStore.isInWishlist(pid));
        var icon = b.querySelector('.material-icons-outlined');
        if (icon) icon.textContent = window.BudaStore.isInWishlist(pid) ? 'favorite' : 'favorite_border';
      }
    }
  });
};

document.addEventListener('DOMContentLoaded', function () {
  BL.init();
});
