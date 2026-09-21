/**
 * PDP.QtyTiers — خصومات الكميات (من تايجر) على صفحة المنتج.
 * يعرض شرائح "2 قطع / 3 قطع ..." مع نسبة الخصم مثل اختيار المقاس،
 * ويختار الكمية تلقائياً عند الإضافة إلى السلة.
 */
(function (global) {
  "use strict";

  var U = global.PDP.Utils;
  var _root = null;
  var _vm = null;
  var _selected = null;   // { qty, pct, row, unit, total, original, savings }
  var _loadedQty = null;  // pid currently loaded

  function money(v) { return U.money ? U.money(v) : (Math.round(v) + " EGP"); }

  function pidOf(vm) {
    if (!vm || !vm.raw) return "";
    return String(vm.raw.taager_product_id || vm.raw.taagerProductId || "");
  }

  function render(root, vm) {
    _root = root;
    _vm = vm;
    if (!root) return;
    var section = root.closest("#pdp-qty-tier-section") || root.parentElement;
    var pid = pidOf(vm);

    if (!global.QtyDiscounts || !pid) {
      if (section) section.style.display = "none";
      root.innerHTML = "";
      return;
    }

    var rows = global.QtyDiscounts.tiers(pid);
    if (rows && !rows.length) {
      if (section) section.style.display = "none";
      root.innerHTML = "";
      return;
    }

    if (!rows) {
      // Not loaded yet — fetch then re-render once available.
      global.QtyDiscounts.loadFor(pid).then(function () {
        if (_root && _vm && pidOf(_vm) === pid) render(_root, _vm);
      });
      return;
    }

    _loadedQty = pid;
    if (section) section.style.display = rows.length ? "" : "none";
    if (!rows.length) { root.innerHTML = ""; return; }

    var unit = Number((vm.price && vm.price.current) || 0) || 0;
    if (unit <= 0) {
      var base = null;
      if (global.PDP.Data && global.PDP.Data.buildPrice) base = global.PDP.Data.buildPrice(vm.raw);
      unit = Number((base && base.current) || 0) || 0;
    }

    // Keep selection valid while re-rendering (price may not be ready yet).
    if (_selected && _selected.qty) {
      var still = rows.some(function (r) { return r.quantity === _selected.qty; });
      if (!still) _selected = null;
    }

    var header =
      '<div class="pdp-qty-tier-header">' +
      '<span class="pdp-qty-tier-title">خصم على الكميات</span>' +
      '<span class="pdp-qty-tier-sub">ادفع أقل عند شراء أكثر من قطعة</span>' +
      "</div>";

    var btns = rows.map(function (r) {
      var selectedCls = _selected && _selected.qty === r.quantity ? " is-selected" : "";
      return (
        '<button type="button" class="pdp-qty-btn' + selectedCls + '" data-qty-idx="' + r.quantity + '">' +
        '<span class="pdp-qty-btn-main">' + U.escapeHtml(r.quantity) + ' قطع</span>' +
        '<span class="pdp-qty-btn-sub">خصم ' + U.escapeHtml(String(Math.round(r.discount_percent)).replace(/-/g, "")) + '%</span>' +
        "</button>"
      );
    }).join("");

    root.innerHTML = header + '<div class="pdp-qty-options">' + btns + '</div>' + '<div class="pdp-qty-summary"></div>';

    if (!root.dataset.qtyBound) {
      root.dataset.qtyBound = "1";
      root.addEventListener("click", function (e) {
        var btn = e.target.closest(".pdp-qty-btn");
        if (!btn) return;
        var qty = Number(btn.getAttribute("data-qty-idx")) || 0;
        select(qty, unit, rows, btn);
      });
    } else {
      // Rebind nothing; just re-sync summary if a selection exists.
      if (_selected) renderSummary(unit, rows);
    }
  }

  function renderSummary(unit, rows) {
    var summaryEl = _root ? _root.querySelector(".pdp-qty-summary") : null;
    if (!summaryEl) return;
    if (!_selected || !_selected.qty) { summaryEl.innerHTML = ""; return; }
    var r = _selected.row;
    var total = unit * r.quantity * (1 - r.discount_percent / 100);
    var original = unit * r.quantity;
    var savings = Math.max(0, original - total);
    _selected.total = total;
    _selected.original = original;
    _selected.savings = savings;
    summaryEl.innerHTML =
      '<span class="pdp-qty-summary-total">' + money(total) + "</span>" +
      '<span class="pdp-qty-summary-original">بدل ' + money(original) + "</span>" +
      '<span class="pdp-qty-summary-save">وفّرت ' + money(savings) + "</span>";
  }

  function select(qty, unit, rows, btn) {
    var r = null;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].quantity === qty) { r = rows[i]; break; }
    }
    if (!r) return;
    _selected = {
      qty: qty,
      pct: r.discount_percent,
      row: r,
      unit: unit,
      total: unit * qty * (1 - r.discount_percent / 100),
      original: unit * qty,
      savings: unit * qty * (r.discount_percent / 100),
    };

    if (_root) {
      _root.querySelectorAll(".pdp-qty-btn").forEach(function (b) {
        b.classList.toggle("is-selected", Number(b.getAttribute("data-qty-idx")) === qty);
      });
      renderSummary(unit, rows);
    }

    // Sync the visible qty steppers (sticky bar + any other) to this qty.
    document.querySelectorAll("[data-qty-value]").forEach(function (el) {
      el.textContent = String(qty);
    });

    _root.dispatchEvent(new CustomEvent("pdp:qty-tier-change", {
      bubbles: true,
      detail: { qty: qty, pct: r.discount_percent, row: r },
    }));
  }

  function getSelected() {
    return _selected;
  }

  function clearSelection() {
    if (!_selected) return;
    _selected = null;
    if (_root) {
      _root.querySelectorAll(".pdp-qty-btn").forEach(function (b) { b.classList.remove("is-selected"); });
      var summaryEl = _root.querySelector(".pdp-qty-summary");
      if (summaryEl) summaryEl.innerHTML = "";
    }
  }

  global.PDP = global.PDP || {};
  global.PDP.QtyTiers = {
    render: render,
    getSelected: getSelected,
    clearSelection: clearSelection,
  };
})(window);