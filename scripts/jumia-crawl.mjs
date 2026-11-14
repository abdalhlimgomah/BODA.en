#!/usr/bin/env node
/**
 * Jumia Egypt catalog crawler.
 *
 * JForce (the affiliate program) does not expose a product feed, so this
 * script builds a local snapshot from Jumia's public category pages. Jumia's
 * robots.txt allows automated reads when the bot identifies its owner and
 * stays under 200 requests/minute; we crawl sequentially with a delay and an
 * honest user-agent.
 *
 * Output: api/_lib/jumia-products.js (a plain ES module, so Vercel bundles it
 * without runtime filesystem access).
 *
 * Two providers are supported:
 *   --provider apish  API.SH's Jumia JSON API (fast, 1,000 free calls/month).
 *                     Requires APISH_KEY in the environment.
 *   --provider html   Public category pages (slow, retries, no key).
 *   --provider auto   API.SH when APISH_KEY exists, HTML otherwise.
 *
 * Usage:
 *   node scripts/jumia-crawl.mjs                    # default seed set
 *   node scripts/jumia-crawl.mjs --seeds 20 --pages 2
 *   node scripts/jumia-crawl.mjs --slug phones-tablets --pages 3
 *   node scripts/jumia-crawl.mjs --parse-file sample.html
 *   node scripts/jumia-crawl.mjs --import-file sample.html
 *   APISH_KEY=... node scripts/jumia-crawl.mjs --provider apish --budget 120
 *
 * Progress is checkpointed in .jumia-crawl-cache.json, so re-running resumes
 * where the last run stopped instead of re-fetching every page.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_FILE = path.join(ROOT, "api", "_lib", "jumia-products.js");
const CACHE_FILE = path.join(ROOT, ".jumia-crawl-cache.json");

const ORIGIN = "https://www.jumia.com.eg";
const BOT_UA =
  "BudoQCatalogBot/1.0 (+https://budoq.com/pages/contact.html)";
const REQUEST_DELAY_MS = 1800;
const REQUEST_TIMEOUT_MS = 80000;
const MAX_RETRIES = 4;

// Curated seed categories. Top-level departments first, then popular
// sub-categories. All slugs are verified against Jumia EG's category sitemap.
const DEFAULT_SEEDS = [
  // Top-level departments
  { slug: "category-fashion-by-jumia", pages: 2 },
  { slug: "phones-tablets", pages: 3 },
  { slug: "health-beauty", pages: 2 },
  { slug: "home-office", pages: 2 },
  { slug: "electronic-television-video", pages: 2 },
  { slug: "baby-products", pages: 2 },
  { slug: "groceries", pages: 2 },
  { slug: "computing", pages: 2 },
  { slug: "sporting-goods", pages: 2 },
  { slug: "video-games", pages: 2 },
  // Phones / computing
  { slug: "mobile-phones", pages: 2 },
  { slug: "smartphones", pages: 2 },
  { slug: "android-phones", pages: 2 },
  { slug: "ios-phones", pages: 2 },
  { slug: "tablets", pages: 2 },
  { slug: "mobile-accessories", pages: 2 },
  { slug: "musical-headphones", pages: 2 },
  { slug: "mobile-phone-cases-d", pages: 2 },
  { slug: "laptops", pages: 2 },
  { slug: "gaming-laptops", pages: 2 },
  { slug: "desktop-computers", pages: 2 },
  { slug: "monitors", pages: 2 },
  { slug: "computer-accessories", pages: 2 },
  { slug: "flash-drives", pages: 2 },
  { slug: "networking", pages: 2 },
  // TV / audio / cameras / gaming
  { slug: "televisions", pages: 2 },
  { slug: "audio-speakers", pages: 2 },
  { slug: "cameras", pages: 2 },
  { slug: "cameras-camcorders", pages: 2 },
  { slug: "playstation-5", pages: 2 },
  { slug: "xbox-one", pages: 2 },
  { slug: "nintendo-ds", pages: 2 },
  // Home appliances
  { slug: "appliances-fridges-freezers", pages: 2 },
  { slug: "air-conditioning", pages: 2 },
  { slug: "wall-air-conditioners", pages: 2 },
  { slug: "split-air-conditioners", pages: 2 },
  { slug: "standing-fan", pages: 2 },
  { slug: "ceiling-fans", pages: 2 },
  { slug: "space-heaters", pages: 2 },
  { slug: "water-heaters", pages: 2 },
  { slug: "blenders", pages: 2 },
  { slug: "food-processors", pages: 2 },
  { slug: "rice-cooker", pages: 2 },
  { slug: "slow-cooker", pages: 2 },
  { slug: "wall-ovens", pages: 2 },
  { slug: "irons", pages: 2 },
  // Home / furniture
  { slug: "bed-frame", pages: 2 },
  { slug: "bunk-beds", pages: 2 },
  { slug: "dining-chair", pages: 2 },
  { slug: "area-rugs", pages: 2 },
  { slug: "bath-rugs", pages: 2 },
  { slug: "wall-art", pages: 2 },
  { slug: "led-lamps", pages: 2 },
  { slug: "bedding", pages: 2 },
  { slug: "home-decor", pages: 2 },
  // Fashion
  { slug: "men-clothing", pages: 2 },
  { slug: "mens-shoes", pages: 2 },
  { slug: "womens-shoes", pages: 2 },
  { slug: "womens-bags", pages: 2 },
  { slug: "mens-watches", pages: 2 },
  { slug: "women-watches", pages: 2 },
  { slug: "smart-watches", pages: 2 },
  { slug: "mens-sunglasses", pages: 2 },
  { slug: "womens-sunglasses", pages: 2 },
  { slug: "mens-jewelry", pages: 2 },
  { slug: "womens-rings", pages: 2 },
  // Beauty / health
  { slug: "fragrances-allgenders", pages: 2 },
  { slug: "mens-fragrances", pages: 2 },
  { slug: "womens-fragrances", pages: 2 },
  { slug: "skin-care-creams", pages: 2 },
  { slug: "skin-care-serums", pages: 2 },
  { slug: "body-skin-care", pages: 2 },
  { slug: "eye-makeup", pages: 2 },
  { slug: "lipstick-makeup", pages: 2 },
  { slug: "makeup-kits", pages: 2 },
  { slug: "hair-care-d", pages: 2 },
  { slug: "hair-shampoos-d", pages: 2 },
  { slug: "oral-care", pages: 2 },
  // Baby / toys
  { slug: "baby-car-seats", pages: 2 },
  { slug: "baby-strollers", pages: 2 },
  { slug: "baby-diapering", pages: 2 },
  { slug: "dolls", pages: 2 },
  { slug: "toys-games", pages: 2 },
  { slug: "puzzles", pages: 2 },
  { slug: "plush-toys", pages: 2 },
  // Groceries / drinks
  { slug: "beverages", pages: 2 },
  { slug: "tea", pages: 2 },
  { slug: "black-tea", pages: 2 },
  { slug: "dog-food", pages: 2 },
  { slug: "cat-litter", pages: 2 },
  // Sports / auto / tools
  { slug: "sports-fitness", pages: 2 },
  { slug: "exercise-fitness", pages: 2 },
  { slug: "football", pages: 2 },
  { slug: "cycling", pages: 2 },
  { slug: "swimming", pages: 2 },
  { slug: "fishing", pages: 2 },
  { slug: "automobile", pages: 2 },
  { slug: "car-care", pages: 2 },
  { slug: "hand-tools", pages: 2 },
  { slug: "industrial-scientific", pages: 2 },
  { slug: "musical-instruments", pages: 2 },
  { slug: "pet-supplies", pages: 2 },
  { slug: "luggage", pages: 2 },
];

// Jumia serves category names in English analytics attributes. Translate the
// department so facets and home sections read naturally in Arabic.
const DEPARTMENT_AR = {
  "phones & tablets": "موبايلات وتابلت",
  electronics: "إلكترونيات",
  computing: "كمبيوتر",
  "home & office": "منزل ومكتب",
  "home & furniture": "منزل وأثاث",
  "health & beauty": "صحة وجمال",
  fashion: "أزياء",
  "baby products": "منتجات أطفال",
  groceries: "بقالة",
  "sporting goods": "منتجات رياضية",
  automobile: "سيارات",
  "video games": "ألعاب فيديو",
  appliances: "أجهزة منزلية",
  "large appliances": "أجهزة منزلية كبيرة",
  "small appliances": "أجهزة منزلية صغيرة",
  books: "كتب",
  "industrial & scientific": "أدوات صناعية",
  "pet supplies": "مستلزمات حيوانات",
  "musical instruments": "آلات موسيقية",
  "luggage & travel": "حقائب وسفر",
  toys: "ألعاب",
  "office products": "مستلزمات مكتبية",
  "sports & outdoors": "رياضة وهواء طلق",
};

// Second-level translations for the most common departments.
const SUBCATEGORY_AR = {
  "mobile phones": "موبايلات",
  smartphones: "هواتف ذكية",
  "ios phones": "آيفون",
  "android phones": "هواتف أندرويد",
  tablets: "تابلت",
  "mobile accessories": "ملحقات موبايل",
  headphones: "سماعات",
  "headphones & earphones": "سماعات",
  laptops: "لابتوب",
  "desktop computers": "كمبيوتر مكتبي",
  monitors: "شاشات",
  televisions: "تلفزيونات",
  cameras: "كاميرات",
  "video games": "ألعاب فيديو",
  "air conditioners": "تكييفات",
  fans: "مراوح",
  heaters: "دفايات",
  "large appliances": "أجهزة كبيرة",
  "small appliances": "أجهزة صغيرة",
  blenders: "خلاطات",
  "home & kitchen": "منزل ومطبخ",
  furniture: "أثاث",
  "bedding": "مفروشات",
  "home decor": "ديكور",
  "men's clothing": "ملابس رجالي",
  "women's clothing": "ملابس حريمي",
  "men's shoes": "أحذية رجالي",
  "women's shoes": "أحذية حريمي",
  bags: "شنط",
  watches: "ساعات",
  "sunglasses": "نظارات شمسية",
  jewelry: "مجوهرات",
  perfumes: "عطور",
  fragrances: "عطور",
  "skin care": "عناية بالبشرة",
  makeup: "مكياج",
  "hair care": "عناية بالشعر",
  "oral care": "عناية بالفم",
  "baby products": "منتجات أطفال",
  "baby gear": "مستلزمات أطفال",
  "car seats": "كراسي سيارة",
  strollers: "عربات أطفال",
  diapers: "حفاضات",
  toys: "ألعاب",
  "food & beverages": "أطعمة ومشروبات",
  beverages: "مشروبات",
  tea: "شاي",
  "sports & fitness": "رياضة ولياقة",
  football: "كورة قدم",
  cycling: "دراجات",
  swimming: "سباحة",
  fishing: "صيد",
  "car care": "عناية بالسيارة",
  "tools & home improvement": "أدوات",
  "pet supplies": "مستلزمات حيوانات",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(parseInt(code, 16))
    );
}

function toLatinDigits(value) {
  return String(value || "").replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return code >= 0x0660 && code <= 0x0669
      ? String(code - 0x0660)
      : String(code - 0x06f0);
  });
}

function parsePrice(text) {
  const normalized = toLatinDigits(String(text || "").replace(/&nbsp;/g, " "));
  const match = normalized.match(/([\d][\d,]*(?:\.\d+)?)/);
  if (!match) return 0;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function absoluteUrl(href) {
  const raw = decodeEntities(String(href || "").trim());
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return ORIGIN + (raw.startsWith("/") ? raw : "/" + raw);
}

function translateCategory(rawCategory) {
  const parts = String(rawCategory || "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return "منتجات جوميا";
  const department = DEPARTMENT_AR[parts[0].toLowerCase()];
  const sub =
    parts.length > 1 ? SUBCATEGORY_AR[parts[1].toLowerCase()] : "";
  if (department && sub && sub !== department) return department;
  if (department) return department;
  if (sub) return sub;
  return parts[parts.length - 1] || "منتجات جوميا";
}

function parseCards(html) {
  const products = [];
  const marker = '<article class="prd';
  let cursor = 0;

  while (true) {
    const start = html.indexOf(marker, cursor);
    if (start === -1) break;
    const end = html.indexOf("</article>", start);
    if (end === -1) break;
    const block = html.slice(start, end);
    cursor = end + 10;

    const urlMatch = block.match(
      /<a[^>]+href="([^"]+\.html[^"]*)"[^>]*class="core"/
    ) || block.match(/<a[^>]+class="core"[^>]+href="([^"]+\.html[^"]*)"/);
    const skuMatch =
      block.match(/data-gtm-id="([^"]+)"/) ||
      block.match(/data-sku="([^"]+)"/);
    const nameMatch =
      block.match(/data-gtm-name="([^"]+)"/) ||
      block.match(/<h3[^>]*class="name"[^>]*>([\s\S]*?)<\/h3>/);
    if (!urlMatch || !skuMatch || !nameMatch) continue;

    const name = decodeEntities(
      String(nameMatch[1]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    );
    if (!name) continue;

    const priceMatch = block.match(
      /<div[^>]*class="prc[^"]*"[^>]*>([\s\S]*?)<\/div>/
    );
    const price = parsePrice(priceMatch ? priceMatch[1] : "");
    if (!price) continue;

    const oldMatch = block.match(
      /<div[^>]*class="old"[^>]*>([\s\S]*?)<\/div>/
    );
    const originalPrice = parsePrice(oldMatch ? oldMatch[1] : "");

    const imageMatch =
      block.match(/data-src="([^"]+)"/) ||
      block.match(/<img[^>]+src="(https?:\/\/[^"]+)"/);
    const brandMatch = block.match(/data-gtm-brand="([^"]*)"/);
    const categoryMatch = block.match(/data-gtm-category="([^"]*)"/);
    const ratingMatch = block.match(
      /class="rev"[^>]*>[\s\S]*?([\d.]+)\s*(?:out of|من)\s*5/i
    );
    const reviewsMatch = block.match(
      /class="rev"[^>]*>[\s\S]*?\(([\d,]+)\)/
    );

    const sku = decodeEntities(skuMatch[1]).trim();
    products.push({
      sku,
      name,
      brand: decodeEntities(brandMatch ? brandMatch[1] : "").trim(),
      category: translateCategory(
        decodeEntities(categoryMatch ? categoryMatch[1] : "")
      ),
      category_raw: decodeEntities(
        categoryMatch ? categoryMatch[1] : ""
      ).trim(),
      price,
      original_price:
        originalPrice > price ? originalPrice : 0,
      image: absoluteUrl(imageMatch ? imageMatch[1] : ""),
      url: absoluteUrl(urlMatch[1]),
      rating: ratingMatch ? Number(ratingMatch[1]) || 0 : 0,
      reviews: reviewsMatch ? Number(reviewsMatch[1].replace(/,/g, "")) || 0 : 0,
    });
  }

  return products;
}

async function fetchHtml(url, attempt = 1) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": BOT_UA,
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "ar-EG,ar;q=0.9,en;q=0.6",
        "cache-control": "no-cache",
      },
    });
    const body = await response.text();
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      error.retryAfter = response.headers.get("retry-after");
      throw error;
    }
    if (!/<article class="prd/.test(body)) {
      const error = new Error("No product cards in response");
      error.status = 503;
      throw error;
    }
    return body;
  } catch (error) {
    if (attempt >= MAX_RETRIES) throw error;
    const status = Number(error.status) || 0;
    const wait =
      status === 503
        ? 45000 + attempt * 15000
        : 5000 * Math.pow(2, attempt - 1);
    console.warn(
      `  retry ${attempt}/${MAX_RETRIES} in ${Math.round(wait / 1000)}s: ${
        error.message
      }`
    );
    await sleep(wait);
    return fetchHtml(url, attempt + 1);
  } finally {
    clearTimeout(timer);
  }
}

function mapApishProduct(product) {
  const categories = Array.isArray(product.categories)
    ? product.categories.filter(Boolean)
    : [];
  const price = Number(product.price) || 0;
  const oldPrice = Number(product.old_price) || 0;
  return {
    sku: String(product.sku || "").trim(),
    name: decodeEntities(product.name || "").trim(),
    brand: decodeEntities(product.brand || "").trim(),
    category: translateCategory(categories.slice(0, 2).join("/")),
    category_raw: categories.join("/"),
    price,
    original_price: oldPrice > price ? oldPrice : 0,
    image: product.image || (product.images && product.images[0]) || "",
    url: absoluteUrl(product.url || ""),
    rating: Number(product.rating) || 0,
    reviews: Number(product.ratings_count) || 0,
  };
}

async function fetchApish(seed, page, budgetState) {
  const key = String(process.env.APISH_KEY || "").trim();
  if (!key) throw new Error("APISH_KEY is not set");
  if (budgetState.used >= budgetState.budget) {
    throw new Error(`API.SH budget reached (${budgetState.budget} calls)`);
  }

  const url = new URL("https://api.api.sh/jumia/v1/search");
  url.searchParams.set("country", "eg");
  url.searchParams.set("category", seed.slug);
  url.searchParams.set("sort", "popularity");
  url.searchParams.set("page", String(page));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    budgetState.used += 1;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "x-api-key": key,
        accept: "application/json",
        "user-agent": BOT_UA,
      },
    });
    const body = await response.text();
    let data = null;
    try {
      data = JSON.parse(body);
    } catch {
      data = null;
    }
    if (!response.ok || !data || data.success === false) {
      const message =
        (data && (data.error || data.message)) ||
        `HTTP ${response.status}: ${body.slice(0, 160)}`;
      throw new Error(String(message));
    }
    const products = Array.isArray(data.products)
      ? data.products.map(mapApishProduct).filter((p) => p.sku && p.name && p.price)
      : [];
    return {
      products,
      total: Number(data.total) || 0,
      totalPages: Number(data.total_pages) || 0,
      credits: Number(data.credits_used) || 1,
    };
  } finally {
    clearTimeout(timer);
  }
}

function loadCache() {
  try {
    const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveCache(cache) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), "utf8");
  } catch (error) {
    console.warn("Could not write crawl cache:", error.message);
  }
}

function buildSnapshot(products, meta) {
  const unique = new Map();
  for (const product of products) {
    if (!product.sku || !product.name || !product.url) continue;
    const key = product.sku;
    const existing = unique.get(key);
    if (!existing || product.price < existing.price) {
      unique.set(key, product);
    }
  }
  const rows = Array.from(unique.values()).sort(
    (a, b) => (b.reviews || 0) - (a.reviews || 0) || a.name.localeCompare(b.name)
  );

  const body = rows
    .map(
      (row) =>
        "  " +
        JSON.stringify({
          id: "jumia_" + row.sku,
          sku: row.sku,
          name: row.name,
          brand: row.brand || "",
          category: row.category || "منتجات جوميا",
          price: row.price,
          original_price: row.original_price || 0,
          image: row.image || "",
          url: row.url,
          rating: row.rating || 0,
          reviews: row.reviews || 0,
          available_countries: ["EG"],
        })
    )
    .join(",\n");

  const content =
    "/**\n" +
    " * Generated by scripts/jumia-crawl.mjs — do not edit by hand.\n" +
    ` * Jumia Egypt snapshot: ${rows.length} products.\n` +
    ` * Generated at: ${meta.generated_at}\n` +
    " */\n\n" +
    "export const JUMIA_META = " +
    JSON.stringify(meta, null, 2) +
    ";\n\n" +
    "export const JUMIA_PRODUCTS = [\n" +
    body +
    "\n];\n";

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, content, "utf8");
  return rows.length;
}

