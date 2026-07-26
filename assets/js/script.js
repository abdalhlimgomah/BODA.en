// ========== UTILITY FUNCTIONS ==========

/**
 * Image path helper moved to `assets/js/store.js` (exposed as `window.getImagePath`)
 * Keep calls here minimal to avoid duplicate declarations.
 */

// Shopping cart functions are provided by `assets/js/store.js` (BudaStore).
// Do not redeclare `addToCart` here to avoid conflicts with the centralized store implementation.

// updateCartCount is provided by store.js; do not redeclare here to
// avoid conflicts.  if the function is ever missing, store.js already
// handles its own fallback logic.
function handleNewUserAccount() {
    const isNewAccount = localStorage.getItem('isNewAccount') === 'true';
    const userEmail = localStorage.getItem('userEmail');
    if (!isNewAccount || !userEmail) return;
    localStorage.removeItem('cart');
    localStorage.removeItem('wishlist');
    localStorage.setItem(`cart_${userEmail}`, JSON.stringify([]));
    localStorage.setItem(`wishlist_${userEmail}`, JSON.stringify([]));
    localStorage.removeItem('isNewAccount');
    console.log(`✅ Initialized new user account for ${userEmail}`);
}


// Delegate to centralized store if available, otherwise provide a minimal fallback
if (!window.getAllProducts) {
    window.getAllProducts = function() {
        if (typeof BudaStore !== 'undefined' && typeof BudaStore.getAllProducts === 'function') {
            return BudaStore.getAllProducts();
        }
        return {};
    };
}

if (!window.getProductById) {
    window.getProductById = function(id) {
        const all = (typeof window.getAllProducts === 'function') ? window.getAllProducts() : {};
        return all[id] || null;
    };
}

// ========== PRODUCT DETAIL FUNCTIONS ==========

/**
 * Render stars for rating
 */
function renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    
    // Using FontAwesome icons if available, otherwise fallback to stars
    return '<i class="fa-solid fa-star"></i>'.repeat(full) + 
           (half ? '<i class="fa-solid fa-star-half-stroke"></i>' : '') + 
           '<i class="fa-regular fa-star"></i>'.repeat(empty);
}

/**
 * Navigate to product detail page
 */
function viewProduct(productId) {
    const isSubPage = window.location.pathname.includes('/pages/');
    if (window.BudaStore?.getProductById) {
        const selected = window.BudaStore.getProductById(productId);
        if (selected) {
            try {
                sessionStorage.setItem("selectedProduct", encodeURIComponent(JSON.stringify(selected)));
            } catch {
                // Ignore storage failures and continue navigation.
            }
        }
    }
    window.location.href = isSubPage ? `product.html?id=${productId}` : `pages/product.html?id=${productId}`;
}

/**
 * Toggle wishlist for a product
 * Only define if a shared implementation hasn't already been provided by `store.js`.
 */
if (typeof window.toggleWishlist === 'undefined') {
    window.toggleWishlist = function(productId) {
    // ✅ فحص تسجيل الدخول
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        showNotification('❌ يجب تسجيل الدخول أولاً لإضافة المفضلة');
        setTimeout(() => {
            window.location.href = '/pages/login.html';
        }, 1500);
        return;
    }
    
    const allProducts = getAllProducts();
    const product = allProducts[productId];
    if (!product) return;

    const wishlist = getWishlist();
    const existingIndex = wishlist.findIndex(item => item.id === productId);

    if (existingIndex !== -1) {
        // إزالة من المفضلة
        wishlist.splice(existingIndex, 1);
        saveWishlist(wishlist);
        showNotification(`تم إزالة "${product.name}" من المفضلة ❌`, 'warning');
    } else {
        // إضافة للمفضلة
        wishlist.push(product);
        saveWishlist(wishlist);
        showNotification(`تم إضافة "${product.name}" إلى المفضلة! ❤️`, 'success');
    }
    
    // Update UI if renderWishlist function exists (on wishlist.html)
    if (typeof renderWishlist === 'function') {
        renderWishlist();
    }
    
    // Update wishlist button state if we are on product.html
    const wishlistBtn = document.getElementById('wishlistBtn');
    if (wishlistBtn) {
        const isInWishlist = getWishlist().some(item => item.id === productId);
        wishlistBtn.classList.toggle('active', isInWishlist);
    }
    };
}

/**
 * Remove product from wishlist
 */
function removeFromWishlist(productId) {
    let wishlist = getWishlist();
    wishlist = wishlist.filter(item => item.id !== productId);
    saveWishlist(wishlist);
    showNotification('تم إزالة المنتج من المفضلة ❌', 'warning');
}

// ========== PROMO IMAGE SLIDER ==========

/**
 * Auto-sliding promo images
 */
let promoImages = document.querySelectorAll('.promo-image');
let currentPromoIndex = 0;

function showNextPromoImage() {
    if (promoImages.length > 0) {
        promoImages[currentPromoIndex].classList.remove('active');
        currentPromoIndex = (currentPromoIndex + 1) % promoImages.length;
        promoImages[currentPromoIndex].classList.add('active');
    }
}

// Start the slider when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (promoImages.length > 0) {
        promoImages[0].classList.add('active'); // Show first image initially
        setInterval(showNextPromoImage, 3000); // Change every 3 seconds
    }
});
