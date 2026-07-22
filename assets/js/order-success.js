/* ========================================================================
   Order Success Page
   ======================================================================== */
function escapeHtml(v) {
  return String(v ?? "").replaceAll("&", "&").replaceAll("<", "<").replaceAll(">", ">").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
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
  var productsEl = document.getElementById("os-products");
  var nameEl = document.getElementById("os-name");
  var phoneEl = document.getElementById("os-phone");
  var addressEl = document.getElementById("os-address");
  var deliveryEl = document.getElementById("os-delivery-date");

  if (nameEl) nameEl.textContent = fields.name || "---";
  if (phoneEl) phoneEl.textContent = fields.phone || "---";
  if (addressEl) addressEl.textContent = fields.address || "---";
  if (deliveryEl) deliveryEl.textContent = getDeliveryEstimate();

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
      return '<div class="os-product">' +
        '<div class="os-product-img-wrap">' +
          '<img class="os-product-img" src="' + img + '" alt="' + escapeHtml(name) + '" loading="lazy" onerror="this.onerror=null;this.src=\'../assets/images/unnamed.png\'" />' +
          '<span class="os-product-qty">x' + qty + '</span>' +
        '</div>' +
        '<div class="os-product-info">' +
          '<p class="os-product-name">' + escapeHtml(name) + '</p>' +
          '<span class="os-product-meta">' + formatOrderMoney(item.price || 0) + '</span>' +
        '</div>' +
      '</div>';
    }).join("");
  }

  // Clear session data
  try { sessionStorage.removeItem("orderSuccessData"); } catch {}
}

document.addEventListener("DOMContentLoaded", renderOrderSuccess);
