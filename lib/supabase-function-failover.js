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

function shouldFailOver(status) {
  return status === 402 || status === 500 || status === 502 || status === 503 || status === 504;
}

function copySafeHeaders(source, target) {
  ["content-type", "cache-control", "etag", "last-modified"].forEach((name) => {
    const value = source.headers.get(name);
    if (value) target.setHeader(name, value);
  });
}

async function proxyPublicSupabaseFunction(req, res, functionName) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const pathParts = Array.isArray(req.query.path)
    ? req.query.path
    : req.query.path
    ? [req.query.path]
    : [];
  const suffix = pathParts.length ? `/${pathParts.map(encodeURIComponent).join("/")}` : "";
  const search = String(req.url || "").includes("?")
    ? String(req.url).slice(String(req.url).indexOf("?"))
    : "";

  let lastError = null;
  for (let index = 0; index < SUPABASE_BACKENDS.length; index += 1) {
    const backend = SUPABASE_BACKENDS[index];
    const targetUrl = `${backend.url}/functions/v1/${functionName}${suffix}${search}`;
    try {
      const upstream = await fetch(targetUrl, {
        method: req.method,
        headers: {
          apikey: backend.key,
          Authorization: `Bearer ${backend.key}`,
          Accept: req.headers.accept || "*/*",
        },
      });

      if (upstream.ok || !shouldFailOver(upstream.status)) {
        copySafeHeaders(upstream, res);
        res.setHeader("X-Boda-Supabase-Backend", backend.name);
        return res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
      }
      lastError = new Error(`${backend.name} returned ${upstream.status}`);
    } catch (error) {
      lastError = error;
    }
  }

  console.error(`Supabase ${functionName} proxy unavailable:`, lastError && lastError.message);
  return res.status(503).json({ error: "Service temporarily unavailable" });
}

module.exports = { proxyPublicSupabaseFunction };
