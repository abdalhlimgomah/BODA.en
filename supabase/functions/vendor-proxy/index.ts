import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VENDOR_SITE = "https://aff.ven-door.com";
const VENDOR_COOKIE_SESSION = Deno.env.get("VENDOR_COOKIE_SESSION") || "";
const VENDOR_COOKIE_XSRF = Deno.env.get("VENDOR_COOKIE_XSRF") || "";
const VENDOR_SYNC_SECRET = Deno.env.get("VENDOR_SYNC_SECRET") || "";
const VENDOR_COUNTRIES = (Deno.env.get("VENDOR_COUNTRIES") || "EG")
  .split(",")
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean);
const VENDOR_STORE_MEDIA = Deno.env.get("VENDOR_STORE_MEDIA") || "remote";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const VENDOR_MAX_PAGES = 60;
const VENDOR_DETAILS_LIMIT = 200;
const VENDOR_DETAILS_CONCURRENCY = 4;
const VENDOR_CHUNK = 200;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-sync-secret, Authorization, apikey",
};

type JsonRecord = Record<string, unknown>;

function respond(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function cleanText(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function safeNumber(value: unknown): number {
  const n = Number(String(value ?? "").replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function cookieHeader(): string {
  const parts: string[] = [];
  if (VENDOR_COOKIE_SESSION) parts.push(`laravel_session=${VENDOR_COOKIE_SESSION}`);
  if (VENDOR_COOKIE_XSRF) parts.push(`XSRF-TOKEN=${VENDOR_COOKIE_XSRF}`);
  return parts.join("; ");
}

async function fetchHtml(url: string, init: RequestInit = {}): Promise<string> {
  const headers = new Headers(init.headers || {});
  if (!headers.has("Cookie")) headers.set("Cookie", cookieHeader());
  headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36");
  const res = await fetch(url, { ...init, headers, redirect: "follow", signal: AbortSignal.timeout(25000) });
  const text = await res.text();
  return text;
}

function extractCsrfToken(html: string): string {
  const meta = html.match(/<meta\s+name="csrf-token"\s+content="([A-Za-z0-9]+)"/i);
  if (meta) return meta[1];
  const input = html.match(/<input[^>]*name="_token"[^>]*value="([A-Za-z0-9]+)"/i);
  if (input) return input[1];
  const meta2 = html.match(/<meta[^>]*content="([A-Za-z0-9]+)"[^>]*name="csrf-token"/i);
  if (meta2) return meta2[1];
  return "";
}

function splitBlocks(buffer: string, openTag: string): string[] {
  const blocks: string[] = [];
  const opens: number[] = [];
  let idx = 0;
  while ((idx = buffer.indexOf(openTag, idx)) !== -1) {
    opens.push(idx);
    idx += openTag.length;
  }
  for (let i = 0; i < opens.length; i++) {
    const from = opens[i];
    const to = i + 1 < opens.length ? opens[i + 1] : buffer.length;
    blocks.push(buffer.slice(from, to));
  }
  return blocks;
}

function parseCard(card: string): JsonRecord | null {
  const idMatch = card.match(/<i[^>]*data-id="(\d+)"[^>]*class="[^"]*makeFav/);
  if (!idMatch) return null;
  const id = idMatch[1];

  const zipMatch = card.match(/<a[^>]*href="([^"]*\.zip)"[^>]*download/i);
  const productMatch = card.match(/href="(https:\/\/aff\.ven-door\.com\/(?:product|products)\/\d+[^"]*)"/);

  const images: string[] = [];
  const imgRe = /<img[^>]*class="card-img-top"[^>]*src\s*=\s*"([^"]+)"|<img[^>]*src\s*=\s*"([^"]+)"[^>]*class="card-img-top"/gi;
  let im;
  while ((im = imgRe.exec(card))) images.push(im[1] || im[2]);

  const titleBlk = card.match(/<div class="card-body-2 title-p">([\s\S]*?)<div class="rating-stars/);
  let name = "";
  if (titleBlk) {
    const a = titleBlk[1].match(/<a[^>]*>([\s\S]*?)<\/a>/);
    if (a) name = cleanText(a[1]);
  }

  let price = "", minPrice = "", maxPrice = "", qty = "", commission = "";
  const priceBlks = card.match(/<div class="card-body-2 price">([\s\S]*?)<\/div>\s*<\/div>/g) || [];
  for (const pb of priceBlks) {
    const s = pb.match(/السعر[^0-9]{0,50}(?:<span>\s*)?([\d.,]+)/);
    const mn = pb.match(/الأدنى\s*:?\s*([\d.,]+)/);
    const mx = pb.match(/الأقصى\s*:?\s*([\d.,]+)/);
    const qt = pb.match(/الكمية\s*:?\s*(?:<span>\s*)?([\d.]+)/);
    const cm = pb.match(/العمولة\s*:?\s*<span>\s*([^<]+)/);
    if (s) price = s[1];
    if (mn) minPrice = mn[1];
    if (mx) maxPrice = mx[1];
    if (qt) qty = qt[1];
    if (cm) commission = cm[1];
  }

  return {
    id,
    name,
    price,
    minPrice,
    maxPrice,
    qty,
    commission,
    images,
    zipUrl: zipMatch ? zipMatch[1] : "",
    productUrl: productMatch ? productMatch[1] : `https://aff.ven-door.com/product/${id}`,
  };
}

function parseCardPage(html: string): { products: JsonRecord[]; page: JsonRecord | null } {
  const products: JsonRecord[] = [];
  for (const card of splitBlocks(html, '<div class="col-md-3">')) {
    const p = parseCard(card);
    if (p) products.push(p);
  }
  const idMarker = 'id="load_more_button"';
  const hasButton = html.includes(idMarker);
  let page: JsonRecord | null = null;
  if (hasButton) {
    const at = html.indexOf(idMarker);
    const block = html.slice(Math.max(0, at - 320), at + 60);
    const da = block.match(/data-id="([^"]*)"/);
    const ia = block.match(/data-ids="([^"]*)"/);
    const ka = block.match(/data-k="([^"]*)"/);
    if (da) page = { dataId: da[1], dataIds: ia ? ia[1] : "", dataK: ka ? ka[1] : "" };
  }
  return { products, page };
}

