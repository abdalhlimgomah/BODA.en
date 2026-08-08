import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TAAGER_API_BASE = "https://merchant.api.taager.com/api";
const TAAGER_JWT_TOKEN = Deno.env.get("TAAGER_JWT_TOKEN") || "";
const TAAGER_TAAGER_ID = Deno.env.get("TAAGER_TAAGER_ID") || "2226119";
const TAAGER_SESSION_KEY = Deno.env.get("TAAGER_SESSION_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const TAAGER_SYNC_SECRET = Deno.env.get("TAAGER_SYNC_SECRET") || "";
const DEFAULT_COUNTRIES = ["EG", "SA"];
const TAAGER_PRODUCTS_PAGE_SIZE = 100;
const TAAGER_MAX_PAGES = 50;

// Rate limiting
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 50;

async function checkRateLimit(ip: string, fn: string): Promise<{allowed:boolean;retryAfter?:number}> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return { allowed: true };
  const sb = getSupabaseAdmin();
  if (!sb) return { allowed: true };
  const ws = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  try {
    const { count } = await sb.from("api_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("ip", ip).eq("function_name", fn).gt("created_at", ws);
    if (count && count >= RATE_LIMIT_MAX) return { allowed: false, retryAfter: 60 };
    sb.from("api_rate_limits").insert({ ip, function_name: fn }).catch(() => {});
    return { allowed: true };
  } catch { return { allowed: true }; }
}

type JsonRecord = Record<string, unknown>;

type HttpError = Error & {
  status?: number;
};

function createHttpError(status: number, message: string): HttpError {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
}

function buildHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    taagerId: TAAGER_TAAGER_ID,
    "ui-session-key": TAAGER_SESSION_KEY,
  };
  if (TAAGER_JWT_TOKEN) {
    headers.Authorization = `Bearer ${TAAGER_JWT_TOKEN}`;
  }
  return headers;
}

const COUNTRY_MAP: Record<string, string> = {
  EG: "EGY",
  SA: "SAU",
  AE: "ARE",
  IQ: "IRQ",
  OM: "OMN",
};

function mapCountry(code: string): string {
  return COUNTRY_MAP[code.toUpperCase()] || code.toUpperCase();
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization, apikey, x-sync-secret",
};

function respond(body: string, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", ...extraHeaders },
  });
}

function fixArabicText(text: string): string {
  if (!text) return text;
  if (/^[\u0000-\u00FF\u0080-\u00FF]*$/.test(text)) {
    try {
      const bytes = new Uint8Array(text.split("").map((c) => c.charCodeAt(0) & 0xFF));
      const decoded = new TextDecoder("utf-8").decode(bytes);
      if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(decoded)) {
        return decoded;
      }
    } catch {
      // fallback
    }
  }
  return text;
}

function sanitizeText(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const fixed = fixArabicText(text);
  const lowered = fixed.toLowerCase();
  if (lowered === "null" || lowered === "undefined" || lowered === "n/a") return "";
  return fixed;
}

function safeNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeText(entry)).filter(Boolean);
  }

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];
    if ((text.startsWith("[") && text.endsWith("]")) || (text.startsWith("{") && text.endsWith("}"))) {
      try {
        const parsed = JSON.parse(text);
        return Array.isArray(parsed)
          ? parsed.map((entry) => sanitizeText(entry)).filter(Boolean)
          : [];
      } catch {
        // Continue to delimiter fallback.
      }
    }

    return text
      .split(/[,\n;|]+/g)
      .map((entry) => sanitizeText(entry))
      .filter(Boolean);
  }

  return [];
}

function pickFirstImage(item: JsonRecord): string {
  const directCandidates = [
    item.thumbnail,
    item.thumbnailUrl,
    item.image_url,
    item.image,
    item.product_image,
    item.img,
    item.imageUrl,
    item.image1,
    item.image_1,
  ];

  for (const candidate of directCandidates) {
    const text = sanitizeText(candidate);
    if (text) return text;
  }

  const imageCollections = [item.images, item.gallery, item.extra_images, item.additional_images];
  for (const collection of imageCollections) {
    const values = parseStringArray(collection);
    if (values.length) return values[0];
  }

  return "";
}

function collectAllImages(item: JsonRecord): string[] {
  const candidates: string[] = [];

  // Helper to extract images from a sub-object
  function extractFrom(sub: JsonRecord) {
    if (!sub || typeof sub !== "object") return;
    const direct = [
      sub.thumbnail, sub.thumbnailUrl, sub.image_url, sub.image,
      sub.product_image, sub.img, sub.imageUrl,
      sub.image1, sub.image_1, sub.image2, sub.image_2,
      sub.image3, sub.image_3, sub.image4, sub.image_4,
      sub.image5, sub.image_5, sub.image6, sub.image_6,
      sub.image7, sub.image_7, sub.image8, sub.image_8,
    ];
    for (const c of direct) {
      const t = sanitizeText(c);
      if (t) candidates.push(t);
    }
    const collections = [sub.images, sub.gallery, sub.extra_images, sub.additional_images];
    for (const col of collections) {
      for (const v of parseStringArray(col)) candidates.push(v);
    }
  }

  // Top level
  extractFrom(item);

  // Nested: additionalInfo
  const additionalInfo = (item.additionalInfo && typeof item.additionalInfo === "object"
    ? item.additionalInfo as JsonRecord : {});
  extractFrom(additionalInfo);

  // Nested: variants[0]
  const variants = Array.isArray(item.variants) ? item.variants as JsonRecord[] : [];
  if (variants.length > 0) {
    extractFrom(variants[0]);
    // variants[0].additionalInfo
    const varAdditional = (variants[0].additionalInfo && typeof variants[0].additionalInfo === "object"
      ? variants[0].additionalInfo as JsonRecord : {});
    extractFrom(varAdditional);
  }

  const seen = new Set<string>();
  const urls: string[] = [];
  for (const url of candidates) {
    const upper = url.toUpperCase();
    if (!seen.has(upper)) {
      seen.add(upper);
      urls.push(url);
    }
  }
  return urls;
}

