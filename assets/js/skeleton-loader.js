/**
 * Skeleton Loader Module
 * Controls skeleton display based on data loading states
 * Features:
 * - Professional Noon-style shimmer placeholders
 * - Automatic page-level skeletons for content-heavy pages
 * - Manual control for specific sections
 * - Smooth transitions between skeleton and content
 */

const SKELETON_CONFIG = {
  animationDuration: 1.5,
  cacheDuration: 45000,
  enabled: true,
  skeletonClass: 'skeleton',
  loadedClass: 'skeleton-loaded',
  skeletonSelector: '[data-skeleton-container]',
  performanceThreshold: 500,
};

class SkeletonLoader {
  constructor() {
    this.cache = new Map();
    this.observers = [];
    this.animationDisabled = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.init();
  }

  init() {
    if (!SKELETON_CONFIG.enabled) return;

    this.initSkeletons();
    this.setupMutationObserver();

    const needsPageSkeleton = Boolean(
      document.querySelector(
        '[data-skeleton-container], #productsGrid, #search-results, #wishlist-items, .products-main, .app-main, .page-hero, #home-search, #for-you-products, #product-gallery, .checkout-shell, .orders-shell, .account-shell'
      )
    );

    if (needsPageSkeleton) {
      this.showSkeleton(document.body, { type: 'page', autoHide: true, timeout: 2600 });
    }

    window.addEventListener('load', () => {
      this.hideSkeleton(document.body);
    });

    console.log('[SkeletonLoader] initialized');
  }

  cacheKey(url, method = 'GET') {
    return `${method}:${url}`;
  }

  isCacheValid(key) {
    const cached = this.cache.get(key);
    if (!cached) return false;
    const now = Date.now();
    return now - cached.timestamp < cached.duration;
  }

