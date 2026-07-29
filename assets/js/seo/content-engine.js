(function (global) {
  "use strict";

  var ContentEngine = {};

  ContentEngine.init = function () {
    var path = window.location.pathname;
    var isBlog = path.indexOf("/blog/") !== -1 || path.indexOf("blog") !== -1;
    var isKnowledgeCenter = path.indexOf("knowledge-center") !== -1;
    var isGuide = path.indexOf("guide.html") !== -1;
    var isComparison = path.indexOf("comparison.html") !== -1;
    var isLandingPage = path.indexOf("landing.html") !== -1;

    if (isBlog) ContentEngine.initBlogPage();
    if (isKnowledgeCenter) ContentEngine.initKnowledgeCenter();
    if (isGuide) ContentEngine.initGuidePage();
    if (isComparison) ContentEngine.initComparisonPage();
    if (isLandingPage) ContentEngine.initLandingPage();
  };

  ContentEngine.initBlogPage = function () {
    var slug = global.BlogEngine ? BlogEngine.getQueryParam("slug") : null;
    if (slug) {
      BlogEngine.getPostBySlug(slug).then(function (post) {
        if (!post) return;
        if (global.SEOEngine) SEOEngine.waitForArticle(post);
        if (global.MetaGenerator) {
          MetaGenerator.forArticlePage({
            title: post.meta_title || post.title,
            description: post.meta_description || post.excerpt,
            image: post.featured_image,
            url: window.location.href,
          });
        }
        if (global.SchemaGenerator) {
          SchemaGenerator.injectArticle(post);
          SchemaGenerator.injectBreadcrumb([
            { name: "الرئيسية", url: "/" },
            { name: "المدونة", url: "/pages/blog/" },
            { name: post.title, url: window.location.href },
          ]);
        }
      });
    }
  };

  ContentEngine.initGuidePage = function () {
    var slug = global.BlogEngine ? BlogEngine.getQueryParam("slug") : null;
    if (slug && global.KnowledgeCenter) {
      KnowledgeCenter.getGuideBySlug(slug).then(function (guide) {
        if (!guide) return;
        if (global.MetaGenerator) {
          MetaGenerator.forStaticPage({
            title: guide.meta_title || guide.title + " | دليل شراء | BudoQ",
            description: guide.meta_description || guide.subtitle || "",
            image: guide.image || "",
          });
        }
        if (global.SchemaGenerator) {
          SchemaGenerator.injectBreadcrumb([
            { name: "الرئيسية", url: "/" },
            { name: "مركز المعرفة", url: "/pages/knowledge-center.html" },
            { name: guide.title, url: window.location.href },
          ]);
        }
      });
    }
  };

  ContentEngine.initComparisonPage = function () {
    var slug = global.BlogEngine ? BlogEngine.getQueryParam("slug") : null;
    if (slug && global.KnowledgeCenter) {
      KnowledgeCenter.getComparisonBySlug(slug).then(function (comparison) {
        if (!comparison) return;
        if (global.MetaGenerator) {
          MetaGenerator.forStaticPage({
            title: comparison.meta_title || comparison.title + " | مقارنة | BudoQ",
            description: comparison.meta_description || comparison.subtitle || "",
            image: comparison.image || "",
          });
        }
        if (global.SchemaGenerator) {
          SchemaGenerator.injectBreadcrumb([
            { name: "الرئيسية", url: "/" },
            { name: "المقارنات", url: "/pages/knowledge-center.html" },
            { name: comparison.title, url: window.location.href },
          ]);
        }
      });
    }
  };

  ContentEngine.initLandingPage = function () {
    var slug = global.BlogEngine ? BlogEngine.getQueryParam("slug") : null;
    if (slug && global.KnowledgeCenter) {
      KnowledgeCenter.getLandingPage(slug).then(function (page) {
        if (!page) return;
        if (global.MetaGenerator) {
          MetaGenerator.forStaticPage({
            title: page.meta_title || page.title + " | BudoQ",
            description: page.meta_description || page.subtitle || page.description || "",
            noindex: page.is_noindex || false,
          });
        }
        if (global.SchemaGenerator) {
          SchemaGenerator.injectBreadcrumb([
            { name: "الرئيسية", url: "/" },
            { name: page.title, url: window.location.href },
          ]);
        }
      });
    }
  };

  ContentEngine.appendArticleToProduct = function (productId, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var sb = global.BlogEngine ? BlogEngine.getClient() : null;
    if (!sb) return;

    sb.from("blog_related_products").select("blog_posts!inner(id,title,slug,featured_image,excerpt,published_at,blog_categories!inner(name,slug,color))").eq("product_id", String(productId)).limit(4).then(function (res) {
      if (res.error || !res.data || !res.data.length) {
        container.style.display = "none";
        return;
      }
      var posts = res.data.map(function (r) { return r.blog_posts; }).filter(Boolean);
      container.innerHTML = '<div class="product-articles-section"><h3 class="section-title">مقالات ذات صلة</h3><div class="product-articles-grid">' +
        posts.map(function (p) {
          return '<a href="/pages/blog/post.html?slug=' + encodeURIComponent(p.slug) + '" class="product-article-card">' +
            (p.featured_image ? '<div class="product-article-img"><img src="' + p.featured_image + '" alt="' + p.title + '" loading="lazy"></div>' : '') +
            '<div class="product-article-info"><h4>' + p.title + '</h4>' +
            (p.excerpt ? '<p>' + BlogEngine.truncate(p.excerpt, 80) + '</p>' : '') +
            (p.blog_categories ? '<span class="article-cat" style="color:' + (p.blog_categories.color || '#1a2530') + '">' + p.blog_categories.name + '</span>' : '') +
            '</div></a>';
        }).join("") + '</div></div>';
    });
  };

  ContentEngine.appendBuyingGuide = function (categoryId, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var kc = global.KnowledgeCenter;
    if (!kc) return;

    kc.getGuides({ category: categoryId, limit: 3 }).then(function (guides) {
      if (!guides || !guides.length) {
        container.style.display = "none";
        return;
      }
      container.innerHTML = '<div class="product-guides-section"><h3 class="section-title">دليل الشراء</h3><div class="product-guides-list">' +
        guides.map(function (g) {
          return '<a href="/pages/guide.html?slug=' + encodeURIComponent(g.slug) + '" class="product-guide-link">' +
            '<span class="material-icons-outlined">menu_book</span> ' + g.title + '</a>';
        }).join("") + '</div></div>';
    });
  };

  ContentEngine.appendComparisons = function (productId, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var sb = global.BlogEngine ? BlogEngine.getClient() : null;
    if (!sb) return;

    sb.from("comparison_pages").select("*").contains("comparison_data", JSON.stringify([{ id: productId }])).eq("is_active", true).limit(3).then(function (res) {
      if (res.error || !res.data || !res.data.length) {
        container.style.display = "none";
        return;
      }
      container.innerHTML = '<div class="product-comparisons-section"><h3 class="section-title">مقارنات</h3><div class="product-comparisons-list">' +
        res.data.map(function (c) {
          return '<a href="/pages/comparison.html?slug=' + encodeURIComponent(c.slug) + '" class="product-comparison-link">' +
            '<span class="material-icons-outlined">compare_arrows</span> ' + c.title + '</a>';
        }).join("") + '</div></div>';
    });
  };

  ContentEngine.initOnReady = function () {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", ContentEngine.init);
    } else {
      ContentEngine.init();
    }
  };

  ContentEngine.getQueryParam = function (name) {
    var urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name) || "";
  };

  global.ContentEngine = ContentEngine;
})(window);
