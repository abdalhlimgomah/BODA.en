function getCheckoutCodFee() {
  return isSaudiArabia() ? 5 : 12;
}
const COUPON_STORAGE_KEY = "boda_active_coupon";
const DEFAULT_COUPON_RATE = 0.02;
const GOVERNORATE_STORAGE_KEY = "buda_governorate";

function formatCheckoutMoney(value, plain) {
  return window.BudaStore ? window.BudaStore.formatMoney(value, { minimumFractionDigits: 2, maximumFractionDigits: 2, plain: !!plain }) : (Number(value) || 0).toFixed(2);
}

function getCheckoutCurrency() {
  return window.BudaStore ? window.BudaStore.getCurrencyLabel() : "جنيه";
}

function getActiveCoupon() {
  try {
    const raw = localStorage.getItem(COUPON_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const code = String(parsed?.code || "").trim();
    const rate = Number(parsed?.rate) || DEFAULT_COUPON_RATE;
    if (!code || !(rate > 0)) return null;
    return { code, rate };
  } catch {
    return null;
  }
}

function calculateCouponDiscount(subtotal, coupon) {
  const base = Math.max(0, Number(subtotal) || 0);
  var rate = Number(coupon?.rate) || 0;
  if (base <= 0 || rate <= 0) return 0;
  if (rate > 1) rate = rate / 100;
  return Math.max(0, Math.round(base * rate * 100) / 100);
}

function checkoutNotify(message, type = "info") {
  if (window.BudaUI?.notify) {
    window.BudaUI.notify(message, { type, target: "#ch-status" });
    return;
  }

  const status = document.getElementById("ch-status");
  if (!status) return;
  status.textContent = message;
  status.classList.remove("hidden", "error", "success", "info");
  status.classList.add(type === "error" ? "error" : type === "success" ? "success" : "info");
}

function getCheckoutCart() {
  if (!window.BudaStore || typeof window.BudaStore.getCart !== "function") return [];
  return window.BudaStore.getCart();
}

function getCheckoutItemPrice(item) {
  var price = Number(item.price) || Number(item.currentPrice) || Number(item.finalPrice) || 0;
  if (window.PricingEngine?.tiersLoaded && price > 0) {
    var itemId = String(item.id ?? item.product_id ?? "");
    var linkedProduct = itemId && window.BudaStore?.getProductById
      ? window.BudaStore.getProductById(itemId)
      : null;
    var rawPrice = linkedProduct ? Number(linkedProduct.price) || 0 : 0;
    if (rawPrice > 0 && price === rawPrice) {
      price = window.PricingEngine.calculate(rawPrice);
    }
  }
  return price;
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem("currentUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getUserEmail() {
  return (
    localStorage.getItem("userEmail") ||
    getCurrentUser()?.email ||
    ""
  )
    .toString()
    .trim()
    .toLowerCase();
}

function getEmailCandidates(email) {
  const seed = [
    String(email || "").trim(),
    String(localStorage.getItem("userEmail") || "").trim(),
    String(getCurrentUser()?.email || "").trim(),
  ].filter(Boolean);

  const expanded = new Set();
  seed.forEach((value) => {
    expanded.add(value);
    expanded.add(value.toLowerCase());
  });

  return Array.from(expanded);
}

function getCountryCode() {
  try {
    var userCountry = localStorage.getItem("userCountry");
    if (userCountry) return userCountry.toUpperCase();
    const selected = window.TaagerIntegration?.getSelectedCountry?.();
    return selected?.code || "EG";
  } catch {
    return "EG";
  }
}

function getAddressKey(email, countryCode) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedCountry = String(countryCode || "EG").toUpperCase();
  return `buda_saved_addresses_${normalizedEmail}_${normalizedCountry}`;
}

function getSelectedAddressKey(email, countryCode) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedCountry = String(countryCode || "EG").toUpperCase();
  return `buda_selected_address_${normalizedEmail}_${normalizedCountry}`;
}

function getSavedAccountAddress(email) {
  const countryCode = getCountryCode();
  const otherCountryCode = countryCode === "EG" ? "SA" : "EG";
  const candidates = getEmailCandidates(email);
  if (!candidates.length) return "";

  const countriesToCheck = [countryCode, otherCountryCode];

  for (const checkCountryCode of countriesToCheck) {
    for (const keyEmail of candidates) {
      const selectedKey = getSelectedAddressKey(keyEmail, checkCountryCode);
      const selectedRaw = localStorage.getItem(selectedKey) || "";
      if (!selectedRaw.trim()) continue;

      let selectedId = "";
      try {
        selectedId = JSON.parse(selectedRaw);
      } catch {
        selectedId = selectedRaw.trim();
      }
      if (!selectedId) continue;

      try {
        const listKey = getAddressKey(keyEmail, checkCountryCode);
        const list = JSON.parse(localStorage.getItem(listKey) || "[]");
        if (Array.isArray(list) && list.length) {
          const addr = list.find(a => String(a.id) === String(selectedId));
          if (addr && addr.fullAddress) return addr.fullAddress.trim();
          if (addr) {
            const parts = [addr.building, addr.street, addr.area, addr.city, addr.country]
              .filter(Boolean).join(", ");
            if (parts) return parts.trim();
          }
        }
      } catch {}

      try {
        const listKey = getAddressKey(keyEmail, checkCountryCode);
        const list = JSON.parse(localStorage.getItem(listKey) || "[]");
        if (Array.isArray(list) && list.length) {
          const first = list[0];
          if (first && first.fullAddress) return first.fullAddress.trim();
          if (first && first.address) return first.address;
          if (first && typeof first === "string") return first;
        }
      } catch {}
    }
  }

  return "";
}

function upsertAddressForUser(email, address) {
  const countryCode = getCountryCode();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedAddress = String(address || "").trim();
  const normalizedCountry = String(countryCode || "EG").toUpperCase();
  if (!normalizedEmail || !normalizedAddress) return;

  const listKey = `buda_saved_addresses_${normalizedEmail}_${normalizedCountry}`;
  const selectedKey = `buda_selected_address_${normalizedEmail}_${normalizedCountry}`;

  let list = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(listKey) || "[]");
    list = Array.isArray(parsed) ? parsed.map((item) => String(item || "").trim()).filter(Boolean) : [];
  } catch {
    list = [];
  }

  const existingIndex = list.findIndex((item) => item === normalizedAddress);
  if (existingIndex !== -1) {
    list.splice(existingIndex, 1);
  }
  list.unshift(normalizedAddress);

  localStorage.setItem(listKey, JSON.stringify(list.slice(0, 10)));
  localStorage.setItem(selectedKey, normalizedAddress);
}

