(function (global) {
  "use strict";

  var U = global.PDP.Utils;

  function open(vm) {
    var sizes = vm && vm.sizes;
    if (!sizes || !sizes.length) return;

    var overlay = document.createElement('div');
    overlay.className = 'pdp-size-guide-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    var modal = document.createElement('div');
    modal.className = 'pdp-size-guide-modal';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'pdp-size-guide-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'إغلاق');
    modal.appendChild(closeBtn);

    var title = document.createElement('h2');
    title.textContent = 'دليل المقاسات';
    modal.appendChild(title);

    var table = document.createElement('table');
    table.className = 'pdp-size-guide-table';
    var thead = document.createElement('thead');
    var tr = document.createElement('tr');
    ['المقاس', 'المخزون'].forEach(function (label) {
      var th = document.createElement('th');
      th.textContent = label;
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    table.appendChild(thead);
    var tbody = document.createElement('tbody');
    sizes.forEach(function (s) {
      var tr = document.createElement('tr');
      var td1 = document.createElement('td');
      td1.textContent = s.name;
      tr.appendChild(td1);
      var td2 = document.createElement('td');
      td2.textContent = s.stock > 0 ? String(s.stock) : 'غير متوفر';
      td2.style.color = s.stock > 0 ? 'inherit' : '#94a3b8';
      tr.appendChild(td2);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    modal.appendChild(table);

    var howToSection = document.createElement('div');
    howToSection.className = 'pdp-size-guide-section';
    var howTitle = document.createElement('h3');
    howTitle.textContent = 'كيف تأخذ المقاس المناسب؟';
    howToSection.appendChild(howTitle);
    var steps = [
      'استخدم شريط قياس مرن للحصول على نتائج دقيقة.',
      'لف الشريط حول المنطقة المراد قياسها براحة (ليس شديد الضيق ولا شديد الارتخاء).',
      'دوّن القياس بالسنتيمتر ثم اختر المقاس المناسب من الجدول أعلاه.',
      'إذا كان قياسك بين مقاسين، اختر المقاس الأكبر لمزيد من الراحة.',
    ];
    var ol = document.createElement('ol');
    steps.forEach(function (step) {
      var li = document.createElement('li');
      li.textContent = step;
      ol.appendChild(li);
    });
    howToSection.appendChild(ol);
    modal.appendChild(howToSection);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function close() {
      overlay.remove();
    }

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
    });
  }

  global.PDP = global.PDP || {};
  global.PDP.SizeGuide = { open: open };
})(window);
