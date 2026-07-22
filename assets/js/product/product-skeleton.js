/**
 * PDP.Skeleton — reveal controller for the 1:1 skeleton markup.
 * Every independent async region on the page (buybox, tabs,
 * reviews, bought-together, recommended) is wrapped in an element
 * with class `.pdp-loading-scope` containing a `.pdp-skel` block
 * and a `.pdp-real` block. Calling `reveal()` on that scope removes
 * the skeleton and fades the real content in — no full-page flash,
 * no layout shift (skeleton sizes match the real sizes), and each
 * section swaps independently as soon as its own data resolves.
 *
 * CSS-only shimmer animation lives in skeleton.css; this file only
 * toggles classes (no JS-driven animation loop).
 */
(function (global) {
  "use strict";

  function reveal(scopeEl) {
    if (!scopeEl) return;
    if (scopeEl.classList.contains("is-loaded")) return;
    scopeEl.classList.add("is-loaded");
  }

  function revealAll(selector) {
    global.PDP.Utils.qsa(selector || ".pdp-loading-scope").forEach(reveal);
  }

  global.PDP = global.PDP || {};
  global.PDP.Skeleton = {
    reveal: reveal,
    revealAll: revealAll,
  };
})(window);
