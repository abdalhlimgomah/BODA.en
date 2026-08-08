const sharp = require("sharp");

const ALLOWED_HOSTS = new Set([
  "media.taager.com",
  "msgqzgzoslearaprgiqq.supabase.co",
]);

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

module.exports = async function handler(req, res) {
  const q = req.query || {};
  const target = toImageUrl(q.u || q.url);
  if (!target) {
    return res.status(400).json({ error: "Invalid image url" });
  }

  const requestedWidth = parseInt(q.w, 10);
  const width = Math.min(Math.max(Number.isFinite(requestedWidth) ? requestedWidth : 800, 16), 1400);
  const requestedQuality = parseInt(q.quality || q.q, 10);
  const quality = Math.min(Math.max(Number.isFinite(requestedQuality) ? requestedQuality : 75, 50), 90);

  try {
    const upstream = await fetch(target, {
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; BodaImageResizer/1.0)" },
    });
    if (!upstream.ok) {
      return res.redirect(302, target);
    }

    const input = Buffer.from(await upstream.arrayBuffer());

    if (input.length > 50 * 1024 * 1024) {
      return res.status(413).json({ error: "Image too large" });
    }

    let output;
    try {
      output = await sharp(input, { failOn: "none" })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();
    } catch {
      return res.redirect(302, target);
    }

    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(output);
  } catch {
    return res.redirect(302, target);
  }
};