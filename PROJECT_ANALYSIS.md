# 📦 مشروع Buda - تحليل كامل (Full Project Analysis)

> **التاريخ:** 2025-07-11  
> **المسار:** `C:\Users\BODa\Documents\Date bsnas Home BODA\موقع الخاص بك`  
> **النوع:** متجر إلكتروني عربي (RTL) مع تكامل Taager و Supabase

---

## 📁 هيكل المشروع

```
موقع الخاص بك/
├── index.html                          # نقطة الدخول → redirect إلى pages/home.html
├── fix-wishlist.js                     # إصلاح wishlist
├── refresh_token_daily.bat             # تحديث توكن يومي (Windows)
├── _dir_path.txt                       # مسار محلي (تهيئة)
├── error_response.json                 # نموذج خطأ للاختبار
├── taager_refresh.log                  # سجل مزامنة تاجر
├── assets/
│   ├── css/                            # 40+ ملف CSS
│   ├── js/                             # 50+ ملف JS أساسي
│   │   └── product/                    # 16 وحدة منتج
│   ├── vendor/                         # مكتبات خارجية (Supabase, Tailwind, FontAwesome)
│   ├── fonts/                          # خطوط (Cairo, Inter, Roboto, Orbitron, Material Icons)
│   ├── images/                         # صور المنتجات والبنرات
│   └── icons/                          # Favicon, manifest
├── pages/                              # 30+ صفحة HTML
│   ├── signin/                         # تسجيل دخول (6 صفحات)
│   └── signup/                         # تسجيل (5 ملفات)
├── sql/                                # 13 ملف SQL (Schema)
├── supabase/
│   ├── config.toml                     # تكوين محلي
│   ├── migrations/                     # 17 ترحيل قاعدة بيانات
│   └── functions/                      # Edge Functions (Deno)
│       ├── taager-proxy/               # Proxy تاجر (1219 سطر) ⭐
│       └── phone-verification/         # OTP عبر Twilio
└── tmp/                                # ملفات اختبار (غير مهمة)
```

---

## ✅ الملفات المهمة والمستخدمة فعلياً

### 🎯 الصفحات الأساسية (Entry Points)

| الملف | الوصف | السكريبتات المحملة |
|--------|--------|-------------------|
| `index.html` | نقطة الدخول الوحيدة - redirect فوري | - |
| `pages/home.html` | **الصفحة الرئيسية** - هيكل كامل مع Skeleton | `noon-shell.js`, `skeleton-loader.js`, `store.js`, `pricing-engine.js`, `taager-integration.js`, `cart.js`, `supabase-js@2.js`, `supabase-client.js`, `home.js` |
| `pages/product.html` | تفاصيل المنتج - يستخدم PDP Modules | `product/*.js` |
| `pages/products.html` | المنتجات مع فلترة/ترقيم | `main.js` |
| `pages/category.html` | الفئات | `category.js` |
| `pages/checkout.html` | الدفع | `checkout.js` |
| `pages/cart.html` / `empty-cart.html` | السلة | `cart.js` |
| `pages/my-orders.html` | طلباتي | `my-orders.js` |
| `pages/wishlist.html` | المفضلة | `wishlist.js` |
| `pages/ahsab.html` | حسابي | `ahsab.js` |
| `pages/signin/login.html` | تسجيل الدخول | `signin.js`, `main.js` |
| `pages/signup/index.html` | التسجيل | `sign-up.js` |

### ⚙️ Core JavaScript (الأهم)

