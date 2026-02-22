const renderHomeProducts = (filter = "") => {
  const container = document.getElementById("home-products");
  if (!container || !window.BODAStore) return;

  const products = Object.values(BODAStore.getAllProducts());
  const query = filter.trim().toLowerCase();
  const filtered = query
    ? products.filter((product) => product.name.toLowerCase().includes(query))
    : products;

  container.innerHTML = filtered
    .map((product) => {
      const discount = product.originalPrice && product.originalPrice > product.price;
      const imageSrc = BODAStore.getImagePath(product.image);
      return `
      <div class="min-w-[160px] w-[160px] bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-3 flex flex-col relative">
        ${
          discount
            ? `<span class="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded">-${Math.round(
                ((product.originalPrice - product.price) / product.originalPrice) * 100
              )}%</span>`
            : ""
        }
        <button class="absolute top-2 right-2 text-slate-300 hover:text-red-500" data-wishlist="${product.id}">
          <span class="material-icons-outlined text-lg">favorite_border</span>
        </button>
        <button class="h-32 w-full flex items-center justify-center mb-2 bg-slate-50 dark:bg-slate-800 rounded-lg" data-view-product="${product.id}">
          <img alt="${product.name}" class="h-24 w-auto object-contain mix-blend-multiply dark:mix-blend-normal" src="${imageSrc}"/>
        </button>
        <div class="flex-1">
          <h4 class="text-sm text-slate-700 dark:text-slate-200 line-clamp-2 mb-1">${product.name}</h4>
          <div class="flex items-baseline gap-2 mb-2">
            <span class="text-sm font-bold text-slate-900 dark:text-white">${product.price} AED</span>
            ${
              discount
                ? `<span class="text-xs text-slate-400 line-through">${product.originalPrice} AED</span>`
                : ""
            }
          </div>
        </div>
        <button class="w-full bg-secondary dark:bg-primary text-white text-xs font-semibold py-1.5 rounded-lg hover:opacity-90 transition" data-add-to-cart="${product.id}">
          Add to Cart
        </button>
      </div>`;
    })
    .join("");

  container.querySelectorAll("[data-add-to-cart]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.getAttribute("data-add-to-cart");
      const product = BODAStore.getProductById(productId);
      if (product) {
        BODAStore.addToCart(product, 1);
      }
    });
  });

  container.querySelectorAll("[data-view-product]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.getAttribute("data-view-product");
      window.location.href = `product-detail.html?id=${productId}`;
    });
  });

  container.querySelectorAll("[data-wishlist]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.getAttribute("data-wishlist");
      BODAStore.toggleWishlist(productId);
    });
  });
};

document.addEventListener("DOMContentLoaded", () => {
  renderHomeProducts();
  BODAStore.updateCartCount();

  const searchInput = document.getElementById("home-search");
  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      renderHomeProducts(event.target.value || "");
    });
  }
});
