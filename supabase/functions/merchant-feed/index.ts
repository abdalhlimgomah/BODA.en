import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SITE_URL = Deno.env.get("SITE_URL") || "https://budoq.vercel.app";
const FEED_SECRET = Deno.env.get("MERCHANT_FEED_SECRET") || "";

// Rate limiting
const RL_WINDOW_MS = 60_000;
const RL_MAX = 30;

async function checkRateLimit(sb: ReturnType<typeof createClient>, ip: string, fn: string): Promise<boolean> {
  const ws = new Date(Date.now() - RL_WINDOW_MS).toISOString();
  try {
    const { count } = await sb.from("api_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("ip", ip).eq("function_name", fn).gt("created_at", ws);
    if (count && count >= RL_MAX) return false;
    sb.from("api_rate_limits").insert({ ip, function_name: fn }).catch(() => {});
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
  return result;
}

function getAvailability(p: Record<string, unknown>): string {
  const stock = Number(p.stock || p.quantity || p.inventory || 0);
  if (stock > 0) return "in_stock";
  if (p.availability === "preorder") return "preorder";
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
  const title = String(p.seo_title || name);
  const desc = String(p.meta_description || p.description || p.short_description || title);
  const link = `${SITE_URL}/pages/product.html?id=${encodeURIComponent(id)}`;
  const image = getFirstImage(p);
  const price = Number(p.currentPrice || p.price || 0);
  const salePrice = Number(p.sale_price || p.discount_price || 0);
  const currency = "EGP";
  const availability = getAvailability(p);
  const brand = String(p.brand || p.seller_name || p.seller || "Buda");
  const gtin = String(p.gtin || p.ean || p.upc || "");
  const mpn = String(p.mpn || p.sku || id);
  const googleCategory = getGoogleCategory(p);
  const productType = String(p.category || p.main_category || "");
  const shippingWeight = p.weight ? `${p.weight} kg` : "";
  const color = String(p.color || "");
  const size = String(p.size || "");
  const gender = String(p.gender || "");
  const ageGroup = String(p.age_group || "");

  let xml = `    <item>\n`;
  xml += `      <g:id>${escXml(id)}</g:id>\n`;
  xml += `      <g:title>${escXml(truncate(title, 150))}</g:title>\n`;
  xml += `      <g:description>${escXml(truncate(desc, 5000))}</g:description>\n`;
  xml += `      <g:link>${escXml(link)}</g:link>\n`;
  if (image) xml += `      <g:image_link>${escXml(image)}</g:image_link>\n`;
  xml += `      <g:availability>${availability}</g:availability>\n`;
  xml += `      <g:price>${price.toFixed(2)} ${currency}</g:price>\n`;
  if (salePrice > 0 && salePrice < price) {
    xml += `      <g:sale_price>${salePrice.toFixed(2)} ${currency}</g:sale_price>\n`;
  }
  xml += `      <g:condition>new</g:condition>\n`;
  xml += `      <g:brand>${escXml(brand)}</g:brand>\n`;
  if (gtin) xml += `      <g:gtin>${escXml(gtin)}</g:gtin>\n`;
  if (mpn) xml += `      <g:mpn>${escXml(mpn)}</g:mpn>\n`;
  if (googleCategory) xml += `      <g:google_product_category>${escXml(googleCategory)}</g:google_product_category>\n`;
  if (productType) xml += `      <g:product_type>${escXml(productType)}</g:product_type>\n`;
  if (shippingWeight) xml += `      <g:shipping_weight>${escXml(shippingWeight)}</g:shipping_weight>\n`;
  if (color) xml += `      <g:color>${escXml(color)}</g:color>\n`;
  if (size) xml += `      <g:size>${escXml(size)}</g:size>\n`;
  if (gender) xml += `      <g:gender>${escXml(gender)}</g:gender>\n`;
  if (ageGroup) xml += `      <g:age_group>${escXml(ageGroup)}</g:age_group>\n`;

  const images = getAllImages(p);
  images.slice(1, 10).forEach((img) => {
    xml += `      <g:additional_image_link>${escXml(img)}</g:additional_image_link>\n`;
  });

  xml += `      <g:shipping>\n`;
  xml += `        <g:country>EG</g:country>\n`;
  xml += `        <g:service>Standard</g:service>\n`;
  xml += `        <g:price>0.00 EGP</g:price>\n`;
  xml += `      </g:shipping>\n`;

  const idExists = (gtin || mpn) ? "TRUE" : "FALSE";
  xml += `      <g:identifier_exists>${idExists}</g:identifier_exists>\n`;
  xml += `    </item>\n`;
  return xml;
}

async function generateFeed(sb: ReturnType<typeof createClient>): Promise<string> {
  const { data: products, error } = await sb
    .from("products")
    .select("*")
    .limit(10000);

  if (error) throw error;

  const activeProducts = (products || []).filter((p: Record<string, unknown>) => {
    const price = Number(p.currentPrice || p.price || 0);
    return p.is_active !== false && price > 0;
  });

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n`;
  xml += `  <channel>\n`;
  xml += `    <title>Buda - Product Feed</title>\n`;
  xml += `    <link>${SITE_URL}/</link>\n`;
  xml += `    <description>Google Shopping Product Feed for Buda</description>\n`;

  for (const p of activeProducts) {
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
    const { data: products } = await sb.from("products").select("id,currentPrice,price,is_active").limit(10000);
    const active = (products || []).filter((p: Record<string, unknown>) => {
      const price = Number(p.currentPrice || p.price || 0);
      return p.is_active !== false && price > 0;
    });
    return new Response(JSON.stringify({
      status: "ok",
      total: products?.length || 0,
      active: active.length,
      feed_url: `${SITE_URL}/api/merchant-feed/feed.xml`,
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
