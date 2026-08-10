/**
 * PDP.BoughtTogether — current product + up to 3 companions, each
 * with a checkbox, "+" connectors, total price and CTA.
 * Shows up to 3 gallery images of the main product below.
 */
(function (global) {
  "use strict";

  var U = global.PDP.Utils;

  function btResolvePrice(product) {
    var p = Number(product && product.price) || 0;
    if (global.BudaStore && global.BudaStore.resolveProductPrice) {
      var r = global.BudaStore.resolveProductPrice(product);
      var base = r.currentPrice > 0 ? r.currentPrice : p;
      p = base;
      if (global.PricingEngine && global.PricingEngine.tiersLoaded) {
        p = global.PricingEngine.calculate(base);
      }
    }
    return p;
  }

  function render(root, vm, companionProducts, actions) {
    var all = [{ product: vm.raw, checked: true, locked: true }];
    (companionProducts || []).slice(0, 3).forEach(function (p) {
      if (p) all.push({ product: p, checked: true, locked: false });
    });
    if (all.length < 2) { root.style.display = "none"; return; }
    root.style.display = "";

    var html = '<div class="pdp-bt">';
    html += '<div class="pdp-bt-row">';
    all.forEach(function (item, i) {
      if (i > 0) html += '<div class="pdp-bt-plus">+</div>';
      var name = item.product.name || "منتج";
      var price = btResolvePrice(item.product);
      var img = (U.getProductImages(item.product) || [])[0] || U.fallbackImage();
      var pid = String(item.product.id || item.product.product_id || item.product.sku || "");
      html += '<div class="pdp-bt-item" data-bt-index="' + i + '" data-bt-product="' + pid + '">';
      html += '<div class="pdp-bt-item-imgwrap"><div class="buda-pulse-dot"><div class="buda-pulse-dot-inner"><div class="buda-pulse-dot-circle"></div></div></div><img src="' + img + '" alt="' + U.escapeHtml(name) + '" loading="lazy" decoding="async">';
      html += '<div class="pdp-bt-checkbox' + (item.checked ? ' is-checked' : '') + (item.locked ? ' is-locked' : '') + '" data-bt-check="' + i + '"><span class="material-icons-outlined">check</span></div></div>';
      html += '<div class="pdp-bt-item-name">' + U.escapeHtml(name) + '</div>';
      html += '<div class="pdp-bt-item-price">' + U.money(price) + '</div>';
      html += '</div>';
    });
    html += '</div>';

    // Summary + CTA
    var total = all.reduce(function (s, item) { return item.checked ? s + btResolvePrice(item.product) : s; }, 0);
    var checkedCount = all.filter(function (item) { return item.checked; }).length;
    html += '<div class="pdp-bt-summary">';
    html += '<div><span class="pdp-bt-summary-label">المجموع الكلي للعناصر المحددة</span><span class="pdp-bt-summary-price">' + U.money(total) + '</span><span class="pdp-bt-summary-count">' + checkedCount + ' منتج</span></div>';
    html += '<button type="button" class="pdp-bt-btn" id="pdp-bt-add-all">أضف الكل للعربة</button>';
    html += '</div>';

    // Product gallery images stacked vertically (up to 3)
    var allImages = U.getProductImages(vm.raw) || [];
    var galleryImages = allImages.slice(0, 3);
    if (galleryImages.length > 1) {
      html += '<div class="pdp-bt-gallery">';
      galleryImages.forEach(function (img, gi) {
        html += '<div class="pdp-bt-gallery-item' + (gi === 0 ? ' is-active' : '') + '"><div class="buda-pulse-dot"><div class="buda-pulse-dot-inner"><div class="buda-pulse-dot-circle"></div></div></div><img src="' + img + '" alt="صورة المنتج" loading="lazy" onerror="this.style.display=\'none\'" /></div>';
      });
      html += '</div>';
    }

    root.innerHTML = html;

    // Click on product item → navigate to product detail
    root.addEventListener("click", function (e) {
      var itemEl = e.target.closest("[data-bt-product]");
      if (itemEl) {
        var target = e.target;
        if (target.closest("[data-bt-check]") || target.closest(".pdp-bt-checkbox")) return;
        var pid = itemEl.getAttribute("data-bt-product");
        if (pid) {
          if (global.BudaStore) {
            var p = global.BudaStore.getProductById(pid);
            if (p) {
              try { sessionStorage.setItem("selectedProduct", encodeURIComponent(JSON.stringify(p))); } catch (ex) {}
            }
          }
          window.location.href = "product.html?id=" + encodeURIComponent(pid);
        }
      }
    });

    // Checkbox toggle (not the locked main product)
    root.addEventListener("click", function (e) {
      var check = e.target.closest("[data-bt-check]");
      if (!check || check.classList.contains("is-locked")) return;
      var idx = Number(check.getAttribute("data-bt-check"));
      var item = all[idx];
      if (!item || item.locked) return;
      item.checked = !item.checked;
      check.classList.toggle("is-checked", item.checked);
      // Recalculate total
      var newTotal = all.reduce(function (s, it) { return it.checked ? s + btResolvePrice(it.product) : s; }, 0);
      var newCount = all.filter(function (it) { return it.checked; }).length;
      var priceEl = root.querySelector(".pdp-bt-summary-price");
      var countEl = root.querySelector(".pdp-bt-summary-count");
      if (priceEl) priceEl.textContent = U.money(newTotal);
      if (countEl) countEl.textContent = newCount + " منتج";
    });

    var addAllBtn = root.querySelector("#pdp-bt-add-all");
    if (addAllBtn && actions && actions.onAddToCart) {
      addAllBtn.addEventListener("click", function () {
        actions.onAddToCart(1);
      });
    }
  }

  global.PDP = global.PDP || {};
  global.PDP.BoughtTogether = { render: render };
})(window);
