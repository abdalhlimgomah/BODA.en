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

function ensureSiteIdentity() {
  // JSON-LD structured data for Google Site Name
  if (document.getElementById("boda-schema")) return;
  var schema = document.createElement("script");
  schema.id = "boda-schema";
  schema.type = "application/ld+json";
  schema.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "BudoQ",
    "alternateName": "BudoQ",
    "url": "https://budoq.com/",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://budoq.com/pages/search.html?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  });
  document.head.appendChild(schema);
}

function ensureAnalyticsAssets() {
  // Insert GA4 gtag directly in <head> for Google detection
  if (!document.getElementById("boda-gtag")) {
    var gtagScript = document.createElement("script");
    gtagScript.id = "boda-gtag";
    gtagScript.async = true;
    gtagScript.src = "https://www.googletagmanager.com/gtag/js?id=G-PRZGJW879Z";
    document.head.insertBefore(gtagScript, document.head.firstChild);

    var gtagInit = document.createElement("script");
    gtagInit.innerHTML = "window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-PRZGJW879Z');";
    document.head.insertBefore(gtagInit, document.head.firstChild);
  }

  // Load analytics-manager.js for enhanced e-commerce events
  if (document.getElementById("boda-analytics-script")) return;
  const jsUrl = resolveAssetUrl("../js/seo/analytics-manager.js?v=20260725");
  const script = document.createElement("script");
  script.id = "boda-analytics-script";
  script.src = jsUrl;
  document.body.appendChild(script);
}

ensureSkeletonAssets();
ensureAnalyticsAssets();

function ensureHeaderCSS() {
  if (document.getElementById("boda-header-css")) return;

  var nightCssId = "boda-night-css";
  if (!document.getElementById(nightCssId)) {
    var nightUrl = resolveAssetUrl("../css/noon.css?v=20260826");
    var nightLink = document.createElement("link");
    nightLink.id = nightCssId;
    nightLink.rel = "stylesheet";
    nightLink.href = nightUrl;
    document.head.appendChild(nightLink);
  }

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
  return [
    '<div class="buda-header__inner">',
    '  <a href="home.html" class="buda-header__brand" id="budaHeaderBrand">',
    '    <img class="buda-header__logo-img" src="../assets/images/logo.png" alt="Buda" />',
    '    <span class="buda-header__brand-name">BudoQ</span>',
    '  </a>',
    '  <div class="buda-header__search-inline" id="budaHeaderSearch">',
    '    <div class="buda-search-box" id="budaSearchDropdown">',
    '      <span class="buda-search-icon">',
    '        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
    '      </span>',
    '      <input id="buda-header-search-input" class="buda-search-box__input" type="text" data-search-target="search.html" data-desktop-search="1" placeholder="ابحث..." autocomplete="off" />',
    '    </div>',
    '  </div>',
    '  <div class="buda-header__nav-group">',
    '    <button class="buda-header__notif" type="button" aria-label="الإشعارات">',
    '      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    '      <span class="buda-header__badge" id="budaCartBadge">0</span>',
    '    </button>',
    '      <button class="buda-header__desktop-link buda-desktop-account-btn" id="budaDesktopAccountBtn">',
    '        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> <span id="budaDesktopAccountLabel">الحساب</span>',
    '      </button>',
    '    <a href="my-orders.html" class="buda-header__desktop-link"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/></svg> الطلبيات</a>',
    '    <a href="wishlist.html" class="buda-header__desktop-link"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg> المفضلة</a>',
    '    <a href="empty-cart.html" class="buda-header__desktop-link">' +
    '      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg> عربة التسوق' +
    '      <span id="nav-cart-count-desk" class="nav-cart-count-desk nav-cart-0">0</span>' +
    '    </a>',
    '    <div class="buda-desktop-account" id="budaDesktopAccount">',

    '      <div class="buda-desktop-account-dropdown" id="budaDesktopAccountDropdown"></div>',
    '    </div>',
    '    <button id="menu-toggle" class="buda-header__menu-btn" type="button" aria-label="القائمة">',
    '      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>',
    '    </button>',
    '    <div class="buda-country-select" id="budaCountrySelect">',
    '      <button type="button" class="buda-country-trigger" aria-label="تغيير الدولة">',
    '        <span class="buda-country-flag" id="budaCountryFlag">🌍</span>',
    '        <span class="buda-country-name" id="budaCountryName">الدولة</span>',
    '        <svg class="buda-country-caret" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    '      </button>',
    '    </div>',
    '  </div>',
    '</div>'
  ].join('\n');
}

