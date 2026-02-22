const renderWishlist = () => {
  if (!window.BODAStore) return;
  const wishlist = BODAStore.getWishlist();
  const list = document.getElementById("wishlist-items");
  const emptyState = document.getElementById("wishlist-empty");

  if (wishlist.length === 0) {
    if (list) list.innerHTML = "";
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");
  if (!list) return;

  list.innerHTML = wishlist
    .map((item) => {
      const imageSrc = BODAStore.getImagePath(item.image);
      return `
      <div class="bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-3 flex flex-col">
        <button class="relative h-36 w-full bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-3" data-view="${item.id}">
          <img alt="${item.name}" class="h-24 w-auto object-contain mix-blend-multiply dark:mix-blend-normal" src="${imageSrc}"/>
        </button>
        <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 mb-2">${item.name}</h3>
        <div class="flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white mb-3">${item.price} AED</div>
        <div class="flex gap-2 mt-auto">
          <button class="flex-1 bg-secondary dark:bg-primary text-white text-xs font-semibold py-2 rounded-lg" data-add="${item.id}">Add to Cart</button>
          <button class="w-10 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-200 rounded-lg" data-remove="${item.id}">
            <span class="material-icons-outlined text-sm">delete</span>
          </button>
        </div>
      </div>`;
    })
    .join("");

  list.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.getAttribute("data-add");
      const product = BODAStore.getProductById(productId);
      if (product) {
        BODAStore.addToCart(product, 1);
      }
    });
  });

  list.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.getAttribute("data-remove");
      BODAStore.toggleWishlist(productId);
      renderWishlist();
    });
  });

  list.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.getAttribute("data-view");
      window.location.href = `product-detail.html?id=${productId}`;
    });
  });
};

document.addEventListener("DOMContentLoaded", () => {
  renderWishlist();
  if (window.BODAStore) {
    BODAStore.updateCartCount();
  }
});
