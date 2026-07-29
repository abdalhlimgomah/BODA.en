# Buda Design System v2.0 — Design Rules

> هذا الملف هو المرجع النهائي والإلزامي لجميع المطورين. أي مخالفة لهذه القواعد ستُرفض فوراً.

---

## ❌ ممنوعات مطلقة

| الفئة | ممنوع | الصحيح |
|---|---|---|
| **Colors** | أي لون مباشر (`#xxx`, `rgb(...)`) | استخدم `var(--color-*)` فقط |
| **Border Radius** | قيم عشوائية (`15px`, `17px`, `23px`) | استخدم `var(--radius-*)` فقط (8, 12, 16, 18, 20, 24, 28, 9999) |
| **Shadows** | كتابة `box-shadow` مباشرة | استخدم `var(--shadow-*)` فقط |
| **Fonts** | أي خط غير مسجل | استخدم `var(--font-primary)` أو `var(--font-fallback)` فقط |
| **Font Sizes** | قيم عشوائية (`13px`, `15px`, `19px`) | استخدم `var(--text-*)` فقط (12, 14, 16, 18, 20, 24, 32, 40, 48) |
| **Spacing** | قيم خارج 8pt Grid (`11px`, `37px`, `53px`) | استخدم `var(--space-*)` فقط (4, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 96) |
| **Animations** | `transition` بقيم مباشرة | استخدم `var(--transition-*)` أو `var(--duration-*)` |
| **Z-Index** | أرقام عشوائية (`999`, `100000`) | استخدم `var(--z-*)` فقط |
| **Inline Styles** | `style="..."` | ممنوع نهائياً. كل شيء في CSS files |
| **Spinners** | أي spinner أو loader دائري | استخدم `.buda-skeleton` فقط |
| **Icons** | Material Icons, Heroicons, Bootstrap Icons | Lucide فقط مع `stroke-width="2"` |
| **Animation Props** | `width`, `height`, `top`, `left` | `opacity` و `transform` فقط (GPU) |
| **Fixed Widths** | `width: 437px` | استخدم `max-width`, `clamp()`, `min()`, `max()` |

---

## ✅ قواعد إلزامية

### التسمية (Naming Convention)
- كل class يبدأ بـ `buda-` (مثل: `buda-btn`, `buda-card`, `buda-input`)
- الأجزاء الداخلية تستخدم `__` (مثل: `buda-card__header`)
- التعديلات تستخدم `--` (مثل: `buda-btn--lg`, `buda-card--flat`)
- الحالات تستخدم `is-` (مثل: `is-active`, `is-loading`, `is-scrolled`)

### الثيم (Theme Engine)
- `[data-theme="light"]` — الوضع الفاتح (افتراضي)
- `[data-theme="dark"]` — الوضع الداكن
- `[data-theme="system"]` — يتبع نظام التشغيل

### إمكانية الوصول (Accessibility)
- كل عنصر تفاعلي يجب أن يحتوي على `aria-label`
- كل زر يجب أن يدعم `:focus-visible`
- تباين الألوان ≥ 4.5:1 (WCAG AA)
- دعم `prefers-reduced-motion`
- دعم التنقل بلوحة المفاتيح (Tab, Enter, Esc)

### الأداء (Performance)
- كل صورة خارج viewport: `loading="lazy"`
- Hero image: `fetchpriority="high"`
- الخطوط: `<link rel="preload">`
- `will-change` فقط عند الحاجة (لا تستخدمها عشوائياً)
- `IntersectionObserver` للتحميل التدريجي
- `debounce` للبحث (300ms)

---

## 📐 المقاسات المعتمدة

| العنصر | Desktop | Mobile |
|---|---|---|
| Header | 84px | 72px |
| Search Bar | 56px × 620px | 56px × 100% |
| Buttons | 56px | 48px |
| Cards Radius | 20px | 20px |
| Hero Banner | 430px | 210px |
| Product Image | 220px | 150px |
| Product Card | 240px | 170px |
| Icon Circle | 44px | 44px |
| Icon Size | 22px | 22px |

---

## 🎨 Typography Scale

| Token | Size | Usage |
|---|---|---|
| `--text-display` | 48px | Hero headlines |
| `--text-heading-xl` | 40px | Page titles |
| `--text-heading-lg` | 32px | Section titles |
| `--text-heading-md` | 24px | Card titles, modals |
| `--text-heading-sm` | 20px | Sub-headings |
| `--text-body-lg` | 18px | Lead text |
| `--text-body` | 16px | Default body |
| `--text-body-sm` | 14px | Secondary, meta |
| `--text-caption` | 12px | Badges, footnotes |
