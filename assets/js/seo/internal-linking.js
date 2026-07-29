(function (global) {
  "use strict";

  var InternalLinking = {};

  InternalLinking.getClient = function () {
    return global.supabaseClient || global._supabase || null;
  };

  InternalLinking.addRelatedLinks = function (containerId, links) {
    var container = document.getElementById(containerId);
    if (!container || !links || !links.length) return;

    container.innerHTML = '<div class="internal-links"><h4 class="internal-links-title">روابط ذات صلة</h4><ul class="internal-links-list">' +
      links.map(function (link) {
        return '<li><a href="' + link.url + '" class="internal-link" data-link-type="' + (link.type || "related") + '">' + InternalLinking.escHtml(link.text) + '</a></li>';
      }).join("") + '</ul></div>';
    container.style.display = "";
  };

  InternalLinking.getProductLinks = function (product) {
    if (!product) return [];

    var links = [];
    var name = product.name || "";
    var brand = product.brand || product.seller_name || "";
    var category = product.category || "";

    if (brand) {
      links.push({
        text: "جميع منتجات " + brand,
        url: "/pages/brand-landing.html?brand=" + encodeURIComponent(brand),
        type: "brand",
      });
    }

    if (category) {
      links.push({
        text: "جميع منتجات " + category,
        url: "/pages/category-landing.html?cat=" + encodeURIComponent(category),
        type: "category",
      });
    }

    if (product.seller_id || product.seller) {
      links.push({
        text: "منتجات البائع",
        url: "/pages/seller.html?id=" + encodeURIComponent(product.seller_id || product.seller),
        type: "seller",
      });
    }

    links.push({
      text: "عروض وتخفيضات",
      url: "/pages/offers.html",
      type: "offer",
    });

    links.push({
      text: "مركز المعرفة",
      url: "/pages/knowledge-center.html",
      type: "knowledge",
    });

    return links;
  };

  InternalLinking.getCategoryLinks = function (category) {
    if (!category) return [];

    var links = [];
    var name = category.name || category.slug || "";

    links.push({
      text: "الرئيسية",
      url: "/",
      type: "home",
    });

    links.push({
      text: "أفضل منتجات " + name,
      url: "/pages/category-landing.html?cat=" + encodeURIComponent(name),
      type: "category",
    });

    return links;
  };

  InternalLinking.getBrandLinks = function (brand) {
    if (!brand) return [];

    var links = [];
    var name = brand.name || brand.slug || "";

    links.push({
      text: "جميع منتجات " + name,
      url: "/pages/brand-landing.html?brand=" + encodeURIComponent(name),
      type: "brand",
    });

    links.push({
      text: "الرئيسية",
      url: "/",
      type: "home",
    });

    return links;
  };

  InternalLinking.getArticleLinks = function (article) {
    if (!article) return [];

    var links = [];

    if (article.category_name) {
      links.push({
        text: "مقالات " + article.category_name,
        url: "/pages/blog/?category=" + encodeURIComponent(article.category_name),
        type: "blog_category",
      });
    }

    links.push({
      text: "جميع المقالات",
      url: "/pages/blog/",
      type: "blog",
    });

    links.push({
      text: "مركز المعرفة",
      url: "/pages/knowledge-center.html",
      type: "knowledge",
    });

    return links;
  };

  InternalLinking.addBreadcrumbJSONLD = function (items) {
    if (!items || !items.length || !global.SchemaGenerator) return;
    global.SchemaGenerator.injectBreadcrumb(items);
  };

  InternalLinking.addSEOKeywords = function (keywords, containerId) {
    var container = document.getElementById(containerId);
    if (!container || !keywords || !keywords.length) return;

    container.innerHTML = '<div class="seo-keywords"><h4 class="seo-keywords-title">كلمات مفتاحية</h4><div class="seo-keywords-list">' +
      keywords.map(function (kw) {
        return '<a href="/pages/search.html?q=' + encodeURIComponent(kw) + '" class="seo-keyword-tag">' + InternalLinking.escHtml(kw) + '</a>';
      }).join("") + '</div></div>';
  };

  InternalLinking.trackClick = function (sourceUrl, targetUrl, linkType) {
    var sb = InternalLinking.getClient();
    if (!sb) return;

    sb.rpc("increment_link_click", {
      p_source: sourceUrl,
      p_target: targetUrl,
    }).catch(function () {});
  };

  InternalLinking.escHtml = function (str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  };

  global.InternalLinking = InternalLinking;
})(window);