function parseDetail(html: string): JsonRecord {
  const out: JsonRecord = {};

  const nameMatch = html.match(/<h6 class="prodect-text">\s*([^<]+)/);
  if (nameMatch) out.name = cleanText(nameMatch[1]);

  const imgMatch = html.match(/<img[^>]*src="([^"]+)"[^>]*alt="product-details"/) ||
    html.match(/class="abut-img[\s\S]*?<img[^>]*src="([^"]+)"/);
  if (imgMatch) out.mainImage = imgMatch[1];

  const descAnchor = '<p class="prodcut-titles">';
  const descStart = html.indexOf(descAnchor);
  const descriptionParts: string[] = [];
  const driveLinks: string[] = [];
  const seenDrives = new Set<string>();
  if (descStart !== -1) {
    const from = descStart + descAnchor.length;
    const ends: number[] = [];
    for (const mk of ['<h6 class="prodect-text', '<div class="card-body-2 price"']) {
      const i = html.indexOf(mk, from);
      if (i > 0) ends.push(i);
    }
    const to = ends.length ? Math.min(...ends) : html.length;
    const seg = html.slice(from, to);
    const driveRe = /https:\/\/drive\.google\.com\/[^"'<>\s]+/g;
    let dm: RegExpExecArray | null;
    while ((dm = driveRe.exec(seg))) {
      const clean = dm[0].replace(/&amp;/g, "&");
      if (!seenDrives.has(clean)) { seenDrives.add(clean); driveLinks.push(clean); }
    }
    const ps = seg.match(/<p[^>]*>([\s\S]*?)<\/p>/g) || [];
    for (const p of ps) {
      const inner = p.replace(/<a[\s\S]*?<\/a>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
      const t = cleanText(inner);
      if (t) descriptionParts.push(t);
    }
  }
  out.description = descriptionParts.join("\n");
  out.driveLinks = driveLinks;

  const vendorMatch = html.match(/البائع\s*:?\s*<a[^>]*href="[^"]*vendor_id=(\d+)"[^>]*>([^<]+)/);
  if (vendorMatch) out.vendorId = vendorMatch[1];
  if (vendorMatch) out.vendorName = cleanText(vendorMatch[2]);

  const variants: JsonRecord[] = [];
  const tableBlk = html.match(/<table[^>]*id="oldDesignTable"[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/);
  if (tableBlk) {
    const rows = tableBlk[1].match(/<tr>([\s\S]*?)<\/tr>/g) || [];
    for (const row of rows) {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
      if (cells.length < 3) continue;
      const get = (c: string) => cleanText(c.replace(/^<td[^>]*>/, "").replace(/<\/td>$/, ""));
      const sizeCombined = get(cells[0]!);
      const color = get(cells[1]!);
      const stockText = get(cells[2]!).replace(/[^\d-]/g, "");
      if (!sizeCombined && !color) continue;
      variants.push({ color, size: deriveSize(sizeCombined, color), sizeCombined, stock: stockText !== "" ? stockText : null });
    }
  }
  out.variants = variants;

  const priceBlks = html.match(/<div class="card-body-2 price">([\s\S]*?)<\/div>\s*<\/div>/g) || [];
  for (const pb of priceBlks) {
    const s = pb.match(/السعر[^0-9]{0,50}(?:<span>\s*)?([\d.,]+)/);
    const mn = pb.match(/الأدنى\s*:?\s*([\d.,]+)/);
    const mx = pb.match(/الأقصى\s*:?\s*([\d.,]+)/);
    const qt = pb.match(/الكمية\s*:?\s*(?:<span>\s*)?([\d.]+)/);
    const cm = pb.match(/العمولة\s*:?\s*<span>\s*([^<]+)/);
    if (s && !out.price) out.price = s[1];
    if (mn) out.minPrice = mn[1];
    if (mx) out.maxPrice = mx[1];
    if (qt) out.qty = qt[1];
    if (cm) out.commission = cm[1];
  }

  const zipMatch = html.match(/<a[^>]*href="([^"]*\.zip)"[^>]*class="btn btn-success"/i);
  if (zipMatch) out.zipUrl = zipMatch[1];

  return out;
}

function deriveSize(sizeCombined: string, color: string): string {
  const sc = cleanText(sizeCombined);
  const c = cleanText(color);
  if (!sc) return "";
  if (c && sc.startsWith(c)) {
    const rest = sc.slice(c.length).trim();
    if (rest) return rest;
  }
  return sc;
}

async function refreshToken(): Promise<string> {
  const html = await fetchHtml(`${VENDOR_SITE}/`);
  return extractCsrfToken(html);
}

async function fetchLoadData(token: string, id: string, ids: string): Promise<string> {
  const body = new URLSearchParams();
  body.set("id", id);
  body.set("_token", token);
  body.set("ids", ids);
  body.set("old", ids);
  const res = await fetch(`${VENDOR_SITE}/loadmore/load_data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      "Referer": `${VENDOR_SITE}/`,
      "Origin": VENDOR_SITE,
      "Cookie": cookieHeader(),
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    },
    body: body.toString(),
    redirect: "follow",
    signal: AbortSignal.timeout(25000),
  });
  const text = await res.text();
  return text;
}

function isCardHtml(html: string): boolean {
  return html.includes('class="card-img-top"') || html.includes('<div class="col-md-3">') ||
    /<i[^>]*data-id="\d+"[^>]*class="[^"]*makeFav/.test(html);
}

async function crawlCatalog(token: string, maxPages: number): Promise<{ products: JsonRecord[]; ids: string[]; pagesScanned: number }> {
  const products: JsonRecord[] = [];
  const seen = new Set<string>();
  let dataId = "";
  let dataIds = "";
  let pagesScanned = 0;
  let emptyHits = 0;

  for (let round = 0; round < maxPages; round++) {
    let html = await fetchLoadData(token, dataId, dataIds);
    let needsTokenRefresh = !isCardHtml(html) && html.trim().length > 0;
    if (needsTokenRefresh && round === 0) {
      const fresh = await refreshToken();
      if (fresh) {
        token = fresh;
        html = await fetchLoadData(token, dataId, dataIds);
      }
    }

    if (!html || html.trim().length === 0 || !isCardHtml(html)) {
      emptyHits++;
      if (emptyHits >= 2) break;
      continue;
    }
    emptyHits = 0;

    const parsed = parseCardPage(html);
    let added = 0;
    for (const p of parsed.products) {
      const pid = String(p.id);
      if (!seen.has(pid)) {
        seen.add(pid);
        p.storeId = dataId || "";
        products.push(p);
        added++;
      }
    }
    pagesScanned++;

    if (!parsed.page) break;
    dataId = String(parsed.page.dataId);
    dataIds = String(parsed.page.dataIds || "");
    if (!dataId) break;
    if (parsed.products.length === 0 && added === 0) {
      emptyHits++;
      if (emptyHits >= 2) break;
    }
  }

  return { products, ids: Array.from(seen), pagesScanned };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

async function isLiveImage(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    try { res.body?.cancel(); } catch { /* ignore */ }
    if (res.ok) {
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      return ct.startsWith("image/") || !ct;
    }
    return false;
  } catch {
    return false;
  }
}

async function resolveImageUrl(url: string): Promise<string> {
  const isStoragePattern = /\/storage\/products_image\//i.test(String(url));
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    try { res.body?.cancel(); } catch { /* ignore */ }
    if (res.ok) {
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.startsWith("image/") || !ct) return url;
    }
    if (res.status === 404 || res.status === 410 || isStoragePattern) {
      const m = String(url).match(/([^/?#]+)\/?$/);
      if (m && m[1]) {
        const alt = `https://aff.ven-door.com/uploads/products_image/${m[1]}`;
        if (await isLiveImage(alt)) return alt;
      }
      return "";
    }
    return url;
  } catch {
    return isStoragePattern ? "" : url;
  }
}

async function filterLiveImages(urls: string[]): Promise<string[]> {
  const results = await mapLimit(urls, 3, (u) => resolveImageUrl(u));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of results) {
    if (u && !seen.has(u)) { seen.add(u); out.push(u); }
  }
  return out;
}

