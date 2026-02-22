const renderCart = () => {
  if (!window.BODAStore) return;
  const cart = BODAStore.getCart();
  const emptyState = document.getElementById("empty-cart-state");
  const cartSection = document.getElementById("cart-items-section");
  const cartItems = document.getElementById("cart-items");
  const cartSubtotal = document.getElementById("cart-subtotal");
  const cartTotal = document.getElementById("cart-total");

  if (cart.length === 0) {
    if (emptyState) emptyState.classList.remove("hidden");
    if (cartSection) cartSection.classList.add("hidden");
    BODAStore.updateCartCount();
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");
  if (cartSection) cartSection.classList.remove("hidden");

  if (cartItems) {
    cartItems.innerHTML = cart
      .map((item) => {
        const imageSrc = BODAStore.getImagePath(item.image);
        return `
        <div class="flex gap-4 bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-3">
          <img alt="${item.name}" class="w-20 h-20 object-contain bg-slate-50 dark:bg-slate-800 rounded-xl" src="${imageSrc}"/>
          <div class="flex-1 flex flex-col">
            <div class="flex justify-between items-start gap-2">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">${item.name}</h3>
              <button class="text-slate-300 hover:text-red-500" data-remove="${item.id}">
                <span class="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
            <div class="text-xs text-slate-400 mt-1">${item.category || ""}</div>
            <div class="flex items-center justify-between mt-auto">
              <span class="text-sm font-bold text-slate-900 dark:text-white">${item.price} AED</span>
              <div class="flex items-center gap-2">
                <button class="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200" data-qty="${item.id}" data-action="decrease">-</button>
                <span class="text-sm font-semibold" data-qty-value="${item.id}">${item.quantity}</span>
                <button class="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200" data-qty="${item.id}" data-action="increase">+</button>
              </div>
            </div>
          </div>
        </div>`;
      })
      .join("");
  }

  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  if (cartSubtotal) cartSubtotal.textContent = `${subtotal.toFixed(2)} AED`;
  if (cartTotal) cartTotal.textContent = `${subtotal.toFixed(2)} AED`;

  if (cartItems) {
    cartItems.querySelectorAll("[data-remove]").forEach((button) => {
      button.addEventListener("click", () => {
        BODAStore.removeFromCart(button.getAttribute("data-remove"));
        renderCart();
      });
    });

    cartItems.querySelectorAll("[data-qty]").forEach((button) => {
      button.addEventListener("click", () => {
        const productId = button.getAttribute("data-qty");
        const action = button.getAttribute("data-action");
        const current = cart.find((entry) => entry.id === productId);
        if (!current) return;
        const nextQuantity = action === "increase" ? current.quantity + 1 : current.quantity - 1;
        BODAStore.updateQuantity(productId, nextQuantity);
        renderCart();
      });
    });
  }

  BODAStore.updateCartCount();
};

document.addEventListener("DOMContentLoaded", () => {
  renderCart();
  const startShopping = document.getElementById("start-shopping");
  if (startShopping) {
    startShopping.addEventListener("click", () => {
      window.location.href = "home.html";
    });
  }
});
