(function (global) {
  "use strict";

  var ImageSEO = {};

  ImageSEO.init = function () {
    ImageSEO.processAllImages();
    ImageSEO.setupLazyLoading();
  };

  ImageSEO.processAllImages = function () {
    var images = document.querySelectorAll("img:not([data-seo-processed])");
    images.forEach(function (img) {
      ImageSEO.processImage(img);
    });
  };

  ImageSEO.processImage = function (img) {
    if (img.dataset.seoProcessed) return;
    img.dataset.seoProcessed = "true";

    var alt = img.getAttribute("alt");
    var src = img.getAttribute("src") || "";

    // Auto-generate alt text if missing
    if (!alt || alt.trim() === "") {
      alt = ImageSEO.generateAlt(img);
      img.setAttribute("alt", alt);
    }

    // Set title from alt if missing
    if (!img.getAttribute("title")) {
      img.setAttribute("title", alt);
    }

    // Add lazy loading
    if (!img.hasAttribute("loading")) {
      var isAboveFold = ImageSEO.isAboveFold(img);
      if (!isAboveFold) {
        img.setAttribute("loading", "lazy");
      }
    }

    // Add image SEO attributes
    img.setAttribute("data-seo-src", src);
    img.setAttribute("data-seo-alt", alt);
  };

  ImageSEO.generateAlt = function (img) {
    var src = img.getAttribute("src") || "";
    var parentText = ImageSEO.getParentText(img);
    var filename = src.split("/").pop().split("?")[0].split(".")[0] || "";
    var productName = ImageSEO.getProductName();

    if (productName) {
      if (parentText) return productName + " - " + filename + " - " + parentText.substring(0, 30);
      return productName + " - " + filename;
    }
    return filename.replace(/[-_]/g, " ") || "صورة منتج";
  };

  ImageSEO.getParentText = function (el) {
    var parent = el.parentElement;
    var maxDepth = 3;
    while (parent && maxDepth > 0) {
      var text = (parent.textContent || "").trim().substring(0, 50);
      if (text) return text;
      parent = parent.parentElement;
      maxDepth--;
    }
    return "";
  };

  ImageSEO.getProductName = function () {
    var h1 = document.querySelector("h1");
    if (h1) return (h1.textContent || "").trim();
    var title = document.title;
    return title.replace(" | Buda", "").trim();
  };

  ImageSEO.isAboveFold = function (el) {
    if (typeof window.scrollY === "undefined") return true;
    var rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  };

  ImageSEO.setupLazyLoading = function () {
    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var img = entry.target;
            var dataSrc = img.getAttribute("data-src");
            if (dataSrc) {
              img.src = dataSrc;
              img.removeAttribute("data-src");
            }
            observer.unobserve(img);
          }
        });
      }, { rootMargin: "200px" });

      document.querySelectorAll("img[data-src]").forEach(function (img) {
        observer.observe(img);
      });
    }
  };

  ImageSEO.supportsWebP = function () {
    if (global._supportsWebP !== undefined) return global._supportsWebP;
    var canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    var data = canvas.toDataURL("image/webp");
    global._supportsWebP = data.indexOf("image/webp") === 5;
    return global._supportsWebP;
  };

  ImageSEO.supportsAVIF = function () {
    if (global._supportsAVIF !== undefined) return global._supportsAVIF;
    global._supportsAVIF = false;
    var img = new Image();
    img.onload = function () { global._supportsAVIF = true; };
    img.onerror = function () { global._supportsAVIF = false; };
    img.src = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAADAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKBzgAP8AAAAAAACgfAAAQAAAAAAAAAA==";
    return global._supportsAVIF;
  };

  ImageSEO.generateImageSitemap = function () {
    var images = document.querySelectorAll("img[src]");
    var urls = [];
    images.forEach(function (img) {
      var src = img.getAttribute("src") || "";
      if (src && src.startsWith("http")) {
        urls.push({
          loc: src,
          caption: img.getAttribute("alt") || img.getAttribute("title") || "",
          title: img.getAttribute("title") || "",
        });
      }
    });
    return urls;
  };

  ImageSEO.enhanceGalleryImages = function (containerId, productName) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var images = container.querySelectorAll("img");
    images.forEach(function (img, i) {
      if (!img.getAttribute("alt") || img.getAttribute("alt").trim() === "") {
        img.setAttribute("alt", (productName || "منتج") + " - صورة " + (i + 1));
      }
      if (!img.hasAttribute("loading")) {
        img.setAttribute("loading", i === 0 ? "eager" : "lazy");
      }
    });
  };

  ImageSEO.initOnReady = function () {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", ImageSEO.init);
    } else {
      ImageSEO.init();
    }
  };

  global.ImageSEO = ImageSEO;
})(window);
