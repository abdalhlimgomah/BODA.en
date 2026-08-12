/* ========================================================================
   Order Success Page
   ======================================================================== */
function escapeHtml(v) {
  return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function getOrderCountryCode() {
  try {
    var raw = sessionStorage.getItem("orderSuccessData");
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && parsed.country_code) return String(parsed.country_code).toUpperCase();
    }
  } catch (e) {}
  try {
    var stored = String(localStorage.getItem("userCountry") || "").toUpperCase();
    if (stored) return stored;
  } catch (e) {}
  try {
    var selected = window.TaagerIntegration && typeof window.TaagerIntegration.getSelectedCountry === "function"
      ? window.TaagerIntegration.getSelectedCountry()
      : null;
    if (selected && selected.code) return String(selected.code).toUpperCase();
  } catch (e) {}
  return "EG";
}

function getOrderCurrencyConfig() {
  var code = getOrderCountryCode();
  return code === "SA"
    ? { locale: "ar-SA", code: "SAR", label: "ريال" }
    : { locale: "ar-EG", code: "EGP", label: "جنيه" };
}

function formatOrderMoney(value) {
  var cfg = getOrderCurrencyConfig();
  var num = Number(value) || 0;
  var formatted = new Intl.NumberFormat(cfg.locale, { maximumFractionDigits: 2 }).format(num);
  return formatted + " " + cfg.label;
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
    var codFee = Number(totals.codFee) || 0;
    var grandTotal = Number(totals.total) || (subtotal + shipping + codFee - couponDiscount);
    var rows = ['<div class="os-total-row"><span>المجموع الفرعي</span><span>' + formatOrderMoney(subtotal) + '</span></div>'];
    if (couponDiscount > 0) {
      rows.push('<div class="os-total-row os-discount-row"><span>الخصم</span><span>- ' + formatOrderMoney(couponDiscount) + '</span></div>');
    }
    rows.push('<div class="os-total-row"><span>الشحن</span><span>' + formatOrderMoney(shipping) + '</span></div>');
    if (codFee > 0) {
      rows.push('<div class="os-total-row"><span>رسوم الدفع عند الاستلام</span><span>' + formatOrderMoney(codFee) + '</span></div>');
    }
    rows.push('<div class="os-total-divider"></div>');
    rows.push('<div class="os-total-row os-grand-total-row"><strong>الإجمالي</strong><strong>' + formatOrderMoney(grandTotal) + '</strong></div>');
    var html = '<div class="os-totals">' + rows.join("") + '</div>';
    deliverySummary.insertAdjacentHTML("beforebegin", html);
  }
}

document.addEventListener("DOMContentLoaded", renderOrderSuccess);
