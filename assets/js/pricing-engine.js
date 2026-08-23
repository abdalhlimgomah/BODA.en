/* ============================================
   Pricing Engine — حساب سعر البيع تلقائياً
   ============================================ */

var PricingEngine = {
  tiers: [],
  tiersLoaded: false,
  currentCountry: "EG",

  // Get current country from localStorage (EG/SA)
  getCountry: function () {
    var cc = "EG";
    try { cc = localStorage.getItem("userCountry") || "EG"; } catch (e) {}
    cc = String(cc).toUpperCase();
    return cc === "SA" ? "SA" : "EG";
  },

  // Normalize tier country (legacy rows without country_code = EG)
  tierCountry: function (t) {
    var tc = t.country_code ? String(t.country_code).toUpperCase() : "EG";
    return tc === "SA" ? "SA" : "EG";
  },

  // Load price tiers from Supabase
  loadTiers: async function () {
    PricingEngine.currentCountry = PricingEngine.getCountry();
    // Fast path FIRST: cached tiers need no Supabase client, so pricing is
    // correct from the very first synchronous paint (10 min TTL).
    if (PricingEngine._skipCache) {
      PricingEngine._skipCache = false;
    } else {
      try {
        var cRaw = localStorage.getItem("buda_price_tiers_cache");
        if (cRaw) {
          var cEntry = JSON.parse(cRaw);
          if (
            cEntry && cEntry.cc === PricingEngine.currentCountry &&
            Array.isArray(cEntry.tiers) && cEntry.tiers.length &&
            Date.now() - Number(cEntry.t || 0) < 10 * 60 * 1000
          ) {
            PricingEngine.tiers = cEntry.tiers;
            PricingEngine.tiersLoaded = true;
            console.log("[PricingEngine] Loaded", cEntry.tiers.length, "tiers for", PricingEngine.currentCountry, "(cache)");
            document.dispatchEvent(new CustomEvent("boda:pricing-updated"));
            return;
          }
        }
      } catch (_cacheErr) {}
    }
    // Cache miss/expired → wait for supabaseClient (up to 5s), then fetch.
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
        .select("id,min_price,max_price,markup,sort_order,is_active,country_code")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (result.error) {
        // Fallback: country_code column not added yet (pre-migration DB)
        result = await client.from("price_tiers")
          .select("id,min_price,max_price,markup,sort_order,is_active")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
      }
      if (result.error) throw result.error;
      if (result.data && result.data.length) {
        var cc = PricingEngine.currentCountry;
        // Keep only tiers belonging to the visitor's country
        var filtered = result.data.filter(function (t) {
          return PricingEngine.tierCountry(t) === cc;
        });
        // Safety net: if current country has no tiers yet, fall back to EG tiers
        if (!filtered.length && cc !== "EG") {
          filtered = result.data.filter(function (t) {
            return PricingEngine.tierCountry(t) === "EG";
          });
          console.warn("[PricingEngine] No tiers for", cc, "- falling back to EG tiers");
        }
        PricingEngine.tiers = filtered;
        PricingEngine.tiersLoaded = true;
        console.log("[PricingEngine] Loaded", filtered.length, "tiers for", cc, ":", JSON.stringify(PricingEngine.tiers));
        // Persist for next page loads (10 min TTL)
        try {
          localStorage.setItem("buda_price_tiers_cache", JSON.stringify({ cc: cc, t: Date.now(), tiers: filtered }));
        } catch (_wErr) {}
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

  // Refresh tiers from Supabase (bypasses the local cache)
  refresh: async function () {
    this.tiersLoaded = false;
    this._skipCache = true;
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

// Reload tiers when the visitor switches country (EG <-> SA)
document.addEventListener("boda:country-changed", function () {
  var cc = PricingEngine.getCountry();
  if (cc !== PricingEngine.currentCountry || !PricingEngine.tiersLoaded) {
    PricingEngine.refresh();
  }
});
