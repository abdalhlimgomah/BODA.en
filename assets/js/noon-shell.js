(function () {
  "use strict";



function resolveAssetUrl(relativePath) {
  try {
    const scriptTag = Array.from(document.scripts).find((script) => /noon-shell\.js(?:\?.*)?$/.test(script.src));
    if (scriptTag && scriptTag.src) {
      return new URL(relativePath, scriptTag.src).toString();
    }
  } catch (error) {
    console.warn("Unable to resolve asset URL", error);
  }
  return relativePath;
}

function ensureSkeletonAssets() {
  if (document.getElementById("boda-skeleton-css")) return;

  const cssUrl = resolveAssetUrl("../css/skeleton.css?v=20260701");
  const cssLink = document.createElement("link");
  cssLink.id = "boda-skeleton-css";
  cssLink.rel = "stylesheet";
  cssLink.href = cssUrl;
  document.head.appendChild(cssLink);
}

ensureSkeletonAssets();

function ensureHeaderCSS() {
  if (document.getElementById("boda-header-css")) return;
  var exists = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(function (link) { return link.href && link.href.indexOf('home.css') !== -1; });
  if (exists) return;
  var cssUrl = resolveAssetUrl("../css/home.css?v=20260711a");
  var cssLink = document.createElement("link");
  cssLink.id = "boda-header-css";
  cssLink.rel = "stylesheet";
  cssLink.href = cssUrl;
  document.head.appendChild(cssLink);
}

function getNoonHeaderHTML() {
  var userEmail = (localStorage.getItem("userEmail") || "").trim();
  var userCountry = (localStorage.getItem("userCountry") || "EG");
  var selectedAddr = "";
  if (userEmail) {
    var selId = localStorage.getItem('buda_selected_address_' + userEmail + '_' + userCountry);
    if (!selId) selId = localStorage.getItem('buda_selected_address_' + userEmail);
    selId = selId || '';
    try { selId = JSON.parse(selId); } catch {}
    if (selId) {
      var all = [];
      try { all = JSON.parse(localStorage.getItem('buda_saved_addresses_' + userEmail + '_' + userCountry) || '[]'); } catch {}
      if (!all.length) {
        try { all = JSON.parse(localStorage.getItem('buda_saved_addresses_' + userEmail) || '[]'); } catch {}
      }
      var found = all.find(function (a) { return String(a.id) === String(selId); });
      if (found) selectedAddr = found.label || found.name || found.area || '';
    }
    if (!selectedAddr) {
      selectedAddr = localStorage.getItem("selected_address_" + userEmail + '_' + userCountry);
      if (!selectedAddr) selectedAddr = localStorage.getItem("selected_address_" + userEmail);
      selectedAddr = selectedAddr || "";
    }
  }
  var isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  var userName = localStorage.getItem("userFullName") || localStorage.getItem("userEmail") || "حسابي";
  var accountItems = isLoggedIn
    ? '<a href="ahsab.html" class="buda-dd-item"><span class="material-icons-outlined">person</span> حسابي</a><a href="my-orders.html" class="buda-dd-item"><span class="material-icons-outlined">receipt_long</span> طلباتي</a><a href="returns.html" class="buda-dd-item"><span class="material-icons-outlined">undo</span> الإرجاعات</a><a href="addresses.html" class="buda-dd-item"><span class="material-icons-outlined">location_on</span> العناوين</a><a href="wishlist.html" class="buda-dd-item"><span class="material-icons-outlined">favorite_border</span> المفضلة</a><a href="#" class="buda-dd-item" id="budaSupportBtn"><span class="material-icons-outlined">chat</span> الدعم</a><a href="edit-account.html" class="buda-dd-item"><span class="material-icons-outlined">settings</span> الإعدادات</a><div class="buda-dd-divider"></div><a href="logout-confirmation.html" class="buda-dd-item buda-dd-logout"><span class="material-icons-outlined">logout</span> تسجيل الخروج</a>'
    : '<a href="ahsab.html" class="buda-dd-item"><span class="material-icons-outlined">login</span> تسجيل الدخول</a>';
  return [
    '<div class="buda-header-top">',
    '  <div class="buda-header-top-inner">',
    '    <div class="header-start">',
    '      <button id="menu-toggle" class="menu-btn" type="button" aria-label="القائمة"><span class="menu-icon"></span></button>',
    '      <div class="brand-badge">Buda</div>',
    '    </div>',
    '    <div class="buda-location" id="budaLocationTrigger">',
    '      <span class="buda-location-icon material-icons-outlined">home</span>',
    '      <div class="buda-location-text">',
    '        <span class="buda-location-label">التوصيل إلى</span>',
    '        <strong class="buda-location-value" id="deliver-to-text">' + (selectedAddr || "اختر عنوان التوصيل") + '</strong>',
    '      </div>',
    '      <span class="buda-location-arrow material-icons-outlined">keyboard_arrow_down</span>',
    '    </div>',
    '    <div class="app-search search-left-icon buda-search">',
    '      <span class="material-icons-outlined">search</span>',
    '      <input id="search-input" type="text" data-search-target="search.html" placeholder="ابحث عن منتج أو فئة" autocomplete="off" />',

    '      <div class="buda-search-dropdown" id="budaSearchDropdown">',
    '        <div class="buda-search-recent" id="budaSearchRecent">',
    '          <div class="buda-search-dd-header"><span>عمليات البحث الأخيرة</span><button id="budaClearRecent" type="button">مسح</button></div>',
    '          <div class="buda-search-dd-items" id="budaSearchRecentItems"></div>',
    '        </div>',
    '        <div class="buda-search-suggestions" id="budaSearchSuggestions">',
    '          <div class="buda-search-dd-header"><span>اقتراحات</span></div>',
    '          <div class="buda-search-dd-items" id="budaSearchSuggestionItems"></div>',
    '        </div>',
    '      </div>',
    '    </div>',
    '    <div class="buda-lang" id="budaLangTrigger">',
    '      <span class="buda-lang-text">EN</span>',
    '      <span class="material-icons-outlined buda-lang-globe">language</span>',
    '    </div>',
    '    <div class="buda-account" id="budaAccountTrigger">',
    '      <div class="buda-account-avatar" id="budaAccountAvatar"><span class="material-icons-outlined">person</span></div>',
    '      <div class="buda-account-info">',
    '        <span class="buda-account-name" id="budaAccountName">حسابي</span>',
    '        <span class="material-icons-outlined buda-account-arrow">keyboard_arrow_down</span>',
    '      </div>',
    '      <div class="buda-account-dropdown" id="budaAccountDropdown">' + accountItems + '</div>',
    '    </div>',
    '    <a href="my-orders.html" class="buda-header-action" title="طلباتي"><span class="material-icons-outlined">receipt_long</span><small>طلباتي</small></a>',
    '    <a href="wishlist.html" class="buda-header-action" title="المفضلة"><span class="material-icons-outlined">favorite_border</span><small>المفضلة</small></a>',
    '    <a href="empty-cart.html" class="buda-header-action buda-header-cart" title="العربة"><span class="material-icons-outlined">shopping_cart</span><small>العربة</small><span class="buda-cart-badge" id="budaCartBadge">0</span></a>',
    '  </div>',
    '</div>',
    '<nav class="taager-mega-bar" id="taagerMegaBar" role="navigation" aria-label="التصنيفات الرئيسية"></nav>'
  ].join('\n');
}

function ensureSidebar() {
  if (!document.getElementById('sidebar')) {
    var overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebar-overlay';
    document.body.appendChild(overlay);
    var sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.id = 'sidebar';
    var isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    var userName = localStorage.getItem('userFullName') || localStorage.getItem('userEmail') || '';
    sidebar.innerHTML =
      '<div class="sidebar-head"><strong>Buda</strong><button id="sidebar-close" class="menu-btn" type="button" aria-label="إغلاق"><span class="menu-icon"></span></button></div>' +
      '<nav class="sidebar-nav">' +
      (isLoggedIn && userName ? '<a href="ahsab.html" class="sidebar-link"><span class="material-icons-outlined">person</span> ' + escapeHtml(userName) + '</a>' : '<a href="ahsab.html" class="sidebar-link"><span class="material-icons-outlined">login</span> تسجيل الدخول</a>') +
      '<a href="home.html" class="sidebar-link"><span class="material-icons-outlined">home</span> الرئيسية</a>' +
      '<a href="products.html" class="sidebar-link"><span class="material-icons-outlined">category</span> المنتجات</a>' +
      '<a href="my-orders.html" class="sidebar-link"><span class="material-icons-outlined">inventory_2</span> طلباتي</a>' +
      '<a href="wishlist.html" class="sidebar-link"><span class="material-icons-outlined">favorite</span> المفضلة</a>' +
      '<a href="ahsab.html" class="sidebar-link"><span class="material-icons-outlined">settings</span> الإعدادات</a>' +
      '<div class="sidebar-footer">' +
      '<a href="about.html" class="sidebar-link"><span class="material-icons-outlined">info</span> من نحن</a>' +
      '<a href="contact.html" class="sidebar-link"><span class="material-icons-outlined">support</span> اتصل بنا</a>' +
      '</div></nav>';
    document.body.appendChild(sidebar);
  }
}

function ensureModals() {
  ensureSidebar();
  if (!document.getElementById('budaLocationModal')) {
    var modal = document.createElement('div');
    modal.className = 'buda-modal-overlay';
    modal.id = 'budaLocationModal';
    modal.innerHTML =
      '<div class="buda-modal">' +
      '<div class="buda-modal-header"><h2>عنوان التوصيل</h2><button class="buda-modal-close" id="budaLocationClose" type="button"><span class="material-icons-outlined">close</span></button></div>' +
      '<div class="buda-address-list" id="budaAddressList"><div class="buda-address-empty"><span class="material-icons-outlined">location_off</span><p>لا توجد عناوين محفوظة</p><span>أضف عنوانك الأول لبدء التسوق</span></div></div>' +
      '</div>';
    document.body.appendChild(modal);
  }
  if (!document.getElementById('support-drawer')) {
    var drawer = document.createElement('div');
    drawer.className = 'support-drawer hidden';
    drawer.id = 'support-drawer';
    drawer.innerHTML =
      '<div class="support-backdrop" id="support-backdrop"></div>' +
      '<div class="support-drawer-inner">' +
      '<div class="support-drawer-header"><h3>الدعم</h3><button class="support-close" id="support-close" type="button"><span class="material-icons-outlined">close</span></button></div>' +
      '<p style="color:#666;font-size:0.85rem;text-align:center;padding:20px 0;">للتواصل معنا عبر البريد الإلكتروني: support@buda.com</p>' +
      '</div>';
    document.body.appendChild(drawer);
  }
}

function injectDesktopElements() {
  if (document.querySelector('.buda-header')) return;
  var header = document.querySelector('.app-header');
  if (!header) return;
  ensureHeaderCSS();
  header.innerHTML = getNoonHeaderHTML();
  header.classList.add('buda-header');
  header.style.padding = '0';
  header.style.borderRadius = '0';
  header.style.border = 'none';
  header.style.boxShadow = 'none';
  ensureModals();
}

function injectStandardBottomNav() {
  var nav = document.querySelector('.bottom-nav');
  if (!nav) return;
  nav.innerHTML =
    '<a href="home.html" data-nav="home"><span class="material-icons-outlined">home</span><small>الرئيسية</small></a>' +
    '<a href="products.html" data-nav="products"><span class="material-icons-outlined">category</span><small>الفئات</small></a>' +
    '<button class="nav-home-btn" id="nav-home-btn" type="button" aria-label="الرئيسية"><span class="material-icons-outlined" style="font-size:24px;">store</span></button>' +
    '<a href="ahsab.html" data-nav="account"><span class="material-icons-outlined">person</span><small>حسابي</small></a>' +
    '<a href="empty-cart.html" data-nav="cart"><span class="material-icons-outlined">shopping_cart</span><small>العربة</small><span class="nav-cart-count nav-cart-0" id="nav-cart-count">0</span></a>';
  nav.style.opacity = '1';
}

function initNoonHeaderUI() {
  if (window._noonHeaderInited) return;
  window._noonHeaderInited = true;

  // Location modal
  var locTrigger = document.getElementById('budaLocationTrigger');
  var locModal = document.getElementById('budaLocationModal');
  var locClose = document.getElementById('budaLocationClose');
  if (locTrigger && locModal) {
    locTrigger.addEventListener('click', function () {
      locModal.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (typeof renderSavedAddresses === 'function') renderSavedAddresses();
    });
    function closeLocationModal() { locModal.classList.remove('open'); document.body.style.overflow = ''; }
    if (locClose) locClose.addEventListener('click', closeLocationModal);
    locModal.addEventListener('click', function (e) { if (e.target === locModal) closeLocationModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && locModal.classList.contains('open')) closeLocationModal(); });
  }

  // Account dropdown
  var accTrigger = document.getElementById('budaAccountTrigger');
  if (accTrigger) {
    accTrigger.addEventListener('click', function (e) { e.stopPropagation(); accTrigger.classList.toggle('open'); });
    document.addEventListener('click', function (e) { if (!accTrigger.contains(e.target) && accTrigger.classList.contains('open')) accTrigger.classList.remove('open'); });
  }

  // Search
  var searchInput = document.getElementById('search-input') || document.getElementById('home-search');
  var searchWrap = searchInput ? searchInput.closest('.buda-search') : null;
  if (searchInput) {
    function renderRecentSearches() {
      var recentEl = document.getElementById('budaSearchRecentItems');
      if (!recentEl) return;
      try {
        var recent = JSON.parse(localStorage.getItem('budaRecentSearches') || '[]');
        if (!recent.length) { recentEl.innerHTML = ''; return; }
        recentEl.innerHTML = recent.map(function (s) {
          return '<div class="buda-search-dd-item" data-search-term="' + s.replace(/"/g, '&quot;') + '"><span class="material-icons-outlined">schedule</span> ' + s.replace(/</g, '&lt;') + '</div>';
        }).join('');
        recentEl.querySelectorAll('[data-search-term]').forEach(function (el) {
          el.addEventListener('click', function () {
            var term = el.getAttribute('data-search-term');
            if (term) window.location.href = 'search.html?q=' + encodeURIComponent(term);
          });
        });
      } catch {}
    }
    searchInput.addEventListener('focus', function () {
      if (window.location.pathname.toLowerCase().includes('/search.html')) return;
      searchWrap && searchWrap.classList.add('active');
      renderRecentSearches();
    });
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        // On search page, let search.js handle Enter
        if (window.location.pathname.toLowerCase().indexOf('/search.html') !== -1) return;
        var q = searchInput.value.trim();
        if (q) {
          try {
            var recent = JSON.parse(localStorage.getItem('budaRecentSearches') || '[]');
            recent = recent.filter(function (s) { return s !== q; });
            recent.unshift(q);
            if (recent.length > 10) recent = recent.slice(0, 10);
            localStorage.setItem('budaRecentSearches', JSON.stringify(recent));
          } catch {}
          window.location.href = 'search.html?q=' + encodeURIComponent(q);
        }
      }
    });
    document.addEventListener('click', function (e) { if (searchWrap && !searchWrap.contains(e.target)) searchWrap.classList.remove('active'); });
  }

  var searchClear = document.getElementById('budaSearchClear');
  if (searchClear) {
    searchClear.addEventListener('click', function () {
      if (!searchInput) return;
      searchInput.value = '';
      searchWrap && searchWrap.classList.remove('has-text', 'active');
      searchInput.focus();
    });
  }
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      var val = searchInput.value.trim();
      if (val) { searchWrap && searchWrap.classList.add('has-text'); } else { searchWrap && searchWrap.classList.remove('has-text'); }
    });
  }

  var clearRecent = document.getElementById('budaClearRecent');
  if (clearRecent) {
    clearRecent.addEventListener('click', function () {
      try { localStorage.setItem('budaRecentSearches', '[]'); } catch {}
      var recentEl = document.getElementById('budaSearchRecentItems');
      if (recentEl) recentEl.innerHTML = '';
    });
  }

  // Mega menu bar - populate if not already rendered by page-specific JS
  if (!window._megaMenuRendered) {
    var megaBar = document.getElementById('taagerMegaBar');
    if (megaBar && !megaBar.hasChildNodes()) {
      renderMegaMenu(megaBar);
    }
  }

  // Support drawer
  var supportBtn = document.getElementById('budaSupportBtn');
  var supportDrawer = document.getElementById('support-drawer');
  if (supportBtn && supportDrawer) {
    var isChatDrawer = supportDrawer.querySelector('.support-panel, .support-messages, .support-input') !== null;
    supportBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (isChatDrawer) {
        supportDrawer.style.display = '';
        supportDrawer.classList.add('open-drawer');
        document.body.style.overflow = 'hidden';
      } else {
        supportDrawer.classList.remove('hidden');
        setTimeout(function() { supportDrawer.classList.add('open'); }, 10);
      }
    });
    var supportBackdrop = document.getElementById('support-backdrop');
    var supportClose = document.getElementById('support-close');
    function closeSupport() {
      if (isChatDrawer) {
        supportDrawer.classList.remove('open-drawer');
        supportDrawer.style.display = 'none';
        document.body.style.overflow = '';
      } else {
        supportDrawer.classList.remove('open');
        setTimeout(function() { supportDrawer.classList.add('hidden'); }, 300);
      }
    }
    if (supportBackdrop) supportBackdrop.addEventListener('click', closeSupport);
    if (supportClose) supportClose.addEventListener('click', closeSupport);
  }

  // Cart badge
  function updateCartBadge() {
    var badge = document.getElementById('budaCartBadge');
    if (!badge) return;
    var count = window.BudaStore ? (typeof window.BudaStore.getCartCount === 'function' ? window.BudaStore.getCartCount() : 0) : 0;
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
  }
  updateCartBadge();
  if (window.BudaStore && typeof window.BudaStore.updateCartCount === 'function') {
    var origUpdate = window.BudaStore.updateCartCount;
    window.BudaStore.updateCartCount = function () { origUpdate.call(window.BudaStore); updateCartBadge(); };
  }

  // Language toggle
  var langTrigger = document.getElementById('budaLangTrigger');
  if (langTrigger) {
    langTrigger.addEventListener('click', function () {
      var current = document.documentElement.lang;
      if (current === 'ar') window.location.href = window.location.pathname.replace('/ar/', '/en/') + window.location.search;
      else window.location.href = window.location.pathname.replace('/en/', '/ar/') + window.location.search;
    });
  }
}
function initDesktopLoginLabel() {
  var accName = document.getElementById('budaAccountName');
  if (accName) {
    var isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    var userName = localStorage.getItem("userFullName") || localStorage.getItem("userEmail") || "حسابي";
    accName.textContent = isLoggedIn ? (userName.length > 10 ? userName.slice(0,10)+'...' : userName) : 'حسابي';
  }
  var dropdown = document.getElementById('budaAccountDropdown');
  if (dropdown) {
    var firstLink = dropdown.querySelector('.buda-dd-item');
    if (firstLink) {
      var isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
      if (isLoggedIn) {
        firstLink.innerHTML = '<span class="material-icons-outlined">person</span> حسابي';
        firstLink.href = 'ahsab.html';
      } else {
        firstLink.innerHTML = '<span class="material-icons-outlined">login</span> تسجيل الدخول';
        firstLink.href = 'ahsab.html';
      }
    }
  }
}function injectDesktopFooter() {
  if (window.innerWidth < 1200) return;

  var grid = document.querySelector(".footer-grid");
  if (!grid || grid.querySelectorAll(".footer-col").length > 2) return;
  var extras = document.createElement("div");
  extras.className = "footer-col desktop-only";
  extras.innerHTML = '<h4 data-i18n="روابط سريعة">روابط سريعة</h4><a href="about.html" data-i18n="من نحن">من نحن</a><a href="contact.html" data-i18n="خدمة العملاء">خدمة العملاء</a><a href="privacy.html" data-i18n="سياسة الخصوصية">سياسة الخصوصية</a><a href="products.html" data-i18n="جميع المنتجات">جميع المنتجات</a>';
  grid.insertBefore(extras, grid.querySelector(".footer-download"));
  var accountCol = document.createElement("div");
  accountCol.className = "footer-col desktop-only";
  accountCol.innerHTML = '<h4 data-i18n="حسابي">حسابي</h4><a href="ahsab.html" data-i18n="الطلبات">الطلبات</a><a href="wishlist.html" data-i18n="المفضلة">المفضلة</a><a href="my-orders.html" data-i18n="تتبع الطلبات">تتبع الطلبات</a><a href="empty-cart.html" data-i18n="العربة">العربة</a>';
  grid.insertBefore(accountCol, grid.querySelector(".footer-download"));
  var payCol = document.createElement("div");
  payCol.className = "footer-col desktop-only";
  payCol.innerHTML = '<h4 data-i18n="طرق الدفع">طرق الدفع</h4><span style="display:flex;align-items:center;gap:6px;font-size:0.82rem;opacity:0.75;"><span class="material-icons-outlined" style="font-size:18px;">credit_card</span> Visa</span><span style="display:flex;align-items:center;gap:6px;font-size:0.82rem;opacity:0.75;"><span class="material-icons-outlined" style="font-size:18px;">payments</span> Mastercard</span><span style="display:flex;align-items:center;gap:6px;font-size:0.82rem;opacity:0.75;"><span class="material-icons-outlined" style="font-size:18px;">account_balance</span> تحويل بنكي</span><span style="display:flex;align-items:center;gap:6px;font-size:0.82rem;opacity:0.75;"><span class="material-icons-outlined" style="font-size:18px;">paypal</span> باي بال</span>';
  grid.insertBefore(payCol, grid.querySelector(".footer-download"));
}

