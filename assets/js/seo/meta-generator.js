(function (global) {
  "use strict";

  var U = global.SEOUtils;
  var MetaGenerator = {};

  MetaGenerator.applyDefaults = function (opts) {
    opts = opts || {};
    var siteName = "Buda";
    var title = opts.title || siteName;
    var description = opts.description || "BudoQ هي منصة تجارة إلكترونية متعددة البائعين تجمع علامات تجارية ومتاجر مختلفة في مكان واحد.";
    var url = opts.url || window.location.href;
    var image = opts.image || U.getFullUrl("assets/icons/apple-touch-icon.png");
    var type = opts.type || "website";
    var locale = opts.locale || "ar_AR";

    U.setTitle(title);
    U.updateMetaTag("description", description);
    U.updateMetaTag("keywords", opts.keywords || "تسوق, متجر, إلكترونيات, موضة, عطور, BudoQ");

    U.updateMetaTag("og:title", title, "og:title");
    U.updateMetaTag("og:description", description, "og:description");
    U.updateMetaTag("og:url", url, "og:url");
    U.updateMetaTag("og:image", image, "og:image");
    U.updateMetaTag("og:type", type, "og:type");
    U.updateMetaTag("og:site_name", siteName, "og:site_name");
    U.updateMetaTag("og:locale", locale, "og:locale");

    U.updateMetaTag("twitter:card", "summary_large_image");
    U.updateMetaTag("twitter:title", title);
    U.updateMetaTag("twitter:description", description);
    U.updateMetaTag("twitter:image", image);

    if (opts.canonical !== false) {
      var canonicalUrl = opts.canonicalUrl || url;
      U.setCanonical(canonicalUrl);
    }

    if (opts.noindex) {
      U.setNoIndex();
    } else {
      U.setIndex();
    }
  };

  MetaGenerator.forHomePage = function () {
    MetaGenerator.applyDefaults({
      title: "BudoQ - منصة التجارة الإلكترونية المتعددة | تسوق آمن وسهل",
      description: "BudoQ هي منصة تجارة إلكترونية متعددة البائعين. تسوق آلاف المنتجات من علامات تجارية ومتاجر مختلفة في مكان واحد. أفضل الأسعار، عروض حصرية، وتوصيل سريع.",
      keywords: "تسوق, متجر إلكتروني, BudoQ, تسوق أونلاين, عروض, تخفيضات, مصر, السعودية",
      type: "website",
      url: U.getSiteUrl() + "/",
    });
  };

  MetaGenerator.forProductPage = function (product) {
    if (!product) return;
    var name = product.name || "منتج";
    var brand = product.brand || product.seller || "";
    var category = product.category || "";
    var price = Number(product.price || product.currentPrice || 0);
    var description = product.description || "";
    var image = product.image || (Array.isArray(product.images) ? product.images[0] : "") || "";
    var id = String(product.id || "");

    var title = name;
    if (brand) title = name + " | " + brand;
    title += " | اشتري بأفضل سعر | BudoQ";

    var metaDesc = name;
    if (brand) metaDesc += " " + brand;
    if (category) metaDesc += " - " + category;
    metaDesc += ". ";
    metaDesc += description ? U.truncate(description, 100) : "تسوق الآن بأفضل سعر.";
    if (price > 0) metaDesc += " سعر: " + price + " جنيه.";
    metaDesc += " توصيل سريع وأسعار منافسة.";

    var imgUrl = image;
    if (imgUrl && !/^https?:\/\//i.test(imgUrl)) {
      imgUrl = U.getFullUrl(imgUrl.replace(/^\.\.\//, ""));
    }

    MetaGenerator.applyDefaults({
      title: U.truncate(title, 70),
      description: U.truncate(metaDesc, 160),
      keywords: [name, brand, category, "تسوق", "شراء", "BudoQ"].filter(Boolean).join(", "),
      url: U.getFullUrl("pages/product.html?id=" + encodeURIComponent(id)),
      image: imgUrl || undefined,
      type: "product",
    });
  };

  MetaGenerator.forCategoryPage = function (category) {
    if (!category) return;
    var name = category.name || category.slug || "قسم";
    var desc = category.description || "تسوق أفضل منتجات " + name + " في BudoQ. تشكيلة واسعة من المنتجات الأصلية بأسعار تنافسية.";

    MetaGenerator.applyDefaults({
      title: name + " | تسوق بأفضل الأسعار | BudoQ",
      description: U.truncate(desc, 160),
      keywords: [name, "تسوق", "منتجات", "BudoQ", "عروض"].join(", "),
      url: U.getFullUrl("pages/category-landing.html?cat=" + encodeURIComponent(category.slug || category.id || "")),
      type: "website",
    });
  };

  MetaGenerator.forBrandPage = function (brand) {
    if (!brand) return;
    var name = brand.name || brand.slug || "براند";
    var desc = brand.description || "تسوق جميع منتجات " + name + " الأصلية في BudoQ. أفضل العروض والأسعار.";

    MetaGenerator.applyDefaults({
      title: name + " | جميع المنتجات الأصلية | BudoQ",
      description: U.truncate(desc, 160),
      keywords: [name, "براند", "منتجات أصلية", "BudoQ"].join(", "),
      url: U.getFullUrl("pages/brand-landing.html?brand=" + encodeURIComponent(brand.slug || brand.id || "")),
      type: "website",
    });
  };

  MetaGenerator.forSectionPage = function (section) {
    if (!section) return;
    var title = section.title || "قسم";
    var desc = section.description || "تصفح " + title + " في BudoQ. أفضل المنتجات بأسعار مميزة.";

    MetaGenerator.applyDefaults({
      title: title + " | BudoQ",
      description: U.truncate(desc, 160),
      keywords: [title, "BudoQ"].join(", "),
      type: "website",
    });
  };

  MetaGenerator.forArticlePage = function (article) {
    if (!article) return;
    var title = article.title || "مقال";
    var desc = article.description || article.excerpt || "";

    MetaGenerator.applyDefaults({
      title: title + " | مدونة BudoQ",
      description: U.truncate(desc || title, 160),
      keywords: [title, "مدونة", "مقال", "BudoQ", "تسوق"].join(", "),
      url: article.url || undefined,
      image: article.image || undefined,
      type: "article",
    });
  };

  MetaGenerator.forStaticPage = function (opts) {
    MetaGenerator.applyDefaults(opts);
  };

  global.MetaGenerator = MetaGenerator;
})(window);
