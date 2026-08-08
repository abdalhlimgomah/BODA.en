(function (global) {
  "use strict";

  var ReviewEngine = {};

  ReviewEngine.getClient = function () {
    return global.supabaseClient || global._supabase || null;
  };

  ReviewEngine.getProductReviews = function (productId, limit) {
    limit = limit || 20;
    if (!productId) return Promise.resolve([]);
    var sb = ReviewEngine.getClient();
    if (!sb) return Promise.resolve(ReviewEngine.getDemoReviews());

    return sb.from("seo_reviews").select("*").eq("product_id", String(productId)).eq("is_approved", true).order("review_date", { ascending: false }).limit(limit).then(function (res) {
      if (res.error) return ReviewEngine.getDemoReviews();
      return res.data;
    });
  };

  ReviewEngine.submitReview = function (data) {
    var sb = ReviewEngine.getClient();
    if (!sb) return Promise.reject("No database connection");

    return sb.from("seo_reviews").insert({
      product_id: String(data.product_id),
      user_name: data.user_name || "مستخدم",
      user_id: data.user_id || null,
      rating: data.rating || 5,
      title: data.title || "",
      content: data.content || "",
      images: data.images || [],
      video_url: data.video_url || "",
      purchase_date: data.purchase_date || null,
      recommend_product: data.recommend !== false,
      is_verified_purchase: !!data.is_verified,
      is_approved: true,
    }).then(function (res) {
      if (res.error) throw res.error;
      return res.data;
    });
  };

  ReviewEngine.renderReviews = function (reviews, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    if (!reviews || !reviews.length) {
      container.innerHTML = '<div class="reviews-empty"><p>لا توجد مراجعات بعد. كن أول من يراجع هذا المنتج!</p></div>';
      return;
    }

    var avgRating = reviews.reduce(function (sum, r) { return sum + (r.rating || 0); }, 0) / reviews.length;
    var ratingCounts = {};
    reviews.forEach(function (r) {
      var star = Math.round(r.rating || 0);
      ratingCounts[star] = (ratingCounts[star] || 0) + 1;
    });

    container.innerHTML =
      '<div class="reviews-summary">' +
        '<div class="reviews-avg"><span class="reviews-avg-number">' + avgRating.toFixed(1) + '</span>' +
        '<div class="reviews-stars">' + ReviewEngine.renderStars(avgRating) + '</div>' +
        '<span class="reviews-count">' + reviews.length + ' مراجعة</span></div>' +
        '<div class="reviews-bars">' +
          [5, 4, 3, 2, 1].map(function (star) {
            var pct = reviews.length ? ((ratingCounts[star] || 0) / reviews.length * 100) : 0;
            return '<div class="reviews-bar-row"><span class="reviews-bar-label">' + star + '</span><div class="reviews-bar-track"><div class="reviews-bar-fill" style="width:' + pct + '%"></div></div><span class="reviews-bar-count">' + (ratingCounts[star] || 0) + '</span></div>';
          }).join("") +
        '</div></div>' +
      '<div class="reviews-list">' +
        reviews.map(function (r) {
          return '<div class="review-card">' +
            '<div class="review-header"><div class="review-avatar">' + (r.user_name ? r.user_name.charAt(0).toUpperCase() : "م") + '</div>' +
            '<div class="review-meta"><strong>' + ReviewEngine.escHtml(r.user_name || "مستخدم") + '</strong>' +
            (r.is_verified_purchase ? '<span class="review-verified">تم الشراء</span>' : '') +
            '<div class="review-stars-row">' + ReviewEngine.renderStars(r.rating) + '</div></div>' +
            '<span class="review-date">' + (r.review_date ? new Date(r.review_date).toLocaleDateString("ar-SA") : "") + '</span>' +
            '</div>' +
            (r.title ? '<h4 class="review-title">' + ReviewEngine.escHtml(r.title) + '</h4>' : '') +
            (r.content ? '<p class="review-content">' + ReviewEngine.escHtml(r.content) + '</p>' : '') +
            (r.images && r.images.length ? '<div class="review-images">' + r.images.map(function (img) {
              return '<img src="' + img + '" alt="صورة مراجعة" class="review-image" loading="lazy">';
            }).join("") + '</div>' : '') +
            (r.recommend_product ? '<div class="review-recommend">أوصي بهذا المنتج ✓</div>' : '') +
            '</div>';
        }).join("") +
      '</div>';
  };

  ReviewEngine.renderStars = function (rating) {
    var full = Math.floor(rating);
    var half = rating - full >= 0.5 ? 1 : 0;
    var empty = 5 - full - half;
    return '<span class="stars-display">' +
      Array(full).fill('<span class="star star-full">★</span>').join("") +
      (half ? '<span class="star star-half">★</span>' : '') +
      Array(empty).fill('<span class="star star-empty">★</span>').join("") +
      '</span>';
  };

  ReviewEngine.renderReviewForm = function (productId, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML =
      '<div class="review-form"><h3 class="review-form-title">أضف مراجعتك</h3>' +
      '<form id="review-form" onsubmit="ReviewEngine.handleReviewSubmit(event)">' +
        '<input type="hidden" id="review-product-id" value="' + ReviewEngine.escAttr(productId) + '">' +
        '<div class="review-form-group"><label>اسمك</label><input type="text" id="review-name" class="review-form-input" required placeholder="الاسم"></div>' +
        '<div class="review-form-group"><label>التقييم</label><div class="review-stars-input" id="review-stars-input">' +
          [1, 2, 3, 4, 5].map(function (s) { return '<span class="star-input" data-value="' + s + '" onclick="document.getElementById(\'review-rating\').value=' + s + ';this.parentElement.querySelectorAll(\'.star-input\').forEach(function(el,i){el.classList.toggle(\'active\',i<' + s + ')})">★</span>'; }).join("") +
          '<input type="hidden" id="review-rating" value="5">' +
        '</div></div>' +
        '<div class="review-form-group"><label>عنوان المراجعة</label><input type="text" id="review-title" class="review-form-input" placeholder="مثلاً: منتج رائع"></div>' +
        '<div class="review-form-group"><label>المراجعة</label><textarea id="review-content" class="review-form-textarea" rows="4" placeholder="اكتب تجربتك مع هذا المنتج..."></textarea></div>' +
        '<div class="review-form-group"><label>روابط الصور (واحد لكل سطر)</label><textarea id="review-images" class="review-form-textarea" rows="3" placeholder="https://..."></textarea></div>' +
        '<div class="review-form-group"><label><input type="checkbox" id="review-recommend" checked> أوصي بهذا المنتج</label></div>' +
        '<button type="submit" class="review-form-submit">إرسال المراجعة</button>' +
      '</form></div>';
  };

  ReviewEngine.handleReviewSubmit = function (e) {
    e.preventDefault();

    var data = {
      product_id: document.getElementById("review-product-id")?.value || "",
      user_name: document.getElementById("review-name")?.value || "مستخدم",
      rating: parseInt(document.getElementById("review-rating")?.value) || 5,
      title: document.getElementById("review-title")?.value || "",
      content: document.getElementById("review-content")?.value || "",
      images: (document.getElementById("review-images")?.value || "").split("\n").map(function (s) { return s.trim(); }).filter(Boolean),
      recommend: document.getElementById("review-recommend")?.checked !== false,
    };

    if (!data.content && !data.title) {
      alert("يرجى كتابة مراجعة أو عنوان");
      return;
    }

    ReviewEngine.submitReview(data).then(function () {
      alert("تم إرسال المراجعة بنجاح! شكراً لك.");
      document.getElementById("review-form")?.reset();
    }).catch(function (err) {
      alert("حدث خطأ في إرسال المراجعة: " + (err.message || err));
    });
  };

  ReviewEngine.generateReviewSchema = function (reviews) {
    if (!reviews || !reviews.length || !global.SchemaGenerator) return;
    var itemReviewed = document.title || "منتج";
    var author = global.MetaGenerator ? "Buda" : "Buda";

    reviews.slice(0, 10).forEach(function (r) {
      global.SchemaGenerator.injectReview({
        itemReviewed: { name: itemReviewed },
        author: { name: r.user_name || "مستخدم" },
        reviewRating: { ratingValue: r.rating || 5 },
        reviewBody: r.content || r.title || "",
        datePublished: r.review_date || new Date().toISOString(),
      });
    });
  };

  ReviewEngine.escHtml = function (str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  };

  ReviewEngine.escAttr = function (str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  ReviewEngine.getDemoReviews = function () {
    return [
      { id: "1", user_name: "أحمد", rating: 5, title: "منتج ممتاز", content: "تجربة رائعة، أنصح به الجميع", is_verified_purchase: true, recommend_product: true, review_date: new Date().toISOString() },
      { id: "2", user_name: "سارة", rating: 4, title: "جيد جداً", content: "منتج جيد ولكن السعر مرتفع قليلاً", recommend_product: true, review_date: new Date().toISOString() },
    ];
  };

  global.ReviewEngine = ReviewEngine;
})(window);