function fillFieldIfEmpty(id, value) {
  const input = document.getElementById(id);
  if (!input) return;

  if (!String(input.value || "").trim() && String(value || "").trim()) {
    input.value = String(value || "").trim();
  }
}

/* ========================================================================
   RECEIVER DISPLAY / FORM TOGGLE (Noon-style)
   ======================================================================== */
function renderSavedContacts() {
  var container = document.getElementById("ch-receiver-contacts");
  if (!container) return;

  var savedName = localStorage.getItem("userFullName") || "";
  var savedPhone = localStorage.getItem("userPhone") || "";
  var currentName = localStorage.getItem("userFullName") || "";
  var currentPhone = localStorage.getItem("userPhone") || "";

  var contacts = [];
  try {
    var raw = localStorage.getItem("boda_receiver_contacts");
    if (raw) contacts = JSON.parse(raw);
  } catch {}

  // add current user as primary if available
  var hasCurrent = contacts.some(function (c) { return c.phone === savedPhone; });
  if (savedName && savedPhone && !hasCurrent) {
    contacts.unshift({ name: savedName, phone: savedPhone, primary: true });
  }

  if (!contacts.length) {
    container.innerHTML = '<div style="padding:20px;text-align:center;color:#9ba0b1;font-size:0.85rem;">لا توجد أرقام محفوظة</div>';
    return;
  }

  var html = "";
  for (var i = 0; i < contacts.length; i++) {
    var c = contacts[i];
    var initials = c.name.split(" ").map(function (w) { return w[0]; }).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
    var selected = c.phone === currentPhone ? " selected" : "";
    html += '<button type="button" class="ch-receiver-contact' + selected + '" data-phone="' + c.phone.replace(/"/g, "&quot;") + '" data-name="' + c.name.replace(/"/g, "&quot;") + '">' +
      '<span class="ch-receiver-contact-avatar">' + initials + '</span>' +
      '<span class="ch-receiver-contact-body">' +
      '<span class="ch-receiver-contact-name">' + c.name + '</span>' +
      '<span class="ch-receiver-contact-phone">' + c.phone + '</span>' +
      '</span>' +
      (c.primary ? '<span class="ch-receiver-contact-badge">الأساسي</span>' : '') +
      '<span class="ch-receiver-contact-radio"></span>' +
      '</button>';
  }
  container.innerHTML = html;

  // Bind contact selection
  container.querySelectorAll(".ch-receiver-contact").forEach(function (btn) {
    btn.addEventListener("click", function () {
      container.querySelectorAll(".ch-receiver-contact").forEach(function (b) { b.classList.remove("selected"); });
      this.classList.add("selected");
      var nameInput = document.getElementById("ch-receiver-modal-name");
      var phoneInput = document.getElementById("ch-receiver-modal-phone");
      if (nameInput) nameInput.value = this.getAttribute("data-name");
      if (phoneInput) phoneInput.value = this.getAttribute("data-phone");
    });
  });
}

function setupReceiverSection() {
  var display = document.getElementById("ch-receiver-display");
  var nameEl = document.getElementById("ch-receiver-name");
  var phoneEl = document.getElementById("ch-receiver-phone");
  var nameInput = document.getElementById("ch-name");
  var phoneInput = document.getElementById("ch-phone");

  if (!display) return;

  var savedName = localStorage.getItem("userFullName") || "";
  var savedPhone = localStorage.getItem("userPhone") || "";
  var isVerified = localStorage.getItem("userPhoneVerified") === "true";

  if (savedName && savedPhone && isVerified) {
    if (nameEl) nameEl.textContent = savedName;
    if (phoneEl) phoneEl.textContent = savedPhone;
    if (nameInput) nameInput.value = savedName;
    if (phoneInput) phoneInput.value = savedPhone;
    display.classList.remove("hidden");
    updateReceiverDisplay(true);
    var titleName = document.getElementById("ch-receiver-title-name");
    if (titleName) titleName.textContent = savedName;
  } else {
    display.classList.add("hidden");
    updateReceiverDisplay(false);
    var titleName = document.getElementById("ch-receiver-title-name");
    if (titleName) titleName.textContent = "";
  }

  var receiverBtn = document.getElementById("ch-receiver-btn");
  if (receiverBtn) {
    receiverBtn.addEventListener("click", function () {
      openReceiverModal();
    });
  }
}

/* ========================================================================
   RECEIVER CHANGE MODAL
   ======================================================================== */
