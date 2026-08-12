function escapeHtml(v) {
  return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function fmt(v) {
  var num = (Number(v) || 0).toFixed(2).replace(/\.00$/, "");
  if (window.BudaStore) {
    var cfg = window.BudaStore.resolveCurrencyConfig ? window.BudaStore.resolveCurrencyConfig() : {};
    var labels = { EGP: "ج.م.", SAR: "ريال" };
    var label = labels[cfg.currency] || cfg.currency || "ج.م.";
    return num + " " + label;
  }
  return num + " ج.م.";
}

function fmtDate(d) {
  if (!d) return "-";
  if (window.BudaOrders?.formatOrderDate) return window.BudaOrders.formatOrderDate(d);
  return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getInvoiceOrderId() {
  return new URLSearchParams(window.location.search).get("id") || "";
}

function buildInvoiceText(order) {
  var items = window.BudaOrders ? window.BudaOrders.getOrderItems(order) : [];
  var ref = window.BudaOrders ? window.BudaOrders.buildOrderReference(order) : (order.id || "-");
  var date = fmtDate(order.created_at || order.createdAt);
  var name = order.user_name || order.name || "-";
  var email = order.user_email || order.email || "-";
  var phone = order.phone || "-";
  var address = order.address || order.customer_address || "-";
  var payment = order.payment_method || "الدفع عند الاستلام";
  var shipping = Number(order.shipping_cost || order.shipping_fee || order.shipping || 0);
  var tax = Number(order.tax || order.vat || order.cod_fee || 0);
  var discount = Number(order.discount || 0);
  var total = Number(order.total_price || order.total || order.amount || 0);
  var coupon = order.coupon_code || "";

  var sub = items.reduce(function(s, it) { return s + (Number(it.price) || 0) * (Number(it.quantity) || 1); }, 0);
  if (sub === 0) sub = total + discount - shipping - tax;

  var lines = [];
  var sep = "═══════════════════════════════════════════";
  var dash = "───────────────────────────────────────────";

  lines.push(sep);
  lines.push("                    الفاتورة");
  lines.push("                     INVOICE");
  lines.push(sep);
  lines.push("");
  lines.push("رقم الطلب:    " + ref);
  lines.push("التاريخ:      " + date);
  lines.push(dash);
  lines.push("");
  lines.push("── بيانات العميل ──");
  lines.push("الاسم:        " + name);
  lines.push("البريد:       " + email);
  lines.push("الهاتف:       " + phone);
  lines.push("العنوان:      " + address);
  lines.push("");
  lines.push(dash);
  lines.push("── المنتجات ──");
  lines.push("");

  items.forEach(function(itm, i) {
    var qty = Number(itm.quantity) || 1;
    var price = Number(itm.price) || 0;
    var itmTotal = price * qty;
    var itmName = itm.name || itm.title || itm.product_name || "منتج";
    var taagerId = itm.taager_product_id || "";
    var sku = itm.sku || itm.code || "";
    lines.push("  [" + (i + 1) + "] " + itmName);
    if (taagerId) lines.push("      كود تاجر: " + taagerId);
    if (sku) lines.push("      كود المنتج: " + sku);
    lines.push("      السعر:      " + fmt(price));
    lines.push("      الكمية:     " + qty);
    lines.push("      الإجمالي:   " + fmt(itmTotal));
    lines.push("");
  });

  lines.push(dash);
  lines.push("── ملخص الدفع ──");
  lines.push("  مجموع المنتجات:    " + fmt(sub));
  if (shipping > 0) lines.push("  رسوم الشحن:        " + fmt(shipping));
  if (tax > 0) lines.push("  رسوم الدفع:        " + fmt(tax));
  if (discount > 0) lines.push("  الخصم:             -" + fmt(discount));
  if (coupon) lines.push("  كود الخصم:         " + coupon);
  lines.push(dash);
  lines.push("  الإجمالي الكلي:    " + fmt(total));
  lines.push(sep);
  lines.push("");
  lines.push("  شكراً لتسوقك معنا!");
  lines.push("  Thank you for shopping with us!");
  lines.push(sep);

  return lines.join("\n");
}

function renderInvoicePage(order) {
  var el = document.getElementById("invoice-content");
  if (!el) return;

  var text = buildInvoiceText(order);
  var orderId = window.BudaOrders ? window.BudaOrders.getOrderId(order) : (order.id || "");
  var fileName = "invoice_" + orderId + ".txt";

  el.innerHTML =
    '<div class="inv-card">' +
    '<div class="inv-header">' +
    '<h2 class="inv-title">الفاتورة</h2>' +
    '<button class="inv-download-btn" onclick="downloadInvoice(\'' + escapeHtml(fileName) + '\')">' +
    '<span class="material-icons-outlined">download</span> تحميل الفاتورة' +
    '</button>' +
    '</div>' +
    '<pre class="inv-text" id="inv-text">' + escapeHtml(text) + '</pre>' +
    '</div>';
}

function downloadInvoice(fileName) {
  var el = document.getElementById("inv-text");
  if (!el) return;
  var text = el.textContent;
  var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderInvoiceError(msg) {
  var el = document.getElementById("invoice-content");
  if (!el) return;
  el.innerHTML = '<div class="inv-empty"><h3>تعذر تحميل الفاتورة</h3><p>' + escapeHtml(msg || "لم يتم العثور على الطلب.") + '</p></div>';
}

async function initInvoice() {
  var orderId = getInvoiceOrderId();
  if (!orderId) { renderInvoiceError("رقم الطلب غير موجود."); return; }

  if (!window.BudaOrders?.fetchOrderWithItems) {
    renderInvoiceError("خدمة الطلبات غير متاحة.");
    return;
  }

  try {
    var order = await window.BudaOrders.fetchOrderWithItems(orderId);
    if (!order) { renderInvoiceError("لم يتم العثور على الطلب."); return; }
    renderInvoicePage(order);
  } catch (e) {
    console.error("invoice error", e);
    renderInvoiceError("حدث خطأ أثناء تحميل بيانات الفاتورة.");
  }
}

function hideBottomNav() { var n = document.querySelector('.bottom-nav'); if (n) n.style.display = 'none'; }

document.addEventListener("DOMContentLoaded", function () {
  hideBottomNav();
  initInvoice();
});
