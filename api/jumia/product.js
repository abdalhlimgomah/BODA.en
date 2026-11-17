import { fetchJumiaProduct, parseProduct } from "../_lib/jumia.js";

export const config = {
  api: {
    bodyParser: { sizeLimit: "12mb" },
  },
};

async function rawBody(req) {
  if (typeof req.body === "string") return req.body;
  if (req.body && typeof req.body === "object") return "";
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * GET  /api/jumia/product?url=<jumia product url>
 * POST /api/jumia/product   { url, html? }
 *
 * POST with `html` parses a page the user saved/pasted locally — useful when
 * Jumia blocks the scraper but the page opens fine in a normal browser.
 */
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    if (req.method === "POST") {
      let payload = {};
      if (req.body && typeof req.body === "object") {
        payload = req.body;
      } else {
        const body = await rawBody(req);
        if (String(req.headers["content-type"] || "").includes("application/json")) {
          try {
            payload = JSON.parse(body);
          } catch (_error) {
            payload = {};
          }
        } else {
          payload = { html: body };
        }
      }
      const targetUrl = String(payload.url || req.query.url || "").trim();
      const html = String(payload.html || "");
      if (html.length > 200) {
        res.status(200).json({
          ok: true,
          product: parseProduct(html, targetUrl),
          via: "pasted-html",
        });
        return;
      }
      if (!targetUrl) {
        res.status(400).json({ ok: false, error: "أضف رابط المنتج أو HTML الصفحة" });
        return;
      }
      const product = await fetchJumiaProduct(targetUrl);
      res.status(200).json({ ok: true, product });
      return;
    }

    if (req.method !== "GET") {
      res.setHeader("Allow", "GET, POST");
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }

    const targetUrl = String(req.query.url || "").trim();
    if (!targetUrl) {
      res.status(400).json({ ok: false, error: "أضف رابط المنتج" });
      return;
    }
    const product = await fetchJumiaProduct(targetUrl);
    res.status(200).json({ ok: true, product });
  } catch (error) {
    const blocked = Boolean(error && error.blocked);
    res.status(blocked ? 429 : 502).json({
      ok: false,
      error: String(error && error.message ? error.message : error),
      blocked,
    });
  }
}
