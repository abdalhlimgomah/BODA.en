/**
 * Carousel Component - Vanilla JS Horizontal Scroll Snap Carousel
 * مطابق لتصميم Noon - يدعم touch/mouse drag، keyboard، scroll snap
 * ============================================================================
 */

class Carousel {
  /**
   * @param {HTMLElement} container - عنصر الكاروسيل الجذر (.cart-slider)
   * @param {Object} options - خيارات التكوين
   * @param {boolean} options.loop - تكرار الكاروسيل (default: false)
   * @param {boolean} options.rtl - اتجاه RTL (default: true)
   * @param {number} options.speed - سرعة التمرير بالمللي ثانية (default: 300)
   * @param {string} options.prevSelector - selector لزر السابق
   * @param {string} options.nextSelector - selector لزر التالي
   * @param {string} options.trackSelector - selector للمسار
   * @param {string} options.itemSelector - selector للكروت
   * @param {Function} options.onSlideChange - دالة عند تغيير الشريحة
   */
  constructor(container, options = {}) {
    if (!container) {
      throw new Error('Carousel container is required');
    }

    this.container = container;
    this.options = {
      loop: options.loop ?? false,
      rtl: options.rtl ?? true,
      speed: options.speed ?? 300,
      prevSelector: options.prevSelector ?? '.cart-slider-nav--prev',
      nextSelector: options.nextSelector ?? '.cart-slider-nav--next',
      trackSelector: options.trackSelector ?? '.cart-slider-track',
      itemSelector: options.itemSelector ?? '.noon-product-card',
      onSlideChange: options.onSlideChange ?? null,
    };

    // عناصر DOM
    this.track = container.querySelector(this.options.trackSelector);
    this.prevBtn = container.querySelector(this.options.prevSelector);
    this.nextBtn = container.querySelector(this.options.nextSelector);

    if (!this.track) {
      console.warn('Carousel track not found');
      return;
    }

    // حالة الكاروسيل
    this.items = Array.from(this.track.querySelectorAll(this.options.itemSelector));
    this.currentIndex = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startTranslateX = 0;
    this.itemWidth = 0;
    this.gap = 0;
    this.maxIndex = 0;
    this.visibleCount = 0;
    this.animationFrameId = null;

    // تهيئة ARIA
    this._setupAria();

    // ربط الأحداث
    this._bindEvents();

    // تحديث الأبعاد
    this.update();

    // إظهار الأسهم إذا لزم الأمر
    this._updateNavVisibility();

    this.initialized = true;
  }

  /**
   * إعداد ARIA للكاروسيل
   * @private
   */
  _setupAria() {
    this.container.setAttribute('role', 'group');
    this.container.setAttribute('aria-roledescription', 'carousel');
    this.container.setAttribute('aria-label', 'منتجات مقترحة');

    this.items.forEach((item, index) => {
      item.setAttribute('role', 'group');
      item.setAttribute('aria-roledescription', 'slide');
      item.setAttribute('aria-label', `منتج ${index + 1} من ${this.items.length}`);
      item.setAttribute('tabindex', '0');
    });

    if (this.prevBtn) {
      this.prevBtn.setAttribute('aria-label', 'السابق');
      this.prevBtn.setAttribute('type', 'button');
    }
    if (this.nextBtn) {
      this.nextBtn.setAttribute('aria-label', 'التالي');
      this.nextBtn.setAttribute('type', 'button');
    }
  }

