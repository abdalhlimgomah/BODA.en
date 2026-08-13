/**
 * PDP.Variants — renders each variant group (color/size/capacity/
 * edition) as a row of CARDS (never a native <select>). Selecting a
 * card updates the label ("اللون: أزرق") and dispatches
 * `pdp:variant-change` on the mount root so other components (e.g.
 * the gallery, when a color option carries its own image) can react.
 */
(function (global) {
  "use strict";

  var U = global.PDP.Utils;

  function readableTextColor(hex) {
    var c = String(hex || "").replace(/[^0-9a-fA-F]/g, "");
    if (c.length < 6) return "#ffffff";
    var r = parseInt(c.slice(0, 2), 16);
    var g = parseInt(c.slice(2, 4), 16);
    var b = parseInt(c.slice(4, 6), 16);
    var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.62 ? "#141414" : "#ffffff";
  }

  function render(root, vm) {
    var section = root.closest("#pdp-variants-section") || root.parentElement;
    if (!vm.variants.length) { root.innerHTML = ""; if (section) section.style.display = "none"; return; }
    if (section) section.style.display = "";
    root.style.display = "";
    var currentId = U.getQueryParam("id") || vm.id;
    root.__pdpVariants = vm.variants;

    root.innerHTML = vm.variants.map(function (group) {
      var optionsHtml = group.options.map(function (opt, i) {
        var selected = group._taagerMulti ? (opt.value === currentId) : (i === 0);
        var isSwatch = group.type === "color";
        var classes = "pdp-variant-card " + (isSwatch ? "pdp-variant-card--swatch" : "pdp-variant-card--text") + (selected ? " is-selected" : "") + (opt.available ? "" : " is-disabled");
        var inner = isSwatch
          ? '<span class="pdp-swatch-box" style="background:' + U.escapeHtml(opt.value) + ";color:" + readableTextColor(opt.value) + '">' + U.escapeHtml(opt.label) + "</span>"
          : U.escapeHtml(opt.label);
        return (
          '<button type="button" class="' + classes + '" data-group="' + U.escapeHtml(group.key) + '" data-index="' + i + '"' +
          (opt.available ? "" : " disabled") +
          ' aria-pressed="' + selected + '" aria-label="' + U.escapeHtml(group.label) + ": " + U.escapeHtml(opt.label) + '" title="' + U.escapeHtml(opt.label) + '">' +
          inner +
          "</button>"
        );
      }).join("");

      var selectedLabel = group._taagerMulti
        ? (function () { for (var oi = 0; oi < group.options.length; oi++) { if (group.options[oi].value === currentId) return group.options[oi].label; } return group.options[0].label; })()
        : group.options[0].label;
      return (
        '<div class="pdp-variant-group" data-group-key="' + U.escapeHtml(group.key) + '">' +
        '<div class="pdp-variant-label">' + U.escapeHtml(group.label) + ": " +
        '<span class="pdp-variant-selected" data-selected-label>' + U.escapeHtml(selectedLabel) + "</span></div>" +
        '<div class="pdp-variant-options">' + optionsHtml + "</div>" +
        "</div>"
      );
    }).join("");

    root.addEventListener("click", function (e) {
      var btn = e.target.closest(".pdp-variant-card");
      if (!btn || btn.disabled) return;
      var groupEl = btn.closest(".pdp-variant-group");
      var groupKey = groupEl.getAttribute("data-group-key");
      var group = vm.variants.find(function (g) { return g.key === groupKey; });
      var idx = Number(btn.getAttribute("data-index"));
      var option = group.options[idx];

      // Taager multi-variant: navigate to sibling product page
      if (group._taagerMulti) {
        if (option.value !== currentId) {
          window.location.href = "product.html?id=" + encodeURIComponent(option.value);
        }
        return;
      }

      U.qsa(".pdp-variant-card", groupEl).forEach(function (c) { c.classList.remove("is-selected"); c.setAttribute("aria-pressed", "false"); });
      btn.classList.add("is-selected");
      btn.setAttribute("aria-pressed", "true");
      var labelEl = U.qs("[data-selected-label]", groupEl);
      if (labelEl) labelEl.textContent = option.label;
      if (root.__pdpSelection) root.__pdpSelection[groupKey] = option;

      root.dispatchEvent(new CustomEvent("pdp:variant-change", { bubbles: true, detail: { groupKey: groupKey, option: option } }));
    });

    var selection = {};
    U.qsa(".pdp-variant-group", root).forEach(function (groupEl) {
      var groupKey = groupEl.getAttribute("data-group-key");
      var group = vm.variants.find(function (g) { return g.key === groupKey; });
      var idx = Number((U.qs(".pdp-variant-card.is-selected", groupEl) || {}).getAttribute ? U.qs(".pdp-variant-card.is-selected", groupEl).getAttribute("data-index") : 0) || 0;
      if (group && group.options[idx]) selection[groupKey] = group.options[idx];
    });
    root.__pdpSelection = selection;
  }

  function getSelectedOptions(root) {
    var sel = root && root.__pdpSelection;
    if (!sel) return {};
    var out = {};
    Object.keys(sel).forEach(function (key) { if (sel[key]) out[key] = sel[key]; });
    return out;
  }

  global.PDP = global.PDP || {};
  global.PDP.Variants = { render: render, getSelectedOptions: getSelectedOptions };
})(window);
