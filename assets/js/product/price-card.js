/**
 * PDP.PriceCard — current price, old price, discount %, savings, VAT note.
 */
(function (global) {
  "use strict";

  var U = global.PDP.Utils;

  function render(root, vm) {
    var price = vm.price;
    var currentEl = U.qs(".pdp-price-current", root);
    var oldEl = U.qs(".pdp-price-old", root);
    var discEl = U.qs(".pdp-price-discount", root);
    var savingsEl = U.qs(".pdp-price-savings", root);

    if (currentEl) currentEl.textContent = price.currentText;
    if (oldEl) {
      oldEl.textContent = price.hasDiscount ? price.originalText : "";
      oldEl.style.display = price.hasDiscount ? "" : "none";
    }
    if (discEl) {
      discEl.textContent = price.hasDiscount ? "-" + price.discountPercent + "%" : "";
      discEl.style.display = price.hasDiscount ? "" : "none";
    }
    if (savingsEl) {
      savingsEl.textContent = price.hasDiscount ? "وفرت " + U.money(price.savings) : "";
      savingsEl.style.display = price.hasDiscount ? "" : "none";
    }
  }

  global.PDP = global.PDP || {};
  global.PDP.PriceCard = { render: render };
})(window);
