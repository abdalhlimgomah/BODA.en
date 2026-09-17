const { proxyPublicSupabaseFunction } = require("../../lib/supabase-function-failover");

module.exports = function merchantFeedProxy(req, res) {
  return proxyPublicSupabaseFunction(req, res, "merchant-feed");
};
