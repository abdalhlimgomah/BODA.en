/**
 * Shared catalog loader + Arabic-aware search.
 *
 * The external catalog lives in Supabase (`taager_products`). It holds a few
 * thousand rows, so the serverless functions keep a small in-memory copy and
 * match against it instead of making the browser download the whole table.
 *
 * This module is intentionally dependency-free: it only needs global fetch.
 */

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://msgqzgzoslearaprgiqq.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZ3F6Z3pvc2xlYXJhcHJnaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzk3MTIsImV4cCI6MjA4NTkxNTcxMn0.fQu1toCisGIly8FZqHy3yoEwnY-e7vthk8PCmkBMifE";

const PAGE_SIZE = 1000;
const MAX_ROWS = 12000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12000;

const LEAN_COLUMNS = [
  "id",
  "name",
  "category",
  "brand",
  "price",
  "original_price",
  "image",
  "available_countries",
  "stock",
  "stock_status",
  "is_active",
  "created_at",
  "taager_product_id",
].join(",");

const GENERIC_CATEGORIES = new Set([
  "",
  "product",
  "products",
  "bundle",
  "bundles",
  "general",
  "other",
  "none",
  "null",
  "منتج",
  "منتجات",
  "بدون تصنيف",
  "عام",
]);

// A product name is the only reliable signal for most rows (97% of the table
// has a generic category such as "product"), so derive a useful category from
// the name when the stored one carries no information.
const CATEGORY_RULES = [
  {
    name: "عطور",
    re: /(عطر|عطور|برفان|برفيوم|perfume|بخور|عود|مسك|معطر جو|فواحه)/,
  },
  {
    name: "ساعات",
    re: /(ساعه|ساعات|watch|ووتش|واتش|smartwatch)/,
  },
  {
    name: "موبايلات وملحقاتها",
    re: /(موبايل|موبيل|هاتف|تليفون|phone|ايفون|iphone|سامسونج|samsung|شاومي|xiaomi|اوبو|oppo|ريلمي|realme|هواوي|huawei|شاحن|جراب|كفر|سماعه|سماعات|ايربودز|airpods|باور ?بانك|power ?bank|سكرين|protector|انكر|anker)/,
  },
  {
    name: "إلكترونيات",
    re: /(لابتوب|laptop|كمبيوتر|computer|شاشه|شاشة|تلفزيون|تلفاز|tv|كيبورد|keyboard|ماوس|mouse|كاميرا|camera|راوتر|router|بروجكتر|projector|تابلت|tablet|ايباد|ipad|هارد|فلاشه|memory|بطاريه|battery|سمارت)/,
  },
  {
    name: "منتجات أطفال",
    re: /(اطفال|بيبي|baby|حفاضه|حفاضات|ببرونه|رضاعه|عربه اطفال|مقعد سياره طفل|مولود)/,
  },
  {
    name: "منتجات رياضية",
    re: /(رياضه|جيم|دمبل|كوره|تمارين|يوجا|مقاومه|سير كهربائي|اوربتراك|عجله رياضيه|fitness|gym)/,
  },
  {
    name: "ألعاب",
    re: /(لعبه|العاب|ليجو|بازل|عروسه|بلاستيشن|playstation|ps[45]|xbox|سبينر|toy)/,
  },
  {
    name: "مكتب ودراسة",
    re: /(مكتب|دراسه|قلم|دفتر|كشكول|مسطره|الوان|حبر|طابعه|ورق|ملف|حافظه|stationery|notebook)/,
  },
  {
    name: "منزل ومطبخ",
    re: /(مطبخ|خلاط|محضر طعام|مفرمه|مقلاة|طنجره|حلة|حله|كوب|اكواب|طبق|اطباق|منزل|ديكور|سجاده|ستاره|مفارش|بطانيه|لحاف|وساده|مخده|براده|مكنسه|مروحه|مكواه|فرن|ميكروويف|غلايه|محمصه|ثلاجه|غساله|شفاط|رف|منظم|علاقه|صحون|ملاءه|ملاءات|ملايه|سرير|مرتبه|ترابيزه|كرسي|طاوله|home|kitchen)/,
  },
  {
    name: "ملابس وأحذية",
    re: /(حذاء|احذيه|جزمه|كوتشي|سليبر|شبشب|صندل|قميص|تيشرت|تي شيرت|t-shirt|بلوزه|بنطلون|بنطال|جينز|فستان|جاكيت|هودي|سويت|شورت|ملابس|طقم ملابس|طقم رجالي|طقم حريمي|بيجامه|شراب|جوارب|كروكس|عبايه|حجاب|طرحه|قبعه|shoe|shirt|dress|jacket|pants|sneakers)/,
  },
  {
    name: "تجميل وعناية",
    re: /(كريم|سيروم|مكياج|ميك ?اب|makeup|شامبو|صابون|مرطب|روج|ماسك|عنايه|بشره|فرشاه|فرشاة|مزيل|غسول|تونر|فاونديشن|كونسيلر|مناكير|حلاوه|شفره|ماكينه حلاقه|skin ?care|beauty)/,
  },
  {
    name: "حقائب وشنط",
    re: /(شنطه|شنطة|حقيبه|حقيبة|bag|حزام|جزدان|wallet)/,
  },
  {
    name: "مجوهرات وإكسسوارات",
    re: /(خاتم|سلسله|سلسلة|اسوره|سوار|حلق|قلاده|محفظه|محفظة|نظاره|نضاره|اكسسوار|ring|necklace|bracelet)/,
  },
  {
    name: "سيارات",
    re: /(سياره|سيارة|عربيه|سيارات|car|شاحن سياره|منظف سياره|كفر سياره|مساحات|زيت محرك|كاميرا سياره|auto)/,
  },
];

