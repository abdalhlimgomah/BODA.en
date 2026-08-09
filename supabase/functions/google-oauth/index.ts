import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RL_WINDOW_MS = 60_000;
const RL_MAX = 20;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function respond(body: string, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", ...extraHeaders },
  });
}

async function checkRateLimit(sb: ReturnType<typeof createClient>, ip: string, fn: string): Promise<boolean> {
  const ws = new Date(Date.now() - RL_WINDOW_MS).toISOString();
  try {
    const { count } = await sb.from("api_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("ip", ip).eq("function_name", fn).gt("created_at", ws);
    if (count && count >= RL_MAX) return false;
    sb.from("api_rate_limits").insert({ ip, function_name: fn }).catch(() => {});
    return true;
  } catch { return true; }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return respond(JSON.stringify({ error: "Method not allowed" }), 405);
  }

  const clientIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (supabaseUrl && supabaseKey) {
    const sb = createClient(supabaseUrl, supabaseKey);
    const ok = await checkRateLimit(sb, clientIp, "google-oauth");
    if (!ok) {
      return respond(JSON.stringify({ error: "Rate limit exceeded" }), 429);
    }
  }

  try {
    const { code, redirect_uri } = await req.json();
    if (!code) {
      return respond(JSON.stringify({ error: "Missing code" }), 400);
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID") || "";
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
    if (!clientId || !clientSecret) {
      return respond(JSON.stringify({ error: "Missing Google OAuth config" }), 500);
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirect_uri || "https://budoq.vercel.app/pages/signin/login.html",
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return respond(JSON.stringify({ error: "Token exchange failed", details: tokenData }), 400);
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    if (!userRes.ok || !userData.email) {
      return respond(JSON.stringify({ error: "Failed to fetch user info", details: userData }), 400);
    }

    return respond(
      JSON.stringify({
        id: userData.id,
        email: userData.email,
        name: userData.name || userData.given_name || "Google User",
        picture: userData.picture || "",
        provider: "google",
      })
    );
  } catch (error) {
    return respond(JSON.stringify({ error: error.message }), 500);
  }
});