function injectLegacyHiddenElements() {
  var isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  var accountItems = isLoggedIn
    ? '<a href="ahsab.html"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> حسابي</a><a href="my-orders.html"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/></svg> طلباتي</a><a href="returns.html"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg> الإرجاعات</a><a href="addresses.html"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg> العناوين</a><a href="wishlist.html"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg> المفضلة</a><a href="#" id="budaSupportBtn"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg> الدعم</a><a href="edit-account.html"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> تعديل الحساب</a><a href="edit-account.html?tab=password"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> تغيير كلمة المرور</a><div class="buda-header__account-divider"></div><a href="#" id="budaLogoutBtn"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> تسجيل الخروج</a>'
    : '<a href="ahsab.html"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> تسجيل الدخول</a>';
  var legacyHTML =
    '<div id="budaLocationTrigger" class="buda-v2-hidden"></div>' +
    '<strong id="deliver-to-text" class="buda-v2-hidden"></strong>' +
    '<button id="budaLangTrigger" class="buda-v2-hidden"></button>' +
    '<div id="budaAccountTrigger" class="buda-v2-hidden"><div class="buda-header__account-dropdown" id="budaAccountDropdown">' + accountItems + '</div></div>' +
    '<nav class="buda-header__nav buda-v2-hidden" id="budaHeaderNav" role="navigation" aria-label="التصنيفات الرئيسية"></nav>';
  if (!document.getElementById('buda-legacy-container')) {
    var c = document.createElement('div');
    c.id = 'buda-legacy-container';
    c.style.display = 'none';
    c.innerHTML = legacyHTML;
    document.body.appendChild(c);
  }
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
      '<a href="sections.html" class="sidebar-link"><span class="material-icons-outlined">category</span> الأقسام</a>' +
      '<a href="my-orders.html" class="sidebar-link"><span class="material-icons-outlined">inventory_2</span> الطلبات</a>' +
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
  var header = document.querySelector('.app-header');
  if (!header) return;
  if (header.querySelector('.buda-header__inner')) return;
  ensureHeaderCSS();
  header.innerHTML = getNoonHeaderHTML();
  header.classList.add('buda-header');
  ensureModals();
}

function injectFloatingSearch() {
  if (document.getElementById('buda-search-float')) return;
  var header = document.querySelector('.app-header');
  if (!header) return;
  var isHome = document.getElementById('hm-content') !== null;
  var wrap = document.createElement('div');
  wrap.id = 'buda-search-float';
  wrap.innerHTML =
    '<div class="buda-search-box" id="budaSearchDropdownFloat">' +
    '  <span class="buda-search-icon">' +
    '    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
    '  </span>' +
    '  <input id="search-input" class="buda-search-box__input" type="text" data-search-target="search.html" placeholder="ابحث عن منتجاتك المفضلة..." autocomplete="off" />' +
    (isHome
      ? '  <button type="button" class="buda-search-box__btn buda-search-camera" aria-label="فتح الكاميرا">' +
        '    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>' +
        '  </button>'
      : '') +
    '</div>';
  header.appendChild(wrap);
  if (isHome) {
    var cameraBtn = wrap.querySelector('.buda-search-camera');
    if (cameraBtn) {
      cameraBtn.addEventListener('click', function () {
        window.location.href = 'search.html';
      });
    }
  }
}

