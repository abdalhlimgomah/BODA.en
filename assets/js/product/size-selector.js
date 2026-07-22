(function (global) {
  "use strict";

  var U = global.PDP.Utils;
  var _selectedSize = null;
  var _vm = null;
  var _root = null;

  function render(root, vm) {
    _root = root;
    _vm = vm;
    _selectedSize = null;
    var section = root.closest("#pdp-sizes-section") || root.parentElement;
    var sizes = vm.sizes;
    if (!sizes || !sizes.length) { root.innerHTML = ""; if (section) section.style.display = "none"; return; }
    if (section) section.style.display = "";
    root.style.display = "";

    var header =
      '<div class="pdp-size-header">' +
      '<span class="pdp-size-title">المقاس</span>' +
      '<button type="button" class="pdp-size-guide-link" data-size-guide-btn>' +
      '<span class="material-icons-outlined">straighten</span> دليل المقاسات' +
      '</button></div>';

    var scrollClass = sizes.length > 8 ? ' pdp-size-scroll' : '';
    if (!_selectedSize) {
      for (var si = 0; si < sizes.length; si++) {
        if (sizes[si].is_available !== false && sizes[si].stock !== 0) {
          _selectedSize = sizes[si];
          break;
        }
      }
    }

    var selectedIdx = _selectedSize ? sizes.indexOf(_selectedSize) : -1;
    var btns = sizes.map(function (s, i) {
      var available = s.is_available !== false && s.stock !== 0;
      var cls = 'pdp-size-btn' + (available ? '' : ' is-unavailable') + (i === selectedIdx ? ' is-selected' : '');
      var disabled = available ? '' : ' disabled';
      return '<button type="button" class="' + cls + '" data-size-idx="' + i + '"' + disabled + '>' + U.escapeHtml(s.name) + '</button>';
    }).join('');

    root.innerHTML = header + '<div class="pdp-size-options' + scrollClass + '">' + btns + '</div>';

    root.addEventListener('click', function (e) {
      var btn = e.target.closest('.pdp-size-btn');
      if (!btn || btn.disabled) return;
      var idx = Number(btn.getAttribute('data-size-idx'));
      var size = sizes[idx];
      if (!size) return;
      if (size._siblingId && size._siblingId !== U.getQueryParam("id")) {
        window.location.href = "product.html?id=" + encodeURIComponent(size._siblingId);
        return;
      }
      selectSize(size, btn);
    });
  }

  function selectSize(size, btn) {
    _selectedSize = size;
    var allBtns = _root.querySelectorAll('.pdp-size-btn');
    allBtns.forEach(function (b) { b.classList.remove('is-selected'); });
    if (btn) btn.classList.add('is-selected');
    _root.dispatchEvent(new CustomEvent('pdp:size-change', { bubbles: true, detail: { size: size } }));
  }

  function getSelectedSize() {
    return _selectedSize;
  }

  function isTaagerMulti() {
    if (!_vm || !_vm.sizes) return false;
    for (var si = 0; si < _vm.sizes.length; si++) {
      if (_vm.sizes[si]._siblingId) return true;
    }
    return false;
  }

  function requireSize() {
    if (!_vm.sizes || !_vm.sizes.length) return true;
    if (isTaagerMulti()) return true;
    if (_selectedSize) return true;
    showSizeToast();
    return false;
  }

  function showSizeToast() {
    var existing = document.querySelector('.pdp-size-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.className = 'pdp-size-toast';
    toast.textContent = 'اختر المقاس أولاً';
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.classList.add('pdp-size-toast-hide');
      setTimeout(function () { toast.remove(); }, 260);
    }, 2200);
  }

  global.PDP = global.PDP || {};
  global.PDP.SizeSelector = {
    render: render,
    getSelectedSize: getSelectedSize,
    requireSize: requireSize,
  };
})(window);