function openReceiverModal() {
  var modal = document.getElementById("ch-receiver-modal");
  if (!modal) return;
  // Pre-fill modal with current values
  var nameInput = document.getElementById("ch-receiver-modal-name");
  var phoneInput = document.getElementById("ch-receiver-modal-phone");
  if (nameInput) nameInput.value = localStorage.getItem("userFullName") || "";
  if (phoneInput) phoneInput.value = localStorage.getItem("userPhone") || "";
  renderSavedContacts();
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeReceiverModal() {
  var modal = document.getElementById("ch-receiver-modal");
  if (!modal) return;
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function saveReceiverModal() {
  var nameInput = document.getElementById("ch-receiver-modal-name");
  var phoneInput = document.getElementById("ch-receiver-modal-phone");
  var saveCheck = document.getElementById("ch-receiver-save-check");

  if (!nameInput || !phoneInput) return;
  var name = nameInput.value.trim();
  var phone = phoneInput.value.trim();
  if (!name || !phone) return;

  localStorage.setItem("userFullName", name);
  localStorage.setItem("userPhone", phone);

  // Save to contacts list if checkbox checked
  if (saveCheck && saveCheck.checked) {
    try {
      var raw = localStorage.getItem("boda_receiver_contacts");
      var contacts = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(contacts)) contacts = [];
      var exists = contacts.some(function (c) { return c.phone === phone; });
      if (!exists) {
        contacts.unshift({ name: name, phone: phone, primary: false });
        localStorage.setItem("boda_receiver_contacts", JSON.stringify(contacts.slice(0, 20)));
      }
    } catch {}
  }

  // Update display
  var nameEl = document.getElementById("ch-receiver-name");
  var phoneEl = document.getElementById("ch-receiver-phone");
  if (nameEl) nameEl.textContent = name;
  if (phoneEl) phoneEl.textContent = phone;
  var titleName = document.getElementById("ch-receiver-title-name");
  if (titleName) titleName.textContent = name;

  updateReceiverDisplay(true);
  closeReceiverModal();
}

function updateReceiverDisplay(saved) {
  var badge = document.getElementById("ch-receiver-saved-badge");
  var verified = document.getElementById("ch-receiver-verified");
  if (badge) badge.classList.toggle("hidden", !saved);
  if (verified) verified.classList.toggle("hidden", !saved);
}

/* ========================================================================
   ADDRESS CARD / FORM TOGGLE (Noon-style)
   ======================================================================== */
function setupAddressSection(email) {
  const card = document.getElementById("ch-address-card");
  const form = document.getElementById("ch-address-form");
  const textEl = document.getElementById("ch-address-text");
  const tagEl = document.getElementById("ch-address-tag");
  const addressInput = document.getElementById("ch-address");

  if (!card || !form) return;

  const savedAddress = getSavedAccountAddress(email);

  if (savedAddress) {
    if (textEl) textEl.textContent = savedAddress;
    if (tagEl) tagEl.textContent = "المنزل";
    card.classList.remove("hidden");
    form.classList.add("hidden");
    if (addressInput && !addressInput.value.trim()) {
      addressInput.value = savedAddress;
    }
  } else {
    card.classList.add("hidden");
    form.classList.remove("hidden");
  }

  // Click address card to open address modal
  var addrBtn = document.getElementById("ch-address-btn");
  if (addrBtn) {
    addrBtn.addEventListener("click", openAddressModal);
  }
}

/* ========================================================================
   ADDRESS MODAL — shows saved addresses in a modal
   ======================================================================== */
function getAddressStorageKey() {
  var email = getUserEmail();
  var country = getCountryCode();
  return "buda_saved_addresses_" + email + "_" + country;
}

function getSelectedAddressStorageKey() {
  var email = getUserEmail();
  var country = getCountryCode();
  return "buda_selected_address_" + email + "_" + country;
}

function loadSavedAddresses() {
  try {
    var raw = localStorage.getItem(getAddressStorageKey());
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function getSelectedAddressId() {
  try {
    return localStorage.getItem(getSelectedAddressStorageKey()) || null;
  } catch { return null; }
}

function saveSelectedAddressId(id) {
  try { localStorage.setItem(getSelectedAddressStorageKey(), id); } catch {}
}

function renderAddressModalList() {
  var container = document.getElementById("ch-address-list");
  if (!container) return;

  var addresses = loadSavedAddresses();
  var selectedId = getSelectedAddressId();

  if (!addresses.length) {
    container.innerHTML = '<div class="ch-address-empty">لا توجد عناوين محفوظة</div>';
    return;
  }

  var html = "";
  for (var i = 0; i < addresses.length; i++) {
    var addr = addresses[i];
    var isActive = String(addr.id) === String(selectedId) || addr.isDefault;
    var typeIcon = addr.type === "home" ? "home" : addr.type === "work" ? "work" : "place";
    var displayName = addr.name || (addr.type === "home" ? "المنزل" : addr.type === "work" ? "العمل" : "آخر");
    var displayAddress = addr.fullAddress || [addr.building, addr.street, addr.area].filter(Boolean).join(", ") || "عنوان غير مكتمل";
    var displayPhone = addr.phone || "";

    html += '<div class="ch-address-item' + (isActive ? " active" : "") + '" data-id="' + addr.id + '">';
    if (isActive) html += '<span class="ch-address-item-default">افتراضي</span>';
    html += '<button class="ch-address-item-edit" data-id="' + addr.id + '" title="تعديل العنوان" type="button">';
    html += '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M11.5 1.5L14.5 4.5L5.5 13.5L2 14L2.5 10.5L11.5 1.5Z" stroke="#6b7c93" stroke-width="1.3" stroke-linejoin="round"/><path d="M9.5 3.5L12.5 6.5" stroke="#6b7c93" stroke-width="1.3"/></svg>';
    html += '</button>';
    html += '<div class="ch-address-item-header">';
    html += '<div class="ch-address-item-icon">';
    if (typeIcon === "home") {
      html += '<svg viewBox="0 0 18 18" fill="none"><path d="M2 7L9 1L16 7V15C16 15.5523 15.5523 16 15 16H3C2.44772 16 2 15.5523 2 15V7Z" stroke="#3866df" stroke-width="1.5" stroke-linejoin="round"/><path d="M6.5 16V9.5H11.5V16" stroke="#3866df" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    } else if (typeIcon === "work") {
      html += '<svg viewBox="0 0 18 18" fill="none"><rect x="2" y="5" width="14" height="11" rx="2" stroke="#3866df" stroke-width="1.5"/><path d="M6 5V3C6 2.44772 6.44772 2 7 2H11C11.5523 2 12 2.44772 12 3V5" stroke="#3866df" stroke-width="1.5"/></svg>';
    } else {
      html += '<svg viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3" stroke="#3866df" stroke-width="1.5"/><path d="M9 1C5.13 1 2 4.13 2 8C2 12.25 9 17 9 17C9 17 16 12.25 16 8C16 4.13 12.87 1 9 1Z" stroke="#3866df" stroke-width="1.5"/></svg>';
    }
    html += '</div>';
    html += '<div class="ch-address-item-body">';
    html += '<span class="ch-address-item-label">' + displayName + '</span>';
    html += '<p class="ch-address-item-text">' + displayAddress + '</p>';
    if (displayPhone) html += '<span class="ch-address-item-phone">' + displayPhone + '</span>';
    html += '</div>';
    html += '</div>';
    html += '<div class="ch-address-item-actions">';
    html += '<button class="ch-address-item-delete" data-id="' + addr.id + '">حذف</button>';
    html += '</div>';
    html += '</div>';
  }
  container.innerHTML = html;

  // Click card to select
  container.querySelectorAll(".ch-address-item").forEach(function (el) {
    el.addEventListener("click", function (e) {
      if (e.target.closest(".ch-address-item-delete")) return;
      var id = this.getAttribute("data-id");
      selectAddressFromModal(id);
    });
  });

  // Delete button
  container.querySelectorAll(".ch-address-item-delete").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var id = this.getAttribute("data-id");
      deleteAddressFromModal(id);
    });
  });

  // Edit button — redirect to addresses page
  container.querySelectorAll(".ch-address-item-edit").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      window.location.href = "addresses.html?redirect=checkout";
    });
  });
}