const BILINGUAL = {
  ساعه: "watch",
  ساعة: "watch",
  ساعات: "watches",
  موبايل: "mobile",
  موبيل: "mobile",
  جوال: "mobile",
  هاتف: "phone",
  تليفون: "phone",
  ايفون: "iphone",
  لابتوب: "laptop",
  حاسوب: "computer",
  كمبيوتر: "computer",
  سماعه: "headphones",
  سماعة: "headphones",
  سماعات: "headphones",
  شاحن: "charger",
  حذاء: "shoes",
  جزمة: "shoes",
  كوتشي: "sneakers",
  قميص: "shirt",
  بنطلون: "pants",
  بنطال: "pants",
  فستان: "dress",
  جاكيت: "jacket",
  تيشرت: "t-shirt",
  عطر: "perfume",
  ميكب: "makeup",
  "ميك اب": "makeup",
  كريم: "cream",
  عسل: "honey",
  زيت: "oil",
  ارز: "rice",
  شاي: "tea",
  قهوه: "coffee",
  قهوة: "coffee",
  سكر: "sugar",
  ملح: "salt",
  حليب: "milk",
  جبنه: "cheese",
  خضار: "vegetables",
  فواكه: "fruits",
  لحم: "meat",
  دجاج: "chicken",
  سمك: "fish",
  بيض: "eggs",
  خبز: "bread",
  ماء: "water",
  عصير: "juice",
  كولا: "cola",
  شوكولاته: "chocolate",
  حلوى: "candy",
  بسكويت: "biscuit",
  كيك: "cake",
  شنطه: "bag",
  حقيبه: "bag",
  محفظه: "wallet",
  نظاره: "glasses",
  خاتم: "ring",
  سلسله: "chain",
  اسواره: "bracelet",
  ذهب: "gold",
  فضه: "silver",
  غرفه: "room",
  اثاث: "furniture",
  كرسي: "chair",
  طاوله: "table",
  سرير: "bed",
  خزانه: "cabinet",
  ستاير: "curtains",
  سجاده: "rug",
  لمبه: "lamp",
  ثلاجه: "fridge",
  غساله: "washer",
  مكنسه: "vacuum",
  مكيف: "ac",
  دفايه: "heater",
  مروحه: "fan",
  فرن: "oven",
  ميكروويف: "microwave",
  خلاط: "blender",
  غلايه: "kettle",
  كاميرا: "camera",
  طابعه: "printer",
  شاشه: "screen",
  ماوس: "mouse",
  كيبورد: "keyboard",
  بطاريه: "battery",
  تابلت: "tablet",
  لعبه: "toy",
  العاب: "toys",
  هديه: "gift",
  قلم: "pen",
  دفتر: "notebook",
  كتاب: "book",
  مسطره: "ruler",
  // Brands people commonly type in the other script.
  سامسونج: "samsung",
  ابل: "apple",
  شاومي: "xiaomi",
  هواوي: "huawei",
  ريلمي: "realme",
  اوبو: "oppo",
  نوكيا: "nokia",
  سوني: "sony",
  انكر: "anker",
  جيبي: "jbl",
  ديل: "dell",
  "اتش بي": "hp",
  لينوفو: "lenovo",
  توشيبا: "toshiba",
  فيليبس: "philips",
  كانون: "canon",
  نيكون: "nikon",
};

