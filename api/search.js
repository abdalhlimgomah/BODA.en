import {
  getCatalog,
  normalizeCountry,
  searchCatalog,
  suggestCatalog,
} from "./_lib/catalog.js";

/**
 * GET /api/search?q=...&country=EG&limit=300
 * GET /api/search?mode=suggest&q=...&country=EG
 *
 * Search runs on the server against the full external catalog, so the browser
 * no longer has to download thousands of rows before the first query.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const query = String(req.query.q || req.query.query || "").trim();
  const country = normalizeCountry(req.query.country || "");
  const mode = String(req.query.mode || "search").toLowerCase();

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Vary", "Accept-Encoding");
  res.setHeader(
    "Cache-Control",
    "public, max-age=15, s-maxage=60, stale-while-revalidate=300"
  );

  if (!query) {
    return res.status(200).json({
      query: "",
      total: 0,
      items: [],
      suggestions: [],
      facets: { categories: [], brands: [] },
    });
  }

  try {
    const catalog = await getCatalog();

    if (mode === "suggest") {
      const suggestions = suggestCatalog(catalog, query, { country, limit: 8 });
      return res.status(200).json({ query, suggestions });
    }

    const result = searchCatalog(catalog, query, {
      country,
      limit: req.query.limit || 300,
      offset: req.query.offset || 0,
    });

    res.setHeader("X-Catalog-Size", String(catalog.length));
    return res.status(200).json({
      query,
      country,
      total: result.total,
      count: result.items.length,
      items: result.items,
      facets: result.facets,
    });
  } catch (error) {
    console.error("api/search:", error && error.message ? error.message : error);
    // Never break the storefront because the catalog refresh failed. The client
    // falls back to its local index when `error` is present.
    return res.status(200).json({
      query,
      total: 0,
      items: [],
      facets: { categories: [], brands: [] },
      error: "search_unavailable",
    });
  }
}