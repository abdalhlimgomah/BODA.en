/**
 * PDP.SellerGenerator — seller-identity pool manager.
 *
 * Instead of deterministic per-ID generation, every product gets a
 * profile from the seller_profiles table. Each profile can serve up
 * to MAX_USES different products, then the next profile is used.
 * Once assigned, the link is saved so the same product always sees
 * the same seller (even across sessions).
 *
 * If the pool is empty or Supabase is unreachable, falls back to
 * deterministic in-memory generation (same product = same seller).
 */
(function (global) {
  "use strict";

  var MAX_USES = 8;

  var SELLER_NAMES = [
    "نجوم", "سنسن", "بصمة", "إبداع", "أصالة", "تميز", "فخامة", "أناقة",
    "رقي", "درة", "لؤلؤ", "مرجان", "ياقوت", "زمرد", "فيروز", "سحر",
    "أمل", "ورد", "نرجس", "ياسمين", "فل", "ريحان", "ندى", "شهد",
    "عنبر", "مسك", "عطر", "بهاء", "ضياء", "نور", "قمر",
    "بدر", "هلال", "شمس", "نجم", "كوكب", "أثير", "سمو", "مجد",
    "علياء", "سندس", "إستبرق", "حرير", "ديباج", "أطلس", "مخمل",
    "نخيل", "بستان", "واحة", "زهرة", "ربيع", "كوثر", "سلسبيل",
    "نماء", "ازدهار", "رفعة", "علو", "سؤدد", "مهابة", "وقار",
    "حكمة", "دراية", "خبرة", "إتقان", "براعة", "مهارة",
    "نبع", "مورد", "غدير", "فيض", "مدد", "عطاء", "سنابل",
  ];

  var SHIPPING_SPEEDS = [
    "شحن سريع", "شحن فوري", "شحن خلال 24 ساعة",
    "توصيل سريع", "شحن ممتاز", "توصيل فوري",
  ];

  /** Seeded PRNG for fallback generation. */
  function createRng(seed) {
    var h = 0;
    for (var i = 0; i < seed.length; i++) {
      h = ((h << 5) - h) + seed.charCodeAt(i);
      h = h & h;
    }
    h = h || 1;
    return function () {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      return h / 0x7fffffff;
    };
  }

  function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }
  function randInt(min, max, rng) { return min + Math.floor(rng() * (max - min + 1)); }

  /** Fallback deterministic generation (no DB pool). */
  function generate(productId) {
    var id = String(productId || "demo_" + Date.now());
    var rng = createRng(id);
    var sellerName = pick(SELLER_NAMES, rng);
    var yearsWithBuda = randInt(1, 10, rng);
    var rating = (38 + randInt(0, 12, rng)) / 10;
    var satisfaction = randInt(85, 99, rng);
    var baseSales = randInt(50, 250, rng);
    var salesCount = Math.round(baseSales * (1 + yearsWithBuda * 0.25));
    salesCount = Math.round(salesCount / 10) * 10;
    var shippingSpeed = pick(SHIPPING_SPEEDS, rng);
    var isOfficial = rng() > 0.65;
    return {
      name: sellerName,
      yearsWithBuda: yearsWithBuda,
      rating: rating,
      positivePercent: satisfaction,
      salesCount: salesCount,
      shippingSpeedText: shippingSpeed,
      isOfficial: isOfficial,
    };
  }

  /** Convert a seller_profiles row to the format buildSeller expects. */
  function profileToSeller(p) {
    return {
      name: p.seller_name,
      yearsWithBuda: p.years_with_buda,
      rating: Number(p.rating) || 4.5,
      positivePercent: Number(p.satisfaction) || 95,
      salesCount: Number(p.sales_count) || 500,
      shippingSpeedText: p.shipping_speed || "شحن سريع",
      isOfficial: Boolean(p.is_official),
    };
  }

  /** localStorage key for local fallback assignments. */
  var LOCAL_KEY = "buda_seller_assignments";

  function loadLocalAssignments() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}"); } catch (e) { return {}; }
  }

  function saveLocalAssignment(productId, seller) {
    try {
      var all = loadLocalAssignments();
      all[String(productId)] = { seller: seller, savedAt: Date.now() };
      localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
    } catch (e) { /* quota exceeded etc. */ }
  }

  function getLocalAssignment(productId) {
    var all = loadLocalAssignments();
    var record = all[String(productId)];
    return record ? record.seller : null;
  }

  /**
   * Finds or assigns a seller for the given product ID.
   * 1. Check localStorage + Supabase product_sellers for existing assignment.
   * 2. Find profile with lowest used_count < MAX_USES.
   * 3. Increment used_count, insert assignment, return seller data.
   * 4. Always saves to localStorage as fallback so the assignment persists
   *    even when Supabase is unreachable (file://, CORS, etc.).
   */
  async function resolve(productId) {
    if (!productId) return generate("fallback");

    // 0. Check localStorage first (works even without Supabase)
    var local = getLocalAssignment(productId);
    if (local) {
      console.log("[SellerGenerator] found local assignment for", productId, local.name);
      return local;
    }

    var db = global.supabaseClient;
    if (!db || typeof db.from !== "function") {
      console.warn("[SellerGenerator] no supabaseClient — using deterministic fallback");
      var fallback = generate(productId);
      saveLocalAssignment(productId, fallback);
      return fallback;
    }

    try {
      var testRes = await db.from("seller_profiles").select("id").limit(1);
      if (testRes.error) throw testRes.error;
    } catch (e) {
      console.warn("[SellerGenerator] Supabase NOT reachable:", e);
      if (typeof document !== "undefined") {
        var d = document.getElementById("pdp-debug") || (function(){var e=document.createElement("div");e.id="pdp-debug";e.style.cssText="position:fixed;bottom:0;left:0;z-index:99999;background:#c00;color:#fff;font:12px monospace;padding:6px 12px;max-width:100%;direction:ltr;text-align:left";document.body.appendChild(e);return e;})();
        d.textContent = "SUPABASE FAILED: " + (e.message || e).slice(0, 120);
      }
      var fallback = generate(productId);
      saveLocalAssignment(productId, fallback);
      return fallback;
    }

    try {
      // 1. Existing assignment in Supabase?
      console.log("[SellerGenerator] checking product_sellers for", productId);
      var { data: existing, error: err1 } = await db
        .from("product_sellers")
        .select("*")
        .eq("product_id", String(productId))
        .limit(1);
      if (err1) { console.error("[SellerGenerator] err1 (product_sellers lookup)", err1); throw err1; }
      if (existing && existing.length) {
        console.log("[SellerGenerator] found existing product_sellers row", existing[0].seller_name);
        var s = profileToSeller(existing[0]);
        saveLocalAssignment(productId, s);
        return s;
      }

      // 2. Find available profile
      console.log("[SellerGenerator] looking for available seller_profiles");
      var { data: profiles, error: err2 } = await db
        .from("seller_profiles")
        .select("*")
        .lt("used_count", MAX_USES)
        .order("used_count", { ascending: true })
        .limit(1);
      if (err2) { console.error("[SellerGenerator] err2 (seller_profiles lookup)", err2); throw err2; }

      if (!profiles || !profiles.length) {
        console.warn("[SellerGenerator] no available seller_profiles — pool exhausted");
        var fallback = generate(productId);
        saveLocalAssignment(productId, fallback);
        return fallback;
      }

      var profile = profiles[0];
      console.log("[SellerGenerator] selected profile", profile.id, profile.seller_name, "used_count:", profile.used_count);
      var newCount = (profile.used_count || 0) + 1;

      // 3. Increment used_count
      var { error: err3 } = await db
        .from("seller_profiles")
        .update({ used_count: newCount, updated_at: new Date().toISOString() })
        .eq("id", profile.id);
      if (err3) { console.error("[SellerGenerator] err3 (increment used_count)", err3); throw err3; }

      var seller = profileToSeller(profile);

      // 4. Insert assignment
      console.log("[SellerGenerator] upserting into product_sellers", productId, seller.name);
      var { error: err4 } = await db
        .from("product_sellers")
        .upsert({
          product_id: String(productId),
          seller_name: seller.name,
          years_with_buda: seller.yearsWithBuda,
          rating: seller.rating,
          satisfaction: seller.positivePercent,
          sales_count: seller.salesCount,
          shipping_speed: seller.shippingSpeedText,
          is_official: seller.isOfficial,
          profile_id: profile.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "product_id" });
      if (err4) { console.error("[SellerGenerator] err4 (product_sellers upsert)", err4); throw err4; }

      console.log("[SellerGenerator] SAVED product_sellers", productId, seller.name);
      saveLocalAssignment(productId, seller);
      return seller;

    } catch (e) {
      console.warn("[SellerGenerator] resolve failed, using local fallback", e);
      var fallback = generate(productId);
      saveLocalAssignment(productId, fallback);
      return fallback;
    }
  }

  global.PDP = global.PDP || {};
  global.PDP.SellerGenerator = {
    resolve: resolve,
    generate: generate,
  };
})(window);
