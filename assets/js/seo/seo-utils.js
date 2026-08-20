(function (global) {
  "use strict";

  var SEOUtils = {};

  SEOUtils.escapeHtml = function (text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  SEOUtils.truncate = function (text, maxLen) {
    var t = String(text ?? "").trim();
    if (t.length <= maxLen) return t;
    return t.slice(0, maxLen - 3) + "...";
  };

  SEOUtils.slugify = function (text) {
    var t = String(text ?? "").trim().toLowerCase();
    t = t.replace(/[^\w\s\u0600-\u06FF-]/g, "");
    t = t.replace(/[\s_]+/g, "-");
    t = t.replace(/-+/g, "-");
    t = t.replace(/^-|-$/g, "");
    return t || "page";
  };

  SEOUtils.getSiteUrl = function () {
    var url = window.location.origin;
    if (url === "null" || !url) url = "https://budoq.vercel.app";
    return url.replace(/\/+$/, "");
  };

  SEOUtils.getPagePrefix = function () {
    return window.location.pathname.includes("/pages/") ? "../" : "";
  };

  SEOUtils.getFullUrl = function (path) {
    return SEOUtils.getSiteUrl() + "/" + String(path ?? "").replace(/^\/+/, "");
  };

  SEOUtils.getQueryParam = function (name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name) || "";
  };

  SEOUtils.getCurrentPath = function () {
    return window.location.pathname.replace(/\/+$/, "") || "/";
  };

  SEOUtils.generateBreadcrumbJsonLd = function (items) {
    if (!Array.isArray(items) || !items.length) return "";
    var url = SEOUtils.getSiteUrl();
    var itemList = items.map(function (item, i) {
      return {
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        item: item.url ? url + "/" + item.url.replace(/^\//, "") : undefined,
      };
    });
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: itemList,
    });
  };

  SEOUtils.injectJsonLd = function (jsonString) {
    if (!jsonString) return;
    var script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = jsonString;
    document.head.appendChild(script);
  };

  SEOUtils.updateMetaTag = function (name, content, property) {
    if (!content) return;
    var selector = property
      ? 'meta[property="' + property + '"]'
      : 'meta[name="' + name + '"], meta[property="' + name + '"]';
    var el = document.querySelector(selector);
    if (el) {
      el.setAttribute("content", content);
      return;
    }
    el = document.createElement("meta");
    if (property) {
      el.setAttribute("property", property);
    } else {
      el.setAttribute("name", name);
    }
    el.setAttribute("content", content);
    document.head.appendChild(el);
  };

  SEOUtils.setTitle = function (title) {
    if (!title) return;
    document.title = title;
  };

  SEOUtils.setCanonical = function (url) {
    if (!url) return;
    var existing = document.querySelector('link[rel="canonical"]');
    if (existing) {
      existing.setAttribute("href", url);
      return;
    }
    var link = document.createElement("link");
    link.rel = "canonical";
    link.href = url;
    document.head.appendChild(link);
  };

  SEOUtils.setNoIndex = function () {
    SEOUtils.updateMetaTag("robots", "noindex, nofollow");
  };

  SEOUtils.setIndex = function () {
    SEOUtils.updateMetaTag("robots", "index, follow");
  };

  SEOUtils.getProductSchema = function (product) {
    if (!product) return "";
    var url = SEOUtils.getSiteUrl();
    var id = String(product.id || "");
    var name = product.name || "";
    var desc = product.description || "";
    var price = Number(product.price || product.currentPrice || 0);
    var originalPrice = Number(product.originalPrice || 0);
    var image = product.image || (Array.isArray(product.images) ? product.images[0] : "") || "";
    var brand = product.brand || product.seller || "";
    var rating = Number(product.rating || 0);
    var reviewCount = Number(product.reviewCount || 0);
    var availability = product.stockStatus === "out_of_stock"
      ? "https://schema.org/OutOfStock"
      : "https://schema.org/InStock";

    var schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: name,
      description: desc,
      image: image ? [image] : undefined,
      sku: id,
      brand: brand ? { "@type": "Brand", name: brand } : undefined,
      offers: {
        "@type": "Offer",
        url: url + "/pages/product.html?id=" + encodeURIComponent(id),
        priceCurrency: "EGP",
        price: price,
        priceValidUntil: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
        availability: availability,
        itemCondition: "https://schema.org/NewCondition",
      },
    };

    if (rating > 0 && reviewCount > 0) {
      schema.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: rating,
        reviewCount: reviewCount,
        bestRating: 5,
        worstRating: 0,
      };
    }

    return JSON.stringify(schema);
  };

  SEOUtils.getOrganizationSchema = function () {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "BudoQ",
      url: SEOUtils.getSiteUrl(),
      logo: SEOUtils.getFullUrl("assets/icons/apple-touch-icon.png"),
      sameAs: [
        "https://www.facebook.com/profile.php?id=61592007926624",
        "https://www.instagram.com/budoq__",
        "https://www.tiktok.com/@budoq_",
        "https://www.youtube.com/@budoq",
        "https://www.threads.net/@budoq__",
      ],
    });
  };

  SEOUtils.getWebsiteSchema = function () {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "بودوكيو BudoQ",
      url: SEOUtils.getSiteUrl(),
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: SEOUtils.getSiteUrl() + "/pages/search.html?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    });
  };

  SEOUtils.getArticleSchema = function (article) {
    if (!article) return "";
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title || "",
      description: article.description || "",
      image: article.image || undefined,
      datePublished: article.datePublished || undefined,
      dateModified: article.dateModified || article.datePublished || undefined,
      author: {
        "@type": "Person",
        name: article.author || "Buda",
      },
      publisher: {
        "@type": "Organization",
        name: "Buda",
        logo: {
          "@type": "ImageObject",
          url: SEOUtils.getFullUrl("assets/icons/apple-touch-icon.png"),
        },
      },
    });
  };

  SEOUtils.getFAQSchema = function (faqs) {
    if (!Array.isArray(faqs) || !faqs.length) return "";
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(function (faq) {
        return {
          "@type": "Question",
          name: faq.question || "",
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer || "",
          },
        };
      }),
    });
  };

  SEOUtils.getBreadcrumbSchema = function (items) {
    return SEOUtils.generateBreadcrumbJsonLd(items);
  };

  global.SEOUtils = SEOUtils;
})(window);
