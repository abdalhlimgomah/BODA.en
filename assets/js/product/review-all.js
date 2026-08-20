(function (global) {
  "use strict";

  var qs = function (id) { return document.getElementById(id); };

  function setStatus(msg, isError) {
    var el = qs("pra-status");
    if (!msg) { el.style.display = "none"; return; }
    el.style.display = "block";
    el.textContent = msg;
    el.className = "pra-status " + (isError ? "error" : "show");
  }

  function paramId() {
    return new URLSearchParams(global.location.search).get("id") || "";
  }

  function getImages(product) {
    var imgs = [];
    try {
      var raw = product;
      if (raw && raw.raw_data && typeof raw.raw_data === "string") {
        try {
          var pd = JSON.parse(raw.raw_data);
          var extra = pd.images;
          if (Array.isArray(extra)) imgs = imgs.concat(extra);
          if (pd.image_url) imgs.push(pd.image_url);
        } catch (e) {}
      }
      for (var i = 1; i <= 8; i++) {
        var k = "image" + i;
        if (raw && raw[k]) imgs.push(String(raw[k]));
      }
      if (raw) {
        if (Array.isArray(raw.images)) imgs = imgs.concat(raw.images);
        if (Array.isArray(raw.gallery)) imgs = imgs.concat(raw.gallery);
        if (raw.image_url) imgs.push(String(raw.image_url));
        if (raw.image) imgs.push(String(raw.image));
      }
    } catch (e) {}
    var seen = {}, out = [];
    imgs.forEach(function (u) {
      var s = String(u || "").trim();
      if (!s || seen[s]) return;
      seen[s] = true;
      out.push(s);
    });
    return out;
  }

  async function init() {
    var id = paramId();
    if (!id) { global.location.replace("../404.html"); return; }

    setStatus("جاري تحميل التقييمات...");
    try {
      var product = await global.PDP.Data.resolveProduct();
      if (!product) { global.location.replace("../410.html"); return; }
      var reviews = await global.PDP.Data.fetchRatings(product.id);
      var vm = global.PDP.Data.buildViewModel(product, { reviews: reviews });
      render(vm);
    } catch (e) {
      console.error("[ReviewAll] init error:", e);
      setStatus("تعذر تحميل الصفحة. حاول مرة أخرى.", true);
    }
  }

  function render(vm) {
    var U = global.PDP.Utils;
    var images = vm.images && vm.images.length ? vm.images : getImages(vm.raw);
    var img = images[0] || "";
    var reviews = vm.reviews || { average: 0, total: 0, comments: [], ratingsRows: [] };
    var comments = reviews.comments || [];
    var total = Number(reviews.total) || (comments.length ? comments.length : 0);
    var avg = Number(reviews.average) || 0;

    // ---- Breadcrumb ----
    var crumb = qs("pra-crumb");
    crumb.style.display = "flex";
    qs("pra-crumb-name").textContent = vm.name;

    // ---- Product card ----
    var card = qs("pra-product");
    card.style.display = "flex";
    var thumbLink = qs("pra-thumb-link");
    thumbLink.href = "product.html?id=" + encodeURIComponent(String(vm.id));
    var tImg = qs("pra-thumb-img");
    if (img) {
      tImg.src = U.safeImage(img);
      tImg.alt = vm.name;
    } else {
      tImg.style.display = "none";
    }
    qs("pra-name").textContent = vm.name;
    if (avg > 0) qs("pra-avg-stars").innerHTML = U.starsMarkup(avg) + ' <span class="pra-avg-num">' + avg.toFixed(1) + '</span>';
    else qs("pra-avg-stars").innerHTML = '<span class="pra-avg-num muted">لا توجد تقييمات بعد</span>';
    qs("pra-count").textContent = total > 0 ? (String(total) + (total === 1 ? " تقييم" : " تقييمات")) : "0 تقييم";
    var back = qs("pra-back-link");
    back.href = "product.html?id=" + encodeURIComponent(String(vm.id));

    // ---- Analysis: distribution + features + description + specs ----
    var analysis = qs("pra-analysis");
    analysis.style.display = "block";

    var dist = [0, 0, 0, 0, 0];
    (reviews.ratingsRows || []).forEach(function (r) {
      var v = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 0)));
      dist[v - 1]++;
    });
    var distHtml = '<div class="pdp-review-avg-col">';
    distHtml += '<div class="pdp-review-avg-num">' + avg.toFixed(1) + '</div>';
    distHtml += '<div class="pdp-review-avg-stars">' + U.starsMarkup(avg) + '</div>';
    distHtml += '<div class="pdp-review-avg-total">' + total + ' تقييم' + (total !== 1 ? 'ات' : '') + '</div>';
    distHtml += '</div>';
    distHtml += '<div class="pdp-review-dist-col">';
    for (var i = 5; i >= 1; i--) {
      var pct = total > 0 ? Math.round((dist[i - 1] / total) * 100) : 0;
      distHtml += '<div class="pdp-review-dist-row">';
      distHtml += '<span class="pdp-review-dist-label">' + i + ' نجوم</span>';
      distHtml += '<div class="pdp-review-dist-track"><div class="pdp-review-dist-fill" style="width:' + pct + '%"></div></div>';
      distHtml += '<span class="pdp-review-dist-pct">' + pct + '%</span>';
      distHtml += '</div>';
    }
    distHtml += '</div>';
    qs("pra-distribution").innerHTML = distHtml;

    try {
      var highlights = vm.highlights || [];
      if (highlights.length) {
        var icons = ["star", "verified", "bolt", "sell", "new_releases", "local_offer", "auto_awesome", "check_circle", "done_all", "trending_up"];
        qs("pra-features").style.display = "block";
        qs("pra-features-grid").innerHTML = highlights.slice(0, 12).map(function (h, idx) {
          return '<div class="pra-feature-item"><span class="material-icons-outlined">' + icons[idx % icons.length] + '</span><span>' + U.escapeHtml(h) + '</span></div>';
        }).join("");
      }
    } catch (e) { console.warn("[ReviewAll] features error:", e); }

    // ---- Reviews list (all, filterable + sortable, no pagination) ----
    var sec = qs("pra-reviews-sec");
    var list = qs("pra-reviews");
    if (comments.length) {
      sec.style.display = "block";
      qs("pra-reviews-count").textContent = "(" + comments.length + ")";

      var rState = { filter: "all", sort: "newest" };
      function applyReviewFilter(c) {
        if (rState.filter === "all") return true;
        return Math.round(Number(c.rating) || 0) === Number(rState.filter);
      }
      function reviewComparator(a, b) {
        if (rState.sort === "oldest") return (new Date(a.createdAt || 0)) - (new Date(b.createdAt || 0));
        if (rState.sort === "highest") return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        if (rState.sort === "lowest") return (Number(a.rating) || 0) - (Number(b.rating) || 0);
        return (new Date(b.createdAt || 0)) - (new Date(a.createdAt || 0));
      }
      function redrawReviews() {
        var pool = comments.filter(applyReviewFilter).sort(reviewComparator);
        list.innerHTML = pool.length
          ? pool.map(function (c) { return global.PDP.Reviews.itemHtml(c); }).join("")
          : '<div class="pdp-empty-note">لا توجد تقييمات مطابقة.</div>';
      }
      redrawReviews();

      document.querySelectorAll("#pra-filter-row .pdp-review-filter-chip").forEach(function (chip) {
        chip.addEventListener("click", function () {
          rState.filter = this.getAttribute("data-filter-star") || "all";
          document.querySelectorAll("#pra-filter-row .pdp-review-filter-chip").forEach(function (c) {
            c.classList.toggle("is-active", c === chip);
          });
          redrawReviews();
        });
      });
      var sortSel = qs("pra-sort");
      if (sortSel) {
        sortSel.addEventListener("change", function () {
          rState.sort = this.value || "newest";
          redrawReviews();
        });
      }

      list.addEventListener("click", function (e) {
        var btn = e.target.closest(".pdp-review-item-helpful button");
        if (btn) {
          var parent = btn.closest(".pdp-review-item-helpful");
          if (parent) {
            parent.querySelectorAll("button").forEach(function (b) { b.classList.remove("is-active"); });
            btn.classList.add("is-active");
          }
        }
      });
    }
    setStatus("");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);