| الملف | الأسطر | الوظيفة الرئيسية |
|--------|--------|------------------|
| `assets/js/store.js` | ~1500 | **قاعدة البيانات المحلية** - `productsDatabase`، السلة، المفضلة، مزامنة Supabase، تطبيع البيانات |
| `assets/js/supabase-client.js` | 1421 | **عميل Supabase المركزي** - منتجات، طلبات، كوبونات، تقييمات، Taager integration |
| `assets/js/taager-integration.js` | 830 | **تكامل تاجر** - مزامنة منتجات، كاش، فلترة بلد، Merchant Info API |
| `assets/js/pricing-engine.js` | 96 | **محرك التسعير** - tiers من Supabase، `sellingPrice = supplierPrice + markup` |
| `assets/js/cart.js` | 1700 | **السلة والدفع** - كوبونات، شحن، توصيل، اقتراحات (empty/offers/top-selling/recommended) |
| `assets/js/home.js` | 2773 | **الصفحة الرئيسية** - Config-driven sections (28 قسم)، banners، hero، categories |
| `assets/js/main.js` | 784 | **صفحة المنتجات** - فلترة ذكية (keywords)، ترقيم صفحات (92/صفحة) |

### 🧩 وحدات المنتج (`assets/js/product/`)

| الوحدة | الوظيفة |
|----------|----------|
| `index.js` | نقطة الدخول، تهيئة PDP |
| `data.js` | جلب وتطبيع بيانات المنتج |
| `product-info.js` | الاسم، الوصف، البائع، التوفر |
| `product-gallery.js` | سلايدر صور، تكبير، thumbnails |
| `price-card.js` | السعر، الخصم، السعر الأصلي |
| `sticky-add-to-cart.js` | زر ثابت عند التمرير |
| `variant-selector.js` | اختيار اللون/النمط مع تحديث السعر |
| `size-selector.js` | اختيار المقاس مع المخزون |
| `size-guide.js` | دليل المقاسات (modal) |
| `seller-card.js` | بطاقة البائع، تقييم، متابعة |
| `review-section.js` | التقييمات، توزيع النجوم |
| `recommended-products.js` | منتجات مقترحة (carousel) |
| `product-skeleton.js` | هيكل التحميل |
| `bought-together.js` | Cross-sell مع checkbox |
| `installment-card.js` | تقسيط (Valu, Sympl, Tabby) |
| `delivery-card.js` | التوصيل، نافذة زمنية، countdown |

### 🎨 Core CSS

| الملف | الوظيفة |
|--------|----------|
| `noon-theme.css` | متغيرات CSS، ألوان، ثيم أساسي |
| `noon-shell.css` | هيدر، فوتر، نافبار، مودالز |
| `noon-components.css` | أزرار، كروت، نماذج، مكونات UI |
| `desktop.css` / `desktop-animations.css` | تنسيقات سطح المكتب |
| `home.css` | أقسام الصفحة الرئيسية |
| `product-detail.css` | صفحة المنتج |
| `cart.css` / `checkout.css` | سلة ودفع |
| `product/*.css` (16 ملف) | تنسيقات وحدات المنتج |

### ☁️ Supabase Backend

| الملف | الوظيفة |
|--------|----------|
| `supabase/config.toml` | تكوين محلي (ports، auth، DB، storage، realtime) |
| `supabase/functions/taager-proxy/index.ts` | **Edge Function** - مزامنة منتجات، Merchant Info، إنشاء طلبات، Proxy صور، Backfill، Deduplicate |
| `supabase/functions/phone-verification/index.ts` | **Edge Function** - OTP عبر Twilio (SMS/WhatsApp)، Rate limiting، Fallback |
| `supabase/migrations/*.sql` (17) | ترحيلات من 2025-07 إلى 2026-07 |

### 🗄️ Database Schema (SQL)

| الملف | الجدول/الوظيفة |
|--------|----------------|
| `create_profiles_table.sql` | `profiles` (users, sellers) |
| `create_home_sections.sql` | أقسام الرئيسية القابلة للتكوين |
| `create_product_original_prices.sql` | أسعار أصلية للخصم الوهمي |
| `create_support_chat.sql` | محادثات الدعم |
| `create_wishlist_items_table.sql` | عناصر المفضلة |
| `phone_verification_schema.sql` | جداول OTP |
| `rls_policies.sql` | سياسات Row Level Security |
| `seller_profiles_setup.sql` | بروفايلات البائعين |

---

## 🗑️ ملفات غير مهمة / مكررة / مؤقتة

### ❌ احذف فوراً (Safe to Delete)