function selectAddressFromModal(id) {
  var addresses = loadSavedAddresses();
  var addr = addresses.find(function (a) { return String(a.id) === String(id); });
  if (!addr) return;

  var email = getUserEmail();
  saveSelectedAddressId(id);

  var text = addr.fullAddress || [addr.building, addr.street, addr.area].filter(Boolean).join(", ") || "";
  if (text) {
    upsertAddressForUser(email, text);
  }

  var textEl = document.getElementById("ch-address-text");
  var tagEl = document.getElementById("ch-address-tag");
  var addressInput = document.getElementById("ch-address");
  if (textEl) textEl.textContent = text;
  if (tagEl) tagEl.textContent = addr.name || "المنزل";
  if (addressInput) {
    // Preserve governorate prefix
    var govName = selectedGovernorate || "";
    if (govName && text.indexOf(govName + " - ") !== 0) {
      addressInput.value = govName + " - " + text;
    } else {
      addressInput.value = text;
    }
  }

  closeAddressModal();
  renderAddressModalList();
}

function deleteAddressFromModal(id) {
  var addresses = loadSavedAddresses();
  var filtered = addresses.filter(function (a) { return String(a.id) !== String(id); });
  try { localStorage.setItem(getAddressStorageKey(), JSON.stringify(filtered)); } catch {}
  var selectedId = getSelectedAddressId();
  if (String(selectedId) === String(id)) {
    try { localStorage.removeItem(getSelectedAddressStorageKey()); } catch {}
  }
  renderAddressModalList();
}

