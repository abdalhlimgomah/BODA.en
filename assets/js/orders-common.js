(function () {
  "use strict";

  const dateFormatter = new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
  const UNKNOWN_PRODUCT_NAME = "اسم المنتج غير متوفر";
  const neutralFallbackSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#eef4ff"/><stop offset="1" stop-color="#f7fafc"/></linearGradient></defs>' +
    '<rect width="240" height="240" rx="24" fill="url(#g)"/>' +
    '<rect x="56" y="62" width="128" height="116" rx="16" fill="#dfe9ff"/>' +
    '<path d="M84 102h72M84 124h72M84 146h54" stroke="#6a83c8" stroke-width="10" stroke-linecap="round"/>' +
    '<circle cx="178" cy="174" r="18" fill="#2f6fe4"/><path d="M170 174l6 6 12-12" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>' +
    "</svg>";
  const neutralFallbackImage = `data:image/svg+xml;utf8,${encodeURIComponent(neutralFallbackSvg)}`;

  function sanitizeText(value) {
    const text = String(value ?? "").trim();
    if (!text) return "";
    const lowered = text.toLowerCase();
    if (lowered === "null" || lowered === "undefined" || lowered === "n/a") return "";
    return text;
  }

  function isUuidLike(value) {
    const text = sanitizeText(value).toLowerCase();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(text);
  }

  function isGenericProductName(value) {
    const text = sanitizeText(value);
    if (!text) return true;
    const normalized = text.toLowerCase().replace(/\s+/g, " ");
    return normalized === "منتج" || normalized === "product" || normalized === "item" || normalized === "unknown";
  }

  function pickFirstMeaningfulText(values, allowGeneric = false) {
    for (const value of values) {
      const text = sanitizeText(value);
      if (!text) continue;
      if (!allowGeneric && isGenericProductName(text)) continue;
      return text;
    }
    return "";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function resolveOrderCountryCode(context) {
    var code = "";
    if (context && typeof context === "object") {
      code = String(context.country_code || context.countryCode || context.country || "");
    } else if (context) {
      code = String(context);
    }
    code = code.toUpperCase();
    if (code === "SA" || code === "EG") return code;
    try {
      var stored = String(localStorage.getItem("userCountry") || "").toUpperCase();
      if (stored === "SA" || stored === "EG") return stored;
    } catch (e) {}
    try {
      var selected = window.TaagerIntegration && typeof window.TaagerIntegration.getSelectedCountry === "function"
        ? window.TaagerIntegration.getSelectedCountry()
        : null;
      var selectedCode = selected ? String(selected.code || "").toUpperCase() : "";
      if (selectedCode === "SA" || selectedCode === "EG") return selectedCode;
    } catch (e) {}
    return "EG";
  }

  function formatMoney(value, context) {
    var code = resolveOrderCountryCode(context);
    var num = Number(value) || 0;
    if (code === "SA") {
      return new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 2 }).format(num) + " ريال";
    }
    if (window.BudaStore) {
      return window.BudaStore.formatMoney(value);
    }
    return (Number(value) || 0).toFixed(2).replace(/\.00$/, "") + " ج.م.";
  }

  function toTimestamp(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.getTime();
  }

  function formatOrderDate(value) {
    const stamp = toTimestamp(value);
    if (!stamp) return "وقت غير محدد";
    return dateFormatter.format(new Date(stamp));
  }

  function normalizeStatusKey(value) {
    const raw = String(value || "").trim();
    const normalized = raw.toLowerCase();

    if (!normalized) return "pending";
    if (normalized === "pending") return "pending";
    if (normalized === "confirmed") return "confirmed";
    if (normalized === "preparing") return "preparing";
    if (normalized === "shipped") return "shipped";
    if (normalized === "delivered") return "delivered";
    if (normalized === "cancelled" || normalized === "canceled") return "cancelled";
    if (normalized === "onhold" || normalized === "on_hold" || normalized === "on-hold") return "onhold";
    if (normalized === "returned") return "returned";
    if (normalized === "in_transit" || normalized === "in-transit" || normalized === "on_way" || normalized === "on-way" || normalized === "onway" || normalized === "atway" || normalized === "في_الطريق" || normalized === "في الطريق") return "in_transit";

    if (raw.includes("إلغاء") || raw.includes("الغاء") || raw.includes("ملغ")) return "cancelled";
    if (raw.includes("تأكيد")) return "confirmed";
    if (raw.includes("تعليق") || raw.includes("معلق")) return "onhold";
    if (raw.includes("مرتجع") || raw.includes("إرجاع") || raw.includes("رجوع")) return "returned";
    if (raw.includes("توصيل") || raw.includes("تسليم")) return "delivered";
    if (raw.includes("شحن")) return "shipped";
    if (raw.includes("تجهيز")) return "preparing";
    if (raw.includes("مراجعة") || raw.includes("قيد")) return "pending";
    if (raw.includes("في الطريق") || raw.includes("في_الطريق") || raw.includes("قيد التوصيل") || raw.includes("قيد_التوصيل") || raw.includes("عبر_الشاحن") || raw.includes("عبر الشاحن")) return "in_transit";

    return "pending";
  }

  function statusMeta(status) {
    const key = normalizeStatusKey(status);
    const map = {
      pending: {
        key: "pending",
        label: "قيد المراجعة",
        icon: "hourglass_top",
        step: 1,
        isFinished: false,
        linePrefix: "تم إنشاء الطلب في",
      },
      preparing: {
        key: "preparing",
        label: "جاري التجهيز",
        icon: "inventory_2",
        step: 2,
        isFinished: false,
        linePrefix: "تم تجهيز الطلب في",
      },
      shipped: {
        key: "shipped",
        label: "تم الشحن",
        icon: "local_shipping",
        step: 3,
        isFinished: false,
        linePrefix: "تم الشحن في",
      },
      in_transit: {
        key: "in_transit",
        label: "في الطريق",
        icon: "move_to_inbox",
        step: 3,
        isFinished: false,
        linePrefix: "الطلب في الطريق منذ",
      },
      delivered: {
        key: "delivered",
        label: "تم التوصيل",
        icon: "inventory_2",
        step: 4,
        isFinished: true,
        linePrefix: "تم التوصيل في",
      },
      confirmed: {
        key: "confirmed",
        label: "تم التأكيد",
        icon: "check_circle",
        step: 2,
        isFinished: false,
        linePrefix: "تم التأكيد في",
      },
      cancelled: {
        key: "cancelled",
        label: "تم الإلغاء",
        icon: "block",
        step: 0,
        isFinished: true,
        linePrefix: "تم الإلغاء في",
      },
      onhold: {
        key: "onhold",
        label: "معلق مؤقتًا",
        icon: "pause_circle",
        step: 0,
        isFinished: false,
        linePrefix: "تم التعليق في",
      },
      returned: {
        key: "returned",
        label: "مرتجع",
        icon: "assignment_return",
        step: 0,
        isFinished: true,
        linePrefix: "تم الإرجاع في",
      },
    };
    return map[key] || map.pending;
  }

  function parseItemsValue(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "object") {
      const nestedArrays = [
        value.items,
        value.order_items,
        value.products,
        value.cart,
        value.lines,
        value.line_items,
      ];
      for (const nested of nestedArrays) {
        if (Array.isArray(nested) && nested.length) return nested;
      }
      return [value];
    }

    if (typeof value === "string") {
      const parsed = tryParseJsonLike(value);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === "string") {
        const reparsed = tryParseJsonLike(parsed);
        if (Array.isArray(reparsed)) return reparsed;
        if (reparsed && typeof reparsed === "object") return parseItemsValue(reparsed);
      }
      if (parsed && typeof parsed === "object") return parseItemsValue(parsed);

      const trimmed = String(value).trim();
      if (trimmed.includes("},{")) {
        const wrapped = tryParseJsonLike(`[${trimmed}]`);
        if (Array.isArray(wrapped)) return wrapped;
      }
    }

    return [];
  }

  function tryParseJsonLike(value) {
    const text = sanitizeText(value);
    if (!text) return null;
    if (!(text.startsWith("{") || text.startsWith("["))) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  function parseOrderTypeSnapshot(value) {
    const text = sanitizeText(value);
    if (!text) return null;

    const parsed = tryParseJsonLike(text);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") return parsed;

    if (text.startsWith('"') && text.endsWith('"')) {
      try {
        const unwrapped = JSON.parse(text);
        const reparsed = tryParseJsonLike(unwrapped);
        if (Array.isArray(reparsed)) return reparsed;
        if (reparsed && typeof reparsed === "object") return reparsed;
      } catch {
        // Ignore invalid wrapped JSON and continue fallback parsing.
      }
    }

    if (isUuidLike(text)) {
      return { product_id: text };
    }

    return { name: text };
  }

  function getLocalOrderSnapshot(order) {
    const orderId = sanitizeText(order?.id ?? order?.order_id ?? order?.uuid ?? order?.order_uuid);
    if (!orderId) return [];

    try {
      const raw = localStorage.getItem(`order_snapshot_${orderId}`);
      const parsed = parseItemsValue(raw);
      if (!parsed.length) return [];
      return parsed
        .map((entry) => coerceOrderItemRecord(entry))
        .filter((entry) => entry && typeof entry === "object" && Object.keys(entry).length > 0);
    } catch {
      return [];
    }
  }

  function coerceOrderItemRecord(rawItem) {
    if (rawItem && typeof rawItem === "object" && !Array.isArray(rawItem)) {
      const nestedItem = rawItem.item || rawItem.product_item || rawItem.order_item;
      const parsedNested = tryParseJsonLike(nestedItem);
      const base = parsedNested && typeof parsedNested === "object" ? { ...rawItem, ...parsedNested } : rawItem;

      const parsedProduct = tryParseJsonLike(base.product);
      if (parsedProduct && typeof parsedProduct === "object") {
        return { ...base, product: parsedProduct };
      }
      return base;
    }

    if (typeof rawItem === "string") {
      let parsed = tryParseJsonLike(rawItem);
      if (typeof parsed === "string") {
        parsed = tryParseJsonLike(parsed);
      }
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return coerceOrderItemRecord(parsed);
      }
      const fallbackName = sanitizeText(rawItem);
      return fallbackName ? { name: fallbackName } : {};
    }

    return {};
  }

  function parseImageList(value) {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.flatMap((entry) => parseImageList(entry));
    }

    if (typeof value === "object") {
      const objectCandidates = [
        value.url,
        value.src,
        value.image,
        value.image_url,
        value.imageUrl,
        value.thumbnail,
        value.img,
        value.photo,
        value.picture,
        value.secure_url,
        value.original,
        value.large,
        value.medium,
        value.small,
      ];
      return objectCandidates.flatMap((entry) => parseImageList(entry));
    }

    const text = sanitizeText(value);
    if (!text) return [];

    if ((text.startsWith("[") && text.endsWith("]")) || (text.startsWith("{") && text.endsWith("}"))) {
      try {
        const parsed = JSON.parse(text);
        return parseImageList(parsed);
      } catch {
        // Fall through to delimiter splitting below.
      }
    }

    if (text.startsWith("{") && text.endsWith("}")) {
      const raw = text.slice(1, -1).trim();
      if (!raw) return [];
      return raw
        .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g)
        .map((entry) => sanitizeText(entry.replace(/^"(.*)"$/, "$1").replace(/\\"/g, '"')))
        .filter(Boolean);
    }

    return text
      .split(/[,\n;|]+/g)
      .map((entry) => sanitizeText(entry))
      .filter(Boolean);
  }

  function fallbackItemImage() {
    return neutralFallbackImage;
  }

  function isFallbackImageSource(value) {
    const text = String(value || "").trim();
    if (!text) return true;
    return text === neutralFallbackImage;
  }

  function resolveProductById(item) {
    const explicitProductId = sanitizeText(item?.product_id ?? item?.productId ?? item?.item_id ?? item?.product?.id);
    const hasOrderItemIdentity = Boolean(
      sanitizeText(item?.order_id ?? item?.orderId ?? item?.order_item_id ?? item?.orderItemId)
    );
    const fallbackRaw = hasOrderItemIdentity ? "" : sanitizeText(item?.id ?? item?.sku ?? item?.slug);
    const fallbackLooksSynthetic =
      fallbackRaw === "order_fallback_item" || /^unknown(_\d+)?$/i.test(fallbackRaw);
    const fallbackId = fallbackLooksSynthetic ? "" : fallbackRaw;
    const itemId = explicitProductId || fallbackId;
    if (!window.BudaStore?.getProductById) return null;

    const allProducts = typeof window.BudaStore.getAllProducts === "function" ? window.BudaStore.getAllProducts() || {} : {};

    if (!itemId) {
      const targetPrice = Number(item?.price ?? item?.order_total ?? 0) || 0;
      if (targetPrice > 0) {
        const tolerance = 0.01;
        const byPrice = Object.values(allProducts).filter((product) => {
          const directPrice = Number(product?.price ?? 0) || 0;
          const discountedPrice = Number(product?.price_after_discount ?? product?.discountPrice ?? 0) || 0;
          return Math.abs(directPrice - targetPrice) <= tolerance || Math.abs(discountedPrice - targetPrice) <= tolerance;
        });
        if (byPrice.length === 1) return byPrice[0];
      }
    }
    let lookupKeys = [];
    if (itemId) {
      lookupKeys = collectProductLookupKeys({
        product_id: itemId,
        id: itemId,
        type: item?.type,
        seller_id: item?.seller_id ?? item?.sellerId,
        sku: item?.sku,
        slug: item?.slug,
        product: item?.product,
      });

      for (const key of lookupKeys) {
        const byString = window.BudaStore.getProductById(key);
        if (byString) return byString;

        if (/^\d+$/.test(key)) {
          const byNumeric = window.BudaStore.getProductById(Number(key));
          if (byNumeric) return byNumeric;
        }
      }
    }

    if (typeof window.BudaStore.getAllProducts === "function") {
      const allProducts = window.BudaStore.getAllProducts() || {};
      for (const product of Object.values(allProducts)) {
        const productKeys = collectProductLookupKeys(product);
          if (lookupKeys.length && productKeys.some((key) => lookupKeys.includes(key))) {
            return product;
          }
        }

      const itemName = pickFirstMeaningfulText([item?.name, item?.product_name, item?.productName, item?.title], false).toLowerCase();
      if (itemName) {
        for (const product of Object.values(allProducts)) {
          const productName = sanitizeText(product?.name ?? product?.title).toLowerCase();
          if (!productName) continue;
          if (productName === itemName || productName.includes(itemName) || itemName.includes(productName)) {
            return product;
          }
        }
      }
    }

    const targetPrice = Number(item?.price ?? item?.order_total ?? 0) || 0;
    if (targetPrice > 0) {
      const tolerance = 0.01;
      const byPrice = Object.values(allProducts).filter((product) => {
        const directPrice = Number(product?.price ?? 0) || 0;
        const discountedPrice = Number(product?.price_after_discount ?? product?.discountPrice ?? 0) || 0;
        return Math.abs(directPrice - targetPrice) <= tolerance || Math.abs(discountedPrice - targetPrice) <= tolerance;
      });
      if (byPrice.length === 1) return byPrice[0];
    }

    return null;
  }

  function normalizeProductKey(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  function collectProductLookupKeys(source) {
    const parsedType = parseOrderTypeSnapshot(source?.type);
    const candidates = [
      source?.product_id,
      source?.productId,
      source?.id,
      isUuidLike(source?.type) ? source?.type : null,
      source?.seller_id,
      source?.sellerId,
      parsedType && !Array.isArray(parsedType) ? parsedType?.product_id ?? parsedType?.productId ?? parsedType?.id : null,
      source?.item_id,
      source?.itemId,
      source?.sku,
      source?.slug,
      source?.code,
      source?.product?.id,
      source?.product?.product_id,
      source?.product?.productId,
      source?.product?.sku,
      source?.product?.slug,
    ];

    const keys = [];
    candidates.forEach((value) => {
      const key = normalizeProductKey(value);
      if (!key || keys.includes(key)) return;
      keys.push(key);
    });
    return keys;
  }

  function addProductToLookupMap(map, product) {
    if (!product || typeof product !== "object") return;
    const keys = collectProductLookupKeys(product);
    keys.forEach((key) => {
      if (!map.has(key)) map.set(key, product);
    });
  }

  function findLinkedProduct(source, productsMap) {
    if (!productsMap || typeof productsMap.get !== "function") return null;
    const keys = collectProductLookupKeys(source);
    for (const key of keys) {
      const product = productsMap.get(key);
      if (product) return product;
    }
    return null;
  }

  function normalizeImageSource(src) {
    const value = String(src || "").trim();
    if (!value) return fallbackItemImage();
    if (value.startsWith("data:") || value.startsWith("blob:")) return value;
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    if (value.startsWith("//")) return `https:${value}`;
    if (value.startsWith("www.")) return `https://${value}`;
    if (window.BudaStore?.getImagePath) return window.BudaStore.getImagePath(value);
    return value;
  }

  function buildOrderImageTag(src, alt) {
    const fallback = fallbackItemImage();
    const safeSrc = escapeHtml(normalizeImageSource(src));
    const safeFallback = escapeHtml(fallback);
    const safeAlt = escapeHtml(alt || UNKNOWN_PRODUCT_NAME);
    return `<img src="${safeSrc}" alt="${safeAlt}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-fallback-src="${safeFallback}" />`;
  }

  function bindOrderImageFallbacks(root) {
    const scope = root || document;
    scope.querySelectorAll("img[data-fallback-src]").forEach((img) => {
      if (img.dataset.fallbackBound === "1") return;
      img.dataset.fallbackBound = "1";

      img.addEventListener("error", () => {
        const fallback = img.dataset.fallbackSrc;
        if (!fallback || img.dataset.fallbackApplied === "1") return;
        img.dataset.fallbackApplied = "1";
        img.src = fallback;
        img.classList.add("is-fallback-image");
      });
    });
  }

  function resolveItemName(item, matchedProduct) {
    return (
      pickFirstMeaningfulText(
        [
          item?.name,
          item?.product_name,
          item?.productName,
          item?.title,
          item?.product_title,
          item?.productTitle,
          item?.display_name,
          item?.displayName,
          item?.product?.name,
          item?.product?.product_name,
          item?.product?.title,
          matchedProduct?.name,
          matchedProduct?.title,
        ],
        false
      ) || UNKNOWN_PRODUCT_NAME
    );
  }

  function resolveRawItemImage(item) {
    const directCandidates = [
      item?.image_url,
      item?.image,
      item?.product_image,
      item?.thumbnail,
      item?.img,
      item?.imageUrl,
      item?.image_1,
      item?.image1,
      item?.preview_image,
      item?.photo,
      item?.picture,
      item?.product?.image_url,
      item?.product?.image,
      item?.product?.product_image,
      item?.product?.thumbnail,
      item?.product?.img,
      item?.product?.imageUrl,
      item?.product?.image_1,
      item?.product?.image1,
    ];

    for (const candidate of directCandidates) {
      if (!candidate) continue;
      if (typeof candidate === "object") {
        const parsed = parseImageList(candidate);
        const first = parsed.find((entry) => sanitizeText(entry));
        if (first) return first;
        continue;
      }
      const text = sanitizeText(candidate);
      if (text) return text;
    }

    const listCandidates = [
      item?.images,
      item?.gallery,
      item?.thumbnails,
      item?.product?.images,
      item?.product?.gallery,
      item?.product?.thumbnails,
    ];
    for (const listValue of listCandidates) {
      const images = parseImageList(listValue);
      const firstImage = images.find((entry) => sanitizeText(entry));
      if (firstImage) return firstImage;
    }

    return "";
  }

  function hasItemImageData(item) {
    return Boolean(resolveRawItemImage(item));
  }

  function hasMeaningfulItemName(item) {
    const candidate = pickFirstMeaningfulText(
      [item?.name, item?.product_name, item?.productName, item?.title, item?.product_title, item?.product?.name],
      false
    );
    return Boolean(candidate);
  }

  function resolveItemImage(item) {
    if (!item) return fallbackItemImage();

    const directImage = resolveRawItemImage(item);
    if (directImage) {
      return normalizeImageSource(directImage);
    }

    const product = resolveProductById(item);
    const productImage =
      sanitizeText(product?.image) ||
      sanitizeText(product?.image_url) ||
      sanitizeText(product?.imageUrl) ||
      sanitizeText(product?.thumbnail) ||
      sanitizeText(product?.img) ||
      parseImageList(product?.images)[0] ||
      "";
    if (productImage) {
      return normalizeImageSource(productImage);
    }

    return fallbackItemImage();
  }

  function normalizeOrderItem(item, index) {
    const record = coerceOrderItemRecord(item);
    const matchedProduct = resolveProductById(record);
    const quantity = Math.max(1, Number(record?.quantity ?? record?.qty ?? 1) || 1);
    const price = Number(record?.price ?? record?.unit_price ?? record?.amount ?? matchedProduct?.price ?? 0) || 0;
    const currentPrice = Number(
      record?.currentPrice ??
        record?.price_after_discount ??
        record?.discountPrice ??
        record?.discount_price ??
        matchedProduct?.price_after_discount ??
        matchedProduct?.discountPrice ??
        matchedProduct?.discount_price ??
        0
    ) || price;
    return {
      id: record?.id ?? record?.product_id ?? record?.productId ?? record?.seller_id ?? record?.sellerId ?? `unknown_${index}`,
      product_id:
        record?.product_id ??
        record?.productId ??
        record?.seller_id ??
        record?.sellerId ??
        record?.item_id ??
        record?.id ??
        null,
      name: resolveItemName(record, matchedProduct),
      quantity,
      price,
      currentPrice,
      image: resolveItemImage(record),
      brand: record?.brand || record?.vendor || record?.store_name || matchedProduct?.brand || "",
    };
  }

  function extractItemsCandidate(order) {
    const typeSnapshot = parseOrderTypeSnapshot(order?.type);
    const localSnapshot = getLocalOrderSnapshot(order);
    const candidates = [
      order?.items_json,
      order?.order_items,
      order?.items,
      order?.__resolvedItems,
      typeSnapshot,
      localSnapshot,
    ];
    for (const candidate of candidates) {
      const parsed = parseItemsValue(candidate);
      if (parsed.length) {
        const normalized = parsed
          .map((entry) => coerceOrderItemRecord(entry))
          .filter((entry) => entry && typeof entry === "object" && Object.keys(entry).length > 0);
        if (normalized.length) return normalized;
      }
    }
    return [];
  }

  function buildFallbackItemFromOrder(order) {
    const typeSnapshot = parseOrderTypeSnapshot(order?.type);
    const typeRecord = Array.isArray(typeSnapshot) ? coerceOrderItemRecord(typeSnapshot[0]) : coerceOrderItemRecord(typeSnapshot);
    const localSnapshot = getLocalOrderSnapshot(order);
    const localRecord = localSnapshot.length ? coerceOrderItemRecord(localSnapshot[0]) : {};

    const fallbackName =
      pickFirstMeaningfulText(
        [
          typeRecord?.name,
          typeRecord?.product_name,
          localRecord?.name,
          localRecord?.product_name,
          order?.product_name,
          order?.productName,
          order?.item_name,
          order?.itemName,
          order?.title,
          order?.name,
          order?.product?.name,
          order?.product?.title,
        ],
        false
      ) || UNKNOWN_PRODUCT_NAME;

    const fallbackImage =
      resolveRawItemImage(typeRecord) ||
      resolveRawItemImage(localRecord) ||
      resolveRawItemImage(order) ||
      sanitizeText(order?.product?.image) ||
      sanitizeText(order?.product?.image_url) ||
      "";

    return normalizeOrderItem(
      {
        id:
          order?.product_id ??
          order?.productId ??
          typeRecord?.product_id ??
          typeRecord?.productId ??
          localRecord?.product_id ??
          localRecord?.productId ??
          order?.seller_id ??
          order?.sellerId ??
          order?.item_id ??
          order?.itemId ??
          "order_fallback_item",
        product_id:
          order?.product_id ??
          order?.productId ??
          typeRecord?.product_id ??
          typeRecord?.productId ??
          localRecord?.product_id ??
          localRecord?.productId ??
          order?.seller_id ??
          order?.sellerId ??
          order?.item_id ??
          order?.itemId ??
          null,
        name: fallbackName,
        quantity: Number(typeRecord?.quantity ?? localRecord?.quantity ?? order?.quantity) || 1,
        price:
          Number(typeRecord?.price ?? localRecord?.price ?? order?.price ?? order?.total_price ?? order?.total ?? order?.amount ?? 0) || 0,
        order_total: Number(order?.total_price ?? order?.total ?? order?.amount ?? 0) || 0,
        image: fallbackImage,
        brand:
          typeRecord?.brand ||
          localRecord?.brand ||
          order?.brand ||
          order?.vendor ||
          order?.store_name ||
          "",
      },
      0
    );
  }

  function getOrderItems(order) {
    const normalized = extractItemsCandidate(order).map(normalizeOrderItem);
    if (normalized.length) return normalized;
    return [buildFallbackItemFromOrder(order)];
  }

  function pickPrimaryOrderItem(order) {
    const items = getOrderItems(order);
    if (!items.length) return buildFallbackItemFromOrder(order);

    const withNameAndImage = items.find((item) => !isGenericProductName(item?.name) && !isFallbackImageSource(item?.image));
    if (withNameAndImage) return withNameAndImage;

    const withNameOnly = items.find((item) => !isGenericProductName(item?.name));
    if (withNameOnly) return withNameOnly;

    const withImageOnly = items.find((item) => !isFallbackImageSource(item?.image));
    if (withImageOnly) return withImageOnly;

    return items[0];
  }

  function getOrderId(order) {
    const value = order?.id ?? order?.order_id ?? order?.uuid ?? order?.order_uuid ?? "";
    return String(value || "").trim();
  }

  function getOrderTime(order) {
    return order?.created_at || order?.createdAt || order?.updated_at || order?.updatedAt || "";
  }

  function buildOrderReference(order) {
    const raw = String(order?.reference || order?.order_ref || order?.order_number || getOrderId(order) || "").trim();
    const clean = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (!clean) return "NEG000000000";
    if (clean.startsWith("NEG")) return clean;
    return `NEG${clean}`;
  }

  function resolveOrderAddress(order) {
    const directAddress = order?.address || order?.customer_address || order?.user_address || "";
    if (String(directAddress || "").trim()) return String(directAddress).trim();

    const email = String(order?.user_email || order?.email || order?.customer_email || "").trim();
    if (!email) return "";

    const candidates = [...new Set([email, email.toLowerCase()])];
    for (const keyEmail of candidates) {
      const selected = localStorage.getItem(`selected_address_${keyEmail}`) || "";
      if (String(selected || "").trim()) return String(selected).trim();

      try {
        const list = JSON.parse(localStorage.getItem(`addresses_${keyEmail}`) || "[]");
        if (Array.isArray(list) && list.length) {
          return String(list[0] || "").trim();
        }
      } catch {
        // Ignore malformed cache.
      }
    }

    return "";
  }

  function resolvePaymentLabel(order) {
    const raw = String(order?.payment_method || order?.payment || "cod").toLowerCase();
    if (!raw || raw === "cod" || raw.includes("cash") || raw.includes("الاستلام")) {
      return "الدفع عند الاستلام";
    }
    if (raw.includes("card") || raw.includes("visa") || raw.includes("master")) {
      return "بطاقة بنكية";
    }
    if (raw.includes("wallet")) {
      return "محفظة إلكترونية";
    }
    return String(order?.payment_method || "الدفع عند الاستلام");
  }

  function orderNeedsHydration(order) {
    const orderId = getOrderId(order);
    if (!orderId) return false;

    const items = extractItemsCandidate(order);
    if (!items.length) return true;

    return items.some((item) => !hasMeaningfulItemName(item) || !hasItemImageData(item));
  }

  async function hydrateOrdersWithOrderItems(orders) {
    if (!Array.isArray(orders) || !orders.length) return Array.isArray(orders) ? orders : [];
    if (!window.supabaseClient || typeof window.supabaseClient.from !== "function") return orders;

    const missing = orders.filter((order) => orderNeedsHydration(order));

    if (!missing.length) return orders;
    const ids = [...new Set(missing.map((order) => getOrderId(order)).filter(Boolean))];
    if (!ids.length) return orders;

    try {
      const { data, error } = await window.supabaseClient.from("order_items").select("*").in("order_id", ids);
      const orderItemsRows = !error && Array.isArray(data) ? data : [];

      const productLookupKeys = [
        ...new Set(
          [
            ...orderItemsRows.flatMap((row) => collectProductLookupKeys(row)),
            ...missing.flatMap((order) => collectProductLookupKeys(order)),
            ...missing.flatMap((order) => extractItemsCandidate(order).flatMap((item) => collectProductLookupKeys(item))),
          ].filter((value) => Boolean(value))
        ),
      ];
      const productsById = new Map();
      if (productLookupKeys.length) {
        try {
          const { data: products, error: productsError } = await window.supabaseClient
            .from("products")
            .select("*")
            .in("id", productLookupKeys);
          if (!productsError && Array.isArray(products)) {
            products.forEach((product) => {
              addProductToLookupMap(productsById, product);
            });
          }
        } catch {
          // Keep rendering from order_items only if product lookup fails.
        }
      }

      if (!productsById.size && typeof window.supabaseClient.fetchAllProducts === "function") {
        try {
          const allProducts = await window.supabaseClient.fetchAllProducts();
          if (Array.isArray(allProducts)) {
            allProducts.forEach((product) => addProductToLookupMap(productsById, product));
          }
        } catch {
          // Ignore full-catalog fallback failure.
        }
      }

      if (!productsById.size && window.BudaStore?.getAllProducts) {
        try {
          const allStoreProducts = window.BudaStore.getAllProducts() || {};
          Object.values(allStoreProducts).forEach((product) => addProductToLookupMap(productsById, product));
        } catch {
          // Ignore local store fallback failures.
        }
      }

      const grouped = new Map();
      orderItemsRows.forEach((row, index) => {
        const key = String(row?.order_id || "").trim();
        if (!key) return;
        const linkedProduct = findLinkedProduct(row, productsById);
        const linkedImages = parseImageList(linkedProduct?.images);
        const linkedImage =
          linkedProduct?.image ||
          linkedProduct?.image_url ||
          linkedProduct?.imageUrl ||
          linkedProduct?.thumbnail ||
          linkedProduct?.img ||
          linkedImages[0] ||
          "";

        const normalizedItem = normalizeOrderItem(
          {
            id: row?.product_id ?? `order_item_${index}`,
            product_id: row?.product_id ?? null,
            name: row?.name || row?.product_name || row?.title || linkedProduct?.name || "",
            product_name: row?.product_name || "",
            title: row?.title || row?.product_title || "",
            quantity: Number(row?.quantity) || 1,
            price:
              Number(row?.price) ||
              Number(row?.unit_price) ||
              Number(row?.amount) ||
              Number(linkedProduct?.price) ||
              0,
            image: row?.image || row?.image_url || row?.product_image || row?.thumbnail || row?.img || linkedImage,
            image_url: row?.image_url || "",
            images: row?.images || [],
            order_id: row?.order_id || "",
            brand: row?.brand || row?.vendor || row?.store_name || linkedProduct?.brand || linkedProduct?.vendor || "",
            product: linkedProduct || null,
          },
          index
        );

        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(normalizedItem);
      });

      const missingOrderIds = new Set(ids.map((value) => String(value || "").trim()).filter(Boolean));
      return orders.map((order) => {
        const key = getOrderId(order);
        if (!key) return order;
        if (grouped.has(key)) return { ...order, __resolvedItems: grouped.get(key) };
        if (!missingOrderIds.has(key)) return order;

        const parsedItems = extractItemsCandidate(order);
        if (!parsedItems.length) {
          const linkedProduct = findLinkedProduct(order, productsById);
          if (!linkedProduct) return order;
          return { ...order, product: order?.product || linkedProduct };
        }

        const enrichedItems = parsedItems.map((item, index) => {
          const linkedProduct = findLinkedProduct(item, productsById) || findLinkedProduct(order, productsById);
          return normalizeOrderItem({ ...item, product: item?.product || linkedProduct || null }, index);
        });

        if (!enrichedItems.length) return order;
        return { ...order, __resolvedItems: enrichedItems };
      });
    } catch {
      return orders;
    }
  }

  async function fetchOrderById(orderId) {
    const target = String(orderId || "").trim();
    if (!target || !window.supabaseClient) return null;

    const queryByColumn = async (column) => {
      try {
        const { data, error } = await window.supabaseClient.from("orders").select("*").eq(column, target).limit(1);
        if (error || !Array.isArray(data) || !data.length) return null;
        return data[0];
      } catch {
        return null;
      }
    };

    const byId = await queryByColumn("id");
    if (byId) return byId;

    const byOrderId = await queryByColumn("order_id");
    if (byOrderId) return byOrderId;

    if (typeof window.supabaseClient.getOrders === "function") {
      try {
        const rows = await window.supabaseClient.getOrders({});
        if (!Array.isArray(rows)) return null;
        return rows.find((row) => getOrderId(row) === target) || null;
      } catch {
        return null;
      }
    }

    return null;
  }

  async function fetchOrderWithItems(orderId) {
    const order = await fetchOrderById(orderId);
    if (!order) return null;
    const hydrated = await hydrateOrdersWithOrderItems([order]);
    return hydrated[0] || order;
  }

  window.BudaOrders = {
    escapeHtml,
    formatMoney,
    resolveOrderCountryCode,
    formatOrderDate,
    toTimestamp,
    normalizeStatusKey,
    statusMeta,
    parseItemsValue,
    fallbackItemImage,
    normalizeImageSource,
    buildOrderImageTag,
    bindOrderImageFallbacks,
    resolveItemImage,
    normalizeOrderItem,
    getOrderItems,
    pickPrimaryOrderItem,
    getOrderId,
    getOrderTime,
    buildOrderReference,
    resolveOrderAddress,
    resolvePaymentLabel,
    hydrateOrdersWithOrderItems,
    fetchOrderById,
    fetchOrderWithItems,
  };
})();
