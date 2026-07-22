function signupNotify(message, type = "error") {
  if (window.BudaUI?.notify) {
    window.BudaUI.notify(message, { type, target: "#auth-feedback", duration: 5000 });
    return;
  }

  let holder = document.getElementById("auth-feedback");
  if (!holder) {
    const card = document.querySelector(".auth-card");
    if (card) {
      holder = document.createElement("p");
      holder.id = "auth-feedback";
      holder.className = "status-note";
      holder.setAttribute("aria-live", "polite");
      const subtitle = card.querySelector(".auth-subtitle");
      if (subtitle) subtitle.insertAdjacentElement("afterend", holder);
      else card.prepend(holder);
    }
  }

  if (!holder) return;
  holder.textContent = String(message || "");
  holder.classList.remove("hidden", "error", "success", "info");
  holder.classList.add("status-note", type === "success" ? "success" : type === "info" ? "info" : "error");
}

const form = document.getElementById("signup-form");
if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = window.BudaSecurity?.sanitizeText
      ? window.BudaSecurity.sanitizeText(document.getElementById("signup-name")?.value, 120)
      : document.getElementById("signup-name")?.value.trim() || "";
    const phone = document.getElementById("signup-phone")?.value.trim() || "";
    const email = window.BudaSecurity?.normalizeEmail
      ? window.BudaSecurity.normalizeEmail(document.getElementById("signup-email")?.value)
      : document.getElementById("signup-email")?.value.trim().toLowerCase() || "";
    const password = document.getElementById("signup-password")?.value || "";
    const confirm = document.getElementById("signup-confirm")?.value || "";

    if (!name || !phone || !email || !password) {
      signupNotify("يرجى تعبئة جميع الحقول", "error");
      return;
    }

    if (password !== confirm) {
      signupNotify("كلمات المرور غير متطابقة", "error");
      return;
    }

    if (window.BudaSecurity?.isStrongPassword && !window.BudaSecurity.isStrongPassword(password)) {
      signupNotify("استخدم كلمة مرور قوية: 8 أحرف مع حرف كبير وصغير ورقم ورمز", "error");
      return;
    }

    if (!window.mockAPI) {
      signupNotify("حدث خطأ في تحميل النظام", "error");
      return;
    }

    const response = await window.mockAPI.register({ fullName: name, email, phone, password });
    if (response.status === "success") {
      sessionStorage.clear();
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userFullName");
      signupNotify("تم إنشاء الحساب بنجاح. جارٍ التحويل...", "success");
      setTimeout(() => {
        window.location.href = "login.html";
      }, 700);
      return;
    }

    signupNotify(response.message || "فشل التسجيل", "error");
  });
}