function openAddressModal() {
  var modal = document.getElementById("ch-address-modal");
  if (!modal) return;
  renderAddressModalList();
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeAddressModal() {
  var modal = document.getElementById("ch-address-modal");
  if (!modal) return;
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

/* ========================================================================
   GOVERNORATE — show once, then save & auto-calc shipping
   ======================================================================== */
function setupGovernorateSection() {
  var govKey = getGovernorateKey();
  var savedGov = "";
  try { savedGov = localStorage.getItem(govKey) || ""; } catch {}
  savedGov = savedGov.trim();

  var selector = document.getElementById("ch-gov-selector");
  var display = document.getElementById("ch-gov-display");
  var displayName = document.getElementById("ch-gov-display-name");
  var displayFee = document.getElementById("ch-gov-display-fee");

  if (!selector || !display) return;

  var titleEl = document.getElementById("ch-gov-card-title");
  var labelEl = document.getElementById("ch-gov-display-label");
  if (titleEl) titleEl.textContent = getGovernorateLabel();
  if (labelEl) labelEl.textContent = getGovernorateLabel();
  var placeholder = document.getElementById("ch-gov-placeholder");
  if (placeholder) placeholder.textContent = getGovernoratePlaceholder();

  if (savedGov) {
    selector.classList.add("hidden");
    display.classList.remove("hidden");
    display.style.display = "";
    if (displayName) displayName.textContent = savedGov;
    setGovernorate(savedGov);
    var fee = getShippingCost();
    var currency = getCheckoutCurrency();
    if (displayFee) {
      displayFee.textContent = (Number(fee) || 0) > 0
        ? "رسوم الشحن " + (Number(fee) || 0).toFixed(2) + " " + currency
        : "";
    }
  } else {
    selector.classList.remove("hidden");
    display.style.display = "none";
    display.classList.add("hidden");
  }

  // Change button
  var changeBtn = document.getElementById("ch-gov-change-btn");
  if (changeBtn) {
    changeBtn.addEventListener("click", function () {
      selector.classList.remove("hidden");
      display.style.display = "none";
      display.classList.add("hidden");
    });
  }
}

function saveGovernorate(name) {
  var govKey = getGovernorateKey();
  try { localStorage.setItem(govKey, name); } catch {}
}

function clearGovernorate() {
  var govKey = getGovernorateKey();
  try { localStorage.removeItem(govKey); } catch {}
}

function prefillCheckoutFields() {
  const user = getCurrentUser();
  const email = getUserEmail();

  fillFieldIfEmpty("ch-name", localStorage.getItem("userFullName") || user?.name || "");
  fillFieldIfEmpty("ch-email", email);

  var phoneEl = document.getElementById("ch-phone");
  var isVerified = localStorage.getItem("userPhoneVerified") === "true";
  var storedPhone = localStorage.getItem("userPhone") || "";
  if (isVerified && storedPhone) {
    if (phoneEl) {
      phoneEl.value = storedPhone;
      phoneEl.readOnly = true;
      phoneEl.style.backgroundColor = "var(--ch-border-light, #f0f2f7)";
      phoneEl.style.color = "var(--ch-muted, #6b7c93)";
      phoneEl.style.cursor = "not-allowed";
    }
  } else {
    fillFieldIfEmpty("ch-phone", storedPhone);
  }

  fillFieldIfEmpty("ch-address", getSavedAccountAddress(email));

  setupAddressSection(email);
}

/* ========================================================================
   ORDER ITEMS (shipment-style)
   ======================================================================== */
function renderCheckoutItems() {
  const container = document.getElementById("ch-items");
  const countEl = document.getElementById("ch-items-count");
  if (!container) return;

  const cart = getCheckoutCart();
  if (!cart.length) {
    container.innerHTML = '<div class="ch-card" style="padding:40px;text-align:center;color:var(--ch-muted);"><p>السلة فارغة.</p></div>';
    if (countEl) countEl.textContent = "0 منتجات";
    return;
  }

  if (countEl) countEl.textContent = cart.length + " " + (cart.length === 1 ? "منتج" : "منتجات");

  var html = "";
  for (var i = 0; i < cart.length; i++) {
    var item = cart[i];
    var quantity = Number(item.quantity) || 1;
    var price = getCheckoutItemPrice(item);
    var lineTotal = price * quantity;
    var img = item.image || item.image_url || item.thumbnail || "";
    var name = item.name || item.product_name || "منتج";

    // Get delivery estimate (5-6 days from now)
    var days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    var future = new Date();
    future.setDate(future.getDate() + 5 + Math.floor(Math.random() * 2)); // 5-6 days
    var dayName = days[future.getDay()];
    var dayNum = future.getDate();
    var monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    var monthName = monthNames[future.getMonth()];
    var deliveryDate = dayName + "، " + dayNum + " " + monthName;

    html += '<div class="ch-item-shipment">';
    html += '<div class="ch-item-shipment-header">';
    html += '<p class="ch-item-shipment-title">شحنة ' + (i + 1) + '</p>';
    html += '<span class="ch-item-shipment-count">منتج واحد</span>';
    html += '</div>';
    html += '<div class="ch-item-scroller">';
    html += '<div class="ch-item">';
    html += '<div class="ch-item-img-col">';
    html += '<div class="ch-item-img-wrap">';
    html += '<img class="ch-item-img" src="' + img + '" alt="' + name.replace(/"/g, "&quot;") + '" loading="lazy" onerror="this.style.display=\'none\'" />';
    html += '</div>';
    html += '<span class="ch-item-qty-badge">x' + quantity + '</span>';
    html += '</div>';
    html += '<div class="ch-item-details">';
    html += '<div class="ch-item-title-row">';
    html += '<div class="ch-item-name">' + name + '</div>';
    html += '<div class="ch-item-price-area">';
    html += '<span class="ch-item-price-num">' + (Number(lineTotal) || 0).toFixed(2) + '</span>';
    html += '<span class="ch-item-price-cur">' + getCheckoutCurrency() + '</span>';
    html += '</div>';
    html += '</div>';
    html += '<div class="ch-item-details-content"></div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    html += '<div class="ch-item-strip">';
    html += '<div class="ch-item-strip-text">احصل عليها <b>' + deliveryDate + '</b></div>';
    html += '<div class="ch-item-strip-badge">';
    html += '<span class="ch-item-strip-icon">';
    html += '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 5H14V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V5Z" fill="#3866df" opacity="0.2"/><path d="M2 5H14M6 2V5M10 2V5M3 8H5M7 8H9M11 8H13M3 11H5M7 11H9M11 11H13" stroke="#3866df" stroke-width="1.2" stroke-linecap="round"/></svg>';
    html += '</span>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
  }

  container.innerHTML = html;
}

var selectedPayment = "cod";
var selectedGovernorate = "";
var governorateShippingFee = 0;

function isSaudiArabia() {
  return window.ShippingZones?.isSaudiArabia?.() === true;
}

function getGovernorateKey() {
  var email = getUserEmail();
  var country = getCountryCode();
  return GOVERNORATE_STORAGE_KEY + "_" + email + "_" + country;
}

function getGovernorateLabel() {
  return isSaudiArabia() ? "المدينة" : "المحافظة";
}

function getGovernoratePlaceholder() {
  return isSaudiArabia() ? "اختر المدينة" : "اختر المحافظة";
}

function selectPayment(el) {
  document.querySelectorAll(".ch-payment-option").forEach(function (card) { card.classList.remove("selected"); });
  el.classList.add("selected");
  selectedPayment = el.getAttribute("data-payment") || "cod";
}

function setGovernorate(name) {
  selectedGovernorate = name;
  governorateShippingFee = window.ShippingZones ? window.ShippingZones.getCurrentFee(name) : 0;

  var sel = document.getElementById("ch-governorate");
  var placeholder = document.getElementById("ch-gov-placeholder");
  var hiddenInput = document.getElementById("ch-gov-input");
  if (placeholder) {
    placeholder.textContent = name;
    placeholder.classList.add("selected");
  }
  if (hiddenInput) hiddenInput.value = name;
  if (sel) sel.classList.add("ch-sheet-open");

  var titleEl = document.getElementById("ch-gov-card-title");
  var labelEl = document.getElementById("ch-gov-display-label");
  if (titleEl) titleEl.textContent = getGovernorateLabel();
  if (labelEl) labelEl.textContent = getGovernorateLabel();

  var addrInput = document.getElementById("ch-address");
  if (addrInput) {
    var current = addrInput.value.trim();
    if (current && current.indexOf(name + " - ") !== 0) {
      addrInput.value = name + " - " + current;
    }
  }

  // Auto-save governorate and switch to display mode
  saveGovernorate(name);

  var selector = document.getElementById("ch-gov-selector");
  var display = document.getElementById("ch-gov-display");
  var displayName = document.getElementById("ch-gov-display-name");
  var displayFee = document.getElementById("ch-gov-display-fee");
  if (selector && display) {
    if (!selector.classList.contains("hidden")) {
      selector.classList.add("hidden");
      display.classList.remove("hidden");
      display.style.display = "";
    }
    if (displayName) displayName.textContent = name;
    var currency = getCheckoutCurrency();
    if (displayFee) {
      displayFee.textContent = (Number(governorateShippingFee) || 0) > 0
        ? "رسوم الشحن " + (Number(governorateShippingFee) || 0).toFixed(2) + " " + currency
        : "";
    }
  }

  renderCheckoutTotals();
}

/* === GOVERNORATE BOTTOM SHEET === */
function openGovernorateSheet() {
  var sheet = document.getElementById("governorate-sheet");
  if (sheet) {
    sheet.classList.add("active");
    sheet.setAttribute("aria-hidden", "false");
  }
  var headerTitle = sheet?.querySelector("h3");
  if (headerTitle) headerTitle.textContent = getGovernorateLabel();
  renderGovernorateList();
  setTimeout(function () {
    var searchInput = document.getElementById("governorate-search");
    if (searchInput) searchInput.focus();
  }, 300);
}

function closeGovernorateSheet() {
  var sheet = document.getElementById("governorate-sheet");
  if (sheet) {
    sheet.classList.remove("active");
    sheet.setAttribute("aria-hidden", "true");
  }
  var searchInput = document.getElementById("governorate-search");
  if (searchInput) searchInput.value = "";
}

function renderGovernorateList(query) {
  var list = document.getElementById("governorate-list");
  if (!list) return;

  var zones = window.ShippingZones ? window.ShippingZones.getCurrentGrouped() : [];
  var filtered = [];
  if (query && query.trim()) {
    var q = query.trim().toLowerCase();
    var searchResults = window.ShippingZones ? window.ShippingZones.searchCurrent(q) : [];
    var grouped = {};
    for (var i = 0; i < searchResults.length; i++) {
      var fee = searchResults[i].fee;
      if (!grouped[fee]) grouped[fee] = { fee: fee, label: "رسوم الشحن " + fee + " " + (isSaudiArabia() ? "ريال" : "جنيه"), cities: [] };
      grouped[fee].cities.push(searchResults[i].name);
    }
    filtered = Object.values(grouped);
  } else {
    filtered = zones;
  }

  if (!filtered.length || !filtered.reduce(function (s, z) { return s + z.cities.length; }, 0)) {
    list.innerHTML = '<div class="governorate-search-empty">لا توجد نتائج</div>';
    return;
  }

  var html = "";
  for (var zi = 0; zi < filtered.length; zi++) {
    var zone = filtered[zi];
    html += '<div class="governorate-group-label">' + zone.label + '</div>';
    for (var ci = 0; ci < zone.cities.length; ci++) {
      var city = zone.cities[ci];
      var isSelected = city === selectedGovernorate;
      html += '<div class="governorate-item' + (isSelected ? " selected" : "") + '" data-city="' + city.replace(/"/g, "\"") + '">' +
        '<span>' + city + '</span>' +
        '<span class="material-icons-outlined gov-check">check</span></div>';
    }
  }
  list.innerHTML = html;

  list.querySelectorAll(".governorate-item").forEach(function (item) {
    item.addEventListener("click", function () {
      var city = this.getAttribute("data-city");
      if (city) {
        setGovernorate(city);
        closeGovernorateSheet();
      }
    });
  });
}

function getShippingCost() {
  return governorateShippingFee > 0 ? governorateShippingFee : 0;
}

function renderCheckoutTotals() {
  const cart = getCheckoutCart();
  if (!cart.length) {
    checkoutNotify("السلة فارغة، سيتم تحويلك إلى صفحة السلة.", "error");
    window.location.href = "empty-cart.html";
    return null;
  }

  const subtotal = cart.reduce(
    (total, item) => total + getCheckoutItemPrice(item) * (Number(item.quantity) || 1),
    0
  );
  const activeCoupon = getActiveCoupon();
  const couponDiscount = calculateCouponDiscount(subtotal, activeCoupon);
  var shippingCost = getShippingCost();
  const total = Math.max(subtotal + shippingCost + getCheckoutCodFee() - couponDiscount, 0);

  const subtotalEl = document.getElementById("ch-subtotal");
  const shippingEl = document.getElementById("ch-shipping");
  const taxEl = document.getElementById("ch-tax");
  const discountRowEl = document.getElementById("ch-discount-row");
  const discountEl = document.getElementById("ch-discount");
  const grandTotalEl = document.getElementById("ch-grand-total");
  const footerTotalEl = document.getElementById("ch-footer-total");

  if (subtotalEl) subtotalEl.innerHTML = formatCheckoutMoney(subtotal);
  if (shippingEl) shippingEl.innerHTML = shippingCost > 0 ? formatCheckoutMoney(shippingCost) : "--";
  if (taxEl) taxEl.innerHTML = formatCheckoutMoney(getCheckoutCodFee());
  if (discountRowEl) {
    discountRowEl.classList.toggle("hidden", couponDiscount <= 0);
  }
  if (discountEl) {
    discountEl.innerHTML = "-" + formatCheckoutMoney(couponDiscount);
  }
  if (grandTotalEl) grandTotalEl.innerHTML = formatCheckoutMoney(total);
  if (footerTotalEl) footerTotalEl.innerHTML = formatCheckoutMoney(total);

  return {
    subtotal,
    total,
    couponDiscount,
    couponCode: activeCoupon?.code || "",
    shipping: shippingCost,
    codFee: getCheckoutCodFee(),
  };
}

function readCustomerInputs() {
  const name = document.getElementById("ch-name")?.value.trim() || "";
  const email = document.getElementById("ch-email")?.value.trim().toLowerCase() || "";
  const phone = document.getElementById("ch-phone")?.value.trim() || "";
  const address = document.getElementById("ch-address")?.value.trim() || "";
  const governorate = document.getElementById("ch-gov-input")?.value.trim() || "";
  return { name, email, phone, address, governorate };
}

function validateCheckoutFields({ name, email, phone, address, governorate }) {
  if (!governorate) {
    return "الرجاء اختيار " + getGovernorateLabel() + ".";
  }
  if (!name || !email || !phone || !address) {
    return "جميع الحقول مطلوبة لإتمام الطلب.";
  }
  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!emailRegex.test(email)) {
    return "الرجاء إدخال بريد إلكتروني صحيح.";
  }
  const phoneRegex = /^[0-9+\s()-]{8,20}$/;
  if (!phoneRegex.test(phone)) {
    return "الرجاء إدخال رقم هاتف صحيح.";
  }
  return "";
}

function getCurrentUserId() {
  try {
    const raw = localStorage.getItem("currentUser");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id || null;
  } catch {
    return null;
  }
}

async function handleConfirmClick(event) {
  event.preventDefault();

  const confirmBtn = document.getElementById("ch-confirm-btn");
  const confirmBtnMobile = document.getElementById("ch-confirm-mobile");
  const cart = getCheckoutCart();
  if (!cart.length) {
    checkoutNotify("السلة فارغة.", "error");
    window.location.href = "empty-cart.html";
    return;
  }

  if (localStorage.getItem("userPhoneVerified") !== "true") {
    if (window.PhoneVerification) {
checkoutNotify("يرجى التحقق من رقم الهاتف أولاً.", "info");
      await new Promise(function (resolve) {
        var checkoutPhoneCountry = (function () {
        var sc = window.TaagerIntegration && window.TaagerIntegration.getSelectedCountry ? window.TaagerIntegration.getSelectedCountry() : null;
        return sc ? (sc.code || sc.countryCode || "") : "";
      })();
      window.PhoneVerification.show(getUserEmail(), function (phone) {
          var phoneEl = document.getElementById("ch-phone");
          if (phoneEl) {
            phoneEl.value = phone;
            phoneEl.readOnly = true;
            phoneEl.style.backgroundColor = "var(--ch-border-light, #f0f2f7)";
            phoneEl.style.color = "var(--ch-muted, #6b7c93)";
            phoneEl.style.cursor = "not-allowed";
          }
          resolve();
        }, {
          prefillPhone: localStorage.getItem("userPhone") || "",
          prefillCountry: localStorage.getItem("userPhoneCountry")
            || checkoutPhoneCountry
            || localStorage.getItem("userCountry")
            || "SA"
        });
      });
    }
  }

  const fields = readCustomerInputs();
  const validationError = validateCheckoutFields(fields);
  if (validationError) {
    checkoutNotify(validationError, "error");
    return;
  }

  const totals = renderCheckoutTotals();
  if (!totals) return;

  if (!window.supabaseClient || typeof window.supabaseClient.createOrder !== "function") {
    checkoutNotify("خدمة الطلبات غير متاحة الآن. حاول مرة أخرى.", "error");
    return;
  }

  var selectedCountry = window.TaagerIntegration
    ? window.TaagerIntegration.getSelectedCountry()
    : null;

  const totalItems = cart.length;
  var completedItems = 0;
  var hasError = false;

  function updateProgress() {
    var progressText = "جاري إرسال الطلب " + completedItems + " من " + totalItems + "...";
    if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.innerHTML = '<span class="ch-spinner"></span> ' + progressText; }
    if (confirmBtnMobile) { confirmBtnMobile.disabled = true; confirmBtnMobile.innerHTML = '<span class="ch-spinner"></span> ' + progressText; }
    checkoutNotify(progressText, "info");
  }

  updateProgress();

  for (var i = 0; i < cart.length; i++) {
    var item = cart[i];
    var quantity = Number(item.quantity) || 1;
    var price = getCheckoutItemPrice(item);
    var itemTotal = price * quantity;

    completedItems = i + 1;
    updateProgress();

    var sellerEmail = String(item.seller_email || item.owner_email || "").trim().toLowerCase();
    var ownerEmail = String(item.owner_email || item.seller_email || "").trim().toLowerCase();

    var itemCouponDiscount = totals.subtotal > 0 ? Math.round((itemTotal / totals.subtotal) * totals.couponDiscount * 100) / 100 : 0;
    var discountedTotal = Math.max(itemTotal - itemCouponDiscount, 0);
    var grandTotal = discountedTotal + totals.shipping + getCheckoutCodFee();

    var singleOrder = {
      user_name: fields.name,
      user_email: fields.email,
      phone: fields.phone,
      address: fields.address,
      governorate: fields.governorate,
      status: "قيد المراجعة",
      total_price: grandTotal,
      discount: itemCouponDiscount,
      coupon_code: totals.couponCode || null,
      payment_method: selectedPayment,
      shipping_method: "standard",
      shipping_cost: totals.shipping,
      tax: getCheckoutCodFee(),
      user_id: getCurrentUserId(),
      items_json: JSON.stringify([item]),
      order_source: "taager",
      country_code: selectedCountry ? selectedCountry.code : "",
      taager_order_status: "not_submitted",
      seller_email: sellerEmail || undefined,
      owner_email: ownerEmail || undefined,
      receiver_name: localStorage.getItem("userFullName") || "",
      receiver_phone: localStorage.getItem("userPhone") || "",
    };

    try {
      await window.supabaseClient.createOrder(singleOrder, [item]);
    } catch (error) {
      // Retry once after 3s if Supabase is sleeping (401)
      if (error?.message?.indexOf("Invalid API key") !== -1 || error?.message?.indexOf("401") !== -1) {
        checkoutNotify("مشروع Supabase نايم، جاري إعادة المحاولة...", "info");
        await new Promise(function (r) { setTimeout(r, 3000); });
        try {
          await window.supabaseClient.createOrder(singleOrder, [item]);
        } catch (retryError) {
          console.error("فشل إرسال منتج " + (i + 1) + " (بعد إعادة المحاولة)", retryError);
          hasError = true;
        }
      } else {
        console.error("فشل إرسال منتج " + (i + 1), error);
        hasError = true;
      }
    }
  }

  localStorage.setItem("userEmail", fields.email);
  localStorage.setItem("userFullName", fields.name);
  if (fields.phone) localStorage.setItem("userPhone", fields.phone);
  upsertAddressForUser(fields.email, fields.address);

  if (window.BudaStore && typeof window.BudaStore.clearCart === "function") {
    window.BudaStore.clearCart();
  }
  localStorage.removeItem(COUPON_STORAGE_KEY);

  if (hasError) {
    checkoutNotify("تم إرسال بعض الطلبات، لكن حدث خطأ في البعض الآخر.", "error");
  } else {
    checkoutNotify("تم إرسال جميع الطلبات بنجاح.", "success");
    setTimeout(function () {
      startConfirmAnimation(cart, fields, totals);
    }, 500);
  }
}

/* ========================================================================
   CONFIRMATION ANIMATION
   ======================================================================== */
var chLottieAnims = {};
var chLottieStageData = {
  "ch-stage-2": "truck",
  "ch-stage-3": "success"
};
function chPlayStageLottie(id) {
  var dataKey = chLottieStageData[id];
  if (!dataKey) return;
  var stage = document.getElementById(id);
  var container = stage ? stage.querySelector(".ch-lottie-holder") : null;
  if (!container || !window.lottie) return;
  var anim = chLottieAnims[id];
  if (anim) { anim.goToAndPlay(0, true); return; }
  var data = (window.BUDOQ_LOTTIE && window.BUDOQ_LOTTIE[dataKey]) || null;
  if (!data) return;
  chLottieAnims[id] = lottie.loadAnimation({
    container: container,
    renderer: "svg",
    loop: false,
    autoplay: true,
    animationData: data
  });
}

function showConfirmStage(id) {
  document.querySelectorAll(".ch-confirm-stage").forEach(function (s) { s.classList.add("hidden"); });
  var el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
  chPlayStageLottie(id);
}

function startConfirmAnimation(cart, fields, totals) {
  if (window.Analytics && cart) {
    Analytics.trackPurchase({ id: fields?.order_id || Date.now(), total: totals?.total || 0 }, cart);
    Analytics.trackBeginCheckout(cart);
  }
  var countryCode = "EG";
  try {
    var selected = window.TaagerIntegration && typeof window.TaagerIntegration.getSelectedCountry === "function"
      ? window.TaagerIntegration.getSelectedCountry()
      : null;
    if (selected && selected.code) {
      countryCode = String(selected.code).toUpperCase();
    } else if (localStorage.getItem("userCountry")) {
      countryCode = String(localStorage.getItem("userCountry")).toUpperCase();
    }
  } catch (e) {}
  sessionStorage.setItem("orderSuccessData", JSON.stringify({
    cart: cart,
    fields: fields,
    totals: totals,
    country_code: countryCode,
    date: new Date().toISOString(),
  }));

  var overlay = document.getElementById("ch-confirm-overlay");
  if (!overlay) { window.location.href = "my-orders.html"; return; }

  overlay.classList.add("active");
  showConfirmStage("ch-stage-1");

  setTimeout(function () {
    showConfirmStage("ch-stage-2");
  }, 3000);

  setTimeout(function () {
    showConfirmStage("ch-stage-3");
  }, 6000);

  setTimeout(function () {
    window.location.href = "order-success.html";
  }, 8000);
}

/* ========================================================================
   COUPON (Supabase-based)
   ======================================================================== */
async function applyCoupon() {
  var input = document.getElementById("ch-coupon-input");
  var statusEl = document.getElementById("ch-coupon-status");
  var toggleText = document.getElementById("ch-coupon-toggle-text");

  if (!input || !statusEl) return;

  var code = input.value.trim();
  if (!code) {
    statusEl.textContent = "الرجاء إدخال كود الخصم.";
    statusEl.className = "ch-coupon-status error";
    return;
  }

  if (!window.supabaseClient || typeof window.supabaseClient.validateCoupon !== "function") {
    statusEl.textContent = "خدمة الكوبونات غير متاحة الآن.";
    statusEl.className = "ch-coupon-status error";
    return;
  }

  // Disable input & button while validating
  var applyBtn = document.getElementById("ch-coupon-apply");
  if (applyBtn) { applyBtn.disabled = true; applyBtn.textContent = "..."; }
  input.disabled = true;
  statusEl.textContent = "جارٍ التحقق...";
  statusEl.className = "ch-coupon-status info";

  try {
    var result = await window.supabaseClient.validateCoupon(code);
    if (result?.valid) {
      var rate = Number(result.rate) || 0;
      var savedCode = String(result.code || code).trim();
      try {
        localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify({ code: savedCode, rate: rate }));
      } catch {}
      var displayPct = rate > 1 ? rate : Math.round(rate * 100);
      statusEl.textContent = "تم تطبيق الكود! خصم " + displayPct + "%";
      statusEl.className = "ch-coupon-status success";
      if (toggleText) toggleText.textContent = "كود الخصم: " + savedCode;
      input.value = "";
    } else {
      localStorage.removeItem(COUPON_STORAGE_KEY);
      statusEl.textContent = "كود الخصم غير صالح.";
      statusEl.className = "ch-coupon-status error";
      if (toggleText) toggleText.textContent = "هل لديك كود خصم؟";
    }
  } catch (err) {
    localStorage.removeItem(COUPON_STORAGE_KEY);
    statusEl.textContent = "تعذر التحقق من الكوبون الآن.";
    statusEl.className = "ch-coupon-status error";
    console.error("coupon validation failed", err);
  }

  if (applyBtn) { applyBtn.disabled = false; applyBtn.textContent = "تطبيق"; }
  input.disabled = false;
  renderCheckoutTotals();
}

