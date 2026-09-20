const sharp = require("sharp");

const ALLOWED_HOSTS = new Set([
  "media.taager.com",
  "aff.ven-door.com",
  "iili.io",
  "a.nooncdn.com",
  "f.nooncdn.com",
  "msgqzgzoslearaprgiqq.supabase.co",
  "wwlwwgqfjhmchrijaojr.supabase.co",
]);

const PRIMARY_SUPABASE_HOST = "msgqzgzoslearaprgiqq.supabase.co";
const BACKUP_SUPABASE_HOST = "wwlwwgqfjhmchrijaojr.supabase.co";

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogv|mkv|avi|m3u8|mpg|mpeg|ts)([?#].*)?$/i;
const GIF_EXT_RE = /\.(gif)([?#].*)?$/i;

const FETCH_TIMEOUT_MS = 10000;

function fetchWithTimeout(url, opts) {
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, FETCH_TIMEOUT_MS);
  return fetch(url, Object.assign({}, opts, { signal: controller.signal })).finally(function () {
    clearTimeout(timer);
  });
}

function toImageUrl(value) {
  try {
    const u = new URL(String(value || ""));
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    if (!ALLOWED_HOSTS.has(u.hostname)) return "";
    if (u.username || u.password) return "";
    return u.toString();
  } catch {
    return "";
  }
}

function backupImageUrl(value) {
  try {
    const url = new URL(value);
    if (url.hostname !== PRIMARY_SUPABASE_HOST) return "";
    url.hostname = BACKUP_SUPABASE_HOST;
    return url.toString();
  } catch {
    return "";
  }
}

function canFailOver(status) {
  return status === 402 || status === 500 || status === 502 || status === 503 || status === 504;
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  const target = toImageUrl(q.u || q.url);
  if (!target) {
    return res.status(400).json({ error: "Invalid image url" });
  }
  if (VIDEO_EXT_RE.test(target)) {
    return res.status(400).json({ error: "Video url not supported" });
  }

  const requestedWidth = parseInt(q.w, 10);
  const width = Math.min(Math.max(Number.isFinite(requestedWidth) ? requestedWidth : 800, 16), 1400);
  const requestedQuality = parseInt(q.quality || q.q, 10);
  const quality = Math.min(Math.max(Number.isFinite(requestedQuality) ? requestedQuality : 75, 50), 90);

  try {
    const requestImage = (url) => fetchWithTimeout(url, {
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; BodaImageResizer/1.0)" },
    });
    const fallbackTarget = backupImageUrl(target);
    let upstream;
    try {
      upstream = await requestImage(target);
    } catch (firstError) {
      if (!fallbackTarget) throw firstError;
      upstream = await requestImage(fallbackTarget);
    }
    // Existing product rows may still contain the primary Storage URL. If it
    // is unavailable, request the identical object path from replicated backup.
    if (fallbackTarget && (!upstream.ok && canFailOver(upstream.status))) {
      upstream = await requestImage(fallbackTarget);
    }
    if (!upstream.ok) {
      return res.redirect(302, target);
    }

    const input = Buffer.from(await upstream.arrayBuffer());

    if (input.length > 50 * 1024 * 1024) {
      return res.status(413).json({ error: "Image too large" });
    }

    // Animated GIFs: serve the original bytes unchanged to preserve motion.
    // The edge cache still caches it, so repeat visits are fast.
    if (GIF_EXT_RE.test(target)) {
      res.setHeader("Content-Type", "image/gif");
      res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.status(200).send(input);
    }

    let output;
    try {
      output = await sharp(input, { failOn: "none" })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();
    } catch (err) {
      if (q.debug) return res.status(500).json({ error: "sharp failed: " + String(err && err.message || err) });
      return res.redirect(302, target);
    }

    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(output);
  } catch (err) {
    if (q.debug) return res.status(500).json({ error: "outer: " + String(err && err.message || err) });
    return res.redirect(302, target);
  }
};
