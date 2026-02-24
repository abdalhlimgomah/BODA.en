// Data
const buttons = ['all', 'phones', 'watches', 'keyboards', 'headphones'];

const products = [
  {
    id: 1,
    category: 'phones',
    title: 'iPhone 15 Pro',
    description:
      'Latest iPhone with A17 Pro chip, 48MP camera system, and titanium design.',
    price: '$999',
    img: 'https://i.ibb.co.com/BKQBTWZn/iphone-phone.png',
  },
  {
    id: 2,
    category: 'headphones',
    title: 'AirPods Max',
    description:
      'Premium over-ear headphones with spatial audio and active noise cancellation.',
    price: '$549',
    img: 'https://i.ibb.co.com/DfdJdKvc/apple-headphone.png',
  },
  {
    id: 3,
    category: 'watches',
    title: 'Apple Watch Series 9',
    description:
      'Advanced health monitoring, always-on display, and seamless iPhone integration.',
    price: '$399',
    img: 'https://i.ibb.co.com/CGCPNcr/apple-watch.png',
  },
  {
    id: 4,
    category: 'keyboards',
    title: 'Mechanical Pro X',
    description:
      'RGB backlit mechanical keyboard with Cherry MX switches and programmable keys.',
    price: '$159',
    img: 'https://i.ibb.co.com/4RS1JgdG/pro-x-keyboard.png',
  },
  {
    id: 5,
    category: 'watches',
    title: 'Samsung Galaxy Watch',
    description:
      'Comprehensive fitness tracking, long battery life, and premium build quality.',
    price: '$329',
    img: 'https://i.ibb.co.com/3m35Bx7W/samsung-watch.png',
  },
  {
    id: 6,
    category: 'phones',
    title: 'Samsung Galaxy S24',
    description:
      'Flagship Android phone with AI features, 200MP camera, and S Pen support.',
    price: '$899',
    img: 'https://i.ibb.co.com/6RDZnMyd/galaxy-phone.png',
  },
  {
    id: 7,
    category: 'keyboards',
    title: 'Wireless Elite',
    description:
      'Ultra-slim wireless keyboard with excellent battery life and quiet typing.',
    price: '$89',
    img: 'https://i.ibb.co.com/kgyXR04T/wireless-keyboard.png',
  },

  {
    id: 8,
    category: 'headphones',
    title: 'Sony WH-1000XM5',
    description:
      'Industry-leading noise cancellation with exceptional sound quality and comfort.',
    price: '$399',
    img: 'https://i.ibb.co.com/4wRvb6fV/sony-headphone.png',
  },
  {
    id: 9,
    category: 'phones',
    title: 'Google Pixel 8',
    description:
      'Pure Android experience with exceptional camera AI and real-time translation.',
    price: '$699',
    img: 'https://i.ibb.co.com/Cs8MryY2/pixel-phone.png',
  },
  {
    id: 10,
    category: 'keyboards',
    title: 'Gaming Beast RGB',
    description:
      'Professional gaming keyboard with optical switches and customizable RGB lighting.',
    price: '$199',
    img: 'https://i.ibb.co.com/MyXW1jqq/gaming-keyboard.png',
  },
];

// DOM elements
const filterContainer = document.getElementById('filterContainer');
const productsGrid = document.getElementById('productsGrid');

