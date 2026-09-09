(function (global) {
  "use strict";

  var BlogEngine = {};

  var CACHE_KEY = "buda_blog_cache";
  var CACHE_TTL = 5 * 60 * 1000;

  BlogEngine.getClient = function () {
    return global.supabaseClient || global._supabase || null;
  };

  BlogEngine.getCache = function (key) {
    try {
      var store = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
      var item = store[key];
      if (!item) return null;
      if (Date.now() - item.ts > CACHE_TTL) return null;
      return item.data;
    } catch (e) { return null; }
  };

  BlogEngine.setCache = function (key, data) {
    try {
      var store = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
      store[key] = { data: data, ts: Date.now() };
      while (JSON.stringify(store).length > 500000) {
        var oldest = Object.keys(store).reduce(function (a, b) {
          return store[a].ts < store[b].ts ? a : b;
        });
        delete store[oldest];
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(store));
    } catch (e) {}
  };

  BlogEngine.clearCache = function () {
    try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
  };

  BlogEngine.fetchPosts = function (opts) {
    opts = opts || {};
    var sb = BlogEngine.getClient();
    if (!sb) return Promise.resolve(BlogEngine.getDemoPosts(opts));

    var cacheKey = "posts_" + JSON.stringify(opts);
    var cached = BlogEngine.getCache(cacheKey);
    if (cached) return Promise.resolve(cached);

    var query = sb.from("blog_posts").select("*, blog_categories!inner(name,slug,color), blog_authors!inner(name,slug,avatar)").eq("status", "published");

    if (opts.category) query = query.eq("blog_categories.slug", opts.category);
    if (opts.author) query = query.eq("blog_authors.slug", opts.author);
    if (opts.tag) {
      var tagQuery = sb.from("blog_post_tags").select("post_id").eq("tag_id", opts.tag);
      return tagQuery.then(function (tRes) {
        if (tRes.error) return BlogEngine.getDemoPosts(opts);
        var ids = (tRes.data || []).map(function (r) { return r.post_id; });
        if (!ids.length) return [];
        return query.in("id", ids).order("published_at", { ascending: false }).range(opts.offset || 0, (opts.offset || 0) + (opts.limit || 12) - 1).then(function (res) {
          if (res.error) return BlogEngine.getDemoPosts(opts);
          BlogEngine.setCache(cacheKey, res.data);
          return res.data;
        });
      });
    }

    if (opts.search) {
      query = query.textSearch("search_vector", opts.search);
    }

    return query.order("published_at", { ascending: false }).range(opts.offset || 0, (opts.offset || 0) + (opts.limit || 12) - 1).then(function (res) {
      if (res.error) return BlogEngine.getDemoPosts(opts);
      BlogEngine.setCache(cacheKey, res.data);
      return res.data;
    });
  };

  BlogEngine.getPostBySlug = function (slug) {
    if (!slug) return Promise.resolve(null);
    var sb = BlogEngine.getClient();
    if (!sb) return Promise.resolve(BlogEngine.getDemoPost(slug));

    var cacheKey = "post_" + slug;
    var cached = BlogEngine.getCache(cacheKey);
    if (cached) return Promise.resolve(cached);

    return sb.from("blog_posts").select("*, blog_categories(*), blog_authors(*), blog_post_tags(blog_tags(*)), blog_related_products(*)").eq("slug", slug).eq("status", "published").single().then(function (res) {
      if (res.error) return BlogEngine.getDemoPost(slug);
      BlogEngine.incrementView(slug);
      BlogEngine.setCache(cacheKey, res.data);
      return res.data;
    });
  };

  BlogEngine.getCategories = function () {
    var sb = BlogEngine.getClient();
    if (!sb) return Promise.resolve(BlogEngine.getDemoCategories());

    var cached = BlogEngine.getCache("categories");
    if (cached) return Promise.resolve(cached);

    return sb.from("blog_categories").select("*").eq("is_active", true).order("sort_order").then(function (res) {
      if (res.error) return BlogEngine.getDemoCategories();
      BlogEngine.setCache("categories", res.data);
      return res.data;
    });
  };

  BlogEngine.getTags = function () {
    var sb = BlogEngine.getClient();
    if (!sb) return Promise.resolve(BlogEngine.getDemoTags());

    var cached = BlogEngine.getCache("tags");
    if (cached) return Promise.resolve(cached);

    return sb.from("blog_tags").select("*").eq("is_active", true).order("name").then(function (res) {
      if (res.error) return BlogEngine.getDemoTags();
      BlogEngine.setCache("tags", res.data);
      return res.data;
    });
  };

  BlogEngine.getAuthors = function () {
    var sb = BlogEngine.getClient();
    if (!sb) return Promise.resolve(BlogEngine.getDemoAuthors());

    var cached = BlogEngine.getCache("authors");
    if (cached) return Promise.resolve(cached);

    return sb.from("blog_authors").select("*").eq("is_active", true).then(function (res) {
      if (res.error) return BlogEngine.getDemoAuthors();
      BlogEngine.setCache("authors", res.data);
      return res.data;
    });
  };

  BlogEngine.getAuthorBySlug = function (slug) {
    return BlogEngine.getAuthors().then(function (authors) {
      return authors.find(function (a) { return a.slug === slug; }) || null;
    });
  };

  BlogEngine.getCategoryBySlug = function (slug) {
    return BlogEngine.getCategories().then(function (cats) {
      return cats.find(function (c) { return c.slug === slug; }) || null;
    });
  };

  BlogEngine.getRelatedPosts = function (postId, limit) {
    limit = limit || 4;
    var sb = BlogEngine.getClient();
    if (!sb) return Promise.resolve([]);

    return BlogEngine.getPostBySlug(postId).then(function (post) {
      if (!post) return [];
      var relatedIds = post.related_post_ids || [];
      if (relatedIds.length) {
        return sb.from("blog_posts").select("*, blog_categories!inner(name,slug,color)").in("id", relatedIds).eq("status", "published").limit(limit).then(function (res) {
          return res.error ? [] : (res.data || []);
        });
      }
      return sb.from("blog_posts").select("*, blog_categories!inner(name,slug,color)").neq("id", postId).eq("status", "published").eq("category_id", post.category_id).limit(limit).then(function (res) {
        return res.error ? [] : (res.data || []);
      });
    });
  };

  BlogEngine.renderPosts = function (posts, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;
    if (!posts || !posts.length) {
      container.innerHTML = '<div class="blog-empty"><span class="material-icons-outlined">article</span><p>لا توجد مقالات بعد</p></div>';
      return;
    }
    container.innerHTML = posts.map(function (p) {
      return BlogEngine.renderPostCard(p);
    }).join("");
  };

  BlogEngine.renderPostCard = function (post) {
    var cat = post.blog_categories || {};
    var author = post.blog_authors || {};
    var date = post.published_at || post.created_at || "";
    var dateStr = date ? BlogEngine.formatDate(date) : "";
    var readTime = post.reading_time || Math.max(1, Math.ceil((post.content || "").length / 1000));

    return '<article class="blog-card">' +
      '<a href="post.html?slug=' + encodeURIComponent(post.slug) + '" class="blog-card-link">' +
      (post.featured_image ? '<div class="blog-card-image"><img src="' + post.featured_image + '" alt="' + (post.title || "") + '" loading="lazy"></div>' : '<div class="blog-card-image blog-card-image-placeholder"><span class="material-icons-outlined">article</span></div>') +
      '<div class="blog-card-body">' +
      (cat.name ? '<span class="blog-card-category" style="background:' + (cat.color || '#1a2530') + '20;color:' + (cat.color || '#1a2530') + '">' + BlogEngine.escHtml(cat.name) + '</span>' : '') +
      '<h3 class="blog-card-title">' + BlogEngine.escHtml(post.title) + '</h3>' +
      (post.excerpt ? '<p class="blog-card-excerpt">' + BlogEngine.escHtml(BlogEngine.truncate(post.excerpt, 120)) + '</p>' : '') +
      '<div class="blog-card-meta">' +
      (author.name ? '<span class="blog-card-author"><span class="material-icons-outlined" style="font-size:14px">person</span> ' + BlogEngine.escHtml(author.name) + '</span>' : '') +
      (dateStr ? '<span class="blog-card-date"><span class="material-icons-outlined" style="font-size:14px">calendar_today</span> ' + dateStr + '</span>' : '') +
      '<span class="blog-card-readtime"><span class="material-icons-outlined" style="font-size:14px">schedule</span> ' + readTime + ' دقائق</span>' +
      '</div></div></a></article>';
  };

  BlogEngine.renderPostContent = function (post, containerId) {
    var container = document.getElementById(containerId);
    if (!container || !post) return;

    var content = post.content_html || post.content || "";
    content = BlogEngine.processContent(content, post);

    container.innerHTML = content;
  };

  BlogEngine.processContent = function (html, post) {
    if (!html) return "";

    html = BlogEngine.processProductBlocks(html, post);
    html = BlogEngine.processInternalLinks(html);

    return html;
  };

  BlogEngine.processProductBlocks = function (html, post) {
    return html.replace(/<product-block[^>]*product-id=["']([^"']+)["'][^>]*>/gi, function (match, productId) {
      return '<div class="content-product-block" data-product-id="' + productId + '"><div class="product-block-loading">جاري تحميل المنتج...</div></div>';
    });
  };

  BlogEngine.processInternalLinks = function (html) {
    return html.replace(/href="\/?(pages\/)?(product\.html\?id=(\d+)|category-landing\.html\?cat=([^"']+)|blog\/post\.html\?slug=([^"']+))"/gi, function (match, p1, p2, prodId, catSlug, postSlug) {
      if (prodId) return 'href="' + BlogEngine.getSiteUrl() + '/pages/product.html?id=' + prodId + '" class="internal-link"';
      if (catSlug) return 'href="' + BlogEngine.getSiteUrl() + '/pages/category-landing.html?cat=' + encodeURIComponent(catSlug) + '" class="internal-link"';
      if (postSlug) return 'href="' + BlogEngine.getSiteUrl() + '/pages/blog/post.html?slug=' + encodeURIComponent(postSlug) + '" class="internal-link"';
      return match;
    });
  };

  BlogEngine.renderTOC = function (post, containerId) {
    var container = document.getElementById(containerId);
    if (!container || !post || !post.has_toc) return;

    var tocData = post.toc_data;
    if (!tocData || !tocData.length) {
      var content = post.content_html || post.content || "";
      tocData = BlogEngine.generateTOC(content);
    }

    if (!tocData || !tocData.length) {
      container.style.display = "none";
      return;
    }

    container.innerHTML = '<div class="toc-container"><div class="toc-header"><span class="material-icons-outlined">list_alt</span> <strong>جدول المحتويات</strong></div><ul class="toc-list">' +
      tocData.map(function (item, i) {
        var cls = "toc-level-" + (item.level || 2);
        return '<li class="' + cls + '"><a href="#toc-' + i + '" class="toc-link">' + BlogEngine.escHtml(item.text) + '</a></li>';
      }).join("") + '</ul></div>';
  };

  BlogEngine.generateTOC = function (html) {
    var items = [];
    var headingRegex = /<h([2-4])(?:\s+[^>]*)?>(.*?)<\/h\1>/gi;
    var match;
    while ((match = headingRegex.exec(html)) !== null) {
      var text = match[2].replace(/<[^>]+>/g, "").trim();
      if (text) {
        items.push({ level: parseInt(match[1]), text: text });
      }
    }
    return items;
  };

  BlogEngine.addHeadingIDs = function (container) {
    if (!container) return;
    var headings = container.querySelectorAll("h2, h3, h4");
    var idx = 0;
    headings.forEach(function (h) {
      if (!h.id) {
        h.id = "toc-" + idx;
        idx++;
      }
    });
  };

  BlogEngine.renderFAQ = function (post, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var faq = post.faq_data;
    if (!faq || !faq.length) {
      container.style.display = "none";
      return;
    }

    container.innerHTML = '<div class="faq-section"><h2 class="faq-title">الأسئلة الشائعة</h2><div class="faq-list">' +
      faq.map(function (item, i) {
        return '<div class="faq-item"><button class="faq-question" onclick="this.parentElement.classList.toggle(\'faq-open\')">' +
          '<span>' + BlogEngine.escHtml(item.question) + '</span>' +
          '<span class="material-icons-outlined faq-icon">expand_more</span></button>' +
          '<div class="faq-answer">' + BlogEngine.escHtml(item.answer) + '</div></div>';
      }).join("") + '</div></div>';
  };

  BlogEngine.renderRelatedProducts = function (post, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var productIds = post.related_product_ids || [];
    var relatedProducts = post.blog_related_products || [];

    var ids = productIds.slice();
    relatedProducts.forEach(function (rp) {
      if (ids.indexOf(rp.product_id) === -1) ids.push(rp.product_id);
    });

    if (!ids.length) {
      container.style.display = "none";
      return;
    }

    var sb = BlogEngine.getClient();
    if (!sb) {
      container.style.display = "none";
      return;
    }

    sb.from("products").select("id,name,current_price,images,slug,seller_name").in("id", ids).limit(12).then(function (res) {
      if (res.error || !res.data || !res.data.length) {
        container.style.display = "none";
        return;
      }
      container.innerHTML = '<div class="related-products-section"><h3 class="section-title">المنتجات المذكورة في المقال</h3><div class="related-products-grid">' +
        res.data.map(function (p) {
          var img = Array.isArray(p.images) ? p.images[0] : (p.images || "");
          return '<a href="product.html?id=' + p.id + '" class="related-product-card">' +
            (img ? '<div class="related-product-img"><img src="' + img + '" alt="' + (p.name || "") + '" loading="lazy"></div>' : '') +
            '<div class="related-product-info"><h4 class="related-product-name">' + BlogEngine.escHtml(p.name || "") + '</h4>' +
            (p.current_price ? '<span class="related-product-price">' + p.current_price + ' جنيه</span>' : '') +
            (p.seller_name ? '<span class="related-product-seller">' + BlogEngine.escHtml(p.seller_name) + '</span>' : '') +
            '</div></a>';
        }).join("") + '</div></div>';
    });
  };

  BlogEngine.renderReadingProgress = function () {
    var bar = document.getElementById("reading-progress-bar");
    if (!bar) return;

    window.addEventListener("scroll", function () {
      var scrollTop = window.scrollY;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) { bar.style.width = "0%"; return; }
      var progress = Math.min(100, (scrollTop / docHeight) * 100);
      bar.style.width = progress + "%";
    });
  };

  BlogEngine.renderShareButtons = function (post, containerId) {
    var container = document.getElementById(containerId);
    if (!container || !post) return;

    var url = encodeURIComponent(window.location.href);
    var title = encodeURIComponent(post.title || "");

    container.innerHTML = '<div class="share-section"><h4 class="share-title">شارك المقال</h4><div class="share-buttons">' +
      '<button class="share-btn share-facebook" onclick="window.open(\'https://www.facebook.com/sharer/sharer.php?u=' + url + '\',\'_blank\')"><span class="material-icons-outlined">facebook</span></button>' +
      '<button class="share-btn share-twitter" onclick="window.open(\'https://twitter.com/intent/tweet?text=' + title + '&url=' + url + '\',\'_blank\')"><span class="material-icons-outlined">X</span></button>' +
      '<button class="share-btn share-whatsapp" onclick="window.open(\'https://wa.me/?text=' + title + '%20' + url + '\',\'_blank\')"><span class="material-icons-outlined">whatsapp</span></button>' +
      '<button class="share-btn share-copy" onclick="BlogEngine.copyLink(this)"><span class="material-icons-outlined">link</span></button>' +
      '</div></div>';
  };

  BlogEngine.copyLink = function (btn) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(function () {
        btn.classList.add("copied");
        setTimeout(function () { btn.classList.remove("copied"); }, 2000);
      });
    }
  };

  BlogEngine.incrementView = function (slug) {
    var sb = BlogEngine.getClient();
    if (!sb) return;
    sb.rpc("increment_blog_view", { post_slug: slug }).catch(function () {});
  };

  BlogEngine.formatDate = function (dateStr) {
    try {
      var d = new Date(dateStr);
      var options = { year: "numeric", month: "long", day: "numeric" };
      return d.toLocaleDateString("ar-SA", options);
    } catch (e) { return dateStr; }
  };

  BlogEngine.truncate = function (str, len) {
    if (!str) return "";
    if (str.length <= len) return str;
    return str.substring(0, len).trim() + "...";
  };

  BlogEngine.escHtml = function (str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  };

  BlogEngine.getSiteUrl = function () {
    var u = global.SEOUtils;
    return u ? u.getSiteUrl() : (window.location.origin + "/Buda");
  };

  BlogEngine.getDemoPosts = function (opts) {
    var posts = DEMO_BLOG_POSTS || [];
    if (opts.category) posts = posts.filter(function (p) { return (p.blog_categories || {}).slug === opts.category; });
    if (opts.offset) posts = posts.slice(opts.offset);
    if (opts.limit) posts = posts.slice(0, opts.limit);
    return posts;
  };

  BlogEngine.getDemoPost = function (slug) {
    var posts = DEMO_BLOG_POSTS || [];
    return posts.find(function (p) { return p.slug === slug; }) || null;
  };

  BlogEngine.getDemoCategories = function () {
    return (global.DEMO_BLOG_CATEGORIES || []).slice();
  };

  BlogEngine.getDemoTags = function () {
    return (global.DEMO_BLOG_TAGS || []).slice();
  };

  BlogEngine.getDemoAuthors = function () {
    return (global.DEMO_BLOG_AUTHORS || []).slice();
  };

  BlogEngine.searchPosts = function (query, limit) {
    limit = limit || 10;
    if (!query || query.length < 2) return Promise.resolve([]);
    return BlogEngine.fetchPosts({ search: query, limit: limit });
  };

  BlogEngine.getLatestPosts = function (limit) {
    limit = limit || 6;
    return BlogEngine.fetchPosts({ limit: limit });
  };

  BlogEngine.getPopularPosts = function (limit) {
    limit = limit || 6;
    var sb = BlogEngine.getClient();
    if (!sb) return BlogEngine.fetchPosts({ limit: limit });

    return sb.from("blog_posts").select("*, blog_categories!inner(name,slug,color), blog_authors!inner(name,slug,avatar)").eq("status", "published").order("view_count", { ascending: false }).limit(limit).then(function (res) {
      if (res.error) return BlogEngine.fetchPosts({ limit: limit });
      return res.data;
    });
  };

  global.BlogEngine = BlogEngine;
})(window);

