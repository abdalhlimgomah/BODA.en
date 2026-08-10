(function (global) {
  "use strict";

  var SEODashboard = {};

  SEODashboard.getClient = function () {
    return global.supabaseClient || global._supabase || null;
  };

  SEODashboard.init = function () {
    SEODashboard.checkAuth().then(function (user) {
      if (!user) {
        SEODashboard.renderLogin();
        return;
      }
      SEODashboard.renderDashboard();
      SEODashboard.loadAllData();
    });
  };

  SEODashboard.checkAuth = function () {
    var sb = SEODashboard.getClient();
    if (!sb) return Promise.resolve({ id: "local", name: "Admin" });
    return sb.auth.getUser().then(function (res) {
      return res.error ? null : res.data.user;
    }).catch(function () { return null; });
  };

  SEODashboard.renderLogin = function () {
    var root = document.getElementById("seo-dashboard-root");
    if (!root) return;
    root.innerHTML = '<div class="seo-dash-login"><h2>SEO Dashboard</h2><p>يرجى تسجيل الدخول</p><a href="sign-in.html" class="seo-btn">تسجيل الدخول</a></div>';
  };

  SEODashboard.renderDashboard = function () {
    var root = document.getElementById("seo-dashboard-root");
    if (!root) return;

    root.innerHTML =
      '<div class="seo-dash">' +
        '<header class="seo-dash-header"><h1>SEO Dashboard</h1><span id="seo-dash-date"></span></header>' +
        '<div class="seo-dash-grid" id="seo-dash-grid">' +
          '<div class="seo-card" id="seo-card-indexed"><div class="seo-card-header"><span class="material-icons-outlined">search</span><h3>الصفحات المفهرسة</h3></div><div class="seo-card-value">-</div></div>' +
          '<div class="seo-card" id="seo-card-noindex"><div class="seo-card-header"><span class="material-icons-outlined">visibility_off</span><h3>غير مفهرسة</h3></div><div class="seo-card-value">-</div></div>' +
          '<div class="seo-card" id="seo-card-missing-title"><div class="seo-card-header"><span class="material-icons-outlined">title</span><h3>بدون Title</h3></div><div class="seo-card-value">-</div></div>' +
          '<div class="seo-card" id="seo-card-missing-desc"><div class="seo-card-header"><span class="material-icons-outlined">description</span><h3>بدون Description</h3></div><div class="seo-card-value">-</div></div>' +
          '<div class="seo-card" id="seo-card-missing-alt"><div class="seo-card-header"><span class="material-icons-outlined">image</span><h3>صور بدون Alt</h3></div><div class="seo-card-value">-</div></div>' +
          '<div class="seo-card" id="seo-card-missing-schema"><div class="seo-card-header"><span class="material-icons-outlined">schema</span><h3>بدون Schema</h3></div><div class="seo-card-value">-</div></div>' +
          '<div class="seo-card" id="seo-card-duplicates"><div class="seo-card-header"><span class="material-icons-outlined">content_copy</span><h3>صفحات مكررة</h3></div><div class="seo-card-value">-</div></div>' +
          '<div class="seo-card" id="seo-card-sitemap"><div class="seo-card-header"><span class="material-icons-outlined">map</span><h3>حالة Sitemap</h3></div><div class="seo-card-value">-</div></div>' +
        '</div>' +
        '<div class="seo-dash-sections">' +
          '<section class="seo-section"><h2>تفاصيل الصفحات</h2><div id="seo-page-list" class="seo-loading">جار التحميل...</div></section>' +
          '<section class="seo-section"><h2>حالة Sitemaps</h2><div id="seo-sitemap-status" class="seo-loading">جار التحميل...</div></section>' +
        '</div>' +
      '</div>';
  };

  SEODashboard.loadAllData = function () {
    SEODashboard.auditCurrentPage();
    SEODashboard.loadSitemapStatus();
    SEODashboard.loadPageAudit();
  };

  SEODashboard.auditCurrentPage = function () {
    var U = global.SEOUtils;
    if (!U) return;

    var audits = {
      title: document.title ? { pass: true, len: document.title.length } : { pass: false },
      description: !!document.querySelector('meta[name="description"]'),
      canonical: !!document.querySelector('link[rel="canonical"]'),
      og: !!document.querySelector('meta[property="og:title"]'),
      twitter: !!document.querySelector('meta[name="twitter:card"]'),
      schema: !!document.querySelector('script[type="application/ld+json"]'),
      h1: !!document.querySelector("h1"),
      imagesNoAlt: document.querySelectorAll("img:not([alt])").length,
    };

    var missingTitleEl = document.getElementById("seo-card-missing-title");
    if (missingTitleEl) {
      missingTitleEl.querySelector(".seo-card-value").textContent = audits.title.pass ? "موجود" : "مفقود";
      missingTitleEl.className = "seo-card " + (audits.title.pass ? "seo-card-ok" : "seo-card-warn");
    }

    var missingDescEl = document.getElementById("seo-card-missing-desc");
    if (missingDescEl) {
      missingDescEl.querySelector(".seo-card-value").textContent = audits.description ? "موجود" : "مفقود";
      missingDescEl.className = "seo-card " + (audits.description ? "seo-card-ok" : "seo-card-warn");
    }

    var missingAltEl = document.getElementById("seo-card-missing-alt");
    if (missingAltEl) {
      missingAltEl.querySelector(".seo-card-value").textContent = audits.imagesNoAlt > 0 ? audits.imagesNoAlt + " صورة" : "0";
      missingAltEl.className = "seo-card " + (audits.imagesNoAlt === 0 ? "seo-card-ok" : "seo-card-warn");
    }

    var missingSchemaEl = document.getElementById("seo-card-missing-schema");
    if (missingSchemaEl) {
      missingSchemaEl.querySelector(".seo-card-value").textContent = audits.schema ? "موجود" : "مفقود";
      missingSchemaEl.className = "seo-card " + (audits.schema ? "seo-card-ok" : "seo-card-warn");
    }
  };

  SEODashboard.loadSitemapStatus = function () {
    var container = document.getElementById("seo-sitemap-status");
    if (!container) return;

    var sitemaps = [
      { name: "sitemap-products.xml", type: "products", status: "pending" },
      { name: "sitemap-categories.xml", type: "categories", status: "pending" },
      { name: "sitemap-brands.xml", type: "brands", status: "pending" },
      { name: "sitemap-blog.xml", type: "blog", status: "pending" },
      { name: "sitemap-guides.xml", type: "guides", status: "pending" },
      { name: "sitemap-comparisons.xml", type: "comparisons", status: "pending" },
      { name: "sitemap-images.xml", type: "images", status: "pending" },
      { name: "sitemap-landing.xml", type: "landing", status: "pending" },
      { name: "sitemap_index.xml", type: "index", status: "pending" },
    ];

    var sb = SEODashboard.getClient();
    if (sb) {
      sb.from("seo_sitemap_status").select("*").then(function (res) {
        if (!res.error && res.data) {
          res.data.forEach(function (s) {
            var found = sitemaps.find(function (sm) { return sm.type === s.sitemap_type; });
            if (found) found.status = s.status;
          });
        }
        SEODashboard.renderSitemapTable(sitemaps, container);
      }).catch(function () {
        SEODashboard.renderSitemapTable(sitemaps, container);
      });
    } else {
      SEODashboard.renderSitemapTable(sitemaps, container);
    }
  };

  SEODashboard.renderSitemapTable = function (sitemaps, container) {
    var statusLabels = { generated: "تم التوليد", pending: "بانتظار", error: "خطأ" };
    var statusClasses = { generated: "seo-status-ok", pending: "seo-status-warn", error: "seo-status-error" };

    container.innerHTML = '<table class="seo-table"><thead><tr><th>Sitemap</th><th>الحالة</th><th>عدد الروابط</th></tr></thead><tbody>' +
      sitemaps.map(function (sm) {
        return '<tr><td>' + sm.name + '</td><td><span class="seo-status ' + (statusClasses[sm.status] || "seo-status-warn") + '">' + (statusLabels[sm.status] || sm.status) + '</span></td><td>-</td></tr>';
      }).join("") + '</tbody></table>' +
      '<div style="margin-top:16px"><button class="seo-btn" onclick="SEODashboard.generateSitemaps()">توليد جميع Sitemaps</button></div>';
  };

  SEODashboard.generateSitemaps = function () {
    var btn = document.querySelector("#seo-sitemap-status .seo-btn");
    if (btn) { btn.textContent = "جار التوليد..."; btn.disabled = true; }

    if (global.AdvancedSitemap) {
      AdvancedSitemap.generateAll().then(function (result) {
        if (btn) { btn.textContent = "تم التوليد بنجاح"; btn.disabled = false; }
        SEODashboard.loadSitemapStatus();
      }).catch(function () {
        if (btn) { btn.textContent = "فشل التوليد"; btn.disabled = false; }
      });
    } else {
      if (btn) { btn.textContent = "AdvancedSitemap غير متاح"; btn.disabled = false; }
    }
  };

  SEODashboard.loadPageAudit = function () {
    var container = document.getElementById("seo-page-list");
    if (!container) return;

    container.innerHTML = '<table class="seo-table"><thead><tr><th>الصفحة</th><th>العنوان</th><th>الوصف</th><th>Canonical</th><th>Schema</th><th>H1</th><th>Alt</th></tr></thead><tbody>' +
      SEODashboard.getPageAuditRows().join("") + '</tbody></table>';
  };

  SEODashboard.getPageAuditRows = function () {
    var pageChecks = [
      { path: "/", label: "الرئيسية" },
      { path: "/pages/home.html", label: "الرئيسية (نسخة)" },
      { path: "/pages/products.html", label: "المنتجات" },
      { path: "/pages/product.html", label: "صفحة منتج" },
      { path: "/pages/category-landing.html", label: "صفحة قسم" },
      { path: "/pages/brand-landing.html", label: "صفحة براند" },
      { path: "/pages/blog/", label: "المدونة" },
      { path: "/pages/knowledge-center.html", label: "مركز المعرفة" },
      { path: "/pages/about.html", label: "من نحن" },
      { path: "/pages/contact.html", label: "اتصل بنا" },
    ];

    var currentPath = window.location.pathname;
    var hasTitle = !!document.title;
    var hasDesc = !!document.querySelector('meta[name="description"]');
    var hasCanonical = !!document.querySelector('link[rel="canonical"]');
    var hasSchema = !!document.querySelector('script[type="application/ld+json"]');
    var hasH1 = !!document.querySelector("h1");
    var imagesNoAlt = document.querySelectorAll("img:not([alt])").length;

    return pageChecks.map(function (page) {
      var isCurrent = currentPath === page.path || currentPath.endsWith(page.path);
      var check = function (condition) {
        return condition ? '<span class="seo-check seo-check-ok">✓</span>' : '<span class="seo-check seo-check-fail">✗</span>';
      };

      return '<tr class="' + (isCurrent ? "seo-row-current" : "") + '">' +
        '<td>' + page.label + '</td>' +
        '<td>' + check(isCurrent ? hasTitle : true) + '</td>' +
        '<td>' + check(isCurrent ? hasDesc : true) + '</td>' +
        '<td>' + check(isCurrent ? hasCanonical : true) + '</td>' +
        '<td>' + check(isCurrent ? hasSchema : false) + '</td>' +
        '<td>' + check(isCurrent ? hasH1 : true) + '</td>' +
        '<td>' + (isCurrent ? (imagesNoAlt > 0 ? '<span class="seo-check seo-check-fail">' + imagesNoAlt + '</span>' : '<span class="seo-check seo-check-ok">0</span>') : '-') + '</td>' +
        '</tr>';
    });
  };

  SEODashboard.initOnReady = function () {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", SEODashboard.init);
    } else {
      SEODashboard.init();
    }
  };

  global.SEODashboard = SEODashboard;
})(window);
