/* ============================================================
   الصفحات الذكية — رندر تخطيط استوديو اللوحة على الموقع
   يستخدمه category-landing.html و brand-landing.html
   ============================================================ */
(function () {
  'use strict';

  var SmartPage = {
    rendered: false,

    _client: function () {
      if (typeof getSupabaseClient === 'function') return getSupabaseClient();
      if (window.supabaseClient && typeof window.supabaseClient.from === 'function') return window.supabaseClient;
      if (window.supabase && typeof window.supabase.createClient === 'function') {
        return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      }
      return null;
    },

    _country: function () {
      try {
        var cc = localStorage.getItem('userCountry');
        if (cc) return cc.toUpperCase();
        if (window.TaagerIntegration && typeof window.TaagerIntegration.getSelectedCountry === 'function') {
          var sel = window.TaagerIntegration.getSelectedCountry();
          if (sel && sel.code) return sel.code.toUpperCase();
        }
      } catch (e) {}
      return 'EG';
    },

    _esc: function (s) {
      if (s == null) return '';
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },

    _price: function (p) {
      var n = Number(p) || 0;
      if (window.formatEgp) { try { return formatEgp(n); } catch (e) {} }
      return n.toLocaleString('ar-EG') + ' ج.م';
    },

    // إرجاع true إذا رُسمت صفحة ذكية (وإلا false فيكمل الموقع بالشكل القديم)
    async tryRender(opts) {
      if (this.rendered) return false;
      var client = this._client();
      var slug = ((opts && opts.slug) || '').trim();
      if (!client || !slug) return false;

      var cc = this._country();
      var page = null;
      try {
        var r1 = await client.from('smart_pages').select('*')
          .eq('slug', slug).eq('page_type', opts.pageType)
          .eq('is_active', true).eq('country_code', cc).limit(1);
        if (!r1.error && r1.data && r1.data.length) page = r1.data[0];
        if (!page) {
          var r2 = await client.from('smart_pages').select('*')
            .eq('slug', slug).eq('page_type', opts.pageType)
            .eq('is_active', true).eq('country_code', 'EG').limit(1);
          if (!r2.error && r2.data && r2.data.length) page = r2.data[0];
        }
      } catch (e) { return false; }
      if (!page) return false;

      this.rendered = true;

      var blocks = [];
      try {
        var br = await client.from('smart_page_blocks').select('*')
          .eq('page_id', page.id).eq('is_active', true)
          .order('block_order', { ascending: true });
        if (!br.error) blocks = br.data || [];
      } catch (e) {}

      if (!blocks.length) { this.rendered = false; return false; }

      var contentEl = (opts && opts.contentEl) ||
        document.getElementById('clContent') ||
        document.getElementById('blContent');
      if (!contentEl) return true;

      var sk = contentEl.querySelector('#clSkeleton, #blSkeleton, .cl-skeleton');
      if (sk) sk.remove();
      document.body.classList.remove('cl-loading', 'bl-loading');
      document.body.classList.add('cl-loaded');

      var colors = (page.settings && page.settings.colors) || {};
      var style = '--sp-bg:' + (colors.bg || '#ffffff') +
        ';--sp-primary:' + (colors.primary || '#6d28d9') +
        ';--sp-text:' + (colors.text || '#1e293b');

      var bc = document.getElementById('clBreadcrumbCurrent') || document.getElementById('blBreadcrumbCurrent');
      if (bc) bc.textContent = page.title || slug;
      if (page.title && document.title.indexOf(page.title) === -1) document.title = page.title + ' - BudoQ';

      contentEl.innerHTML = '<div class="sp-page" id="spPage" style="' + style + '"></div>';
      var holder = document.getElementById('spPage');
      if (holder) {
        await this.renderBlocks(holder, blocks);
      }
      return true;
    },

    async renderBlocks(holder, blocks) {
      if (!holder) return;
      for (var i = 0; i < blocks.length; i++) {
        var b = blocks[i];
        try {
          if (b.block_type === 'hero_slider') await this.hero(holder, b.settings || {});
          else if (b.block_type === 'title_text') this.titleBlock(holder, b.settings || {});
          else if (b.block_type === 'products') await this.products(holder, b.settings || {});
          else if (b.block_type === 'ad_banner') this.ad(holder, b.settings || {});
          else if (b.block_type === 'brands_row') await this.brands(holder, b.settings || {});
          else if (b.block_type === 'smart_categories') await this.smartCats(holder, b.settings || {});
          else if (b.block_type === 'showcase') await this.showcase(holder, b.settings || {});
        } catch (e) {
          console.warn('[SP] block', b.block_type, 'failed:', e);
        }
      }
      var hero = holder.querySelector('.sp-hero-track');
      if (hero) this.initSlider(holder);
    },

    hero(holder, s) {
      var slides = (s.slides || []).filter(function (x) { return x.image_url; });
      if (!slides.length) return Promise.resolve();
      var slidesHtml = slides.map(function (sl, i) {
        return '<div class="sp-hero-slide' + (i === 0 ? ' active' : '') + '" style="background-image:url(\'' + SmartPage._esc(sl.image_url) + '\')">' +
          '<div class="sp-hero-overlay"></div>' +
          '<div class="sp-hero-content">' +
          (sl.title ? '<h2>' + SmartPage._esc(sl.title) + '</h2>' : '') +
          (sl.subtitle ? '<p>' + SmartPage._esc(sl.subtitle) + '</p>' : '') +
          (sl.button_text && String(sl.show_button) !== 'hide' ? '<a class="sp-btn" href="' + SmartPage._esc(sl.button_link || '#') + '">' + SmartPage._esc(sl.button_text) + '</a>' : '') +
          '</div></div>';
      }).join('');
      var dots = slides.map(function (_, i) { return '<span class="sp-hero-dot' + (i === 0 ? ' active' : '') + '"></span>'; }).join('');
      holder.insertAdjacentHTML('beforeend',
        '<div class="sp-hero-slider">' +
        '<div class="sp-hero-track">' + slidesHtml + '</div>' +
        (slides.length > 1 ? '<button class="sp-hero-arrow prev" aria-label="السابق"><span class="material-icons-outlined">chevron_right</span></button>' +
          '<button class="sp-hero-arrow next" aria-label="التالي"><span class="material-icons-outlined">chevron_left</span></button>' +
          '<div class="sp-hero-dots">' + dots + '</div>' : '') +
        '</div>');
      return Promise.resolve();
    },

    initSlider(root) {
      var track = root.querySelector('.sp-hero-track');
      var slides = Array.prototype.slice.call(track.children);
      var dots = Array.prototype.slice.call(root.querySelectorAll('.sp-hero-dot'));
      var idx = 0, timer = null;
      if (slides.length < 2) return;
      function go(n) {
        idx = ((n % slides.length) + slides.length) % slides.length;
        track.style.transform = 'translateX(' + (-idx * 100) + '%)';
        dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
      }
      function play() { clearInterval(timer); timer = setInterval(function () { go(idx + 1); }, 4500); }
      var prev = root.querySelector('.sp-hero-arrow.prev');
      var next = root.querySelector('.sp-hero-arrow.next');
      if (prev) prev.addEventListener('click', function () { go(idx - 1); play(); });
      if (next) next.addEventListener('click', function () { go(idx + 1); play(); });
      dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); play(); }); });
      play();
    },

    titleBlock(holder, s) {
      if (!s.title && !s.subtitle) return;
      holder.insertAdjacentHTML('beforeend',
        '<div class="sp-title-block"><h2>' + this._esc(s.title) + '</h2>' +
        (s.subtitle ? '<p>' + this._esc(s.subtitle) + '</p>' : '') + '</div>');
    },

    async fetchProducts(s) {
      var client = this._client();
      var out = [];
      if (!client) return out;
      var count = Number(s.count) || 8;
      try {
        if (s.mode === 'manual') {
          var ids = (s.ids || []).slice(0, 40);
          if (!ids.length) return out;
          var q = client.from('taager_products').select('id,name,price,original_price,image').in('id', ids);
          var r = await q.limit(ids.length);
          if (!r.error) out = r.data || [];
        } else if (s.mode === 'keywords') {
          var kws = String(s.keywords || '').split(',').map(function (k) { return k.trim(); }).filter(Boolean).slice(0, 6);
          var seen = {};
          for (var i = 0; i < kws.length; i++) {
            var kr = await client.from('taager_products').select('id,name,price,original_price,image').ilike('name', '*' + kws[i] + '*').limit(count);
            if (kr.error || !kr.data) continue;
            for (var j = 0; j < kr.data.length; j++) {
              if (!seen[kr.data[j].id]) { seen[kr.data[j].id] = 1; out.push(kr.data[j]); }
            }
            if (out.length >= count) break;
          }
          out = out.slice(0, count);
        } else {
          var tr = await client.from('taager_products').select('id,name,price,original_price,image').limit(Math.min(count * 2, 100));
          if (!tr.error) out = (tr.data || []).slice(0, count);
        }
      } catch (e) { console.warn('[SP] fetchProducts:', e); }
      return out;
    },

    productCard(p) {
      var img = p.image || p.image_url || '';
      var price = Number(p.price) || 0;
      var original = Number(p.original_price) || 0;
      var off = (original > price && price > 0) ? Math.round((1 - price / original) * 100) : 0;
      var priceHtml = off
        ? '<span class="sp-old-price">' + this._price(original) + '</span> ' + this._price(price) + ' <span class="sp-sale-badge">-' + off + '%</span>'
        : this._price(price);
      return '<a class="sp-card" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
        (img ? '<img src="' + this._esc(img) + '" alt="' + this._esc(p.name) + '" loading="lazy" onerror="this.style.display=\'none\'" />' : '<div class="sp-card-img-fallback"><span class="material-icons-outlined">image</span></div>') +
        '<div class="sp-card-body"><div class="sp-card-name">' + this._esc(p.name) + '</div>' +
        '<div class="sp-card-price">' + priceHtml + '</div></div></a>';
    },

    async products(holder, s) {
      var products = await this.fetchProducts(s);
      if (!products.length) return;
      var scroll = s.layout === 'scroll';
      holder.insertAdjacentHTML('beforeend',
        '<div class="sp-products">' +
        '<div class="sp-products-title"><h3>' + this._esc(s.title || 'منتجات') + '</h3>' +
        (s.subtitle ? '<p>' + this._esc(s.subtitle) + '</p>' : '') + '</div>' +
        '<div class="sp-grid' + (scroll ? ' sp-scroll-row' : '') + '">' +
        products.map(function (p) { return SmartPage.productCard(p); }).join('') +
        '</div></div>');
    },

    ad(holder, s) {
      if (!s.image_url) return;
      holder.insertAdjacentHTML('beforeend',
        '<div class="sp-ad" style="background-image:url(\'' + this._esc(s.image_url) + '\')">' +
        '<div class="sp-ad-overlay"></div><div class="sp-ad-content">' +
        (s.title ? '<h3>' + this._esc(s.title) + '</h3>' : '') +
        (s.subtitle ? '<p>' + this._esc(s.subtitle) + '</p>' : '') +
        (s.button_text ? '<a class="sp-btn" href="' + this._esc(s.button_link || '#') + '">' + this._esc(s.button_text) + '</a>' : '') +
        '</div></div>');
    },

    async smartCats(holder, s) {
      var cards = [];
      if (s.source === 'manual') {
        cards = (s.items || []).filter(function (x) { return x && x.title; });
      } else {
        var client = this._client();
        if (client) {
          try {
            var cc = this._country();
            var q = client.from('smart_category_showcase').select('*')
              .eq('is_active', true).order('sort_order', { ascending: true }).limit(50);
            var r = await q.eq('country_code', cc);
            if (!r.error && r.data && r.data.length) cards = r.data;
            if (!cards.length) {
              var r2 = await q.eq('country_code', 'EG');
              if (!r2.error && r2.data) cards = r2.data;
            }
          } catch (e) { console.warn('[SP] smartCats:', e); }
        }
      }
      if (!cards.length) return;
      holder.insertAdjacentHTML('beforeend',
        '<div class="sp-products">' +
        (s.title ? '<div class="sp-products-title"><h3>' + this._esc(s.title) + '</h3></div>' : '') +
        '<div class="sp-smart-cats">' +
        cards.map(function (c) {
          return '<a class="sp-smart-cat-card" href="' + SmartPage._esc(c.link_url || '#') + '" style="background:linear-gradient(135deg,' + SmartPage._esc(c.gradient_from || '#1e2a3a') + ',' + SmartPage._esc(c.gradient_to || '#33404f') + ')">' +
            (c.icon ? '<span class="material-icons-outlined sp-smart-cat-icon">' + SmartPage._esc(c.icon) + '</span>' : (c.image_url ? '<div class="sp-smart-cat-media"><img src="' + SmartPage._esc(c.image_url) + '" loading="lazy" onerror="this.style.display=\'none\'" /></div>' : '')) +
            '<div class="sp-smart-cat-content"><h3>' + SmartPage._esc(c.title) + '</h3>' +
            (c.subtitle ? '<p>' + SmartPage._esc(c.subtitle) + '</p>' : '') +
            '<span class="sp-smart-cat-btn">استكشف الآن <span class="material-icons-outlined" style="font-size:13px">arrow_back</span></span></div></a>';
        }).join('') +
        '</div></div>');
    },

    async showcase(holder, s) {
      var segs = (s.title_segments || []).filter(function (x) { return x && x.text; });
      if (!s.image_url && !segs.length && !(s.buttons || []).filter(function (x) { return x.text; }).length) return;
      var titleHtml = segs.map(function (x) { return '<span style="color:' + SmartPage._esc(x.color || '#ffffff') + '">' + SmartPage._esc(x.text) + '</span>'; }).join(' ');
      var swatches = (s.swatches || []).map(function (x, i) { return '<span class="sp-swatch" style="background:' + SmartPage._esc(x.color || '#f43f5e') + ';z-index:' + (i + 1) + '"></span>'; }).join('');
      var btns = (s.buttons || []).filter(function (x) { return x.text; }).map(function (bt) {
        var cs = bt.color ? ' style="background:' + SmartPage._esc(bt.color) + '"' : '';
        return '<a class="sp-btn"' + cs + ' href="' + SmartPage._esc(bt.link || '#') + '">' + SmartPage._esc(bt.text) + '</a>';
      }).join('');
      var main = await this.fetchProducts({ mode: s.products_mode || 'manual', ids: s.product_ids || [], keywords: s.products_keywords || '', count: Number(s.products_count) || 4 });
      var mini = await this.fetchProducts({ mode: s.mini_mode || 'keywords', ids: s.mini_ids || [], keywords: s.mini_keywords || '', count: Number(s.mini_count) || 3 });
      var row = function (list) {
        if (!list.length) return '';
        return '<div class="sp-showcase-products">' + list.map(function (p) { return SmartPage.productCard(p); }).join('') + '</div>';
      };
      holder.insertAdjacentHTML('beforeend',
        '<div class="sp-showcase" style="background-image:url(\'' + SmartPage._esc(s.image_url || '') + '\')">' +
        '<div class="sp-showcase-overlay" style="background:linear-gradient(180deg,' + SmartPage._esc(s.gradient_from || '#1e2a3a') + ',' + SmartPage._esc(s.gradient_to || '#33404f') + ')"></div>' +
        '<div class="sp-showcase-content">' +
        (segs.length ? '<div class="sp-showcase-title">' + titleHtml + '</div>' : '') +
        (s.subtitle ? '<p class="sp-showcase-sub">' + this._esc(s.subtitle) + '</p>' : '') +
        (swatches ? '<div class="sp-showcase-swatches">' + swatches + '</div>' : '') +
        (btns ? '<div class="sp-showcase-btns">' + btns + '</div>' : '') +
        row(main) + row(mini) +
        '</div></div>');
    },

    async brands(holder, s) {
      var entries = s.brands || [];
      if (!entries.length) return;
      var client = this._client();
      var ids = [], manuals = [];
      entries.forEach(function (x) { if (x && typeof x === 'object') manuals.push(x); else ids.push(x); });
      var rows = [];
      if (client && ids.length) {
        try {
          var r = await client.from('brands').select('id,name,slug,logo_url').in('id', ids);
          if (!r.error && r.data) rows = r.data;
        } catch (e) { console.warn('[SP] brands fetch:', e); }
      }
      var chip = function (name, slug, logo) {
        return '<a class="sp-brand-chip" href="brand-landing.html?slug=' + encodeURIComponent(slug || name) + '">' +
          (logo ? '<img class="sp-brand-logo" src="' + SmartPage._esc(logo) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'" />' : '') +
          SmartPage._esc(name) + '</a>';
      };
      var html = rows.map(function (b) { return chip(b.name, b.slug || b.name, b.logo_url || ''); })
        .concat(manuals.map(function (m) { return chip(m.name || m.slug || '', m.slug || m.name, m.logo_url || ''); })).join('');
      if (!html) return;
      holder.insertAdjacentHTML('beforeend',
        '<div class="sp-products">' +
        (s.title ? '<div class="sp-products-title"><h3>' + this._esc(s.title) + '</h3></div>' : '') +
        '<div class="sp-brands-row">' + html + '</div></div>');
    }
  };

  window.SmartPage = SmartPage;
})();