window.DEMO_BLOG_POSTS = [];
window.DEMO_BLOG_CATEGORIES = [
  { id: "cat-1", name: "أخبار العروض", slug: "offers", description: "أحدث العروض والتخفيضات", color: "#ef4444", sort_order: 1 },
  { id: "cat-2", name: "أدلة الشراء", slug: "buying-guides", description: "دليل شراء المنتجات", color: "#3b82f6", sort_order: 2 },
  { id: "cat-3", name: "مقارنات", slug: "comparisons", description: "مقارنات بين المنتجات", color: "#8b5cf6", sort_order: 3 },
  { id: "cat-4", name: "نصائح", slug: "tips", description: "نصائح وحيل", color: "#10b981", sort_order: 4 },
  { id: "cat-5", name: "مراجعات", slug: "reviews", description: "مراجعات المنتجات", color: "#f59e0b", sort_order: 5 },
];
window.DEMO_BLOG_TAGS = [
  { id: "tag-1", name: "إلكترونيات", slug: "electronics" },
  { id: "tag-2", name: "موضة", slug: "fashion" },
  { id: "tag-3", name: "عطور", slug: "perfumes" },
  { id: "tag-4", name: "عروض", slug: "offers" },
  { id: "tag-5", name: "جديد", slug: "new" },
];
window.DEMO_BLOG_AUTHORS = [
  { id: "auth-1", name: "فريق BudoQ", slug: "budoq-team", bio: "فريق BudoQ", avatar: "" },
];
