const form = document.getElementById("signup-form");
if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("signup-name")?.value.trim() || "";
    const phone = document.getElementById("signup-phone")?.value.trim() || "";
    const email = document.getElementById("signup-email")?.value.trim().toLowerCase() || "";
    const password = document.getElementById("signup-password")?.value || "";
    const confirm = document.getElementById("signup-confirm")?.value || "";
    if (!name || !phone || !email || !password) {
      alert("يرجى تعبئة جميع الحقول");
      return;
    }
    if (password !== confirm) {
      alert("كلمات المرور غير متطابقة");
      return;
    }
    if (!window.mockAPI) {
      alert("حدث خطأ في تحميل النظام");
      return;
    }
    const response = await window.mockAPI.register({ fullName: name, email, phone, password });
    if (response.status === "success") {
      sessionStorage.clear();
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userFullName");
      window.location.href = "login.html";
      return;
    }
    alert(response.message || "فشل التسجيل");
  });
}
