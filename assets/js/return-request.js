/* ============================================================
 * إنشاء طلب إرجاع (return-request.html?id=&pid=)
 * ============================================================ */
(function () {
  var state = {
    orderId: "",
    productId: "",
    order: null,
    item: null,
    email: "",
    country: "EG",
    windowInfo: null,
    returnAllowed: true,
    flags: {},
    addresses: [],
    selectedAddress: null,
    images: [],
    submitting: false,
  };

  var page = {
    root: null,
    statusEl: null,
  };

  function notify(message, type) {
    if (window.BudaUI && typeof window.BudaUI.notify === "function") {
      window.BudaUI.notify(message, { type: type || "info", target: "#returns-status" });
      return;
    }
    if (page.statusEl) {
      page.statusEl.textContent = message;
      page.statusEl.className = "status-note " + (type || "info");
      page.statusEl.classList.remove("hidden");
      setTimeout(function () { page.statusEl.classList.add("hidden"); }, 4000);
    }
  }

  function esc(value) {
    return window.BudaReturns.escapeHtml(value);
  }

  function buildVariantChip(item) {
    if (!item) return "";
    var parts = [];
    if (item.selected_color) parts.push("اللون: " + item.selected_color);
    if (item.selected_size) parts.push("المقاس: " + item.selected_size);
    if (Array.isArray(item.selected_options)) {
      for (var i = 0; i < item.selected_options.length; i++) {
        if (item.selected_options[i]) parts.push(String(item.selected_options[i]));
      }
    }
    if (!parts.length && item.variant_label) parts.push(item.variant_label);
    return parts.length ? window.BudaReturns.escapeHtml(parts.join(" / ")) : "";
  }

  function findItemByProductId(order, productId) {
    var items = window.BudaOrders.getOrderItems(order);
    for (var i = 0; i < (items || []).length; i++) {
      var item = items[i];
      var pid = window.BudaReturns.resolveProductId(order, item);
      if (pid && pid.toLowerCase() === String(productId).toLowerCase()) return item;
    }
    return null;
  }

  function buildAddressListHtml() {
    if (!state.addresses.length) {
      return (
        '<div class="rs-address-empty">' +
        "لا توجد عناوين محفوظة لحسابك." +
        ' <a href="addresses.html">إضافة عنوان</a>, أو اكتب عنوان الاستلام في الحقل الإضافي بالأسفل.' +
        "</div>"
      );
    }
    return (
      '<div class="rs-address-list">' +
      state.addresses
        .map(function (addr, i) {
          var isSel = state.selectedAddress && String(addr.id) === String(state.selectedAddress.id);
          var parts = [addr.fullAddress || addr.street, addr.area, addr.building, addr.floor ? "دور " + addr.floor : ""].filter(Boolean);
          return (
            '<div class="rs-address-option' + (isSel ? " is-selected" : "") + '" data-rs-address="' + i + '">' +
            '<div class="rao-name">' + esc(addr.name || addr.type || "عنوان " + (i + 1)) + "</div>" +
            '<div class="rao-detail">' + esc(parts.join(" - ")) + (addr.phone ? " · " + esc(addr.phone) : "") + "</div>" +
            "</div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function renderForm() {
    var isOk = state.windowInfo.eligible && state.returnAllowed;
    var bannerHtml = "";
    var formHtml = "";

    if (!state.returnAllowed) {
      bannerHtml =
        '<div class="rs-window-banner is-blocked"><span class="material-icons-outlined">block</span><div><strong>هذا المنتج غير قابل للإرجاع</strong><br>وفقًا لسياسة البائع لا يقبل هذا المنتج استرجاعًا.</div></div>';
    } else if (!state.windowInfo.eligible) {
      bannerHtml =
        '<div class="rs-window-banner is-blocked"><span class="material-icons-outlined">schedule</span><div><strong>انتهت مهلة الإرجاع</strong><br>المهلة المتاحة للإرجاع هي 14 يومًا من تاريخ الاستلام، وقد تجاوزت هذا الموعد لهذا المنتج.</div></div>';
    } else {
      bannerHtml =
        '<div class="rs-window-banner is-ok"><span class="material-icons-outlined">published_with_changes</span><div><strong>متاح للإرجاع</strong> حتى ' +
        window.BudaReturns.formatDeadline(state.windowInfo.deadline) +
        "</div></div>";
    }

    if (!isOk) {
      formHtml =
        '<div class="rs-empty">' +
        '<div class="rs-empty-icon"><span class="material-icons-outlined" style="font-size:38px;">assignment_return</span></div>' +
        "<h3>لا يمكن تقديم طلب إرجاع لهذا المنتج</h3>" +
        '<a class="rs-btn-return" href="returns.html">العودة إلى المرتجعات</a>' +
        "</div>";
    } else {
      formHtml =
        '<form id="rs-form" novalidate>' +
        '<div class="rs-form-card">' +
        '<h3 class="rs-form-title"><span class="material-icons-outlined">badge</span>بيانات التواصل والعنوان</h3>' +
        '<div class="rs-field-grid">' +
        '<div class="rs-field"><label for="rs-name">الاسم *</label><input class="rs-input" id="rs-name" type="text" autocomplete="name" /></div>' +
        '<div class="rs-field"><label for="rs-phone">رقم الهاتف *</label><input class="rs-input" id="rs-phone" type="tel" inputmode="tel" autocomplete="tel" /></div>' +
        "</div>" +
        '<div class="rs-field"><label>عنوان استلام المرتجع *</label>' + buildAddressListHtml() + "</div>" +
        '<div class="rs-field"><label for="rs-address-manual">عنوان إضافي (اختياري — املأه لو لم تجد عنوانك المحفوظ)</label><textarea class="rs-textarea" id="rs-address-manual" placeholder="المدينة، المنطقة، الشارع، رقم الشقة..."></textarea></div>' +
        "</div>" +
        '<div class="rs-form-card">' +
        '<h3 class="rs-form-title"><span class="material-icons-outlined">assignment_turned_in</span>سبب الإرجاع</h3>' +
        '<div class="rs-field"><label for="rs-reason">سبب الطلب *</label>' +
        '<select class="rs-select" id="rs-reason">' +
        '<option value="">اختر سبب الإرجاع...</option>' +
        '<option value="منتج تالف أو معيب">منتج تالف أو معيب</option>' +
        '<option value="مقاس غير مناسب">مقاس غير مناسب</option>' +
        '<option value="لم يعجبني المنتج">لم يعجبني المنتج</option>' +
        '<option value="توصيل خاطئ / منتج مختلف">توصيل خاطئ / منتج مختلف</option>' +
        '<option value="سبب آخر">سبب آخر</option>' +
        "</select></div>" +
        '<div class="rs-field"><label for="rs-details">تفاصيل إضافية (اختياري)</label><textarea class="rs-textarea" id="rs-details" placeholder="اشرح المشكلة أو سبب الإرجاع بالتفصيل..."></textarea></div>' +
        "</div>" +
        '<div class="rs-form-card">' +
        '<h3 class="rs-form-title"><span class="material-icons-outlined">photo_camera</span>صور المنتج (حتى 3 صور)</h3>' +
        '<div class="rs-upload-grid" id="rs-upload-grid">' +
        '<div class="rs-upload-slot" data-rs-slot="0"><span class="material-icons-outlined">add_a_photo</span>أضف صورة</div>' +
        '<div class="rs-upload-slot" data-rs-slot="1"><span class="material-icons-outlined">add_a_photo</span>أضف صورة</div>' +
        '<div class="rs-upload-slot" data-rs-slot="2"><span class="material-icons-outlined">add_a_photo</span>أضف صورة</div>' +
        "</div>" +
        "<small style='color:#94a3b8;'>صور توضح حالة المنتج تساعدنا على مراجعة طلبك بشكل أسرع.</small>" +
        "</div>" +
        '<div class="rs-submit-bar">' +
        '<button type="submit" class="rs-btn-return" id="rs-submit"><span class="material-icons-outlined" style="font-size:18px;">send</span>إرسال طلب الإرجاع</button>' +
        "</div>" +
        "</form>" +
        '<input type="file" id="rs-file" accept="image/*" hidden multiple />';
    }

    page.root.innerHTML =
      '<div class="rs-form-card">' +
      '<h3 class="rs-form-title"><span class="material-icons-outlined">assignment_return</span>تفاصيل المنتج</h3>' +
      '<div class="rs-product-mini">' +
      window.BudaOrders.buildOrderImageTag(state.item.image || window.BudaOrders.fallbackItemImage(), state.item.name) +
      '<div><p class="rs-pm-name">' + esc(state.item.name) + "</p>" +
      (buildVariantChip(state.item) ? '<p class="rs-pm-sub">' + buildVariantChip(state.item) + "</p>" : "") +
      '<p class="rs-pm-sub">الكمية: ' + (Number(state.item.quantity) || 1) + " · " + window.BudaOrders.formatMoney(Number(state.item.price ?? state.order.total_price) || 0, state.order) + "</p>" +
      "</div></div>" +
      "</div>" +
      bannerHtml +
      formHtml;

    if (isOk) bindForm();
  }

  function readAddressesKeys() {
    return [
      "buda_saved_addresses_" + state.email.toLowerCase() + "_" + state.country,
      "buda_saved_addresses_" + state.email.toLowerCase(),
      "buda_saved_addresses_" + state.country,
    ];
  }

  function readSelectedKey() {
    return "buda_selected_address_" + state.email.toLowerCase() + "_" + state.country;
  }

  async function loadAddresses() {
    state.addresses = [];
    var keys = readAddressesKeys();
    for (var i = 0; i < keys.length; i++) {
      try {
        var raw = localStorage.getItem(keys[i]);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length) {
            state.addresses = parsed;
            break;
          }
        }
      } catch (e) { /* ignore malformed */ }
    }

    if (!state.addresses.length && window.supabaseClient && typeof window.supabaseClient.from === "function") {
      for (var emailVariant of [state.email, state.email.toLowerCase()]) {
        try {
          var resp = await window.supabaseClient.from("user_addresses").select("*").eq("email", emailVariant).order("created_at", { ascending: true });
          if (resp && !resp.error && Array.isArray(resp.data) && resp.data.length) {
            state.addresses = resp.data.map(function (row) {
              return {
                id: row.id,
                name: row.name || row.type || "",
                fullAddress: row.full_address || "",
                street: row.street || "",
                building: row.building || "",
                area: row.area || "",
                floor: row.floor || "",
                phone: row.phone || "",
                type: row.type || "",
                country: row.country || "EG",
              };
            });
            break;
          }
        } catch (e) { /* offline */ }
      }
    }

    var selectedId = null;
    try {
      var selRaw = localStorage.getItem(readSelectedKey());
      if (selRaw) selectedId = JSON.parse(selRaw) || selRaw;
      else selectedId = localStorage.getItem("buda_selected_address");
    } catch (e) { selectedId = null; }
    if (selectedId != null) {
      state.selectedAddress = state.addresses.find(function (a) { return String(a.id) === String(selectedId); }) || null;
    }
    if (!state.selectedAddress && state.addresses.length) {
      state.selectedAddress = state.addresses.find(function (a) { return a.isDefault; }) || state.addresses[0];
    }
  }

  function prefilledFromAddresses() {
    var nameInput = document.getElementById("rs-name");
    var phoneInput = document.getElementById("rs-phone");
    if (nameInput && !nameInput.value.trim() && state.selectedAddress) {
      nameInput.value = state.addresses.find(function (a) { return String(a.id) === String(state.selectedAddress.id); })?.name || state.selectedAddress.name || "";
    }
    if (phoneInput && !phoneInput.value.trim() && state.selectedAddress) {
      phoneInput.value = state.selectedAddress.phone || "";
    }
  }

  function bindAddressSelection() {
    var list = page.root.querySelector(".rs-address-list");
    if (!list) return;
    list.addEventListener("click", function (event) {
      var opt = event.target.closest("[data-rs-address]");
      if (!opt) return;
      var index = Number(opt.getAttribute("data-rs-address"));
      var addr = state.addresses[index];
      if (!addr) return;
      state.selectedAddress = addr;
      page.root.querySelectorAll(".rs-address-option").forEach(function (el, i) {
        el.classList.toggle("is-selected", i === index);
      });
      prefilledFromAddresses();
    });
  }

  /* ---- صور حتى 3 ---- */
  function renderUploadSlots() {
    var grid = document.getElementById("rs-upload-grid");
    if (!grid) return;
    grid.innerHTML = "";
    for (var i = 0; i < 3; i++) {
      var img = state.images[i];
      var slotHtml = "";
      if (img) {
        slotHtml =
          '<img src="' + esc(img.dataUrl) + '" alt="صورة ' + (i + 1) + '" />' +
          '<button type="button" class="rs-upload-remove" data-rs-remove="' + i + '" aria-label="حذف الصورة">×</button>' +
          (img.status ? '<span class="rs-upload-state is-' + img.status + '">' + (img.status === "uploaded" ? "تم الرفع" : img.status === "uploading" ? "جارٍ..." : "فشل الرفع") + "</span>" : "");
      } else {
        slotHtml = '<span class="material-icons-outlined">add_a_photo</span><span>أضف صورة</span>';
      }
      grid.insertAdjacentHTML(
        "beforeend",
        '<div class="rs-upload-slot' + (img ? " is-loaded" : "") + '" data-rs-slot="' + i + '">' + slotHtml + "</div>"
      );
    }
  }

  function bindUploader() {
    var grid = document.getElementById("rs-upload-grid");
    var fileInput = document.getElementById("rs-file");
    if (!grid || !fileInput) return;

    grid.addEventListener("click", function (event) {
      var removeBtn = event.target.closest("[data-rs-remove]");
      if (removeBtn) {
        event.stopPropagation();
        state.images.splice(Number(removeBtn.getAttribute("data-rs-remove")), 1);
        renderUploadSlots();
        return;
      }
      if (state.images.length >= 3) {
        notify("يمكنك إرفاق حتى 3 صور فقط.", "info");
        return;
      }
      if (event.target.closest("[data-rs-slot]")) fileInput.click();
    });

    fileInput.addEventListener("change", function () {
      var files = Array.from(fileInput.files || []);
      files.forEach(function (file) {
        if (state.images.length >= 3) return;
        if (!file.type || file.type.indexOf("image/") !== 0) return;
        var reader = new FileReader();
        reader.onload = function () {
          state.images.push({ file: file, dataUrl: reader.result, status: "" });
          renderUploadSlots();
        };
        reader.readAsDataURL(file);
      });
      fileInput.value = "";
    });
  }

  function validate() {
    var name = document.getElementById("rs-name").value.trim();
    var phone = document.getElementById("rs-phone").value.trim();
    var reason = document.getElementById("rs-reason").value;
    var manual = document.getElementById("rs-address-manual").value.trim();

    if (!name) return "يرجى إدخال الاسم.";
    if (!phone) return "يرجى إدخال رقم الهاتف.";
    if (phone.replace(/\D/g, "").length < 8) return "يرجى إدخال رقم هاتف صحيح.";
    if (!reason) return "يرجى اختيار سبب الإرجاع.";
    if (!state.selectedAddress && !manual) return "يرجى اختيار عنوان أو كتابة عنوان الاستلام.";

    if (state.images.some(function (img) { return img.status === "error"; })) {
      return "تعذر رفع إحدى الصور. احذفها وحاول مرة أخرى.";
    }
    return "";
  }

  async function uploadPendingImages(requestCode) {
    var pending = state.images.filter(function (img) { return img.status !== "uploaded"; });
    if (!pending.length) return true;

    var rawClient = window.supabaseClient && typeof window.supabaseClient.raw === "function" ? window.supabaseClient.raw() : null;
    if (!rawClient || !rawClient.storage) {
      notify("تعذر الاتصال بخادم الصور.", "error");
      return false;
    }

    var ok = true;
    for (var i = 0; i < pending.length; i++) {
      var img = pending[i];
      img.status = "uploading";
      renderUploadSlots();
      var extMatch = String(img.file.name || "").split(".").pop();
      var ext = extMatch && extMatch.length <= 5 ? extMatch.toLowerCase() : "jpg";
      var path = "returns/" + requestCode + "/" + Date.now() + "-" + i + "." + ext;
      try {
        var upload = await rawClient.storage.from("return-images").upload(path, img.file, {
          contentType: img.file.type || "image/jpeg",
          upsert: false,
        });
        if (upload && upload.error) {
          img.status = "error";
          notify("تعذر رفع إحدى الصور.", "error");
          ok = false;
          continue;
        }
        var pub = rawClient.storage.from("return-images").getPublicUrl(path);
        img.url = pub?.data?.publicUrl || pub?.publicUrl || "";
        img.status = "uploaded";
      } catch (e) {
        img.status = "error";
        ok = false;
      }
    }
    renderUploadSlots();
    return ok;
  }

  function buildPayload(requestCode) {
    var name = document.getElementById("rs-name").value.trim();
    var phone = document.getElementById("rs-phone").value.trim();
    var reason = document.getElementById("rs-reason").value;
    var details = document.getElementById("rs-details").value.trim();
    var manual = document.getElementById("rs-address-manual").value.trim();

    var addressSnapshot = {};
    if (state.selectedAddress) {
      addressSnapshot = {
        id: state.selectedAddress.id,
        name: state.selectedAddress.name,
        type: state.selectedAddress.type,
        full_address: state.selectedAddress.fullAddress || state.selectedAddress.full_address || "",
        street: state.selectedAddress.street || "",
        building: state.selectedAddress.building || "",
        area: state.selectedAddress.area || "",
        floor: state.selectedAddress.floor || "",
        phone: state.selectedAddress.phone || "",
      };
    }
    if (manual) addressSnapshot.manual = manual;

    var price = Number(state.item.price ?? state.order.total_price ?? 0) || 0;

    return {
      request_code: requestCode,
      user_email: state.email.toLowerCase(),
      user_name: name,
      user_phone: phone,
      country: state.country,
      order_id: state.orderId,
      order_reference: window.BudaOrders.buildOrderReference(state.order),
      product_id: state.productId,
      product_name: state.item.name || "",
      product_image: state.item.image || "",
      product_price: price,
      quantity: Number(state.item.quantity) || 1,
      variant: buildVariantChip(state.item),
      reason: reason,
      details: details,
      images: state.images.filter(function (img) { return img.url; }).map(function (img) { return img.url; }),
      status: "reviewing",
      address: addressSnapshot,
    };
  }

  function bindForm() {
    bindAddressSelection();
    bindUploader();
    prefilledFromAddresses();

    document.getElementById("rs-address-manual")?.addEventListener("input", function () {
      if (this.value.trim()) state.selectedAddress = null;
      page.root.querySelectorAll(".rs-address-option").forEach(function (el) { el.classList.remove("is-selected"); });
    });

    var form = document.getElementById("rs-form");
    if (!form) return;
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (state.submitting) return;

      var validationMessage = validate();
      if (validationMessage) {
        notify(validationMessage, "error");
        return;
      }

      state.submitting = true;
      var submitBtn = document.getElementById("rs-submit");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px;">sync</span> جارٍ الإرسال...';
      }

      var requestCode = window.BudaReturns.requestCode();

      var uploaded = await uploadPendingImages(requestCode);
      if (!uploaded) {
        state.submitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px;">send</span>إرسال طلب الإرجاع';
        }
        return;
      }

      try {
        var payload = buildPayload(requestCode);
        var resp = await window.supabaseClient.from("return_requests").insert([payload]);
        if (resp && resp.error) throw resp.error;

        notify("تم إرسال طلب الإرجاع بنجاح.", "success");
        setTimeout(function () {
          window.location.href = "returns.html?created=1";
        }, 900);
      } catch (error) {
        console.error("submit return request failed", error);
        state.submitting = false;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px;">send</span>إرسال طلب الإرجاع';
        }
        notify("تعذر إرسال الطلب الآن. حاول مرة أخرى.", "error");
      }
    });
  }

  async function blockWithExisting(request) {
    var meta = window.BudaReturns.RETURN_STATUS_META[request.status] || window.BudaReturns.RETURN_STATUS_META.reviewing;
    page.root.innerHTML =
      '<div class="rs-form-card">' +
      '<h3 class="rs-form-title"><span class="material-icons-outlined">assignment_return</span>تفاصيل المنتج</h3>' +
      '<div class="rs-product-mini">' +
      window.BudaOrders.buildOrderImageTag(state.item.image || window.BudaOrders.fallbackItemImage(), state.item.name) +
      '<div><p class="rs-pm-name">' + esc(state.item.name) + "</p>" +
      (buildVariantChip(state.item) ? '<p class="rs-pm-sub">' + buildVariantChip(state.item) + "</p>" : "") +
      "</div></div></div>" +
      '<div class="rs-window-banner is-blocked"><span class="material-icons-outlined">info</span><div><strong>تم تقديم طلب إرجاع لهذا المنتج مسبقًا</strong><br>طلبك الحالي: <strong>' + esc(request.request_code) + "</strong> - حالة: <strong>" + meta.label + "</strong></div></div>" +
      '<div class="rs-empty">' +
      '<div class="rs-empty-icon"><span class="material-icons-outlined" style="font-size:38px;">assignment_return</span></div>' +
      "<h3>لا يمكن تكرار الطلب</h3>" +
      "<p>لمنع التكرار، لا يمكنك إرسال أكثر من طلب إرجاع واحد لنفس المنتج في نفس الطلب.</p>" +
      '<a class="rs-btn-return" href="returns.html">العودة إلى المرتجعات</a>' +
      "</div>";
  }

  async function initOrBlock() {
    var params = new URLSearchParams(window.location.search);
    state.orderId = String(params.get("id") || "").trim();
    state.productId = String(params.get("pid") || "").trim();
    state.email = window.BudaReturns.getActiveEmail();
    state.country = window.BudaReturns.getUserCountryCode();

    if (!state.orderId || !state.productId) {
      blockMessage("معامل الطلب غير مكتمل", "ارجع إلى صفحة المرتجعات واختر منتجًا لطلب استرجاعه.", "error");
      return;
    }

    if (!state.email) {
      page.root.innerHTML =
        '<div class="rs-empty"><div class="rs-empty-icon"><span class="material-icons-outlined" style="font-size:38px;">lock_outline</span></div><h3>تسجيل الدخول مطلوب</h3><p>يجب تسجيل الدخول لإنشاء طلب إرجاع.</p><a class="rs-btn-return" href="signin/login.html">تسجيل الدخول</a></div>';
      return;
    }

    var order = await window.BudaOrders.fetchOrderWithItems(state.orderId);
    if (!order) {
      blockMessage("لم يتم العثور على الطلب", "تأكد من رقم الطلب وأعد المحاولة.", "error");
      return;
    }

    var item = findItemByProductId(order, state.productId);
    if (!item) {
      item = window.BudaOrders.pickPrimaryOrderItem(order);
    }
    if (!item) {
      blockMessage("لم يتم العثور على المنتج", "تعذر العثور على المنتج داخل الطلب.", "error");
      return;
    }

    state.order = order;
    state.item = item;

    var meta = window.BudaOrders.statusMeta(order.status || order.order_status);
    if (meta.key !== "delivered") {
      blockMessage("الإرجاع متاح بعد التوصيل", "طلب الإرجاع يُقبل فقط بعد وصول طلبك.", "info");
      return;
    }

    state.flags = await window.BudaReturns.loadReturnFlags(window.supabaseClient, [state.productId]);
    state.returnAllowed = window.BudaReturns.productReturnAllowed(state.flags, state.productId, item);
    state.windowInfo = window.BudaReturns.getReturnWindowInfo(order);

    // منع التكرار: طلب نشط لنفس (الطلب + المنتج)
    if (window.supabaseClient && typeof window.supabaseClient.from === "function") {
      try {
        var resp = await window.supabaseClient
          .from("return_requests")
          .select("*")
          .eq("user_email", state.email.toLowerCase())
          .eq("order_id", state.orderId)
          .eq("product_id", state.productId)
          .in("status", ["reviewing", "accepted"])
          .limit(1);
        if (resp && !resp.error && Array.isArray(resp.data) && resp.data.length) {
          blockWithExisting(resp.data[0]);
          return;
        }
      } catch (e) { /* continue */ }
    }

    await loadAddresses();
    renderForm();
  }

  function blockMessage(title, text) {
    page.root.innerHTML =
      '<div class="rs-empty"><div class="rs-empty-icon"><span class="material-icons-outlined" style="font-size:38px;">info</span></div><h3>' + title + "</h3><p>" + text + '</p><a class="rs-btn-return" href="returns.html">العودة إلى المرتجعات</a></div>';
  }

  document.addEventListener("DOMContentLoaded", function () {
    page.root = document.getElementById("rs-root");
    page.statusEl = document.getElementById("returns-status");
    if (!page.root) return;

    page.root.innerHTML =
      '<div class="rs-empty"><div class="rs-empty-icon"><span class="material-icons-outlined" style="font-size:38px;" class="spinner"></span></div><p>جارٍ التحقق من الطلب...</p></div>';

    initOrBlock();
  });
})();