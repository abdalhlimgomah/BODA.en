/* ============================================================
   ??????? ?????? � ???? ????? ??????? ?????? ??? ??????
   ??????? category-landing.html ? brand-landing.html
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
      return n.toLocaleString('ar-EG') + ' ?.?';
    },

    // ????? true ??? ????? ???? ???? (???? false ????? ?????? ?????? ??????)
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
          else if (b.block_type === 'custom_cards') this.customCards(holder, b.settings || {});
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
        var mobBg = sl.mobile_image_url ? '<div class="sp-hero-bg sp-hero-bg-m" style="background-image:url(\'' + SmartPage._esc(sl.mobile_image_url) + '\')"></div>' : '';
        return '<div class="sp-hero-slide' + (i === 0 ? ' active' : '') + '">' +
          '<div class="sp-hero-bg sp-hero-bg-d" style="background-image:url(\'' + SmartPage._esc(sl.image_url) + '\')"></div>' +
          mobBg +
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
        (slides.length > 1 ? '<button class="sp-hero-arrow prev" aria-label="??????"><span class="material-icons-outlined">chevron_right</span></button>' +
          '<button class="sp-hero-arrow next" aria-label="??????"><span class="material-icons-outlined">chevron_left</span></button>' +
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
      var rtl = (document.documentElement.getAttribute('dir') || '').toLowerCase() === 'rtl';
      var sign = rtl ? 1 : -1;
      function go(n) {
        idx = ((n % slides.length) + slides.length) % slides.length;
        track.style.transform = 'translateX(' + (sign * idx * 100) + '%)';
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
      var id = String(p.id);
      var img = p.image || p.image_url || '';
      var name = p.name || 'منتج';
      var price = Number(p.price) || 0;
      var original = Number(p.original_price) || 0;
      var cur = price, orig = original > price ? original : 0;
      try {
        if (window.BudaStore && window.BudaStore.resolveProductPrice) {
          var r2 = window.BudaStore.resolveProductPrice(p);
          var c2 = Number(r2.currentPrice);
          if (c2 > 0) {
            cur = c2;
            orig = Number(r2.originalPrice) > c2 ? Number(r2.originalPrice) : 0;
          }
        }
      } catch (e) { }
      var off = orig > cur && cur > 0 ? Math.round(((orig - cur) / orig) * 100) : 0;
      function money(v) {
        try { if (window.BudaStore && window.BudaStore.formatMoney) return window.BudaStore.formatMoney(v); } catch (e) { }
        return SmartPage._price(v);
      }
      var isWish = false;
      try { isWish = !!(window.BudaStore && window.BudaStore.isInWishlist && window.BudaStore.isInWishlist(id)); } catch (e) { }
      var instMonths = Math.min(24, Math.max(3, Number(p.installment_months) || 12));
      return '<article class="noon-product-card" data-view-product="' + SmartPage._esc(id) + '">' +
        '<div class="noon-product-media-wrap">' +
        (off > 10 ? '<span class="buda-badge">-' + off + '%</span>' : '') +
        '<button class="icon-btn noon-wishlist-btn' + (isWish ? ' is-active' : '') + '" data-wishlist="' + SmartPage._esc(id) + '" aria-label="إضافة إلى المفضلة" aria-pressed="' + (isWish ? 'true' : 'false') + '">' +
        '<span class="material-icons-outlined" style="font-size:18px;">' + (isWish ? 'favorite' : 'favorite_border') + '</span></button>' +
        '<div class="noon-product-media">' +
        (img ? '<img class="noon-gallery-img active loaded" src="' + SmartPage._esc(img) + '" alt="' + SmartPage._esc(name) + '" loading="lazy" onerror="this.style.display=\'none\'" />' : '') +
        '</div>' +
        '<button class="noon-add-square" data-add-to-cart="' + SmartPage._esc(id) + '" aria-label="إضافة إلى السلة">+</button>' +
        '</div>' +
        '<div class="noon-product-body">' +
        '<h4 class="noon-title">' + SmartPage._esc(name) + '</h4>' +
        '<div class="noon-price-line"><span class="noon-price">' + money(cur) + '</span>' +
        (off ? '<span class="noon-price-compare"><span class="noon-old-price">' + money(orig) + '</span><span class="noon-discount-pill">' + off + '%</span></span>' : '') +
        '</div>' +
        '<div class="noon-installment" data-months="' + instMonths + '"><span class="material-icons-outlined">bolt</span><span class="noon-install-text">' + money(cur / instMonths) + ' / شهر</span></div>' +
        '</div></article>';
    },

    _wireNoonCards(section, byId) {
      if (!section || section.getAttribute('data-noon-wired')) return;
      section.setAttribute('data-noon-wired', '1');
      section.addEventListener('click', function (ev) {
        var t = ev.target;
        var addBtn = t.closest('[data-add-to-cart]');
        if (addBtn) {
          ev.preventDefault();
          var p = byId[addBtn.getAttribute('data-add-to-cart')];
          if (window.BudaStore && window.BudaStore.addToCart && p) {
            try {
              window.BudaStore.addToCart(p, 1);
              window.BudaStore.updateCartCount();
              if (window.BudaUI && window.BudaUI.refreshShell) window.BudaUI.refreshShell();
            } catch (e) { console.warn('[SP] addToCart:', e); }
          }
          return;
        }
        var wBtn = t.closest('[data-wishlist]');
        if (wBtn) {
          ev.preventDefault();
          if (!(window.BudaStore && window.BudaStore.toggleWishlist)) return;
          var active = false;
          try { active = !!window.BudaStore.toggleWishlist(wBtn.getAttribute('data-wishlist')); } catch (e) { }
          wBtn.classList.toggle('is-active', active);
          wBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
          var ic = wBtn.querySelector('.material-icons-outlined');
          if (ic) ic.textContent = active ? 'favorite' : 'favorite_border';
          return;
        }
        var card = t.closest('.noon-product-card');
        if (!card) return;
        var vid = card.getAttribute('data-view-product');
        if (!vid) return;
        var prod = byId[vid];
        if (prod) {
          try { sessionStorage.setItem('selectedProduct', encodeURIComponent(JSON.stringify(prod))); } catch (e) { }
        }
        window.location.href = 'product.html?id=' + encodeURIComponent(vid);
      });
    },

    async products(holder, s) {
      var products = await this.fetchProducts(s);
      if (!products.length) return;
      var byId = {};
      products.forEach(function (p) { byId[String(p.id)] = p; });
      var scroll = s.layout === 'scroll';
      holder.insertAdjacentHTML('beforeend',
        '<div class="sp-products">' +
        '<div class="sp-products-title"><h3>' + this._esc(s.title || 'منتجات') + '</h3>' +
        (s.subtitle ? '<p>' + this._esc(s.subtitle) + '</p>' : '') + '</div>' +
        '<div class="sp-grid' + (scroll ? ' sp-scroll-row' : '') + '">' +
        products.map(function (p) { return SmartPage.productCard(p); }).join('') +
        '</div></div>');
      this._wireNoonCards(holder.lastElementChild, byId);
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
            var loadCats = function (country) {
              return client.from('smart_category_showcase').select('*')
                .eq('is_active', true).eq('country_code', country)
                .order('sort_order', { ascending: true }).limit(50);
            };
            var r = await loadCats(cc);
            if (!r.error && r.data && r.data.length) cards = r.data;
            if (!cards.length && cc !== 'EG') {
              var r2 = await loadCats('EG');
              if (!r2.error && r2.data) cards = r2.data;
            }
          } catch (e) { console.warn('[SP] smartCats:', e); }
        }
      }
      if (!cards.length) return;
      var heights = { small: 150, medium: 190, large: 280 };
      var H = s.size === 'custom' && s.height != null && s.height !== '' ? (Number(s.height) || 190) : (heights[s.size] || 190);
      var radius = s.radius != null && s.radius !== '' ? Number(s.radius) : 16;
      var gap = s.gap != null && s.gap !== '' ? Number(s.gap) : 12;
      var cols = [2, 3, 4].indexOf(Number(s.cols)) > -1 ? Number(s.cols) : 2;
      var isGrid = s.layout === 'grid';
      var wrapCls = 'sp-smart-cats' + (isGrid ? ' sp-cats-grid' : '') +
        (String(s.zoom) !== 'off' ? ' sp-cat-zoom' : '') +
        (s.shadow === 'on' ? ' sp-cat-shadow' : '');
      var wrapStyle = '--sp-cat-h:' + H + 'px;--sp-cat-radius:' + radius + 'px;--sp-cat-gap:' + gap + 'px;' +
        (isGrid ? '--cols:' + cols + ';' : '') +
        (/^#[0-9a-f]{3,8}$/i.test(s.bg || '') ? 'background:' + s.bg + ';' : '');
      var posCls = s.text_pos === 'center' ? ' sp-pos-center' : (s.text_pos === 'top' ? ' sp-pos-top' : '');
      var ovNum = Math.min(Math.max(Number(s.overlay) || 0, 0), 90);
      var btnText = this._esc(s.btn_text || 'استكشف الآن');
      var titleStyle = /^#[0-9a-f]{3,8}$/i.test(s.title_color || '') ? ' style="color:' + this._esc(s.title_color) + '"' : '';
      holder.insertAdjacentHTML('beforeend',
        '<div class="sp-products">' +
        (s.title ? '<div class="sp-products-title"><h3' + titleStyle + '>' + this._esc(s.title) + '</h3>' +
          (s.subtitle ? '<p class="sp-products-sub">' + this._esc(s.subtitle) + '</p>' : '') + '</div>' : '') +
        '<div class="' + wrapCls + '" style="' + wrapStyle + '">' +
        cards.map(function (c) {
          var hasText = c.title || c.subtitle;
          return '<a class="sp-smart-cat-card' + posCls + '" href="' + SmartPage._esc(c.link_url || '#') + '" style="background:linear-gradient(135deg,' + SmartPage._esc(c.gradient_from || '#1e2a3a') + ',' + SmartPage._esc(c.gradient_to || '#33404f') + ')">' +
            (c.icon ? '<span class="material-icons-outlined sp-smart-cat-icon">' + SmartPage._esc(c.icon) + '</span>' : (c.image_url ? '<div class="sp-smart-cat-media"><img src="' + SmartPage._esc(c.image_url) + '" loading="lazy" onerror="this.style.display=\'none\'" /></div>' : '')) +
            (ovNum > 0 ? '<div class="sp-smart-cat-overlay" style="opacity:' + (ovNum / 100) + '"></div>' : '') +
            (hasText ? '<div class="sp-smart-cat-content">' +
              (c.title ? '<h3>' + SmartPage._esc(c.title) + '</h3>' : '') +
              (c.subtitle ? '<p>' + SmartPage._esc(c.subtitle) + '</p>' : '') +
              (String(s.show_btn) !== 'hide' ? '<span class="sp-smart-cat-btn">' + btnText + ' <span class="material-icons-outlined" style="font-size:13px">arrow_back</span></span>' : '') +
              '</div>' : '') +
            '</a>';
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

    customCards(holder, s) {
      var banners = (s.banners || []).filter(function (x) { return x && x.image_url; });
      var items = (s.items || []).filter(function (x) { return x && (x.image_url || x.title); });
      if (!banners.length && !items.length && !s.title) return;
      var grad = 'linear-gradient(' + (Number(s.gradient_angle) || 180) + 'deg,' + SmartPage._esc(s.gradient_from || '#0ea5e9') + ',' + SmartPage._esc(s.gradient_to || '#6d28d9') + ')';
      var boxRadius = (Number(s.radius) || 18) + 8;
      var mcols = ['1', '2', '3'].indexOf(String(s.mobile_cols)) > -1 ? String(s.mobile_cols) : '';
      var gapv = s.gap != null && s.gap !== '' ? Number(s.gap) : '';
      var nameSize = s.name_size != null && s.name_size !== '' ? Number(s.name_size) : '';
      var showHint = String(s.show_hint) !== 'hide';
      var cardBg = /^#[0-9a-f]{3,8}$/i.test(s.card_bg || '') ? 'background:' + s.card_bg + ';' : '';
      var titleColorStyle = /^#[0-9a-f]{3,8}$/i.test(s.title_color || '') ? ' style="color:' + SmartPage._esc(s.title_color) + '"' : '';
      var bannerHtml = '';
      if (banners.length) {
        var slidesHtml = banners.map(function (bn) {
          return '<div class="sp-cust-bn-slide" style="background-image:url(\'' + SmartPage._esc(bn.image_url) + '\')"></div>';
        }).join('');
        var dots = banners.map(function (_, i) { return '<span class="sp-cust-bn-dot' + (i === 0 ? ' active' : '') + '"></span>'; }).join('');
        bannerHtml = '<div class="sp-cust-banner h-' + SmartPage._esc(s.banner_height || 'thin') + '">' +
          '<div class="sp-cust-bn-track">' + slidesHtml + '</div>' +
          (banners.length > 1 ? '<button class="sp-cust-bn-arrow prev" aria-label="السابق"><span class="material-icons-outlined">chevron_right</span></button>' +
            '<button class="sp-cust-bn-arrow next" aria-label="التالي"><span class="material-icons-outlined">chevron_left</span></button>' +
            '<div class="sp-cust-bn-dots">' + dots + '</div>' : '') +
          '</div>';
      }
      var cardsHtml = items.map(function (it) {
        var href = it.link ? SmartPage._esc(it.link) : ('search.html?q=' + encodeURIComponent(it.keywords || ''));
        var hint = s.hint_text || (it.link ? 'زيارة الصفحة' : 'شوف المنتجات');
        return '<a class="sp-cust-card" style="border-radius:' + (Number(s.radius) || 18) + 'px;' + cardBg + '" href="' + href + '">' +
          '<div class="sp-cust-media" style="aspect-ratio:' + SmartPage._esc(s.ratio || '1/1') + ';background:' + grad + '">' +
          (it.image_url ? '<img src="' + SmartPage._esc(it.image_url) + '" alt="' + SmartPage._esc(it.title || '') + '" loading="lazy" />' : '') +
          '</div>' +
          (it.title ? '<div class="sp-cust-body"><h4>' + SmartPage._esc(it.title) + '</h4>' +
            (showHint ? '<span class="sp-cust-hint">' + SmartPage._esc(hint) + ' <span class="material-icons-outlined">arrow_back</span></span>' : '') + '</div>' : '') +
          '</a>';
      }).join('');
      holder.insertAdjacentHTML('beforeend',
        '<div class="sp-products">' +
        bannerHtml +
        (s.title ? '<div class="sp-products-title"><h3' + titleColorStyle + '>' + this._esc(s.title) + '</h3>' +
          (s.subtitle ? '<p class="sp-products-sub">' + this._esc(s.subtitle) + '</p>' : '') + '</div>' : '') +
        '<div class="sp-cust-box" style="background:' + grad + ';border-radius:' + boxRadius + 'px">' +
        '<div class="sp-cust-grid' + (s.zoom === 'off' ? ' no-zoom' : '') + '" style="--cols:' + (Number(s.columns) || 3) + ';' +
        (mcols ? '--mcols:' + mcols + ';' : '') +
        (gapv !== '' ? '--cust-gap:' + gapv + 'px;' : '') +
        (nameSize !== '' ? '--cust-name:' + nameSize + 'px;' : '') +
        '">' +
        cardsHtml +
        '</div></div></div>');
      if (banners.length > 1) this.initCustSlider(holder);
    },

    initCustSlider(holder) {
      var rtl = (document.documentElement.getAttribute('dir') || '').toLowerCase() === 'rtl';
      var sign = rtl ? 1 : -1;
      Array.prototype.forEach.call(holder.querySelectorAll('.sp-cust-banner'), function (root) {
        if (root.getAttribute('data-sp-init')) return;
        var slides = root.querySelectorAll('.sp-cust-bn-slide');
        if (!root.querySelector('.sp-cust-bn-track') || slides.length < 2) return;
        root.setAttribute('data-sp-init', '1');
        var track = root.querySelector('.sp-cust-bn-track');
        var dots = Array.prototype.slice.call(root.querySelectorAll('.sp-cust-bn-dot'));
        var idx = 0, timer = null;
        function go(n) {
          idx = ((n % slides.length) + slides.length) % slides.length;
          track.style.transform = 'translateX(' + (sign * idx * 100) + '%)';
          dots.forEach(function (d, i) { d.classList.toggle('active', i === idx); });
        }
        function play() { clearInterval(timer); timer = setInterval(function () { go(idx + 1); }, 4500); }
        var prev = root.querySelector('.sp-cust-bn-arrow.prev');
        var next = root.querySelector('.sp-cust-bn-arrow.next');
        if (prev) prev.addEventListener('click', function () { go(idx - 1); play(); });
        if (next) next.addEventListener('click', function () { go(idx + 1); play(); });
        dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); play(); }); });
        play();
      });
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
        var initial = (name || '?').trim().charAt(0);
        return '<a class="sp-brand-card" href="brand-landing.html?slug=' + encodeURIComponent(slug || name) + '" title="' + SmartPage._esc(name) + '">' +
          (logo ? '<img src="' + SmartPage._esc(logo) + '" alt="' + SmartPage._esc(name) + '" loading="lazy" onerror="this.remove()" onload="var f=this.nextElementSibling; if(f&&f.classList.contains(\'sp-brand-fallback\')) f.remove();" />' : '') +
          '<span class="sp-brand-fallback">' + SmartPage._esc(initial) + '</span>' +
          '</a>';
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