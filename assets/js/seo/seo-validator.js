(function (global) {
  "use strict";

  var SEOValidator = {};

  SEOValidator.checkMetaTitle = function () {
    var title = document.title || "";
    if (!title) return { pass: false, message: "عنوان الصفحة (Title) غير موجود", severity: "high" };
    if (title.length < 10) return { pass: false, message: "عنوان الصفحة قصير جداً (أقل من 10 أحرف)", severity: "medium" };
    if (title.length > 70) return { pass: false, message: "عنوان الصفحة طويل جداً (أكثر من 70 حرفاً)", severity: "low" };
    return { pass: true, message: "عنوان الصفحة جيد", severity: "none" };
  };

  SEOValidator.checkMetaDescription = function () {
    var desc = "";
    var meta = document.querySelector('meta[name="description"]');
    if (meta) desc = meta.getAttribute("content") || "";
    if (!desc) return { pass: false, message: "الوصف (Meta Description) غير موجود", severity: "high" };
    if (desc.length < 50) return { pass: false, message: "الوصف قصير جداً (أقل من 50 حرفاً)", severity: "medium" };
    if (desc.length > 165) return { pass: false, message: "الوصف طويل جداً (أكثر من 165 حرفاً)", severity: "low" };
    return { pass: true, message: "الوصف جيد", severity: "none" };
  };

  SEOValidator.checkCanonical = function () {
    var link = document.querySelector('link[rel="canonical"]');
    if (!link) return { pass: false, message: "الرابط المعياري (Canonical) غير موجود", severity: "high" };
    return { pass: true, message: "الرابط المعياري موجود", severity: "none" };
  };

  SEOValidator.checkOpenGraph = function () {
    var ogTitle = document.querySelector('meta[property="og:title"]');
    var ogDesc = document.querySelector('meta[property="og:description"]');
    var ogImage = document.querySelector('meta[property="og:image"]');
    var issues = [];
    if (!ogTitle) issues.push("og:title غير موجود");
    if (!ogDesc) issues.push("og:description غير موجود");
    if (!ogImage) issues.push("og:image غير موجود");
    return {
      pass: issues.length === 0,
      message: issues.length ? issues.join(", ") : "جميع وسوم Open Graph موجودة",
      severity: issues.length ? "high" : "none",
    };
  };

  SEOValidator.checkTwitterCards = function () {
    var card = document.querySelector('meta[name="twitter:card"]');
    if (!card) return { pass: false, message: "Twitter Card غير موجود", severity: "medium" };
    return { pass: true, message: "Twitter Card موجود", severity: "none" };
  };

  SEOValidator.checkJsonLd = function () {
    var scripts = document.querySelectorAll('script[type="application/ld+json"]');
    if (!scripts.length) return { pass: false, message: "لا يوجد أي JSON-LD Structured Data", severity: "high" };
    var valid = 0;
    scripts.forEach(function (s) {
      try { JSON.parse(s.textContent); valid++; } catch (e) {}
    });
    if (valid === 0) return { pass: false, message: "جميع بيانات JSON-LD غير صالحة", severity: "high" };
    return { pass: true, message: valid + " JSON-LD صالحة", severity: "none" };
  };

  SEOValidator.checkRobotsTxt = function () {
    var hasRobots = document.querySelector('meta[name="robots"]');
    if (!hasRobots) return { pass: false, message: "وسم robots غير موجود", severity: "medium" };
    return { pass: true, message: "وسم robots موجود", severity: "none" };
  };

  SEOValidator.checkH1 = function () {
    var h1 = document.querySelector("h1");
    if (!h1) return { pass: false, message: "لا يوجد وسم H1 في الصفحة", severity: "high" };
    var text = (h1.textContent || "").trim();
    if (!text) return { pass: false, message: "وسم H1 فارغ", severity: "high" };
    if (text.length > 70) return { pass: false, message: "وسم H1 طويل جداً (أكثر من 70 حرفاً)", severity: "low" };
    return { pass: true, message: "وسم H1 موجود وجيد", severity: "none" };
  };

  SEOValidator.checkImagesAlt = function () {
    var images = document.querySelectorAll("img:not([alt])");
    if (images.length) return { pass: false, message: images.length + " صورة (صور) بدون Alt text", severity: "medium" };
    return { pass: true, message: "جميع الصور تحتوي على Alt text", severity: "none" };
  };

  SEOValidator.checkLanguage = function () {
    var html = document.documentElement;
    var lang = html.getAttribute("lang");
    var dir = html.getAttribute("dir");
    var issues = [];
    if (!lang) issues.push("لغة الصفحة (lang) غير محددة");
    if (!dir) issues.push("اتجاه الصفحة (dir) غير محدد");
    return {
      pass: issues.length === 0,
      message: issues.length ? issues.join(", ") : "اللغة والاتجاه مضبوطان",
      severity: issues.length ? "medium" : "none",
    };
  };

  SEOValidator.checkViewport = function () {
    var vp = document.querySelector('meta[name="viewport"]');
    if (!vp) return { pass: false, message: "وسم viewport غير موجود", severity: "high" };
    return { pass: true, message: "وسم viewport موجود", severity: "none" };
  };

  SEOValidator.runFullAudit = function () {
    return {
      title: SEOValidator.checkMetaTitle(),
      description: SEOValidator.checkMetaDescription(),
      canonical: SEOValidator.checkCanonical(),
      openGraph: SEOValidator.checkOpenGraph(),
      twitterCards: SEOValidator.checkTwitterCards(),
      jsonLd: SEOValidator.checkJsonLd(),
      robots: SEOValidator.checkRobotsTxt(),
      h1: SEOValidator.checkH1(),
      imagesAlt: SEOValidator.checkImagesAlt(),
      language: SEOValidator.checkLanguage(),
      viewport: SEOValidator.checkViewport(),
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };
  };

  SEOValidator.generateReportHtml = function () {
    var audit = SEOValidator.runFullAudit();
    var html = '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير SEO - Buda</title>';
    html += '<style>body{font-family:system-ui,sans-serif;background:#f8f9fa;padding:20px;max-width:800px;margin:0 auto;direction:rtl}';
    html += 'h1{color:#1a2530;font-size:24px;margin-bottom:4px}.url{color:#64748b;font-size:14px;margin-bottom:24px}';
    html += '.summary{display:grid;gap:12px}.item{background:#fff;border-radius:12px;padding:16px;display:flex;align-items:center;gap:12px;box-shadow:0 1px 4px rgba(0,0,0,0.06)}';
    html += '.icon{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}';
    html += '.pass{background:#dcfce7;color:#16a34a}.fail-high{background:#fef2f2;color:#ef4444}.fail-med{background:#fef9c3;color:#ca8a04}.fail-low{background:#fef9c3;color:#ca8a04}';
    html += '.info{flex:1}.info strong{display:block;font-size:14px;color:#1a2530}.info span{font-size:13px;color:#64748b}</style></head><body>';
    html += '<h1>تقرير تحسين محركات البحث (SEO Audit)</h1>';
    html += '<p class="url">' + audit.url + " | " + audit.timestamp + "</p><div class='summary'>";

    var checks = [
      { key: "title", label: "عنوان الصفحة" },
      { key: "description", label: "الوصف" },
      { key: "canonical", label: "Canonical URL" },
      { key: "openGraph", label: "Open Graph" },
      { key: "twitterCards", label: "Twitter Cards" },
      { key: "jsonLd", label: "JSON-LD" },
      { key: "robots", label: "وسم Robots" },
      { key: "h1", label: "وسم H1" },
      { key: "imagesAlt", label: "Alt text للصور" },
      { key: "language", label: "اللغة" },
      { key: "viewport", label: "Viewport" },
    ];

    checks.forEach(function (check) {
      var result = audit[check.key];
      var iconClass = result.pass ? "pass" : (result.severity === "high" ? "fail-high" : "fail-med");
      var icon = result.pass ? "✓" : "✗";
      html += '<div class="item"><div class="icon ' + iconClass + '">' + icon + '</div><div class="info"><strong>' + check.label + '</strong><span>' + result.message + '</span></div></div>';
    });

    html += "</div></body></html>";
    return html;
  };

  SEOValidator.showReport = function () {
    var html = SEOValidator.generateReportHtml();
    var win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  global.SEOValidator = SEOValidator;
})(window);
