function formatWishlistMoney(value) {
  return window.BudaStore ? window.BudaStore.formatMoney(value) : (Number(value) || 0).toFixed(2).replace(/\.00$/, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function wishlistNotify(message, type = "info") {
  if (window.BudaUI?.notify) {
    window.BudaUI.notify(message, { type, target: "#wishlist-status" });
    return;
  }
 
  const status = document.getElementById("wishlist-status");
  if (!status) return;
  status.textContent = message;
  status.classList.remove("hidden", "error", "success", "info");
  status.classList.add("status-note", type === "error" ? "error" : type === "success" ? "success" : "info");
}

function resolveWishlistPrice(item) {
  if (window.BudaStore?.resolveProductPrice) {
    // Create a full product object with all necessary fields for dynamic pricing
    const productForPricing = {
      ...item,
      // Ensure all fields needed for dynamic pricing are present
      price: item.price || item.currentPrice || item.finalPrice,
      originalPrice: item.originalPrice || item.original_price || item.old_price,
      price_after_discount: item.price_after_discount || item.discountPrice,
      discount_percent: item.discount_percent || item.discountPercent,
      // Include Taager-specific fields if available
      taager_product_id: item.taager_product_id,
      category: item.category,
      seller_id: item.seller_id,
      source: item.source,
    };
    var { currentPrice, originalPrice, hasDiscount, discountPercent } =
      window.BudaStore.resolveProductPrice(productForPricing);
    if (window.PricingEngine?.tiersLoaded) {
      currentPrice = window.PricingEngine.calculate(currentPrice);
    }
    return { currentPrice, originalPrice, hasDiscount, discountPercent };
  }

  // Fallback
  var originalPrice = Number(item.originalPrice || item.original_price || item.old_price || item.price || 0);
  var discounted = Number(item.price_after_discount || item.discountPrice || item.discount_price || 0);
  var currentPrice = discounted > 0 && discounted < originalPrice ? discounted : Number(item.price) || originalPrice;
  if (window.PricingEngine?.tiersLoaded) {
    currentPrice = window.PricingEngine.calculate(currentPrice);
  }
  var hasDiscount = originalPrice > 0 && currentPrice < originalPrice;
  var discountPercent = hasDiscount ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
  return { currentPrice, originalPrice, hasDiscount, discountPercent };
}

function resolveWishlistRating(item) {
  if (window.BudaStore?.resolveProductRating) {
    const { rating, reviewCount } = window.BudaStore.resolveProductRating(item);
    return { rating, reviews: reviewCount };
  }

  return {
    rating: 0,
    reviews: 0,
  };
}

function renderRatingStars(rating) {
  if (window.BudaStore?.renderProductStars) {
    return window.BudaStore.renderProductStars(rating);
  }
  return "";
}

function getWishlistCountryCode() {
  if (window.TaagerIntegration && typeof window.TaagerIntegration.getSelectedCountry === "function") {
    var selected = window.TaagerIntegration.getSelectedCountry();
    if (selected && selected.code) return String(selected.code).toUpperCase();
  }
  return "EG";
}

function wishlistItemMatchesCountry(item, countryCode) {
  if (!item) return false;
  if (window.TaagerIntegration && typeof window.TaagerIntegration.matchesCountry === "function") {
    return window.TaagerIntegration.matchesCountry(item, countryCode);
  }
  var pCountry = String(item.country || item.country_code || "").toUpperCase();
  if (!pCountry) return true;
  return pCountry === String(countryCode || "EG").toUpperCase();
}

function renderWishlist() {
  if (!window.BudaStore) return;

  const loadingGrid = document.getElementById("wishlist-grid");
  if (loadingGrid && window.BudaStore.isWishlistLoaded && !window.BudaStore.isWishlistLoaded()) {
    loadingGrid.innerHTML =
      '<div class="noon-muted" style="grid-column:1/-1;text-align:center;padding:48px 0;">جاري تحميل المفضلة...</div>';
    return;
  }

  const countryCode = getWishlistCountryCode();
  const allWishlist = window.BudaStore.getWishlist();
  const wishlist = allWishlist.filter(function (item) {
    return wishlistItemMatchesCountry(item, countryCode);
  });
  const hasHiddenItems = wishlist.length === 0 && allWishlist.length > 0;
  const grid = document.getElementById("wishlist-grid");
  const emptyState = document.getElementById("wishlist-empty");
  const countEl = document.getElementById("wishlist-count");

  if (countEl) countEl.textContent = String(wishlist.length);
  if (!grid) return;

  if (!wishlist.length) {
    grid.innerHTML = "";
    emptyState?.classList.remove("hidden");
    if (emptyState) {
      emptyState.innerHTML = hasHiddenItems
        ? `
        <div class="wishlist-empty-content">
          <div class="wishlist-empty-animation">
            <span class="material-icons-outlined animated-heart">favorite_border</span>
          </div>
          <h2 class="wishlist-empty-title">لا توجد منتجات متاحة في بلدك الحالي</h2>
          <p class="wishlist-empty-text">منتجاتك المفضلة من دول أخرى لا تظهر هنا. بدّل الدولة من القائمة العلوية لعرضها.</p>
          <a href="home.html" class="btn-primary wishlist-empty-cta">
            <span class="material-icons-outlined">shopping_bag</span>
            تسوق الآن
          </a>
        </div>
      `
        : `
        <div class="wishlist-empty-content">
          <div class="wishlist-empty-animation">
            <span class="material-icons-outlined animated-heart">favorite_border</span>
          </div>
          <h2 class="wishlist-empty-title">قائمة المفضلة فارغة</h2>
          <p class="wishlist-empty-text">ابدأ بإضافة منتجاتك المفضلة لتظهر هنا. تصفح آلاف المنتجات الرائعة!</p>
          <a href="home.html" class="btn-primary wishlist-empty-cta">
            <span class="material-icons-outlined">shopping_bag</span>
            تسوق الآن
          </a>
        </div>
      `;
    }
    return;
  }

  emptyState?.classList.add("hidden");

  grid.innerHTML = `
    <div class="wishlist-grids">
      ${wishlist
        .map((origItem) => {
          let item = origItem;
          const id = String(item.id);
          // Refresh price/image snapshot from the live store so prices match
          // the currently selected country.
          var liveProduct = null;
          if (window.BudaStore && typeof window.BudaStore.getProductById === "function") {
            try { liveProduct = window.BudaStore.getProductById(id); } catch (_e) {}
          }
          if (
            liveProduct &&
            (Number(liveProduct.price) > 0 || Number(liveProduct.currentPrice) > 0) &&
            wishlistItemMatchesCountry(liveProduct, countryCode)
          ) {
            item = Object.assign({}, liveProduct, item);
          }
          const imgs = window.BudaStore?.getProductImages
            ? window.BudaStore.getProductImages(item)
            : [item.image];
          var fallbackImage = window.BudaStore.getImagePath(
            window.BudaStore.DEFAULT_PRODUCT_IMAGE || "assets/images/unnamed.png"
          );
          var galleryImgs = "";
          var dotsHtml = "";
          for (var gi = 0; gi < imgs.length; gi++) {
            var imgPath = window.BudaStore.getImagePath(imgs[gi] || "assets/images/unnamed.png");
            galleryImgs += '<img class="noon-gallery-img' + (gi === 0 ? " active" : "") + '" src="' + imgPath + '" alt="' + escapeHtml(item.name || "منتج") + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + fallbackImage + '\'" />';
            if (imgs.length > 1) {
              dotsHtml += '<span' + (gi === 0 ? ' class="active"' : "") + ' data-index="' + gi + '"></span>';
            }
          }
          const { currentPrice, originalPrice, hasDiscount, discountPercent } = resolveWishlistPrice(item);
          const { rating, reviews } = resolveWishlistRating(item);

          // Noon-style card structure
          return `
            <article class="noon-product-card" data-product-id="${id}">
              <div class="noon-product-media-wrap">
                ${hasDiscount ? `<span class="buda-badge">-${discountPercent}%</span>` : ""}
                <button class="icon-btn noon-wishlist-btn is-active" data-remove="${id}" aria-label="إزالة من المفضلة" aria-pressed="true">
                  <span class="material-icons-outlined" style="font-size:18px;">favorite</span>
                </button>
                <button class="noon-product-media" data-view="${id}" aria-label="عرض المنتج">
                  ${galleryImgs}
                  ${dotsHtml ? `<span class="noon-img-dots">${dotsHtml}</span>` : ""}
                </button>
                <button class="noon-add-square" data-add="${id}" aria-label="إضافة إلى السلة">+</button>
                ${(() => { const vc = window.BudaStore?.countProductVariants ? window.BudaStore.countProductVariants(item.raw || item) : 0; return vc > 1 ? `<span class="noon-variants-badge" title="متوفر بأكثر من لون"><img src="https://f.nooncdn.com/s/app/com/noon/images/colorVariants.svg" alt="" width="18" height="18" loading="lazy" /><span class="noon-variants-count">${vc}</span></span>` : ""; })()}
              </div>
              <div class="noon-product-body">
                <h3 class="noon-title">${escapeHtml(item.name || "منتج")}</h3>
                ${
                  reviews > 0
                    ? `<div class="noon-rating-pill">
                         <span class="noon-rating-stars">★</span> 
                         <span>${rating.toFixed(1)}</span> 
                         <span class="noon-rating-count">(${reviews})</span>
                       </div>`
                    : ""
                }
                <div class="noon-price-line">
                  <p class="noon-price">${formatWishlistMoney(currentPrice)}</p>
                  ${hasDiscount ? `<p class="noon-old-price">${formatWishlistMoney(originalPrice)}</p>` : ""}
                  ${hasDiscount ? `<span class="noon-discount-pill">${discountPercent}%</span>` : ""}
                </div>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;

  // Attach events for the new card structure
  attachProductCardEvents(grid);
}

function attachProductCardEvents(container) {
  // This function can be expanded from home.js or noon-shell.js if needed
  // For now, it's a placeholder to show where to add event logic for the new cards.
}

// Use event delegation on the grid (works even after re-render)
function setupWishlistEvents(grid) {
  if (!grid) return;
  
  // Remove old listeners by cloning (simple way)
  let newGrid = grid.cloneNode(true);
  grid.parentNode.replaceChild(newGrid, grid);
  
  newGrid.addEventListener("click", async function(e) {
    if (!window.BudaStore) return;
    
    // Add to cart
    const addBtn = e.target.closest("[data-add]");
    if (addBtn) {
      e.preventDefault();
      e.stopPropagation();
      const productId = addBtn.getAttribute("data-add");
      let product = window.BudaStore.getProductById(productId);
      if (!product) {
        const wishlist = window.BudaStore.getWishlist();
        product = wishlist.find((item) => String(item?.id) === String(productId));
      }
      if (product) {
        window.BudaStore.addToCart(product, 1);
        window.BudaStore.updateCartCount();
        window.BudaUI?.refreshShell();
        wishlistNotify("تمت إضافة المنتج إلى السلة.", "success");
      }
      return;
    }

    // Remove from wishlist
    const removeBtn = e.target.closest("[data-remove]");
    if (removeBtn) {
      e.preventDefault();
      e.stopPropagation();
      const productId = removeBtn.getAttribute("data-remove");
      window.BudaStore.toggleWishlist(productId);
      renderWishlist();
      wishlistNotify("تم حذف المنتج من المفضلة.", "info");
      return;
    }

    // View product
    const viewBtn = e.target.closest("[data-view]");
    if (viewBtn && !e.target.closest(".wishlist-img-dots")) {
      e.preventDefault();
      e.stopPropagation(); // Stop propagation to prevent card click
      const productId = viewBtn.getAttribute("data-view");
      const wishlist = window.BudaStore.getWishlist();
      const selected = wishlist.find((item) => String(item?.id) === String(productId));
      if (selected) {
        try {
          sessionStorage.setItem("selectedProduct", encodeURIComponent(JSON.stringify(selected)));
        } catch {}
      }
      window.location.href = `product.html?id=${encodeURIComponent(productId)}`;
      return;
    }
  });

  // Gallery dots
  newGrid.addEventListener("click", function (e) {
    const dot = e.target.closest(".noon-img-dots span");
    if (!dot) return;
    e.preventDefault();
    e.stopPropagation();
    const dots = dot.parentElement;
    const mediaButton = dots.closest(".noon-product-media") || dots.closest(".noon-product-media-wrap");
    const imgs = mediaButton.querySelectorAll(".noon-gallery-img");
    const idx = parseInt(dot.getAttribute("data-index"), 10);
    if (isNaN(idx)) return;
    dots.querySelectorAll("span").forEach(s => s.classList.remove("active"));
    imgs.forEach(img => img.classList.remove("active"));
    if (imgs[idx]) imgs[idx].classList.add("active");
    if (dots.children[idx]) dots.children[idx].classList.add("active");
  });
}

// Initialize on DOM ready and when wishlist loads from Supabase
document.addEventListener("DOMContentLoaded", function () {
  renderWishlist();
  setupWishlistEvents(document.getElementById("wishlist-grid"));
});

// Refresh wishlist when pricing engine updates
document.addEventListener("boda:pricing-updated", function () {
  renderWishlist();
});

document.addEventListener("boda:wishlist-loaded", function () {
  renderWishlist();
  setupWishlistEvents(document.getElementById("wishlist-grid"));
});

document.addEventListener("boda:country-changed", function () {
  renderWishlist();
  setupWishlistEvents(document.getElementById("wishlist-grid"));
});

// Add all wishlist items to cart
function addAllToCart() {
  if (!window.BudaStore) return;
  const wishlist = window.BudaStore.getWishlist();
  if (!wishlist.length) {
    wishlistNotify("المفضلة فارغة.", "info");
    return;
  }

  wishlist.forEach((item) => window.BudaStore.addToCart(item, 1, { silent: true }));
  window.BudaStore.updateCartCount();
  window.BudaUI?.refreshShell();
  wishlistNotify("تمت إضافة كل عناصر المفضلة إلى السلة.", "success");
}

// Clear entire wishlist
async function clearWishlist() {
  if (!window.BudaStore) return;
  if (!window.BudaStore.getWishlist().length) return;

  let shouldClear = true;
  if (window.BudaUI?.confirm) {
    shouldClear = await window.BudaUI.confirm("هل تريد حذف كل عناصر المفضلة؟", {
      title: "تأكيد الحذف",
      confirmText: "حذف الكل",
      cancelText: "إلغاء",
    });
  }

  if (!shouldClear) return;

  window.BudaStore.saveWishlist([]);
  renderWishlist();
  wishlistNotify("تم مسح قائمة المفضلة.", "success");
}

// Expose to global
window.addAllToCart = addAllToCart;
window.clearWishlist = clearWishlist;