// Extract quick_details, content_ideas, how_to_use, videos from raw_data checking all possible JSON paths
function collectExtraFields(rawData: JsonRecord): JsonRecord {
  const additionalInfo = (rawData.additionalInfo && typeof rawData.additionalInfo === "object"
    ? rawData.additionalInfo as JsonRecord : {});
  const variants = Array.isArray(rawData.variants) ? rawData.variants as JsonRecord[] : [];
  const firstVariant = variants.length > 0 ? variants[0] as JsonRecord : {};
  const varAdditional = (firstVariant.additionalInfo && typeof firstVariant.additionalInfo === "object"
    ? firstVariant.additionalInfo as JsonRecord : {});

  function pick(...sources: unknown[]): string {
    for (const s of sources) {
      const t = sanitizeText(s);
      if (t) return t;
    }
    return "";
  }

  const quickDetails = pick(
    rawData.quickDetails, rawData.quick_details, rawData.quickDetail, rawData.specifications,
    additionalInfo.quickDetails, additionalInfo.quick_details,
    firstVariant.quickDetails, firstVariant.quick_details, firstVariant.quickDetail, firstVariant.specifications,
    varAdditional.quickDetails, varAdditional.quick_details
  );

  const contentIdeas = pick(
    rawData.contentIdeas, rawData.content_ideas, rawData.contentIdea, rawData.content_idea, rawData.description,
    additionalInfo.contentIdeas, additionalInfo.content_ideas,
    firstVariant.contentIdeas, firstVariant.content_ideas, firstVariant.contentIdea, firstVariant.content_idea, firstVariant.description,
    varAdditional.contentIdeas, varAdditional.content_ideas
  );

  const howToUse = pick(
    rawData.howToUse, rawData.how_to_use, rawData.usageInstructions,
    additionalInfo.howToUse, additionalInfo.how_to_use,
    firstVariant.howToUse, firstVariant.how_to_use, firstVariant.usageInstructions, firstVariant.usage,
    varAdditional.howToUse, varAdditional.how_to_use
  );

  const videos = parseStringArray(
    firstVariant.videos || firstVariant.media || firstVariant.videoUrls || firstVariant.video_urls ||
    varAdditional.videos || additionalInfo.videos || rawData.videos || []
  );

  const allImgs = collectAllImages(rawData);

  return {
    quick_details: quickDetails,
    content_ideas: contentIdeas,
    how_to_use: howToUse,
    videos: videos,
    image1: allImgs[0] || null,
    image2: allImgs[1] || null,
    image3: allImgs[2] || null,
    image4: allImgs[3] || null,
    image5: allImgs[4] || null,
    image6: allImgs[5] || null,
    image7: allImgs[6] || null,
    image8: allImgs[7] || null,
  };
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const text = sanitizeText(value).toUpperCase();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    output.push(text);
  }
  return output;
}

function normalizeDbRow(item: JsonRecord): JsonRecord | null {
  const rawId = sanitizeText(
    item.variantId || item.id || item.product_id || item.productId || item.sku || item.code || item.legacyVariantId
  );
  if (!rawId) return null;

  const id = rawId.startsWith("taager_") ? rawId : `taager_${rawId}`;
  const taagerProductId = rawId.startsWith("taager_") ? rawId.slice(7) : rawId;
  const financials = (item.financials && typeof item.financials === "object" ? item.financials : {}) as JsonRecord;

  let price = safeNumber(
    financials.finalPrice || financials.price || item.price || item.current_price || item.final_price || item.amount || item.sale_price
  );
  let originalPrice = safeNumber(
    financials.originalPrice ||
      financials.finalPriceBeforeDiscount ||
      financials.discountedPrice ||
      item.original_price ||
      item.old_price ||
      item.list_price ||
      item.compare_at_price
  );
  if (originalPrice > 0 && originalPrice >= price) {
    price = Math.min(price, originalPrice);
    originalPrice = Math.max(price, originalPrice);
  } else {
    originalPrice = 0;
  }

  const image = pickFirstImage(item);
  const imageList = parseStringArray(item.images);
  const allImages = collectAllImages(item);
  const image1 = allImages[0] || null;
  const image2 = allImages[1] || null;
  const image3 = allImages[2] || null;
  const image4 = allImages[3] || null;
  const image5 = allImages[4] || null;
  const image6 = allImages[5] || null;
  const image7 = allImages[6] || null;
  const image8 = allImages[7] || null;
  const availableCountries = uniqueStrings(
    parseStringArray(item.available_countries).concat(sanitizeText(item._taager_country || item.country || item.country_code))
  );

  let stock = 999;
  let stockStatus = "in_stock";
  const stockInfo = item.stockAvailability && typeof item.stockAvailability === "object"
    ? item.stockAvailability as JsonRecord
    : item.stock && typeof item.stock === "object"
    ? item.stock as JsonRecord
    : null;
  if (stockInfo) {
    const bucket = sanitizeText(stockInfo.stockBucket || stockInfo.stockRange).toUpperCase();
    if (bucket === "NOT_AVAILABLE" || bucket.startsWith("NOT")) {
      stock = 0;
      stockStatus = "out_of_stock";
    } else if (bucket.startsWith("LESS_THAN")) {
      stock = 5;
    } else if (bucket.startsWith("MORE_THAN_100")) {
      stock = 999;
    } else if (bucket) {
      stock = 50;
    }
  } else if (item.stock !== undefined) {
    stock = Math.max(0, safeNumber(item.stock));
    stockStatus = stock > 0 ? "in_stock" : "out_of_stock";
  }

  const additionalInfo = (item.additionalInfo && typeof item.additionalInfo === "object" ? item.additionalInfo as JsonRecord : {});
  const quickDetails = sanitizeText(
    item.quickDetails || item.quick_details || item.quickDetail || additionalInfo.quickDetails || additionalInfo.quick_details || ""
  );
  const contentIdeas = sanitizeText(
    item.contentIdeas || item.content_ideas || item.contentIdea || item.content_idea || additionalInfo.contentIdeas || additionalInfo.content_ideas || ""
  );
  const howToUse = sanitizeText(
    item.howToUse || item.how_to_use || item.usageInstructions || additionalInfo.howToUse || additionalInfo.how_to_use || ""
  );
  const videos = parseStringArray(item.videos || item.media || item.videoUrls || item.video_urls || additionalInfo.videos || []);

  const now = new Date().toISOString();
  return {
    id,
    taager_product_id: taagerProductId,
    name: sanitizeText(item.name || item.title || item.product_name || "منتج من تاجر"),
    description: sanitizeText(item.description || item.summary || item.details || (additionalInfo.description ?? "")),
    quick_details: quickDetails,
    content_ideas: contentIdeas,
    how_to_use: howToUse,
    videos,
    category: sanitizeText(
      item.category || item.category_name || item.type || item.categoryId || (Array.isArray(item.tags) ? item.tags[0] : item.tag) || "بدون تصنيف"
    ),
    price,
    original_price: originalPrice || null,
    image: image || null,
    images: imageList.length ? imageList : image ? [image] : [],
    image1,
    image2,
    image3,
    image4,
    image5,
    image6,
    image7,
    image8,
    available_countries: availableCountries,
    stock,
    stock_status: stockStatus,
    brand: sanitizeText(item.brand || item.vendor || item.store_name) || null,
    seller: sanitizeText(item.vendor || "تاجر") || "تاجر",
    source: "taager",
    is_active: true,
    raw_data: item,
    last_synced_at: now,
    updated_at: now,
  };
}

