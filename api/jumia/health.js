import { JUMIA_VERSION } from "../_lib/jumia.js";

/**
 * GET /api/jumia/health
 * Used by the dashboard to auto-detect a working scraper API.
 */
export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  res.status(200).json({
    ok: true,
    service: "jumia-scraper",
    version: JUMIA_VERSION,
    runtime: "vercel",
    time: new Date().toISOString(),
  });
}
