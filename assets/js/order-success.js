/* ========================================================================
   Order Success Page
   ======================================================================== */
function escapeHtml(v) {
  return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function formatOrderMoney(value) {
  return window.BudaStore ? window.BudaStore.formatMoney(value, { plain: true, minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (Number(value) || 0).toFixed(2) + " جنيه";
}

function getDeliveryEstimate() {
  var d = new Date();
  d.setDate(d.getDate() + 5);
  var days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  var dayName = days[d.getDay()];
  var dateNum = d.getDate();
  var months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  return dayName + "، " + dateNum + " " + months[d.getMonth()];
}

function renderOrderSuccess() {
  var raw;
  try { raw = sessionStorage.getItem("orderSuccessData"); } catch {}
  if (!raw) {
    document.getElementById("os-card").innerHTML = '<div class="os-card-header"><p style="color:#fff;margin:0">لم يتم العثور على بيانات الطلب</p></div>';
    return;
  }

  var data;
  try { data = JSON.parse(raw); } catch { return; }
  if (!data || !data.cart || !data.fields) return;

  var cart = data.cart;
  var fields = data.fields;
  var totals = data.totals || {};
  var productsEl = document.getElementById("os-products");
  var nameEl = document.getElementById("os-name");
  var phoneEl = document.getElementById("os-phone");
  var addressEl = document.getElementById("os-address");
  var deliveryEl = document.getElementById("os-delivery-date");

  if (nameEl) nameEl.textContent = fields.name || "---";
  if (phoneEl) phoneEl.textContent = fields.phone || "---";
  if (addressEl) addressEl.textContent = fields.address || "---";
  if (deliveryEl) deliveryEl.textContent = getDeliveryEstimate();

  var subtotal = Number(totals.subtotal) || cart.reduce(function (s, item) { return s + (Number(item.price) || 0) * (Number(item.quantity) || 1); }, 0);
  var couponDiscount = Number(totals.couponDiscount) || 0;

  if (productsEl) {
    productsEl.innerHTML = cart.map(function (item) {
      var img = "";
      if (window.BudaStore) {
        var imgs = window.BudaStore.getProductImages(item);
        img = imgs && imgs.length ? imgs[0] : item.image || "";
      } else {
        img = item.image || item.image_url || item.thumbnail || "";
      }
      img = window.BudaStore ? window.BudaStore.getImagePath(img) : img;
      var name = item.name || item.title || "منتج";
      var qty = Number(item.quantity) || 1;
      var itemTotal = (Number(item.price) || 0) * qty;
      var itemDiscount = subtotal > 0 ? Math.round((itemTotal / subtotal) * couponDiscount * 100) / 100 : 0;
      var itemDiscounted = Math.max(itemTotal - itemDiscount, 0);
      var showOriginal = itemDiscount > 0;
      return '<div class="os-product">' +
        '<div class="os-product-img-wrap">' +
          '<img class="os-product-img" src="' + img + '" alt="' + escapeHtml(name) + '" loading="lazy" onerror="this.onerror=null;this.src=\'../assets/images/unnamed.png\'" />' +
          '<span class="os-product-qty">x' + qty + '</span>' +
        '</div>' +
        '<div class="os-product-info">' +
          '<p class="os-product-name">' + escapeHtml(name) + '</p>' +
          '<span class="os-product-meta"' + (showOriginal ? ' style="text-decoration:line-through;color:#9CA3AF;margin-left:6px"' : '') + '>' + formatOrderMoney(itemTotal) + '</span>' +
          (showOriginal ? '<span class="os-product-meta" style="color:#16a34a;font-weight:700">' + formatOrderMoney(itemDiscounted) + '</span>' : '') +
        '</div>' +
      '</div>';
    }).join("");
  }

  // Render totals summary
  var deliverySummary = document.getElementById("os-delivery-summary");
  if (deliverySummary && totals) {
    var shipping = Number(totals.shipping) || 0;
    var grandTotal = Number(totals.total) || (subtotal + shipping - couponDiscount);
    var html = '';
    if (couponDiscount > 0) {
      html += '<div class="os-totals">' +
        '<div class="os-total-row"><span>المجموع الفرعي</span><span>' + formatOrderMoney(subtotal) + '</span></div>' +
        '<div class="os-total-row os-discount-row"><span>الخصم</span><span>- ' + formatOrderMoney(couponDiscount) + '</span></div>' +
        '<div class="os-total-row"><span>الشحن</span><span>' + formatOrderMoney(shipping) + '</span></div>' +
        '<div class="os-total-divider"></div>' +
        '<div class="os-total-row os-grand-total-row"><strong>الإجمالي</strong><strong>' + formatOrderMoney(grandTotal) + '</strong></div>' +
      '</div>';
    } else {
      html += '<div class="os-totals">' +
        '<div class="os-total-row"><span>المجموع الفرعي</span><span>' + formatOrderMoney(subtotal) + '</span></div>' +
        '<div class="os-total-row"><span>الشحن</span><span>' + formatOrderMoney(shipping) + '</span></div>' +
        '<div class="os-total-divider"></div>' +
        '<div class="os-total-row os-grand-total-row"><strong>الإجمالي</strong><strong>' + formatOrderMoney(grandTotal) + '</strong></div>' +
      '</div>';
    }
    deliverySummary.insertAdjacentHTML("beforebegin", html);
  }
}

document.addEventListener("DOMContentLoaded", renderOrderSuccess);
