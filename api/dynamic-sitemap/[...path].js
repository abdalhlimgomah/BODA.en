const { proxyPublicSupabaseFunction } = require("../../lib/supabase-function-failover");

module.exports = function dynamicSitemapProxy(req, res) {
  return proxyPublicSupabaseFunction(req, res, "dynamic-sitemap");
};