function removeCoupon() {
  localStorage.removeItem(COUPON_STORAGE_KEY);
  var statusEl = document.getElementById("ch-coupon-status");
  var toggleText = document.getElementById("ch-coupon-toggle-text");
  if (statusEl) { statusEl.textContent = "تم إزالة الكود."; statusEl.className = "ch-coupon-status info"; statusEl.style.display = "block"; }
  if (toggleText) toggleText.textContent = "هل لديك كود خصم؟";
  var couponBody = document.getElementById("ch-coupon-body");
  if (couponBody) couponBody.classList.remove("hidden");
  var couponToggle = document.getElementById("ch-coupon-toggle");
  if (couponToggle) {
    var arrow = couponToggle.querySelector(".ch-coupon-arrow");
    if (arrow) arrow.style.display = "";
  }
  var removeBtn = document.getElementById("ch-coupon-remove");
  if (removeBtn) removeBtn.classList.add("hidden");
  renderCheckoutTotals();
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    const confirmBtn = document.getElementById("ch-confirm-btn");
    const confirmBtnMobile = document.getElementById("ch-confirm-mobile");
    if (confirmBtn) confirmBtn.addEventListener("click", handleConfirmClick);
    if (confirmBtnMobile) confirmBtnMobile.addEventListener("click", handleConfirmClick);

    var govSelector = document.getElementById("ch-governorate");
    if (govSelector) {
      govSelector.addEventListener("click", openGovernorateSheet);
    }
    var govCloseBtn = document.getElementById("governorate-close-btn");
    if (govCloseBtn) {
      govCloseBtn.addEventListener("click", closeGovernorateSheet);
    }
    var govBackdrop = document.getElementById("governorate-backdrop");
    if (govBackdrop) {
      govBackdrop.addEventListener("click", closeGovernorateSheet);
    }
    var govSearch = document.getElementById("governorate-search");
    if (govSearch) {
      govSearch.addEventListener("input", function () {
        renderGovernorateList(this.value);
      });
    }

    var placeholder = document.getElementById("ch-gov-placeholder");
    if (placeholder) placeholder.textContent = getGovernoratePlaceholder();

    // Coupon toggle
    var couponToggle = document.getElementById("ch-coupon-toggle");
    var couponBody = document.getElementById("ch-coupon-body");
    if (couponToggle && couponBody) {
      couponToggle.addEventListener("click", function () {
        couponBody.classList.toggle("hidden");
        couponToggle.classList.toggle("open");
      });
    }
    var couponApply = document.getElementById("ch-coupon-apply");
    if (couponApply) {
      couponApply.addEventListener("click", applyCoupon);
    }
    var couponInput = document.getElementById("ch-coupon-input");
    if (couponInput) {
      couponInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          applyCoupon();
        }
      });
    }
    // Restore active coupon display on load
    var activeCoupon = getActiveCoupon();
    if (activeCoupon) {
      var toggleText = document.getElementById("ch-coupon-toggle-text");
      if (toggleText) toggleText.textContent = "تم إضافة كوبون " + activeCoupon.code;
      if (couponBody) couponBody.classList.add("hidden");
      var arrow = couponToggle && couponToggle.querySelector(".ch-coupon-arrow");
      if (arrow) arrow.style.display = "none";
      var removeBtn = document.getElementById("ch-coupon-remove");
      if (removeBtn) removeBtn.classList.remove("hidden");
      if (couponBody) couponBody.classList.remove("hidden");
      if (couponToggle) couponToggle.classList.add("open");
      var statusEl = document.getElementById("ch-coupon-status");
      if (statusEl) { var cp = activeCoupon.rate; var dp = cp > 1 ? cp : Math.round(cp * 100); statusEl.textContent = "خصم " + dp + "% مطبق"; statusEl.className = "ch-coupon-status success"; }
    }

    // Receiver modal
    var modalClose = document.getElementById("ch-receiver-modal-close");
    var modalBackdrop = document.getElementById("ch-receiver-backdrop");
    var modalSaveBtn = document.getElementById("ch-receiver-save-btn");
    if (modalClose) modalClose.addEventListener("click", closeReceiverModal);
    if (modalBackdrop) modalBackdrop.addEventListener("click", closeReceiverModal);
    if (modalSaveBtn) modalSaveBtn.addEventListener("click", saveReceiverModal);

    // Address modal
    var addrModalClose = document.getElementById("ch-address-modal-close");
    var addrModalBackdrop = document.getElementById("ch-address-backdrop");
    var addrAddNew = document.getElementById("ch-address-add-new");
    if (addrModalClose) addrModalClose.addEventListener("click", closeAddressModal);
    if (addrModalBackdrop) addrModalBackdrop.addEventListener("click", closeAddressModal);
    if (addrAddNew) addrAddNew.addEventListener("click", function () {
      window.location.href = "addresses.html?redirect=checkout";
    });

    prefillCheckoutFields();
    setupReceiverSection();
    setupGovernorateSection();
    renderCheckoutItems();
    renderCheckoutTotals();

    // Wake up Supabase project on page load
    if (window.supabaseClient?.from) {
      window.supabaseClient.from("products").select("id", { count: "exact", head: true }).limit(1).then(function () {
        console.log("[supabase] project is awake");
      }).catch(function () {});
    }
  } catch (e) {
    console.error("checkout init error:", e);
  }
});

window.selectPayment = selectPayment;
