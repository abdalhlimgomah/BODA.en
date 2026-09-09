(function (global) {
  "use strict";

  var KnowledgeCenter = {};

  KnowledgeCenter.getClient = function () {
    return BlogEngine ? BlogEngine.getClient() : null;
  };

  KnowledgeCenter.getSections = function () {
    var sb = KnowledgeCenter.getClient();
    if (!sb) return Promise.resolve(KnowledgeCenter.getDemoSections());

    return sb.from("knowledge_sections").select("*").eq("is_active", true).order("sort_order").then(function (res) {
      if (res.error) return KnowledgeCenter.getDemoSections();
      return res.data;
    });
  };

  KnowledgeCenter.getGuides = function (opts) {
    opts = opts || {};
    var sb = KnowledgeCenter.getClient();
    if (!sb) return Promise.resolve([]);

    var query = sb.from("buying_guides").select("*").eq("is_active", true);
    if (opts.type) query = query.eq("guide_type", opts.type);
    if (opts.category) query = query.eq("category_id", opts.category);
    return query.order("created_at", { ascending: false }).limit(opts.limit || 20).then(function (res) {
      if (res.error) return [];
      return res.data;
    });
  };

  KnowledgeCenter.getGuideBySlug = function (slug) {
    if (!slug) return Promise.resolve(null);
    var sb = KnowledgeCenter.getClient();
    if (!sb) return Promise.resolve(null);

    return sb.from("buying_guides").select("*").eq("slug", slug).eq("is_active", true).single().then(function (res) {
      if (res.error) return null;
      return res.data;
    });
  };

  KnowledgeCenter.getComparisons = function (opts) {
    opts = opts || {};
    var sb = KnowledgeCenter.getClient();
    if (!sb) return Promise.resolve([]);

    var query = sb.from("comparison_pages").select("*").eq("is_active", true);
    if (opts.type) query = query.eq("comparison_type", opts.type);
    return query.order("created_at", { ascending: false }).limit(opts.limit || 20).then(function (res) {
      if (res.error) return [];
      return res.data;
    });
  };

  KnowledgeCenter.getComparisonBySlug = function (slug) {
    if (!slug) return Promise.resolve(null);
    var sb = KnowledgeCenter.getClient();
    if (!sb) return Promise.resolve(null);

    return sb.from("comparison_pages").select("*").eq("slug", slug).eq("is_active", true).single().then(function (res) {
      if (res.error) return null;
      return res.data;
    });
  };

  KnowledgeCenter.getLandingPage = function (slug) {
    if (!slug) return Promise.resolve(null);
    var sb = KnowledgeCenter.getClient();
    if (!sb) return Promise.resolve(null);

    return sb.from("landing_pages").select("*").eq("slug", slug).eq("is_active", true).single().then(function (res) {
      if (res.error) return null;
      return res.data;
    });
  };

  KnowledgeCenter.getLandingPagesByType = function (type, limit) {
    limit = limit || 20;
    var sb = KnowledgeCenter.getClient();
    if (!sb) return Promise.resolve([]);

    return sb.from("landing_pages").select("*").eq("page_type", type).eq("is_active", true).order("created_at", { ascending: false }).limit(limit).then(function (res) {
      if (res.error) return [];
      return res.data;
    });
  };

  KnowledgeCenter.renderGuidesGrid = function (guides, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    if (!guides || !guides.length) {
      container.innerHTML = '<div class="kc-empty"><span class="material-icons-outlined">menu_book</span><p>لا توجد أدلة بعد</p></div>';
      return;
    }
    container.innerHTML = guides.map(function (g) {
      var typeLabels = {
        buying: "دليل شراء",
        how_to: "كيفية",
        top_picks: "أفضل المنتجات",
        review: "مراجعة",
        tutorial: "درس تعليمي",
        comparison: "مقارنة",
      };
      var typeLabel = typeLabels[g.guide_type] || g.guide_type;
      return '<a href="guide.html?slug=' + encodeURIComponent(g.slug) + '" class="guide-card">' +
        '<div class="guide-card-type guide-type-' + g.guide_type + '">' + typeLabel + '</div>' +
        '<h3 class="guide-card-title">' + KnowledgeCenter.escHtml(g.title) + '</h3>' +
        (g.subtitle ? '<p class="guide-card-subtitle">' + KnowledgeCenter.escHtml(g.subtitle) + '</p>' : '') +
        '<span class="guide-card-readmore">اقرأ الدليل <span class="material-icons-outlined" style="font-size:16px">arrow_back</span></span></a>';
    }).join("");
  };

  KnowledgeCenter.renderComparisonsGrid = function (comparisons, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    if (!comparisons || !comparisons.length) {
      container.innerHTML = '<div class="kc-empty"><span class="material-icons-outlined">compare</span><p>لا توجد مقارنات بعد</p></div>';
      return;
    }
    container.innerHTML = comparisons.map(function (c) {
      var typeLabels = {
        "product_vs_product": "منتج ضد منتج",
        "brand_vs_brand": "براند ضد براند",
        "category_vs_category": "فئة ضد فئة",
      };
      return '<a href="comparison.html?slug=' + encodeURIComponent(c.slug) + '" class="comparison-card">' +
        '<div class="comparison-card-header"><span class="material-icons-outlined">compare_arrows</span> <span>' + (typeLabels[c.comparison_type] || "مقارنة") + '</span></div>' +
        '<h3 class="comparison-card-title">' + KnowledgeCenter.escHtml(c.title) + '</h3>' +
        (c.subtitle ? '<p class="comparison-card-subtitle">' + KnowledgeCenter.escHtml(c.subtitle) + '</p>' : '') +
        '<div class="comparison-card-entities">' +
        (c.entity_a_name ? '<span class="comparison-entity">' + KnowledgeCenter.escHtml(c.entity_a_name) + '</span>' : '') +
        '<span class="comparison-vs">VS</span>' +
        (c.entity_b_name ? '<span class="comparison-entity">' + KnowledgeCenter.escHtml(c.entity_b_name) + '</span>' : '') +
        '</div></a>';
    }).join("");
  };

  KnowledgeCenter.renderLandingBanner = function (page, containerId) {
    var container = document.getElementById(containerId);
    if (!container || !page) return;

    var bgStyle = page.banner_image ? 'style="background-image:url(' + page.banner_image + ')"' : "";
    container.innerHTML = '<div class="landing-banner" ' + bgStyle + '>' +
      '<div class="landing-banner-overlay"></div>' +
      '<div class="landing-banner-content">' +
      '<h1 class="landing-banner-title">' + KnowledgeCenter.escHtml(page.title) + '</h1>' +
      (page.subtitle ? '<p class="landing-banner-subtitle">' + KnowledgeCenter.escHtml(page.subtitle) + '</p>' : '') +
      (page.description ? '<p class="landing-banner-desc">' + KnowledgeCenter.escHtml(page.description) + '</p>' : '') +
      '</div></div>';
  };

  KnowledgeCenter.renderGuideContent = function (guide, containerId) {
    var container = document.getElementById(containerId);
    if (!container || !guide) return;

    var html = guide.content_html || guide.content || "";
    container.innerHTML = html;
  };

  KnowledgeCenter.renderGuideSteps = function (guide, containerId) {
    var container = document.getElementById(containerId);
    if (!container || !guide) return;

    var steps = guide.steps_data;
    if (!steps || !steps.length) {
      container.style.display = "none";
      return;
    }

    container.innerHTML = '<div class="guide-steps"><h2 class="guide-steps-title">الخطوات</h2><div class="steps-list">' +
      steps.map(function (step, i) {
        return '<div class="step-item"><div class="step-number">' + (i + 1) + '</div><div class="step-content">' +
          (step.title ? '<h3 class="step-title">' + KnowledgeCenter.escHtml(step.title) + '</h3>' : '') +
          (step.content ? '<div class="step-text">' + step.content + '</div>' : '') +
          (step.image ? '<img src="' + step.image + '" alt="' + (step.title || "") + '" class="step-image" loading="lazy">' : '') +
          '</div></div>';
      }).join("") + '</div></div>';
  };

  KnowledgeCenter.renderComparisonTable = function (comparison, containerId) {
    var container = document.getElementById(containerId);
    if (!container || !comparison) return;

    var features = comparison.features_table;
    if (!features || !features.length) {
      container.style.display = "none";
      return;
    }

    var entityA = comparison.entity_a_name || "الخيار الأول";
    var entityB = comparison.entity_b_name || "الخيار الثاني";

    container.innerHTML = '<div class="comparison-table-wrapper"><table class="comparison-table">' +
      '<thead><tr><th>الميزة</th><th class="comp-entity-a">' + KnowledgeCenter.escHtml(entityA) + '</th><th class="comp-entity-b">' + KnowledgeCenter.escHtml(entityB) + '</th></tr></thead><tbody>' +
      features.map(function (f) {
        var winnerClass = "";
        if (f.winner === "a") winnerClass = " comp-winner";
        else if (f.winner === "b") winnerClass = " comp-winner";
        return '<tr><td class="comp-feature">' + KnowledgeCenter.escHtml(f.feature || f.name || "") + '</td>' +
          '<td class="comp-value' + (f.winner === "a" ? " comp-winner" : "") + '">' + KnowledgeCenter.escHtml(f.value_a || f.a || "") + '</td>' +
          '<td class="comp-value' + (f.winner === "b" ? " comp-winner" : "") + '">' + KnowledgeCenter.escHtml(f.value_b || f.b || "") + '</td></tr>';
      }).join("") + '</tbody></table></div>';
  };

  KnowledgeCenter.renderLandingFAQ = function (page, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    if (!page.faq_data || !page.faq_data.length) {
      container.style.display = "none";
      return;
    }

    container.innerHTML = '<div class="landing-faq"><h2 class="section-title">الأسئلة الشائعة</h2><div class="faq-list">' +
      page.faq_data.map(function (item, i) {
        return '<div class="faq-item"><button class="faq-question" onclick="this.parentElement.classList.toggle(\'faq-open\')">' +
          '<span>' + KnowledgeCenter.escHtml(item.question) + '</span>' +
          '<span class="material-icons-outlined faq-icon">expand_more</span></button>' +
          '<div class="faq-answer">' + KnowledgeCenter.escHtml(item.answer) + '</div></div>';
      }).join("") + '</div></div>';
  };

  KnowledgeCenter.renderGuideFAQ = function (guide, containerId) {
    KnowledgeCenter.renderLandingFAQ(guide, containerId);
  };

  KnowledgeCenter.calculateReadTime = function (text) {
    if (!text) return 1;
    var wordCount = text.replace(/<[^>]+>/g, "").split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  };

  KnowledgeCenter.escHtml = function (str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  };

  KnowledgeCenter.getDemoSections = function () {
    return [
      { id: "ks-1", title: "أدلة الشراء", slug: "buying-guides", description: "تعلم كيف تشتري المنتجات المناسبة", icon: "menu_book", color: "#3b82f6", sort_order: 1 },
      { id: "ks-2", title: "مقارنات", slug: "comparisons", description: "قارن بين المنتجات والبراندات", icon: "compare_arrows", color: "#8b5cf6", sort_order: 2 },
      { id: "ks-3", title: "مراجعات", slug: "reviews", description: "مراجعات المنتجات من المستخدمين والخبراء", icon: "rate_review", color: "#f59e0b", sort_order: 3 },
      { id: "ks-4", title: "نصائح وحيل", slug: "tips", description: "نصائح لتحسين تجربة التسوق", icon: "tips_and_updates", color: "#10b981", sort_order: 4 },
      { id: "ks-5", title: "أخبار العروض", slug: "offers-news", description: "أحدث العروض والتخفيضات", icon: "local_offer", color: "#ef4444", sort_order: 5 },
    ];
  };

  global.KnowledgeCenter = KnowledgeCenter;
})(window);
