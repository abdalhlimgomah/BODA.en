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

  function shortText(value, max) {
    var text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
    if (!text) return "";
    if (max && text.length > max) text = text.slice(0, max - 1).trim() + "…";
    return text;
  }

  function openExternal(url) {
    var value = String(url || "").trim();
    if (!/^https?:\/\//i.test(value)) return;
    window.open(value, "_blank", "noopener,noreferrer");
  }

  /**
   * Jumia listings have their own shipping/returns contract. Showing the
   * local "delivery in 2-5 days / free returns" copy for them would be a
   * false promise, so the card mirrors the scraped Jumia data instead.
   */
  function renderJumia(root, vm) {
    var jumia = vm.jumia || {};
    var delivery = jumia.delivery || {};
    var lines = Array.isArray(delivery.lines) ? delivery.lines.filter(Boolean) : [];

    var badgeEl = U.qs(".pdp-express-badge", root);
    if (badgeEl) badgeEl.style.display = "none";

    var etaText = shortText(delivery.eta_text, 160);
    if (!etaText) {
      for (var i = 0; i < lines.length; i++) {
        if (/توصيل|شحن|يوم|delivery/i.test(lines[i])) { etaText = shortText(lines[i], 160); break; }
      }
    }
    var etaEl = U.qs(".pdp-delivery-eta", root);
    if (etaEl) etaEl.textContent = etaText || "الشحن والتوصيل عبر جوميا";

    var feeEl = U.qs(".pdp-delivery-fee", root);
    if (feeEl) {
      var freeText = shortText(delivery.free_shipping_text, 160);
      var fee = Number(delivery.shipping_fee) || 0;
      var freeOver = Number(delivery.free_over) || 0;
      var label = "";
      if (freeText) label = freeText;
      else if (fee > 0) label = "رسوم الشحن: " + U.money(fee);
      else if (freeOver > 0) label = "شحن مجاني للطلبات فوق " + U.money(freeOver);
      feeEl.textContent = label;
      feeEl.style.display = label ? "" : "none";
    }

    var countdownEl = U.qs(".pdp-delivery-countdown", root);
    if (countdownEl) {
      countdownEl.textContent = "";
      countdownEl.style.display = "none";
    }

    var cityEl = U.qs(".pdp-delivery-city strong", root);
    if (cityEl) cityEl.textContent = "جوميا مصر";
    var changeBtn = U.qs(".pdp-delivery-change", root);
    if (changeBtn) {
      changeBtn.textContent = "زيارة جوميا";
      changeBtn.onclick = function () { openExternal(vm.externalUrl); };
    }

    var trustEl = U.qs(".pdp-trust-row", root);
    if (trustEl) {
      var warranty = shortText(jumia.warranty || delivery.warranty, 80);
      var returnPolicy = shortText(jumia.returnPolicy || delivery.return_policy, 76);
      var items = [
        { icon: "local_shipping", label: etaText ? shortText(etaText, 60) : "توصيل عبر جوميا" },
        { icon: "verified", label: warranty ? (/^ضمان/.test(warranty) ? warranty : "ضمان " + warranty) : "الضمان حسب سياسة جوميا" },
        { icon: "published_with_changes", label: returnPolicy || "الاسترجاع حسب سياسة جوميا" },
        { icon: "open_in_new", label: "الشراء عبر جوميا" },
      ];
      trustEl.innerHTML = items.map(function (it) {
        return '<div class="pdp-trust-item"><span class="material-icons-outlined">' + it.icon + "</span><span>" + U.escapeHtml(it.label) + "</span></div>";
      }).join("");
    }
  }

  function render(root, vm) {
    if (stopCountdown) { stopCountdown(); stopCountdown = null; }

    if (vm && vm.jumia) { renderJumia(root, vm); return; }

    var badgeEl = U.qs(".pdp-express-badge", root);
    if (badgeEl) badgeEl.style.display = vm.delivery.express ? "" : "none";

    var etaEl = U.qs(".pdp-delivery-eta", root);
    if (etaEl) {
      etaEl.textContent = "احصل عليه بين " + vm.delivery.etaDate + " - " + vm.delivery.etaEndDate;
    }

    var feeEl = U.qs(".pdp-delivery-fee", root);
    if (feeEl) { feeEl.textContent = "رسوم الشحن: " + vm.delivery.feeText; feeEl.style.display = ""; }

    var countdownEl = U.qs(".pdp-delivery-countdown", root);
    if (countdownEl) { countdownEl.style.display = ""; stopCountdown = U.startCountdown(countdownEl, vm.delivery.cutoffTs); }

    var cityEl = U.qs(".pdp-delivery-city strong", root);
    if (cityEl) cityEl.textContent = currentCityLabel();

    var changeBtn = U.qs(".pdp-delivery-change", root);
    if (changeBtn) {
      changeBtn.onclick = function () { window.location.href = "addresses.html"; };
    }

    var trustEl = U.qs(".pdp-trust-row", root);
    if (trustEl) {
      var raw = vm.raw || {};
      var ret = raw.return_allowed;
      var canReturn = ret === true || ret === "true" || ret === 1 || ret === "1";
      var declaredReturn = ret !== undefined && ret !== null && ret !== "";
      var warranty = raw.warranty ? String(raw.warranty).trim() : "";
      var warrantyLabel = warranty
        ? (warranty.indexOf("ضمان") === 0 ? warranty : "ضمان " + warranty)
        : "ضمان لمدة عام";
      var deliveryLabel = vm.badges.freeShipping ? "توصيل مجاني خلال 2-5 أيام" : "توصيل سريع خلال 2-5 أيام";
      var items = [
        { icon: "local_shipping", label: deliveryLabel },
        { icon: "verified", label: warrantyLabel },
        { icon: declaredReturn && !canReturn ? "block" : "published_with_changes", label: canReturn || !declaredReturn ? "إرجاع مجاني 14 يوم" : "لا يمكن إرجاع هذا المنتج" },
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
