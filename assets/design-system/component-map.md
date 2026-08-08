# Buda V2 — Component Inventory Map

> جرد إجباري لجميع مكونات الواجهة قبل إعادة البناء. لا تُعدل أي صفحة قبل اكتمال هذا الجرد.

---

## المكونات والصفحات المستخدم بها

| المكون | الصفحات الحالية | المكون الجديد | JS IDs المحفوظة | Events |
|---|---|---|---|---|
| Header | جميع الصفحات | `buda-header` | `menu-toggle`, `home-search`, `search-input`, `budaLocationTrigger`, `deliver-to-text`, `budaLangTrigger`, `budaAccountTrigger`, `budaAccountName`, `budaAccountDropdown`, `budaCartBadge`, `budaSupportBtn` | click, submit, input, focus, blur, keydown |
| Search Box | Header + search.html | `buda-search-box` | `home-search`, `search-input`, `budaSearchDropdown`, `budaSearchRecent`, `budaSearchRecentItems`, `budaSearchSuggestions`, `budaSearchSuggestionItems`, `budaClearRecent` | input, focus, blur, submit, keydown |
| Sidebar | جميع الصفحات (mobile) | `buda-sidebar` | `noon-sidebar`, `menu-toggle` | click (toggle, close) |
| Bottom Nav | جميع الصفحات (mobile) | layout in noon-shell | `bottom-nav`, `nav-home-btn`, `nav-cart-count` | click |
| Footer | جميع الصفحات | `buda-footer` | `hm-footer` | — |
| Product Card | home, listing, search, wishlist, cart | `buda-product-card` | dynamic IDs from JS | click (add cart, wishlist), mouseenter/leave |
| Hero Slider | home | home.js render | `hm-content`, `hm-skeleton` | touch, swipe, click (dots/arrows) |
| Category Card | home | home.js render | — | click (navigate) |
| Mega Menu | Header dropdown | `buda-mega-menu` | — | mouseenter, mouseleave, click |
| Account Dropdown | Header | `buda-header__account-dropdown` | `budaAccountDropdown`, `budaAccountTrigger` | click (toggle) |
| Cart Badge | Header | `buda-header__badge` | `budaCartBadge`, `nav-cart-count` | — (updated by cart.js) |
| Location Modal | Header | `buda-modal` | `budaLocationModal`, `budaAddressList` | click (open, select, close) |
| Support Drawer | Header/Account | `buda-drawer` | `support-drawer`, `support-messages`, `support-input`, `budaSupportBtn` | click (open, send) |
| Gallery | product.html | pdp scope | `pdp-lightbox`, `data-pdp-gallery` | click, touch, zoom |
| PDP Buybox | product.html | pdp scope | `data-pdp-info`, `data-pdp-price`, `data-pdp-delivery`, `data-pdp-seller` | — |
| PDP CTA | product.html | `buda-btn` | `pdp-add-cart-btn`, `pdp-wish-btn-desktop`, `data-qty-action`, `data-qty-value` | click |
| PDP Tabs | product.html | `buda-tabs` | `data-tab="overview"`, `data-tab="specs"`, `pdp-panel-overview`, `pdp-panel-specs` | click |
| PDP Sticky Bar | product.html (mobile) | pdp scope | `data-pdp-sticky`, `pdp-sticky-add-btn`, `pdp-sticky-wish-btn` | click, scroll |
| Cart Items | empty-cart.html | `buda-card` | `cart-items`, `cart-items-container`, `cart-skeleton`, `cart-empty-state`, `cart-content` | — (rendered by cart.js) |
| Cart Summary | empty-cart.html | `buda-card` | `cart-sidebar`, `s-items-label`, `s-subtotal`, `s-savings`, `s-shipping`, `s-tax`, `s-grand-total`, `s-discount-row` | — |
| Checkout Btn | cart/checkout | `buda-btn` | `checkout-btn`, `checkout-btn-mobile`, `ch-confirm-btn`, `ch-confirm-mobile` | click |
| Coupon | cart/checkout | `buda-input` + `buda-btn` | `coupon-input`, `coupon-apply-btn`, `coupon-status`, `coupon-applied`, `coupon-remove-btn`, `ch-coupon-input`, `ch-coupon-apply`, `ch-coupon-status` | click, input |
| Cart Sheet | cart (mobile) | `buda-bottom-sheet` | `cart-sheet`, `cart-sheet-overlay`, `cart-sheet-product`, `cart-sheet-count`, `cart-sheet-continue`, `cart-sheet-goto` | click |
| Address Card | checkout | `buda-card` | `ch-address-card`, `ch-address-btn`, `ch-address-tag`, `ch-address-text`, `ch-address-form`, `ch-address` | click |
| Receiver Card | checkout | `buda-card` | `ch-receiver-display`, `ch-receiver-form`, `ch-receiver-btn`, `ch-receiver-name`, `ch-receiver-phone`, `ch-name`, `ch-phone`, `ch-email` | click, input |
| Gov Selector | checkout | `buda-dropdown` | `ch-gov-card`, `ch-gov-selector`, `ch-governorate`, `ch-gov-input`, `ch-gov-display` | click, change |
| Payment Options | checkout | radio in `buda-card` | `ch-payment-options`, `data-payment="cod"` | click (selectPayment) |
| Checkout Summary | checkout | `buda-card` | `ch-items-count`, `ch-subtotal`, `ch-discount-row`, `ch-discount`, `ch-shipping`, `ch-tax`, `ch-grand-total`, `ch-status` | — |
| Wishlist Grid | wishlist.html | `buda-product-grid` | `wishlist-grid`, `wishlist-count`, `wishlist-status`, `wishlist-empty`, `wishlist-total` | click (addAllToCart, clearWishlist) |
| Filter Sidebar | product-listing | `buda-sidebar` variant | `plSidebar`, `plFilterToggle`, `plFilterCount`, `plSidebarClose`, `plSearchInput`, `plPriceMin`, `plPriceMax`, `plPriceApply`, `plFilterCategories`, `plFilterBrands`, `plAvailOnly`, `plClearAll` | click, input, change |
| Listing Grid | product-listing | `buda-product-grid` | `plGrid`, `plLoading`, `plEmpty`, `plEmptyClear`, `plPagination`, `plResultsCount`, `plSortSelect`, `plBreadcrumb`, `plBreadcrumbCurrent` | click, change |
| Profile Card | ahsab.html | `buda-card` | `profile-avatar`, `profile-name`, `profile-email` | — |
| Qty Selector | product, cart | `buda-qty` | `data-qty-action="dec"`, `data-qty-action="inc"`, `data-qty-value` | click |
| Rating Stars | product, cards | `buda-rating` | `pdp-stars`, `pdp-rating-link` | click |
| Breadcrumb | listing | `buda-breadcrumb` | `plBreadcrumb`, `plBreadcrumbCurrent` | — |
| Skeleton | all pages | `buda-skeleton` | `hm-skeleton`, `cart-skeleton`, `skHeaderOverlay`, `skBottomNavOverlay` | — |

---

## ملاحظات حرجة

1. **جميع IDs أعلاه يجب أن تبقى كما هي بدون أي تغيير في HTML الجديد**
2. **جميع data-* attributes يجب الحفاظ عليها** (مثل `data-pdp-scope`, `data-pdp-gallery`, `data-tab`, `data-qty-action`, `data-payment`)
3. **جميع Events المرتبطة بالـ JS يجب أن تستمر بالعمل** (click, input, submit, change, focus, blur, keydown, mouseenter, mouseleave, touchstart, touchmove, scroll)
