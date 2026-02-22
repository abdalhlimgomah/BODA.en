const productsDatabase = {
  "shirt-001": {
    id: "shirt-001",
    name: "قميص رجالي كلاسيكي",
    category: "ملابس وأحذية",
    price: 89.99,
    originalPrice: 129.99,
    rating: 4.5,
    reviewCount: 145,
    image: "assets/images/0950a0e8-7f10-4804-98a9-62039206aa80.jpg",
    images: ["assets/images/0950a0e8-7f10-4804-98a9-62039206aa80.jpg"],
    description: "قميص رجالي فاخر مصنوع من القطن الطبيعي 100% بجودة عالية. يتميز بتصميم كلاسيكي أنيق يناسب جميع المناسبات."
  },
  "jeans-001": {
    id: "jeans-001",
    name: "بنطال جينز رجالي",
    category: "ملابس وأحذية",
    price: 149.99,
    originalPrice: 199.99,
    rating: 4.3,
    reviewCount: 98,
    image: "assets/images/b666b5e1-4df9-4c22-9ef8-ce04ccd627.jpg",
    images: ["assets/images/b666b5e1-4df9-4c22-9ef8-ce04ccd627.jpg"],
    description: "بنطال جينز عصري بأسلوب كاجوال مريح. مصنوع من الجينز الكثيف الذي يدوم طويلاً."
  },
  "phone-001": {
    id: "phone-001",
    name: "هاتف ذكي 5G",
    category: "إلكترونيات",
    price: 799.99,
    originalPrice: 999.99,
    rating: 4.7,
    reviewCount: 523,
    image: "assets/images/cdd9565a-22a5-49f9-903a-ec55a93d54fa.jpg",
    images: ["assets/images/cdd9565a-22a5-49f9-903a-ec55a93d54fa.jpg"],
    description: "هاتف ذكي حديث بتقنية 5G سريعة. شاشة OLED بدقة عالية وكاميرا احترافية."
  },
  "laptop-001": {
    id: "laptop-001",
    name: "لابتوب احترافي",
    category: "إلكترونيات",
    price: 1299.99,
    originalPrice: 1599.99,
    rating: 4.8,
    reviewCount: 412,
    image: "assets/images/4c84d7a6-8257-473a-846c-ef2d58c30b2f.jpg",
    images: ["assets/images/4c84d7a6-8257-473a-846c-ef2d58c30b2f.jpg"],
    description: "لابتوب احترافي خفيف وقوي. مصمم للعمل والإنتاجية العالية."
  },
  "camera-001": {
    id: "camera-001",
    name: "كاميرا ديجيتال احترافية",
    category: "إلكترونيات",
    price: 899.99,
    originalPrice: 1199.99,
    rating: 4.6,
    reviewCount: 287,
    image: "assets/images/32618787-22d7-46e5-9f80-423e2b39f8a7.jpg",
    images: ["assets/images/32618787-22d7-46e5-9f80-423e2b39f8a7.jpg"],
    description: "كاميرا ديجيتال احترافية لالتقاط الصور والفيديوهات بدقة عالية."
  },
  "skincare-001": {
    id: "skincare-001",
    name: "مجموعة العناية بالبشرة",
    category: "جمال وعناية",
    price: 59.99,
    originalPrice: 89.99,
    rating: 4.4,
    reviewCount: 178,
    image: "assets/images/5f1a3ca3-36b5-49f8-aa46-fe4d0a45c7fb.jpg",
    images: ["assets/images/5f1a3ca3-36b5-49f8-aa46-fe4d0a45c7fb.jpg"],
    description: "مجموعة شاملة للعناية بالبشرة تضم منتجات طبيعية للترطيب والتنعيم."
  },
  "perfume-001": {
    id: "perfume-001",
    name: "عطر فاخر",
    category: "جمال وعناية",
    price: 79.99,
    originalPrice: 119.99,
    rating: 4.7,
    reviewCount: 234,
    image: "assets/images/e3ce92e4-aaeb-4d95-ac7c-3c4fffa74128..jpg",
    images: ["assets/images/e3ce92e4-aaeb-4d95-ac7c-3c4fffa74128..jpg"],
    description: "عطر فاخر برائحة ساحرة وطويلة الأمد. مزيج متوازن من الروائح الراقية."
  },
  "makeup-001": {
    id: "makeup-001",
    name: "مجموعة مستحضرات التجميل",
    category: "جمال وعناية",
    price: 49.99,
    originalPrice: 74.99,
    rating: 4.5,
    reviewCount: 312,
    image: "assets/images/7d7a0e08-5ebb-44ff-9b3c-286cc7a779ba.jpg",
    images: ["assets/images/7d7a0e08-5ebb-44ff-9b3c-286cc7a779ba.jpg"],
    description: "مجموعة شاملة من مستحضرات التجميل مثالية للاستخدام اليومي والمناسبات."
  },
  "shoes-001": {
    id: "shoes-001",
    name: "حذاء رياضي احترافي",
    category: "رياضة وترفيه",
    price: 129.99,
    originalPrice: 179.99,
    rating: 4.6,
    reviewCount: 267,
    image: "assets/images/1f2269e3-3b3c-4c33-9bfe-606c60be3058.jpg",
    images: ["assets/images/1f2269e3-3b3c-4c33-9bfe-606c60be3058.jpg"],
    description: "حذاء رياضي احترافي بتقنية تقليل الصدمات للراحة والدعم أثناء الجري."
  },
  "dumbbells-001": {
    id: "dumbbells-001",
    name: "مجموعة أوزان تمرين",
    category: "رياضة وترفيه",
    price: 89.99,
    originalPrice: 129.99,
    rating: 4.5,
    reviewCount: 145,
    image: "assets/images/def93bdc-ec4d-4423-b7fe-5a61d3f38e99.jpg",
    images: ["assets/images/def93bdc-ec4d-4423-b7fe-5a61d3f38e99.jpg"],
    description: "مجموعة أوزان تمرين احترافية مثالية للتمارين المنزلية والجيم."
  },
  "pillow-001": {
    id: "pillow-001",
    name: "وسادة شاطئ فاخرة",
    category: "منزل ومطبخ",
    price: 39.99,
    originalPrice: 59.99,
    rating: 4.4,
    reviewCount: 89,
    image: "assets/images/40acd78f-ff3c-4e91-9861-32406a7a6633.jpg",
    images: ["assets/images/40acd78f-ff3c-4e91-9861-32406a7a6633.jpg"],
    description: "وسادة شاطئ فاخرة توفر راحة قصوى ودعم للعنق والرأس."
  }
};

