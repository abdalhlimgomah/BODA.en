/**
 * PDP.Seller — seller card (name, rating, sales, shipping speed,
 * visit-store CTA) plus the desktop-only Add to Cart block that
 * lives at the bottom of this sticky column.
 */
(function (global) {
  "use strict";

  var U = global.PDP.Utils;

  function render(root, vm, actions) {
    var s = vm.seller;
    var ext = vm.external && vm.external.isExternal ? vm.external : null;
    var soldByEl = U.qs(".pdp-seller-sold-by", root);
    if (soldByEl && ext) soldByEl.textContent = "يُباع عبر";

    var nameEl = U.qs(".pdp-seller-name", root);
    if (nameEl) nameEl.innerHTML = '<span class="pdp-seller-name-text">' + U.escapeHtml(s.name) + '</span>' + (s.isOfficial ? '<span class="material-icons-outlined" title="متجر رسمي">verified</span>' : "") + (s.yearsWithBuda > 0 ? '<span class="pdp-seller-badge">' + s.yearsWithBuda + ' سنوات مع BudoQ</span>' : "");

    var statsEl = U.qs(".pdp-seller-stats", root);
    if (statsEl) {
      if (ext) {
        statsEl.innerHTML =
          '<div class="pdp-seller-stat-row"><span>المنصة</span><strong>جوميا مصر</strong></div>' +
          '<div class="pdp-seller-stat-row"><span>الدفع</span><strong>عبر جوميا</strong></div>' +
          '<div class="pdp-seller-stat-row"><span>التوصيل</span><strong>حسب جوميا</strong></div>';
      } else {
        var rows = [];
        if (s.rating > 0) rows.push('<div class="pdp-seller-stat-row"><span>تقييم البائع</span><span class="pdp-seller-stat-rating"><span class="material-icons-outlined">star</span>' + s.rating.toFixed(1) + '</span></div>');
        if (s.positivePercent > 0) rows.push('<div class="pdp-seller-stat-row"><span>نسبة الرضا</span><div class="pdp-seller-stat-bar"><div class="pdp-seller-stat-fill" style="width:' + s.positivePercent + '%"></div></div><strong>' + s.positivePercent + '%</strong></div>');
        if (s.salesCount > 0) rows.push('<div class="pdp-seller-stat-row"><span>عدد المبيعات</span><strong>' + s.salesCount + '+</strong></div>');
        if (s.shippingSpeedText) rows.push('<div class="pdp-seller-stat-row"><span>سرعة الشحن</span><strong>' + U.escapeHtml(s.shippingSpeedText) + "</strong></div>");
        statsEl.innerHTML = rows.join("") || '<div class="pdp-empty-note">لا توجد بيانات إضافية عن البائع</div>';
      }
    }

    // ---- Desktop sticky CTA (qty + add to cart + wishlist) ----
    var qtyValueEl = U.qs(".pdp-desktop-cta [data-qty-value]", root);
    var addBtn = U.qs(".pdp-desktop-cta .pdp-add-cart-btn", root);
    var wishBtn = U.qs(".pdp-desktop-cta .pdp-wish-btn-desktop", root);
    var minusBtn = U.qs('.pdp-desktop-cta [data-qty-action="dec"]', root);
    var plusBtn = U.qs('.pdp-desktop-cta [data-qty-action="inc"]', root);

    if (ext) {
      var qtyBlock = U.qs(".pdp-desktop-cta-qty", root);
      if (qtyBlock) qtyBlock.style.display = "none";
      if (addBtn) {
        if (ext.url) {
          addBtn.outerHTML =
            '<a class="pdp-external-buy pdp-external-buy-wide" href="' + U.escapeHtml(ext.url) + '" target="_blank" rel="sponsored noopener noreferrer">' +
            '<span class="material-icons-outlined">shopping_bag</span>اشتري من جوميا</a>' +
            '<p class="pdp-external-note">سيتم فتح المنتج على جوميا لإتمام الشراء.</p>';
        } else {
          addBtn.disabled = true;
          addBtn.innerHTML = '<span class="material-icons-outlined">link_off</span>الرابط غير متوفر';
        }
      }
      if (wishBtn && actions && actions.onToggleWishlist) {
        wishBtn.addEventListener("click", function () { actions.onToggleWishlist(wishBtn); });
      }
      return;
    }

    var outOfStock = vm.stock.status === "out_of_stock";
    if (addBtn) {
      addBtn.disabled = outOfStock;
      addBtn.innerHTML = '<span class="material-icons-outlined">shopping_cart</span>' + (outOfStock ? "نفد المخزون" : "أضف للعربة");
    }
    if (plusBtn && vm.stock.status === "low_stock") plusBtn.setAttribute("data-max", String(vm.stock.quantity));

    if (minusBtn && plusBtn && qtyValueEl) {
      minusBtn.addEventListener("click", function () {
        var v = U.clampInt(qtyValueEl.textContent, 1, 99);
        qtyValueEl.textContent = U.clampInt(v - 1, 1, 99);
      });
      plusBtn.addEventListener("click", function () {
        var max = plusBtn.getAttribute("data-max");
        var v = U.clampInt(qtyValueEl.textContent, 1, 99);
        qtyValueEl.textContent = U.clampInt(v + 1, 1, max ? Number(max) : 99);
      });
    }

    if (addBtn && actions && actions.onAddToCart) {
      addBtn.addEventListener("click", function () {
        var qty = qtyValueEl ? U.clampInt(qtyValueEl.textContent, 1, 99) : 1;
        actions.onAddToCart(qty);
      });
    }
    if (wishBtn && actions && actions.onToggleWishlist) {
      wishBtn.addEventListener("click", function () { actions.onToggleWishlist(wishBtn); });
    }
  }

  global.PDP = global.PDP || {};
  global.PDP.Seller = { render: render };
})(window);
