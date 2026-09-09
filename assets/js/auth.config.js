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
window.TAAGER_EDGE_FUNCTION_URL = "https://msgqzgzoslearaprgiqq.supabase.co/functions/v1/taager-proxy";
window.TAAGER_API_KEY = "";

// Load cached credentials from localStorage (set by supabase-client.js loadTaagerCredentials)
try {
  var _tcr = localStorage.getItem("_taagerCredentials");
  if (_tcr) {
    var _tcp = JSON.parse(_tcr);
    if (_tcp.taager_api_key) window.TAAGER_API_KEY = _tcp.taager_api_key;
    if (_tcp.taager_taager_id) window.TAAGER_TAAGER_ID = _tcp.taager_taager_id;
    if (_tcp.taager_session_key) window.TAAGER_SESSION_KEY = _tcp.taager_session_key;
    if (_tcp.taager_merchant_api) window.TAAGER_MERCHANT_API = _tcp.taager_merchant_api;
    if (_tcp.taager_edge_function_url) window.TAAGER_EDGE_FUNCTION_URL = _tcp.taager_edge_function_url;
  }
} catch (_e) {}