const DICTIONARY = new Map();

function addDictionaryPair(a, b) {
  if (!a || !b || a === b) return;
  if (!DICTIONARY.has(a)) DICTIONARY.set(a, new Set());
  DICTIONARY.get(a).add(b);
}

for (const [arabic, english] of Object.entries(BILINGUAL)) {
  const ar = normalizeArabic(arabic);
  const en = normalizeArabic(english);
  addDictionaryPair(ar, en);
  addDictionaryPair(en, ar);
}

function toLatinDigits(value) {
  return String(value || "").replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    return String(code - 0x06f0);
  });
}

function normalizeArabic(value) {
  let text = toLatinDigits(value).toLowerCase();
  text = text.replace(/[\u064B-\u065F\u0670\u0640]/g, "");
  text = text
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ئ/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ة/g, "ه");
  text = text.replace(/[^\p{L}\p{N}\s]/gu, " ");
  return text.replace(/\s+/g, " ").trim();
}

function latinize(value) {
  const map = {
    ا: "a", أ: "a", إ: "a", آ: "a", ب: "b", ت: "t", ث: "th", ج: "g",
    ح: "h", خ: "kh", د: "d", ذ: "z", ر: "r", ز: "z", س: "s", ش: "sh",
    ص: "s", ض: "d", ط: "t", ظ: "z", ع: "a", غ: "gh", ف: "f", ق: "k",
    ك: "k", ل: "l", م: "m", ن: "n", ه: "h", و: "o", ي: "i", ة: "h",
    ى: "a", ئ: "a", ء: "a",
  };
  return String(value || "")
    .toLowerCase()
    .split("")
    .map((character) => map[character] || character)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function stemArabic(word) {
  let stem = word
    .replace(/ات$/, "")
    .replace(/ون$/, "")
    .replace(/ين$/, "")
    .replace(/ان$/, "")
    .replace(/^ال/, "");
  const withoutTa = stem.replace(/[هة]$/, "");
  if (withoutTa.length >= 2) stem = withoutTa;
  if (stem.length < 2) stem = word.replace(/^ال/, "");
  return stem;
}

function deriveCategory(rawCategory, name) {
  const raw = String(rawCategory || "").trim();
  const normalizedName = normalizeArabic(name);
  // A name-based category is usually more specific than the stored value:
  // most rows say "product"/"bundle", and even "إلكترونيات" is too broad for
  // a watch or a blender. Rules win; the stored category is the fallback.
  for (const rule of CATEGORY_RULES) {
    if (rule.re.test(normalizedName)) return rule.name;
  }
  if (raw && !GENERIC_CATEGORIES.has(raw.toLowerCase())) return raw;
  return "منتجات متنوعة";
}

function pickImage(row) {
  const image = String(row.image || "").trim();
  if (image && !/\.(mp4|mov|webm|avi)(\?|$)/i.test(image)) return image;
  return "";
}

function normalizeCountry(value) {
  const code = String(value || "").toUpperCase().trim();
  if (!code) return "";
  const aliases = {
    EGY: "EG",
    EGYPT: "EG",
    مصر: "EG",
    SAU: "SA",
    KSA: "SA",
    "SAUDI ARABIA": "SA",
    "SAUDI-ARABIA": "SA",
    السعودية: "SA",
    ARE: "AE",
    UAE: "AE",
    الامارات: "AE",
    الإمارات: "AE",
    IRQ: "IQ",
    OMN: "OM",
  };
  return aliases[code] || code;
}

function rowMatchesCountry(row, country) {
  if (!country) return true;
  const countries = Array.isArray(row.available_countries)
    ? row.available_countries
    : [];
  if (countries.length) {
    return countries.some((entry) => normalizeCountry(entry) === country);
  }
  const direct = normalizeCountry(row.country || row.country_code);
  return direct ? direct === country : false;
}

function prepareRow(row) {
  if (!row || !row.id) return null;
  const name = String(row.name || "").trim();
  if (!name) return null;
  const category = deriveCategory(row.category, name);
  const brand = String(row.brand || "").trim();
  const image = pickImage(row);
  const normalizedName = normalizeArabic(name);
  const normalizedCategory = normalizeArabic(category);
  const normalizedBrand = normalizeArabic(brand);
  const latinName = latinize(normalizedName);

  return {
    id: String(row.id),
    name,
    category,
    rawCategory: String(row.category || ""),
    brand,
    price: Number(row.price) || 0,
    original_price: Number(row.original_price) || 0,
    image,
    available_countries: Array.isArray(row.available_countries)
      ? row.available_countries
      : [],
    stock: Number(row.stock) || 0,
    stock_status: String(row.stock_status || "").trim() || "in_stock",
    taager_product_id: String(row.taager_product_id || "").trim(),
    created_at: row.created_at || "",
    source: "taager",
    _name: normalizedName,
    _category: normalizedCategory,
    _brand: normalizedBrand,
    _latin: latinName,
    _haystack:
      normalizedName +
      " " +
      normalizedCategory +
      " " +
      normalizedBrand +
      " " +
      latinName,
  };
}

function publicRow(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    brand: row.brand,
    price: row.price,
    original_price: row.original_price || null,
    image: row.image,
    available_countries: row.available_countries,
    stock: row.stock,
    stock_status: row.stock_status,
    taager_product_id: row.taager_product_id,
    created_at: row.created_at,
    source: "taager",
  };
}

