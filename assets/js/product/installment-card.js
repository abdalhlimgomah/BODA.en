/**
 * PDP.Installment — lowest available monthly installment (ValU /
 * Premium / Visa / Mastercard or any configured provider).
 */
(function (global) {
  "use strict";

  var U = global.PDP.Utils;

  function render(root, vm) {
    if (!vm.installment) { root.style.display = "none"; root.innerHTML = ""; return; }
    root.style.display = "";
    var inst = vm.installment;
    root.innerHTML =
      '<div class="pdp-installment-logo">' + U.escapeHtml(inst.provider) + "</div>" +
      '<div class="pdp-installment-text">ادفع ' + inst.months + ' أقساط شهرية بقيمة <strong>' + inst.perMonthText + "</strong></div>" +
      '<div class="pdp-installment-more"><span class="material-icons-outlined">chevron_left</span></div>';
    root.onclick = function () {
      U.notify("خيارات الدفع بالتقسيط: " + inst.providers.join("، "), { type: "info" });
    };
  }

  global.PDP = global.PDP || {};
  global.PDP.Installment = { render: render };
})(window);