function injectStandardBottomNav() {
  var nav = document.querySelector('.bottom-nav');
  if (!nav) return;
  nav.innerHTML =
    '<a href="home.html" data-nav="home">' +
    '  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>' +
    '  <small>الرئيسية</small>' +
    '</a>' +
    '<a href="sections.html" data-nav="sections">' +
    '  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/></svg>' +
    '  <small>الأقسام</small>' +
    '</a>' +
    '<a href="empty-cart.html" data-nav="cart">' +
    '  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>' +
    '  <small>عربة التسوق</small>' +
    '  <span class="nav-cart-count nav-cart-0" id="nav-cart-count">0</span>' +
    '</a>' +
    '<a href="wishlist.html" data-nav="wishlist">' +
    '  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>' +
    '  <small>المفضلة</small>' +
    '</a>' +
    '<a href="ahsab.html" data-nav="account">' +
    '  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
    '  <small>حسابي</small>' +
    '</a>';
  nav.style.opacity = '1';
  // ensure nav-home-btn exists in DOM (for legacy JS)
  if (!document.getElementById('nav-home-btn')) {
    var legacy = document.createElement('button');
    legacy.id = 'nav-home-btn';
    legacy.className = 'buda-v2-hidden';
    legacy.type = 'button';
    document.body.appendChild(legacy);
  }
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
  var searchInput = document.querySelector('#search-input:not([style*="display: none"]), #buda-header-search-input:not([style*="display: none"]), #home-search:not([style*="display: none"])') || document.getElementById('search-input') || document.getElementById('buda-header-search-input') || document.getElementById('home-search');
  if (searchInput) {
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
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
  }

  if (searchInput) {
    var searchWrap = searchInput.closest('.buda-search-box');
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
    var megaBar = document.getElementById('budaHeaderNav');
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
  var dropdown = document.getElementById('budaDesktopAccountDropdown');
  var label = document.getElementById('budaDesktopAccountLabel');
  if (!dropdown) return;

  var rawUser = localStorage.getItem('currentUser');
  var validUser = false;
  var displayName = '';
  try {
    var parsed = JSON.parse(rawUser);
    if (parsed && parsed.email && parsed.id) {
      validUser = true;
      displayName = parsed.name || parsed.email.split('@')[0] || 'حسابي';
    }
  } catch(e) {}

  if (validUser) {
    if (label) label.textContent = displayName.length > 10 ? displayName.substring(0, 10) + '..' : displayName;
    dropdown.innerHTML =
      '<a href="ahsab.html"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> حسابي</a>' +
      '<a href="sections.html"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> الأقسام</a>' +
      '<a href="my-orders.html"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/></svg> الطلبيات</a>' +
      '<a href="returns.html"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg> الإرجاعات</a>' +
      '<a href="ahsab.html#support" id="budaDesktopSupportBtn"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg> الدعم</a>' +
      '<div class="buda-divider"></div>' +
      '<button id="budaDesktopLogout" class="buda-logout"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> تسجيل الخروج</button>';
    var logoutBtn = document.getElementById('budaDesktopLogout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function() {
        window.location.href = 'logout-confirmation.html';
      });
    }
  } else {
    // Clean up stale login state
    if (localStorage.getItem('isLoggedIn') === 'true') {
      localStorage.removeItem('isLoggedIn');
    }
    if (label) label.textContent = 'حسابي';
    dropdown.innerHTML =
      '<a href="ahsab.html"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> تسجيل الدخول</a>' +
      '<a href="sections.html"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> الأقسام</a>';
  }

  // Toggle on click
  var btn = document.getElementById('budaDesktopAccountBtn');
  var wrap = document.getElementById('budaDesktopAccount');
  if (btn && wrap) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();
      wrap.classList.toggle('open');
    });
    document.addEventListener('click', function(e) {
      if (!wrap.contains(e.target) && wrap.classList.contains('open')) {
        wrap.classList.remove('open');
      }
    });
  }
}
function injectDesktopFooter() {
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
      if (nav === "cart" && (path.includes("/empty-cart.html") || path.includes("/checkout.html"))) active = true;
      if (nav === "wishlist" && (path.includes("/wishlist.html"))) active = true;

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
      const target = input.getAttribute("data-search-target") || "search.html";
      // Desktop: البحث يفتح لوحة مدمجة في الصفحة بدل الانتقال لصفحة البحث
      if (input.hasAttribute("data-desktop-search")) return;
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
      var searchWrap = input.closest('.app-search, .buda-header__search');
      if (searchWrap) {
        searchWrap.addEventListener("click", function (e) {
          if (e.target === input || input.contains(e.target)) return;
          if (e.target.closest('.buda-search-clear, #clear-button, #search-button')) return;
          redirect();
        });
      }
    });
  }

  // ===== Desktop search panel (Noon-style inline dropdown) =====
  function initDesktopSearchPanel() {
    if (!window.matchMedia("(min-width: 1200px)").matches) return;
    var input = document.getElementById("buda-header-search-input");
    if (!input || !input.hasAttribute("data-desktop-search")) return;
    var wrap = input.closest(".buda-header__search-inline");
    if (!wrap) return;

    var RECENT_KEY = "buda_recent_searches";
    var MAX_RECENT = 5;
    var activeIdx = -1;

    var panel = document.createElement("div");
    panel.className = "buda-search-panel";
    panel.hidden = true;
    panel.innerHTML =
      '<div class="buda-search-panel__sec" data-sec="recent">' +
      '  <div class="buda-search-panel__title">عمليات البحث الأخيرة</div>' +
      '  <div class="buda-search-panel__chips" data-recent></div>' +
      '</div>' +
      '<div class="buda-search-panel__sec" data-sec="results" hidden>' +
      '  <div class="buda-search-panel__title">منتجات مقترحة</div>' +
      '  <div class="buda-search-panel__results" data-results></div>' +
      '</div>' +
      '<div class="buda-search-panel__all" data-all hidden></div>';
    wrap.appendChild(panel);

    var recentSec = panel.querySelector('[data-sec="recent"]');
    var resultsSec = panel.querySelector('[data-sec="results"]');
    var chipsEl = panel.querySelector("[data-recent]");
    var resultsEl = panel.querySelector("[data-results]");
    var allEl = panel.querySelector("[data-all]");

    function getRecentList() {
      try {
        var list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
        return Array.isArray(list) ? list : [];
      } catch (_e) { return []; }
    }

    function saveRecent(term) {
      var t = String(term || "").trim();
      if (!t) return;
      var list = getRecentList().filter(function (q) { return q.toLowerCase() !== t.toLowerCase(); });
      list.unshift(t);
      if (list.length > MAX_RECENT) list.length = MAX_RECENT;
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (_e) {}
    }

    function getProducts() {
      if (window.BudaStore && typeof window.BudaStore.getAllProducts === "function") {
        try {
          var all = window.BudaStore.getAllProducts();
          return Object.keys(all).map(function (k) { return all[k]; }).filter(function (p) { return p && p.id != null; });
        } catch (_e) { return []; }
      }
      return [];
    }

    function openPanel(term) {
      panel.hidden = false;
      render(term);
    }

    function closePanel() {
      panel.hidden = true;
      activeIdx = -1;
    }

    function render(term) {
      var t = String(term || "").trim();
      activeIdx = -1;

      if (!t) {
        var list = getRecentList();
        if (list.length) {
          chipsEl.innerHTML = list.map(function (q) {
            return '<button type="button" class="buda-search-chip" data-q="' + escapeHtml(q) + '">' +
              '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
              escapeHtml(q) + '</button>';
          }).join("");
        } else {
          chipsEl.innerHTML = '<div class="buda-search-panel__hint">اكتب اسم منتج للبحث عنه...</div>';
        }
        recentSec.hidden = false;
        resultsSec.hidden = true;
        allEl.hidden = true;
        return;
      }

      recentSec.hidden = true;
      var re = null;
      try { re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); } catch (_e) {}
      var matched = [];
      if (re) {
        matched = getProducts().filter(function (p) {
          return re.test(String(p.name || ""));
        }).slice(0, 7);
      }

      if (!matched.length) {
        resultsEl.innerHTML = '<div class="buda-search-panel__hint">لا توجد نتائج مطابقة لـ "' + escapeHtml(t) + '"</div>';
      } else {
        resultsEl.innerHTML = matched.map(function (p) {
          var img = p.image || "";
          try {
            var imgs = window.BudaStore.getProductImages ? window.BudaStore.getProductImages(p) : null;
            if (imgs && imgs.length) img = imgs[0];
            if (window.BudaStore.getImagePath) img = window.BudaStore.getImagePath(img);
          } catch (_e2) {}
          var priceHtml = "";
          try {
            var pi = window.BudaStore.resolveProductPrice ? window.BudaStore.resolveProductPrice(p) : null;
            var curPrice = pi ? Number(pi.currentPrice || pi.price) : 0;
            if (curPrice > 0) {
              var fmt = function (v) {
                return window.BudaStore.formatMoney ? window.BudaStore.formatMoney(v, { plain: true }) : String(v);
              };
              priceHtml = '<span class="buda-search-result__price">' + fmt(curPrice) + '</span>';
              var oldPrice = pi ? Number(pi.originalPrice) : 0;
              if (oldPrice > curPrice) {
                priceHtml += '<span class="buda-search-result__old">' + fmt(oldPrice) + '</span>';
              }
            }
          } catch (_e3) {}
          return '<div class="buda-search-result" data-id="' + escapeHtml(String(p.id)) + '" role="button" tabindex="-1">' +
            '<img class="buda-search-result__img" src="' + escapeHtml(img) + '" alt="" loading="lazy" />' +
            '<div class="buda-search-result__body">' +
            '  <div class="buda-search-result__name">' + escapeHtml(String(p.name || "")) + '</div>' +
            '  <div class="buda-search-result__meta">' + priceHtml + '</div>' +
            '</div></div>';
        }).join("");
      }
      resultsSec.hidden = false;
      allEl.hidden = false;
      allEl.innerHTML = '<a href="search.html?q=' + encodeURIComponent(t) + '">عرض كل النتائج لـ "' + escapeHtml(t) + '" <span aria-hidden="true">←</span></a>';
    }

    input.addEventListener("focus", function () { openPanel(input.value); });
    input.addEventListener("click", function () { openPanel(input.value); });
    input.addEventListener("input", function () { openPanel(input.value); });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closePanel();
        input.blur();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        var items = resultsSec.hidden ? [] : Array.prototype.slice.call(resultsEl.querySelectorAll(".buda-search-result"));
        if (!items.length) return;
        e.preventDefault();
        activeIdx = e.key === "ArrowDown"
          ? (activeIdx + 1) % items.length
          : (activeIdx <= 0 ? items.length - 1 : activeIdx - 1);
        items.forEach(function (it, i) { it.classList.toggle("is-active", i === activeIdx); });
        items[activeIdx].scrollIntoView({ block: "nearest" });
        return;
      }
      if (e.key === "Enter") {
        var items2 = resultsSec.hidden ? [] : Array.prototype.slice.call(resultsEl.querySelectorAll(".buda-search-result"));
        var picked = activeIdx >= 0 && items2[activeIdx] ? items2[activeIdx] : null;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (picked) {
          picked.click();
          return;
        }
        saveRecent(input.value);
        var q = encodeURIComponent(input.value.trim());
        window.location.href = q ? "search.html?q=" + q : "search.html";
      }
    });

    chipsEl.addEventListener("click", function (e) {
      var chip = e.target.closest(".buda-search-chip");
      if (!chip) return;
      input.value = chip.getAttribute("data-q") || "";
      openPanel(input.value);
      input.focus();
    });

    resultsEl.addEventListener("click", function (e) {
      var row = e.target.closest(".buda-search-result");
      if (!row) return;
      var pid = row.getAttribute("data-id");
      if (!pid) return;
      var nameEl = row.querySelector(".buda-search-result__name");
      saveRecent(input.value.trim() || (nameEl ? nameEl.textContent : ""));
      window.location.href = "product.html?id=" + encodeURIComponent(pid);
    });

    document.addEventListener("click", function (e) {
      if (!panel.hidden && !wrap.contains(e.target)) closePanel();
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

  function getCountryFlagEmoji(country) {
    if (!country || !country.flag) return "";
    var flag = String(country.flag);
    if (/[^\x00-\x7F]/.test(flag)) return flag;
    if (/^[A-Za-z]{2}$/.test(flag)) {
      var c = flag.toUpperCase();
      return String.fromCodePoint(
        0x1f1e6 + c.charCodeAt(0) - 65,
        0x1f1e6 + c.charCodeAt(1) - 65
      );
    }
    return "";
  }

  function initCountrySelector() {
    var wrap = document.getElementById("budaCountrySelect");
    if (!wrap) return;

    var modal = null;
    var optionsEl = null;
    var countries = [];

    if (window.TaagerIntegration && window.TaagerIntegration.getAvailableCountries) {
      countries = window.TaagerIntegration.getAvailableCountries();
    }

    function closeModal() {
      if (!modal || !modal.classList.contains("show")) return;
      modal.classList.remove("show");
      document.body.style.overflow = "";
    }

    function openModal() {
      if (!modal) return;
      if (!optionsEl || !optionsEl.childElementCount || !window.TaagerIntegration) return;
      var selected = window.TaagerIntegration.getSelectedCountry();
      var selCode = selected && selected.code ? selected.code : "";
      Array.prototype.forEach.call(optionsEl.children, function (opt) {
        if (opt.getAttribute("data-country-code") === selCode) opt.classList.add("is-active");
        else opt.classList.remove("is-active");
      });
      modal.classList.add("show");
      document.body.style.overflow = "hidden";
    }

    function buildModal() {
      modal = document.createElement("div");
      modal.className = "modal-backdrop";
      modal.id = "budaCountryModal";
      modal.innerHTML =
        '<div class="modal-card" style="max-width:320px;text-align:center;">' +
        '<h3 style="margin:0 0 16px;">اختر الدولة</h3>' +
        '<div id="budaCountryOptions" style="display:flex;flex-direction:column;gap:8px;"></div>' +
        '<div class="inline-actions" style="margin-top:16px;justify-content:center;">' +
        '<button id="budaCountryCancel" class="btn-danger" type="button">إلغاء</button>' +
        "</div></div>";
      document.body.appendChild(modal);
      optionsEl = modal.querySelector("#budaCountryOptions");

      if (!window.TaagerIntegration || !countries.length) return;
      optionsEl.innerHTML = countries
        .map(function (country) {
          var flag = getCountryFlagEmoji(country);
          return (
            '<button type="button" class="country-chip" data-country-code="' +
            country.code +
            '" style="width:100%;justify-content:center;padding:10px;font-size:0.9rem;">' +
            (flag ? '<span class="country-flag">' + flag + "</span> " : "") +
            country.name +
            "</button>"
          );
        })
        .join("");

      optionsEl.querySelectorAll("[data-country-code]").forEach(function (opt) {
        opt.addEventListener("click", function () {
          var code = opt.getAttribute("data-country-code");
          var target = null;
          for (var i = 0; i < countries.length; i++) {
            if (countries[i].code === code) {
              target = countries[i];
              break;
            }
          }
          if (!target || !window.TaagerIntegration) return;
          var oldCode = window.TaagerIntegration.getSelectedCountry();
          if (oldCode && oldCode.code === code) {
            closeModal();
            return;
          }
          window.TaagerIntegration.setSelectedCountry(target);
          try {
            localStorage.setItem("userCountry", code);
          } catch (_e) {}
          closeModal();
          window.location.href = "home.html";
        });
      });

      var cancelBtn = modal.querySelector("#budaCountryCancel");
      if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
      modal.addEventListener("click", function (e) {
        if (e.target === modal) closeModal();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeModal();
      });
    }

    function renderLabel() {
      var flagEl = document.getElementById("budaCountryFlag");
      var nameEl = document.getElementById("budaCountryName");
      if (!flagEl || !nameEl) return;
      var selected =
        window.TaagerIntegration && window.TaagerIntegration.getSelectedCountry
          ? window.TaagerIntegration.getSelectedCountry()
          : null;
      if (selected) {
        flagEl.textContent = getCountryFlagEmoji(selected) || selected.code || "🌍";
        nameEl.textContent = selected.name || selected.code || "الدولة";
      } else {
        flagEl.textContent = "🌍";
        nameEl.textContent = "الدولة";
      }
    }

    var trigger = wrap.querySelector(".buda-country-trigger");
    if (trigger) {
      trigger.addEventListener("click", function (e) {
        e.stopPropagation();
        if (!modal) buildModal();
        openModal();
      });
    }

    document.addEventListener("boda:country-changed", function () {
      renderLabel();
    });

    renderLabel();
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
    var badges = document.querySelectorAll(".brand-badge, .buda-logo");
    badges.forEach(function (el) {
      if (el.tagName === 'A') return;
      el.style.cursor = "pointer";
      el.addEventListener("click", function () {
        window.location.href = "home.html";
      });
    });
  }

  // Subscribe to support messages globally so the bell badge works on every page
  function initSupportBadge() {
    // Retry finding badge if header not injected yet
    var badge = document.getElementById('budaCartBadge');
    if (!badge) { setTimeout(initSupportBadge, 200); return; }
    badge.classList.add('hidden');

    // Clicking the bell opens the support chat
    var bellBtn = document.querySelector('.buda-header__notif');
    if (bellBtn) {
      bellBtn.addEventListener('click', function () {
        if (window.location.pathname.indexOf('ahsab.html') !== -1) {
          if (typeof window.supportDrawer !== 'undefined' && window.supportDrawer.open) {
            window.supportDrawer.open();
          } else {
            window.location.hash = '#support';
          }
          return;
        }
        var prefix = window.location.pathname.includes('/pages/') ? '' : 'pages/';
        window.location.href = prefix + 'ahsab.html#support';
      });
    }

    // Poll localStorage every 3s for badge updates (set by ahsab.html)
    function readSupportCount() {
      try {
        var wn = parseInt(window.name.match(/_su=(\d+)/)?.[1] || "");
        if (!isNaN(wn) && wn > 0) return wn;
      } catch(e) {}
      try {
        var v = parseInt(localStorage.getItem("_supportUnread") || "");
        if (!isNaN(v)) return v;
      } catch(e) {}
      try {
        var m = document.cookie.match(/(?:^|;\s*)_supportUnread=(\d+)/);
        if (m) return parseInt(m[1]);
      } catch(e) {}
      return 0;
    }
    function saveSupportCount(n) {
      try { localStorage.setItem("_supportUnread", String(n)); } catch(e) {}
      try { document.cookie = "_supportUnread=" + n + "; path=/"; } catch(e) {}
      try {
        var parts = window.name.split(';').filter(function(p) { return p.indexOf('_su=') !== 0; });
        parts.push('_su=' + n);
        window.name = parts.join(';');
      } catch(e) {}
    }
    function pollFromStorage() {
      try {
        var saved = readSupportCount();
        var cur = parseInt(badge.textContent || "0");
        if (saved > 0 && saved !== cur) {
          badge.textContent = saved > 99 ? "99+" : saved;
          badge.classList.remove("hidden");
        } else if (saved === 0 && cur > 0) {
          badge.classList.add("hidden");
        }
      } catch (e) {}
    }
    pollFromStorage();
    setInterval(pollFromStorage, 3000);

    var isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (!isLoggedIn) return;

    // If this page has the full chat drawer (ahsab.html), skip subscription
    var drawer = document.getElementById('support-drawer');
    if (drawer && drawer.querySelector('.support-panel, .support-messages')) return;

    var raw = localStorage.getItem("currentUser");
    var userId = null;
    var userEmail = null;
    if (raw) {
      try {
        var p = JSON.parse(raw);
        userId = p && p.id != null ? String(p.id) : null;
        userEmail = p && p.email ? p.email : null;
      } catch (e) {}
    }
    if (!userId) userEmail = localStorage.getItem("userEmail") || null;
    if (!userId && !userEmail) return;

    function doSubscribe() {
      var client = null;
      try { client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null; } catch (e) {
        setTimeout(doSubscribe, 1500);
        return;
      }
      if (!client) { setTimeout(doSubscribe, 1500); return; }

      try {
        var query = client.from("support_conversations").select("id,unread_user_count");
        if (userId) query = query.eq("user_id", String(userId));
        else query = query.eq("user_email", userEmail);
        query.order("created_at", { ascending: false }).limit(1).then(function (r) {
          if (r.error || !r.data || !r.data.length) return;
          var conv = r.data[0];

          if (conv.unread_user_count > 0) {
            var c = conv.unread_user_count;
            badge.textContent = c > 99 ? "99+" : c;
            badge.classList.remove("hidden");
            saveSupportCount(c);
          }

          client.channel("support-badge-global")
            .on("postgres_changes", {
              event: "INSERT", schema: "public", table: "support_messages"
            }, function (pl) {
              var m = pl.new;
              if (m.conversation_id === conv.id && m.sender_type === "admin") {
                var cur = parseInt(badge.textContent || "0");
                var n = cur + 1;
                badge.textContent = n > 99 ? "99+" : n;
                badge.classList.remove("hidden");
                saveSupportCount(n);
              }
            })
            .subscribe();
        });
      } catch (e) {
        setTimeout(doSubscribe, 1500);
      }
    }
    doSubscribe();
  }

  // Rotating search placeholder like big marketplaces (vertical slide-up carousel)
  function initRotatingPlaceholder() {
    var phrases = [
      "موبايلات حديثة",
      "سماعات بلوتوث",
      "عطور فاخرة",
      "ساعات ذكية",
      "إلكترونيات منزلية",
      "ألعاب أطفال",
      "حقائب نسائية",
      "ملابس رياضية",
      "عناية بالبشرة"
    ];
    // Pick the search box that is actually visible (floating one on mobile, header one on desktop)
    var candidates = [
      document.getElementById("buda-header-search-input"),
      document.getElementById("search-input"),
      document.getElementById("home-search")
    ];
    var input = null;
    for (var ci = 0; ci < candidates.length; ci++) {
      var c = candidates[ci];
      if (!c) continue;
      if (c.offsetParent === null) continue;
      if (c.getBoundingClientRect().width === 0) continue;
      input = c;
      break;
    }
    if (!input || input.dataset.rotating) {
      setTimeout(initRotatingPlaceholder, 400);
      return;
    }
    input.dataset.rotating = "1";
    var box = input.closest(".buda-search-box");
    if (!box) return;
    if (box.querySelector(".buda-search-rotator")) return;

    var rotator = document.createElement("div");
    rotator.className = "buda-search-rotator";
    rotator.setAttribute("aria-hidden", "true");
    input.setAttribute("placeholder", "");
    input.setAttribute("aria-label", "ابحث عن منتجاتك المفضلة");
    var track = document.createElement("div");
    track.className = "buda-search-rotator-track";
    var list = phrases.concat(phrases);
    list.forEach(function (p) {
      var span = document.createElement("span");
      span.textContent = p;
      track.appendChild(span);
    });
    rotator.appendChild(track);
    box.appendChild(rotator);

    var lineH = 26;
    var idx = 0;
    var timer = null;
    function animate() {
      idx = (idx + 1) % phrases.length;
      if (idx === 0) {
        track.style.transition = "none";
        track.style.transform = "translateY(0px)";
        void track.offsetHeight;
        track.style.transition = "";
        track.style.transform = "translateY(-" + (idx * lineH) + "px)";
      } else {
        track.style.transform = "translateY(-" + (idx * lineH) + "px)";
      }
    }
    function syncVisibility() {
      var hasText = input.value && input.value.trim();
      rotator.style.visibility = hasText ? "hidden" : "visible";
    }
    timer = setInterval(animate, 2800);
    input.addEventListener("input", syncVisibility);
    document.addEventListener("focusin", function (e) {
      if (e.target === input) syncVisibility();
    });
    syncVisibility();
  }

  document.addEventListener("DOMContentLoaded", function () {
    injectDesktopElements();
    injectFloatingSearch();
    injectLegacyHiddenElements();
    ensureSidebar();
    injectDesktopFooter();
    injectStandardBottomNav();
    hideBottomNavOnDesktop();
    initDesktopLoginLabel();
    initSidebar();
    initNavHomeBtn();
    initSearchRedirect();
    initDesktopSearchPanel();
    initBrandBadge();
    initNoonHeaderUI();
    initSupportBadge();
    initCountrySelector();
    initRotatingPlaceholder();
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
      '.buda-header__nav{display:flex;align-items:stretch;background:#fff;border-bottom:1px solid var(--color-border,#e5e7eb);overflow:visible;position:relative;z-index:var(--z-base,1);width:100%;padding:0;box-sizing:border-box}' +
      '.taager-mega-scroll{display:flex;align-items:stretch;gap:0;overflow-x:auto;overflow-y:hidden;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;flex:1;padding:0;margin:0;direction:rtl}' +
      '.taager-mega-scroll::-webkit-scrollbar{display:none}' +
      '.taager-mega-item{position:relative;flex-shrink:0;display:flex;align-items:stretch}' +
      '.taager-mega-trigger{display:flex;align-items:center;gap:6px;padding:10px 14px;border:none;background:transparent;font-size:13px;font-weight:500;color:var(--color-text,#333);cursor:pointer;white-space:nowrap;transition:color .15s,border-bottom-color .15s;border-bottom:2px solid transparent;font-family:inherit}' +
      '.taager-mega-trigger svg{width:18px;height:18px;color:var(--color-text-muted,#999);transition:color .15s}' +
      '.taager-mega-trigger:hover,.taager-mega-item.is-open .taager-mega-trigger{color:var(--color-primary,#6D28D9);border-bottom-color:var(--color-primary,#6D28D9)}' +
      '.taager-mega-trigger:hover svg,.taager-mega-item.is-open .taager-mega-trigger svg{color:var(--color-primary,#6D28D9)}' +
      '.taager-mega-dropdown{position:fixed;z-index:9999;background:var(--color-surface,#fff);border:1px solid var(--color-border,#e5e7eb);border-radius:var(--radius-md,12px);box-shadow:var(--shadow-lg,0 8px 30px rgba(0,0,0,.12));padding:8px;display:none;flex-direction:column;gap:2px;min-width:200px;pointer-events:none;opacity:0;transition:opacity .15s}' +
      '.taager-mega-item:hover .taager-mega-dropdown,.taager-mega-item.is-open .taager-mega-dropdown{display:flex;pointer-events:auto;opacity:1}' +
      '.taager-mega-sub{display:flex;align-items:center;gap:10px;padding:8px 12px;border:none;background:transparent;font-size:13px;color:var(--color-text,#333);cursor:pointer;border-radius:var(--radius-xs,8px);transition:background .15s,color .15s;text-decoration:none;font-family:inherit;text-align:start;width:100%}' +
      '.taager-mega-sub svg{width:17px;height:17px;color:var(--color-text-muted,#999);transition:color .15s}' +
      '.taager-mega-sub:hover{background:var(--color-primary-50,#fef7ec);color:var(--color-primary,#6D28D9)}' +
      '.taager-mega-sub:hover svg{color:var(--color-primary,#6D28D9)}' +
      '@media(max-width:767px){.buda-header__nav{padding:4px 0}.taager-mega-trigger{padding:8px 10px;font-size:12px}.taager-mega-trigger svg{width:16px;height:16px}.taager-mega-dropdown{left:8px!important;right:8px!important;width:auto!important;border-radius:var(--radius-sm,8px)}}' +
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

  function megaIconSVG(name) {
    var map = {
      spa:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c-4-3-8-6-8-11 0-4 8-9 8-9s8 5 8 9c0 5-4 8-8 11z"/></svg>',
      smartphone:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
      laptop:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0-4 2H8l-4-2m16 0 2 3H2l2-3"/></svg>',
      headphones:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
      headset_mic:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v3a9 9 0 0 0 18 0v-3"/><path d="M21 12v3"/><path d="M3 12v3"/><path d="M12 2a7 7 0 0 0-7 7v4"/><path d="M5 13a7 7 0 0 0 14 0"/></svg>',
      camera_alt:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
      watch:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="6"/><polyline points="12 10 12 12 13 13"/><path d="m16.13 7.66-.81-4.05a2 2 0 0 0-2-1.61h-2.68a2 2 0 0 0-2 1.61l-.81 4.05"/><path d="m7.88 16.34.81 4.05a2 2 0 0 0 2 1.61h2.68a2 2 0 0 0 2-1.61l.81-4.05"/></svg>',
      smartwatch:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v13"/><path d="M9 18a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2"/><path d="M5 11h14"/></svg>',
      home:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
      sports_soccer:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m6.5 7.5 5.5 3.5 5.5-3.5"/><path d="M12 11v10"/><path d="m6.5 16.5 5.5-3.5 5.5 3.5"/></svg>',
      fitness_center:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5 17.5 17.5"/><path d="m6.5 17.5 11-11"/><path d="M2 8l2-2 4 4-2 2z"/><path d="M2 16l2 2 4-4-2-2z"/><path d="M20 8l-2-2-4 4 2 2z"/><path d="M20 16l-2 2-4-4 2-2z"/></svg>',
      child_care:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12a4 4 0 0 0 8 0"/><path d="M9 10h.01"/><path d="M15 10h.01"/></svg>',
      chair:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 16H7v-2a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v2z"/><path d="M7 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17"/></svg>',
      air:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>',
      toys:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><line x1="2" y1="6" x2="12" y2="2"/><line x1="22" y1="6" x2="12" y2="2"/></svg>',
      diamond:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.7 10.3a1 1 0 0 1 0-1.4l2.5-2.5a1 1 0 0 1 1.4 0l9.4 9.4a1 1 0 0 1 0 1.4l-2.5 2.5a1 1 0 0 1-1.4 0z"/><path d="m21 3-4 4"/><path d="M12 12 8 8"/></svg>',
      card_giftcard:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="8" width="20" height="12" rx="2"/><path d="M12 8v8"/><path d="M6 12h12"/><path d="M7 8V5a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v3"/></svg>',
      inventory_2:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"/><path d="M3 8h18"/><path d="M7 4h10"/><path d="M7 4a2 2 0 0 0-2 2"/><path d="M17 4a2 2 0 0 1 2 2"/></svg>',
      face_retouching_natural:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/><path d="M12 2a3 3 0 0 1 3 3v1"/><path d="M9 8V6a3 3 0 0 1 3-3"/></svg>',
      content_cut:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>',
      bluetooth:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 7 18 13 12 17 12 1 18 5 6 11"/><line x1="12" y1="17" x2="12" y2="23"/><line x1="8" y1="21" x2="16" y2="21"/></svg>',
      speaker:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><circle cx="12" cy="14" r="4"/><line x1="12" y1="6" x2="12.01" y2="6"/></svg>',
      checkroom:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 9H3l3 4h12l3-4z"/><path d="M6 13v5h4"/><path d="M14 13v5h4"/></svg>',
      medication:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 5h3"/><path d="M12 3v4"/><rect x="4" y="8" width="16" height="13" rx="2"/><path d="M8 14h8"/><path d="M12 10v8"/></svg>',
      kitchen:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v6"/><path d="M18 2v6"/><path d="M3 8h18"/><path d="M4 8v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/></svg>',
      palette:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="12.5" r="2.5"/><circle cx="8.5" cy="10.5" r="2.5"/><path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-9 9z"/></svg>',
      bed:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M22 4v16"/><path d="M2 12h20"/><path d="M4 8h4"/><path d="M16 8h4"/></svg>',
      local_laundry_service:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 8h6"/><path d="M12 12v4"/><path d="M8 14a4 4 0 1 0 8 0"/></svg>',
      baby_changing_station:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7h8"/><path d="M12 3v4"/><rect x="3" y="11" width="18" height="10" rx="2"/></svg>',
      school:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>',
      videogame_asset:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4"/><path d="M8 10v4"/><circle cx="15" cy="12" r="1"/><circle cx="18" cy="12" r="1"/></svg>',
      videocam:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
      camera:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
      lightbulb:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>',
      air_freshener:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14"/><path d="M5 16h14"/><path d="M5 12h14"/><path d="M10 4v4"/><path d="M14 4v4"/></svg>',
      local_florist:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/></svg>',
      celebration:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 13.5 9.5"/></svg>',
      business_center:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
      cable:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z"/><path d="M8 7v10"/><path d="M16 7v10"/></svg>',
      desk:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="14" width="20" height="4" rx="1"/><path d="M4 14V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8"/><line x1="8" y1="18" x2="8" y2="22"/><line x1="16" y1="18" x2="16" y2="22"/><line x1="12" y1="14" x2="12" y2="18"/></svg>',
      living:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16"/><path d="M4 16h16"/><rect x="2" y="4" width="20" height="16" rx="2"/></svg>',
    };
    return map[name] || '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
  }

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
      trigger.innerHTML = megaIconSVG(item.icon) + '<span>' + item.name + '</span>';
      itemDiv.appendChild(trigger);

      var dropdown = document.createElement("div");
      dropdown.className = "taager-mega-dropdown";

      item.subs.forEach(function (sub) {
        var btn = document.createElement("a");
        btn.className = "taager-mega-sub";
        btn.href = "products.html?category=" + item.slug + "&sub=" + sub.slug;
        btn.innerHTML = megaIconSVG(sub.icon) + '<span>' + sub.name + '</span>';
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
    var bar = document.getElementById("budaHeaderNav");
    if (bar && !bar.contains(e.target)) closeAllMega();
  });

  // Reposition on scroll
  function repositionMega() {
    var active = document.querySelector(".taager-mega-item.is-open");
    if (active) positionDropdown(active);
  }
  document.addEventListener("scroll", repositionMega, true);
  window.addEventListener("resize", function () { closeAllMega(); });

  // Header scroll behavior - hide on scroll down, show on scroll up
  var lastScrollY = window.scrollY;
  var header = document.querySelector('.buda-header');
  var headerScrollThreshold = 10; // minimum scroll before hiding

  window.addEventListener('scroll', function () {
    if (!header) return;
    var currentScrollY = window.scrollY;
    
    if (currentScrollY < headerScrollThreshold) {
      header.classList.remove('buda-header--scrolled-down');
      header.classList.add('buda-header--scrolled-up');
      return;
    }

    if (currentScrollY > lastScrollY && currentScrollY > headerScrollThreshold) {
      // Scrolling down - hide header
      header.classList.add('buda-header--scrolled-down');
      header.classList.remove('buda-header--scrolled-up');
    } else if (currentScrollY < lastScrollY) {
      // Scrolling up - show header
      header.classList.remove('buda-header--scrolled-down');
      header.classList.add('buda-header--scrolled-up');
    }
    lastScrollY = currentScrollY;
  }, { passive: true });
  
  // Init mega menu on DOM ready
  ensureMegaMenuCSS();
  var megaBar = document.getElementById("budaHeaderNav");
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

