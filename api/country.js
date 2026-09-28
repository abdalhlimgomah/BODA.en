// Resolves the visitor's country from the edge/hosting geo headers so a first
// visit lands on the right storefront instead of always defaulting to Egypt.
// Vercel exposes x-vercel-ip-country; Cloudflare fronts expose cf-ipcountry.
// Localhost / unknown hosting has no header, so the caller's ?default applies.
const SUPPORTED = new Set(["EG", "SA"]);

const HEADER_ORDER = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "x-country-code",
  "x-geo-country",
];

function normalize(raw) {
  const code = String(raw || "").trim().toUpperCase();
  // Headers may arrive as "SA" or as a full region list ("SA,US").
  const first = code.split(",")[0].trim();
  if (SUPPORTED.has(first)) return first;
  return null;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const fallback = normalize(req.query.default) || "EG";

  let detected = null;
  for (const header of HEADER_ORDER) {
    detected = normalize(req.headers[header]);
    if (detected) break;
  }

  // Never CDN-cache this: the answer is per-visitor, and the response body is
  // not part of the cache key.
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  res.setHeader("Vary", "x-vercel-ip-country, cf-ipcountry");

  return res.status(200).json({
    country: detected || fallback,
    detected: Boolean(detected),
  });
}