const getPagePrefix = () => (window.location.pathname.includes("/pages/") ? "../" : "");

const getImagePath = (path) => {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  return `${getPagePrefix()}${path}`;
};

const getAllProducts = () => {
  let all = { ...productsDatabase };

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (
      key === "boda_all_products" ||
      key.startsWith("seller_products_") ||
      key.startsWith("partner_products_")
    ) {
      try {
        const sellerProducts = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(sellerProducts)) {
          sellerProducts.forEach((product) => {
            if (!all[product.id]) {
              let sellerEmail = product.sellerEmail || product.seller_email || product.seller;
              if (!sellerEmail && key.startsWith("seller_products_")) {
                sellerEmail = key.replace("seller_products_", "");
              }
              all[product.id] = {
                id: product.id,
                name: product.productName || product.name,
                category: product.category,
                price: parseFloat(product.price),
                originalPrice: parseFloat(product.discountPrice || product.originalPrice || product.price),
                discountPrice: product.discountPrice ? parseFloat(product.discountPrice) : null,
                rating: parseFloat(product.rating || 0),
                reviewCount: parseInt(product.reviewCount || 0, 10),
                image: product.image || (product.images && product.images[0]) || "assets/images/placeholder.jpg",
                images: product.images || [product.image] || [],
                description: product.description || "لا يوجد وصف متاح لهذا المنتج.",
                reviews: product.reviews || [],
                stockStatus: product.stockStatus || "in_stock",
                stock: product.stock || 0,
                seller: product.seller || (sellerEmail ? sellerEmail.split("@")[0] : "boda"),
                seller_email: sellerEmail || "boda@platform.com",
                sellerEmail: sellerEmail || "boda@platform.com"
              };
            }
          });
        }
      } catch (error) {
        console.error("Error loading products:", error);
      }
    }
  }

  return all;
};