function hideBottomNavOnDesktop() {
  if (window.innerWidth >= 1200) {
    var nav = document.querySelector(".bottom-nav");
    if (nav) nav.style.display = "none";
  }
}

  function enforceArabicRtl() {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
    document.documentElement.classList.remove("dark");
    document.body.classList.remove("dark");
  }

  function markActiveNav() {
    const path = (window.location.pathname || "").toLowerCase();
    const links = document.querySelectorAll(".bottom-nav a[data-nav]");
    links.forEach((link) => {
      const nav = (link.getAttribute("data-nav") || "").toLowerCase();
      let active = false;

      if (
        nav === "home" &&
        (path.includes("/home.html") ||
          path.includes("/about.html") ||
          path.includes("/contact.html") ||
          path.includes("/privacy.html"))
      ) {
        active = true;
      }
      if (
        nav === "products" &&
        (path.includes("/products.html") ||
          path.includes("/product.html") ||
          path.includes("/product-reviews.html"))
      ) {
        active = true;
      }
      if (nav === "account" && (path.includes("/ahsab.html") || path.includes("/my-orders.html"))) active = true;
      if (nav === "cart" && (path.includes("/empty-cart.html") || path.includes("/checkout.html"))) {
        active = true;
      }

      link.classList.toggle("is-active", active);
    });
  }

  function parseStoredUser(raw) {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;

      const email = String(parsed.email || "").trim().toLowerCase();
      const id = String(parsed.id || "").trim();
      if (!email || !id) return null;

      return {
        ...parsed,
        email,
        id,
        name: String(parsed.name || "").trim(),
      };
    } catch {
      return null;
    }
  }

  function hydrateAuthSession() {
    const rawCurrentUser = localStorage.getItem("currentUser");
    const parsedCurrentUser = parseStoredUser(rawCurrentUser);
    const loginFlag = localStorage.getItem("isLoggedIn");
    const email = String(localStorage.getItem("userEmail") || "").trim().toLowerCase();
    const fullName = String(localStorage.getItem("userFullName") || "").trim();

    if (parsedCurrentUser) {
      if (loginFlag !== "true") localStorage.setItem("isLoggedIn", "true");
      if (!email || email !== parsedCurrentUser.email) {
        localStorage.setItem("userEmail", parsedCurrentUser.email);
      }
      if (!fullName && parsedCurrentUser.name) {
        localStorage.setItem("userFullName", parsedCurrentUser.name);
      }
      return;
    }

    if (loginFlag === "true" && email) {
      const restored = {
        id: "restored_" + email,
        email,
        name: fullName || email.split("@")[0] || "User",
        restoredAt: new Date().toISOString(),
      };
      localStorage.setItem("currentUser", JSON.stringify(restored));
      if (!fullName && restored.name) {
        localStorage.setItem("userFullName", restored.name);
      }
    }
  }

  function initSearchRedirect() {
    document.querySelectorAll("[data-search-target]").forEach((input) => {
      if (window.location.pathname.toLowerCase().includes('/home.html')) return; // Skip on home (has dropdown)
      const target = input.getAttribute("data-search-target") || "search.html";
      const redirect = () => {
        if (window.location.pathname.toLowerCase().includes("/search.html")) return;
        window.location.href = target;
      };
      input.addEventListener("click", redirect);
      input.addEventListener("focus", redirect);
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          var query = encodeURIComponent(input.value.trim());
          var url = query ? target + "?q=" + query : target;
          if (window.location.pathname.toLowerCase().includes("/search.html")) return;
          window.location.href = url;
        }
      });
      var searchWrap = input.closest('.app-search, .buda-search');
      if (searchWrap) {
        searchWrap.addEventListener("click", function (e) {
          if (e.target === input || input.contains(e.target)) return;
          if (e.target.closest('.buda-search-clear, #clear-button, #search-button')) return;
          redirect();
        });
      }
    });
  }

  function syncCartBadge() {
    try {
      if (window.BudaStore && typeof window.BudaStore.updateCartCount === "function") {
        window.BudaStore.updateCartCount();
      }
    } catch (error) {
      console.warn("cart badge sync failed", error);
    }
  }

  function ensureToastRoot() {
    let root = document.getElementById("boda-toast-root");
    if (root) return root;

    root = document.createElement("div");
    root.id = "boda-toast-root";
    root.className = "boda-toast-root";
    root.setAttribute("aria-live", "polite");
    root.setAttribute("aria-atomic", "true");
    document.body.appendChild(root);
    return root;
  }

  function resolveTarget(target) {
    if (!target) return null;
    if (typeof target === "string") return document.querySelector(target);
    return target instanceof HTMLElement ? target : null;
  }

  function showInlineMessage(target, message, type, duration) {
    const targetEl = resolveTarget(target);
    if (!targetEl) return false;

    const tone = type === "success" ? "success" : type === "error" ? "error" : "info";
    targetEl.textContent = String(message || "");
    targetEl.classList.remove("hidden", "success", "error", "info");
    targetEl.classList.add("status-note", tone);

    if (duration > 0) {
      window.clearTimeout(targetEl._bodaHideTimer);
      targetEl._bodaHideTimer = window.setTimeout(() => {
        targetEl.classList.add("hidden");
      }, duration);
    }

    return true;
  }

  function notify(message, options = {}) {
    var raw = String(message || "").trim();
    if (!raw) return;
    var text = raw;

    const type = options.type || "info";
    const duration = Number.isFinite(options.duration) ? Number(options.duration) : 3200;

    if (showInlineMessage(options.target, text, type, duration)) {
      return;
    }

    const root = ensureToastRoot();
    const toast = document.createElement("div");
    toast.className = "boda-toast boda-" + type;
    toast.setAttribute("role", "status");
    toast.textContent = text;

    root.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));

    const timeout = duration > 0 ? duration : 3200;
    window.setTimeout(() => {
      toast.classList.remove("show");
      window.setTimeout(() => toast.remove(), 240);
    }, timeout);
  }

  function confirm(message, options = {}) {
    return new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.className = "boda-confirm-backdrop";

      const card = document.createElement("div");
      card.className = "boda-confirm-card";
      card.innerHTML =
        "<h3>" + (options.title || "تأكيد") + "</h3>" +
        "<p>" + String(message || "") + "</p>" +
        '<div class="boda-confirm-actions">' +
        '<button type="button" class="btn-secondary" data-confirm-cancel>' + (options.cancelText || "إلغاء") + '</button>' +
        '<button type="button" class="btn-primary" data-confirm-ok>' + (options.confirmText || "تأكيد") + '</button>' +
        "</div>";

      backdrop.appendChild(card);
      document.body.appendChild(backdrop);

      const close = (value) => {
        document.removeEventListener("keydown", escHandler);
        backdrop.remove();
        resolve(Boolean(value));
      };

      backdrop.addEventListener("click", (event) => {
        if (event.target === backdrop) close(false);
      });

      card.querySelector("[data-confirm-cancel]")?.addEventListener("click", () => close(false));
      card.querySelector("[data-confirm-ok]")?.addEventListener("click", () => close(true));

      const escHandler = (event) => {
        if (event.key !== "Escape") return;
        close(false);
      };
      document.addEventListener("keydown", escHandler);
    });
  }

  function renderCountryStrip() {
    var strip = document.getElementById("country-strip");
    if (!strip) return;

    if (!window.TaagerIntegration) {
      strip.classList.add("hidden");
      return;
    }

    var countries = window.TaagerIntegration.getAvailableCountries();
    var selected = window.TaagerIntegration.getSelectedCountry();
    strip.classList.remove("hidden");
    strip.innerHTML =
      '<div class="country-strip-inner">' +
      countries
        .map(function (country) {
          var active =
            selected && selected.code === country.code ? " is-active" : "";
          return (
            '<button type="button" class="country-chip' +
            active +
            '" data-country-code="' +
            country.code +
            '">' +
            '<span class="country-flag">' +
            country.flag +
            "</span> " +
            country.name +
            "</button>"
          );
        })
        .join("") +
      "</div>";

    strip.querySelectorAll("[data-country-code]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var code = chip.getAttribute("data-country-code");
        var target = null;
        for (var i = 0; i < countries.length; i++) {
          if (countries[i].code === code) {
            target = countries[i];
            break;
          }
        }
        if (target) {
          window.TaagerIntegration.setSelectedCountry(target);
          renderCountryStrip();
          document.dispatchEvent(
            new CustomEvent("boda:country-changed", { detail: target })
          );
        }
      });
    });
  }

  function initCountryStrip() {
    renderCountryStrip();
    document.addEventListener("boda:country-changed", function () {
      renderCountryStrip();
    });
  }

  function escapeHtml(value) {
    if (value == null) return '';
    return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function renderSavedAddresses() {
    var list = document.getElementById('budaAddressList');
    if (!list) return;
    var userEmail = String(localStorage.getItem('userEmail') || sessionStorage.getItem('user_email') || '').trim();
    if (!userEmail) {
      list.innerHTML =
        '<div class="buda-address-empty">' +
        '<span class="material-icons-outlined">location_off</span>' +
        '<p>سجل الدخول أولاً</p>' +
        '<span>قم بتسجيل الدخول لعرض عناوينك</span>' +
        '</div>';
      return;
    }
    // Use country-specific key so addresses show per country
    var userCountry = String(localStorage.getItem('userCountry') || 'EG');
    var addrKey = 'buda_saved_addresses_' + userEmail + '_' + userCountry;
    // Migration: if new key empty, try old key
    var savedJson = localStorage.getItem(addrKey);
    if (!savedJson) {
      var oldKey = 'buda_saved_addresses_' + userEmail;
      var oldData = localStorage.getItem(oldKey);
      if (oldData) {
        // Migrate old data to new country-specific key
        localStorage.setItem(addrKey, oldData);
        savedJson = oldData;
      }
    }
    var addresses = [];
    try { addresses = savedJson ? JSON.parse(savedJson) : []; } catch { addresses = []; }
    if (addresses.length === 0) {
      list.innerHTML =
        '<div class="buda-address-empty">' +
        '<span class="material-icons-outlined">location_off</span>' +
        '<p>لا توجد عناوين محفوظة</p>' +
        '<span>أضف عنوانك الأول لبدء التسوق</span>' +
        '</div>';
      return;
    }
    var selectedId = localStorage.getItem('buda_selected_address_' + userEmail + '_' + userCountry) || '';
    try { selectedId = JSON.parse(selectedId); } catch {}
    list.innerHTML = addresses.map(function (addr, i) {
      var isActive = String(addr.id) === String(selectedId) || (i === 0 && !selectedId);
      var label = addr.label || addr.name || addr.area || 'عنوان ' + (i + 1);
      var detail = addr.fullAddress || addr.address || [addr.building, addr.street, addr.area].filter(Boolean).join(', ') || '';
      return '<div class="buda-address-card' + (isActive ? ' active' : '') + '" data-addr-index="' + i + '">' +
        '<div class="buda-address-info">' +
        '<div class="buda-address-name">' + escapeHtml(label) + '</div>' +
        (detail ? '<div class="buda-address-detail">' + escapeHtml(detail) + '</div>' : '') +
        '</div>' +
        '<div class="buda-address-actions">' +
        '<button class="buda-address-action edit" data-addr-edit="' + i + '" title="تعديل"><span class="material-icons-outlined">edit</span></button>' +
        '<button class="buda-address-action delete" data-addr-delete="' + i + '" title="حذف"><span class="material-icons-outlined">delete</span></button>' +
        '</div></div>';
    }).join('') +
      '<button class="buda-add-address-btn" id="budaAddAddressBtn2" type="button">' +
      '<span class="material-icons-outlined">add</span> إضافة عنوان جديد</button>';

    list.querySelectorAll('.buda-address-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var idx = parseInt(card.getAttribute('data-addr-index'), 10);
        if (isNaN(idx)) return;
        var addr = addresses[idx];
        if (addr && userEmail) {
          localStorage.setItem('buda_selected_address_' + userEmail + '_' + userCountry, JSON.stringify(addr.id));
          var dt = document.getElementById('deliver-to-text');
          if (dt) dt.textContent = (addr.label || addr.name || addr.area || 'عنوان ' + (idx + 1));
        }
        list.querySelectorAll('.buda-address-card').forEach(function (c) { c.classList.remove('active'); });
        card.classList.add('active');
      });
    });
    list.querySelectorAll('[data-addr-delete]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var idx = parseInt(btn.getAttribute('data-addr-delete'), 10);
        if (isNaN(idx)) return;
        addresses.splice(idx, 1);
        try { localStorage.setItem(addrKey, JSON.stringify(addresses)); } catch {}
        renderSavedAddresses();
      });
    });
    list.querySelectorAll('[data-addr-edit]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); window.location.href = 'addresses.html'; });
    });
    var addBtn2 = document.getElementById('budaAddAddressBtn2');
    if (addBtn2) addBtn2.addEventListener('click', function () { window.location.href = 'addresses.html'; });
    var addBtn1 = document.getElementById('budaAddAddressBtn');
    if (addBtn1) addBtn1.addEventListener('click', function () { window.location.href = 'addresses.html'; });
  }
  window.renderSavedAddresses = renderSavedAddresses;

  function loadUserCountryOnStartup() {
    var isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    var userEmail = (localStorage.getItem("userEmail") || "").trim().toLowerCase();
    if (!isLoggedIn || !userEmail) return;

    // If country already set in localStorage via TaagerIntegration, skip
    if (window.TaagerIntegration && window.TaagerIntegration.getSelectedCountry()) return;

    // Check if we saved userCountry separately
    var savedCountry = localStorage.getItem("userCountry");
    if (savedCountry && window.TaagerIntegration) {
      var countries = window.TaagerIntegration.getAvailableCountries();
      for (var ci = 0; ci < countries.length; ci++) {
        if (countries[ci].code === savedCountry) {
          window.TaagerIntegration.setSelectedCountry(countries[ci]);
          return;
        }
      }
    }

    // Fallback: fetch from Supabase profile
    if (typeof getSupabaseClient !== "function") return;
    try {
      var client = getSupabaseClient();
      client.from("profiles").select("country_code").eq("email", userEmail).limit(1).then(function (result) {
        if (result.error) return;
        if (Array.isArray(result.data) && result.data.length && result.data[0].country_code) {
          var code = result.data[0].country_code;
          // Only set from profile if it's a non-default country (SA was deliberately chosen)
          if (code !== "EG") {
            localStorage.setItem("userCountry", code);
            if (window.TaagerIntegration) {
              var countries = window.TaagerIntegration.getAvailableCountries();
              for (var ci = 0; ci < countries.length; ci++) {
                if (countries[ci].code === code) {
                  window.TaagerIntegration.setSelectedCountry(countries[ci]);
                  break;
                }
              }
            }
          }
        }
      });
    } catch (_e) {}
  }

  function init() {
    hydrateAuthSession();
    enforceArabicRtl();
    markActiveNav();
    initSearchRedirect();
    syncCartBadge();
    loadUserCountryOnStartup();
    initCountryStrip();
  }



  function initSidebar() {
    var toggle = document.getElementById("menu-toggle");
    var sidebar = document.getElementById("sidebar");
    var overlay = document.getElementById("sidebar-overlay");
    var closeBtn = document.getElementById("sidebar-close");
    if (!toggle || !sidebar || !overlay) return;

    function open() {
      sidebar.classList.add("is-open");
      overlay.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }

    function close() {
      sidebar.classList.remove("is-open");
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";
    }

    toggle.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", close);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sidebar.classList.contains("is-open")) close();
    });
  }

  function initNavHomeBtn() {
    var btn = document.getElementById("nav-home-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      window.location.href = "home.html";
    });
  }

  function initBrandBadge() {
    var badges = document.querySelectorAll(".brand-badge");
    badges.forEach(function (el) {
      el.style.cursor = "pointer";
      el.addEventListener("click", function () {
        window.location.href = "home.html";
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    injectDesktopElements();
    ensureSidebar();
    injectDesktopFooter();
    injectStandardBottomNav();
    hideBottomNavOnDesktop();
    initDesktopLoginLabel();
    initSidebar();
    initNavHomeBtn();
    initSearchRedirect();
    initBrandBadge();
    initNoonHeaderUI();
    if (window.BudaUI && window.BudaUI.refreshShell) window.BudaUI.refreshShell();
  });
  window.addEventListener("resize", function () {
    hideBottomNavOnDesktop();
  });

  // ===== Mega Menu (global on all pages) =====
  function ensureMegaMenuCSS() {
    if (document.getElementById("boda-mega-css")) return;
    var css = document.createElement("style");
    css.id = "boda-mega-css";
    css.textContent =
      '.taager-mega-bar{display:flex;align-items:stretch;background:#fff;border-bottom:1px solid #e8e8e8;direction:ltr;overflow:visible;position:relative;z-index:100;width:100%;padding:0;box-sizing:border-box}' +
      '.taager-mega-scroll{display:flex;align-items:stretch;gap:0;overflow-x:auto;overflow-y:hidden;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;flex:1;padding:0;margin:0;direction:rtl}' +
      '.taager-mega-scroll::-webkit-scrollbar{display:none}' +
      '.taager-mega-item{position:relative;flex-shrink:0;display:flex;align-items:stretch}' +
      '.taager-mega-trigger{display:flex;align-items:center;gap:6px;padding:10px 14px;border:none;background:transparent;font-size:13px;font-weight:500;color:#333;cursor:pointer;white-space:nowrap;transition:color .15s,border-bottom-color .15s;border-bottom:2px solid transparent;font-family:inherit}' +
      '.taager-mega-trigger .material-icons-outlined{font-size:18px;color:#999;transition:color .15s}' +
      '.taager-mega-trigger:hover,.taager-mega-item.is-open .taager-mega-trigger{color:#d4a84b;border-bottom-color:#d4a84b}' +
      '.taager-mega-trigger:hover .material-icons-outlined,.taager-mega-item.is-open .taager-mega-trigger .material-icons-outlined{color:#d4a84b}' +
      '.taager-mega-dropdown{position:fixed;z-index:9999;background:#fff;border:1px solid #e8e8e8;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.12);padding:8px;display:none;flex-direction:column;gap:2px;min-width:200px;pointer-events:none;opacity:0;transition:opacity .15s}' +
      '.taager-mega-item:hover .taager-mega-dropdown,.taager-mega-item.is-open .taager-mega-dropdown{display:flex;pointer-events:auto;opacity:1}' +
      '.taager-mega-sub{display:flex;align-items:center;gap:10px;padding:8px 12px;border:none;background:transparent;font-size:13px;color:#333;cursor:pointer;border-radius:8px;transition:background .15s,color .15s;text-decoration:none;font-family:inherit;text-align:start;width:100%}' +
      '.taager-mega-sub .material-icons-outlined{font-size:17px;color:#999;transition:color .15s}' +
      '.taager-mega-sub:hover{background:#fef7ec;color:#d4a84b}' +
      '.taager-mega-sub:hover .material-icons-outlined{color:#d4a84b}' +
      '@media(max-width:767px){.taager-mega-bar{padding:4px 0}.taager-mega-trigger{padding:8px 10px;font-size:12px}.taager-mega-trigger .material-icons-outlined{font-size:16px}.taager-mega-dropdown{left:8px!important;right:8px!important;width:auto!important;border-radius:8px}}' +
      '@media(min-width:768px){.taager-mega-trigger{padding:10px 12px;font-size:12px}}' +
      '@media(min-width:1200px){.taager-mega-trigger{padding:12px 18px;font-size:14px}.taager-mega-dropdown{min-width:240px}}';
    document.head.appendChild(css);
  }

  var MEGA_MENU_DATA = [
    {name:"جمال وعناية",icon:"spa",slug:"beauty-and-care",subs:[
      {name:"مستحضرات تجميل",icon:"face_retouching_natural",slug:"makeup"},
      {name:"عناية بالبشرة",icon:"spa",slug:"skincare"},
      {name:"عطور",icon:"air",slug:"perfume"},
      {name:"عناية بالشعر",icon:"content_cut",slug:"hair-care"}]},
    {name:"إلكترونيات",icon:"smartphone",slug:"phones",subs:[
      {name:"موبايلات",icon:"smartphone",slug:"mobile"},
      {name:"لابتوب",icon:"laptop",slug:"laptop"},
      {name:"سماعات",icon:"headphones",slug:"headphones"},
      {name:"كاميرات",icon:"camera_alt",slug:"cameras"},
      {name:"إكسسوارات إلكترونية",icon:"cable",slug:"accessories"}]},
    {name:"سماعات",icon:"headphones",slug:"headphones",subs:[
      {name:"سماعات بلوتوث",icon:"bluetooth",slug:"bluetooth"},
      {name:"سماعات سلكية",icon:"headphones",slug:"wired"},
      {name:"سماعات رأس",icon:"headset_mic",slug:"over-ear"},
      {name:"سبيكرات ومكبرات",icon:"speaker",slug:"speakers"}]},
    {name:"رياضة",icon:"sports_soccer",slug:"sports",subs:[
      {name:"أجهزة جيم",icon:"fitness_center",slug:"gym"},
      {name:"ملابس رياضية",icon:"checkroom",slug:"activewear"},
      {name:"مكملات غذائية",icon:"medication",slug:"supplements"},
      {name:"أدوات رياضية",icon:"sports_tennis",slug:"gear"}]},
    {name:"ساعات",icon:"watch",slug:"watches",subs:[
      {name:"ساعات ذكية",icon:"smartwatch",slug:"smartwatch"},
      {name:"ساعات رجالية",icon:"watch",slug:"mens"},
      {name:"ساعات نسائية",icon:"watch",slug:"womens"}]},
    {name:"منزل",icon:"home",slug:"home",subs:[
      {name:"أدوات مطبخ",icon:"kitchen",slug:"kitchen"},
      {name:"ديكور",icon:"palette",slug:"decor"},
      {name:"مفروشات",icon:"bed",slug:"bedding"},
      {name:"أجهزة منزلية",icon:"local_laundry_service",slug:"appliances"}]},
    {name:"أطفال",icon:"child_care",slug:"baby",subs:[
      {name:"ملابس أطفال",icon:"checkroom",slug:"kids-clothes"},
      {name:"حفاضات",icon:"baby_changing_station",slug:"diapers"},
      {name:"ألعاب أطفال",icon:"toys",slug:"baby-toys"},
      {name:"مستلزمات رضع",icon:"baby_changing_station",slug:"nursery"}]},
    {name:"أثاث",icon:"chair",slug:"furniture",subs:[
      {name:"غرف نوم",icon:"bed",slug:"bedroom"},
      {name:"غرف معيشة",icon:"living",slug:"living-room"},
      {name:"مكاتب",icon:"desk",slug:"desks"},
      {name:"إضاءة",icon:"lightbulb",slug:"lighting"}]},
    {name:"عطور",icon:"air",slug:"perfume",subs:[
      {name:"عطور رجالية",icon:"air",slug:"mens-fragrance"},
      {name:"عطور نسائية",icon:"air",slug:"womens-fragrance"},
      {name:"بخور",icon:"air_freshener",slug:"incense"},
      {name:"دهن عود",icon:"air_freshener",slug:"oud"}]},
    {name:"ألعاب",icon:"toys",slug:"toys",subs:[
      {name:"ألعاب تعليمية",icon:"school",slug:"educational"},
      {name:"ألعاب إلكترونية",icon:"videogame_asset",slug:"electronic"},
      {name:"دمى",icon:"toys",slug:"dolls"},
      {name:"ألعاب خارجية",icon:"sports_tennis",slug:"outdoor"}]},
    {name:"كاميرات",icon:"camera_alt",slug:"cameras",subs:[
      {name:"كاميرات تصوير",icon:"camera_alt",slug:"dslr"},
      {name:"كاميرات مراقبة",icon:"videocam",slug:"security"},
      {name:"عدسات",icon:"camera",slug:"lenses"},
      {name:"إكسسوارات تصوير",icon:"camera",slug:"photo-accessories"}]},
    {name:"مجوهرات",icon:"diamond",slug:"jewelry",subs:[
      {name:"ذهب",icon:"diamond",slug:"gold"},
      {name:"فضة",icon:"diamond",slug:"silver"},
      {name:"إكسسوارات",icon:"watch",slug:"accessories"},
      {name:"أحجار كريمة",icon:"diamond",slug:"gemstones"}]},
    {name:"هدايا",icon:"card_giftcard",slug:"gifts",subs:[
      {name:"طقم هدايا",icon:"card_giftcard",slug:"gift-sets"},
      {name:"ورد",icon:"local_florist",slug:"flowers"},
      {name:"مناسبات",icon:"celebration",slug:"occasions"}]},
    {name:"جملة",icon:"inventory_2",slug:"wholesale",subs:[
      {name:"منتجات بالجملة",icon:"inventory_2",slug:"bulk"},
      {name:"مستلزمات تجارية",icon:"business_center",slug:"business"}]},
  ];

  function renderMegaMenu(bar) {
    if (window._megaMenuRendered) return;
    window._megaMenuRendered = true;

    var scrollWrap = document.createElement("div");
    scrollWrap.className = "taager-mega-scroll";

    MEGA_MENU_DATA.forEach(function (item) {
      var itemDiv = document.createElement("div");
      itemDiv.className = "taager-mega-item";

      // Use <a> for navigation on non-products pages; main.js overrides on products.html
      var trigger = document.createElement("a");
      trigger.className = "taager-mega-trigger";
      trigger.href = "products.html?category=" + item.slug;
      trigger.innerHTML = '<span class="material-icons-outlined">' + item.icon + '</span><span>' + item.name + '</span>';
      itemDiv.appendChild(trigger);

      var dropdown = document.createElement("div");
      dropdown.className = "taager-mega-dropdown";

      item.subs.forEach(function (sub) {
        var btn = document.createElement("a");
        btn.className = "taager-mega-sub";
        btn.href = "products.html?category=" + item.slug + "&sub=" + sub.slug;
        btn.innerHTML = '<span class="material-icons-outlined">' + sub.icon + '</span><span>' + sub.name + '</span>';
        dropdown.appendChild(btn);
      });

      itemDiv.appendChild(dropdown);
      scrollWrap.appendChild(itemDiv);

      // Desktop hover
      trigger.addEventListener("mouseenter", function () {
        if (window.innerWidth >= 768) {
          closeAllMega();
          itemDiv.classList.add("is-open");
          positionDropdown(itemDiv);
        }
      });

      dropdown.addEventListener("mouseenter", function () {
        if (window.innerWidth >= 768) {
          itemDiv.classList.add("is-open");
        }
      });
    });

    bar.innerHTML = "";
    bar.appendChild(scrollWrap);

    bar.addEventListener("mouseleave", function (e) {
      if (window.innerWidth >= 768) {
        var related = e.relatedTarget;
        if (related && bar.contains(related)) return;
        closeAllMega();
      }
    });
  }

  function closeAllMega() {
    document.querySelectorAll(".taager-mega-item.is-open").forEach(function (el) { el.classList.remove("is-open"); });
  }

  function positionDropdown(item) {
    var dropdown = item.querySelector(".taager-mega-dropdown");
    var trigger = item.querySelector(".taager-mega-trigger");
    if (!dropdown || !trigger) return;
    var rect = trigger.getBoundingClientRect();
    var isMobile = window.innerWidth < 768;
    if (isMobile) {
      dropdown.style.top = Math.min(rect.bottom + 4, window.innerHeight - 20) + "px";
      dropdown.style.left = "8px";
      dropdown.style.right = "8px";
      dropdown.style.width = "auto";
    } else {
      var ddWidth = Math.max(220, Math.min(320, dropdown.offsetWidth || 220));
      var leftPos = rect.right - ddWidth;
      if (leftPos < 8) leftPos = 8;
      if (leftPos + ddWidth > window.innerWidth - 8) {
        leftPos = window.innerWidth - ddWidth - 8;
      }
      dropdown.style.top = (rect.bottom + 4) + "px";
      dropdown.style.left = leftPos + "px";
      dropdown.style.width = ddWidth + "px";
      dropdown.style.right = "auto";
    }
  }

  // Close mega menu on outside click
  document.addEventListener("click", function (e) {
    var bar = document.getElementById("taagerMegaBar");
    if (bar && !bar.contains(e.target)) closeAllMega();
  });

  // Reposition on scroll
  function repositionMega() {
    var active = document.querySelector(".taager-mega-item.is-open");
    if (active) positionDropdown(active);
  }
  document.addEventListener("scroll", repositionMega, true);
  window.addEventListener("resize", function () { closeAllMega(); });

  // Init mega menu on DOM ready
  ensureMegaMenuCSS();
  var megaBar = document.getElementById("taagerMegaBar");
  if (megaBar && !megaBar.hasChildNodes()) {
    renderMegaMenu(megaBar);
  }

  window.BudaUI = window.BudaUI || {};
  window.BudaUI.refreshShell = function refreshShell() {
    markActiveNav();
    syncCartBadge();
  };
  window.BudaUI.notify = notify;
  window.BudaUI.confirm = confirm;
})();

