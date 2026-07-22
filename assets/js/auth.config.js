// Central auth config to avoid mismatched client IDs across pages.
window.__Buda_GOOGLE_CLIENT_ID =
  "593904075909-i91gvs8n2lsloq8dn4bjtmbgmv9tg7kk.apps.googleusercontent.com";

// Taager API configuration
// Verified working API: merchant.api.taager.com/api
// Auth: Bearer JWT + taagerId + ui-session-key headers
// Products: GET /products/variants?country=XXX&page=1&pageSize=100
// Highlights: GET /products/variants/highlights?highlightGroups=a,b,c&country=XXX
// Categories: GET /categories
// Token obtained via taager.com login (Google or email), valid ~24h.
// Hardcoded defaults — overridden by Supabase app_settings table if available
window.TAAGER_MERCHANT_API = "https://merchant.api.taager.com/api";
window.TAAGER_TAAGER_ID = "2226119";
window.TAAGER_SESSION_KEY = "b2ndWBwaUP6QrywYL7JgGH1Vr17JFxQj";
window.TAAGER_EDGE_FUNCTION_URL = "https://msgqzgzoslearaprgiqq.supabase.co/functions/v1/taager-proxy";
window.TAAGER_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7Il9pZCI6IjZhMTU2MTY2MjMwYzgzYjc2ZGFmNmQwNiIsImVtYWlsIjoiYWJkYWxobGltZ29tYWgyQGdtYWlsLmNvbSIsIlRhZ2VySUQiOjIyMjYxMTksInVzZXJMZXZlbCI6MSwidXNlcm5hbWUiOiJhYmRhbGhsaW1nb21haDJAZ21haWwuY29tIiwicGhvbmVOdW1iZXIiOnsiX3ZhbHVlIjoiMjAxMTIxMDY4MjcxIiwiX2NhbGxpbmdDb2RlIjoiMjAifSwidmVyaWZpY2F0aW9uU3RhdGUiOnsicGhvbmVOdW1iZXJWZXJpZmllZCI6dHJ1ZSwibWVyY2hhbnREYXRhVmVyaWZpZWQiOnRydWUsImVtYWlsVmVyaWZpZWQiOnRydWUsIm1lcmNoYW50SWRWZXJpZmllZCI6ZmFsc2V9LCJhY3R1YWxWZXJpZmljYXRpb25TdGF0ZSI6eyJyZWdpc3RyYXRpb25Db21wbGV0ZWQiOnRydWUsInBob25lTnVtYmVyVmVyaWZpZWQiOnRydWUsIm1lcmNoYW50RGF0YVZlcmlmaWVkIjp0cnVlLCJlbWFpbFZlcmlmaWVkIjp0cnVlLCJtZXJjaGFudElkVmVyaWZpZWQiOmZhbHNlfSwic3RvcmVzIjpbXSwiZmVhdHVyZXMiOlsiYnJlYWtfZXZlbl9tZXJjaGFudF9pbnNpZ2h0cyIsImJ1bGtfcHJlb3JkZXJfZXhwZXJpbWVudCIsImNwYV9jYWxjdWxhdG9yIiwiZHVrYW5fYXJlIiwiZHVrYW5fZWd5IiwiZHVrYW5faXJxIiwiZHVrYW5fdG10IiwiZHVrYW5fdjIiLCJkeW5hbWljX2luY2VudGl2ZV9wcm9ncmFtIiwiZHluYW1pY19wcmljaW5nX2VneSIsImZhaWxlZF9vcmRlcnMiLCJmdW5kaW5nLXJlcXVlc3QtYXV0b21hdGlvbi1pbmNsdWRlZCIsImt5YyIsImxveWFsdHlfcHJvZ3JhbSIsIm1hcmtldC1wbGFjZS1ub3RpZmljYXRpb25zLWxvY2stdXBkYXRlcyIsIm1lcmNoYW50X2luc2lnaHRzIiwibWlzc2VkX29yZGVycyIsIm11bHRpdGVuYW5jeSIsIm11bHRpdGVuYW5jeV9pcmFxIiwibXVsdGl0ZW5hbmN5X29tYW4iLCJtdWx0aXRlbmFuY3lfdWFlIiwicHJlb3JkZXJfc2F1IiwicmVmZXJyYWxfcHJvZ3JhbSIsInNob3dfYWRzX3Byb2ZpdF9pbnNpZ2h0cyIsInNrdV9hbmFseXRpY3NfYXJlIiwic2t1X2FuYWx5dGljc19lZ3kiLCJza3VfYW5hbHl0aWNzX3NhdSIsInN0b2NrX2F2YWlsYWJpbGl0eV9lZ3kiLCJzdG9ja19hdmFpbGFiaWxpdHlfc2F1Iiwic3RvcmVzX3JldmFtcCIsIndlYl9uZXdfaG9tZXBhZ2UiLCJ3ZWJfbmV3X21lcmNoYW50X2xheW91dCIsIndpdGhkcmF3YWxfb3RwIiwid29vX2NvbW1lcmNlX3N0b3JlIiwieW91Y2FuX2FyZSIsInlvdWNhbl9lZ3kiLCJ5b3VjYW5fc2F1Il19LCJpYXQiOjE3ODM2OTk3ODcsImV4cCI6MTc4Mzc4NjE4N30.3nWWz0t7UQespg0o7cvrSX6rVs5_yOtw7ZY8dSw4DK4";

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
