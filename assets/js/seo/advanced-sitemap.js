(function (global) {
  "use strict";

  var AdvancedSitemap = {};

  var SITEMAP_BASE = (typeof SEOUtils !== "undefined" ? SEOUtils.getSiteUrl() : "https://buda-rho.vercel.app");
  var DOMAIN = SITEMAP_BASE.replace(/^https?:\/\//, "");

  AdvancedSitemap.getClient = function () {
    return global.supabaseClient || global._supabase || null;
  };

  AdvancedSitemap.generateAll = function () {
    var sb = AdvancedSitemap.getClient();
    if (!sb) {
      console.warn("AdvancedSitemap: no Supabase client");
      return Promise.resolve(AdvancedSitemap.getDemoSitemaps());
    }

    return Promise.all([
      AdvancedSitemap.generateProductSitemap(),
      AdvancedSitemap.generateCategorySitemap(),
      AdvancedSitemap.generateBrandSitemap(),
      AdvancedSitemap.generateBlogSitemap(),
      AdvancedSitemap.generateGuideSitemap(),
      AdvancedSitemap.generateComparisonSitemap(),
      AdvancedSitemap.generateImageSitemap(),
      AdvancedSitemap.generateLandingSitemap(),
    ]).then(function (results) {
      var index = AdvancedSitemap.buildSitemapIndex(results);
      return { sitemaps: results, index: index };
    });
  };

  AdvancedSitemap.generateProductSitemap = function () {
    var sb = AdvancedSitemap.getClient();
    if (!sb) return Promise.resolve({ type: "products", urls: AdvancedSitemap.getDemoProductUrls() });

    return sb.from("products").select("id,name,updated_at").limit(50000).then(function (res) {
      if (res.error) return { type: "products", urls: [] };
      var urls = (res.data || []).map(function (p) {
        return {
          loc: SITEMAP_BASE + "/pages/product.html?id=" + encodeURIComponent(p.id),
          lastmod: p.updated_at || new Date().toISOString(),
          changefreq: "weekly",
          priority: "0.9",
          images: [],
        };
      });
      return { type: "products", urls: urls };
    });
  };

  AdvancedSitemap.generateCategorySitemap = function () {
    var urls = [
      { loc: SITEMAP_BASE + "/pages/category-landing.html", priority: "0.9", changefreq: "daily" },
    ];
    return { type: "categories", urls: urls };
  };

  AdvancedSitemap.generateBrandSitemap = function () {
    var sb = AdvancedSitemap.getClient();
    if (!sb) return Promise.resolve({ type: "brands", urls: [] });

    return sb.from("products").select("seller_name").not("seller_name", "is", null).then(function (res) {
      if (res.error) return { type: "brands", urls: [] };
      var seen = {};
      var urls = (res.data || []).filter(function (p) {
        var name = (p.seller_name || "").trim().toLowerCase();
        if (!name || seen[name]) return false;
        seen[name] = true;
        return true;
      }).map(function (p) {
        return {
          loc: SITEMAP_BASE + "/pages/brand-landing.html?brand=" + encodeURIComponent(p.seller_name),
          changefreq: "weekly",
          priority: "0.8",
        };
      });
      return { type: "brands", urls: urls };
    });
  };

  AdvancedSitemap.generateBlogSitemap = function () {
    var sb = AdvancedSitemap.getClient();
    if (!sb) return Promise.resolve({ type: "blog", urls: AdvancedSitemap.getDemoBlogUrls() });

    return sb.from("blog_posts").select("slug,updated_at,published_at").eq("status", "published").limit(5000).then(function (res) {
      if (res.error) return { type: "blog", urls: [] };
      var urls = (res.data || []).map(function (p) {
        return {
          loc: SITEMAP_BASE + "/pages/blog/post.html?slug=" + encodeURIComponent(p.slug),
          lastmod: p.updated_at || p.published_at || new Date().toISOString(),
          changefreq: "monthly",
          priority: "0.7",
        };
      });
      urls.unshift({ loc: SITEMAP_BASE + "/pages/blog/", changefreq: "daily", priority: "0.9" });
      return { type: "blog", urls: urls };
    });
  };

  AdvancedSitemap.generateGuideSitemap = function () {
    var sb = AdvancedSitemap.getClient();
    if (!sb) return Promise.resolve({ type: "guides", urls: [] });

    return sb.from("buying_guides").select("slug,updated_at").eq("is_active", true).limit(2000).then(function (res) {
      if (res.error) return { type: "guides", urls: [] };
      var urls = (res.data || []).map(function (g) {
        return {
          loc: SITEMAP_BASE + "/pages/guide.html?slug=" + encodeURIComponent(g.slug),
          lastmod: g.updated_at || new Date().toISOString(),
          changefreq: "monthly",
          priority: "0.7",
        };
      });
      return { type: "guides", urls: urls };
    });
  };

  AdvancedSitemap.generateComparisonSitemap = function () {
    var sb = AdvancedSitemap.getClient();
    if (!sb) return Promise.resolve({ type: "comparisons", urls: [] });

    return sb.from("comparison_pages").select("slug,updated_at").eq("is_active", true).limit(2000).then(function (res) {
      if (res.error) return { type: "comparisons", urls: [] };
      var urls = (res.data || []).map(function (c) {
        return {
          loc: SITEMAP_BASE + "/pages/comparison.html?slug=" + encodeURIComponent(c.slug),
          lastmod: c.updated_at || new Date().toISOString(),
          changefreq: "monthly",
          priority: "0.7",
        };
      });
      return { type: "comparisons", urls: urls };
    });
  };

  AdvancedSitemap.generateImageSitemap = function () {
    var urls = [];
    var images = document.querySelectorAll("img[src]");
    images.forEach(function (img) {
      var src = img.getAttribute("src") || "";
      if (src && (src.startsWith("http") || src.startsWith("/"))) {
        var fullUrl = src.startsWith("http") ? src : SITEMAP_BASE + src;
        urls.push({
          loc: fullUrl,
          title: img.getAttribute("alt") || img.getAttribute("title") || "",
          caption: img.getAttribute("alt") || "",
        });
      }
    });
    return { type: "images", urls: urls };
  };

  AdvancedSitemap.generateLandingSitemap = function () {
    var sb = AdvancedSitemap.getClient();
    if (!sb) return Promise.resolve({ type: "landing", urls: [] });

    return sb.from("landing_pages").select("slug,updated_at").eq("is_active", true).limit(1000).then(function (res) {
      if (res.error) return { type: "landing", urls: [] };
      var urls = (res.data || []).map(function (l) {
        return {
          loc: SITEMAP_BASE + "/pages/landing.html?slug=" + encodeURIComponent(l.slug),
          lastmod: l.updated_at || new Date().toISOString(),
          changefreq: "weekly",
          priority: "0.8",
        };
      });
      urls.unshift({ loc: SITEMAP_BASE + "/pages/knowledge-center.html", changefreq: "daily", priority: "0.9" });
      return { type: "landing", urls: urls };
    });
  };

  AdvancedSitemap.buildSitemapIndex = function (sitemaps) {
    var now = new Date().toISOString();
    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    sitemaps.forEach(function (sitemap) {
      if (sitemap.urls && sitemap.urls.length) {
        var filename = "sitemap-" + sitemap.type + ".xml";
        xml += '  <sitemap>\n    <loc>' + SITEMAP_BASE + "/" + filename + "</loc>\n    <lastmod>" + now + "</lastmod>\n  </sitemap>\n";
      }
    });

    xml += "</sitemapindex>";
    return xml;
  };

  AdvancedSitemap.buildSitemapXml = function (urls) {
    if (!urls || !urls.length) return "";
    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
    var hasImages = urls.some(function (u) { return u.images && u.images.length; });
    if (hasImages) xml += ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';
    xml += ">\n";

    urls.forEach(function (u) {
      xml += "  <url>\n    <loc>" + u.loc + "</loc>\n";
      if (u.lastmod) xml += "    <lastmod>" + u.lastmod + "</lastmod>\n";
      if (u.changefreq) xml += "    <changefreq>" + u.changefreq + "</changefreq>\n";
      if (u.priority) xml += "    <priority>" + u.priority + "</priority>\n";
      if (u.images && u.images.length) {
        u.images.forEach(function (img) {
          xml += '    <image:image>\n      <image:loc>' + img.loc + "</image:loc>\n";
          if (img.title) xml += "      <image:title>" + AdvancedSitemap.escXml(img.title) + "</image:title>\n";
          if (img.caption) xml += "      <image:caption>" + AdvancedSitemap.escXml(img.caption) + "</image:caption>\n";
          xml += "    </image:image>\n";
        });
      }
      xml += "  </url>\n";
    });

    xml += "</urlset>";
    return xml;
  };

  AdvancedSitemap.escXml = function (s) {
    if (!s) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  };

  AdvancedSitemap.getDemoProductUrls = function () {
    return [
      { loc: SITEMAP_BASE + "/pages/product.html?id=1", changefreq: "weekly", priority: "0.9" },
      { loc: SITEMAP_BASE + "/pages/product.html?id=2", changefreq: "weekly", priority: "0.9" },
    ];
  };

  AdvancedSitemap.getDemoBlogUrls = function () {
    return [
      { loc: SITEMAP_BASE + "/pages/blog/", changefreq: "daily", priority: "0.9" },
    ];
  };

  global.AdvancedSitemap = AdvancedSitemap;
})(window);
