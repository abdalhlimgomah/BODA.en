/* ============================================
   QtyDiscounts — خصومات الكميات المستوردة من تايجر
   يقرأ جدول taager_quantity_discounts من Supabase
   (عبر supabase-client المتاح) مع كاش ذاكرة + localStorage
   ============================================ */

(function (global) {
  "use strict";

  var MEM_TTL = 15 * 60 * 1000;
  var _mem = {};          // "pid:cc" -> { rows: [], at: ts }
  var _inflight = {};     // "pid" -> Promise

  function getCountry() {
    var cc = "EG";
    try { cc = localStorage.getItem("userCountry") || "EG"; } catch (e) {}
    cc = String(cc).toUpperCase();
    return cc === "SA" ? "SA" : "EG";
  }

  function storageKey(pid, cc) {
    return "buda_qty_discounts_cache_v2:" + pid + ":" + cc;
  }

  function normalizeRow(r) {
    return {
      quantity: Number(r.quantity) || 0,
      discount_percent: Number(r.discount_percent) || 0,
      price: Number(r.price) || 0,
      profit: Number(r.profit) || 0,
      unit_original: Number(r.unit_original) || 0,
      original_total: Number(r.original_total) || 0,
      country: String(r.country || "EG").toUpperCase(),
    };
  }

  function readStorage(pid, cc) {
    try {
      var raw = localStorage.getItem(storageKey(pid, cc));
      if (!raw) return null;
      var entry = JSON.parse(raw);
      if (!entry || !Array.isArray(entry.rows)) return null;
      if (Date.now() - Number(entry.t || 0) > MEM_TTL) return null;
      return entry.rows.map(normalizeRow);
    } catch (e) {
      return null;
    }
  }

  function writeStorage(pid, cc, rows) {
    try {
      localStorage.setItem(storageKey(pid, cc), JSON.stringify({ t: Date.now(), rows: rows }));
    } catch (e) {}
  }

  function prefCountry(rows, cc) {
    var exact = rows.filter(function (r) { return r.country === cc; });
    if (exact.length) return exact;
    var other = rows.filter(function (r) { return r.country !== cc; });
    return other.length ? other : rows;
  }

  async function fetchRows(pid) {
    var client = global.supabaseClient;
    if (!client || typeof client.from !== "function") return [];
    try {
      var result = await client
        .from("taager_quantity_discounts")
        .select("quantity,discount_percent,price,profit,unit_original,original_total,country")
        .eq("taager_product_id", pid)
        .in("country", ["EG", "SA"]);
      if (result && result.error) return [];
      var rows = Array.isArray(result && result.data) ? result.data : [];
      return rows.map(normalizeRow);
    } catch (e) {
      console.warn("[QtyDiscounts] load failed for", pid, e);
      return [];
    }
  }

  function loadFor(pid) {
    pid = String(pid || "");
    if (!pid) return Promise.resolve([]);
    if (!_inflight[pid]) {
      _inflight[pid] = fetchRows(pid)
        .then(function (rows) {
          var cc = getCountry();
          _mem[pid + ":" + cc] = { rows: rows, at: Date.now() };
          writeStorage(pid, cc, rows);
          // Also register the other country mapping (cheap, same rows).
          var cc2 = cc === "SA" ? "EG" : "SA";
          _mem[pid + ":" + cc2] = { rows: rows, at: Date.now() };
          return rows;
        })
        .finally(function () {
          delete _inflight[pid];
        });
    }
    return _inflight[pid];
  }

  // Sync access: rows already resolved (or stored), ordered by country preference.
  function rowsFor(pid) {
    pid = String(pid || "");
    if (!pid) return undefined;
    var cc = getCountry();
    var mem = _mem[pid + ":" + cc];
    if (mem && Date.now() - mem.at < MEM_TTL) return mem.rows;
    var stored = readStorage(pid, cc);
    if (stored) {
      _mem[pid + ":" + cc] = { rows: stored, at: Date.now() };
      return stored;
    }
    // fallback to the other country's copy
    var cc2 = cc === "SA" ? "EG" : "SA";
    var mem2 = _mem[pid + ":" + cc2];
    if (mem2 && Date.now() - mem2.at < MEM_TTL) {
      return prefCountry(mem2.rows, cc);
    }
    var stored2 = readStorage(pid, cc2);
    if (stored2) {
      _mem[pid + ":" + cc2] = { rows: stored2, at: Date.now() };
      return prefCountry(stored2, cc);
    }
    return undefined;
  }

  // Synchronous lookup: percent+row for exact quantity (0 when not applicable/loaded).
  function lookup(pid, qty) {
    pid = String(pid || "");
    qty = Number(qty) || 0;
    if (!pid || qty <= 0) return { pct: 0, row: null };
    var rows = rowsFor(pid);
    if (!rows) return { pct: 0, row: null };
    var cc = getCountry();
    var ordered = prefCountry(rows, cc);
    for (var i = 0; i < ordered.length; i++) {
      if (ordered[i].quantity === qty) {
        var pct = Number(ordered[i].discount_percent) || 0;
        return { pct: pct > 0 ? pct : 0, row: ordered[i] };
      }
    }
    return { pct: 0, row: null };
  }

  // Preload tier data for every distinct taager product in a cart.
  async function preloadFor(cart) {
    if (!Array.isArray(cart) || !cart.length) return;
    var pids = [];
    cart.forEach(function (item) {
      var pid = String(item.taager_product_id || "");
      if (pid && pids.indexOf(pid) === -1) pids.push(pid);
    });
    var results = await Promise.all(pids.map(loadFor));
    var reduced = results.reduce(function (sum, r) { return sum + (Array.isArray(r) ? r.length : 0); }, 0);
    if (reduced > 0) {
      try { document.dispatchEvent(new CustomEvent("boda:qty-discounts-updated")); } catch (e) {}
    }
  }

  // Tiers usable on the PDP (quantity > 1 with a positive discount).
  function tiers(pid) {
    var rows = rowsFor(pid);
    if (!rows) return null; // not loaded yet → null means "unknown"
    return rows
      .filter(function (r) { return r.quantity > 1 && r.discount_percent > 0; })
      .sort(function (a, b) { return a.quantity - b.quantity; });
  }

  function applyTotal(unitPrice, qty, pct) {
    var u = Number(unitPrice) || 0;
    var q = Number(qty) || 0;
    var p = Number(pct) || 0;
    if (u <= 0 || q <= 0) return 0;
    if (p <= 0) return u * q;
    return u * q * (1 - p / 100);
  }

  function effectiveUnit(unitPrice, pct) {
    var u = Number(unitPrice) || 0;
    var p = Number(pct) || 0;
    if (u <= 0 || p <= 0) return u;
    return u * (1 - p / 100);
  }

  global.QtyDiscounts = {
    getCountry: getCountry,
    loadFor: loadFor,
    rowsFor: rowsFor,
    lookup: lookup,
    preloadFor: preloadFor,
    tiers: tiers,
    applyTotal: applyTotal,
    effectiveUnit: effectiveUnit,
  };

  // Auto-sync visitor country switch (EG <-> SA)
  document.addEventListener("boda:country-changed", function () {
    var cc = getCountry();
    Object.keys(_mem).forEach(function (key) {
      if (key.split(":")[1] !== cc) delete _mem[key];
    });
  });
})(window);