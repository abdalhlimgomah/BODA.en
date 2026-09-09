(function (global) {
  "use strict";

  var U = global.SEOUtils;
  var Schema = global.SchemaGenerator;
  var BreadcrumbGenerator = {};

  BreadcrumbGenerator.HOME = { name: "الرئيسية", url: "/pages/home.html" };

  BreadcrumbGenerator.build = function (items) {
    if (!Array.isArray(items) || !items.length) return [];
    var all = [BreadcrumbGenerator.HOME].concat(items);
    if (Schema) Schema.injectBreadcrumb(all);
    return all;
  };

  BreadcrumbGenerator.forProduct = function (product) {
    if (!product) return [];
    var items = [];
    if (product.category) {
      items.push({ name: product.category, url: "/pages/category-landing.html?cat=" + encodeURIComponent(product.category) });
    }
    if (product.brand) {
      items.push({ name: product.brand, url: "/pages/brand-landing.html?brand=" + encodeURIComponent(product.brand) });
    }
    items.push({ name: product.name || "منتج", url: "" });
    return BreadcrumbGenerator.build(items);
  };

  BreadcrumbGenerator.forCategory = function (category, parent) {
    if (!category) return [];
    var items = [];
    if (parent) {
      items.push({ name: parent.name || parent, url: "/pages/category-landing.html?cat=" + encodeURIComponent(parent.slug || parent) });
    }
    items.push({ name: category.name || category.slug || "قسم", url: "" });
    return BreadcrumbGenerator.build(items);
  };

  BreadcrumbGenerator.forBrand = function (brand) {
    if (!brand) return [];
    var items = [
      { name: "العلامات التجارية", url: "/pages/products.html" },
      { name: brand.name || brand.slug || "براند", url: "" },
    ];
    return BreadcrumbGenerator.build(items);
  };

  BreadcrumbGenerator.forArticle = function (article, category) {
    if (!article) return [];
    var items = [
      { name: "المدونة", url: "/pages/blog/index.html" },
    ];
    if (category) {
      items.push({ name: category.name || category, url: "/pages/blog/category.html?cat=" + encodeURIComponent(category.slug || category) });
    }
    items.push({ name: article.title || "مقال", url: "" });
    return BreadcrumbGenerator.build(items);
  };

  BreadcrumbGenerator.forStaticPage = function (pageName, parent) {
    var items = [];
    if (parent) {
      items.push({ name: parent.name || parent, url: parent.url || "" });
    }
    items.push({ name: pageName, url: "" });
    return BreadcrumbGenerator.build(items);
  };

  BreadcrumbGenerator.renderHtml = function (items) {
    if (!Array.isArray(items) || !items.length) return "";
    var html = '<nav class="seo-breadcrumb" aria-label="مسارات التنقل">';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      if (i < items.length - 1 && item.url) {
        html += '<a href="' + U.escapeHtml(item.url) + '">' + U.escapeHtml(item.name) + "</a>";
        html += '<span class="seo-breadcrumb-sep">/</span>';
      } else {
        html += '<span aria-current="page">' + U.escapeHtml(item.name) + "</span>";
      }
    }
    html += "</nav>";
    return html;
  };

  global.BreadcrumbGenerator = BreadcrumbGenerator;
})(window);
