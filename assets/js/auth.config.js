// Central auth config to avoid mismatched client IDs across pages.
window.__Buda_GOOGLE_CLIENT_ID =
  "768837122951-kk6i57qs3hkpjnvavhfes0h51j774q3s.apps.googleusercontent.com";

// Taager API configuration
// تم نقل المفاتيح السرية إلى Supabase Edge Function Secrets (آمنة)
// لا تخزن أي مفاتيح حساسة هنا - الملف مرئي لأي زائر للموقع
// يتم قراءة المفاتيح من Deno.env داخل taager-proxy/index.ts بشكل آمن
window.TAAGER_MERCHANT_API = "https://merchant.api.taager.com/api";
window.TAAGER_TAAGER_ID = "";
window.TAAGER_SESSION_KEY = "";
// Supabase failover updates SUPABASE_URL before this file runs, so Edge
// Function calls follow the same active project as database calls.
window.TAAGER_EDGE_FUNCTION_URL =
  String(window.SUPABASE_URL || "https://msgqzgzoslearaprgiqq.supabase.co") + "/functions/v1/taager-proxy";
window.TAAGER_API_KEY = "";

// Secrets stay server-side only. Purge any legacy cached credentials so no
// secret value is ever read back into the browser again.
try { localStorage.removeItem("_taagerCredentials"); } catch (_e) {}
// The function belongs to the currently active Supabase project.
window.TAAGER_EDGE_FUNCTION_URL =
  String(window.SUPABASE_URL || "https://msgqzgzoslearaprgiqq.supabase.co") + "/functions/v1/taager-proxy";
