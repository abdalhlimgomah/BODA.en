(function (global) {
  "use strict";

  var ProductSEO = {};
  var CACHE_KEY = "buda_product_seo_cache";

  ProductSEO.getClient = function () {
    return global.supabaseClient || global._supabase || null;
  };

  ProductSEO.getProductSEO = function (productId) {
    if (!productId) return Promise.resolve(null);
    var sb = ProductSEO.getClient();
    if (!sb) return Promise.resolve(null);

    return sb.from("product_seo").select("*").eq("product_id", String(productId)).maybeSingle().then(function (res) {
      if (res.error) return null;
      return res.data;
    });
  };

  ProductSEO.getBrandSEO = function (brandSlug) {
    if (!brandSlug) return Promise.resolve(null);
    var sb = ProductSEO.getClient();
    if (!sb) return Promise.resolve(null);

    return sb.from("brand_seo").select("*").eq("brand_slug", brandSlug).maybeSingle().then(function (res) {
      if (res.error) return null;
      return res.data;
    });
  };

  ProductSEO.getCategorySEO = function (catSlug) {
    if (!catSlug) return Promise.resolve(null);
    var sb = ProductSEO.getClient();
    if (!sb) return Promise.resolve(null);

    return sb.from("category_seo").select("*").eq("category_slug", catSlug).maybeSingle().then(function (res) {
      if (res.error) return null;
      return res.data;
    });
  };

  ProductSEO.getSellerSEO = function (sellerId) {
    if (!sellerId) return Promise.resolve(null);
    var sb = ProductSEO.getClient();
    if (!sb) return Promise.resolve(null);

    return sb.from("seller_seo").select("*").eq("seller_id", String(sellerId)).maybeSingle().then(function (res) {
      if (res.error) return null;
      return res.data;
    });
  };

  ProductSEO.getOfferBySlug = function (slug) {
    if (!slug) return Promise.resolve(null);
    var sb = ProductSEO.getClient();
    if (!sb) return Promise.resolve(null);

    return sb.from("seo_offers").select("*").eq("slug", slug).eq("is_active", true).maybeSingle().then(function (res) {
      if (res.error) return null;
      return res.data;
    });
  };

  ProductSEO.getActiveOffers = function (limit) {
    limit = limit || 20;
    var sb = ProductSEO.getClient();
    if (!sb) return Promise.resolve([]);

    return sb.from("seo_offers").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(limit).then(function (res) {
      if (res.error) return [];
      return res.data;
    });
  };

  ProductSEO.applyProductSEO = function (product, seoData) {
    if (!product) return;

    var M = global.MetaGenerator;
    var S = global.SchemaGenerator;
    var U = global.SEOUtils;
    if (!M || !U) return;

    var name = product.name || "";
    var brand = product.brand || product.seller || "";
    var price = Number(product.currentPrice || product.price || 0);

    // Build optimized title
    var focusKwd = (seoData && seoData.focus_keyword) || "";
    var seoTitle = seoData && seoData.seo_title ? seoData.seo_title :
      (name + (brand ? " | " + brand : "") + (focusKwd ? " | " + focusKwd : "") + " | Buda");

    // Build meta description
    var metaDesc = seoData && seoData.meta_description ? seoData.meta_description :
      (seoData && seoData.short_description ? seoData.short_description :
       (product.description ? U.truncate(product.description, 150) :
        "تسوق " + name + (brand ? " من " + brand : "") + " بأفضل سعر" + (price > 0 ? " " + price + " جنيه" : "") + ". توصيل سريع وضمان الجودة."));

    M.applyDefaults({
      title: U.truncate(seoTitle, 70),
      description: U.truncate(metaDesc, 160),
      keywords: [name, brand, focusKwd, "تسوق", "Buda"].filter(Boolean).join(", "),
      url: seoData && seoData.canonical_url ? seoData.canonical_url : window.location.href,
      image: seoData && seoData.og_image ? seoData.og_image : (product.image || ""),
      type: "product",
    });

    if (seoData && seoData.og_title) U.updateMetaTag("og:title", seoData.og_title, "og:title");
    if (seoData && seoData.og_description) U.updateMetaTag("og:description", seoData.og_description, "og:description");

    if (S) {
      S.injectProduct(product, {
        price: price,
        description: metaDesc,
        sku: product.sku || product.id,
        brand: { name: brand },
      });

      var aggregateRating = product.avg_rating ? {
        ratingValue: product.avg_rating,
        ratingCount: product.review_count || product.total_reviews || 0,
      } : null;

      if (aggregateRating && aggregateRating.ratingCount > 0) {
        S.injectAggregateRating(product.id, aggregateRating);
      }
    }
  };

  ProductSEO.applyBrandSEO = function (brand, seoData) {
    if (!brand) return;
    var M = global.MetaGenerator;
    if (!M) return;

    var name = brand.name || brand.brand_name || "";
    var seoTitle = (seoData && seoData.seo_title) || name + " | جميع المنتجات الأصلية | Buda";
    var metaDesc = (seoData && seoData.meta_description) || (seoData && seoData.description ? seoData.description : "تسوق جميع منتجات " + name + " الأصلية في Buda.");

    M.applyDefaults({
      title: seoTitle,
      description: metaDesc,
      keywords: [name, "براند", "منتجات أصلية", "Buda"].filter(Boolean).join(", "),
      image: seoData && seoData.banner_image ? seoData.banner_image : undefined,
    });

    if (global.SchemaGenerator) {
      global.SchemaGenerator.injectBrand({
        name: name,
        description: seoData && seoData.about ? seoData.about : undefined,
        logo: seoData && seoData.logo ? seoData.logo : undefined,
      });
    }
  };

  ProductSEO.applyCategorySEO = function (category, seoData) {
    if (!category) return;
    var M = global.MetaGenerator;
    if (!M) return;

    var name = category.name || category.slug || "";
    var seoTitle = (seoData && seoData.seo_title) || name + " | تسوق بأفضل الأسعار | Buda";
    var metaDesc = (seoData && seoData.meta_description) || (seoData && seoData.description ? seoData.description : "تسوق أفضل منتجات " + name + " في Buda. تشكيلة واسعة بأسعار تنافسية.");

    M.applyDefaults({
      title: seoTitle,
      description: metaDesc,
      keywords: [name, "تسوق", "منتجات", "Buda"].filter(Boolean).join(", "),
      image: seoData && seoData.banner_image ? seoData.banner_image : undefined,
    });
  };

  ProductSEO.applySellerSEO = function (seller, seoData) {
    if (!seller) return;
    var M = global.MetaGenerator;
    if (!M) return;

    var name = seller.name || seller.seller_name || "";
    var seoTitle = (seoData && seoData.seo_title) || name + " | متجر البائع | Buda";
    var metaDesc = (seoData && seoData.meta_description) || (seoData && seoData.about ? seoData.about : "تسوق من متجر " + name + " في Buda. تشكيلة واسعة من المنتجات.");

    M.applyDefaults({
      title: seoTitle,
      description: metaDesc,
      keywords: [name, "بائع", "متجر", "Buda"].filter(Boolean).join(", "),
      image: seoData && seoData.logo ? seoData.logo : (seoData && seoData.cover_image ? seoData.cover_image : undefined),
    });
  };

  ProductSEO.applyOfferSEO = function (offer) {
    if (!offer) return;
    var M = global.MetaGenerator;
    if (!M) return;

    var seoTitle = (offer.seo_title) || offer.title + " | عروض Buda";
    var metaDesc = (offer.meta_description) || (offer.description ? offer.description : "استفد من عرض " + offer.title + " في Buda.");

    M.applyDefaults({
      title: seoTitle,
      description: metaDesc,
      image: offer.banner_image || undefined,
      noindex: offer.is_noindex || false,
    });

    if (offer.faq_data && offer.faq_data.length && global.SchemaGenerator) {
      global.SchemaGenerator.injectFAQ(offer.faq_data);
    }
  };

  ProductSEO.renderProductFAQ = function (seoData, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var faq = seoData && seoData.faq_data;
    if (!faq || !faq.length) { container.style.display = "none"; return; }

    container.innerHTML = '<div class="product-faq"><h3 class="section-title">الأسئلة الشائعة عن المنتج</h3><div class="faq-list">' +
      faq.map(function (item, i) {
        return '<div class="faq-item"><button class="faq-question" onclick="this.parentElement.classList.toggle(\'faq-open\')">' +
          '<span>' + ProductSEO.escHtml(item.question) + '</span>' +
          '<span class="material-icons-outlined faq-icon">expand_more</span></button>' +
          '<div class="faq-answer">' + ProductSEO.escHtml(item.answer) + '</div></div>';
      }).join("") + '</div></div>';
  };

  ProductSEO.renderBrandFAQ = function (seoData, containerId) {
    ProductSEO.renderProductFAQ(seoData, containerId);
  };

  ProductSEO.renderCategoryFAQ = function (seoData, containerId) {
    ProductSEO.renderProductFAQ(seoData, containerId);
  };

  ProductSEO.renderSellerInfo = function (seller, seoData, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var name = (seller && seller.name) || (seoData && seoData.seller_name) || "";
    var about = (seoData && seoData.about) || (seller && seller.description) || "";
    var logo = (seoData && seoData.logo) || (seller && seller.logo) || "";
    var cover = (seoData && seoData.cover_image) || (seller && seller.banner) || "";
    var rating = (seoData && seoData.rating) || (seller && seller.rating) || 0;
    var totalProducts = (seoData && seoData.total_products) || (seller && seller.product_count) || 0;
    var totalOrders = (seoData && seoData.total_orders) || (seller && seller.order_count) || 0;

    container.innerHTML = '<div class="seller-header">' +
      (cover ? '<div class="seller-cover" style="background-image:url(' + cover + ')"></div>' : '') +
      '<div class="seller-info">' +
      (logo ? '<img src="' + logo + '" alt="' + ProductSEO.escHtml(name) + '" class="seller-logo">' : '') +
      '<h1 class="seller-name">' + ProductSEO.escHtml(name) + '</h1>' +
      (rating ? '<div class="seller-rating"><span class="material-icons-outlined" style="color:#f59e0b">star</span> ' + rating + '</div>' : '') +
      '<div class="seller-stats">' +
      (totalProducts ? '<span class="seller-stat">' + totalProducts + ' منتج</span>' : '') +
      (totalOrders ? '<span class="seller-stat">' + totalOrders + ' طلب</span>' : '') +
      '</div>' +
      (about ? '<p class="seller-about">' + ProductSEO.escHtml(about) + '</p>' : '') +
      '</div></div>';
  };

  ProductSEO.renderSellerFAQ = function (seoData, containerId) {
    ProductSEO.renderProductFAQ(seoData, containerId);
  };

  ProductSEO.renderAlternativeProducts = function (seoData, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var altIds = seoData && seoData.alternative_product_ids;
    if (!altIds || !altIds.length) { container.style.display = "none"; return; }

    var sb = ProductSEO.getClient();
    if (!sb) { container.style.display = "none"; return; }

    sb.from("products").select("id,name,current_price,images,slug,seller_name").in("id", altIds).limit(6).then(function (res) {
      if (res.error || !res.data || !res.data.length) { container.style.display = "none"; return; }
      container.innerHTML = '<div class="product-alternatives"><h3 class="section-title">منتجات بديلة</h3><div class="product-grid-mini">' +
        res.data.map(function (p) {
          var img = Array.isArray(p.images) ? p.images[0] : (p.images || "");
          return '<a href="product.html?id=' + p.id + '" class="product-mini-card">' +
            (img ? '<div class="product-mini-img"><img src="' + img + '" alt="' + ProductSEO.escHtml(p.name) + '" loading="lazy"></div>' : '') +
            '<div class="product-mini-info"><h4>' + ProductSEO.escHtml(p.name) + '</h4>' +
            (p.current_price ? '<span class="product-mini-price">' + p.current_price + ' جنيه</span>' : '') +
            '</div></a>';
        }).join("") + '</div></div>';
    });
  };

  ProductSEO.renderComplementaryProducts = function (seoData, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var compIds = seoData && seoData.complementary_product_ids;
    if (!compIds || !compIds.length) { container.style.display = "none"; return; }

    var sb = ProductSEO.getClient();
    if (!sb) { container.style.display = "none"; return; }

    sb.from("products").select("id,name,current_price,images,slug,seller_name").in("id", compIds).limit(6).then(function (res) {
      if (res.error || !res.data || !res.data.length) { container.style.display = "none"; return; }
      container.innerHTML = '<div class="product-complementary"><h3 class="section-title">قد تحتاج أيضاً</h3><div class="product-grid-mini">' +
        res.data.map(function (p) {
          var img = Array.isArray(p.images) ? p.images[0] : (p.images || "");
          return '<a href="product.html?id=' + p.id + '" class="product-mini-card">' +
            (img ? '<div class="product-mini-img"><img src="' + img + '" alt="' + ProductSEO.escHtml(p.name) + '" loading="lazy"></div>' : '') +
            '<div class="product-mini-info"><h4>' + ProductSEO.escHtml(p.name) + '</h4>' +
            (p.current_price ? '<span class="product-mini-price">' + p.current_price + ' جنيه</span>' : '') +
            '</div></a>';
        }).join("") + '</div></div>';
    });
  };

  ProductSEO.renderOfferBanner = function (offer, containerId) {
    var container = document.getElementById(containerId);
    if (!container || !offer) return;

    container.innerHTML = '<div class="offer-hero" style="background:linear-gradient(135deg,#1a2530,#2d3748);border-radius:20px;padding:40px;color:#fff;text-align:center;margin-bottom:32px">' +
      (offer.banner_image ? '<img src="' + offer.banner_image + '" alt="' + ProductSEO.escHtml(offer.title) + '" style="max-width:200px;margin-bottom:16px;border-radius:12px">' : '') +
      '<h1 style="font-size:32px;margin-bottom:8px">' + ProductSEO.escHtml(offer.title) + '</h1>' +
      (offer.description ? '<p style="opacity:0.85;max-width:600px;margin:0 auto 16px">' + ProductSEO.escHtml(offer.description) + '</p>' : '') +
      (offer.discount_percent ? '<div class="offer-discount-badge" style="display:inline-block;background:#ef4444;padding:8px 20px;border-radius:50px;font-size:18px;font-weight:700">خصم ' + offer.discount_percent + '%</div>' : '') +
      (offer.coupon_code ? '<div style="margin-top:12px;background:rgba(255,255,255,0.1);padding:12px 24px;border-radius:12px;display:inline-block;font-size:18px;font-weight:600;direction:ltr">كود: ' + offer.coupon_code + '</div>' : '') +
      '</div>';
  };

  ProductSEO.escHtml = function (str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  };

  global.ProductSEO = ProductSEO;
})(window);
