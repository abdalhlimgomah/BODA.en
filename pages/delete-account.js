(function () {
  var email = (localStorage.getItem("userEmail") || "").trim().toLowerCase();
  var userName =
    localStorage.getItem("userFullName") ||
    localStorage.getItem("userFirstName") + " " + localStorage.getItem("userLastName") ||
    email;

  var nameEl = document.getElementById("delete-account-name");
  var statusEl = document.getElementById("delete-account-status");
  var actionsEl = document.getElementById("delete-actions");
  var confirmBtn = document.getElementById("confirm-delete-btn");
  var cancelBtn = document.getElementById("cancel-delete-btn");
  var modal = document.getElementById("confirm-modal");
  var modalConfirm = document.getElementById("modal-confirm-btn");
  var modalCancel = document.getElementById("modal-cancel-btn");

  if (!email) {
    nameEl.textContent = "يجب تسجيل الدخول أولاً";
    actionsEl.style.display = "none";
    return;
  }

  nameEl.textContent = "مرحباً، " + userName;

  function setStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = "status-note " + type;
    statusEl.style.display = "block";
  }

  function openModal() {
    modal.classList.add("show");
  }

  function closeModal() {
    modal.classList.remove("show");
  }

  confirmBtn.addEventListener("click", openModal);
  cancelBtn.addEventListener("click", function () {
    window.history.back();
  });
  modalCancel.addEventListener("click", closeModal);
  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeModal();
  });

  modalConfirm.addEventListener("click", async function () {
    modalConfirm.disabled = true;
    modalConfirm.textContent = "جاري الحذف...";
    closeModal();

    try {
      var client = window.getSupabaseClient ? window.getSupabaseClient() : null;
      if (!client) throw new Error("Supabase client not available");

      setStatus("جاري حذف بياناتك...", "info");
      actionsEl.style.display = "none";

      var errors = [];

      // 1. Fetch user data before deleting
      var userData = null;
      try {
        var userResult = await client.from("users").select("*").eq("email", email).limit(1);
        if (userResult.data && userResult.data.length > 0) {
          userData = userResult.data[0];
        }
      } catch (e) {
        console.warn("[delete-account] fetch user failed:", e);
        errors.push("fetch: " + (e.message || e));
      }

      // 2. Save to deleted_accounts (best effort)
      try {
        if (userData) {
          await client.from("deleted_accounts").insert([{
            email: userData.email,
            name: userData.name,
            password: userData.password,
          }]);
        } else {
          await client.from("deleted_accounts").insert([{
            email: email,
            name: userName,
            password: "",
          }]);
        }
      } catch (e) {
        console.warn("[delete-account] save to deleted_accounts failed:", e);
        errors.push("deleted_accounts: " + (e.message || e));
      }

      // 3. Delete from all tables
      var deleteOps = [
        { label: "users", op: client.from("users").delete().eq("email", email) },
        { label: "profiles", op: client.from("profiles").delete().eq("email", email) },
        { label: "cart_items", op: client.from("cart_items").delete().eq("user_email", email) },
        { label: "wishlist_items", op: client.from("wishlist_items").delete().eq("user_email", email) },
      ];
      var results = await Promise.allSettled(deleteOps.map(function (d) { return d.op; }));
      results.forEach(function (r, i) {
        if (r.status === "rejected") {
          console.error("[delete-account] " + deleteOps[i].label + " delete failed:", r.reason);
          errors.push(deleteOps[i].label + ": " + String(r.reason?.message || r.reason));
        }
      });

      // 4. Check if anything actually worked
      if (errors.length > 0) {
        console.error("[delete-account] errors:", errors);
        setStatus("فشلت بعض العمليات: " + errors.join(" | "), "error");
        actionsEl.style.display = "flex";
        modalConfirm.disabled = false;
        modalConfirm.textContent = "نعم، احذف حسابي";
        return;
      }

      if (window.clearCart && typeof window.clearCart === "function") {
        window.clearCart();
      }

      var keys = [
        "currentUser", "isLoggedIn", "userEmail", "userFullName", "userPhone",
        "userPhoneVerified", "userPhoneCountry", "userFirstName", "userLastName",
        "userBirthDay", "userBirthMonth", "userBirthYear", "userGender", "userNationality",
      ];
      keys.forEach(function (k) { localStorage.removeItem(k); });

      setStatus("تم حذف الحساب بنجاح.", "success");
      var supportLink = document.getElementById("delete-support-link");
      if (supportLink) supportLink.style.display = "block";

      setTimeout(function () {
        window.location.href = "home.html";
      }, 3000);

    } catch (err) {
      console.error("[delete-account] error:", err);
      setStatus("حدث خطأ أثناء حذف الحساب: " + (err.message || err), "error");
      actionsEl.style.display = "flex";
      modalConfirm.disabled = false;
      modalConfirm.textContent = "نعم، احذف حسابي";
      return;
    }
  });
})();