const getProductById = (id) => {
  const all = getAllProducts();
  return all[id] || null;
};

const getCartKey = () => {
  const userEmail = localStorage.getItem("userEmail");
  return userEmail ? `cart_${userEmail}` : "cart";
};

const getWishlistKey = () => {
  const userEmail = localStorage.getItem("userEmail");
  return userEmail ? `wishlist_${userEmail}` : "wishlist";
};

const getCart = () => {
  const cart = localStorage.getItem(getCartKey());
  return cart ? JSON.parse(cart) : [];
};

const saveCart = (cart) => {
  localStorage.setItem(getCartKey(), JSON.stringify(cart));
  updateCartCount();
};

const getWishlist = () => {
  const wishlist = localStorage.getItem(getWishlistKey());
  return wishlist ? JSON.parse(wishlist) : [];
};

const saveWishlist = (wishlist) => {
  localStorage.setItem(getWishlistKey(), JSON.stringify(wishlist));
};

const updateCartCount = () => {
  const cart = getCart();
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  const cartCountElement = document.getElementById("cart-count");
  if (cartCountElement) {
    cartCountElement.textContent = count;
  }
  const navCartCount = document.getElementById("nav-cart-count");
  if (navCartCount) {
    navCartCount.textContent = count;
    if (count > 0) {
      navCartCount.classList.remove("nav-cart-0");
    } else {
      navCartCount.classList.add("nav-cart-0");
    }
  }
};

const addToCart = (product, quantity = 1) => {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  if (!isLoggedIn) {
    alert("يجب تسجيل الدخول أولاً");
    window.location.href = `${getPagePrefix()}pages/login.html`;
    return;
  }

  const cart = getCart();
  const existingItem = cart.find((item) => item.id === product.id);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity,
      image: product.image,
      category: product.category,
      description: product.description
    });
  }

  saveCart(cart);
};

const removeFromCart = (productId) => {
  const cart = getCart().filter((item) => item.id !== productId);
  saveCart(cart);
};

const updateQuantity = (productId, newQuantity) => {
  const cart = getCart();
  const item = cart.find((entry) => entry.id === productId);
  if (!item) return;
  if (newQuantity <= 0) {
    removeFromCart(productId);
    return;
  }
  item.quantity = newQuantity;
  saveCart(cart);
};

const toggleWishlist = (productId) => {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  if (!isLoggedIn) {
    alert("يجب تسجيل الدخول أولاً لإضافة المفضلة");
    window.location.href = `${getPagePrefix()}pages/login.html`;
    return;
  }

  const allProducts = getAllProducts();
  const product = allProducts[productId];
  if (!product) return;

  const wishlist = getWishlist();
  const existingIndex = wishlist.findIndex((item) => item.id === productId);
  if (existingIndex !== -1) {
    wishlist.splice(existingIndex, 1);
    saveWishlist(wishlist);
  } else {
    wishlist.push(product);
    saveWishlist(wishlist);
  }
};

window.BODAStore = {
  getImagePath,
  getAllProducts,
  getProductById,
  getCart,
  saveCart,
  addToCart,
  removeFromCart,
  updateQuantity,
  updateCartCount,
  getWishlist,
  saveWishlist,
  toggleWishlist
};