async function enrichFromMerchantInfo(productId: string, headers: Record<string, string>, countryCode = "EGY"): Promise<JsonRecord> {
  try {
    const merchantHeaders = { ...headers, country: countryCode };
    const response = await fetch(`${TAAGER_API_BASE}/products/${productId}/merchant-info`, { headers: merchantHeaders });
    if (!response.ok) return {};
    const data = await response.json() as JsonRecord;
    const variants = (Array.isArray(data.variants) ? data.variants : []) as JsonRecord[];
    const firstVariant = variants.length > 0 ? variants[0] as JsonRecord : {};
    const additionalInfo = (data.additionalInfo && typeof data.additionalInfo === "object" ? data.additionalInfo as JsonRecord : {});
    const varAdditional = (firstVariant.additionalInfo && typeof firstVariant.additionalInfo === "object" ? firstVariant.additionalInfo as JsonRecord : {});
    const merchantImages: string[] = [];
    const imgSources = [
      ...parseStringArray(firstVariant.images),
      ...parseStringArray(firstVariant.gallery),
      ...parseStringArray(firstVariant.extra_images),
      ...parseStringArray(firstVariant.additional_images),
      ...parseStringArray(data.images),
      ...parseStringArray(data.gallery),
    ];
    const seenImgs = new Set<string>();
    for (const url of imgSources) {
      const key = url.toUpperCase();
      if (!seenImgs.has(key)) { seenImgs.add(key); merchantImages.push(url); }
    }

    return {
      quick_details: sanitizeText(
        firstVariant.quickDetails || firstVariant.quick_details || firstVariant.quickDetail ||
        varAdditional.quickDetails || varAdditional.quick_details ||
        firstVariant.specifications || additionalInfo.quickDetails || additionalInfo.quick_details || ""
      ),
      content_ideas: sanitizeText(
        firstVariant.contentIdeas || firstVariant.content_ideas || firstVariant.contentIdea || firstVariant.content_idea ||
        varAdditional.contentIdeas || varAdditional.content_ideas ||
        firstVariant.description || additionalInfo.contentIdeas || additionalInfo.content_ideas || ""
      ),
      how_to_use: sanitizeText(
        firstVariant.howToUse || firstVariant.how_to_use || firstVariant.usageInstructions ||
        varAdditional.howToUse || varAdditional.how_to_use || firstVariant.usage || ""
      ),
      videos: parseStringArray(
        firstVariant.videos || firstVariant.media || firstVariant.videoUrls || firstVariant.video_urls ||
        varAdditional.videos || additionalInfo.videos || []
      ),
      image1: merchantImages[0] || null,
      image2: merchantImages[1] || null,
      image3: merchantImages[2] || null,
      image4: merchantImages[3] || null,
      image5: merchantImages[4] || null,
      image6: merchantImages[5] || null,
      image7: merchantImages[6] || null,
      image8: merchantImages[7] || null,
    };
  } catch {
    return {};
  }
}