| الملف/المجلد | السبب |
|--------------|-------|
| `nul` | ملف نظام Windows |
| `_dir_path.txt` | مسار محلي |
| `error_response.json` | نموذج اختبار |
| `tmp/` | ملفات اختبار Playwright |
| `test-results/` | نتائج اختبار قديمة |
| `supabase/.temp/` | ملفات مؤقتة Supabase CLI |
| `pages/signin/login in.html` | مكرر (مسافة في الاسم) |
| `taager_refresh.log` | سجل متجدد تلقائياً |

### ⚠️ راجع واحذف إذا غير مستخدم

| الملف | ملاحظات |
|--------|---------|
| `assets/css/style.css` | قديم - استبدل بـ `noon-theme.css` |
| `assets/css/empty-cart-alt.css` | بديل غير مستخدم |
| `assets/css/section.css` | قد لا يُستخدم |
| `assets/js/script.js` | سكريبت عام قديم |
| `assets/js/mock-api.js` | للتطوير فقط |
| `assets/js/test-functions.js` | للاختبار فقط |
| `assets/js/orders-common.js` | قد يكون مدمج في `my-orders.js` |
| `pages/signin/style.css` + `signin.css` | مكرران |
| `refresh_token_daily.bat` | إذا لا تستخدم Windows Task Scheduler |

---

## 🔄 تدفقات البيانات الرئيسية

### 1. تحميل الصفحة الرئيسية
```
index.html → redirect → pages/home.html
    → noon-shell.js (هيدر/فوتر/نافبار)
    → skeleton-loader.js (Skeleton فوري)
    → store.js (تهيئة productsDatabase + sync من Supabase)
    → taager-integration.js (جلب منتجات تاجر من كاش/API)
    → home.js (قراءة HOME_CONFIG → استبدال skeleton بـ 28 قسم)
    → PricingEngine (تحميل tiers من Supabase)
```

### 2. إضافة للسلة
```
User Click "أضف للسلة"
    → store.js::addToCart(product, qty, options)
    → تحقق تسجيل دخول (localStorage.isLoggedIn)
    → إنشاء cart item (id, name, price, qty, image, source, taager_product_id, country_code, seller_id...)
    → حفظ localStorage (cart_<email> أو cart)
    → updateCartCount() في الهيدر
    → notifyCartAdded() Toast
    → syncCartToSupabase() → table cart_items (إذا مفعلة)
```

### 3. إنشاء طلب (Checkout)
```
checkout.js (جمع بيانات شحن/دفع/كوبون)
    → supabase-client.js::createOrder(order, items)
    → محاولة إدخال مباشر مع columns مكتشفة ديناميكياً
    → Fallback: 12 pattern مختلف لأسماء الأعمدة
    → إنشاء order_items مرتبط
    → حفظ snapshot محلي
    → إذا منتجات Taager: طلب لـ Taager API عبر taager-proxy
```

### 4. مزامنة تاجر (Taager Sync)
```
يدوي: taager-proxy?action=sync&secret=xxx
يومي: refresh_token_daily.bat (Windows Task)
Edge Function:
    → fetchLiveProducts() → Taager API (variants + highlights، 50 صفحة × 100)
    → normalizeDbRow() → تنسيق موحد
    → enrichProductsBatch() → merchant-info API للتفاصيل
    → persistProducts() → upsert في taager_products
    → writeSyncLog() → taager_sync_logs
Frontend: taager-integration.js يجلب من taager_products table
```

---

## ⚙️ متغيرات البيئة المطلوبة

### Supabase (في config.toml أو Vercel/Netlify)
```env
SUPABASE_URL = https://msgqzgzoslearaprgiqq.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY = (للـ Edge Functions فقط)
```

### Taager API (Edge Functions Environment)
```env
TAAGER_JWT_TOKEN = (Bearer token)
TAAGER_TAAGER_ID = 2226119
TAAGER_SESSION_KEY = (ui-session-key)
TAAGER_SYNC_SECRET = (سر المزامنة)
TAAGER_EDGE_FUNCTION_URL = (اختياري)
```

