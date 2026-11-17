import {
  absoluteJumiaUrl,
  discoverListing,
  discoverSitemap,
  readRobotsSitemaps,
  withPageNumber,
} from "../_lib/jumia.js";

/**
 * GET /api/jumia/discover?url=<jumia listing or sitemap>&page=1&mode=listing|sitemap
 *
 * Returns product cards for a listing page, or product URLs for a sitemap.
 * The dashboard calls this once per listing page; it never proxies the HTML.
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const urlParam = String(req.query.url || "").trim();
  const mode = String(req.query.mode || "").toLowerCase();

  try {
    if (mode === "sitemap" || /sitemap|\.xml(\.gz)?$/i.test(urlParam)) {
      if (!urlParam) {
        const sitemaps = await readRobotsSitemaps();
        res.status(200).json({ ok: true, kind: "sitemap-index", sitemaps, urls: [] });
        return;
      }
      const result = await discoverSitemap(urlParam);
      res.status(200).json({
        ok: true,
        ...result,
        urls: result.urls.slice(0, 20000),
        truncated: result.urls.length > 20000,
      });
      return;
    }

    if (!urlParam) {
      res.status(400).json({ ok: false, error: "أضف رابط قسم أو بحث من جوميا" });
      return;
    }
    const page = Number(req.query.page || 0);
    const target = page > 1 ? withPageNumber(urlParam, page) : absoluteJumiaUrl(urlParam);
    const result = await discoverListing(target);
    res.status(200).json({ ok: true, ...result });
  } catch (error) {
    const blocked = Boolean(error && error.blocked);
    res.status(blocked ? 429 : 502).json({
      ok: false,
      error: String(error && error.message ? error.message : error),
      blocked,
      attempts: error && error.attempts,
    });
  }
}
