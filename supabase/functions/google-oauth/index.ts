import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RL_WINDOW_MS = 60_000;
const RL_MAX = 20;

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
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const clientIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (supabaseUrl && supabaseKey) {
    const sb = createClient(supabaseUrl, supabaseKey);
    const ok = await checkRateLimit(sb, clientIp, "google-oauth");
    if (!ok) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  }

  try {
    const { code, redirect_uri } = await req.json();
    if (!code) {
      return new Response(JSON.stringify({ error: "Missing code" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID") || "";
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "Missing Google OAuth config" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
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
      return new Response(JSON.stringify({ error: "Token exchange failed", details: tokenData }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userRes.json();

    if (!userRes.ok || !userData.email) {
      return new Response(JSON.stringify({ error: "Failed to fetch user info", details: userData }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        id: userData.id,
        email: userData.email,
        name: userData.name || userData.given_name || "Google User",
        picture: userData.picture || "",
        provider: "google",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
