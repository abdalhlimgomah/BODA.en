/**
 * PDP.Delivery — express badge, ETA date, live countdown, shipping
 * fee, selected city + change action, and the trust/feature icon row.
 */
(function (global) {
  "use strict";

  var U = global.PDP.Utils;
  var stopCountdown = null;

  function currentCityLabel() {
    try {
      var email = String(localStorage.getItem("userEmail") || "").trim();
      var candidates = [email, email.toLowerCase()].filter(Boolean);
      for (var i = 0; i < candidates.length; i++) {
        var v = localStorage.getItem("selected_address_" + candidates[i]);
        if (v) return v;
      }
    } catch (e) { /* ignore */ }
    return "اختر عنوان التوصيل";
  }

  function render(root, vm) {
    if (stopCountdown) { stopCountdown(); stopCountdown = null; }

    var badgeEl = U.qs(".pdp-express-badge", root);
    if (badgeEl) badgeEl.style.display = vm.delivery.express ? "" : "none";

    var etaEl = U.qs(".pdp-delivery-eta", root);
    if (etaEl) etaEl.textContent = "احصل عليه بحلول " + vm.delivery.etaDate;

    var feeEl = U.qs(".pdp-delivery-fee", root);
    if (feeEl) feeEl.textContent = "رسوم الشحن: " + vm.delivery.feeText;

    var countdownEl = U.qs(".pdp-delivery-countdown", root);
    if (countdownEl) stopCountdown = U.startCountdown(countdownEl, vm.delivery.cutoffTs);

    var cityEl = U.qs(".pdp-delivery-city strong", root);
    if (cityEl) cityEl.textContent = currentCityLabel();

    var changeBtn = U.qs(".pdp-delivery-change", root);
    if (changeBtn) {
      changeBtn.onclick = function () { window.location.href = "addresses.html"; };
    }

    var trustEl = U.qs(".pdp-trust-row", root);
    if (trustEl) {
      var items = [
        { icon: "local_shipping", label: vm.badges.freeShipping ? "توصيل مجاني" : "توصيل سريع" },
        { icon: "verified", label: "ضمان لمدة عام" },
        { icon: "published_with_changes", label: "إرجاع مجاني 14 يوم" },
        { icon: "lock", label: "مدفوعات آمنة" },
        { icon: "storefront", label: "استلام من نقاط BudoQ" },
      ];
      trustEl.innerHTML = items.map(function (it) {
        return '<div class="pdp-trust-item"><span class="material-icons-outlined">' + it.icon + "</span><span>" + it.label + "</span></div>";
      }).join("");
    }
  }

  global.PDP = global.PDP || {};
  global.PDP.Delivery = { render: render };
})(window);
