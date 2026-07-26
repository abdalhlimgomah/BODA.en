(function() {
  "use strict";

  const itemsContainer = document.getElementById("ch-items");
  const cartItemCountEl = document.getElementById("ch-items-count");
  const subtotalEl = document.getElementById("ch-subtotal");
  const discountEl = document.getElementById("ch-discount");
  const discountRowEl = document.getElementById("ch-discount-row");
  const shippingEl = document.getElementById("ch-shipping");
  const taxEl = document.getElementById("ch-tax");
  const grandTotalEl = document.getElementById("ch-grand-total");
  const clearCartBtn = document.getElementById("clear-cart-btn");

  function formatPrice(value) {
    if (window.BudaStore && typeof window.BudaStore.formatMoney === "function") {
      return BudaStore.formatMoney(value, { plain: true });
    }
    return `${Number(value).toFixed(2)} ج.م`;
  }

  function renderCartItems() {
    if (!itemsContainer || !window.BudaStore) {
      return;
    }

    const cart = BudaStore.getCart();

    if (cart.length === 0) {
      // Potentially redirect or show an empty cart message.
      // For now, we'll just clear the container and the sample item.
      itemsContainer.innerHTML = '<p style="text-align: center; padding: 40px 0; color: #6B7280;">سلتك فارغة.</p>';
      return;
    }

    itemsContainer.innerHTML = cart.map(item => {
      const priceInfo = BudaStore.resolveProductPrice(item);
      const isWishlisted = BudaStore.isInWishlist(item.product_id);
      
      return `
        <div class="buda-product-card-v2" data-product-id="${item.id}">
            <div class="card-main-content">
                <label class="selection-checkbox">
                    <input type="checkbox" checked>
                    <span class="checkmark"></span>
                </label>
                <div class="product-image">
                    <img src="${BudaStore.getImagePath(item.image)}" alt="${item.name}">
                </div>
                <div class="product-details">
                    <div class="product-info">
                        <h3 class="product-name">${item.name}</h3>
                        ${item.selected_size ? `<p class="product-variant">المقاس: ${item.selected_size}</p>` : ''}
                        ${item.seller ? `<p class="product-store">المتجر: ${item.seller}</p>`: ''}
                    </div>
                    <div class="price-area">
                        <div class="price-details">
                            <span class="current-price">${formatPrice(priceInfo.currentPrice)}</span>
                            ${priceInfo.hasDiscount ? `<span class="old-price">${formatPrice(priceInfo.originalPrice)}</span>` : ''}
                        </div>
                        ${priceInfo.hasDiscount ? `<div class="discount-badge">خصم ${priceInfo.discountPercent}%</div>` : ''}
                    </div>
                </div>
            </div>
            <div class="card-actions">
                 <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" aria-label="أضف إلى المفضلة" data-action="wishlist">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </button>
                <div class="quantity-selector">
                    <button class="quantity-btn" aria-label="زيادة الكمية" data-action="increase-qty">
                       <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                    <span class="quantity-value">${item.quantity}</span>
                    <button class="quantity-btn" aria-label="انقاص الكمية" data-action="decrease-qty">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                </div>
                <button class="delete-btn" aria-label="حذف المنتج" data-action="delete">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                </button>
            </div>
        </div>
      `;
    }).join('');
  }
  
  function updateSummary() {
      // This is a placeholder. The original checkout.js handles this.
      // If checkout.js is not compatible, this function would need to be implemented fully.
      console.log("Updating summary...");
  }

  function handleCartInteraction(event) {
    const target = event.target;
    const actionButton = target.closest('[data-action]');
    if (!actionButton) return;

    const card = actionButton.closest('.buda-product-card-v2');
    const productId = card.dataset.productId;
    const action = actionButton.dataset.action;

    if (!productId) return;

    let cart = BudaStore.getCart();
    let item = cart.find(i => i.id === productId);

    if (action === 'increase-qty' && item) {
      BudaStore.updateQuantity(productId, item.quantity + 1);
    } else if (action === 'decrease-qty' && item) {
      BudaStore.updateQuantity(productId, item.quantity - 1);
    } else if (action === 'delete') {
      BudaStore.removeFromCart(productId);
    } else if (action === 'wishlist') {
        const product = BudaStore.getProductById(item.product_id);
        if (product) {
            BudaStore.toggleWishlist(product.id);
        }
    }

    renderCartItems();
    updateSummary();
  }

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
          renderCartItems();
          updateSummary();
      });
    } else {
        renderCartItems();
        updateSummary();
    }
    
    if (itemsContainer) {
        itemsContainer.addEventListener('click', handleCartInteraction);
    }

    if(clearCartBtn) {
        clearCartBtn.addEventListener('click', () => {
            if (confirm('هل أنت متأكد أنك تريد حذف جميع المنتجات من السلة؟')) {
                BudaStore.clearCart();
                renderCartItems();
                updateSummary();
            }
        });
    }
    
    document.addEventListener("boda:cart-loaded", function() {
        renderCartItems();
        updateSummary();
    });

    document.addEventListener("boda:wishlist-updated", function() {
        renderCartItems();
    });

  }

  init();

})();
