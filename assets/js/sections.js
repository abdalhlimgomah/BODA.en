(function () {
  'use strict';

  var CATEGORIES_CACHE_KEY = 'buda_categories_cache';
  var CACHE_DURATION = 5 * 60 * 1000;
  var EXPANDED_CLASS = 'expanded';
  var HAS_BRANCHES_CLASS = 'has-branches';
  var allProducts = [];

  function getCachedCategories() {
    try {
      var cached = localStorage.getItem(CATEGORIES_CACHE_KEY);
      if (!cached) return null;
      var parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp > CACHE_DURATION) {
        localStorage.removeItem(CATEGORIES_CACHE_KEY);
        return null;
      }
      return parsed.data;
    } catch (_) {
      return null;
    }
  }

  function setCachedCategories(data) {
    try {
      localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify({ data: data, timestamp: Date.now() }));
    } catch (_) {}
  }

  async function fetchTaagerProducts() {
    if (window.supabaseClient && typeof window.supabaseClient.fetchTaagerProducts === 'function') {
      try {
        var countryCode = localStorage.getItem('userCountry') || 'EG';
        return (await window.supabaseClient.fetchTaagerProducts(countryCode)) || [];
      } catch (_) {}
    }
    return [];
  }

  async function fetchCategories() {
    var cached = getCachedCategories();
    if (cached) return cached;

    if (!window.supabaseClient) return null;

    try {
      var { data, error } = await window.supabaseClient
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      var categories = data || [];

      var branchPromises = categories.map(function (cat) {
        return window.supabaseClient
          .from('category_branches')
          .select('*')
          .eq('category_id', cat.id)
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
      });

      var branchResults = await Promise.all(branchPromises);
      categories.forEach(function (cat, i) {
        cat.branches = (branchResults[i].data || []).filter(Boolean);
      });

      setCachedCategories(categories);
      return categories;
    } catch (e) {
      console.error('Error fetching categories:', e);
      return null;
    }
  }

  function getProductCountForCategory(category) {
    var count = 0;
    var keywords = category.keywords || [];
    if (!keywords.length) return 0;
    if (!allProducts.length) return 0;

    var keywordSet = keywords.map(function (k) { return k.toLowerCase().trim().replace(/\s+/g, ''); }).filter(Boolean);

    allProducts.forEach(function (p) {
      var searchText = ((p.name || '') + ' ' + (p.category || '') + ' ' + (p.description || '') + ' ' + ((p.keywords || []) || []).join(' ')).toLowerCase();
      searchText = searchText.replace(/\s+/g, '');
      var match = keywordSet.some(function (kw) { return searchText.indexOf(kw) !== -1; });
      if (match) count++;
    });

    return count;
  }

  function getProductCountForBranch(branch) {
    var count = 0;
    var keywords = branch.branch_keywords || [];
    if (!keywords.length) return 0;
    if (!allProducts.length) return 0;

    var keywordSet = keywords.map(function (k) { return k.toLowerCase().trim().replace(/\s+/g, ''); }).filter(Boolean);

    allProducts.forEach(function (p) {
      var searchText = ((p.name || '') + ' ' + (p.category || '') + ' ' + (p.description || '') + ' ' + ((p.keywords || []) || []).join(' ')).toLowerCase();
      searchText = searchText.replace(/\s+/g, '');
      var match = keywordSet.some(function (kw) { return searchText.indexOf(kw) !== -1; });
      if (match) count++;
    });

    return count;
  }

  function renderBranchHTML(category) {
    var branches = category.branches;
    if (!branches || !branches.length) return '';

    return branches.map(function (b) {
      var img = b.branch_image || '';
      var count = getProductCountForBranch(b);
      var countText = count > 0 ? count + ' منتج' : '0 منتجات';
      return (
        '<a href="products.html?category=' + encodeURIComponent(category.slug || category.id) + '&branch=' + encodeURIComponent(b.branch_name) + '" class="section-branch-item">' +
        (img
          ? '<img class="section-branch-img" src="' + img + '" alt="' + escapeHtml(b.branch_name) + '" loading="lazy" onerror="this.style.display=\'none\'" />'
          : '<div class="section-branch-img" style="display:flex;align-items:center;justify-content:center;background:var(--color-primary-50);"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg></div>'
        ) +
        '<div class="section-branch-info">' +
        '<span class="section-branch-name">' + escapeHtml(b.branch_name) + '</span>' +
        '<span class="section-branch-count">' + countText + '</span>' +
        '</div>' +
        '<svg class="section-branch-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>' +
        '</a>'
      );
    }).join('');
  }

  function renderCategories(categories) {
    var grid = document.getElementById('sectionsGrid');
    if (!grid) return;

    if (!categories || !categories.length) {
      grid.innerHTML =
        '<div class="sections-empty">' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/></svg>' +
        '<h3>لا توجد أقسام بعد</h3>' +
        '<p>سيتم إضافة الأقسام قريباً، تابعنا!</p>' +
        '</div>';
      return;
    }

    var html = categories.map(function (cat) {
      var img = cat.image_url || '';
      var name = cat.name || '';
      var count = getProductCountForCategory(cat);
      var countText = count > 0 ? count + ' منتج' : '0 منتجات';
      var hasBranches = cat.branches && cat.branches.length > 0;
      var branchIndicator = hasBranches
        ? '<span class="section-card__branch-indicator">' +
          cat.branches.length + ' فروع ' +
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>' +
          '</span>'
        : '';

      return (
        '<div class="section-card' + (hasBranches ? ' ' + HAS_BRANCHES_CLASS : '') + '" data-category-index="' + categories.indexOf(cat) + '">' +
        '<div class="section-card__image-wrap">' +
        (img
          ? '<img class="section-card__image" src="' + img + '" alt="' + name + '" loading="lazy" onerror="this.parentElement.innerHTML=\'<div class=\\\'section-card__image\\\' style=\\\'display:flex;align-items:center;justify-content:center;height:100%;\\\'><svg xmlns=\\\'http://www.w3.org/2000/svg\\\' width=\\\'40\\\' height=\\\'40\\\' viewBox=\\\'0 0 24 24\\\' fill=\\\'none\\\' stroke=\\\'currentColor\\\' stroke-width=\\\'1.5\\\' stroke-linecap=\\\'round\\\' stroke-linejoin=\\\'round\\\' style=\\\'color:#9CA3AF;\\\'><rect width=\\\'18\\\' height=\\\'18\\\' x=\\\'3\\\' y=\\\'3\\\' rx=\\\'2\\\'/><circle cx=\\\'9\\\' cy=\\\'9\\\' r=\\\'2\\\'/><path d=\\\'m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21\\\'/></svg></div>\'" />'
          : '<div class="section-card__image" style="display:flex;align-items:center;justify-content:center;height:100%;"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:#9CA3AF;"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></div>'
        ) +
        '<div class="section-card__overlay"></div>' +
        '</div>' +
        '<div class="section-card__body">' +
        '<span class="section-card__name">' + escapeHtml(name) + '</span>' +
        '<span class="section-card__count">' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>' +
        countText +
        '</span>' +
        branchIndicator +
        '</div>' +
        '</div>'
      );
    }).join('');

    grid.innerHTML = html;

    grid.addEventListener('click', function (e) {
      var card = e.target.closest('.section-card');
      if (!card) return;

      var branchLink = e.target.closest('.section-branch-item');
      if (branchLink) return;

      var index = parseInt(card.getAttribute('data-category-index'), 10);
      var cat = categories[index];
      if (!cat) return;

      var hasBranches = cat.branches && cat.branches.length > 0;

      if (hasBranches) {
        toggleBranches(card, cat);
      } else {
        window.location.href = 'products.html?category=' + encodeURIComponent(cat.slug || cat.id);
      }
    });
  }

  function toggleBranches(card, category) {
    var grid = document.getElementById('sectionsGrid');
    var existingContainer = card.nextElementSibling;
    var isExpanded = card.classList.contains(EXPANDED_CLASS);

    if (isExpanded && existingContainer && existingContainer.classList.contains('section-branches')) {
      card.classList.remove(EXPANDED_CLASS);
      existingContainer.remove();
      return;
    }

    document.querySelectorAll('#sectionsGrid .' + EXPANDED_CLASS).forEach(function (c) {
      c.classList.remove(EXPANDED_CLASS);
    });
    document.querySelectorAll('#sectionsGrid .section-branches').forEach(function (b) {
      b.remove();
    });

    card.classList.add(EXPANDED_CLASS);

    var container = document.createElement('div');
    container.className = 'section-branches';
    container.innerHTML = renderBranchHTML(category);
    card.parentNode.insertBefore(container, card.nextSibling);
  }

  function escapeHtml(v) {
    return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function init() {
    document.body.classList.add('sections-loading');

    if (typeof injectDesktopElements === 'function') injectDesktopElements();
    if (typeof injectStandardBottomNav === 'function') injectStandardBottomNav();
    if (typeof injectLegacyHiddenElements === 'function') injectLegacyHiddenElements();
    if (typeof initNoonHeaderUI === 'function') {
      setTimeout(initNoonHeaderUI, 100);
    }

    if (window.BudaStore && typeof window.BudaStore.init === 'function') {
      try { await window.BudaStore.init(); } catch (_) {}
    }

    if (window.BudaStore && typeof window.BudaStore.getAllProducts === 'function') {
      var localProducts = window.BudaStore.getAllProducts();
      if (localProducts && Object.keys(localProducts).length > 0) {
        allProducts = Object.values(localProducts).filter(Boolean);
      }
    }

    if (!allProducts.length) {
      allProducts = await fetchTaagerProducts();
    }

    var categories = await fetchCategories();
    renderCategories(categories);

    document.body.classList.remove('sections-loading');
    document.body.classList.add('sections-loaded');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();