// Only run if on products.html (has the required DOM elements)
if (!filterContainer || !productsGrid) {
  console.log('ℹ️ Products page DOM elements not found. Skipping products page initialization.');
  console.log('📦 products array is available for other pages if needed.');
} else {

// Render buttons
const renderButtons = () => {
  filterContainer.innerHTML = buttons
    .map(
      (button, inx) =>
        `
    <button class="filter-btn ${
      inx === 0 && 'active'
    }" data-filter="${button}">${button}</button>
    `
    )
    .join('');
};

// Render products
const renderProducts = (productsToShow) => {
  productsGrid.innerHTML = productsToShow
    .map(
      (product) => {
        // Support both main.js format and store.js format
        const title = product.title || product.name || 'Unknown Product';
        const description = product.description || '';
        
        // Handle image path - use BODAStore.getImagePath for store products
        let imageSrc = product.img || product.image || '';
        if (product.image && window.BODAStore && window.BODAStore.getImagePath) {
          try {
            imageSrc = window.BODAStore.getImagePath(product.image);
          } catch (e) {
            console.warn('Could not get image path:', e);
          }
        }
        
        const priceStr = typeof product.price === 'string' ? product.price : '$' + product.price;
        const category = product.category || 'general';
        const productId = product.id;
        
        return `
        <div class="product-card show" data-category="${category}" data-product-id="${productId}">
          <div class="product-image">
            <img src="${imageSrc}" alt="${title}" class="product-img" />
            <button class="wishlist-btn"><i class="${
              product.id === 2 ? 'fa-solid' : 'fa-regular'
            } fa-heart"></i></button>
          </div>

          <div class="product-info">
            <span class="category">${category}</span>
            <h3 class="title">${title}</h3>
            <p class="description">
              ${description}
            </p>
            <p class="price">${priceStr}</p>
            <div class="actions">
              <button class="btn shop-now-btn" data-product-id="${productId}">shop now</button>
              <button class="rounded-btn cart-btn" data-product-id="${productId}">
                <i class="fa-solid fa-cart-shopping"></i>
              </button>
            </div>
          </div>
        </div>
        `;
      }
    )
    .join('');
    
  // Add event listeners to shop now buttons
  document.querySelectorAll('.shop-now-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const productId = button.getAttribute('data-product-id');
      console.log('🛍️ Shop now clicked for product:', productId);
      window.location.href = `product.html?id=${productId}`;
    });
  });
  
  // Add event listeners to product images
  document.querySelectorAll('.product-img').forEach((img) => {
    img.addEventListener('click', (e) => {
      const productId = e.target.closest('[data-product-id]').getAttribute('data-product-id');
      console.log('🖼️ Product image clicked:', productId);
      window.location.href = `product.html?id=${productId}`;
    });
    img.style.cursor = 'pointer';
  });
  
  // Add event listeners to cart buttons
  document.querySelectorAll('.cart-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const productId = button.getAttribute('data-product-id');
      console.log('🛒 Add to cart clicked for product:', productId);
      // Add to cart logic here if needed
      alert('تمت إضافة المنتج للسلة!');
    });
  });
  
  // Add event listeners to wishlist buttons
  document.querySelectorAll('.wishlist-btn').forEach((button) => {
    button.addEventListener('click', () => {
      button.classList.toggle('active');
      const icon = button.querySelector('i');
      if (button.classList.contains('active')) {
        icon.classList.remove('fa-regular');
        icon.classList.add('fa-solid');
      } else {
        icon.classList.add('fa-regular');
        icon.classList.remove('fa-solid');
      }
    });
  });
};

// Filter products
const filterProducts = (category) => {
  const productCards = document.querySelectorAll('.product-card');

  // Hide all product cards first
  productCards.forEach((card) => {
    card.classList.add('hidden');
    card.classList.remove('show');
  });

  // Show filtered products
  setTimeout(() => {
    if (category === 'all') {
      // Show all products from main.js + products from store.js
      let allProducts = [...products];
      
      // Add products from BODAStore if available
      try {
        if (window.BODAStore && window.BODAStore.getAllProducts) {
          const storeProducts = Object.values(window.BODAStore.getAllProducts());
          allProducts = allProducts.concat(storeProducts);
          console.log('✅ Added ' + storeProducts.length + ' products from BODA Store');
        }
      } catch (e) {
        console.warn('⚠️ Could not load BODA Store products:', e);
      }
      
      renderProducts(allProducts);
    } else {
      const filteredProducts = products.filter(
        (product) => product.category === category
      );
      renderProducts(filteredProducts);
    }
  }, 500);
};

// Event listener for filter buttons
const filterEventListener = () => {
  const filterButtons = document.querySelectorAll('.filter-btn');

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      // Remove active class
      filterButtons.forEach((btn) => btn.classList.remove('active'));

      // Add active class to clicked button
      button.classList.add('active');

      // Filter products
      const filterValue = button.getAttribute('data-filter');
      filterProducts(filterValue);
    });
  });
};

// Initiate the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  renderButtons();
  
  // Initial render: Show all products from main.js + store.js
  let initialProducts = [...products];
  try {
    if (window.BODAStore && window.BODAStore.getAllProducts) {
      const storeProducts = Object.values(window.BODAStore.getAllProducts());
      initialProducts = initialProducts.concat(storeProducts);
      console.log('✅ Loaded ' + storeProducts.length + ' products from BODA Store');
    }
  } catch (e) {
    console.warn('⚠️ Could not load BODA Store products:', e);
  }
  
  renderProducts(initialProducts);
  filterEventListener();
});
}