function mergeNormalizedProducts(rows: JsonRecord[]): JsonRecord[] {
  const map = new Map<string, JsonRecord>();

  for (const row of rows) {
    const id = sanitizeText(row.id);
    if (!id) continue;

    const existing = map.get(id);
    if (!existing) {
      map.set(id, row);
      continue;
    }

    const mergedCountries = uniqueStrings(
      parseStringArray(existing.available_countries).concat(parseStringArray(row.available_countries))
    );
    const mergedImages = parseStringArray(existing.images).concat(parseStringArray(row.images));

    const imgFields = ["image1","image2","image3","image4","image5","image6","image7","image8"] as const;
    const mergedImgFields: Record<string, string | null> = {};
    for (const f of imgFields) {
      mergedImgFields[f] = sanitizeText(existing[f]) || sanitizeText(row[f]) || null;
    }

    map.set(id, {
      ...existing,
      ...row,
      ...mergedImgFields,
      available_countries: mergedCountries,
      images: uniqueStrings(mergedImages),
      image: sanitizeText(existing.image || row.image) || sanitizeText(row.image || existing.image) || null,
      raw_data: row.raw_data || existing.raw_data || {},
      is_active: true,
    });
  }

  return [...map.values()];
}

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function fetchProductsPage(countryCode: string, page: number, headers: Record<string, string>) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(TAAGER_PRODUCTS_PAGE_SIZE) });
  params.set("country", mapCountry(countryCode));
  const endpoint = `${TAAGER_API_BASE}/products/variants?${params.toString()}`;
  const response = await fetch(endpoint, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw createHttpError(response.status, `Taager API returned ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) return [];
  return data.map((item) => ({ ...(item as JsonRecord), _taager_country: countryCode }));
}

async function fetchCountryProducts(countryCode: string, headers: Record<string, string>) {
  const upperCountry = sanitizeText(countryCode).toUpperCase();
  let allItems: JsonRecord[] = [];

  for (let page = 1; page <= TAAGER_MAX_PAGES; page++) {
    const data = await fetchProductsPage(upperCountry, page, headers);
    if (!data.length) break;
    allItems = allItems.concat(data);
    if (data.length < TAAGER_PRODUCTS_PAGE_SIZE) break;
  }

  if (allItems.length) return allItems;

  const params = new URLSearchParams({
    highlightGroups: "featured,newArrivals,offers,bestSellers,multiQuantityDiscount,secondProductDiscount,openForTesting",
    language: "ar",
    pageSize: "50",
    country: mapCountry(upperCountry),
  });
  const response = await fetch(`${TAAGER_API_BASE}/products/variants/highlights?${params.toString()}`, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw createHttpError(response.status, `Highlights API returned ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const items: JsonRecord[] = [];
  for (const key in data) {
    const group = data[key];
    if (!Array.isArray(group)) continue;
    for (const item of group) {
      items.push({ ...(item as JsonRecord), _taager_country: upperCountry });
    }
  }
  return items;
}

async function fetchLiveProducts(countryParam = "") {
  const headers = buildHeaders();
  const countries = countryParam
    ? [sanitizeText(countryParam).toUpperCase()]
    : DEFAULT_COUNTRIES;
  let rawItems: JsonRecord[] = [];

  for (const country of countries) {
    const items = await fetchCountryProducts(country, headers);
    rawItems = rawItems.concat(items);
  }

  const normalized = rawItems.map(normalizeDbRow).filter(Boolean) as JsonRecord[];
  return mergeNormalizedProducts(normalized);
}

const TAAGER_LIST_COLUMNS =
  "id,taager_product_id,name,created_at,description,quick_details,content_ideas,how_to_use,videos,category,price,original_price,image,images,image1,image2,image3,image4,image5,image6,image7,image8,available_countries,stock,stock_status,brand,seller,source,is_active,updated_at,last_synced_at";

async function readStoredProducts(countryCode = "") {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase service role is not configured");

  const pageSize = 1000;
  const rows: JsonRecord[] = [];
  let useActiveFilter = true;
  let columnMode: "list" | "star" = "list";

  for (let offset = 0; offset < 100000; offset += pageSize) {
    let query = supabase
      .from("taager_products")
      .select(columnMode === "star" ? "*" : TAAGER_LIST_COLUMNS)
      .range(offset, offset + pageSize - 1);

    if (useActiveFilter) {
      query = query.eq("is_active", true);
    }

    let { data, error } = await query;
    if (error) {
      if (columnMode === "list") {
        columnMode = "star";
        offset -= pageSize;
        continue;
      }
      if (useActiveFilter) {
        useActiveFilter = false;
        offset -= pageSize;
        continue;
      }
    }
    if (error) throw error;

    const batch = (Array.isArray(data) ? data : []) as JsonRecord[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  if (!countryCode) return rows;
  const upperCountry = sanitizeText(countryCode).toUpperCase();
  const iso3 = mapCountry(upperCountry);
  return rows.filter((row) => {
    const countries = uniqueStrings(parseStringArray(row.available_countries));
    if (!countries.length) return true;
    return countries.includes(upperCountry) || countries.includes(iso3);
  });
}

function isSyncAuthorized(req: Request, url: URL): boolean {
  if (!TAAGER_SYNC_SECRET) return true;
  const headerSecret = req.headers.get("x-sync-secret") || "";
  const querySecret = url.searchParams.get("secret") || "";
  return headerSecret === TAAGER_SYNC_SECRET || querySecret === TAAGER_SYNC_SECRET;
}

async function writeSyncLog(status: string, message: string, syncedCount: number) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    await supabase.from("taager_sync_logs").insert([
      {
        status,
        message,
        synced_count: syncedCount,
        created_at: new Date().toISOString(),
      },
    ]);
  } catch {
    // Ignore log write failures.
  }
}

async function persistProducts(rows: JsonRecord[], replaceAll = false) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase service role is not configured");

  const now = new Date().toISOString();
  if (replaceAll) {
    const { error: deactivateError } = await supabase
      .from("taager_products")
      .update({ is_active: false, updated_at: now });
    if (deactivateError) {
      throw deactivateError;
    }
  }

  if (!rows.length) return;

  const chunkSize = 200;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase.from("taager_products").upsert(chunk, { onConflict: "id" });
    if (error) throw error;
  }
}

