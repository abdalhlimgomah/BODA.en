/**
 * PDP.Index — main entry point. Orchestrates data resolution,
 * component rendering, actions, and staggered skeleton reveal.
 */
(function (global) {
  "use strict";

  var D = global.PDP.Data;
  var U = global.PDP.Utils;
  var S = global.PDP.Skeleton;

  function qs(s) { return document.querySelector(s); }
  function qsa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }

  var vm = null;
  var allProducts = [];

// ---------------------------------------------------------------
   // Actions shared between components
   // ---------------------------------------------------------------
   function onAddToCart(qty) {
     if (!vm) return;
     if (global.PDP.SizeSelector && !global.PDP.SizeSelector.requireSize()) return;
     qty = U.clampInt(qty, 1, 99);
     var opts = {};
     if (global.PDP.SizeSelector) {
       var sz = global.PDP.SizeSelector.getSelectedSize();
       if (sz) opts.selectedSize = sz;
     }
     if (window.BudaStore) {
       window.BudaStore.addToCart(vm.raw, qty, opts);
       window.BudaStore.updateCartCount();
       if (window.BudaUI) window.BudaUI.refreshShell();
     }
     U.notify("تمت إضافة " + qty + " قطع من " + vm.name + " إلى السلة", { type: "success" });
   }

   function onToggleWishlist(btn) {
     if (!btn) return;
     if (!vm || !vm.id) return;
     var active = false;
     if (window.BudaStore) {
       active = window.BudaStore.toggleWishlist(vm.id);
     }
     if (!active) {
       btn.classList.remove("is-active");
       var icon = btn.querySelector(".material-icons-outlined");
       if (icon) icon.textContent = "favorite_border";
       btn.setAttribute("aria-pressed", "false");
     } else {
       btn.classList.add("is-active");
       var icon = btn.querySelector(".material-icons-outlined");
       if (icon) icon.textContent = "favorite";
       btn.setAttribute("aria-pressed", "true");
     }
     if (global.PDP.StickyCart) global.PDP.StickyCart.syncWishlistButtons(document.getElementById("pdp-root"), active);
     U.notify(active ? "تمت الإضافة إلى المفضلة" : "تمت الإزالة من المفضلة", { type: "info" });
   }

   // Sync wishlist button states on page load
   function syncWishlistOnLoad() {
     if (!vm || !vm.id || !window.BudaStore) return;
     var isInWishlist = window.BudaStore.isInWishlist(vm.id);
     if (global.PDP.StickyCart) {
       global.PDP.StickyCart.syncWishlistButtons(document.getElementById("pdp-root"), isInWishlist);
     }
   }

   // ---------------------------------------------------------------
   // Render all buybox regions
   // ---------------------------------------------------------------
  function renderBuybox() {
    if (global.PDP.Gallery) global.PDP.Gallery.mount(document.querySelector("[data-pdp-gallery]"), vm);
    if (global.PDP.PriceCard) global.PDP.PriceCard.render(document.querySelector("[data-pdp-price]"), vm);
    if (global.PDP.Info) global.PDP.Info.render(document.querySelector("[data-pdp-info]"), vm);
    if (global.PDP.SizeSelector) { global.PDP.SizeSelector.render(document.querySelector("[data-pdp-sizes]"), vm); S.reveal(document.querySelector("[data-pdp-scope=sizes]")); }
    if (global.PDP.Variants) global.PDP.Variants.render(document.querySelector("[data-pdp-variants]"), vm);
    if (global.PDP.Delivery) global.PDP.Delivery.render(document.querySelector("[data-pdp-delivery]"), vm);
    if (global.PDP.Installment) global.PDP.Installment.render(document.querySelector("[data-pdp-installment]"), vm);
    if (global.PDP.Seller) global.PDP.Seller.render(document.querySelector("[data-pdp-seller]"), vm, { onAddToCart: onAddToCart, onToggleWishlist: onToggleWishlist });
    if (global.PDP.StickyCart) global.PDP.StickyCart.render(document.querySelector("[data-pdp-sticky]"), vm, { onAddToCart: onAddToCart, onToggleWishlist: onToggleWishlist });
    if (global.PDP.Info) {
      var offersEl = document.getElementById("pdp-offers");
      if (offersEl) global.PDP.Info.renderOffers(offersEl, vm);
    }
    syncWishlistOnLoad();
  }

  // ---------------------------------------------------------------
  // Render overview tab panels (highlights + description + specs)
  // ---------------------------------------------------------------
  function renderOverview() {
    var overviewRoot = document.getElementById("pdp-overview");
    if (!overviewRoot || !vm) return;

    var grid = overviewRoot.querySelector(".pdp-overview-grid");
    if (grid && vm.highlights.length) {
      var icons = ["star", "verified", "bolt", "sell", "new_releases", "local_offer", "auto_awesome", "check_circle", "done_all", "trending_up"];
      grid.innerHTML = vm.highlights.slice(0, 8).map(function (h, i) {
        return '<div class="pdp-overview-item"><span class="material-icons-outlined">' + icons[i % icons.length] + '</span><span>' + U.escapeHtml(h) + '</span></div>';
      }).join("");
      if (vm.highlights.length > 4) {
        var moreBtn = overviewRoot.querySelector(".pdp-overview-more");
        if (moreBtn) { moreBtn.style.display = "block"; moreBtn.onclick = function () { qsa(".pdp-overview-item", grid).forEach(function (el) { el.style.display = "flex"; }); moreBtn.style.display = "none"; }; }
      }
    }

    var descEl = overviewRoot.querySelector(".pdp-desc-text");
    if (descEl) {
      descEl.textContent = vm.description.full || "لا يوجد وصف متاح لهذا المنتج.";
      if (descEl.textContent.length > 200) {
        descEl.classList.add("pdp-desc-clamp");
        var toggleBtn = overviewRoot.querySelector(".pdp-desc-toggle");
        if (toggleBtn) {
          toggleBtn.style.display = "block";
          var clamped = true;
          toggleBtn.onclick = function () {
            descEl.classList.toggle("pdp-desc-clamp");
            toggleBtn.textContent = clamped ? "عرض أقل" : "عرض المزيد";
            clamped = !clamped;
          };
        }
      }
    }
  }

  function renderSpecs() {
    var root = document.getElementById("pdp-specs");
    if (!root || !vm) return;
    var table = root.querySelector(".pdp-spec-table");
    var note = root.querySelector(".pdp-empty-note");
    if (table && vm.specs && vm.specs.length) {
      table.innerHTML = vm.specs.map(function (s) { return "<tr><td>" + U.escapeHtml(s.label) + "</td><td>" + U.escapeHtml(s.value) + "</td></tr>"; }).join("");
      table.style.display = "";
      if (note) note.style.display = "none";
    } else {
      if (table) table.style.display = "none";
      if (note) note.style.display = "";
    }
  }

  function renderReviews() {
    var root = document.getElementById("pdp-reviews");
    if (!root || !vm) return;
    if (global.PDP.Reviews) global.PDP.Reviews.render(root, vm);
  }

  // ---------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------
  function initTabs() {
    var bar = document.querySelector(".pdp-tabs-bar");
    if (!bar) return;
    bar.addEventListener("click", function (e) {
      var btn = e.target.closest(".pdp-tab-btn");
      if (!btn) return;
      var target = btn.getAttribute("data-tab");
      qsa(".pdp-tab-btn", bar).forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      qsa(".pdp-tab-panel").forEach(function (p) { p.classList.remove("is-active"); });
      var panel = document.getElementById("pdp-panel-" + target);
      if (panel) panel.classList.add("is-active");
    });
  }

  // ---------------------------------------------------------------
  // Bought Together
  // ---------------------------------------------------------------
  function renderBoughtTogether() {
    var root = document.getElementById("pdp-bought-together");
    if (!root || !vm || !allProducts.length) { if (root) root.style.display = "none"; return; }
    var picks = D.pickBoughtTogether(vm.raw, allProducts, 3);
    if (!picks.length) { root.style.display = "none"; return; }
    root.style.display = "";
    if (global.PDP.BoughtTogether) global.PDP.BoughtTogether.render(root, vm, picks, { onAddToCart: onAddToCart });
  }

  // ---------------------------------------------------------------
  // Recommended / Similar / May Like carousels
  // ---------------------------------------------------------------
  function renderCarousels() {
    if (!allProducts.length) return;
    if (global.PDP.Recommended) {
      var similarProducts = D.pickSimilar(vm.raw, allProducts, 54);
      global.PDP.Recommended.render(document.getElementById("pdp-similar"), vm, similarProducts.slice(0, 27), { onAddToCart: onAddToCart, hideTitle: true });
      global.PDP.Recommended.render(document.getElementById("pdp-similar-more"), vm, similarProducts.slice(27, 54), { onAddToCart: onAddToCart, hideTitle: true });
      var excludeIds = similarProducts.map(function (p) { return String(p.id); });
      var recPicks = D.pickRecommended(vm.raw, allProducts, excludeIds, 27);
      var recIds = recPicks.map(function (p) { return String(p.id); });
      global.PDP.Recommended.render(document.getElementById("pdp-recommended"), vm, recPicks, { onAddToCart: onAddToCart, hideTitle: true });
      global.PDP.Recommended.render(document.getElementById("pdp-maylike"), vm, D.pickMayLike(vm.raw, allProducts, excludeIds.concat(recIds), 27), { onAddToCart: onAddToCart, hideTitle: true });
    }
  }

  // ---------------------------------------------------------------
  // Ad banner
  // ---------------------------------------------------------------
  function renderBanner() {
    var root = document.getElementById("pdp-banner");
    if (!root || !vm || !vm.banner) { if (root) root.style.display = "none"; return; }
    root.style.display = "";
    root.innerHTML = '<div class="hm-banner hm-banner-wide"><a href="' + U.escapeHtml(vm.banner.link) + '"><img src="' + vm.banner.image + '" alt="" loading="lazy"></a><span class="ad-badge"></span></div>';
  }

  // ---------------------------------------------------------------
  // Main init
  // ---------------------------------------------------------------
  // Global error catchers so the page always reveals
  window.addEventListener("error", function (e) {
    console.error("[PDP] Uncaught:", e.error || e.message);
    S.revealAll();
  });
  window.addEventListener("unhandledrejection", function (e) {
    console.error("[PDP] Unhandled rejection:", e.reason);
    S.revealAll();
  });

  async function init() {
    document.body.classList.remove("product-detail-loading");
    document.body.classList.add("pdp-shell-active");

    var product = await D.resolveProduct();
    if (!product) {
      U.notify("لم يتم العثور على المنتج — عرض تجريبي", { type: "info" });
      vm = D.buildFallbackViewModel();
      renderBuybox();
      renderOverview();
      renderSpecs();
      renderReviews();
      initTabs();
      S.revealAll();
      return;
    }
    var reviews = await D.fetchRatings(product.id);
    var seller = null;
    try {
      seller = await D.resolveSeller(product);
    } catch (e) {
      console.warn("[PDP] seller resolve failed", e);
      seller = null;
    }
    vm = D.buildViewModel(product, { reviews: reviews, seller: seller });

    renderBuybox();
    renderOverview();
    renderSpecs();
    renderReviews();
    initTabs();
    renderBanner();

    // Listen for pricing engine tiers loaded — re-render price
    function onPricingUpdated() {
      if (!vm || !vm.raw) return;
      var price = D.buildPrice(vm.raw);
      vm.price = price;
      var buyboxRoot = document.querySelector("[data-pdp-scope=buybox]");
      if (buyboxRoot) {
        global.PDP.PriceCard.render(buyboxRoot, vm);
        if (global.PDP.StickyAddToCart) global.PDP.StickyAddToCart.render(vm);
      }
    }
    document.addEventListener("boda:pricing-updated", onPricingUpdated);

    // Size guide button
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-size-guide-btn]");
      if (btn && global.PDP.SizeGuide) global.PDP.SizeGuide.open(vm);
    });

    // Reveal buybox + tabs immediately (data already loaded)
    S.reveal(document.querySelector("[data-pdp-scope=buybox]"));
    setTimeout(function () { S.reveal(document.querySelector("[data-pdp-scope=tabs]")); S.reveal(document.querySelector("[data-pdp-scope=reviews]")); }, 80);

    // Load cross-sell pool in background — reveal skeletons when done
    D.getAllProducts().then(function (list) {
      allProducts = list;
      renderCarousels();
      renderBoughtTogether();

      // Re-render Taager multi-variant if siblings were loaded after initial build
      if (vm && vm.raw) {
        if (vm.raw._needsTaagerVariants) {
          var updatedGroups = D.buildVariants(vm.raw);
          if (updatedGroups && updatedGroups.length) {
            vm.variants = updatedGroups;
            var variantsRoot = document.querySelector("[data-pdp-variants]");
            if (global.PDP.Variants && variantsRoot) {
              global.PDP.Variants.render(variantsRoot, vm);
            }
          }
        }
        if (vm.raw._needsTaagerSizes) {
          var retrySizes = D.buildSizes(vm.raw);
          if (retrySizes && retrySizes.length) {
            vm.sizes = retrySizes;
            var sRoot = document.querySelector("[data-pdp-sizes]");
            if (global.PDP.SizeSelector && sRoot) global.PDP.SizeSelector.render(sRoot, vm);
          }
          if (vm.raw._needsTaagerSizes && D.fetchSizesFromVariantGroups) {
            D.fetchSizesFromVariantGroups(vm.raw).then(function (fbSizes) {
              if (fbSizes && fbSizes.length) {
                vm.sizes = fbSizes;
                vm.raw._needsTaagerSizes = false;
                var sRoot2 = document.querySelector("[data-pdp-sizes]");
                if (global.PDP.SizeSelector && sRoot2) global.PDP.SizeSelector.render(sRoot2, vm);
              }
            });
          }
        }
      }

      S.reveal(document.querySelector("[data-pdp-scope=bt]"));
      S.reveal(document.querySelector("[data-pdp-scope=similar]"));
      S.reveal(document.querySelector("[data-pdp-scope=similar-more]"));
      S.reveal(document.querySelector("[data-pdp-scope=rec]"));
      S.reveal(document.querySelector("[data-pdp-scope=maylike]"));
    }).catch(function () {
      S.reveal(document.querySelector("[data-pdp-scope=bt]"));
      S.reveal(document.querySelector("[data-pdp-scope=similar]"));
      S.reveal(document.querySelector("[data-pdp-scope=similar-more]"));
      S.reveal(document.querySelector("[data-pdp-scope=rec]"));
      S.reveal(document.querySelector("[data-pdp-scope=maylike]"));
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

})(window);