function parseArgs(argv) {
  const args = {
    pages: null,
    seeds: null,
    slug: null,
    parseFile: null,
    importFile: null,
    provider: "auto",
    budget: 500,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === "--pages") {
      args.pages = Math.max(1, Number(value) || 1);
      i += 1;
    } else if (key === "--seeds") {
      args.seeds = Math.max(1, Number(value) || 1);
      i += 1;
    } else if (key === "--slug") {
      args.slug = String(value || "").trim();
      i += 1;
    } else if (key === "--parse-file") {
      args.parseFile = String(value || "").trim();
      i += 1;
    } else if (key === "--import-file") {
      args.importFile = String(value || "").trim();
      i += 1;
    } else if (key === "--provider") {
      args.provider = String(value || "auto").toLowerCase();
      i += 1;
    } else if (key === "--budget") {
      args.budget = Math.max(1, Number(value) || 1);
      i += 1;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.parseFile) {
    const html = fs.readFileSync(args.parseFile, "utf8");
    const products = parseCards(html);
    console.log(JSON.stringify(products.slice(0, 3), null, 2));
    console.log(`parsed ${products.length} products from ${args.parseFile}`);
    return;
  }

  if (args.importFile) {
    const html = fs.readFileSync(args.importFile, "utf8");
    const products = parseCards(html);
    const meta = {
      source: "jumia",
      country: "EG",
      generated_at: new Date().toISOString(),
      seeds: [],
      imported_from: path.basename(args.importFile),
      request_count: 0,
    };
    const count = buildSnapshot(products, meta);
    console.log(`Imported ${count} products from ${args.importFile}`);
    return;
  }

  const provider =
    args.provider === "auto"
      ? process.env.APISH_KEY
        ? "apish"
        : "html"
      : args.provider;

  let seeds = DEFAULT_SEEDS;
  if (args.slug) {
    seeds = [{ slug: args.slug.replace(/^\/+|\/+$/g, ""), pages: args.pages || 2 }];
  } else if (args.seeds) {
    seeds = seeds.slice(0, args.seeds);
  }
  if (args.pages) {
    seeds = seeds.map((seed) => ({ ...seed, pages: args.pages }));
  }

  const cache = loadCache();
  const all = [];
  for (const slug of Object.keys(cache)) {
    if (Array.isArray(cache[slug])) all.push(...cache[slug]);
  }

  let requestCount = 0;
  const budgetState = { used: 0, budget: args.budget };
  const startedAt = Date.now();

  console.log(`Provider: ${provider}`);

  for (let index = 0; index < seeds.length; index += 1) {
    const seed = seeds[index];
    console.log(
      `\n[${index + 1}/${seeds.length}] ${seed.slug} (${seed.pages} page${
        seed.pages > 1 ? "s" : ""
      })`
    );

    for (let page = 1; page <= seed.pages; page += 1) {
      const cacheKey =
        (provider === "apish" ? "apish:" : "html:") + seed.slug + "#" + page;
      if (Array.isArray(cache[cacheKey]) && cache[cacheKey].length) {
        console.log(`  page ${page}: cached (${cache[cacheKey].length})`);
        all.push(...cache[cacheKey]);
        continue;
      }

      try {
        if (provider === "apish") {
          if (budgetState.used >= budgetState.budget) {
            console.log(`  budget reached (${budgetState.budget} calls); stopping`);
            index = seeds.length;
            break;
          }
          const result = await fetchApish(seed, page, budgetState);
          console.log(
            `  page ${page}: ${result.products.length} products ` +
              `(${result.total} available, ${budgetState.used}/${budgetState.budget} calls)`
          );
          cache[cacheKey] = result.products;
          all.push(...result.products);
          saveCache(cache);
          if (!result.products.length) break;
        } else {
          const url =
            `${ORIGIN}/ar/${seed.slug}/` + (page > 1 ? `?page=${page}` : "");
          console.log(`  page ${page}: ${url}`);
          if (requestCount > 0) {
            const jitter = Math.floor(Math.random() * 900);
            await sleep(REQUEST_DELAY_MS + jitter);
          }
          requestCount += 1;
          const html = await fetchHtml(url);
          const products = parseCards(html);
          console.log(`  parsed ${products.length} products`);
          cache[cacheKey] = products;
          all.push(...products);
          saveCache(cache);
        }
      } catch (error) {
        console.warn(`  skipped: ${error.message}`);
      }
    }

    // Checkpoint the snapshot after every seed so a crash never loses work.
    const meta = {
      source: "jumia",
      country: "EG",
      generated_at: new Date().toISOString(),
      provider,
      seeds: seeds.map((seed) => seed.slug),
      request_count: provider === "apish" ? budgetState.used : requestCount,
    };
    const count = buildSnapshot(all, meta);
    console.log(`  snapshot now holds ${count} unique products`);
  }

  const meta = {
    source: "jumia",
    country: "EG",
    generated_at: new Date().toISOString(),
    provider,
    seeds: seeds.map((seed) => seed.slug),
    request_count: provider === "apish" ? budgetState.used : requestCount,
    duration_seconds: Math.round((Date.now() - startedAt) / 1000),
  };
  const count = buildSnapshot(all, meta);
  saveCache(cache);
  console.log(
    `\nDone: ${count} products, ${
      provider === "apish" ? budgetState.used + " API.SH calls" : requestCount + " requests"
    }, ${meta.duration_seconds}s`
  );
  console.log(`Wrote ${path.relative(ROOT, OUT_FILE)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});