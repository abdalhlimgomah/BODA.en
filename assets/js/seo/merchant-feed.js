(function (global) {
  "use strict";

  var MerchantFeed = {};

  MerchantFeed.SITE_URL = "https://budoq.com";
  MerchantFeed.FEED_TITLE = "Buda - Product Feed";
  MerchantFeed.FEED_LINK = MerchantFeed.SITE_URL + "/";
  MerchantFeed.FEED_DESCRIPTION = "Google Shopping Product Feed for Buda - Multi-vendor e-commerce platform";

  // Google Shopping taxonomy categories (partial - key ones)
  MerchantFeed.TAXONOMY = {
    electronics: "Electronics",
    fashion: "Apparel & Accessories",
    beauty: "Beauty & Personal Care",
    home: "Home & Garden",
    sports: "Sports & Outdoors",
    books: "Media",
    food: "Food & Beverages",
    health: "Health & Beauty",
    toys: "Toys & Games",
    automotive: "Auto & Tires",
    watches: "Jewelry & Watches",
    perfumes: "Beauty & Personal Care > Fragrances & Deodorants",
    bags: "Luggage & Bags",
    shoes: "Apparel & Accessories > Shoes",
  };

  MerchantFeed.getClient = function () {
    return global.supabaseClient || global._supabase || null;
  };

  // ==============================
  // GOOGLE SHOPPING XML FEED
  // ==============================
  MerchantFeed.generateFeed = function (products) {
    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n';
    xml += '  <channel>\n';
    xml += '    <title>' + MerchantFeed.escXml(MerchantFeed.FEED_TITLE) + '</title>\n';
    xml += '    <link>' + MerchantFeed.FEED_LINK + '</link>\n';
    xml += '    <description>' + MerchantFeed.escXml(MerchantFeed.FEED_DESCRIPTION) + '</description>\n';

    (products || []).forEach(function (p) {
      xml += MerchantFeed.buildProductEntry(p);
    });

    xml += '  </channel>\n';
    xml += '</rss>';
    return xml;
  };

  MerchantFeed.buildProductEntry = function (p) {
    if (!p || !p.id) return "";

    var id = String(p.id || "");
    var title = p.seo_title || p.name || "منتج";
    var description = p.meta_description || p.description || p.short_description || title;
    var link = MerchantFeed.SITE_URL + "/pages/product.html?id=" + encodeURIComponent(id);
    var image = MerchantFeed.getFirstImage(p);
    var price = Number(p.currentPrice || p.price || 0);
    var salePrice = Number(p.sale_price || p.discount_price || 0);
    var currency = "EGP";
    var availability = MerchantFeed.getAvailability(p);
    var condition = "new";
    var brand = p.brand || p.seller_name || p.seller || "Buda";
    var gtin = p.gtin || p.ean || p.upc || "";
    var mpn = p.mpn || p.sku || id;
    var googleCategory = MerchantFeed.getGoogleCategory(p);
    var productType = p.category || p.main_category || "";
    var shippingWeight = p.weight ? p.weight + " kg" : "";
    var color = p.color || "";
    var size = p.size || "";
    var gender = p.gender || "";
    var ageGroup = p.age_group || "";

    var xml = '    <item>\n';
    xml += '      <g:id>' + MerchantFeed.escXml(id) + '</g:id>\n';
    xml += '      <g:title>' + MerchantFeed.escXml(MerchantFeed.truncate(title, 150)) + '</g:title>\n';
    xml += '      <g:description>' + MerchantFeed.escXml(MerchantFeed.truncate(description, 5000)) + '</g:description>\n';
    xml += '      <g:link>' + MerchantFeed.escXml(link) + '</g:link>\n';
    if (image) xml += '      <g:image_link>' + MerchantFeed.escXml(image) + '</g:image_link>\n';
    xml += '      <g:availability>' + availability + '</g:availability>\n';
    xml += '      <g:price>' + price.toFixed(2) + ' ' + currency + '</g:price>\n';
    if (salePrice > 0 && salePrice < price) {
      xml += '      <g:sale_price>' + salePrice.toFixed(2) + ' ' + currency + '</g:sale_price>\n';
    }
    xml += '      <g:condition>' + condition + '</g:condition>\n';
    xml += '      <g:brand>' + MerchantFeed.escXml(brand) + '</g:brand>\n';
    if (gtin) xml += '      <g:gtin>' + MerchantFeed.escXml(gtin) + '</g:gtin>\n';
    if (mpn) xml += '      <g:mpn>' + MerchantFeed.escXml(mpn) + '</g:mpn>\n';
    if (googleCategory) xml += '      <g:google_product_category>' + MerchantFeed.escXml(googleCategory) + '</g:google_product_category>\n';
    if (productType) xml += '      <g:product_type>' + MerchantFeed.escXml(productType) + '</g:product_type>\n';
    if (shippingWeight) xml += '      <g:shipping_weight>' + MerchantFeed.escXml(shippingWeight) + '</g:shipping_weight>\n';
    if (color) xml += '      <g:color>' + MerchantFeed.escXml(color) + '</g:color>\n';
    if (size) xml += '      <g:size>' + MerchantFeed.escXml(size) + '</g:size>\n';
    if (gender) xml += '      <g:gender>' + MerchantFeed.escXml(gender) + '</g:gender>\n';
    if (ageGroup) xml += '      <g:age_group>' + MerchantFeed.escXml(ageGroup) + '</g:age_group>\n';

    // Additional images (up to 10)
    var images = MerchantFeed.getAllImages(p);
    images.slice(1, 10).forEach(function (img) {
      xml += '      <g:additional_image_link>' + MerchantFeed.escXml(img) + '</g:additional_image_link>\n';
    });

    // Shipping (default)
    xml += '      <g:shipping>\n';
    xml += '        <g:country>EG</g:country>\n';
    xml += '        <g:service>Standard</g:service>\n';
    xml += '        <g:price>0.00 EGP</g:price>\n';
    xml += '      </g:shipping>\n';

    // Identifier exists
    var idExists = gtin || mpn ? "TRUE" : "FALSE";
    xml += '      <g:identifier_exists>' + idExists + '</g:identifier_exists>\n';

    xml += '    </item>\n';
    return xml;
  };

  // ==============================
  // FETCH PRODUCTS FOR FEED
  // ==============================
  MerchantFeed.fetchAllProducts = function () {
    var sb = MerchantFeed.getClient();
    if (!sb) return Promise.resolve(MerchantFeed.getDemoProducts());

    return sb.from("products").select("*").limit(5000).then(function (res) {
      if (res.error) return MerchantFeed.getDemoProducts();
      return res.data || [];
    });
  };

  MerchantFeed.generateAndServe = function () {
    return MerchantFeed.fetchAllProducts().then(function (products) {
      var enriched = MerchantFeed.enrichProducts(products);
      return MerchantFeed.generateFeed(enriched);
    });
  };

  // ==============================
  // HELPERS
  // ==============================
  MerchantFeed.enrichProducts = function (products) {
    return (products || []).map(function (p) {
      var seo = p.product_seo || {};
      return {
        id: p.id,
        name: p.name,
        seo_title: seo.seo_title || p.name,
        description: p.description,
        meta_description: seo.meta_description || p.description,
        short_description: seo.short_description || "",
        price: Number(p.currentPrice || p.price || 0),
        sale_price: p.sale_price || p.discount_price || 0,
        images: p.images || (p.image ? [p.image] : []),
        image: p.image || (Array.isArray(p.images) ? p.images[0] : ""),
        brand: p.brand || p.seller_name || p.seller || "",
        seller_name: p.seller_name || p.seller || "",
        sku: p.sku || p.id,
        gtin: p.gtin || p.ean || p.upc || "",
        mpn: p.mpn || p.sku || "",
        category: p.category || p.main_category || "",
        main_category: p.main_category || p.category || "",
        weight: p.weight || "",
        color: p.color || "",
        size: p.size || "",
        gender: p.gender || "",
        age_group: p.age_group || "",
        stock: p.stock || p.quantity || 0,
        is_active: p.is_active !== false,
      };
    }).filter(function (p) {
      return p.is_active !== false && p.price > 0;
    });
  };

  MerchantFeed.getFirstImage = function (p) {
    if (p.image && typeof p.image === "string" && p.image.startsWith("http")) return p.image;
    if (Array.isArray(p.images)) {
      for (var i = 0; i < p.images.length; i++) {
        if (typeof p.images[i] === "string" && p.images[i].startsWith("http")) return p.images[i];
      }
    }
    return "";
  };

  MerchantFeed.getAllImages = function (p) {
    var imgs = [];
    if (p.image && typeof p.image === "string" && p.image.startsWith("http")) imgs.push(p.image);
    if (Array.isArray(p.images)) {
      p.images.forEach(function (img) {
        if (typeof img === "string" && img.startsWith("http") && imgs.indexOf(img) === -1) imgs.push(img);
      });
    }
    return imgs;
  };

  MerchantFeed.getAvailability = function (p) {
    var stock = Number(p.stock || p.quantity || p.inventory || 0);
    if (stock > 0) return "in_stock";
    if (p.is_active === false) return "out_of_stock";
    if (p.availability === "preorder") return "preorder";
    return "in_stock";
  };

  MerchantFeed.getGoogleCategory = function (p) {
    var cat = (p.category || p.main_category || "").toLowerCase().trim();
    for (var key in MerchantFeed.TAXONOMY) {
      if (cat.indexOf(key) !== -1) return MerchantFeed.TAXONOMY[key];
    }
    // Try brand/category mapping
    if (cat) {
      return "Other";
    }
    return "";
  };

  MerchantFeed.truncate = function (str, max) {
    if (!str) return "";
    var clean = str.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (clean.length <= max) return clean;
    return clean.substring(0, max - 3).trim() + "...";
  };

  MerchantFeed.escXml = function (s) {
    if (!s) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  // ==============================
  // VALIDATION
  // ==============================
  MerchantFeed.validateFeed = function (products) {
    var issues = [];
    var required = ["id", "title", "description", "link", "image_link", "price", "availability", "brand"];
    var optional = ["gtin", "mpn", "google_product_category", "shipping"];

    (products || []).forEach(function (p) {
      required.forEach(function (field) {
        if (!p[field]) {
          issues.push({
            product_id: p.id || "unknown",
            field: field,
            severity: "error",
            message: "حقل مطلوب مفقود: " + field,
          });
        }
      });
      if (p.price !== undefined && p.price <= 0) {
        issues.push({
          product_id: p.id || "unknown",
          field: "price",
          severity: "error",
          message: "السعر يجب أن يكون أكبر من 0",
        });
      }
    });

    return {
      total: products.length,
      errors: issues.filter(function (i) { return i.severity === "error"; }).length,
      warnings: issues.filter(function (i) { return i.severity === "warning"; }).length,
      issues: issues.slice(0, 20),
      valid: issues.filter(function (i) { return i.severity === "error"; }).length === 0,
    };
  };

  // ==============================
  // FEED STATS
  // ==============================
  MerchantFeed.getFeedStats = function (products) {
    var enriched = MerchantFeed.enrichProducts(products);
    return {
      total: enriched.length,
      hasTitle: enriched.filter(function (p) { return p.seo_title || p.name; }).length,
      hasDescription: enriched.filter(function (p) { return p.meta_description || p.description; }).length,
      hasImage: enriched.filter(function (p) { return MerchantFeed.getFirstImage(p); }).length,
      hasPrice: enriched.filter(function (p) { return p.price > 0; }).length,
      hasBrand: enriched.filter(function (p) { return p.brand; }).length,
      hasGtin: enriched.filter(function (p) { return p.gtin; }).length,
      hasMpn: enriched.filter(function (p) { return p.mpn && p.mpn !== p.id; }).length,
      inStock: enriched.filter(function (p) { return MerchantFeed.getAvailability(p) === "in_stock"; }).length,
      avgPrice: enriched.length ? (enriched.reduce(function (s, p) { return s + p.price; }, 0) / enriched.length).toFixed(2) : 0,
    };
  };

  // ==============================
  // PING GOOGLE
  // ==============================
  MerchantFeed.pingGoogle = function () {
    var feedUrl = MerchantFeed.SITE_URL + "/api/merchant-feed";
    var pingUrl = "https://www.google.com/ping?sitemap=" + encodeURIComponent(feedUrl);
    return fetch(pingUrl, { method: "GET", mode: "no-cors" }).then(function () {
      return true;
    }).catch(function () {
      return false;
    });
  };

  // ==============================
  // DEMO DATA
  // ==============================
  MerchantFeed.getDemoProducts = function () {
    return [
      {
        id: "demo-1", name: "منتج تجريبي 1", description: "هذا منتج تجريبي للاختبار",
        price: 199, image: "https://via.placeholder.com/400", brand: "Buda", category: "electronics",
        sku: "DEMO-001", stock: 10,
      },
      {
        id: "demo-2", name: "منتج تجريبي 2", description: "منتج تجريبي آخر",
        price: 299, image: "https://via.placeholder.com/400", brand: "Buda", category: "fashion",
        sku: "DEMO-002", stock: 5,
      },
    ];
  };

  global.MerchantFeed = MerchantFeed;
})(window);
