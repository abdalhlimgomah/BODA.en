/**
 * PDP.Gallery — main stage + vertical/horizontal thumbnail rail +
 * fullscreen viewer (drag + pinch-zoom + keyboard).
 *
 * One scroll-snap track powers both breakpoints:
 *  - Mobile: the user swipes the track directly (native touch
 *    scrolling = a real "slide", which is the expected mobile
 *    gesture feel).
 *  - Desktop / thumbnail clicks / keyboard: `goToSlide()` fades the
 *    target slide in via opacity while jumping the scroll position
 *    instantly underneath (no visible slide motion) — this is the
 *    "Fade Animation" the design calls for when pressing a
 *    thumbnail, without needing two separate DOM structures.
 *
 * Hover-zoom uses a cursor-anchored CSS transform (no extra network
 * request, no layout thrash — a single `transform` update per
 * pointer move, which is compositor-only and keeps 60fps).
 */
(function (global) {
  "use strict";

  var U = global.PDP.Utils;

  function ProductGallery(root) {
    this.root = root;
    this.stage = U.qs(".pdp-gallery-stage", root);
    this.track = U.qs(".pdp-gallery-track", root);
    this.dotsEl = U.qs(".pdp-gallery-dots", root);
    this.thumbsEl = U.qs(".pdp-gallery-thumbs", root);
    this.counterEl = U.qs(".pdp-gallery-counter", root);
    this.slides = [];
    this.index = 0;
  }

  ProductGallery.prototype.render = function (vm) {
    var self = this;
    var images = vm.images.length ? vm.images : [U.fallbackImage()];
    var hasVideo = vm.videos.length > 0;
    var slideSources = hasVideo
      ? images.map(function (i) {
          return { type: "image", src: i };
        }).concat([{ type: "video", src: vm.videos[0], poster: images[0] }])
      : images.map(function (i) {
          return { type: "image", src: i };
        });

    this.track.innerHTML = slideSources
      .map(function (s, i) {
        if (s.type === "video") {
          return (
            '<div class="pdp-gallery-slide" data-index="' +
            i +
            '">' +
            '<img src="' +
            s.poster +
            '" alt="' +
            U.escapeHtml(vm.name) +
            '" loading="eager" fetchpriority="high" decoding="async" />' +
            '<div class="pdp-gallery-video-badge"><span class="material-icons-outlined">play_circle</span></div>' +
            "</div>"
          );
        }
        return (
          '<div class="pdp-gallery-slide" data-index="' +
          i +
          '">' +
          '<img class="pdp-zoomable" src="' +
          s.src +
          '" alt="' +
          U.escapeHtml(vm.name) +
          " - صورة " +
          (i + 1) +
          '"' +
          (i === 0
            ? ' loading="eager" fetchpriority="high"'
            : ' loading="eager"') +
          ' decoding="async" onerror="this.onerror=null;this.src=\'' +
          U.fallbackImage() +
          "'\" />" +
          "</div>"
        );
      })
      .join("");

    this.slides = U.qsa(".pdp-gallery-slide", this.track);

    if (slideSources.length > 1) {
      this.dotsEl.innerHTML = slideSources
        .map(function (s, i) {
          return "<span" + (i === 0 ? ' class="active"' : "") + "></span>";
        })
        .join("");
      this.counterEl.style.display = "";
      this.counterEl.textContent = "1 / " + slideSources.length;
    } else {
      this.dotsEl.innerHTML = "";
      this.counterEl.style.display = "none";
    }

    this.thumbsEl.innerHTML = slideSources
      .map(function (s, i) {
        var img = s.type === "video" ? s.poster : s.src;
        return (
          '<button type="button" class="pdp-gallery-thumb' +
          (i === 0 ? " active" : "") +
          '" data-index="' +
          i +
          '" aria-label="عرض الصورة ' +
          (i + 1) +
          '">' +
          '<img src="' +
          img +
          '" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'' +
          U.fallbackImage() +
          "'\" />" +
          (s.type === "video"
            ? '<span class="material-icons-outlined">play_arrow</span>'
            : "") +
          "</button>"
        );
      })
      .join("");

    this.vm = vm;
    this.slideSources = slideSources;
    this.bindEvents();
    // Mark first slide as active
    var first = this.slides[0];
    if (first) first.classList.add("is-active");
    this.setActiveIndex(0);
  };

  ProductGallery.prototype.bindEvents = function () {
    var self = this;

    this.thumbsEl.addEventListener("click", function (e) {
      var btn = e.target.closest(".pdp-gallery-thumb");
      if (!btn) return;
      self.goToSlide(Number(btn.getAttribute("data-index")) || 0);
    });

    // Touch swipe detection for mobile.
    var swipeX = 0;
    this.stage.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches.length === 1) swipeX = e.touches[0].clientX;
      },
      { passive: true },
    );
    this.stage.addEventListener(
      "touchend",
      function (e) {
        if (swipeX === 0) return;
        var dx = e.changedTouches[0].clientX - swipeX;
        swipeX = 0;
        if (Math.abs(dx) < 40) return;
        self.goToSlide(
          self.index + (dx > 0 ? (document.dir === "rtl" ? 1 : -1) : document.dir === "rtl" ? -1 : 1),
        );
      },
      { passive: true },
    );

    // Cursor-anchored hover zoom (pointer devices with hover only).
    if (
      window.matchMedia &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ) {
      this.stage.classList.add("has-mouse");
      this.stage.addEventListener("mousemove", function (e) {
        var img =
          self.slides[self.index] &&
          self.slides[self.index].querySelector("img");
        if (!img) return;
        var rect = self.stage.getBoundingClientRect();
        var x = ((e.clientX - rect.left) / rect.width) * 100;
        var y = ((e.clientY - rect.top) / rect.height) * 100;
        img.style.transformOrigin = x + "% " + y + "%";
      });
    }

    this.stage.addEventListener("click", function (e) {
      if (e.target.closest(".pdp-gallery-expand")) return;
      var currentSource = self.slideSources && self.slideSources[self.index];
      if (currentSource && currentSource.type === "video") {
        self.playVideo(self.index);
        return;
      }
      console.log("[Gallery] stage clicked");
      self.openLightbox();
    });

    var expandBtn = U.qs(".pdp-gallery-expand", this.root);
    if (expandBtn)
      expandBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        self.openLightbox();
      });

    this.stage.setAttribute("tabindex", "0");
    this.stage.setAttribute("role", "group");
    this.stage.setAttribute("aria-label", "معرض صور المنتج");
    this.stage.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight")
        self.goToSlide(self.index + (document.dir === "rtl" ? -1 : 1));
      else if (e.key === "ArrowLeft")
        self.goToSlide(self.index + (document.dir === "rtl" ? 1 : -1));
      else if (e.key === "Enter") self.openLightbox();
    });
  };

  ProductGallery.prototype.setActiveIndex = function (index) {
    this.index = index;
    U.qsa("span", this.dotsEl).forEach(function (d, i) {
      d.classList.toggle("active", i === index);
    });
    U.qsa(".pdp-gallery-thumb", this.thumbsEl).forEach(function (t, i) {
      t.classList.toggle("active", i === index);
    });
    if (this.counterEl)
      this.counterEl.textContent = index + 1 + " / " + this.slides.length;
    var activeThumb = this.thumbsEl.children[index];
    if (activeThumb && activeThumb.scrollIntoView)
      activeThumb.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "smooth",
      });
  };

  ProductGallery.prototype.playVideo = function (index) {
    var slide = this.slides[index];
    if (!slide) return;
    var source = this.slideSources[index];
    if (!source || source.type !== "video") return;
    slide.innerHTML = "";
    var video = document.createElement("video");
    video.src = source.src;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.style.cssText = "width:100%;height:100%;object-fit:contain;background:#000";
    slide.appendChild(video);
    video.play()["catch"](function () {});
  };

  /** Cross-fades to `index`: toggles `is-active` class on slides. */
  ProductGallery.prototype.goToSlide = function (index, options) {
    var target = U.clampInt(index, 0, this.slides.length - 1);
    var currentSlide = this.slides[this.index];
    var targetSlide = this.slides[target];
    if (!targetSlide || target === this.index) return;
    if (currentSlide) currentSlide.classList.remove("is-active");
    targetSlide.classList.add("is-active");
    this.setActiveIndex(target);
  };

  ProductGallery.prototype.openLightbox = function () {
    if (!global.PDP.Lightbox) { console.warn("[Gallery] Lightbox not available"); return; }
    console.log("[Gallery] openLightbox called, sources:", this.slideSources ? this.slideSources.length : 0, "index:", this.index);
    try {
      global.PDP.Lightbox.open(this.slideSources, this.index, this.vm && this.vm.name);
    } catch (e) {
      console.warn("[Gallery] Lightbox.open error:", e);
    }
  };

  global.PDP = global.PDP || {};
  global.PDP.Gallery = {
    mount: function (root, vm) {
      try {
        if (!root || !vm) return null;
        var instance = new ProductGallery(root);
        instance.render(vm);
        return instance;
      } catch (e) {
        console.warn("[Gallery] mount error:", e);
        return null;
      }
    },
  };

  // ================================================================
  // Fullscreen lightbox — drag between images, pinch/double-tap zoom,
  // keyboard navigation. Small and tightly coupled to ProductGallery,
  // so it lives in this same file rather than a separate component.
  // ================================================================

  var Lightbox = (function () {
    var el, stageEl, imgEl, counterEl, prevBtn, nextBtn, closeBtn;
    var sources = [],
      index = 0;
    var scale = 1,
      panX = 0,
      panY = 0;
    var pinch = { active: false, startDist: 0, startScale: 1 };
    var drag = {
      active: false,
      startX: 0,
      startY: 0,
      baseX: 0,
      baseY: 0,
      moved: false,
    };

    function ensureMounted() {
      if (el) return;
      el = U.qs("#pdp-lightbox");
      if (!el) { console.warn("[Lightbox] #pdp-lightbox not in DOM"); return; }
      stageEl = U.qs(".pdp-lightbox-stage", el);
      imgEl = U.qs(".pdp-lightbox-img", el);
      counterEl = U.qs(".pdp-lightbox-counter", el);
      prevBtn = U.qs(".pdp-lightbox-prev", el);
      nextBtn = U.qs(".pdp-lightbox-next", el);
      closeBtn = U.qs(".pdp-lightbox-close", el);
      if (!stageEl) console.warn("[Lightbox] .pdp-lightbox-stage not found");
      if (!imgEl) console.warn("[Lightbox] .pdp-lightbox-img not found");
      bind();
    }

    function applyTransform() {
      if (!imgEl) return;
      imgEl.style.transform =
        "translate(" + panX + "px," + panY + "px) scale(" + scale + ")";
    }

    function resetZoom() {
      scale = 1;
      panX = 0;
      panY = 0;
      applyTransform();
    }

    function show(i) {
      if (!sources || !sources.length) return;
      index = U.clampInt(i, 0, sources.length - 1);
      var s = sources[index];
      if (!s) return;
      var oldVideo = stageEl && stageEl.querySelector("video");
      if (s.type === "video") {
        if (oldVideo) oldVideo.remove();
        if (imgEl) imgEl.style.display = "none";
        var video = document.createElement("video");
        video.src = s.src;
        video.poster = s.poster || "";
        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;
        video.style.cssText = "max-width:100%;max-height:100%;object-fit:contain";
        if (stageEl) stageEl.appendChild(video);
      } else {
        if (oldVideo) oldVideo.remove();
        if (imgEl) { imgEl.style.display = ""; imgEl.src = s.src; imgEl.alt = ""; }
      }
      resetZoom();
      if (counterEl) counterEl.textContent = index + 1 + " / " + sources.length;
      var multi = sources.length > 1;
      if (prevBtn) prevBtn.style.display = multi ? "" : "none";
      if (nextBtn) nextBtn.style.display = multi ? "" : "none";
    }

    function open(slideSources, startIndex, productName) {
      try {
        ensureMounted();
        if (!el) { console.warn("[Lightbox] #pdp-lightbox not found"); return; }
        if (!Array.isArray(slideSources) || !slideSources.length) {
          console.warn("[Lightbox] no slideSources"); return;
        }
        sources = slideSources;
        el.setAttribute(
          "aria-label",
          "عرض " + (productName || "المنتج") + " بحجم كامل",
        );
        show(startIndex || 0);
        el.classList.add("is-open");
        document.body.style.overflow = "hidden";
        console.log("[Lightbox] opened, sources:", sources.length);
      } catch (e) {
        console.warn("[Lightbox] open error:", e);
      }
    }

    function close() {
      if (!el) return;
      el.classList.remove("is-open");
      document.body.style.overflow = "";
    }

    function next() {
      show(index + 1 >= sources.length ? 0 : index + 1);
    }
    function prev() {
      show(index - 1 < 0 ? sources.length - 1 : index - 1);
    }

    function distance(touches) {
      var dx = touches[0].clientX - touches[1].clientX;
      var dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function bind() {
      if (!closeBtn || !nextBtn || !prevBtn || !el || !stageEl) {
        console.warn("[Lightbox] bind: missing DOM elements", { closeBtn: !!closeBtn, nextBtn: !!nextBtn, prevBtn: !!prevBtn, el: !!el, stageEl: !!stageEl });
        return;
      }
      closeBtn.addEventListener("click", close);
      nextBtn.addEventListener("click", function () {
        if (scale === 1) next();
      });
      prevBtn.addEventListener("click", function () {
        if (scale === 1) prev();
      });
      el.addEventListener("click", function (e) {
        if (e.target === el) close();
      });

      document.addEventListener("keydown", function (e) {
        if (!el.classList.contains("is-open")) return;
        if (e.key === "Escape") close();
        else if (e.key === "ArrowRight") {
          if (scale === 1) document.dir === "rtl" ? prev() : next();
        } else if (e.key === "ArrowLeft") {
          if (scale === 1) document.dir === "rtl" ? next() : prev();
        }
      });

      // Double-click / double-tap toggles zoom.
      var lastTap = 0;
      stageEl.addEventListener("dblclick", function (e) {
        toggleZoomAt(e.clientX, e.clientY);
      });

      stageEl.addEventListener(
        "touchstart",
        function (e) {
          if (e.touches.length === 2) {
            pinch.active = true;
            pinch.startDist = distance(e.touches);
            pinch.startScale = scale;
          } else if (e.touches.length === 1) {
            var now = Date.now();
            if (now - lastTap < 280) {
              toggleZoomAt(e.touches[0].clientX, e.touches[0].clientY);
            }
            lastTap = now;
            drag.active = true;
            drag.moved = false;
            drag.startX = e.touches[0].clientX;
            drag.startY = e.touches[0].clientY;
            drag.baseX = panX;
            drag.baseY = panY;
          }
        },
        { passive: true },
      );

      stageEl.addEventListener(
        "touchmove",
        function (e) {
          if (pinch.active && e.touches.length === 2) {
            var d = distance(e.touches);
            scale =
              U.clampInt(
                pinch.startScale * (d / pinch.startDist) * 100,
                100,
                400,
              ) / 100;
            applyTransform();
            return;
          }
          if (drag.active && e.touches.length === 1) {
            var dx = e.touches[0].clientX - drag.startX;
            var dy = e.touches[0].clientY - drag.startY;
            if (Math.abs(dx) > 6 || Math.abs(dy) > 6) drag.moved = true;
            if (scale > 1) {
              panX = drag.baseX + dx;
              panY = drag.baseY + dy;
              applyTransform();
            }
          }
        },
        { passive: true },
      );

      stageEl.addEventListener("touchend", function (e) {
        if (pinch.active) {
          pinch.active = false;
          if (scale <= 1.02) resetZoom();
        }
        if (drag.active) {
          if (scale === 1 && drag.moved) {
            var dx = e.changedTouches[0].clientX - drag.startX;
            if (Math.abs(dx) > 60) {
              dx > 0
                ? document.dir === "rtl"
                  ? next()
                  : prev()
                : document.dir === "rtl"
                  ? prev()
                  : next();
            }
          }
          drag.active = false;
        }
      });

      // Mouse-drag panning when zoomed (desktop).
      var mouseDrag = {
        active: false,
        startX: 0,
        startY: 0,
        baseX: 0,
        baseY: 0,
      };
      stageEl.addEventListener("mousedown", function (e) {
        if (scale === 1) return;
        mouseDrag.active = true;
        mouseDrag.startX = e.clientX;
        mouseDrag.startY = e.clientY;
        mouseDrag.baseX = panX;
        mouseDrag.baseY = panY;
      });
      window.addEventListener("mousemove", function (e) {
        if (!mouseDrag.active) return;
        panX = mouseDrag.baseX + (e.clientX - mouseDrag.startX);
        panY = mouseDrag.baseY + (e.clientY - mouseDrag.startY);
        applyTransform();
      });
      window.addEventListener("mouseup", function () {
        mouseDrag.active = false;
      });

      stageEl.addEventListener(
        "wheel",
        function (e) {
          e.preventDefault();
          var delta = e.deltaY < 0 ? 0.15 : -0.15;
          scale = U.clampInt((scale + delta) * 100, 100, 400) / 100;
          if (scale === 1) {
            panX = 0;
            panY = 0;
          }
          applyTransform();
        },
        { passive: false },
      );
    }

    function toggleZoomAt(clientX, clientY) {
      if (scale > 1) {
        resetZoom();
        return;
      }
      var rect = stageEl.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      scale = 2.2;
      panX = (cx - clientX) * 0.6;
      panY = (cy - clientY) * 0.6;
      applyTransform();
    }

    return { open: open, close: close };
  })();

  global.PDP.Lightbox = Lightbox;
})(window);
