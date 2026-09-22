// Edge-cached assembly of the home page dynamic config (hero, banners,
// categories, mega offers, smart categories, ad banners). The browser makes
// ONE request here instead of ~10 sequential Supabase REST calls, and the
// response is cached on Vercel's CDN for shared visitors.
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
  {
    name: "backup3",
    url: "https://qhqkgrpezoaugyhzrgyc.supabase.co",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFocWtncnBlem9hdWd5aHpyZ3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4OTM2ODYsImV4cCI6MjEwNTQ2OTY4Nn0.1ANBV4Bm4JyZWMnXb1CTxkf36eRDGZOIOShK_j3Ynt8",
  },
];

function canFailOver(status) {
  return status === 402 || status === 500 || status === 502 || status === 503 || status === 504;
}

const FETCH_TIMEOUT_MS = 8000;

function fetchWithTimeout(url, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { headers, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function getJson(url, headers) {
  const response = await fetchWithTimeout(url, headers);
  if (!response.ok) {
    const err = new Error(`HTTP ${response.status} for ${url.slice(0, 90)}`);
    err.status = response.status;
    throw err;
  }
  return response.json();
}

async function assembleConfig(backend, country) {
  const base = `${backend.url}/rest/v1`;
  const headers = { apikey: backend.key };

  let pageSections = await getJson(
    `${base}/home_page_sections?select=id,section_type&country=eq.${encodeURIComponent(country)}&is_active=eq.true`,
    headers,
  );
  if (!pageSections || !pageSections.length) {
    pageSections = await getJson(
      `${base}/home_page_sections?select=id,section_type&country=eq.EG&is_active=eq.true`,
      headers,
    );
  }
  if (!pageSections || !pageSections.length) return null;

  const sectionMap = {};
  pageSections.forEach((s) => { sectionMap[s.section_type] = s.id; });

  const out = {};
  const jobs = [];

  if (sectionMap.hero) {
    jobs.push(
      getJson(`${base}/home_hero_slides?select=*&section_id=eq.${sectionMap.hero}&order=sort_order.asc`, headers)
        .then((rows) => { if (rows && rows.length) out.hero = rows; }),
    );
  }

  if (sectionMap.categories) {
    jobs.push(
      getJson(`${base}/home_categories?select=*&section_id=eq.${sectionMap.categories}&order=sort_order.asc`, headers)
        .then((rows) => { if (rows && rows.length) out.categories = rows; }),
    );
  }

  if (sectionMap.banner_top) {
    jobs.push(
      getJson(`${base}/home_banners?select=*&section_id=eq.${sectionMap.banner_top}&order=sort_order.asc`, headers)
        .then((rows) => { if (rows && rows.length) out.banners = rows; }),
    );
  }

  if (sectionMap.mega_offers) {
    const mid = sectionMap.mega_offers;
    jobs.push(
      getJson(`${base}/home_section_config?select=config_key,config_value&section_id=eq.${mid}`, headers)
        .then((rows) => {
          if (rows && rows.length) {
            const cfg = {};
            rows.forEach((c) => { cfg[c.config_key] = c.config_value; });
            out.megaConfig = cfg;
          }
        }),
    );
    jobs.push(
      getJson(`${base}/home_mega_products?select=product_id,col&section_id=eq.${mid}&order=sort_order.asc`, headers)
        .then((rows) => {
          rows = rows || [];
          const hasCol = rows.some((r) => r.col !== undefined && r.col !== null);
          if (hasCol) {
            out.megaCol1 = rows.filter((r) => String(r.col) === "1").map((r) => r.product_id);
            out.megaCol2 = rows.filter((r) => String(r.col) === "2").map((r) => r.product_id);
          } else {
            out.megaCol1 = [];
            out.megaCol2 = rows.map((r) => r.product_id);
          }
        }),
    );
    jobs.push(
      getJson(`${base}/home_mega_banners?select=*&section_id=eq.${mid}&order=sort_order.asc`, headers)
        .then((rows) => { if (rows && rows.length) out.megaBanners = rows; }),
    );
  }

  const smartQuery =
    `${base}/smart_category_showcase?select=*&is_active=eq.true&country_code=eq.${encodeURIComponent(country)}&order=sort_order.asc`;
  jobs.push(
    getJson(smartQuery, headers)
      .then(async (rows) => {
        if (!rows || !rows.length) {
          rows = await getJson(`${base}/smart_category_showcase?select=*&is_active=eq.true&country_code=eq.EG&order=sort_order.asc`, headers);
        }
        if (rows && rows.length) out.smartCategories = rows;
      }),
  );

  if (sectionMap.ad_banners) {
    jobs.push(
      getJson(`${base}/home_ad_banners?select=*&section_id=eq.${sectionMap.ad_banners}&is_active=eq.true&order=sort_order.asc`, headers)
        .then((rows) => { if (rows && rows.length) out.adBanners = rows; }),
    );
  }

  await Promise.all(jobs);
  return out;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const country = String(req.query.country || "EG").slice(0, 3).toUpperCase() || "EG";
  let lastError = null;

  for (let index = 0; index < SUPABASE_BACKENDS.length; index += 1) {
    const backend = SUPABASE_BACKENDS[index];
    try {
      const data = await assembleConfig(backend, country);
      if (data) {
        res.setHeader("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=3600");
        res.setHeader("Vary", "Accept-Encoding");
        res.setHeader("X-Boda-HomeConfig-Backend", backend.name);
        return res.status(200).json(data);
      }
      lastError = new Error(`home_page_sections empty for ${country}`);
    } catch (err) {
      lastError = err;
      console.error(`api/home-config: ${backend.name} unavailable:`, err.message);
      if (canFailOver(err.status)) continue;
      break;
    }
  }

  console.error("api/home-config: all backends failed:", lastError && lastError.message);
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=120, stale-while-revalidate=600");
  res.status(200).json({ error: "unavailable", hero: [], banners: [] });
}