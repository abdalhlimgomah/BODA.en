import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SITE_URL = Deno.env.get("SITE_URL") || "https://budoq.com";

const TAAGER_COLUMNS = "id,is_active";

function escXml(s: string): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function generateSitemap(sb: ReturnType<typeof createClient>): Promise<string> {
  const PAGE_SIZE = 1000;
  let allIds: string[] = [];

  for (let offset = 0; offset < 100000; offset += PAGE_SIZE) {
    const { data, error } = await sb
      .from("taager_products")
      .select(TAAGER_COLUMNS)
      .eq("is_active", true)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const p of data) {
      if (p.id) allIds.push(String(p.id));
    }

    if (data.length < PAGE_SIZE) break;
  }

  const today = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const id of allIds) {
    xml += `  <url>\n`;
    xml += `    <loc>${SITE_URL}/pages/product.html?id=${escXml(id)}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>`;
  return xml;
}

serve(async (req) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response("Missing Supabase env vars", { status: 500 });
  }

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const xml = await generateSitemap(sb);
    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    return new Response(`<?xml version="1.0"?><error>${escXml(String(err))}</error>`, {
      status: 500,
      headers: { "Content-Type": "application/xml" },
    });
  }
});
