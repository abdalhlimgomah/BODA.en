import { getCatalog, normalizeCountry, rowMatchesCountry } from "./_lib/catalog.js";

/**
 * GET /api/catalog?country=EG&limit=8000
 *
 * Returns the full external catalog with only the columns a product card
 * needs. The old client path pulled a bounded 200-row slice from Supabase,
 * which is why most products never reached the listing page.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const country = normalizeCountry(req.query.country || "");
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 8000, 8000));

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Vary", "Accept-Encoding");
  res.setHeader(
    "Cache-Control",
    "public, max-age=120, s-maxage=600, stale-while-revalidate=3600"
  );

  try {
    const catalog = await getCatalog();
    const rows = country
      ? catalog.filter((row) => rowMatchesCountry(row, country))
      : catalog;

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
    available_countries: row.available_countries,
    stock: row.stock,
    stock_status: row.stock_status,
    taager_product_id: row.taager_product_id,
    created_at: row.created_at,
    source: "taager",
  };
}