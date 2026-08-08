# Buda V2 — Migration Record

> تتبع ما تم استبداله وما بقي من المشروع القديم.

---

## المرحلة 1: Design System (مكتمل ✅)

### ملفات جديدة تم إنشاؤها
| الملف | النوع | الوصف |
|---|---|---|
| `assets/design-system/version.json` | Meta | إصدار النظام v2.0.0 |
| `assets/design-system/index.css` | Entry | ملف الاستيراد الرئيسي |
| `assets/design-system/animations.css` | Animations | Keyframes (GPU only) |
| `assets/design-system/utilities.css` | Utilities | Helper classes |
| `assets/design-system/design-rules.md` | Docs | قواعد التصميم المرجعية |
| `assets/design-system/migration.md` | Docs | سجل الهجرة (هذا الملف) |

### Tokens (10 ملفات)
| الملف | يستبدل |
|---|---|
| `tokens/colors.css` | ألوان `design-system.css` + `noon-theme.css` |
| `tokens/spacing.css` | مسافات عشوائية في كل الملفات |
| `tokens/typography.css` | خطوط `cairo.css` + `inter.css` + inline fonts |
| `tokens/radius.css` | border-radius عشوائية في كل مكان |
| `tokens/shadows.css` | box-shadow مباشرة في الملفات |
| `tokens/elevation.css` | z-index عشوائية |
| `tokens/motion.css` | transition/animation مباشرة |
| `tokens/border.css` | border مباشرة |
| `tokens/opacity.css` | opacity عشوائية |
| `tokens/container.css` | max-width/breakpoints متفرقة |

### Components (29 ملف)
| الملف | يستبدل |
|---|---|
| `components/button.css` | أزرار في `noon-components.css` |
| `components/input.css` | حقول في `noon-components.css` |
| `components/card.css` | بطاقات في `noon-components.css` |
| `components/product-card.css` | بطاقات في `home.css` + `product-listing.css` |
| `components/badge.css` | شارات متفرقة |
| `components/chip.css` | جديد |
| `components/modal.css` | modals في `noon-shell.css` |
| `components/drawer.css` | drawers في `noon-shell.css` |
| `components/bottom-sheet.css` | sheets في `cart.css` |
| `components/toast.css` | جديد |
| `components/snackbar.css` | جديد |
| `components/dropdown.css` | dropdowns متفرقة |
| `components/accordion.css` | جديد |
| `components/tabs.css` | tabs في `product-detail.css` |
| `components/pagination.css` | pagination في `product-listing.css` |
| `components/breadcrumb.css` | breadcrumb في `product-listing.css` |
| `components/search-box.css` | بحث في `noon-shell.css` |
| `components/rating.css` | تقييم في `noon-components.css` |
| `components/qty-selector.css` | كمية في `product-detail.css` + `cart.css` |
| `components/switch.css` | جديد |
| `components/checkbox.css` | جديد |
| `components/radio.css` | جديد |
| `components/tooltip.css` | جديد |
| `components/skeleton.css` | skeletons متفرقة |
| `components/avatar.css` | جديد |
| `components/tag.css` | جديد |
| `components/icon.css` | جديد |
| `components/empty-state.css` | شاشات فارغة بسيطة |
| `components/error-state.css` | جديد |

### Layouts (4 ملفات)
| الملف | يستبدل |
|---|---|
| `layouts/header.css` | header في `noon-shell.css` |
| `layouts/footer.css` | footer في `noon-shell.css` + `home.css` |
| `layouts/sidebar.css` | sidebar في `noon-shell.css` |
| `layouts/grids.css` | grids متفرقة في كل الملفات |

---

## المرحلة 2: Shell Migration (مكتمل ✅)

- تم استبدال `assets/css/noon-shell.css` بالكامل بمتغيرات Design System الجديدة.
- تم حقن أيقونات Lucide SVG في `assets/js/noon-shell.js` بدلاً من Material Icons، دون المساس بأي Logic.

---

## الملفات القديمة التي سيتم استبدالها بالكامل

| الملف القديم | الحالة | ملاحظات |
|---|---|---|
| `assets/css/design-system.css` | ⏳ سيُستبدل | يصبح entry point يستورد من design-system/ |
| `assets/css/noon-theme.css` | ⏳ سيُستبدل | مدمج في colors.css |
| `assets/css/noon-shell.css` | ✅ اكتمل | أعيد بناؤه باستخدام Design Tokens |
| `assets/css/noon-components.css` | ⏳ سيُستبدل | مدمج في components/ |
| `assets/css/home.css` | ⏳ سيُستبدل | يعاد بناؤه بالكامل |
| `assets/css/product-detail.css` | ⏳ سيُستبدل | يعاد بناؤه |
| `assets/css/cart.css` | ⏳ سيُستبدل | يعاد بناؤه |
| `assets/css/checkout.css` | ⏳ سيُستبدل | يعاد بناؤه |
| `assets/css/product-listing.css` | ⏳ سيُستبدل | يعاد بناؤه |
| `assets/css/desktop.css` | ⏳ سيُستبدل | مدمج في responsive |
| `assets/css/desktop-animations.css` | ⏳ سيُستبدل | مدمج في animations.css |

---

## ملفات لن تُمس أبداً

| الملف | السبب |
|---|---|
| `assets/js/supabase-client.js` | Business Logic |
| `assets/js/store.js` | Business Logic |
| `assets/js/cart.js` | Cart Logic |
| `assets/js/checkout.js` | Checkout Logic |
| `assets/js/search.js` | Search Logic |
| `assets/js/wishlist.js` | Wishlist Logic |
| `assets/js/pricing-engine.js` | Pricing Logic |
| `assets/js/taager-integration.js` | Integration |
| `assets/js/shipping-zones.js` | Business Logic |
| `assets/js/orders-common.js` | Business Logic |
