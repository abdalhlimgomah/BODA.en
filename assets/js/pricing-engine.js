/* ============================================
   Pricing Engine — حساب سعر البيع تلقائياً
   ============================================ */

var PricingEngine = {
  tiers: [],
  tiersLoaded: false,

  // Load price tiers from Supabase
  loadTiers: async function () {
    // Wait for supabaseClient to be ready (up to 5s)
    for (var retries = 0; retries < 25; retries++) {
      if (window.supabaseClient && typeof window.supabaseClient.from === "function") break;
      await new Promise(function (r) { setTimeout(r, 200); });
    }
    var client = window.supabaseClient;
    if (!client || typeof client.from !== "function") {
      console.warn("[PricingEngine] Supabase client not available");
      return;
    }
    try {
      var result = await client.from("price_tiers")
        .select("id,min_price,max_price,markup,sort_order,is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (result.error) throw result.error;
      if (result.data && result.data.length) {
        PricingEngine.tiers = result.data;
        PricingEngine.tiersLoaded = true;
        console.log("[PricingEngine] Loaded", result.data.length, "tiers:", JSON.stringify(PricingEngine.tiers));
        document.dispatchEvent(new CustomEvent("boda:pricing-updated"));
      } else {
        console.warn("[PricingEngine] No active tiers found in Supabase");
        PricingEngine.tiers = [];
        PricingEngine.tiersLoaded = false;
      }
    } catch (e) {
      console.error("[PricingEngine] Failed to load tiers:", e);
      PricingEngine.tiers = [];
      PricingEngine.tiersLoaded = false;
    }
  },

  // Find the matching tier for a price
  findTier: function (supplierPrice) {
    if (!this.tiersLoaded || !this.tiers.length) return null;
    var price = Number(supplierPrice) || 0;
    for (var i = 0; i < this.tiers.length; i++) {
      var t = this.tiers[i];
      if (price >= t.min_price && (t.max_price === null || price <= t.max_price)) {
        return t;
      }
    }
    return null;
  },

  // Calculate selling price from supplier price
  calculate: function (supplierPrice) {
    var price = Number(supplierPrice) || 0;
    // Try loading if not loaded yet
    if (!this.tiersLoaded) {
      this.loadTiers();
      return price;
    }
    var tier = this.findTier(price);
    var markup = tier ? Number(tier.markup) : 0;
    var selling = price + markup;
    return selling < price ? price : selling;
  },

  // Calculate for multiple products at once
  calculateBatch: function (products, priceField) {
    if (!products || !products.length) return [];
    priceField = priceField || "price";
    return products.map(function (p) {
      var sp = Number(p[priceField]) || 0;
      var selling = PricingEngine.calculate(sp);
      return { product: p, supplierPrice: sp, sellingPrice: selling, markup: selling - sp };
    });
  },

  // Get the effective markup for a price
  getMarkup: function (supplierPrice) {
    var tier = this.findTier(Number(supplierPrice) || 0);
    return tier ? Number(tier.markup) : 0;
  },

  // Refresh tiers from Supabase
  refresh: async function () {
    this.tiersLoaded = false;
    await this.loadTiers();
  },
};

// Auto-load tiers when script loads
function autoLoadTiers() {
  PricingEngine.loadTiers().then(function () {
    // Retry once after 3s if tiers didn't load (catches late supabase-client)
    if (!PricingEngine.tiersLoaded) {
      setTimeout(function () { PricingEngine.loadTiers(); }, 3000);
    }
  });
}
if (document.readyState === "complete" || document.readyState === "interactive") {
  autoLoadTiers();
} else {
  document.addEventListener("DOMContentLoaded", autoLoadTiers);
}
