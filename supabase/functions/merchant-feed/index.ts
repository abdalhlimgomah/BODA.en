import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SITE_URL = Deno.env.get("SITE_URL") || "https://budoq.com";
const FEED_SECRET = Deno.env.get("MERCHANT_FEED_SECRET") || "";

// Rate limiting
const RL_WINDOW_MS = 60_000;
const RL_MAX = 30;

async function checkRateLimit(sb: any, ip: string, fn: string): Promise<boolean> {
  const ws = new Date(Date.now() - RL_WINDOW_MS).toISOString();
  try {
    const { count } = await sb.from("api_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("ip", ip).eq("function_name", fn).gt("created_at", ws);
    if (count && count >= RL_MAX) return false;
    sb.from("api_rate_limits").insert({ ip, function_name: fn }).then(() => {}, () => {});
    return true;
  } catch { return true; }
}

const GOOGLE_CATEGORIES: Record<string, string> = {
  electronics: "Electronics",
  fashion: "Apparel & Accessories > Clothing",
  beauty: "Beauty & Personal Care",
  home: "Home & Garden",
  sports: "Sports & Outdoors",
  books: "Media > Books",
  food: "Food & Beverages",
  health: "Health & Beauty",
  toys: "Toys & Games",
  automotive: "Auto & Tires",
  watches: "Jewelry & Watches",
  perfumes: "Beauty & Personal Care > Fragrances & Deodorants",
  bags: "Luggage & Bags",
  shoes: "Apparel & Accessories > Shoes",
};

/** Price tiers cache — loaded once per invocation from the price_tiers table
 *  (same tiers the storefront PricingEngine uses for the on-site markup). */
let _tiersCache: { min_price: number; max_price: number | null; markup: number }[] | null = null;

async function loadTiers(sb: any): Promise<typeof _tiersCache> {
  if (_tiersCache) return _tiersCache;
  const { data, error } = await sb
    .from("price_tiers")
    .select("min_price,max_price,markup,sort_order,is_active,country_code")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  const cc = "EG"; // Feed is generated for the EG storefront
  const filtered = (data || []).filter((t: Record<string, unknown>) => {
    const tc = String(t.country_code || "EG").toUpperCase();
    return tc === cc || (!t.country_code && cc === "EG");
  });
  _tiersCache = (filtered.length ? filtered : data || []);
  return _tiersCache;
}

/** Same logic as PricingEngine.calculate: find matching tier, add its markup. */
function applyMarkup(price: number): number {
  if (!(price > 0)) return price;
  const tiers = _tiersCache || [];
  for (const t of tiers) {
    if (price >= t.min_price && (t.max_price === null || price <= t.max_price)) {
      const selling = price + Number(t.markup || 0);
      return selling < price ? price : selling;
    }
  }
  return price;
}

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function escXml(s: string): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function truncate(str: string, max: number): string {
  if (!str) return "";
  const clean = str.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.substring(0, max - 3).trim() + "...";
}

function getFirstImage(p: Record<string, unknown>): string {
  if (typeof p.image === "string" && (p.image as string).startsWith("http")) return p.image as string;
  const images = p.images;
  if (Array.isArray(images)) {
    for (const img of images) {
      if (typeof img === "string" && img.startsWith("http")) return img;
    }
  }
  return "";
}

function getAllImages(p: Record<string, unknown>): string[] {
  const result: string[] = [];
  if (typeof p.image === "string" && (p.image as string).startsWith("http")) result.push(p.image as string);
  const images = p.images;
  if (Array.isArray(images)) {
    for (const img of images) {
      if (typeof img === "string" && img.startsWith("http") && !result.includes(img)) result.push(img);
    }
  }
  for (let i = 1; i <= 8; i++) {
    const img = p[`image${i}`];
    if (typeof img === "string" && (img as string).startsWith("http") && !result.includes(img)) result.push(img);
  }
  return result;
}

function getAvailability(p: Record<string, unknown>): string {
  if (p.stock_status === "out_of_stock") return "out_of_stock";
  if (p.stock_status === "preorder") return "preorder";
  const stock = Number(p.stock || 0);
  if (stock > 0) return "in_stock";
  return "out_of_stock";
}

function getGoogleCategory(p: Record<string, unknown>): string {
  const cat = String(p.category || p.main_category || "").toLowerCase().trim();
  for (const [key, val] of Object.entries(GOOGLE_CATEGORIES)) {
    if (cat.includes(key)) return val;
  }
  return cat ? "Other" : "";
}

function buildItem(p: Record<string, unknown>): string {
  const id = String(p.id || "");
  if (!id) return "";

  const name = String(p.name || "منتج");
  const title = name;
  const desc = String(p.description || p.quick_details || title);
  const link = `${SITE_URL}/pages/product.html?id=${encodeURIComponent(id)}`;
  const image = getFirstImage(p);
  const price = Number(p.price || 0);
  const originalPrice = Number(p.original_price || 0);
  const currency = "EGP";
  const availability = getAvailability(p);
  const brand = String(p.brand || p.seller || "BudoQ");
  const googleCategory = getGoogleCategory(p);
  const productType = String(p.category || "");

  // Final selling price = supplier price + tier markup (same as storefront)
  const sellingPrice = round2(applyMarkup(price));
  // Real discount anchor only: show sale_price when original_price is truely
  // above the selling price. Otherwise g:price IS the selling price.
  const realOriginal = originalPrice > 0 ? originalPrice : 0;
  const useSale = realOriginal > sellingPrice && sellingPrice > 0;
  const displayPrice = useSale ? realOriginal : sellingPrice; // <g:price>

  let xml = `    <item>\n`;
  xml += `      <g:id>${escXml(id)}</g:id>\n`;
  xml += `      <g:title>${escXml(truncate(title, 150))}</g:title>\n`;
  xml += `      <g:description>${escXml(truncate(desc, 5000))}</g:description>\n`;
  xml += `      <g:link>${escXml(link)}</g:link>\n`;
  if (image) xml += `      <g:image_link>${escXml(image)}</g:image_link>\n`;
  xml += `      <g:availability>${availability}</g:availability>\n`;
  xml += `      <g:price>${displayPrice.toFixed(2)} ${currency}</g:price>\n`;
  if (useSale) {
    xml += `      <g:sale_price>${sellingPrice.toFixed(2)} ${currency}</g:sale_price>\n`;
  }
  xml += `      <g:condition>new</g:condition>\n`;
  xml += `      <g:brand>${escXml(brand)}</g:brand>\n`;
  xml += `      <g:mpn>${escXml(id)}</g:mpn>\n`;
  if (googleCategory) xml += `      <g:google_product_category>${escXml(googleCategory)}</g:google_product_category>\n`;
  if (productType) xml += `      <g:product_type>${escXml(productType)}</g:product_type>\n`;

  const images = getAllImages(p);
  images.slice(1, 10).forEach((img) => {
    xml += `      <g:additional_image_link>${escXml(img)}</g:additional_image_link>\n`;
  });

  xml += `      <g:shipping>\n`;
  xml += `        <g:country>EG</g:country>\n`;
  xml += `        <g:service>Standard</g:service>\n`;
  xml += `        <g:price>50.00 EGP</g:price>\n`;
  xml += `      </g:shipping>\n`;

  xml += `      <g:identifier_exists>FALSE</g:identifier_exists>\n`;
  xml += `    </item>\n`;
  return xml;
}

async function generateFeed(sb: any): Promise<string> {
  await loadTiers(sb);
  const TAAGER_COLUMNS = "id,name,description,quick_details,price,original_price,image,images,image1,image2,image3,image4,image5,image6,image7,image8,stock,stock_status,brand,seller,category,is_active";

  const all: Record<string, unknown>[] = [];
  const PAGE_SIZE = 1000;
  for (let offset = 0; offset < 200000; offset += PAGE_SIZE) {
    const { data, error } = await sb
      .from("taager_products")
      .select(TAAGER_COLUMNS)
      .eq("is_active", true)
      .gt("price", 0)
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const p of data) all.push(p);
    if (data.length < PAGE_SIZE) break;
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n`;
  xml += `  <channel>\n`;
  xml += `    <title>BudoQ - Product Feed</title>\n`;
  xml += `    <link>${SITE_URL}/</link>\n`;
  xml += `    <description>Google Shopping Product Feed for BudoQ</description>\n`;

  for (const p of all) {
    xml += buildItem(p);
  }

  xml += `  </channel>\n`;
  xml += `</rss>`;
  return xml;
}

serve(async (req) => {
  const clientIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    if (!await checkRateLimit(sb, clientIp, "merchant-feed")) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  }

  const url = new URL(req.url);
  const path = url.pathname;

  // Normalize: detect if called via Supabase gateway (/functions/v1/merchant-feed/...)
  const fnPrefix = "/functions/v1/merchant-feed";
  const localPrefix = "/merchant-feed";
  const base = path.startsWith(fnPrefix)
    ? path.slice(fnPrefix.length)
    : path.startsWith(localPrefix)
    ? path.slice(localPrefix.length)
    : path;

  // Health / Stats
  if (base === "/stats" || base === "/" || base === "") {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    try { await loadTiers(sb); } catch (_e) {}
    const PAGE_SIZE = 1000;
    let total = 0, active = 0;
    for (let offset = 0; offset < 200000; offset += PAGE_SIZE) {
      const { data: products, error } = await sb.from("taager_products")
        .select("id,price,stock,is_active").range(offset, offset + PAGE_SIZE - 1);
      if (error) break;
      if (!products || products.length === 0) break;
      for (const p of products) {
        total++;
        const pr = Number(p.price || 0);
        if (p.is_active !== false && pr > 0) active++;
      }
      if (products.length < PAGE_SIZE) break;
    }
    return new Response(JSON.stringify({
      status: "ok",
      total,
      active,
      tiers: _tiersCache?.length || 0,
      feed_url: `${SUPABASE_URL}/functions/v1/merchant-feed/feed.xml`,
      last_updated: new Date().toISOString(),
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Feed XML
  if (base === "/feed.xml" || base === "/feed") {
    try {
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const xml = await generateFeed(sb);
      return new Response(xml, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      });
    } catch (err) {
      return new Response(`<?xml version="1.0"?><error>${escXml(String(err))}</error>`, {
        status: 500,
        headers: { "Content-Type": "application/xml" },
      });
    }
  }

  // Default: serve Feed XML at root (function is dedicated to merchant feed)
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const xml = await generateFeed(sb);
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    return new Response(`<?xml version="1.0"?><error>${escXml(String(err))}</error>`, {
      status: 500,
      headers: { "Content-Type": "application/xml" },
    });
  }
});
