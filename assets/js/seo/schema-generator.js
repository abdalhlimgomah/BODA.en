(function (global) {
  "use strict";

  var U = global.SEOUtils;
  var SchemaGenerator = {};

  SchemaGenerator.injectOrganization = function () {
    U.injectJsonLd(U.getOrganizationSchema());
  };

  SchemaGenerator.injectWebsite = function () {
    U.injectJsonLd(U.getWebsiteSchema());
  };

  SchemaGenerator.injectBreadcrumb = function (items) {
    if (!Array.isArray(items) || !items.length) return;
    U.injectJsonLd(U.getBreadcrumbSchema(items));
  };

  SchemaGenerator.injectProduct = function (product) {
    if (!product) return;
    U.injectJsonLd(U.getProductSchema(product));
  };

  SchemaGenerator.injectArticle = function (article) {
    if (!article) return;
    U.injectJsonLd(U.getArticleSchema(article));
  };

  SchemaGenerator.injectFAQ = function (faqs) {
    if (!Array.isArray(faqs) || !faqs.length) return;
    U.injectJsonLd(U.getFAQSchema(faqs));
  };

  SchemaGenerator.injectLocalBusiness = function (opts) {
    opts = opts || {};
    var schema = {
      "@context": "https://schema.org",
      "@type": opts.type || "Store",
      name: opts.name || "بودوكيو BudoQ",
      description: opts.description || "منصة تجارة إلكترونية متعددة البائعين",
      url: U.getSiteUrl(),
      telephone: opts.phone || undefined,
      email: opts.email || "budoq.com@gmail.com",
      image: U.getFullUrl("assets/icons/apple-touch-icon.png"),
      address: opts.address
        ? {
            "@type": "PostalAddress",
            addressCountry: opts.address.country || "EG",
          }
        : undefined,
      sameAs: [
        "https://www.facebook.com/profile.php?id=61592007926624",
        "https://www.instagram.com/budoq__",
        "https://www.tiktok.com/@budoq_",
        "https://www.youtube.com/@budoq",
        "https://www.threads.net/@budoq__",
      ],
    };
    U.injectJsonLd(JSON.stringify(schema));
  };

  SchemaGenerator.injectItemList = function (items, type) {
    if (!Array.isArray(items) || !items.length) return;
    var schema = {
      "@context": "https://schema.org",
      "@type": type || "ItemList",
      itemListElement: items.map(function (item, i) {
        return {
          "@type": "ListItem",
          position: i + 1,
          url: item.url || undefined,
          name: item.name || "",
          image: item.image || undefined,
        };
      }),
    };
    U.injectJsonLd(JSON.stringify(schema));
  };

  SchemaGenerator.injectVideoObject = function (video) {
    if (!video) return;
    var schema = {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: video.name || "",
      description: video.description || "",
      thumbnailUrl: video.thumbnailUrl || video.thumbnail || undefined,
      uploadDate: video.uploadDate || video.datePublished || new Date().toISOString(),
      contentUrl: video.contentUrl || video.url || undefined,
      embedUrl: video.embedUrl || undefined,
      duration: video.duration || undefined,
    };
    U.injectJsonLd(JSON.stringify(schema));
  };

  SchemaGenerator.injectImageObject = function (image) {
    if (!image) return;
    var schema = {
      "@context": "https://schema.org",
      "@type": "ImageObject",
      url: image.url || image.src || "",
      caption: image.caption || image.alt || undefined,
      description: image.description || undefined,
      width: image.width || undefined,
      height: image.height || undefined,
    };
    U.injectJsonLd(JSON.stringify(schema));
  };

  SchemaGenerator.injectReview = function (review) {
    if (!review) return;
    var schema = {
      "@context": "https://schema.org",
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating || 5,
        bestRating: 5,
        worstRating: 0,
      },
      author: {
        "@type": "Person",
        name: review.author || review.name || "مستخدم BudoQ",
      },
      reviewBody: review.body || review.text || undefined,
      datePublished: review.datePublished || review.date || undefined,
      itemReviewed: review.itemReviewed
        ? {
            "@type": "Product",
            name: review.itemReviewed.name || "",
            image: review.itemReviewed.image || undefined,
          }
        : undefined,
    };
    U.injectJsonLd(JSON.stringify(schema));
  };

  SchemaGenerator.injectCollectionPage = function (opts) {
    if (!opts) return;
    var schema = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: opts.name || "",
      description: opts.description || undefined,
      url: opts.url || undefined,
      image: opts.image || undefined,
      about: opts.about || undefined,
    };
    U.injectJsonLd(JSON.stringify(schema));
  };

  SchemaGenerator.injectBrand = function (brand) {
    if (!brand) return;
    var schema = {
      "@context": "https://schema.org",
      "@type": "Brand",
      name: brand.name || "",
      description: brand.description || undefined,
      url: brand.url || undefined,
      logo: brand.logo || brand.logo_url || undefined,
      image: brand.image || brand.cover_url || undefined,
    };
    U.injectJsonLd(JSON.stringify(schema));
  };

  SchemaGenerator.injectCategory = function (category) {
    if (!category) return;
    var schema = {
      "@context": "https://schema.org",
      "@type": "CategoryCodeSet",
      name: category.name || "",
      description: category.description || undefined,
      url: category.url || undefined,
      image: category.image || category.image_url || undefined,
      hasCategoryCode: category.slug || undefined,
    };
    U.injectJsonLd(JSON.stringify(schema));
  };

  SchemaGenerator.injectPerson = function (person) {
    if (!person) return;
    var schema = {
      "@context": "https://schema.org",
      "@type": "Person",
      name: person.name || "",
      url: person.url || undefined,
      image: person.image || undefined,
      jobTitle: person.jobTitle || undefined,
      description: person.description || undefined,
    };
    U.injectJsonLd(JSON.stringify(schema));
  };

  SchemaGenerator.injectAllBase = function () {
    SchemaGenerator.injectOrganization();
    SchemaGenerator.injectWebsite();
  };

  global.SchemaGenerator = SchemaGenerator;
})(window);