async function enrichProductsBatch(rows: JsonRecord[], headers: Record<string, string>): Promise<JsonRecord[]> {
  const enriched: JsonRecord[] = [];
  for (const row of rows) {
    const rawData = (row.raw_data && typeof row.raw_data === "object" ? row.raw_data as JsonRecord : {});
    const quickDetails = sanitizeText(row.quick_details || rawData.specifications || rawData.quickDetails || "");
    const contentIdeas = sanitizeText(row.content_ideas || rawData.description || rawData.contentIdeas || "");
    const howToUse = sanitizeText(row.how_to_use || rawData.howToUse || "");
    const videos = (Array.isArray(row.videos) && row.videos.length > 0)
      ? row.videos
      : parseStringArray(rawData.videos || []);

    if (quickDetails && contentIdeas) {
      enriched.push({ ...row, quick_details: quickDetails, content_ideas: contentIdeas, how_to_use: howToUse, videos, updated_at: new Date().toISOString() });
      continue;
    }

    const realProductId = sanitizeText(rawData.productId || "");
    if (!realProductId) {
      enriched.push({ ...row, quick_details: quickDetails, content_ideas: contentIdeas, how_to_use: howToUse, videos, updated_at: new Date().toISOString() });
      continue;
    }

    const rowCountry = sanitizeText(row._taager_country || (rawData._taager_country ?? "")).toUpperCase() || "EG";
    const countryCode = mapCountry(rowCountry);

    const extra = await enrichFromMerchantInfo(realProductId, headers, countryCode);
    const mergedQuick = quickDetails || sanitizeText(extra.quick_details || "");
    const mergedIdeas = contentIdeas || sanitizeText(extra.content_ideas || "");
    const mergedHowToUse = howToUse || sanitizeText(extra.how_to_use || "");
    const mergedVideos = videos.length ? videos : (Array.isArray(extra.videos) ? extra.videos : []);

    const imgFields = ["image1","image2","image3","image4","image5","image6","image7","image8"] as const;
    const mergedRow: JsonRecord = {
      ...row,
      quick_details: mergedQuick,
      content_ideas: mergedIdeas,
      how_to_use: mergedHowToUse,
      videos: mergedVideos,
      updated_at: new Date().toISOString(),
    };
    for (const f of imgFields) {
      if (!sanitizeText(row[f]) && sanitizeText(extra[f])) {
        mergedRow[f] = sanitizeText(extra[f]);
      }
    }

    enriched.push(mergedRow);
  }
  return enriched;
}

