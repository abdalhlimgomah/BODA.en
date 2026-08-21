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
      '<div class="pdp-installment-title">خصم على الدفع</div>' +
      '<div class="pdp-installment-card">' +
        '<div class="pdp-installment-logos">' +
          '<span class="pdp-inst-logo pdp-inst-logo-visa">VISA</span>' +
          '<span class="pdp-inst-logo pdp-inst-logo-mc"><i></i><i></i></span>' +
        "</div>" +
        '<p class="pdp-installment-text">ادفع <strong>' + inst.months + "</strong> أقساط شهرية بقيمة <strong>" + inst.perMonthText + "</strong></p>" +
      "</div>";
    root.onclick = function () {
      U.notify("خيارات الدفع بالتقسيط: " + inst.providers.join("، "), { type: "info" });
    };
  }

  global.PDP = global.PDP || {};
  global.PDP.Installment = { render: render };
})(window);