async function fetchJson(url, extraHeaders) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: "Bearer " + SUPABASE_KEY,
        Accept: "application/json",
        ...(extraHeaders || {}),
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Supabase returned ${response.status}`);
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPage(offset, withCount) {
  const url =
    `${SUPABASE_URL}/rest/v1/taager_products?select=${encodeURIComponent(LEAN_COLUMNS)}` +
    `&is_active=eq.true&order=created_at.desc,id.asc` +
    `&limit=${PAGE_SIZE}&offset=${offset}`;
  const response = await fetchJson(
    url,
    withCount ? { Prefer: "count=exact" } : undefined
  );
  const rows = await response.json();
  return {
    rows: Array.isArray(rows) ? rows : [],
    total: parseContentRange(response.headers.get("content-range")),
  };
}

function parseContentRange(value) {
  const match = String(value || "").match(/\/(\d+)\s*$/);
  return match ? Number(match[1]) : 0;
}

async function fetchCatalogRows() {
  const first = await fetchPage(0, true);
  if (first.rows.length < PAGE_SIZE) return first.rows;

  const total = Math.min(first.total || 0, MAX_ROWS);
  if (total <= PAGE_SIZE) {
    // No count header (some proxies strip it): walk pages until a short one.
    if (!first.total) {
      const rows = first.rows.slice();
      for (let offset = PAGE_SIZE; offset < MAX_ROWS; offset += PAGE_SIZE) {
        const page = await fetchPage(offset);
        rows.push(...page.rows);
        if (page.rows.length < PAGE_SIZE) break;
      }
      return rows;
    }
    return first.rows;
  }

  const pageCount = Math.ceil(total / PAGE_SIZE);
  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) =>
      fetchPage((index + 1) * PAGE_SIZE)
        .then((page) => page.rows)
        .catch(() => [])
    )
  );

  const rows = first.rows.slice();
  for (const page of rest) rows.push(...page);
  return rows;
}

let cache = {
  at: 0,
  rows: [],
  byId: new Map(),
  promise: null,
};

async function refreshCatalog() {
  const rawRows = await fetchCatalogRows();
  const rows = rawRows.map(prepareRow).filter(Boolean);
  if (!rows.length) {
    throw new Error("Catalog is empty");
  }
  const byId = new Map();
  for (const row of rows) byId.set(row.id, row);
  cache = { at: Date.now(), rows, byId, promise: null };
  return cache;
}

/**
 * Returns the prepared catalog. Stale data is served immediately while a
 * refresh runs in the background, so a Supabase hiccup never blanks the shop.
 */
export async function getCatalog(options = {}) {
  const force = Boolean(options.force);
  const fresh = cache.rows.length && Date.now() - cache.at < CACHE_TTL_MS;

  if (fresh && !force) return cache.rows;

  if (!cache.rows.length) {
    if (!cache.promise) {
      cache.promise = refreshCatalog().finally(() => {
        cache.promise = null;
      });
    }
    return (await cache.promise).rows;
  }

  // Serve stale data and refresh silently.
  if (!cache.promise) {
    cache.promise = refreshCatalog()
      .catch(() => null)
      .finally(() => {
        cache.promise = null;
      });
  }
  return cache.rows;
}

export async function getCatalogRowById(id) {
  const wanted = String(id || "").trim();
  if (!wanted) return null;
  const rows = await getCatalog();
  const found = cache.byId.get(wanted);
  if (found) return found;
  const lowered = wanted.toLowerCase();
  return (
    rows.find((row) => row.id.toLowerCase() === lowered) ||
    rows.find(
      (row) =>
        row.taager_product_id &&
        row.taager_product_id.toLowerCase() === lowered
    ) ||
    null
  );
}

function tokenVariants(token) {
  const variants = new Set();
  const add = (value) => {
    const normalized = normalizeArabic(value);
    if (normalized.length >= 2) variants.add(normalized);
  };

  add(token);
  add(stemArabic(token));
  // Arabic sound feminine plural: ساعة ↔ ساعات، لعبة ↔ لعبات.
  if (/ه$/.test(token) && token.length > 2) add(token.slice(0, -1) + "ات");
  if (/ات$/.test(token) && token.length > 3) add(token.slice(0, -2) + "ه");
  const direct = DICTIONARY.get(token);
  if (direct) direct.forEach(add);
  const stemmed = DICTIONARY.get(stemArabic(token));
  if (stemmed) stemmed.forEach(add);

  // English plurals and simple suffixes.
  if (/^[a-z0-9]+s$/.test(token) && token.length > 3) add(token.slice(0, -1));
  if (/^[a-z0-9]+es$/.test(token) && token.length > 4) add(token.slice(0, -2));

  // Cross-script: when the query is Latin, map it back through the dictionary.
  if (/^[a-z0-9]/.test(token)) {
    for (const [key, values] of DICTIONARY) {
      if (values.has(token) || values.has(token + "s")) add(key);
    }
  }

  return Array.from(variants);
}

// Short Arabic stems are dangerous as raw substrings: "ابل" (Apple) appears
// inside "قابل" and "ايف" inside "ايفا". Require a full word for those, while
// longer variants keep the faster substring match.
function containsVariant(haystack, variant) {
  if (!haystack || !variant) return false;
  if (variant.length <= 3 && /[\u0600-\u06FF]/.test(variant)) {
    return (" " + haystack + " ").includes(" " + variant + " ");
  }
  return haystack.includes(variant);
}

function tokenScore(row, variants) {
  let best = 0;
  for (const variant of variants) {
    if (!variant) continue;
    if (containsVariant(row._name, variant)) {
      best = Math.max(best, 14);
    } else if (containsVariant(row._latin, variant)) {
      best = Math.max(best, 11);
    } else if (containsVariant(row._category, variant) || containsVariant(row._brand, variant)) {
      best = Math.max(best, 6);
    } else if (containsVariant(row._haystack, variant)) {
      best = Math.max(best, 3);
    }
  }
  return best;
}

function scoreRow(row, phrase, tokens, variantsByToken) {
  let score = 0;
  let matched = 0;

  if (row._name === phrase) score += 120;
  else if (row._name.startsWith(phrase)) score += 60;
  if (row._name.includes(phrase)) score += 35;
  if (row._latin.includes(phrase)) score += 20;

  for (let index = 0; index < tokens.length; index += 1) {
    const value = tokenScore(row, variantsByToken[index]);
    if (!value) continue;
    matched += 1;
    score += value;
  }

  if (matched !== tokens.length) return { score: 0, matched };
  return { score, matched };
}

function dedupeKey(row) {
  return row._name + "|" + Math.round(row.price);
}

function categoryFacets(rows) {
  const counts = new Map();
  for (const row of rows) {
    counts.set(row.category, (counts.get(row.category) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
}

function brandFacets(rows) {
  const counts = new Map();
  for (const row of rows) {
    if (!row.brand) continue;
    counts.set(row.brand, (counts.get(row.brand) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

function sortScored(a, b) {
  if (b.score !== a.score) return b.score - a.score;
  return String(b.row.created_at).localeCompare(String(a.row.created_at));
}

export function searchCatalog(rows, query, options = {}) {
  const country = normalizeCountry(options.country || "");
  const limit = Math.max(1, Math.min(Number(options.limit) || 60, 500));
  const offset = Math.max(0, Number(options.offset) || 0);

  const phrase = normalizeArabic(query);
  const pool = country
    ? rows.filter((row) => rowMatchesCountry(row, country))
    : rows;

  if (!phrase) {
    return {
      total: 0,
      items: [],
      facets: { categories: [], brands: [] },
    };
  }

  const tokens = phrase.split(" ").filter(Boolean).slice(0, 8);
  const variantsByToken = tokens.map(tokenVariants);
  const scored = [];

  for (const row of pool) {
    const result = scoreRow(row, phrase, tokens, variantsByToken);
    if (result.score > 0) scored.push({ row, score: result.score, matched: result.matched });
  }

  // If no product matched every token, fall back to partial matches. The first
  // token is the product noun in almost every query ("ساعات رجالي",
  // "سماعة بلوتوث"), so it must match; the remaining words only improve rank.
  if (!scored.length && tokens.length > 1) {
    for (const row of pool) {
      const firstScore = tokenScore(row, variantsByToken[0]);
      if (!firstScore) continue;
      let score = firstScore;
      let matched = 1;
      for (let index = 1; index < tokens.length; index += 1) {
        const value = tokenScore(row, variantsByToken[index]);
        if (value) {
          matched += 1;
          score += value;
        }
      }
      if (tokens.length === 2 || matched >= Math.ceil(tokens.length / 2)) {
        scored.push({ row, score, matched });
      }
    }
  }

  scored.sort(sortScored);

  const seen = new Set();
  const unique = [];
  for (const entry of scored) {
    const key = dedupeKey(entry.row);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(entry);
  }

  const categories = categoryFacets(unique.map((entry) => entry.row));
  const brands = brandFacets(unique.map((entry) => entry.row));
  const page = unique.slice(offset, offset + limit).map((entry) => publicRow(entry.row));

  return {
    total: unique.length,
    items: page,
    facets: { categories, brands },
  };
}

export function suggestCatalog(rows, query, options = {}) {
  const country = normalizeCountry(options.country || "");
  const limit = Math.max(1, Math.min(Number(options.limit) || 8, 20));
  const phrase = normalizeArabic(query);
  if (!phrase) return [];

  const pool = country
    ? rows.filter((row) => rowMatchesCountry(row, country))
    : rows;

  const tokens = phrase.split(" ").filter(Boolean).slice(0, 6);
  const variantsByToken = tokens.map(tokenVariants);
  const scored = [];

  for (const row of pool) {
    const result = scoreRow(row, phrase, tokens, variantsByToken);
    if (!result.score) continue;
    scored.push({ row, score: result.score });
  }

  scored.sort(sortScored);

  const seen = new Set();
  const suggestions = [];

  // Categories first when they directly match the typed prefix.
  for (const facet of categoryFacets(scored.map((entry) => entry.row))) {
    const normalized = normalizeArabic(facet.name);
    if (!normalized.includes(phrase)) continue;
    if (seen.has(facet.name)) continue;
    seen.add(facet.name);
    suggestions.push(facet.name);
    if (suggestions.length >= Math.min(3, limit)) break;
  }

  for (const entry of scored) {
    const name = entry.row.name.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    suggestions.push(name);
    if (suggestions.length >= limit) break;
  }

  return suggestions;
}

export { normalizeArabic, normalizeCountry, rowMatchesCountry };