import { getCatalog, normalizeCountry, rowMatchesCountry } from "./_lib/catalog.js";

/**
 * GET /api/catalog?country=EG&limit=8000&source=jumia
 *
 * Returns the full external catalog with only the columns a product card
 * needs. The old client path pulled a bounded 200-row slice from Supabase,
 * which is why most products never reached the listing page.
 *
 * `source` is optional (`taager` or `jumia`). Without it the response merges
 * both providers; Jumia rows carry an `external_url` and still open on the
 * BudoQ product page, where the purchase CTA points to Jumia.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const country = normalizeCountry(req.query.country || "");
  const source = String(req.query.source || "").trim().toLowerCase();
  const id = String(req.query.id || "").trim();
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 12000, 12000));

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Vary", "Accept-Encoding");
  res.setHeader(
    "Cache-Control",
    "public, max-age=120, s-maxage=600, stale-while-revalidate=3600"
  );

  try {
    const catalog = await getCatalog();
    let rows = country
      ? catalog.filter((row) => rowMatchesCountry(row, country))
      : catalog;
    if (source === "jumia") {
      rows = rows.filter((row) => row.source === "jumia");
    } else if (source === "taager") {
      // The admin lab uses `source=taager` for the whole supplier catalog:
      // legacy rows carry mixed labels (vendor, gotager, jammaleg, ...), and
      // they all behave as normal BudoQ products. Jumia is the only external
      // marketplace source.
      rows = rows.filter((row) => row.source !== "jumia");
    }

    if (id) {
      const wanted = id.toLowerCase();
      const row =
        rows.find((entry) => entry.id.toLowerCase() === wanted) ||
        rows.find((entry) => entry.id.toLowerCase() === "jumia_" + wanted) ||
        null;
      res.setHeader("X-Total-Count", row ? "1" : "0");
      res.setHeader("X-Catalog-Size", String(catalog.length));
      return res.status(200).json(row ? [publicCard(row)] : []);
    }

    res.setHeader("X-Total-Count", String(rows.length));
    res.setHeader("X-Catalog-Size", String(catalog.length));
    return res.status(200).json(rows.slice(0, limit).map(publicCard));
  } catch (error) {
    console.error("api/catalog:", error && error.message ? error.message : error);
    return res.status(200).json([]);
  }
}

function publicCard(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    brand: row.brand,
    price: row.price,
    original_price: row.original_price || null,
    image: row.image,
    images: row.images && row.images.length ? row.images : undefined,
    description: row.description || undefined,
    highlights: row.highlights && row.highlights.length ? row.highlights : undefined,
    available_countries: row.available_countries,
    stock: row.stock,
    stock_status: row.stock_status,
    taager_product_id: row.taager_product_id,
    created_at: row.created_at,
    source: row.source || "taager",
    external_url: row.external_url || null,
    rating: row.rating || 0,
    reviewCount: row.reviewCount || 0,
  };
}