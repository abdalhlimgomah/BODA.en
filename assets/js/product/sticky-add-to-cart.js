/**
 * PDP.StickyCart — persistent mobile/tablet bottom bar (price, qty,
 * Add to Cart). Always visible per spec — no scroll-based hide/show.
 */
(function (global) {
  "use strict";

  var U = global.PDP.Utils;

  function render(root, vm, actions) {
    var priceEl = U.qs(".pdp-sticky-price", root);
    var oldPriceEl = U.qs(".pdp-sticky-price-old", root);
    var qtyValueEl = U.qs("[data-qty-value]", root);
    var minusBtn = U.qs('[data-qty-action="dec"]', root);
    var plusBtn = U.qs('[data-qty-action="inc"]', root);
    var addBtn = U.qs(".pdp-sticky-add-btn", root);
    var wishBtn = U.qs(".pdp-sticky-wish-btn", root);

    if (priceEl) priceEl.textContent = vm.price.currentText;
    if (oldPriceEl) {
      oldPriceEl.textContent = vm.price.hasDiscount ? vm.price.originalText : "";
      oldPriceEl.style.display = vm.price.hasDiscount ? "" : "none";
    }

    var outOfStock = vm.stock.status === "out_of_stock";
    if (addBtn) {
      addBtn.disabled = outOfStock;
      addBtn.innerHTML = '<span class="material-icons-outlined">shopping_cart</span>' + (outOfStock ? "نفد المخزون" : "أضف للعربة");
    }
    if (plusBtn && vm.stock.status === "low_stock") plusBtn.setAttribute("data-max", String(vm.stock.quantity));

    if (minusBtn && qtyValueEl) {
      minusBtn.addEventListener("click", function () {
        var v = U.clampInt(qtyValueEl.textContent, 1, 99);
        qtyValueEl.textContent = U.clampInt(v - 1, 1, 99);
      });
    }
    if (plusBtn && qtyValueEl) {
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

  function syncWishlistButtons(root, isActive) {
    U.qsa(".pdp-sticky-wish-btn, .pdp-wish-btn-desktop", root).forEach(function (btn) {
      btn.classList.toggle("is-active", Boolean(isActive));
      var icon = btn.querySelector(".material-icons-outlined");
      if (icon) icon.textContent = isActive ? "favorite" : "favorite_border";
    });
  }

  global.PDP = global.PDP || {};
  global.PDP.StickyCart = { render: render, syncWishlistButtons: syncWishlistButtons };
})(window);