async function uploadImagePublic(bucket: string, objectPath: string, imageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const ext = (imageUrl.split("?")[0].match(/\.(jpe?g|png|webp|gif)$/i) || [null, ""])[1].toLowerCase();
    const finalPath = `${objectPath}${ext ? "." + ext : ""}`;
    const sb = getSupabaseAdmin();
    if (!sb) return null;
    const { error } = await sb.storage.from(bucket).upload(finalPath, bytes, {
      contentType: res.headers.get("content-type") || "image/jpeg",
      upsert: true,
    });
    if (error) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${finalPath}`;
  } catch {
    return null;
  }
}

async function toDbRow(card: JsonRecord, detail: JsonRecord | null, now: string, existing: JsonRecord | null = null): Promise<JsonRecord> {
  const pid = String(card.id);
  const images = Array.isArray(card.images) ? (card.images as string[]) : [];
  const prior = (existing && existing.raw_data && typeof existing.raw_data === "object")
    ? existing.raw_data as JsonRecord
    : {};
  const priorImages = existing && Array.isArray(existing.images) ? existing.images as string[] : [];
  const mainImage = (detail && detail.mainImage ? String(detail.mainImage) : "") || images[0] || (priorImages[0] as string) || "";
  const allImages: string[] = [];
  const seen = new Set<string>();
  for (const u of [mainImage, ...images, ...priorImages]) {
    if (u && !seen.has(u)) { seen.add(u); allImages.push(u); }
  }

  const verifiedImages = allImages.length ? await filterLiveImages(allImages) : [];
  let storedImages = verifiedImages;
  if (VENDOR_STORE_MEDIA === "storage" && storedImages.length) {
    const bucket = "product-media";
    const objBase = `vendor/${pid}/img`;
    const uploaded = await mapLimit(storedImages, 2, (url, i) => uploadImagePublic(bucket, `${objBase}_${i}`, url));
    const pub = uploaded.filter((u): u is string => Boolean(u));
    if (pub.length) storedImages = pub;
  }

  const detailVariants = detail && Array.isArray(detail.variants) ? (detail.variants as JsonRecord[]) : [];
  const priorVariants = Array.isArray(prior.variants) ? prior.variants as JsonRecord[] : [];
  const variants = detailVariants.length ? detailVariants : priorVariants;

  let stock: number | null = null;
  let stockStatus = "in_stock";
  if (detailVariants.length) {
    const stocks = detailVariants.map((v) => safeNumber(v.stock)).filter((n) => n > 0);
    stock = stocks.length ? Math.min(...stocks) : 0;
  } else if (card.qty) {
    stock = safeNumber(card.qty);
  } else if (existing && existing.stock != null) {
    stock = safeNumber(existing.stock);
  }
  if (stock == null) stock = 999;
  if (stock <= 0) stockStatus = "out_of_stock";
  if (stock >= 999 && existing && existing.stock_status) {
    stockStatus = String(existing.stock_status);
  }

  const priceLabel = safeNumber(card.price) || (detail ? safeNumber(detail.price) : 0) || (existing && existing.price != null ? safeNumber(existing.price) : 0) || 0;
  const priorMax = prior.price_max != null ? safeNumber(prior.price_max) : 0;
  const priceMax = safeNumber(card.maxPrice) || (detail ? safeNumber(detail.maxPrice) : 0) || priorMax || priceLabel;
  const price = priceMax || priceLabel;

  const vendorId = detail ? (String(detail.vendorId || "") || "") : "";
  const vendorName = detail ? (String(detail.vendorName || "") || "") : "";
  const prevVendor = (existing && existing.seller ? String(existing.seller) : "") || String(prior.vendor_name || "") || "";
  const mergedVendorId = vendorId || String(prior.vendor_id || "") || "";
  const mergedVendorName = vendorName || prevVendor;
  const detailDrives = detail && Array.isArray(detail.driveLinks) ? detail.driveLinks as string[] : [];
  const driveLinks = detailDrives.length ? detailDrives : (Array.isArray(prior.drive_links) ? prior.drive_links as string[] : []);
  const zipUrl = String(detail?.zipUrl || card.zipUrl || prior.zip_url || "");

  const qtyVal = card.qty ? safeNumber(card.qty) : (prior.qty != null ? safeNumber(prior.qty) : undefined);

  const rawData: JsonRecord = {
    source: "vendoor",
    source_site: VENDOR_SITE,
    store_id: String(card.storeId || ""),
    product_id: pid,
    product_url: String(card.productUrl || ""),
    name: String(card.name || ""),
    description: String(detail?.description || prior.description || ""),
    price: price,
    price_min: card.minPrice ? safeNumber(card.minPrice) : (prior.price_min != null ? safeNumber(prior.price_min) : undefined),
    price_max: card.maxPrice ? safeNumber(card.maxPrice) : priorMax || undefined,
    commission: String(card.commission || detail?.commission || prior.commission || ""),
    commission_value: safeNumber(card.commission) || safeNumber(detail?.commission) || (prior.commission_value != null ? safeNumber(prior.commission_value) : 0),
    qty: qtyVal,
    zip_url: zipUrl,
    drive_links: driveLinks,
    media: {
      zip: zipUrl,
      drives: driveLinks,
    },
    vendor_id: mergedVendorId || null,
    vendor_name: mergedVendorName || null,
    images: allImages.length ? allImages : priorImages,
    variants,
  };

  const imageFields: string[] = ["image1", "image2", "image3", "image4", "image5", "image6", "image7", "image8"];
  const row: JsonRecord = { id: `vendor_${pid}`, taager_product_id: pid };
  for (let i = 0; i < 8; i++) row[imageFields[i]] = storedImages[i] || null;

  const finalImages = storedImages;

  const spec = detailVariants.length
    ? buildSizesColors(detailVariants, priceMax)
    : {
        sizes: existing && Array.isArray(existing.sizes) ? existing.sizes as JsonRecord[] : [],
        colors: existing && Array.isArray(existing.colors) ? existing.colors as JsonRecord[] : [],
      };

  return {
    ...row,
    name: String(card.name || (existing && existing.name) || ""),
    description: rawData.description,
    category: existing && existing.category ? String(existing.category) : "",
    price: price,
    original_price: existing && existing.original_price != null ? safeNumber(existing.original_price) : 0,
    image: finalImages[0] || null,
    images: finalImages,
    sizes: spec.sizes,
    colors: spec.colors,
    available_countries: VENDOR_COUNTRIES,
    stock,
    stock_status: stockStatus,
    brand: mergedVendorName,
    seller: mergedVendorName,
    source: "vendor",
    is_active: true,
    updated_at: now,
    last_synced_at: now,
    quick_details: existing && existing.quick_details ? String(existing.quick_details) : "",
    content_ideas: existing && existing.content_ideas ? String(existing.content_ideas) : "",
    how_to_use: existing && existing.how_to_use ? String(existing.how_to_use) : "",
    videos: existing && Array.isArray(existing.videos) && (existing.videos as unknown[]).length ? existing.videos : [],
    raw_data: rawData,
  };
}

function buildSizesColors(variants: JsonRecord[], priceMax: number): { sizes: JsonRecord[]; colors: JsonRecord[] } {
  const sizeMap = new Map<string, { stock: number }>();
  const colorMap = new Map<string, Map<string, number>>();
  for (const v of variants || []) {
    const size = cleanText(String(v.size || v.sizeCombined || ""));
    const color = cleanText(String(v.color || ""));
    const stock = Math.max(0, safeNumber(v.stock));
    if (!size) continue;
    const s = sizeMap.get(size) || { stock: 0 };
    s.stock += stock;
    sizeMap.set(size, s);
    if (color) {
      let cm = colorMap.get(color);
      if (!cm) { cm = new Map(); colorMap.set(color, cm); }
      cm.set(size, (cm.get(size) || 0) + stock);
    }
  }
  const sizes: JsonRecord[] = Array.from(sizeMap.entries()).map(([name, s]) => ({
    name,
    price: priceMax || null,
    stock: s.stock,
    is_available: s.stock > 0,
  }));
  const colors: JsonRecord[] = Array.from(colorMap.entries()).map(([name, sm]) => ({
    name,
    value: "",
    sizes: Array.from(sm.entries()).map(([size, stock]) => ({ size, stock })),
  }));
  if (colors.length && colors.length === sizes.length && sizes.length > 0) {
    const sizeNames = new Set(sizes.map((s) => String(s.name).toLowerCase()));
    const allRedundant = colors.every((c) => sizeNames.has(String(c.name).toLowerCase()));
    if (allRedundant) colors.length = 0;
  }
  return { sizes, colors };
}

async function fetchExistingByIds(ids: string[]): Promise<Record<string, JsonRecord>> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return {};
  const map: Record<string, JsonRecord> = {};
  const chunkSize = 200;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunkIds = ids.slice(i, i + chunkSize).map((id) => `vendor_${id}`);
    const { data, error } = await supabase
      .from("taager_products")
      .select("id,name,category,price,original_price,stock,stock_status,seller,brand,quick_details,content_ideas,how_to_use,videos,images,sizes,colors,raw_data")
      .in("id", chunkIds);
    if (error) throw error;
    for (const r of (data || [])) map[String(r.id)] = r as JsonRecord;
  }
  return map;
}

async function persistVendorRows(rows: JsonRecord[], allIds: string[], replaceStale: boolean) {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase service role is not configured");

  for (let i = 0; i < rows.length; i += VENDOR_CHUNK) {
    const chunk = rows.slice(i, i + VENDOR_CHUNK);
    const { error } = await supabase.from("taager_products").upsert(chunk, { onConflict: "id" });
    if (error) throw error;
  }

  if (replaceStale && allIds.length) {
    const staleChunk = 400;
    for (let i = 0; i < allIds.length; i += staleChunk) {
      const ids = allIds.slice(i, i + staleChunk).map((id) => `vendor_${id}`);
      const { error } = await supabase
        .from("taager_products")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("source", "vendor")
        .filter("id", "not.in", `(${ids.map((id) => `"${id}"`).join(",")})`);
      if (error) throw error;
    }
  }
}

function isSyncAuthorized(req: Request, url: URL): boolean {
  if (!VENDOR_SYNC_SECRET) return true;
  const headerSecret = req.headers.get("x-sync-secret") || "";
  const querySecret = url.searchParams.get("secret") || "";
  return headerSecret === VENDOR_SYNC_SECRET || querySecret === VENDOR_SYNC_SECRET;
}

async function probeSession(): Promise<JsonRecord> {
  const token = await refreshToken();
  const ok = Boolean(token);
  return {
    ok,
    token_prefix: token ? token.substring(0, 10) + "..." : "",
    session_valid: ok,
    hint: ok ? "" : "الجلسة غير صالحة — حدّث VENDOR_COOKIE_SESSION و VENDOR_COOKIE_XSRF من المتصفح",
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "status";

  try {
    if (action === "health") {
      return respond(JSON.stringify({ ok: true }));
    }

    if (action === "status") {
      return respond(JSON.stringify({
        ok: true,
        session_set: Boolean(VENDOR_COOKIE_SESSION),
        xsrf_set: Boolean(VENDOR_COOKIE_XSRF),
        countries: VENDOR_COUNTRIES,
        store_media: VENDOR_STORE_MEDIA,
        sync_secret_set: Boolean(VENDOR_SYNC_SECRET),
      }));
    }

    if (action === "probe") {
      return respond(JSON.stringify(await probeSession()));
    }

    if (action === "sync" || action === "sync-vendor") {
      if (!isSyncAuthorized(req, url)) {
        return respond(JSON.stringify({ error: "Unauthorized sync request" }), 401);
      }
      if (!VENDOR_COOKIE_SESSION || !VENDOR_COOKIE_XSRF) {
        return respond(JSON.stringify({ error: "VENDOR_COOKIE_SESSION و VENDOR_COOKIE_XSRF غير مضبوطين بعد" }), 400);
      }

      const maxPages = Math.min(Math.max(Number(url.searchParams.get("max_pages") || VENDOR_MAX_PAGES) || 0, 1), 200);
      const detailsLimit = Math.min(Math.max(Number(url.searchParams.get("details_limit") || VENDOR_DETAILS_LIMIT) || 0, 0), 1000);
      const fetchDetails = url.searchParams.get("fetch_details") !== "0";

      const probe = await probeSession();
      if (!probe.ok) {
        return respond(JSON.stringify({ error: "جلسة Vendoor غير صالحة", hint: probe.hint }), 401);
      }
      const fullToken = await refreshToken();

      const crawled = await crawlCatalog(fullToken, maxPages);
      if (!crawled.products.length) {
        return respond(JSON.stringify({ ok: false, error: "لا توجد منتجات أو الجلسة منتهية", pages_scanned: crawled.pagesScanned }));
      }

      let enriched = 0;
      if (fetchDetails && detailsLimit > 0) {
        const todo = crawled.products.slice(0, detailsLimit);
        const details = await mapLimit(todo, VENDOR_DETAILS_CONCURRENCY, async (card) => {
          try {
            const html = await fetchHtml(`${VENDOR_SITE}/product/${String(card.id)}`, {
              headers: { "Referer": `${VENDOR_SITE}/` },
            });
            return { card, detail: parseDetail(html) };
          } catch {
            return { card, detail: null };
          }
        });
        for (const d of details) {
          if (d.detail) enriched++;
          const card = crawled.products.find((p) => String(p.id) === String(d.card.id));
          if (card) card._detail = d.detail;
        }
      }

      const now = new Date().toISOString();
      const existingMap = await fetchExistingByIds(crawled.ids);
      const rows: JsonRecord[] = [];
      for (const card of crawled.products) {
        rows.push(await toDbRow(card, (card._detail as JsonRecord | null) || null, now, existingMap[`vendor_${card.id}`] || null));
      }

      await persistVendorRows(rows, crawled.ids, true);

      return respond(JSON.stringify({
        ok: true,
        synced_count: rows.length,
        ids_count: crawled.ids.length,
        pages_scanned: crawled.pagesScanned,
        details_fetched: enriched,
        details_total: fetchedDetailCount(rows),
        details_pending: Math.max(0, crawled.ids.length - fetchedDetailCount(rows)),
      }));
    }

    if (action === "deactivate-all") {
      if (!isSyncAuthorized(req, url)) {
        return respond(JSON.stringify({ error: "Unauthorized" }), 401);
      }
      const supabase = getSupabaseAdmin();
      if (!supabase) return respond(JSON.stringify({ error: "No admin" }), 500);
      const { error } = await supabase.from("taager_products").update({ is_active: false, updated_at: new Date().toISOString() }).eq("source", "vendor");
      if (error) throw error;
      return respond(JSON.stringify({ ok: true }));
    }

    if (action === "detail") {
      if (!isSyncAuthorized(req, url)) {
        return respond(JSON.stringify({ error: "Unauthorized" }), 401);
      }
      const pid = url.searchParams.get("id") || "";
      if (!/^\d+$/.test(pid)) {
        return respond(JSON.stringify({ error: "id غير صالح" }), 400);
      }
      const supabase = getSupabaseAdmin();
      if (!supabase) return respond(JSON.stringify({ error: "No admin" }), 500);
      const { data: existing } = await supabase
        .from("taager_products")
        .select("*")
        .eq("id", `vendor_${pid}`)
        .maybeSingle();

      const html = await fetchHtml(`${VENDOR_SITE}/product/${pid}`, {
        headers: { "Referer": `${VENDOR_SITE}/` },
      });
      const detail = parseDetail(html);
      if (!detail.name && !detail.vendorId) {
        return respond(JSON.stringify({ ok: false, error: "لم يستخرج شيء من صفحة المنتج — تأكد من الجلسة والمنتج", detail }), 404);
      }

      const existingRaw = existing && existing.raw_data && typeof existing.raw_data === "object"
        ? existing.raw_data as JsonRecord
        : {};
      const existingImages = existing && Array.isArray(existing.images) ? existing.images as string[] : [];
      const card: JsonRecord = {
        id: pid,
        name: (existing && existing.name) || String(detail.name || ""),
        price: existing && existing.price != null ? existing.price : (detail.price || ""),
        minPrice: existing && existingRaw.price_min != null ? String(existingRaw.price_min) : (detail.minPrice || ""),
        maxPrice: existing && existingRaw.price_max != null ? String(existingRaw.price_max) : (detail.maxPrice || ""),
        qty: String(detail.qty || (existing && existing.stock) || ""),
        commission: String(detail.commission || existingRaw.commission || ""),
        images: existingImages.length ? existingImages : (detail.mainImage ? [detail.mainImage as string] : []),
        zipUrl: String(detail.zipUrl || existingRaw.zip_url || ""),
        productUrl: `${VENDOR_SITE}/product/${pid}`,
        storeId: String(existingRaw.store_id || ""),
      };
      const row = await toDbRow(card, detail, new Date().toISOString(), existing || null);
      const { error } = await supabase.from("taager_products").upsert([row], { onConflict: "id" });
      if (error) throw error;
      return respond(JSON.stringify({ ok: true, id: `vendor_${pid}`, row }));
    }

    if (action === "stored-products") {
      const supabase = getSupabaseAdmin();
      if (!supabase) return respond(JSON.stringify({ error: "No admin" }), 500);
      const onlyVendor = url.searchParams.get("source") === "vendor";
      const country = (url.searchParams.get("country") || "").toUpperCase();
      const page = Math.max(Number(url.searchParams.get("page") || 1) || 1, 1);
      const per = Math.min(Math.max(Number(url.searchParams.get("limit") || 500) || 500, 1), 1000);
      let q = supabase.from("taager_products").select("*").range((page - 1) * per, page * per - 1);
      if (onlyVendor) q = q.eq("source", "vendor");
      if (country) q = q.contains("available_countries", [country]);
      const { data, error } = await q;
      if (error) throw error;
      return respond(JSON.stringify(data || []));
    }

    return respond(JSON.stringify({ error: "Unknown action" }), 400);
  } catch (e) {
    return respond(JSON.stringify({ error: (e as Error).message || String(e) }), 500);
  }
});

function fetchedDetailCount(rows: JsonRecord[]): number {
  let n = 0;
  for (const r of rows) {
    const raw = (r.raw_data && typeof r.raw_data === "object" ? r.raw_data as JsonRecord : {});
    if (raw.description || (Array.isArray(raw.variants) && (raw.variants as unknown[]).length)) n++;
  }
  return n;
}