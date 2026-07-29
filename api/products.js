const SUPABASE_URL = "https://msgqzgzoslearaprgiqq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZ3F6Z3pvc2xlYXJhcHJnaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMzk3MTIsImV4cCI6MjA4NTkxNTcxMn0.fQu1toCisGIly8FZqHy3yoEwnY-e7vthk8PCmkBMifE";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const filter = req.query.filter || "";
  let url = `${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`;

  if (filter) {
    url += `&category=eq.${encodeURIComponent(filter)}`;
  }

  try {
    const response = await fetch(url, {
      headers: { apikey: SUPABASE_ANON_KEY },
    });

    if (!response.ok) {
      console.error("api/products: Supabase error", response.status);
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=1800");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.status(200).json([]);
    }

    const data = await response.json();

    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Vary", "Accept-Encoding");
    res.status(200).json(data);
  } catch (err) {
    console.error("api/products error:", err.message);
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json([]);
  }
}
