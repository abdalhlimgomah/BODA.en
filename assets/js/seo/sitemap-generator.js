(function (global) {
  "use strict";

  var U = global.SEOUtils;
  var SitemapGenerator = {};

  var STATIC_PAGES = [
    { url: "/", priority: "1.0", changefreq: "daily" },
    { url: "/pages/home.html", priority: "1.0", changefreq: "daily" },
    { url: "/pages/products.html", priority: "0.9", changefreq: "daily" },
    { url: "/pages/category-landing.html", priority: "0.9", changefreq: "daily" },
    { url: "/pages/brand-landing.html", priority: "0.8", changefreq: "weekly" },
    { url: "/pages/about.html", priority: "0.5", changefreq: "monthly" },
    { url: "/pages/contact.html", priority: "0.5", changefreq: "monthly" },
    { url: "/pages/privacy.html", priority: "0.3", changefreq: "monthly" },
    { url: "/pages/returns.html", priority: "0.5", changefreq: "monthly" },
    { url: "/pages/order-tracking.html", priority: "0.4", changefreq: "monthly" },
    { url: "/pages/wishlist.html", priority: "0.4", changefreq: "monthly" },
    { url: "/pages/search.html", priority: "0.6", changefreq: "weekly" },
    { url: "/pages/checkout.html", priority: "0.3", changefreq: "monthly" },
    { url: "/pages/order-success.html", priority: "0.2", changefreq: "monthly" },
    { url: "/pages/order-summary.html", priority: "0.2", changefreq: "monthly" },
    { url: "/pages/complaints.html", priority: "0.3", changefreq: "monthly" },
    { url: "/pages/delete-account.html", priority: "0.1", changefreq: "monthly" },
  ];

  SitemapGenerator.getStaticPages = function () {
    return STATIC_PAGES;
  };

  SitemapGenerator.generateSitemapXml = function (options) {
    options = options || {};
    var baseUrl = options.baseUrl || U.getSiteUrl();
    var pages = options.pages || STATIC_PAGES;
    var productPages = options.productPages || [];
    var categoryPages = options.categoryPages || [];
    var brandPages = options.brandPages || [];
    var blogPages = options.blogPages || [];

    var allUrls = [].concat(pages);

    productPages.forEach(function (p) {
      allUrls.push({
        url: "/pages/product.html?id=" + encodeURIComponent(p.id),
        priority: "0.8",
        changefreq: "weekly",
        lastmod: p.updated_at || p.lastmod || undefined,
      });
    });

    categoryPages.forEach(function (c) {
      allUrls.push({
        url: "/pages/category-landing.html?cat=" + encodeURIComponent(c.slug || c.id || ""),
        priority: "0.7",
        changefreq: "weekly",
        lastmod: c.updated_at || undefined,
      });
    });

    brandPages.forEach(function (b) {
      allUrls.push({
        url: "/pages/brand-landing.html?brand=" + encodeURIComponent(b.slug || b.id || ""),
        priority: "0.7",
        changefreq: "weekly",
        lastmod: b.updated_at || undefined,
      });
    });

    blogPages.forEach(function (a) {
      allUrls.push({
        url: "/pages/blog/post.html?id=" + encodeURIComponent(a.id || a.slug || ""),
        priority: "0.6",
        changefreq: "monthly",
        lastmod: a.updated_at || a.datePublished || a.date || undefined,
      });
    });

    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    allUrls.forEach(function (entry) {
      var loc = baseUrl + entry.url.replace(/\/+/g, "/");
      xml += "  <url>\n";
      xml += "    <loc>" + U.escapeHtml(loc) + "</loc>\n";
      xml += "    <priority>" + (entry.priority || "0.5") + "</priority>\n";
      xml += "    <changefreq>" + (entry.changefreq || "weekly") + "</changefreq>\n";
      if (entry.lastmod) {
        var d = new Date(entry.lastmod);
        if (!isNaN(d.getTime())) {
          xml += "    <lastmod>" + d.toISOString().split("T")[0] + "</lastmod>\n";
        }
      }
      xml += "  </url>\n";
    });

    xml += "</urlset>";
    return xml;
  };

  SitemapGenerator.generateSitemapIndexXml = function (sitemaps) {
    if (!Array.isArray(sitemaps) || !sitemaps.length) return "";
    var baseUrl = U.getSiteUrl();
    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    sitemaps.forEach(function (s) {
      xml += "  <sitemap>\n";
      xml += "    <loc>" + U.escapeHtml(baseUrl + "/" + s.url.replace(/^\//, "")) + "</loc>\n";
      if (s.lastmod) {
        xml += "    <lastmod>" + s.lastmod + "</lastmod>\n";
      }
      xml += "  </sitemap>\n";
    });
    xml += "</sitemapindex>";
    return xml;
  };

  SitemapGenerator.downloadSitemap = function (xml, filename) {
    filename = filename || "sitemap.xml";
    var blob = new Blob([xml], { type: "application/xml" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  };

  SitemapGenerator.displaySitemap = function (xml) {
    var win = window.open("", "_blank");
    if (win) {
      win.document.write("<pre>" + U.escapeHtml(xml) + "</pre>");
      win.document.close();
    }
  };

  global.SitemapGenerator = SitemapGenerator;
})(window);
