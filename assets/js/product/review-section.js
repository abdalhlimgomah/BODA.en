(function (global) {
  "use strict";

  var U = global.PDP.Utils;

  function render(root, vm) {
    if (!root) return;
    var reviews = vm.reviews;
    if (!reviews || !reviews.comments || !reviews.comments.length) {
      root.innerHTML = '<div class="pdp-empty-note">لا توجد تقييمات بعد. كن أول من يقيم!</div>';
      return;
    }

    var avg = reviews.average || 0;
    var total = reviews.total || 0;
    var comments = reviews.comments || [];

    // Rating distribution
    var dist = [0, 0, 0, 0, 0];
    (reviews.ratingsRows || []).forEach(function (r) {
      var v = Math.max(1, Math.min(5, Math.round(Number(r.rating) || 0)));
      dist[v - 1]++;
    });

    var html = '';

    // ---- Header ----
    html += '<div class="pdp-reviews-header">';
    html += '<h2>التقييمات</h2>';
    html += '<div class="pdp-reviews-header-actions">';
    html += '<button type="button" class="pdp-reviews-write-btn"><span class="material-icons-outlined" style="font-size:15px;vertical-align:-3px">rate_review</span> كتابة تقييم</button>';
    html += '</div></div>';

    // ---- Summary card ----
    html += '<div class="pdp-review-summary-card">';
    html += '<div class="pdp-review-avg-col">';
    html += '<div class="pdp-review-avg-num">' + avg.toFixed(1) + '</div>';
    html += '<div class="pdp-review-avg-stars">' + U.starsMarkup(avg) + '</div>';
    html += '<div class="pdp-review-avg-total">' + total + ' تقييم' + (total !== 1 ? 'ات' : '') + '</div>';
    html += '</div>';
    html += '<div class="pdp-review-dist-col">';
    for (var i = 5; i >= 1; i--) {
      var pct = total > 0 ? Math.round((dist[i - 1] / total) * 100) : 0;
      html += '<div class="pdp-review-dist-row" data-filter-star="' + i + '">';
      html += '<span class="pdp-review-dist-label">' + i + ' نجوم</span>';
      html += '<div class="pdp-review-dist-track"><div class="pdp-review-dist-fill" style="width:' + pct + '%"></div></div>';
      html += '<span class="pdp-review-dist-pct">' + pct + '%</span>';
      html += '</div>';
    }
    html += '</div></div>';

    // ---- Controls ----
    var state = { filter: "all", sort: "newest" };
    html += '<div class="pdp-review-controls">';
    html += '<div class="pdp-review-filter-row">';
    html += '<button type="button" class="pdp-review-filter-chip is-active" data-filter-star="all">الكل</button>';
    [5, 4, 3, 2, 1].forEach(function (s) {
      html += '<button type="button" class="pdp-review-filter-chip" data-filter-star="' + s + '">' + s + ' نجوم</button>';
    });
    html += '</div>';
    html += '<select class="pdp-review-sort" aria-label="ترتيب"><option value="newest">الأحدث</option><option value="oldest">الأقدم</option><option value="highest">الأعلى تقييماً</option><option value="lowest">الأدنى تقييماً</option></select>';
    html += '</div>';

    // ---- Comments list + View All (rebuilt on filter/sort) ----
    var perPage = 4;
    html += '<div class="pdp-review-list"></div>';
    html += '<div class="pdp-review-viewall"></div>';

    root.innerHTML = html;

    var listEl = root.querySelector(".pdp-review-list");
    var viewEl = root.querySelector(".pdp-review-viewall");
    var viewAllHref = "product-review-all.html?id=" + encodeURIComponent(String(vm.id || ""));

    function applyCommentsFilter(c) {
      if (state.filter === "all") return true;
      return Math.round(Number(c.rating) || 0) === Number(state.filter);
    }
    function commentComparator(a, b) {
      if (state.sort === "oldest") return (new Date(a.createdAt || 0)) - (new Date(b.createdAt || 0));
      if (state.sort === "highest") return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      if (state.sort === "lowest") return (Number(a.rating) || 0) - (Number(b.rating) || 0);
      return (new Date(b.createdAt || 0)) - (new Date(a.createdAt || 0));
    }
    function redrawList() {
      var pool = comments.filter(applyCommentsFilter).sort(commentComparator);
      var shown = pool.slice(0, perPage);
      listEl.innerHTML = shown.length
        ? shown.map(reviewItemHtml).join("")
        : '<div class="pdp-empty-note">لا توجد تقييمات مطابقة.</div>';
      viewEl.innerHTML = pool.length > perPage
        ? '<a class="pdp-review-viewall-btn" href="' + viewAllHref + '"><span class="material-icons-outlined" style="font-size:16px;vertical-align:-3px">format_list_bulleted</span> عرض الكل (' + pool.length + ' تقييم)</a>'
        : "";
    }
    redrawList();

    root.querySelectorAll(".pdp-review-filter-chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        state.filter = this.getAttribute("data-filter-star") || "all";
        root.querySelectorAll(".pdp-review-filter-chip").forEach(function (c) {
          c.classList.toggle("is-active", c === chip);
        });
        redrawList();
      });
    });
    var sortSelect = root.querySelector(".pdp-review-sort");
    if (sortSelect) {
      sortSelect.addEventListener("change", function () {
        state.sort = this.value || "newest";
        redrawList();
      });
    }

    root.addEventListener("click", function (e) {
      var btn = e.target.closest(".pdp-review-item-helpful button");
      if (btn) {
        var parent = btn.closest(".pdp-review-item-helpful");
        if (parent) {
          parent.querySelectorAll("button").forEach(function (b) {
            b.classList.remove("is-active");
          });
          btn.classList.add("is-active");
        }
        return;
      }
      var photo = e.target.closest(".pdp-review-item-photo");
      if (!photo) return;
      var item = photo.closest(".pdp-review-item");
      if (!item) return;
      var raw = item.getAttribute("data-review-images");
      if (!raw) return;
      try {
        var urls = JSON.parse(raw);
        if (!Array.isArray(urls) || !urls.length) return;
        var imgIndex = Number(photo.getAttribute("data-review-img-index")) || 0;
        var sources = urls.map(function (url) { return { type: "image", src: url }; });
        if (global.PDP && global.PDP.Lightbox) {
          global.PDP.Lightbox.open(sources, imgIndex, "صورة التقييم");
        }
      } catch (err) {
        console.warn("[Reviews] lightbox error:", err);
      }
    });
  }

  function reviewItemHtml(c) {
    c = c || {};
    var reviewImages = c.images && c.images.length ? c.images : (c.photo ? [c.photo] : []);
    var html = '<div class="pdp-review-item" data-review-images="' + U.escapeHtml(JSON.stringify(reviewImages)) + '">';
    html += '<div class="pdp-review-item-head">';
    html += '<span class="pdp-review-item-name">' + U.escapeHtml(c.name || "عميل") + '</span>';
    html += '<span class="pdp-review-item-badge">مشترى مؤكد</span>';
    html += '<span class="pdp-review-item-date">' + U.escapeHtml(formatDate(c.createdAt)) + '</span>';
    html += '</div>';
    html += '<div class="pdp-review-item-stars">' + U.starsMarkup(c.rating) + '</div>';
    if (c.text) html += '<p class="pdp-review-item-text">' + U.escapeHtml(c.text) + '</p>';
    if (c.images && c.images.length) {
      html += '<div class="pdp-review-item-photos">';
      c.images.forEach(function (imgUrl, imgIdx) {
        html += '<div class="pdp-review-item-photo" data-review-img-index="' + imgIdx + '"><img src="' + U.safeImage(imgUrl) + '" alt="صورة التقييم" loading="lazy" decoding="async" onerror="this.parentElement.style.display=\'none\'"></div>';
      });
      html += '</div>';
    } else if (c.photo) {
      html += '<div class="pdp-review-item-photos">';
      html += '<div class="pdp-review-item-photo" data-review-img-index="0"><img src="' + U.safeImage(c.photo) + '" alt="صورة التقييم" loading="lazy" decoding="async"></div>';
      html += '</div>';
    }
    html += '<div class="pdp-review-item-helpful"><span>هل كان هذا مفيداً؟</span><button type="button">نعم</button><button type="button">لا</button></div>';
    html += '</div>';
    return html;
  }

  function formatDate(dateStr) {
    try {
      var d = new Date(dateStr);
      return d.toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });
    } catch (e) { return dateStr || ""; }
  }

  global.PDP = global.PDP || {};
  global.PDP.Reviews = { render: render, itemHtml: reviewItemHtml, formatDate: formatDate };
})(window);