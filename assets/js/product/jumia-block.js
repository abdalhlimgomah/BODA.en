/**
 * PDP.JumiaBlock — renders the Jumia-sourced details collected by the
 * Product Lab (seller performance, delivery/returns/warranty, rating
 * breakdown, breadcrumb, stock note and "related on Jumia" products).
 *
 * Everything is read from the view model (`vm.jumia`, built in data.js
 * from `raw_data.jumia` plus the optional j_* columns). Products that
 * are not sourced from Jumia keep the section hidden, so the internal
 * PDP is untouched.
 */
(function (global) {
  "use strict";

  var U = global.PDP.Utils;

  var CURRENCY_LABELS = {
    EGP: "ج.م",
    SAR: "ر.س",
    AED: "د.إ",
    IQD: "د.ع",
    OMR: "ر.ع",
  };

  function esc(value) { return U.escapeHtml(value); }

  function safeUrl(value) {
    var url = String(value == null ? "" : value).trim();
    return /^https?:\/\//i.test(url) ? url : "";
  }

  function money(value, currency) {
    var amount = Number(value) || 0;
    if (!(amount > 0)) return "";
    var code = String(currency || "EGP").toUpperCase();
    var text = amount.toFixed(2).replace(/\.00$/, "");
    return U.arabicNumeral(text) + " " + (CURRENCY_LABELS[code] || code);
  }

  function dedupe(values) {
    var seen = {};
    var out = [];
    (Array.isArray(values) ? values : []).forEach(function (item) {
      var text = String(item == null ? "" : item).replace(/\s+/g, " ").trim();
      if (!text || seen[text]) return;
      seen[text] = true;
      out.push(text);
    });
    return out;
  }

  function shortText(value, max) {
    var text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
    if (!text) return "";
    if (max && text.length > max) text = text.slice(0, max - 1).trim() + "…";
    return text;
  }

  function formatDate(value) {
    if (!value) return "";
    try {
      var date = new Date(value);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });
    } catch (e) {
      return "";
    }
  }

  function sectionTitle(icon, text) {
    return '<h3 class="pdp-jumia-card-title"><span class="material-icons-outlined">' + icon + "</span>" + esc(text) + "</h3>";
  }

  function sellerCard(jumia) {
    var seller = jumia.seller || {};
    var performance = Array.isArray(seller.performance) ? seller.performance : [];
    var rating = Number(seller.rating) || 0;
    var followers = Math.max(0, Math.round(Number(seller.followers) || 0));
    var name = seller.name || "جوميا مصر";

    var html = '<section class="pdp-jumia-card">';
    html += sectionTitle("storefront", "البائع على جوميا");
    html += '<div class="pdp-jumia-seller">';
    html += '<div class="pdp-jumia-seller-avatar"><span class="material-icons-outlined">store</span></div>';
    html += '<div class="pdp-jumia-seller-name">' + esc(name) + "</div>";
    html += "</div>";

    if (rating > 0) {
      var pct = Math.max(0, Math.min(100, Math.round(rating)));
      html += '<div class="pdp-jumia-meter">';
      html += '<div class="pdp-jumia-meter-head"><span>نسبة التقييمات الإيجابية</span><strong>' + pct + "%</strong></div>";
      html += '<div class="pdp-jumia-meter-track"><span style="width:' + pct + '%"></span></div>';
      html += "</div>";
    }

    if (followers > 0) {
      html += '<div class="pdp-jumia-row"><span>متابعون على جوميا</span><strong>' + U.arabicNumeral(String(followers)) + "</strong></div>";
    }

    if (performance.length) {
      html += '<div class="pdp-jumia-rows">';
      performance.slice(0, 5).forEach(function (item) {
        if (!item || !item.label) return;
        html += '<div class="pdp-jumia-row"><span>' + esc(item.label) + "</span><strong>" + esc(item.value || "—") + "</strong></div>";
      });
      html += "</div>";
    }

    var sellerUrl = safeUrl(seller.url);
    if (sellerUrl) {
      html += '<a class="pdp-jumia-link" href="' + esc(sellerUrl) + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="material-icons-outlined">open_in_new</span>زيارة متجر البائع على جوميا</a>';
    }
    html += "</section>";
    return html;
  }

  function deliveryCard(jumia) {
    var delivery = jumia.delivery || {};
    var lines = dedupe(delivery.lines).slice(0, 10);
    var eta = shortText(delivery.eta_text, 160);
    if (eta) lines = dedupe([eta].concat(lines)).slice(0, 10);
    var freeText = shortText(delivery.free_shipping_text, 160);
    var fee = Number(delivery.shipping_fee) || 0;
    var freeOver = Number(delivery.free_over) || 0;
    var warranty = shortText(jumia.warranty || delivery.warranty, 200);
    var returnPolicy = String(jumia.returnPolicy || delivery.return_policy || "").trim();

    var html = '<section class="pdp-jumia-card">';
    html += sectionTitle("local_shipping", "الشحن والاسترجاع");
    html += '<div class="pdp-jumia-rows pdp-jumia-shipping-rows">';

    if (freeText) {
      html += '<div class="pdp-jumia-row"><span>الشحن</span><strong class="is-green">' + esc(freeText) + "</strong></div>";
    } else if (fee > 0) {
      html += '<div class="pdp-jumia-row"><span>رسوم الشحن</span><strong>' + esc(money(fee, jumia.currency)) + "</strong></div>";
    }
    if (freeOver > 0) {
      html += '<div class="pdp-jumia-row"><span>شحن مجاني فوق</span><strong>' + esc(money(freeOver, jumia.currency)) + "</strong></div>";
    }

    if (lines.length) {
      html += '<ul class="pdp-jumia-lines">';
      lines.forEach(function (line) {
        html += '<li><span class="material-icons-outlined">check_circle</span><span>' + esc(line) + "</span></li>";
      });
      html += "</ul>";
    }

    if (warranty) {
      html += '<div class="pdp-jumia-row"><span>الضمان</span><strong>' + esc(warranty) + "</strong></div>";
    }

    html += "</div>";

    if (returnPolicy) {
      if (returnPolicy.length > 220) {
        html += '<details class="pdp-jumia-more"><summary>سياسة الاسترجاع على جوميا</summary><p>' + esc(returnPolicy) + "</p></details>";
      } else {
        html += '<div class="pdp-jumia-policy"><span class="material-icons-outlined">published_with_changes</span><p>' + esc(returnPolicy) + "</p></div>";
      }
    }

    html += "</section>";
    return html;
  }

  function ratingCard(jumia) {
    var rating = jumia.rating || {};
    var average = Number(rating.average) || 0;
    var count = Math.max(0, Math.round(Number(rating.count) || 0));
    var breakdown = rating.breakdown || {};
    var levels = [5, 4, 3, 2, 1];
    var counts = levels.map(function (level) {
      return Math.max(0, Math.round(Number(breakdown[String(level)]) || 0));
    });
    var breakdownTotal = counts.reduce(function (sum, value) { return sum + value; }, 0);

    var html = '<section class="pdp-jumia-card">';
    html += sectionTitle("star", "تقييم المنتج على جوميا");
    html += '<div class="pdp-jumia-rating-top">';
    html += '<div class="pdp-jumia-rating-avg">';
    html += '<strong>' + (average > 0 ? average.toFixed(1) : "—") + "</strong>";
    html += '<div class="pdp-jumia-stars">' + U.starsMarkup(average, 18) + "</div>";
    html += '<span>' + (count > 0 ? U.arabicNumeral(String(count)) + " تقييم" : "عدد التقييمات غير متاح") + "</span>";
    html += "</div>";

    if (breakdownTotal > 0) {
      html += '<div class="pdp-jumia-bars">';
      levels.forEach(function (level, index) {
        var value = counts[index];
        var pct = Math.round((value / breakdownTotal) * 100);
        html += '<div class="pdp-jumia-bar-row">';
        html += '<span class="pdp-jumia-bar-label">' + level + " نجوم</span>";
        html += '<span class="pdp-jumia-bar-track"><span style="width:' + pct + '%"></span></span>';
        html += '<span class="pdp-jumia-bar-count">' + U.arabicNumeral(String(value)) + "</span>";
        html += "</div>";
      });
      html += "</div>";
    }
    html += "</div>";
    html += '<p class="pdp-jumia-footnote">التقييمات معروضة من جوميا ولا تُحتسب ضمن تقييمات المتجر.</p>';
    html += "</section>";
    return html;
  }

  function relatedBlock(jumia) {
    var related = Array.isArray(jumia.related) ? jumia.related.filter(function (item) {
      return item && item.name;
    }).slice(0, 12) : [];
    if (!related.length) return "";

    var html = '<div class="pdp-jumia-related">';
    html += '<h3 class="pdp-jumia-related-title"><span class="material-icons-outlined">auto_awesome</span>ظهرت مع هذا المنتج على جوميا</h3>';
    html += '<div class="pdp-jumia-related-grid">';
    related.forEach(function (item) {
      var href = safeUrl(item.url);
      var tag = href ? "a" : "div";
      var attrs = href ? ' href="' + esc(href) + '" target="_blank" rel="noopener noreferrer"' : "";
      html += "<" + tag + ' class="pdp-jumia-related-card"' + attrs + ">";
      if (item.image) {
        html += '<div class="pdp-jumia-related-img"><img src="' + esc(U.safeImage(item.image)) + '" alt="' +
          esc(item.name) + '" loading="lazy" decoding="async" onerror="this.parentElement.classList.add(\'is-empty\')" /></div>';
      } else {
        html += '<div class="pdp-jumia-related-img is-empty"><span class="material-icons-outlined">image</span></div>';
      }
      html += '<div class="pdp-jumia-related-name">' + esc(item.name) + "</div>";
      var priceText = money(item.price, jumia.currency);
      if (priceText) html += '<div class="pdp-jumia-related-price">' + esc(priceText) + "</div>";
      html += "</" + tag + ">";
    });
    html += "</div></div>";
    return html;
  }

  function render(root, vm) {
    if (!root) return false;
    var jumia = vm && vm.jumia;
    if (!jumia) {
      root.innerHTML = "";
      root.style.display = "none";
      return false;
    }

    var delivery = jumia.delivery || {};
    var rating = jumia.rating || {};
    var seller = jumia.seller || {};
    var breadcrumb = Array.isArray(jumia.breadcrumb) ? jumia.breadcrumb : [];
    var related = Array.isArray(jumia.related) ? jumia.related : [];
    var externalUrl = safeUrl(jumia.externalUrl);
    var scrapedAt = formatDate(jumia.scrapedAt);

    var hasSeller = Boolean(seller.name || Number(seller.rating) > 0 || Number(seller.followers) > 0 ||
      (Array.isArray(seller.performance) && seller.performance.length));
    var hasDelivery = Boolean(
      (Array.isArray(delivery.lines) && delivery.lines.length) ||
      delivery.free_shipping_text || Number(delivery.shipping_fee) > 0 ||
      Number(delivery.free_over) > 0 || delivery.eta_text
    );
    var hasPolicy = Boolean(jumia.warranty || jumia.returnPolicy || delivery.warranty || delivery.return_policy);
    var hasRating = Boolean(Number(rating.average) > 0 || Number(rating.count) > 0 ||
      Object.keys(rating.breakdown || {}).length);

    if (!hasSeller && !hasDelivery && !hasPolicy && !hasRating && !related.length &&
        !breadcrumb.length && !externalUrl && !jumia.stockText) {
      root.innerHTML = "";
      root.style.display = "none";
      return false;
    }

    var html = "";
    html += '<div class="pdp-jumia-head">';
    html += '<div class="pdp-jumia-brand">';
    html += '<span class="pdp-jumia-mark">جوميا</span>';
    html += '<div class="pdp-jumia-head-text">';
    html += '<h2 class="pdp-section-title">تفاصيل المنتج على جوميا</h2>';
    html += '<p>البيانات مأخوذة من صفحة المنتج على جوميا مصر' + (scrapedAt ? " · آخر تحديث " + esc(scrapedAt) : "") + "</p>";
    html += "</div></div>";
    html += '<div class="pdp-jumia-head-actions">';
    if (jumia.stockText) {
      html += '<span class="pdp-jumia-stock-chip">' + esc(shortText(jumia.stockText, 60)) + "</span>";
    }
    if (externalUrl) {
      html += '<a class="pdp-jumia-open" href="' + esc(externalUrl) + '" target="_blank" rel="noopener noreferrer">' +
        '<span class="material-icons-outlined">open_in_new</span>عرض على جوميا</a>';
    }
    html += "</div></div>";

    if (breadcrumb.length) {
      var crumbNames = breadcrumb.map(function (item) { return String((item && item.name) || "").trim(); })
        .filter(Boolean).slice(0, 6);
      if (crumbNames.length) {
        html += '<nav class="pdp-jumia-crumbs" aria-label="مسار المنتج على جوميا">' +
          '<span class="material-icons-outlined">apps</span>' +
          crumbNames.map(function (name) { return "<span>" + esc(name) + "</span>"; }).join('<span class="material-icons-outlined">chevron_left</span>') +
          "</nav>";
      }
    }

    var cards = [];
    if (hasSeller) cards.push(sellerCard(jumia));
    if (hasDelivery || hasPolicy) cards.push(deliveryCard(jumia));
    if (hasRating) cards.push(ratingCard(jumia));
    if (cards.length) html += '<div class="pdp-jumia-grid">' + cards.join("") + "</div>";

    html += relatedBlock(jumia);

    var meta = [];
    if (jumia.sku) meta.push("SKU " + jumia.sku);
    if (externalUrl) meta.push("المصدر jumia.com.eg");
    if (meta.length) html += '<div class="pdp-jumia-meta">' + esc(meta.join(" · ")) + "</div>";

    root.innerHTML = html;
    root.style.display = "";
    return true;
  }

  global.PDP = global.PDP || {};
  global.PDP.JumiaBlock = { render: render };
})(window);
