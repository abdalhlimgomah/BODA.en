const signInButton = document.querySelector('[data-purpose="sign-in-button"]');
if (signInButton) {
  signInButton.addEventListener("click", async () => {
    const phone = document.getElementById("phone")?.value.trim() || "";
    const email = document.getElementById("email")?.value.trim().toLowerCase() || "";
    const password = document.getElementById("password")?.value || "";
    if (!phone || !email || !password) {
      alert("يرجى إدخال البيانات كاملة");
      return;
    }
    if (!window.mockAPI) {
      alert("حدث خطأ في تحميل النظام");
      return;
    }
    const response = await window.mockAPI.login(email, password, phone);
    if (response.status !== "success") {
      alert(response.message || "بيانات الدخول غير صحيحة");
      return;
    }
    localStorage.setItem("userEmail", response.data.email);
    localStorage.setItem("userFullName", response.data.name);
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userRole", response.data.role || "customer");
    window.location.href = "home.html";
  });
}
