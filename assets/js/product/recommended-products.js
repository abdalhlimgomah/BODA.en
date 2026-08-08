/**
 * PDP.Recommended — horizontal snap carousel using the same
 * .noon-product-card visual as the home page (buildProductCard).
 * Drag / touch / mouse-wheel compatible.
 * Accepts label ("مقترحات لك" / "قد يعجبك أيضاً").
 */
(function (global) {
  "use strict";

  var U = global.PDP.Utils;

  function resolvePrice(product) {
    if (global.BudaStore && global.BudaStore.resolveProductPrice) {
      var r = global.BudaStore.resolveProductPrice(product);
      var basePrice = r.currentPrice > 0 ? r.currentPrice : (Number(product.price) || 0);
      var finalPrice = basePrice;
      if (global.PricingEngine && global.PricingEngine.tiersLoaded) {
        finalPrice = global.PricingEngine.calculate(basePrice);
      }
      var origPrice = r.originalPrice > finalPrice ? r.originalPrice : (r.hasDiscount ? finalPrice * 1.25 : finalPrice);
      return {
        currentPrice: finalPrice,
        originalPrice: origPrice,
        hasDiscount: origPrice > finalPrice,
        discountPercent: origPrice > finalPrice ? Math.round(((origPrice - finalPrice) / origPrice) * 100) : 0
      };
    }
    var price = Number(product.price) || 0;
    var orig = Number(product.originalPrice) || 0;
    if (orig > price && price > 0) {
      return { currentPrice: price, originalPrice: orig, hasDiscount: true, discountPercent: Math.round(((orig - price) / orig) * 100) };
    }
    return { currentPrice: price, originalPrice: price, hasDiscount: false, discountPercent: 0 };
  }

  function formatMoney(value) {
    if (global.BudaStore && typeof global.BudaStore.formatMoney === "function") {
      return global.BudaStore.formatMoney(value);
    }
    return U.money(value);
  }

  function escapeHtml(v) { return U.escapeHtml(v); }

  function buildCard(product) {
    var name = product.name || "منتج";
    var images = U.getProductImages(product) || [];
    var img = images[0] || U.fallbackImage();
    var rp = resolvePrice(product);
    var id = String(product.id);
    var isWish = global.BudaStore && global.BudaStore.isInWishlist ? global.BudaStore.isInWishlist(id) : false;
    var fb = U.fallbackImage();
    var rr = { rating: 0, reviewCount: 0 };
    if (global.BudaStore && global.BudaStore.resolveProductRating) {
      rr = global.BudaStore.resolveProductRating(product);
    }
    var starsHtml = "";
    if (rr.rating > 0) {
      starsHtml = '<div class="noon-rating-pill"><span class="noon-rating-stars">\u2605</span> <span>' + rr.rating.toFixed(1) + '</span> <span class="noon-rating-count">(' + rr.reviewCount + ')</span></div>';
    }
    var discountHtml = "";
    if (rp.hasDiscount) {
      discountHtml = '<p class="noon-old-price">' + formatMoney(rp.originalPrice) + '</p><span class="noon-discount-pill">' + rp.discountPercent + '%</span>';
    }
    var priceHtml = '<div class="noon-price-line"><p class="noon-price">' + formatMoney(rp.currentPrice) + '</p>' + discountHtml + '</div>';

    // Image gallery
    var imgs = "", dots = "";
    for (var gi = 0; gi < images.length; gi++) {
      imgs += '<img class="noon-gallery-img' + (gi === 0 ? " active" : "") + '" src="' + images[gi] + '" alt="' + escapeHtml(name) + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + fb + '\'" />';
      if (images.length > 1) dots += '<span' + (gi === 0 ? ' class="active"' : "") + ' data-index="' + gi + '"></span>';
    }

    var html = '<div class="noon-product-card" data-view-product="' + escapeHtml(id) + '">';
    html += '<div class="noon-product-media-wrap">';
    html += '<button class="icon-btn noon-wishlist-btn' + (isWish ? ' is-active' : '') + '" data-wishlist="' + escapeHtml(id) + '" aria-label="\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0627\u0644\u0645\u0641\u0636\u0644\u0629" aria-pressed="' + (isWish ? 'true' : 'false') + '"><span class="material-icons-outlined" style="font-size:18px;">' + (isWish ? 'favorite' : 'favorite_border') + '</span></button>';
    html += '<div class="noon-product-media"><div class="buda-pulse-dot" data-pulse-dot="' + id + '"><div class="buda-pulse-dot-inner"><div class="buda-pulse-dot-circle"></div></div></div>' + imgs;
    if (dots) html += '<span class="noon-img-dots">' + dots + '</span>';
    html += '</div>';
    html += '<button class="noon-add-square" data-add-to-cart="' + escapeHtml(id) + '" aria-label="\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0627\u0644\u0633\u0644\u0629">+</button>';
    html += '</div>';
    html += '<div class="noon-product-body">';
    html += '<h4 class="noon-title">' + escapeHtml(name) + '</h4>';
    html += starsHtml;
    html += priceHtml;
    html += '</div></div>';
    return html;
  }

  function render(root, vm, products, options) {
    options = options || {};
    if (!root) return;
    if (!products || !products.length) { root.innerHTML = '<div class="pdp-carousel-empty">\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0646\u062A\u062C\u0627\u062A \u0645\u0642\u062A\u0631\u062D\u0629 \u062D\u0627\u0644\u064A\u0627\u064B</div>'; return; }

    var label = options.label || "\u0645\u0646\u062A\u062C\u0627\u062A \u0645\u0642\u062A\u0631\u062D\u0629";
    var html = '<div class="pdp-carousel-section">';
    if (!options.hideTitle) html += '<h2 class="pdp-section-title">' + escapeHtml(label) + '</h2>';
    html += '<div class="pdp-carousel-wrap">';
    html += '<div class="pdp-carousel-track" role="list" aria-label="' + escapeHtml(label) + '">';
    products.slice(0, 27).forEach(function (p) {
      if (p) html += buildCard(p);
    });
    html += '</div>';
    html += '<button type="button" class="pdp-carousel-nav prev" aria-label="\u0627\u0644\u0633\u0627\u0628\u0642"><span class="material-icons-outlined">chevron_right</span></button>';
    html += '<button type="button" class="pdp-carousel-nav next" aria-label="\u0627\u0644\u062A\u0627\u0644\u064A"><span class="material-icons-outlined">chevron_left</span></button>';
    html += '</div></div>';

    root.innerHTML = html;

    // Attach events
    var track = root.querySelector(".pdp-carousel-track");
    if (track) {
      // Card click → navigate
      track.addEventListener("click", function (e) {
        var card = e.target.closest(".noon-product-card");
        if (!card) return;
        var target = e.target;
        if (target.closest("[data-add-to-cart]") || target.closest("[data-wishlist]")) return;
        var pid = card.getAttribute("data-view-product");
        if (pid) {
          if (global.BudaStore) {
            var p = global.BudaStore.getProductById(pid);
            if (p) {
              try { sessionStorage.setItem("selectedProduct", encodeURIComponent(JSON.stringify(p))); } catch (ex) {}
            }
          }
          window.location.href = "product.html?id=" + encodeURIComponent(pid);
        }
      });
      // Wishlist
      track.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-wishlist]");
        if (!btn) return;
        var pid = btn.getAttribute("data-wishlist");
        if (global.BudaStore) {
          var active = global.BudaStore.toggleWishlist(pid);
          var icon = btn.querySelector(".material-icons-outlined");
          btn.classList.toggle("is-active", Boolean(active));
          btn.setAttribute("aria-pressed", active ? "true" : "false");
          if (icon) icon.textContent = active ? "favorite" : "favorite_border";
        }
      });
      // Add to cart
      track.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-add-to-cart]");
        if (!btn) return;
        e.stopPropagation();
        var pid = btn.getAttribute("data-add-to-cart");
        if (global.BudaStore) {
          var p = global.BudaStore.getProductById(pid);
          if (p) {
            global.BudaStore.addToCart(p, 1);
            global.BudaStore.updateCartCount();
            if (global.BudaUI) global.BudaUI.refreshShell();
          }
        }
      });
      // Drag scroll
      (function () {
        var dragData = { isDown: false, moved: false };
        var startX = 0, scrollLeft = 0;
        track.addEventListener("mousedown", function (e) {
          dragData.isDown = true;
          dragData.moved = false;
          track.classList.add("is-dragging");
          startX = e.pageX - track.offsetLeft;
          scrollLeft = track.scrollLeft;
        });
        track.addEventListener("mouseleave", function () { dragData.isDown = false; track.classList.remove("is-dragging"); });
        track.addEventListener("mouseup", function () { dragData.isDown = false; track.classList.remove("is-dragging"); });
        track.addEventListener("mousemove", function (e) {
          if (!dragData.isDown) return;
          e.preventDefault();
          track.scrollLeft = scrollLeft - (e.pageX - track.offsetLeft - startX) * 1.5;
          if (Math.abs(track.scrollLeft - scrollLeft) > 5) dragData.moved = true;
        });
      })();
    }

    // Nav buttons
    var prevBtn = root.querySelector(".pdp-carousel-nav.prev");
    var nextBtn = root.querySelector(".pdp-carousel-nav.next");
    if (track && prevBtn && nextBtn) {
      var scrollAmount = 280;
      prevBtn.addEventListener("click", function () { track.scrollBy({ left: -scrollAmount, behavior: "smooth" }); });
      nextBtn.addEventListener("click", function () { track.scrollBy({ left: scrollAmount, behavior: "smooth" }); });
      function updateNav() {
        prevBtn.classList.toggle("is-visible", track.scrollLeft > 10);
        nextBtn.classList.toggle("is-visible", track.scrollLeft < track.scrollWidth - track.clientWidth - 10);
      }
      track.addEventListener("scroll", updateNav);
      setTimeout(updateNav, 100);
    }
  }

  global.PDP = global.PDP || {};
  global.PDP.Recommended = { render: render };
})(window);