  /**
   * ربط الأحداث
   * @private
   */
  _bindEvents() {
    // أزرار التنقل
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.prev();
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.next();
      });
    }

    // Keyboard navigation
    this.container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        this.rtl ? this.next() : this.prev();
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        this.rtl ? this.prev() : this.next();
        e.preventDefault();
      }
    });

    // Mouse drag
    this.track.addEventListener('mousedown', (e) => this._onDragStart(e));
    window.addEventListener('mousemove', (e) => this._onDragMove(e));
    window.addEventListener('mouseup', () => this._onDragEnd());

    // Touch drag
    this.track.addEventListener('touchstart', (e) => this._onDragStart(e), { passive: true });
    window.addEventListener('touchmove', (e) => this._onDragMove(e), { passive: false });
    window.addEventListener('touchend', () => this._onDragEnd());

    // Scroll event for nav visibility
    this.track.addEventListener('scroll', () => this._updateNavVisibility());

    // Resize observer
    this.resizeObserver = new ResizeObserver(() => this.update());
    this.resizeObserver.observe(this.track);

    // Focus management
    this.track.addEventListener('focusin', (e) => {
      const item = e.target.closest(this.options.itemSelector);
      if (item) {
        const index = this.items.indexOf(item);
        if (index !== -1) {
          this.goTo(index, { behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    });
  }

  /**
   * بدء السحب
   * @private
   */
  _onDragStart(e) {
    if (this.items.length === 0) return;

    this.isDragging = true;
    this.track.classList.add('dragging');
    this.startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    this.startTranslateX = this.track.scrollLeft;

    // إيقاف أي أنيميشن جارية
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  /**
   * أثناء السحب
   * @private
   */
  _onDragMove(e) {
    if (!this.isDragging) return;

    const currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const deltaX = this.rtl ? this.startX - currentX : currentX - this.startX;

    // منع التمرير الأفقي للصفحة
    if (Math.abs(deltaX) > 5) {
      e.preventDefault();
    }

    const newScrollLeft = this.startTranslateX - deltaX;
    const maxScroll = this.track.scrollWidth - this.track.clientWidth;

    // مقاومة على الحواف
    if (newScrollLeft < 0) {
      this.track.scrollLeft = Math.max(newScrollLeft * 0.3, -50);
    } else if (newScrollLeft > maxScroll) {
      this.track.scrollLeft = Math.min(maxScroll + (newScrollLeft - maxScroll) * 0.3, maxScroll + 50);
    } else {
      this.track.scrollLeft = newScrollLeft;
    }
  }

  /**
   * نهاية السحب
   * @private
   */
  _onDragEnd() {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.track.classList.remove('dragging');

    // Snap لأقرب عنصر
    this._snapToNearest();
  }

  /**
   * Snap لأقرب عنصر
   * @private
   */
  _snapToNearest() {
    if (this.items.length === 0) return;

    const scrollLeft = this.track.scrollLeft;
    let minDistance = Infinity;
    let nearestIndex = 0;

    this.items.forEach((item, index) => {
      const itemCenter = item.offsetLeft + item.offsetWidth / 2;
      const viewportCenter = scrollLeft + this.track.clientWidth / 2;
      const distance = Math.abs(itemCenter - viewportCenter);

      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = index;
      }
    });

    this.goTo(nearestIndex, { behavior: 'smooth' });
  }

  /**
   * تحديث الأبعاد والمتغيرات
   */
  update() {
    if (this.items.length === 0) return;

    const firstItem = this.items[0];
    const style = getComputedStyle(firstItem);

    this.itemWidth = firstItem.offsetWidth;
    this.gap = parseFloat(getComputedStyle(this.track).gap) || 0;
    this.maxIndex = this.items.length - 1;
    this.visibleCount = Math.floor(this.track.clientWidth / (this.itemWidth + this.gap));

    this._updateNavVisibility();
  }

  /**
   * تحديث ظهور أزرار التنقل
   * @private
   */
  _updateNavVisibility() {
    if (!this.prevBtn || !this.nextBtn) return;

    const scrollLeft = this.track.scrollLeft;
    const maxScroll = this.track.scrollWidth - this.track.clientWidth;

    this.prevBtn.style.display = scrollLeft > 2 ? 'flex' : 'none';
    this.nextBtn.style.display = scrollLeft < maxScroll - 2 ? 'flex' : 'none';

    if (this.prevBtn) {
      this.prevBtn.setAttribute('aria-disabled', scrollLeft <= 2);
    }
    if (this.nextBtn) {
      this.nextBtn.setAttribute('aria-disabled', scrollLeft >= maxScroll - 2);
    }
  }

  /**
   * الانتقال للشريحة التالية
   * @param {Object} options - خيارات التمرير
   */
  next(options = {}) {
    if (this.currentIndex < this.maxIndex) {
      this.goTo(this.currentIndex + 1, options);
    } else if (this.options.loop) {
      this.goTo(0, options);
    }
  }

  /**
   * الانتقال للشريحة السابقة
   * @param {Object} options - خيارات التمرير
   */
  prev(options = {}) {
    if (this.currentIndex > 0) {
      this.goTo(this.currentIndex - 1, options);
    } else if (this.options.loop) {
      this.goTo(this.maxIndex, options);
    }
  }

  /**
   * الانتقال لشريحة محددة
   * @param {number} index - فهرس الشريحة
   * @param {Object} options - خيارات التمرير
   */
  goTo(index, options = {}) {
    if (index < 0 || index >= this.items.length) return;

    this.currentIndex = Math.max(0, Math.min(index, this.maxIndex));

    const item = this.items[this.currentIndex];
    const behavior = options.behavior ?? 'smooth';

    // Scroll to item
    if (this.rtl) {
      // في RTL، نحسب الموضع من اليمين
      const trackWidth = this.track.scrollWidth;
      const itemRight = item.offsetLeft + item.offsetWidth;
      const scrollLeft = trackWidth - itemRight;

      this.track.scrollTo({
        left: scrollLeft,
        behavior,
      });
    } else {
      this.track.scrollTo({
        left: item.offsetLeft,
        behavior,
      });
    }

    // Trigger callback
    if (this.options.onSlideChange) {
      this.options.onSlideChange(this.currentIndex, this.items[this.currentIndex]);
    }

    // Update ARIA
    this._updateAriaLive();
  }

  /**
   * تحديث aria-live للإعلان عن التغيير
   * @private
   */
  _updateAriaLive() {
    const liveRegion = this.container.querySelector('[aria-live]');
    if (liveRegion) {
      liveRegion.textContent = `منتج ${this.currentIndex + 1} من ${this.items.length}`;
    }
  }

  /**
   * الحصول على الفهرس الحالي
   * @returns {number}
   */
  getCurrentIndex() {
    return this.currentIndex;
  }

  /**
   * الحصول على عدد العناصر
   * @returns {number}
   */
  getLength() {
    return this.items.length;
  }

  /**
   * إعادة تهيئة الكاروسيل (عند إضافة/إزالة عناصر)
   */
  refresh() {
    this.items = Array.from(this.track.querySelectorAll(this.options.itemSelector));
    this.maxIndex = this.items.length - 1;

    // تحديث ARIA للعناصر الجديدة
    this.items.forEach((item, index) => {
      if (!item.hasAttribute('aria-roledescription')) {
        item.setAttribute('role', 'group');
        item.setAttribute('aria-roledescription', 'slide');
        item.setAttribute('aria-label', `منتج ${index + 1} من ${this.items.length}`);
        item.setAttribute('tabindex', '0');
      }
    });

    this.update();
  }

  /**
   * تنظيف الموارد
   */
  destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // إزالة event listeners
    if (this.prevBtn) {
      this.prevBtn.replaceWith(this.prevBtn.cloneNode(true));
    }
    if (this.nextBtn) {
      this.nextBtn.replaceWith(this.nextBtn.cloneNode(true));
    }
    this.track.replaceWith(this.track.cloneNode(true));

    this.initialized = false;
  }
}

// Auto-initialize carousels
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.cart-slider').forEach((container) => {
    if (!container.dataset.carouselInitialized) {
      new Carousel(container);
      container.dataset.carouselInitialized = 'true';
    }
  });
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Carousel;
}