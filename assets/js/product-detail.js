const getQueryParam = (key) => new URLSearchParams(window.location.search).get(key);

const renderProductDetail = () => {
  if (!window.BODAStore) return;
  const productId = getQueryParam("id");
  const product = productId ? BODAStore.getProductById(productId) : null;
  const fallbackProduct = product || Object.values(BODAStore.getAllProducts())[0];
  if (!fallbackProduct) return;

  const imageEl = document.querySelector("[data-product-image]");
  const titleEl = document.querySelector("[data-product-title]");
  const priceEl = document.querySelector("[data-product-price]");
  const originalEl = document.querySelector("[data-product-original]");
  const discountEl = document.querySelector("[data-product-discount]");
  const descriptionEl = document.querySelector("[data-product-description]");

  const imagePath = BODAStore.getImagePath(fallbackProduct.image);
  if (imageEl) imageEl.src = imagePath;
  if (titleEl) titleEl.textContent = fallbackProduct.name;
  if (priceEl) priceEl.textContent = `${fallbackProduct.price} AED`;

  if (originalEl) {
    originalEl.textContent = fallbackProduct.originalPrice ? `${fallbackProduct.originalPrice} AED` : "";
    originalEl.style.display = fallbackProduct.originalPrice ? "inline" : "none";
  }

  if (discountEl) {
    const hasDiscount = fallbackProduct.originalPrice && fallbackProduct.originalPrice > fallbackProduct.price;
    if (hasDiscount) {
      const discountPercent = Math.round(
        ((fallbackProduct.originalPrice - fallbackProduct.price) / fallbackProduct.originalPrice) * 100
      );
      discountEl.textContent = `SAVE ${discountPercent}%`;
      discountEl.style.display = "inline-flex";
    } else {
      discountEl.style.display = "none";
    }
  }

  if (descriptionEl) descriptionEl.textContent = fallbackProduct.description;

  const addToCartButton = document.getElementById("add-to-cart");
  if (addToCartButton) {
    addToCartButton.addEventListener("click", () => {
      BODAStore.addToCart(fallbackProduct, 1);
    });
  }

  const wishlistButton = document.getElementById("wishlist-toggle");
  if (wishlistButton) {
    wishlistButton.addEventListener("click", () => {
      BODAStore.toggleWishlist(fallbackProduct.id);
    });
  }
};

document.addEventListener("DOMContentLoaded", () => {
  renderProductDetail();

  const backButton = document.getElementById("back-button");
  if (backButton) {
    backButton.addEventListener("click", () => {
      window.history.back();
    });
  }
});
