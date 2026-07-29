(function () {
  'use strict';

  if (window.innerWidth < 1200) return;

  /* ---- Scroll Reveal ---- */
  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        if (entry.target.classList.contains('stagger-children')) {
          entry.target.classList.add('reveal-stagger');
        }
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -60px 0px', threshold: 0.1 });

  document.querySelectorAll(
    '.reveal, .reveal-left, .reveal-right, .reveal-scale, .stagger-children, .stagger-grid'
  ).forEach(function (el) {
    revealObserver.observe(el);
  });

  /* ---- Button Ripple ---- */
  document.querySelectorAll('.btn-primary, .btn-secondary, .btn-danger, .noon-add-square').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      var rect = btn.getBoundingClientRect();
      var r = document.createElement('span');
      r.className = 'ripple';
      r.style.left = (e.clientX - rect.left) + 'px';
      r.style.top = (e.clientY - rect.top) + 'px';
      r.style.width = r.style.height = Math.max(rect.width, rect.height) + 'px';
      btn.appendChild(r);
      r.addEventListener('animationend', function () { r.remove(); });
    });
  });

  /* ---- Scroll Progress ---- */
  var bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);

  function updateProgress() {
    var p = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
    bar.style.width = Math.min(p * 100, 100) + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  /* ---- Observe dynamically added elements ---- */
  var mo = new MutationObserver(function () {
    document.querySelectorAll(
      '.reveal, .reveal-left, .reveal-right, .reveal-scale, .stagger-children, .stagger-grid'
    ).forEach(function (el) {
      if (!el.classList.contains('visible')) revealObserver.observe(el);
    });
  });
  mo.observe(document.getElementById('hm-content') || document.body, {
    childList: true, subtree: true
  });
})();
