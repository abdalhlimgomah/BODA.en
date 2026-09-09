
```css
:root {
  --cart-bg: #f5f6fa;
  --cart-text: #1a1a2e;
  --cart-border: #e8ecf3;
  --cart-brand: #3866df;
  --cart-brand-dark: #2b4db2;
  --cart-success: #16a34a;
  --cart-danger: #dc2626;
  --cart-shadow: 0 1px 4px rgba(0,0,0,0.06);
  --cart-radius: 14px;
  /* ... more as needed ... */
}
```


```css
.cart-item {
  display: flex;
  gap: 1rem;
  background: var(--cart-surface);
  border: 1px solid var(--cart-border);
  border-radius: var(--cart-radius);
  padding: 1rem;
}
.cart-item__name {
  font-size: 1rem;
  font-weight: 600;
}
.cart-item__price {
  font-weight: 800;
  color: var(--cart-price);
}
.cart-item__old-price {
  text-decoration: line-through;
  color: var(--cart-muted);
}
```



```css
/* Mobile (default): single-column cart */
.cart-layout { display: flex; flex-direction: column; gap: 1rem; }
.cart-sticky { display: flex; /* fixed bottom bar visible on mobile */ }

/* Tablet */
@media (min-width: 768px) {
  .cart-item { padding: 1.5rem; }
  .cart-summary { padding: 2rem; }
  /* etc. */
}

/* Desktop */
@media (min-width: 1024px) {
  .cart-layout { display: grid; grid-template-columns: 1fr 380px; }
  .cart-sticky { display: none; } /* hide mobile bar on desktop */
  .cart-side-col { position: sticky; top: 80px; } 
}
```

This approach ensures the layout “responds to device capabilities”. We must include `<meta name="viewport" content="width=device-width,initial-scale=1">` in HTML (standard RWD practice). 

### Scroll-Snap Carousel Styling  
For the horizontal product carousels (e.g. “You may also like”), we use a **scroll-snap** container. Example CSS:

```css
.carousel-viewport {
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
}
.carousel-track {
  display: flex;
  gap: 1rem;
}
.carousel-item {
  flex: 0 0 185px; /* fixed width at small screens */
  scroll-snap-align: start;
}
@media (min-width: 768px) {
  .carousel-item { flex: 0 0 192px; }
}
@media (min-width: 1024px) {
  .carousel-item { flex: 0 0 210px; }
}
```


```css
:root {
  --cart-bg: #f5f6fa;
  --cart-text: #1a1a2e;
  --cart-surface: #ffffff;
  --cart-border: #e8ecf3;
  --cart-brand: #3866df;
  --cart-success: #16a34a;
  --cart-danger: #dc2626;
  --cart-radius: 14px;
  --cart-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

/* Base Layout */
body.cart-page {
  margin: 0;
  background: var(--cart-bg);
  color: var(--cart-text);
  font-family: 'Cairo', sans-serif;
}

.cart-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

/* Cart Item (Product Row) */
.cart-item {
  display: flex;
  gap: 1rem;
  background: var(--cart-surface);
  border: 1px solid var(--cart-border);
  border-radius: var(--cart-radius);
  padding: 1rem;
}
.cart-item__imgwrap {
  flex: 0 0 120px;
}
.cart-item__img {
  width: 100%;
  height: auto;
}
.cart-item__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0; /* prevents overflow in flex */
}
.cart-item__name {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.2;
  /* clamp to 2 lines */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cart-item__price {
  font-size: 1rem;
  font-weight: 800;
  color: var(--cart-text);
}
.cart-item__old-price {
  font-size: 0.85rem;
  color: var(--cart-border);
  text-decoration: line-through;
}
.cart-item__discount {
  background: #fef2f2;
  color: var(--cart-danger);
  padding: 0 4px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.75rem;
}

/* Quantity Controls */
.cart-qty {
  display: inline-flex;
  border: 1px solid var(--cart-border);
  border-radius: 4px;
}
.cart-qty-btn {
  width: 32px;
  background: transparent;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
}
.cart-qty-val {
  padding: 0 8px;
  text-align: center;
  width: 32px;
}

/* Summary Panel */
.cart-summary {
  background: var(--cart-surface);
  border-radius: var(--cart-radius);
  padding: 1.5rem;
  box-shadow: var(--cart-shadow);
}
.cart-summary h3 {
  margin-top: 0;
  font-size: 1.1rem;
  font-weight: 700;
}
.cart-summary-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
}

/* Responsive */
@media (min-width: 768px) {
  .cart-layout { padding: 2rem; }
  .cart-item { padding: 1.5rem; }
}
@media (min-width: 1024px) {
  .cart-layout {
    display: grid;
    grid-template-columns: 1fr 350px;
  }
  .cart-sticky { display: none; }
}
```
