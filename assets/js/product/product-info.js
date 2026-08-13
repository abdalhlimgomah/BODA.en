/**
 * PDP.Info — brand line, title, rating row, nudge badges, stock
 * message. Pure render function driven entirely by the view model.
 */
(function (global) {
  "use strict";

  var U = global.PDP.Utils;

  function render(root, vm) {
    var brandEl = U.qs(".pdp-brand", root);
    if (brandEl) {
      brandEl.textContent = vm.brand || "";
      if (vm.brand)
        brandEl.href = "products.html?search=" + encodeURIComponent(vm.brand);
    }

    var titleEl = U.qs(".pdp-title", root);
    if (titleEl) titleEl.textContent = vm.name;

    var starsEl = U.qs(".pdp-stars", root);
    var linkEl = U.qs(".pdp-rating-link", root);
    var soldEl = U.qs(".pdp-sold-count", root);
    var ratingRow = U.qs(".pdp-rating-row", root);
    if (vm.rating.count > 0) {
      if (starsEl) starsEl.innerHTML = U.starsMarkup(vm.rating.average);
      if (linkEl) {
        linkEl.textContent = "(" + vm.rating.count + ")";
        linkEl.href = "#pdp-reviews";
      }
      if (ratingRow) ratingRow.style.display = "";
    } else if (ratingRow) {
      ratingRow.style.display = vm.soldCount > 0 ? "" : "none";
      if (starsEl) starsEl.innerHTML = "";
      if (linkEl) linkEl.textContent = "";
    }
    if (soldEl) {
      soldEl.style.display = vm.soldCount > 0 ? "" : "none";
      if (vm.soldCount > 0) {
        var digits = String(vm.soldCount).replace(/[0-9]/g, function (d) {
          return "\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669"[Number(d)];
        });
        soldEl.innerHTML =
          '<span class="pdp-sold-icon"><span class="material-icons-outlined">local_fire_department</span></span>' +
          '<span class="pdp-sold-text">تم بيع <strong>' + digits + "</strong> قطعة</span>";
      } else {
        soldEl.innerHTML = "";
      }
    }

    var nudgesEl = U.qs(".pdp-nudges", root);
    if (nudgesEl) {
      var chips = [];
      if (vm.badges.express)
        chips.push(
          '<span class="pdp-nudge pdp-nudge-express"><span class="material-icons-outlined">bolt</span>إكسبرس</span>',
        );
      if (vm.badges.freeShipping)
        chips.push(
          '<span class="pdp-nudge"><span class="material-icons-outlined">local_shipping</span>توصيل مجاني</span>',
        );
      if (vm.badges.bestSeller)
        chips.push(
          '<span class="pdp-nudge pdp-nudge-hot">الأكثر مبيعاً</span>',
        );
      nudgesEl.innerHTML = chips.join("");
    }

    var stockEl = U.qs(".pdp-stock", root);
    if (stockEl) {
      stockEl.classList.remove("is-ok", "is-low", "is-out");
      if (vm.stock.status === "out_of_stock") {
        stockEl.classList.add("is-out");
        stockEl.innerHTML =
          '<span class="material-icons-outlined">remove_shopping_cart</span>نفد المخزون';
      } else if (vm.stock.status === "low_stock") {
        stockEl.classList.add("is-low");
        stockEl.innerHTML =
          '<span class="material-icons-outlined">shopping_bag</span>متبقي ' +
          vm.stock.quantity +
          " فقط في المخزون";
      } else {
        stockEl.classList.add("is-ok");
        stockEl.innerHTML =
          '<span class="material-icons-outlined">check_circle</span>متوفر';
      }
    }

    var exploreEl = U.qs(".pdp-explore-link", root);
    if (exploreEl && vm.category) {
      exploreEl.href = "sections.html";
      exploreEl.querySelector("span:last-child") &&
        (exploreEl.querySelector("span:last-child").textContent =
          "استكشف الأفضل مبيعاً في " + vm.category);
    } else if (exploreEl) {
      exploreEl.style.display = "none";
    }
  }

  /**
   * Offers accordion (coupons + bank offers). Small enough that it
   * lives inside ProductInfo rather than becoming its own top-level
   * component file — it is rendered right after InstallmentCard in
   * the info column, matching the page's reading order.
   */
  function renderOffers(root, vm) {
    if (!vm.offers.hasAny) {
      root.style.display = "none";
      root.innerHTML = "";
      return;
    }
    root.style.display = "";
    var couponsHtml = vm.offers.coupons.length
      ? '<div class="pdp-offer-group-title">كوبونات الخصم</div>' +
        vm.offers.coupons
          .map(function (c) {
            return (
              '<div class="pdp-offer-row"><span>' +
              U.escapeHtml(c.label) +
              '</span><span class="pdp-offer-code">' +
              U.escapeHtml(c.code) +
              "</span></div>"
            );
          })
          .join("")
      : "";
    var bankHtml = vm.offers.bankOffers.length
      ? '<div class="pdp-offer-group-title">عروض بطاقات البنك</div>' +
        vm.offers.bankOffers
          .map(function (b) {
            return (
              '<div class="pdp-bank-offer-row"><span class="material-icons-outlined">credit_card</span><span>' +
              U.escapeHtml(b.label) +
              "</span></div>"
            );
          })
          .join("")
      : "";
    root.innerHTML =
      '<summary class="pdp-offers-summary">العروض والكوبونات<span class="material-icons-outlined">expand_more</span></summary>' +
      '<div class="pdp-offers-body">' +
      couponsHtml +
      bankHtml +
      "</div>";
  }

  global.PDP = global.PDP || {};
  global.PDP.Info = { render: render, renderOffers: renderOffers };
})(window);
