const SUPABASE_BACKENDS = [
  {
    name: "primary",
    url: "https://msgqzgzoslearaprgiqq.supabase.co",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZ3F6Z3pvc2xlYXJhcHJnaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzk3MTIsImV4cCI6MjA4NTkxNTcxMn0.fQu1toCisGIly8FZqHy3yoEwnY-e7vthk8PCmkBMifE",
  },
  {
    name: "backup",
    url: "https://wwlwwgqfjhmchrijaojr.supabase.co",
    key: "sb_publishable_wIxpA7t3a2hII8asqYZ1Bg__NoMLLUU",
  },
];

function canFailOver(status) {
  return status === 402 || status === 500 || status === 502 || status === 503 || status === 504;
}

const FETCH_TIMEOUT_MS = 8000;

function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const filter = req.query.filter || "";
  let lastError = null;
  for (let index = 0; index < SUPABASE_BACKENDS.length; index += 1) {
    const backend = SUPABASE_BACKENDS[index];
    let url = `${backend.url}/rest/v1/products?select=*&order=created_at.desc`;
    if (filter) url += `&category=eq.${encodeURIComponent(filter)}`;

try {
      const response = await fetchWithTimeout(url, { headers: { apikey: backend.key } });
      if (response.ok) {
        const data = await response.json();
        res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET");
        res.setHeader("Vary", "Accept-Encoding");
        res.setHeader("X-Boda-Supabase-Backend", backend.name);
        return res.status(200).json(data);
      }

      lastError = new Error(`Supabase ${backend.name} returned ${response.status}`);
      console.error("api/products:", lastError.message);
      if (!canFailOver(response.status)) break;
    } catch (err) {
      lastError = err;
      console.error(`api/products: ${backend.name} unavailable:`, err.message);
    }
  }

  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=1800");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).json([]);
}