  buildSkeletonMarkup(container, options = {}) {
    const type = options.type || container.getAttribute('data-skeleton-type') || '';
    const isProductGrid = type === 'products-grid' || container.id === 'productsGrid' || container.id === 'search-results';
    const isProductDetail = type === 'product-detail' || container.id === 'product-gallery' || container.classList.contains('product-detail');

    if (isProductDetail) {
      return `
        <div class="skeleton-page-section">
          <div class="skeleton-page-grid skeleton-page-grid--detail">
            <div class="skeleton-page-card skeleton-product-card">
              <div class="skeleton skeleton-product-main-image"></div>
              <div class="skeleton skeleton-product-title-long"></div>
              <div class="skeleton skeleton-product-price-large"></div>
              <div class="skeleton skeleton-action-btn"></div>
            </div>
          </div>
        </div>`;
    }

    if (isProductGrid) {
      return `
        <div class="skeleton-page-section">
          <div class="skeleton-page-row">
            ${Array.from({ length: 6 }, () => `
              <div class="skeleton-page-card skeleton-product-card">
                <div class="skeleton skeleton-product-image"></div>
                <div class="skeleton skeleton-product-title"></div>
                <div class="skeleton skeleton-product-rating"></div>
                <div class="skeleton-product-price-line">
                  <div class="skeleton skeleton-product-price"></div>
                  <div class="skeleton skeleton-product-old-price"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;
    }

    return `
      <div class="skeleton-page-section">
        <div class="skeleton skeleton-banner"></div>
      </div>
      <div class="skeleton-page-section">
        <div class="skeleton skeleton-section-header"></div>
        <div class="skeleton-category-scroll-container">
          ${Array.from({ length: 8 }, () => `
            <div class="skeleton-category-scroll-item">
              <div class="skeleton skeleton-cat-circle"></div>
              <div class="skeleton skeleton-cat-label"></div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="skeleton-page-section">
        <div class="skeleton-page-row">
          ${Array.from({ length: 4 }, () => `
            <div class="skeleton-page-card skeleton-product-card">
              <div class="skeleton skeleton-product-image"></div>
              <div class="skeleton skeleton-product-title"></div>
              <div class="skeleton skeleton-product-rating"></div>
              <div class="skeleton-product-price-line">
                <div class="skeleton skeleton-product-price"></div>
                <div class="skeleton skeleton-product-old-price"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  showSkeleton(container, options = {}) {
    if (!container || !SKELETON_CONFIG.enabled || this.animationDisabled || container.hasAttribute('data-no-skeleton')) {
      return false;
    }

    const existing = container.querySelector('.skeleton-page-shell');
    if (existing) {
      existing.remove();
    }

    const shell = document.createElement('div');
    shell.className = 'skeleton-page-shell';
    shell.innerHTML = this.buildSkeletonMarkup(container, options);
    shell.setAttribute('aria-hidden', 'true');

    container.prepend(shell);

    requestAnimationFrame(() => {
      shell.classList.add('is-visible');
    });

    if (options.autoHide !== false) {
      const timeout = Number(options.timeout) || 2600;
      const timer = window.setTimeout(() => {
        this.hideSkeleton(container);
      }, timeout);
      container.dataset.skeletonTimer = String(timer);
    }

    return true;
  }

  hideSkeleton(container) {
    if (!container || !SKELETON_CONFIG.enabled) return;

    const timer = Number(container.dataset.skeletonTimer || 0);
    if (timer) {
      window.clearTimeout(timer);
    }

    const shell = container.querySelector('.skeleton-page-shell');
    if (!shell) return;

    shell.classList.remove('is-visible');
    shell.classList.add('is-hiding');

    window.setTimeout(() => {
      shell.remove();
      container.classList.remove(SKELETON_CONFIG.loadedClass);
    }, 220);
  }

  async apiCall(url, options = {}) {
    const method = options.method || 'GET';
    const key = this.cacheKey(url, method);

    if (this.isCacheValid(key) && !options.forceRefresh) {
      const cached = this.cache.get(key);
      return cached.data;
    }

    let skeletonContainer = null;
    if (options.showSkeleton && options.containerSelector) {
      skeletonContainer = document.querySelector(options.containerSelector);
      if (skeletonContainer) {
        this.showSkeleton(skeletonContainer, { type: options.type || 'products-grid', autoHide: true, timeout: 2600 });
      }
    }

    try {
      const startTime = Date.now();
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      this.cache.set(key, { data, timestamp: Date.now(), duration });

      if (skeletonContainer) {
        const delay = duration >= SKELETON_CONFIG.performanceThreshold ? 0 : 80;
        window.setTimeout(() => this.hideSkeleton(skeletonContainer), delay);
      }

      return data;
    } catch (error) {
      console.error('[SkeletonLoader] API call failed:', error);
      if (skeletonContainer) {
        this.hideSkeleton(skeletonContainer);
      }
      throw error;
    }
  }

  initSkeletons() {
    const sections = document.querySelectorAll(SKELETON_CONFIG.skeletonSelector);

    sections.forEach((section) => {
      section.setAttribute('data-skeleton-enabled', 'true');
      this.showSkeleton(section, {
        type: section.getAttribute('data-skeleton-type') || 'section',
        autoHide: false,
      });

      const observer = new MutationObserver((mutations) => {
        const shouldHide = mutations.some((mutation) => {
          if (mutation.type !== 'childList' || !mutation.addedNodes.length) return false;
          return Array.from(mutation.addedNodes).some((node) => {
            if (!(node instanceof HTMLElement)) return false;
            return Boolean(
              node.classList?.contains('noon-product-card') ||
              node.textContent?.trim().length > 20 ||
              node.querySelector('.noon-product-card, .product-card, .search-row')
            );
          });
        });

        if (shouldHide) {
          this.hideSkeleton(section);
        }
      });

      observer.observe(section, { childList: true, subtree: true });
      this.observers.push(observer);
    });
  }

  setupMutationObserver() {
    const bodyObserver = new MutationObserver((mutations) => {
      const shouldHide = mutations.some((mutation) => {
        if (mutation.type !== 'childList' || !mutation.addedNodes.length) return false;
        return Array.from(mutation.addedNodes).some((node) => {
          if (!(node instanceof HTMLElement)) return false;
          return Boolean(
            node.classList?.contains('noon-grid') ||
            node.classList?.contains('home-category-scroll') ||
            node.classList?.contains('search-results-grid') ||
            node.querySelector('.noon-product-card, .product-card, .search-row, .section-block') ||
            node.textContent?.trim().length > 20
          );
        });
      });

      if (shouldHide) {
        this.hideSkeleton(document.body);
      }
    });

    if (document.body) {
      bodyObserver.observe(document.body, { childList: true, subtree: true });
      this.observers.push(bodyObserver);
    }
  }

  showSectionSkeleton(sectionId, options = {}) {
    const container = document.getElementById(sectionId);
    if (!container) {
      console.warn(`[SkeletonLoader] Section ${sectionId} not found`);
      return false;
    }
    return this.showSkeleton(container, options);
  }

  hideSectionSkeleton(sectionId) {
    const container = document.getElementById(sectionId);
    if (!container) {
      console.warn(`[SkeletonLoader] Section ${sectionId} not found`);
      return false;
    }
    this.hideSkeleton(container);
    return true;
  }

  toggleSkeleton(element, show) {
    if (show) {
      this.showSkeleton(element);
    } else {
      this.hideSkeleton(element);
    }
  }

  configure(options) {
    Object.assign(SKELETON_CONFIG, options);
  }

  destroy() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.cache.clear();
    console.log('[SkeletonLoader] destroyed');
  }

  getCacheStatus() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

window.SkeletonLoader = SkeletonLoader;
window.skeletonLoader = new SkeletonLoader();
window.showSkeleton = function (sectionId) {
  return window.skeletonLoader.showSectionSkeleton(sectionId);
};
window.hideSkeleton = function (sectionId) {
  return window.skeletonLoader.hideSectionSkeleton(sectionId);
};