### Twilio (هاتف)
```env
TWILIO_ACCOUNT_SID =
TWILIO_AUTH_TOKEN =
TWILIO_SMS_SENDER = (رقم SMS)
TWILIO_WHATSAPP_SENDER = (رقم WhatsApp)
```

### أخرى
```env
OPENAI_API_KEY = (Supabase AI)
S3_HOST, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY = (Experimental S3)
```

---

## 🛠️ أوامر التطوير

```bash
# تشغيل محلي
npx serve .                    # Static server
python -m http.server 8000     # Python

# Supabase Local
supabase start                 # يبدأ stack المحلي (Docker)
supabase status                # حالة الخدمات
supabase db reset              # إعادة تعيين DB + migrations + seeds
supabase functions serve       # Edge Functions محلياً
supabase db push               # دفع migrations للـ remote

# نشر Functions
supabase functions deploy taager-proxy
supabase functions deploy phone-verification

# متغيرات بيئة
supabase secrets set TAAGER_JWT_TOKEN=xxx TAAGER_TAAGER_ID=xxx ...
```

---

## 📊 ملخص: ماذا يفعل كل جزء؟

| المكون | الوظيفة | الملفات الرئيسية |
|--------|----------|------------------|
| **الصفحة الرئيسية** | عرض ديناميكي 28 قسم (banners، hero، categories، brands، offers، shein، taager-extra) | `home.html`, `home.js`, `HOME_CONFIG` |
| **المنتجات/الفلترة** | تصفح، بحث، فلترة ذكية (keywords)، ترقيم 92/صفحة | `products.html`, `main.js`, `category.js` |
| **تفاصيل المنتج** | معرض، سعر، متغيرات، مقاسات، تقييمات، اشترى معه، تقسيط، توصيل | `product.html`, `product/*.js` (16 وحدة) |
| **السلة والدفع** | إدارة سلة، كوبونات، شحن 19ج.م، ضريبة 12ج.م، توصيل 2-5 أيام، اقتراحات | `cart.js`, `checkout.js`, `empty-cart.html` |
| **الحساب/مصادقة** | تسجيل دخول، تسجيل، OTP هاتف، بروفايل، عناوين | `signin/`, `signup/`, `ahsab.js`, `edit-account.js` |
| **المفضلة** | إضافة/إزالة، مزامنة Supabase | `wishlist.js`, `wishlist.html` |
| **الطلبات** | عرض، تتبع، ملخص، إرجاع | `my-orders.js`, `order-tracking.js` |
| **تاجر (Taager)** | مزامنة منتجات (5000+)، أسعار، صور، طلبات، Merchant Info | `taager-integration.js`, `taager-proxy/` |
| **قاعدة البيانات** | PostgreSQL + RLS + RPC، 17 migration | `supabase-client.js`, `migrations/`, `sql/` |
| **التسعير التلقائي** | Tiers من DB، markup على سعر المورد | `pricing-engine.js` |
| **التحقق بالهاتف** | Twilio SMS/WhatsApp OTP، rate limiting، fallback | `phone-verification/` |
| **UI/Shell** | هيدر 3 صفوف، فوتر، نافبار، مودالز، Skeleton، Bottom Nav | `noon-shell.js`, `noon-*.css` |

---

## 📝 ملاحظات هامة

1. **لا يوجد package.json** - مشروع static HTML/JS/CS، لا يستخدم npm للـ frontend
2. **Supabase SDK** مدمج في `assets/vendor/supabase/supabase-js@2.js`
3. **اللغة العربية RTL** - جميع الصفحات `dir="rtl" lang="ar"`
4. **تطبيع النصوص العربية** - دوال `repairMojibakeText`، `fixArabicText` لإصلاح الترميز
5. **Offline-first** - `store.js` يعمل بـ localStorage، يزامن مع Supabase في الخلفية
6. **Fake Original Prices** - جداول `product_original_prices` لأسعار وهمية للخصم التسويقي

---

*انتهى التحليل - تم إنشاؤه آلياً بتاريخ 2025-07-11*