async function syncProducts(countryParam = "") {
  const rows = await fetchLiveProducts(countryParam);
  const headers = buildHeaders();
  const enriched = await enrichProductsBatch(rows, headers);
  await persistProducts(enriched, !countryParam);

  await writeSyncLog("success", countryParam ? `Synced country ${countryParam}` : "Full sync completed", enriched.length);
  return enriched;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const clientIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateCheck = await checkRateLimit(clientIp, "taager-proxy");
  if (!rateCheck.allowed) {
    return respond(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), 429);
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "products";
  const country = sanitizeText(url.searchParams.get("country")).toUpperCase();
  const headers = buildHeaders();

  try {
    if (action === "products") {
      const rows = await fetchLiveProducts(country);
      const enriched = await enrichProductsBatch(rows, headers);
      await persistProducts(enriched, !country);
      return respond(JSON.stringify(enriched));
    }

    if (action === "stored-products") {
      const rows = await readStoredProducts(country);
      return respond(JSON.stringify(rows));
    }

    if (action === "db-stats") {
      const supabase = getSupabaseAdmin();
      if (!supabase) return respond(JSON.stringify({ error: "No admin" }), 500);
      const { count: totalCount } = await supabase.from("taager_products").select("*", { count: "exact", head: true });
      const { count: activeCount } = await supabase.from("taager_products").select("*", { count: "exact", head: true }).eq("is_active", true);
      const { data: noImg } = await supabase
        .from("taager_products")
        .select("id,name,taager_product_id,image1,image2,image3,image4,image5,image6,image7,image8,quick_details,content_ideas")
        .eq("is_active", true)
        .is("image1", null)
        .is("image2", null)
        .is("image3", null)
        .is("image4", null)
        .is("image5", null)
        .is("image6", null)
        .is("image7", null)
        .is("image8", null);
      const empty = (noImg as JsonRecord[]) || [];
      // Check for products with null taager_product_id
      const { data: noTpid, count: noTpidCount } = await supabase
        .from("taager_products")
        .select("id,name", { count: "exact", head: false })
        .eq("is_active", true)
        .is("taager_product_id", null);
      // Check for name-based duplicates
      const { data: allActive } = await supabase
        .from("taager_products")
        .select("id,name,taager_product_id")
        .eq("is_active", true);
      const allA = (allActive as JsonRecord[]) || [];
      const nameGroups = new Map<string, JsonRecord[]>();
      for (const p of allA) {
        const n = String(p.name || "").trim().substring(0, 30).toLowerCase();
        if (!n) continue;
        if (!nameGroups.has(n)) nameGroups.set(n, []);
        nameGroups.get(n)!.push(p);
      }
      const nameDups: { name: string; ids: string[] }[] = [];
      for (const [n, prods] of nameGroups) {
        if (prods.length > 1) nameDups.push({ name: n, ids: prods.map(p => String(p.id)) });
      }
      const sample = empty.slice(0, 10).map(r => ({ id: r.id, name: String(r.name||"").substring(0,40), tpid: r.taager_product_id }));
      const { data: orphans } = await supabase.from("taager_products").select("id,name,taager_product_id").eq("is_active", false);
      return respond(JSON.stringify({
        total: totalCount || 0,
        active: activeCount || 0,
        active_no_images: empty.length,
        inactive: (orphans as JsonRecord[] || []).length,
        null_taager_product_id: noTpidCount || 0,
        name_duplicates: nameDups.length,
        sample_empty: empty.slice(0, 10).map(r => ({ id: r.id, name: String(r.name||"").substring(0,40), tpid: r.taager_product_id })),
        sample_name_dups: nameDups.slice(0, 5),
        sample_no_tpid: (noTpid as JsonRecord[] || []).slice(0, 10).map(r => ({ id: r.id, name: String(r.name||"").substring(0,40) })),
        sample_inactive: (orphans as JsonRecord[] || []).slice(0, 10).map(r => ({ id: r.id, name: String(r.name||"").substring(0,40), tpid: r.taager_product_id })),
      }));
    }

    if (action === "sync" || action === "sync-products") {
      if (!isSyncAuthorized(req, url)) {
        return respond(JSON.stringify({ error: "Unauthorized sync request" }), 401);
      }
      const rows = await syncProducts(country);
      return respond(
        JSON.stringify({
          ok: true,
          synced_count: rows.length,
          country: country || null,
        })
      );
    }

    if (action === "test-fix") {
      const testStr = url.searchParams.get("text") || "";
      const fixed = fixArabicText(testStr);
      return respond(JSON.stringify({ original: testStr, original_codes: Array.from(testStr).map(c => c.charCodeAt(0)).slice(0, 30), fixed, fixed_codes: Array.from(fixed).map(c => c.charCodeAt(0)).slice(0, 30), has_arabic: /[\u0600-\u06FF]/.test(fixed) }));
    }

    if (action === "debug-name") {
      const supabase = getSupabaseAdmin();
      if (!supabase) return respond(JSON.stringify({ error: "No admin" }), 500);
      const { data } = await supabase.from("taager_products").select("id,name").eq("is_active", true).limit(1).single();
      if (!data) return respond(JSON.stringify({ error: "No data" }), 404);
      const name = String(data.name ?? "");
      return respond(JSON.stringify({
        id: data.id,
        name,
        codes: Array.from(name).map(c => c.charCodeAt(0)).slice(0, 30),
        length: name.length,
        hasArabic: /[\u0600-\u06FF]/.test(name),
      }));
    }

    if (action === "fix-encoding") {
      if (!isSyncAuthorized(req, url)) {
        return respond(JSON.stringify({ error: "Unauthorized" }), 401);
      }
      const supabase = getSupabaseAdmin();
      if (!supabase) return respond(JSON.stringify({ error: "Service role not configured" }), 500);
      let updated = 0;
      let changed = 0;
      let total = 0;
      const pageSize = 500;
      const seen: string[] = [];
      for (let offset = 0; offset < 10000; offset += pageSize) {
        const { data: rows, error: fetchError } = await supabase
          .from("taager_products")
          .select("id,name,description,quick_details,content_ideas,how_to_use")
          .eq("is_active", true)
          .range(offset, offset + pageSize - 1);
        if (fetchError) return respond(JSON.stringify({ error: fetchError.message }), 500);
        if (!rows || !(rows as JsonRecord[]).length) break;
        total += (rows as JsonRecord[]).length;
        for (const row of (rows as JsonRecord[])) {
          const rawName = String(row.name ?? "").trim();
          const nameCodes = Array.from(rawName).map(c => c.charCodeAt(0));
          const maxCode = nameCodes.reduce((a: number, b: number) => a > b ? a : b, 0);
          const allLatin1 = maxCode <= 255;
          const hasArabic = /[\u0600-\u06FF]/.test(rawName);
          if (allLatin1 && !hasArabic && seen.length < 5) {
            seen.push(JSON.stringify({ id: row.id, codes: nameCodes.slice(0, 15), maxCode }));
          }
          if (!allLatin1 || hasArabic) continue;
          const newName = fixArabicText(rawName);
          if (newName === rawName) continue;
          changed++;
          const { error: updateError } = await supabase.from("taager_products").update({
            name: newName,
            description: fixArabicText(String(row.description ?? "").trim()),
            quick_details: fixArabicText(String(row.quick_details ?? "").trim()),
            content_ideas: fixArabicText(String(row.content_ideas ?? "").trim()),
            how_to_use: fixArabicText(String(row.how_to_use ?? "").trim()),
            updated_at: new Date().toISOString(),
          }).eq("id", row.id);
          if (!updateError) updated++;
        }
        if ((rows as JsonRecord[]).length < pageSize) break;
      }
      return respond(JSON.stringify({ ok: true, total, updated, changedCount: changed, debug: seen }));
    }

    if (action === "backfill") {
      if (!isSyncAuthorized(req, url)) {
        return respond(JSON.stringify({ error: "Unauthorized" }), 401);
      }
      const supabase = getSupabaseAdmin();
      if (!supabase) return respond(JSON.stringify({ error: "Service role not configured" }), 500);

      // Run SQL backfill from raw_data (fast, no API calls)
      let sqlCount = 0;
      const { data: sqlRpc, error: sqlError } = await supabase.rpc("backfill_taager_extra_fields");
      if (sqlError) console.warn("SQL backfill_taager_extra_fields failed:", sqlError.message);
      else sqlCount = sqlRpc as number;

      // Process products still missing quick_details/content_ideas using Taager merchant-info API
      // Offset-based: each call processes a batch (default 30) to stay within 150s timeout
      const offset = Math.max(0, Number(url.searchParams.get("offset") || "0"));
      const batchSize = Math.min(100, Math.max(1, Number(url.searchParams.get("batch") || "30")));
      const taagerHeaders = buildHeaders();
      let updated = 0;
      let apiCalled = 0;

      const { data: missing, error: missingError } = await supabase
        .from("taager_products")
        .select("id,raw_data,quick_details,content_ideas")
        .eq("is_active", true)
        .or("quick_details.is.null,quick_details.eq.,content_ideas.is.null,content_ideas.eq.")
        .range(offset, offset + batchSize - 1);
      if (missingError) return respond(JSON.stringify({ error: missingError.message }), 500);
      const rows = (missing as JsonRecord[]);
      const total = rows.length;

      for (const row of rows) {
        const rawData = (row.raw_data && typeof row.raw_data === "object" ? row.raw_data as JsonRecord : {});
        let qd = sanitizeText(row.quick_details || "");
        let ci = sanitizeText(row.content_ideas || "");

        // Try raw_data first
        if (!qd || !ci) {
          const rawFields = collectExtraFields(rawData);
          if (!qd) qd = sanitizeText(rawFields.quick_details || "");
          if (!ci) ci = sanitizeText(rawFields.content_ideas || "");
        }

        // If still missing, call merchant-info API
        if (!qd || !ci) {
          const realProductId = sanitizeText(rawData.productId || rawData.id || "");
          if (realProductId) {
            const extra = await enrichFromMerchantInfo(realProductId, taagerHeaders, "EGY");
            apiCalled++;
            if (!qd) qd = sanitizeText(extra.quick_details || "");
            if (!ci) ci = sanitizeText(extra.content_ideas || "");
          }
        }

        if (qd || ci) {
          const upd: JsonRecord = { updated_at: new Date().toISOString() };
          if (qd) upd.quick_details = qd;
          if (ci) upd.content_ideas = ci;
          const { error: ue } = await supabase.from("taager_products").update(upd).eq("id", row.id);
          if (!ue) updated++;
        }
      }

      // Check if more products remain
      let hasMore = false;
      if (total >= batchSize) {
        const { data: nextCheck } = await supabase
          .from("taager_products")
          .select("id")
          .eq("is_active", true)
          .or("quick_details.is.null,quick_details.eq.,content_ideas.is.null,content_ideas.eq.")
          .range(offset + batchSize, offset + batchSize);
        hasMore = nextCheck && (nextCheck as JsonRecord[]).length > 0;
      }

      const nextOff = offset + total;
      return respond(JSON.stringify({
        ok: true,
        sql_backfill: sqlCount,
        batch_offset: offset,
        batch_processed: total,
        batch_updated: updated,
        api_calls: apiCalled,
        has_more: hasMore,
        next_offset: nextOff,
        next_url: hasMore ? `?action=backfill&secret=${sanitizeText(url.searchParams.get("secret") || "")}&offset=${nextOff}&batch=${batchSize}` : null,
      }));
    }

    if (action === "proxy-image") {
      const imgUrl = url.searchParams.get("url") || "";
      if (!imgUrl) return respond(JSON.stringify({ error: "Missing url" }), 400);
      try {
        const imgResp = await fetch(imgUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!imgResp.ok) return respond(JSON.stringify({ error: "Upstream " + imgResp.status }), imgResp.status);
        const buf = await imgResp.arrayBuffer();
        return new Response(buf, {
          status: 200,
          headers: {
            "Content-Type": imgResp.headers.get("content-type") || "image/jpeg",
            "Content-Length": String(buf.byteLength),
            "Cache-Control": "public, max-age=86400",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch {
        return respond(JSON.stringify({ error: "Proxy failed" }), 502);
      }
    }

    if (action === "backfill-images") {
      if (!isSyncAuthorized(req, url)) {
        return respond(JSON.stringify({ error: "Unauthorized" }), 401);
      }
      const supabase = getSupabaseAdmin();
      if (!supabase) return respond(JSON.stringify({ error: "Service role not configured" }), 500);
      let updated = 0;
      let total = 0;
      const pageSize = 500;
      for (let offset = 0; offset < 10000; offset += pageSize) {
        const { data: rows, error: fetchError } = await supabase
          .from("taager_products")
          .select("id,raw_data,image1,image2,image3,image4,image5,image6,image7,image8")
          .eq("is_active", true)
          .range(offset, offset + pageSize - 1);
        if (fetchError) return respond(JSON.stringify({ error: fetchError.message }), 500);
        if (!rows || !(rows as JsonRecord[]).length) break;
        total += (rows as JsonRecord[]).length;
        const batch: JsonRecord[] = [];
        for (const row of (rows as JsonRecord[])) {
          const rawData = (row.raw_data && typeof row.raw_data === "object" ? row.raw_data as JsonRecord : {});
          const allImgs = collectAllImages(rawData);
          const hasExisting = row.image1 || row.image2 || row.image3 || row.image4 ||
                             row.image5 || row.image6 || row.image7 || row.image8;
          if (hasExisting) continue;
          batch.push({
            id: row.id,
            image1: allImgs[0] || null,
            image2: allImgs[1] || null,
            image3: allImgs[2] || null,
            image4: allImgs[3] || null,
            image5: allImgs[4] || null,
            image6: allImgs[5] || null,
            image7: allImgs[6] || null,
            image8: allImgs[7] || null,
            updated_at: new Date().toISOString(),
          });
        }
        if (batch.length) {
          for (const item of batch) {
            const { error: updateError } = await supabase
              .from("taager_products")
              .update({
                image1: item.image1,
                image2: item.image2,
                image3: item.image3,
                image4: item.image4,
                image5: item.image5,
                image6: item.image6,
                image7: item.image7,
                image8: item.image8,
                updated_at: item.updated_at,
              })
              .eq("id", item.id);
            if (updateError) return respond(JSON.stringify({ error: updateError.message }), 500);
            updated++;
          }
        }
        if ((rows as JsonRecord[]).length < pageSize) break;
      }
      return respond(JSON.stringify({ ok: true, total, updated }));
    }

    if (action === "highlights") {
      const requestedCountry = country || DEFAULT_COUNTRIES[0];
      const items = await fetchCountryProducts(requestedCountry, headers);
      return respond(JSON.stringify(items));
    }

    if (action === "product") {
      const productId = url.searchParams.get("id") || "";
      if (!productId) {
        return respond(JSON.stringify({ error: "Missing product id" }), 400);
      }

      const productCountry = country || "EG";
      const productHeaders = { ...headers, country: mapCountry(productCountry) };
      const response = await fetch(`${TAAGER_API_BASE}/products/${productId}/merchant-info`, { headers: productHeaders });
      if (!response.ok) {
        return respond(JSON.stringify({ error: `Taager API returned ${response.status}` }), response.status);
      }

      const data = await response.json();
      return respond(JSON.stringify(data));
    }

    if (action === "get-product") {
      const productId = url.searchParams.get("id") || "";
      if (!productId) return respond(JSON.stringify({ error: "Missing id" }), 400);
      const supabase = getSupabaseAdmin();
      if (!supabase) return respond(JSON.stringify({ error: "Service role not configured" }), 500);
      const { data, error } = await supabase
        .from("taager_products")
        .select("*")
        .eq("id", productId)
        .limit(1);
      if (error) return respond(JSON.stringify({ error: error.message }), 500);
      if (!data || !(data as JsonRecord[]).length) return respond(JSON.stringify({ error: "Not found" }), 404);
      return respond(JSON.stringify((data as JsonRecord[])[0]));
    }

    if (action === "update-product") {
      if (!isSyncAuthorized(req, url)) {
        return respond(JSON.stringify({ error: "Unauthorized" }), 401);
      }
      const productId = url.searchParams.get("id") || "";
      if (!productId) return respond(JSON.stringify({ error: "Missing id" }), 400);
      const body = await req.json() as JsonRecord;
      const supabase = getSupabaseAdmin();
      if (!supabase) return respond(JSON.stringify({ error: "Service role not configured" }), 500);
      const { error } = await supabase
        .from("taager_products")
        .update({
          quick_details: sanitizeText(body.quick_details),
          content_ideas: sanitizeText(body.content_ideas),
          how_to_use: sanitizeText(body.how_to_use),
          videos: Array.isArray(body.videos) ? body.videos : [],
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);
      if (error) return respond(JSON.stringify({ error: error.message }), 500);
      return respond(JSON.stringify({ ok: true }));
    }

    if (action === "create-order") {
      const body = await req.json();
      const response = await fetch(`${TAAGER_API_BASE}/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return respond(
          JSON.stringify({ error: `Taager order API returned ${response.status}`, details: errorText }),
          response.status
        );
      }

      const data = await response.json();
      return respond(JSON.stringify(data));
    }

    if (action === "deduplicate") {
      if (!isSyncAuthorized(req, url)) return respond(JSON.stringify({ error: "Unauthorized" }), 401);
      const supabase = getSupabaseAdmin();
      if (!supabase) return respond(JSON.stringify({ error: "Service role not configured" }), 500);
      const mode = url.searchParams.get("mode") || "dry-run";
      // Fetch all active products with taager_product_id
      const { data: all, error: fe } = await supabase
        .from("taager_products")
        .select("id,taager_product_id,name,description,quick_details,content_ideas,how_to_use,videos,image1,image2,image3,image4,image5,image6,image7,image8")
        .eq("is_active", true)
        .not("taager_product_id", "is", null)
        .not("taager_product_id", "eq", "");
      if (fe) return respond(JSON.stringify({ error: fe.message }), 500);
      const rows = (all as JsonRecord[]) || [];
      // Group by taager_product_id
      const groups = new Map<string, JsonRecord[]>();
      for (const r of rows) {
        const key = String(r.taager_product_id || "").trim();
        if (!key) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r);
      }
      // Score function
      function scoreProduct(p: JsonRecord): number {
        let s = 0;
        if (p.name && String(p.name).trim()) s += 10;
        if (p.description && String(p.description).trim()) s += 10;
        if (p.quick_details && String(p.quick_details).trim()) s += 8;
        if (p.content_ideas && String(p.content_ideas).trim()) s += 8;
        if (p.how_to_use && String(p.how_to_use).trim()) s += 5;
        if (Array.isArray(p.videos) && p.videos.length) s += 5;
        for (let i = 1; i <= 8; i++) {
          if (p["image" + i] && String(p["image" + i]).trim()) s += 3;
        }
        return s;
      }
      const duplicates: { taager_product_id: string; ids: string[]; best_id: string; scores: number[] }[] = [];
      for (const [key, prods] of groups) {
        if (prods.length <= 1) continue;
        const scored = prods.map(p => ({ id: String(p.id), score: scoreProduct(p) }));
        scored.sort((a, b) => b.score - a.score);
        const bestId = scored[0].id;
        duplicates.push({
          taager_product_id: key,
          ids: scored.map(s => s.id),
          scores: scored.map(s => s.score),
          best_id: bestId,
        });
      }
      let deleted = 0;
      let kept = 0;
      const toDelete: string[] = [];
      for (const g of duplicates) {
        const del = g.ids.filter(id => id !== g.best_id);
        toDelete.push(...del);
        if (mode !== "dry-run") {
          for (const id of del) {
            const { error: de } = await supabase.from("taager_products").delete().eq("id", id);
            if (!de) deleted++;
          }
          kept++;
        }
      }
      return respond(JSON.stringify({
        ok: true,
        mode,
        groups_found: duplicates.length,
        to_delete: toDelete.length,
        deleted,
        kept,
        dry_run: mode === "dry-run" ? duplicates : undefined,
      }));
    }

    return respond(JSON.stringify({ error: "Unknown action" }), 400);
  } catch (error) {
    const httpError = error instanceof Error ? (error as HttpError) : null;
    const message = httpError?.message || "Internal error";
    const status = Number.isInteger(httpError?.status) ? Number(httpError?.status) : 500;
    if (action === "sync" || action === "sync-products") {
      await writeSyncLog("error", message, 0);
    }
    return respond(JSON.stringify({ error: message }), status);
  }
});
