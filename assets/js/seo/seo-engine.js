(function (global) {
  "use strict";

  var SEOEngine = {};

  SEOEngine.init = function () {
    if (global._seoEngineInitialized) return;
    global._seoEngineInitialized = true;

    var U = global.SEOUtils;
    var Schema = global.SchemaGenerator;

    Schema.injectAllBase();

    var path = U.getCurrentPath();
    var isProductPage = path.indexOf("product.html") !== -1;
    var isCategoryPage = path.indexOf("category-landing.html") !== -1;
    var isBrandPage = path.indexOf("brand-landing.html") !== -1;
    var isSectionPage = path.indexOf("section.html") !== -1;
    var isHomePage = path === "/" || path === "/index.html" || path.indexOf("home.html") !== -1;
    var isSearchPage = path.indexOf("search.html") !== -1;
    var isBlogPage = path.indexOf("blog") !== -1 || path.indexOf("knowledge-center") !== -1 || path.indexOf("guide.html") !== -1 || path.indexOf("comparison.html") !== -1;
    var isAuthPage = path.indexOf("signin") !== -1 || path.indexOf("signup") !== -1;
    var isCheckoutPage = path.indexOf("checkout") !== -1 || path.indexOf("empty-cart") !== -1;
    var isAccountPage = path.indexOf("ahsab") !== -1 || path.indexOf("my-orders") !== -1 || path.indexOf("edit-account") !== -1;

    if (isAuthPage || isCheckoutPage || isAccountPage) {
      U.setNoIndex();
    }

    if (isHomePage && global.MetaGenerator) {
      global.MetaGenerator.forHomePage();
      return;
    }

    if (isSearchPage) {
      var searchQuery = U.getQueryParam("q") || U.getQueryParam("search") || "";
      if (searchQuery) {
        global.MetaGenerator.forStaticPage({
          title: "بحث: " + searchQuery + " | Buda",
          description: "نتائج البحث عن " + searchQuery + " في Buda. تصفح المنتجات المتاحة.",
          keywords: searchQuery + ", بحث, Buda",
          noindex: true,
        });
      } else {
        global.MetaGenerator.forStaticPage({
          title: "بحث - Buda",
          description: "ابحث عن منتجاتك المفضلة في Buda. آلاف المنتجات من علامات تجارية مختلفة.",
        });
      }
      return;
    }

    if (isProductPage && global.MetaGenerator) {
      var id = U.getQueryParam("id");
      if (id && global.BudaStore) {
        var product = global.BudaStore.getProductById(id);
        if (product) {
          global.MetaGenerator.forProductPage(product);
          if (global.SchemaGenerator) {
            global.SchemaGenerator.injectProduct(product);
          }
        }
      }
      return;
    }

    if (isCategoryPage && global.MetaGenerator) {
      var catSlug = U.getQueryParam("cat");
      if (catSlug && global.MetaGenerator) {
        global.MetaGenerator.forCategoryPage({ slug: catSlug, name: catSlug });
      }
      return;
    }

    if (isBrandPage && global.MetaGenerator) {
      var brandSlug = U.getQueryParam("brand");
      if (brandSlug) {
        global.MetaGenerator.forBrandPage({ slug: brandSlug, name: brandSlug });
      }
      return;
    }

    if (isSectionPage && global.MetaGenerator) {
      var sectionTitle = U.getQueryParam("title") || "قسم";
      global.MetaGenerator.forSectionPage({ title: decodeURIComponent(sectionTitle) });
      return;
    }

    if (!isProductPage && !isHomePage && global.MetaGenerator) {
      var pageTitle = document.title || "Buda";
      global.MetaGenerator.forStaticPage({
        title: pageTitle,
        description: "",
        canonical: false,
      });
    }
  };

  SEOEngine.initOnReady = function () {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", SEOEngine.init);
    } else {
      SEOEngine.init();
    }
  };

  SEOEngine.waitForProduct = function (product) {
    if (!product) return;
    if (global.MetaGenerator) {
      global.MetaGenerator.forProductPage(product);
    }
    if (global.SchemaGenerator) {
      global.SchemaGenerator.injectProduct(product);
      if (product.brand) {
        global.SchemaGenerator.injectBrand({ name: product.brand });
      }
    }
  };

  SEOEngine.waitForCategory = function (category) {
    if (!category) return;
    if (global.MetaGenerator) {
      global.MetaGenerator.forCategoryPage(category);
    }
  };

  SEOEngine.waitForBrand = function (brand) {
    if (!brand) return;
    if (global.MetaGenerator) {
      global.MetaGenerator.forBrandPage(brand);
    }
    if (global.SchemaGenerator) {
      global.SchemaGenerator.injectBrand(brand);
    }
  };

  SEOEngine.waitForArticle = function (article) {
    if (!article) return;
    if (global.MetaGenerator) {
      global.MetaGenerator.forArticlePage({
        title: article.meta_title || article.title,
        description: article.meta_description || article.excerpt,
        image: article.featured_image,
        url: window.location.href,
      });
    }
    if (global.SchemaGenerator) {
      global.SchemaGenerator.injectArticle(article);
    }
  };

  SEOEngine.waitForGuide = function (guide) {
    if (!guide) return;
    if (global.MetaGenerator) {
      global.MetaGenerator.forStaticPage({
        title: guide.meta_title || guide.title + " | دليل | Buda",
        description: guide.meta_description || guide.subtitle || "",
        image: guide.image || "",
      });
    }
  };

  SEOEngine.waitForComparison = function (comparison) {
    if (!comparison) return;
    if (global.MetaGenerator) {
      global.MetaGenerator.forStaticPage({
        title: comparison.meta_title || comparison.title + " | مقارنة | Buda",
        description: comparison.meta_description || comparison.subtitle || "",
        image: comparison.image || "",
      });
    }
  };

  global.SEOEngine = SEOEngine;
})(window);
