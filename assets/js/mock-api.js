class MockAPI {
  constructor() {
    this.initStorage();
  }

  initStorage() {
    if (!localStorage.getItem("users_db")) {
      const users = [
        {
          id: "test_user_001",
          fullName: "مستخدم اختبار",
          email: "test@example.com",
          phone: "0500000000",
          password: "password",
          role: "customer",
          created_at: "2024-01-01T00:00:00+00:00"
        },
        {
          id: "admin_001",
          fullName: "مسؤول",
          email: "admin@example.com",
          phone: "0500000001",
          password: "password",
          role: "admin",
          created_at: "2024-01-01T00:00:00+00:00"
        }
      ];
      localStorage.setItem("users_db", JSON.stringify(users));
    }
  }

  async login(email, password, phone) {
    const users = JSON.parse(localStorage.getItem("users_db") || "[]");
    const user = users.find((u) => u.email === email && u.password === password);

    if (user) {
      if (phone && user.phone && user.phone !== phone) {
        return {
          status: "error",
          message: "رقم الهاتف غير صحيح",
          data: []
        };
      }

      sessionStorage.setItem("user_id", user.id);
      sessionStorage.setItem("user_name", user.fullName);
      sessionStorage.setItem("user_email", user.email);
      sessionStorage.setItem("user_role", user.role);

      return {
        status: "success",
        message: "تم تسجيل الدخول بنجاح",
        data: {
          name: user.fullName,
          email: user.email,
          role: user.role
        }
      };
    }

    return {
      status: "error",
      message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
      data: []
    };
  }

  async register(data) {
    const users = JSON.parse(localStorage.getItem("users_db") || "[]");

    if (users.find((u) => u.email === data.email)) {
      return {
        status: "error",
        message: "هذا البريد الإلكتروني مسجل بالفعل",
        data: []
      };
    }

    const newUser = {
      id: "user_" + Date.now(),
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      password: data.password,
      role: "customer",
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem("users_db", JSON.stringify(users));

    sessionStorage.setItem("user_id", newUser.id);
    sessionStorage.setItem("user_name", newUser.fullName);
    sessionStorage.setItem("user_email", newUser.email);
    sessionStorage.setItem("user_role", newUser.role);

    return {
      status: "success",
      message: "تم التسجيل بنجاح",
      data: {
        name: newUser.fullName,
        email: newUser.email,
        role: newUser.role
      }
    };
  }

  async logout() {
    sessionStorage.clear();
    return {
      status: "success",
      message: "تم تسجيل الخروج بنجاح",
      data: []
    };
  }

  async checkSession() {
    const userId = sessionStorage.getItem("user_id");
    if (userId) {
      return {
        status: "success",
        message: "جلسة نشطة",
        data: {
          name: sessionStorage.getItem("user_name"),
          email: sessionStorage.getItem("user_email"),
          role: sessionStorage.getItem("user_role")
        }
      };
    }

    return {
      status: "error",
      message: "لا توجد جلسة نشطة",
      data: []
    };
  }
}

const mockAPI = new MockAPI();
window.mockAPI = mockAPI;
