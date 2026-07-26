function getConfig(key) {
  return window[key];
}

function getGoogleClientId() {
  const fromWindow = window.__Buda_GOOGLE_CLIENT_ID || window.Buda_GOOGLE_CLIENT_ID;
  if (fromWindow) return fromWindow;
  const fromDom = document.getElementById("g_id_onload")?.getAttribute("data-client_id");
  return String(fromDom || "").trim();
}

function getHomePath() {
  const path = (window.location.pathname || "").toLowerCase();
  if (path.includes("/pages/signin/") || path.includes("/pages/signup/")) {
    return "../home.html";
  }
  return "home.html";
}

const LOGIN_FAIL_COUNT_KEY = "auth_login_fail_count";
const LOGIN_LOCK_UNTIL_KEY = "auth_login_lock_until";
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCK_MS = 5 * 60 * 1000;
const SIGNUP_SESSION_KEYS = [
  "signup_email",
  "signup_otp",
  "signup_data",
  "otp_expires_at",
  "max_resend_attempts",
  "resend_countdown",
  "resend_attempts",
];

let googleAuthUserIntent = false;

function clearLocalAuthState() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userFullName");
  localStorage.removeItem("userPhone");
  localStorage.removeItem("userPhoneVerified");
  localStorage.removeItem("userPhoneCountry");
  localStorage.removeItem("userFirstName");
  localStorage.removeItem("userLastName");
  localStorage.removeItem("userBirthDay");
  localStorage.removeItem("userBirthMonth");
  localStorage.removeItem("userBirthYear");
  localStorage.removeItem("userGender");
  localStorage.removeItem("userNationality");
}

function clearPendingSignupSession() {
  SIGNUP_SESSION_KEYS.forEach((key) => sessionStorage.removeItem(key));
}

function normalizeEmail(value) {
  if (window.BudaSecurity?.normalizeEmail) {
    return window.BudaSecurity.normalizeEmail(value);
  }
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

function getRemainingLockSeconds() {
  const lockUntil = Number(localStorage.getItem(LOGIN_LOCK_UNTIL_KEY) || 0);
  return Math.max(0, Math.ceil((lockUntil - Date.now()) / 1000));
}

function resetLoginAttemptState() {
  localStorage.removeItem(LOGIN_FAIL_COUNT_KEY);
  localStorage.removeItem(LOGIN_LOCK_UNTIL_KEY);
}

function registerLoginFailure() {
  const currentFails = Number(localStorage.getItem(LOGIN_FAIL_COUNT_KEY) || 0) + 1;
  localStorage.setItem(LOGIN_FAIL_COUNT_KEY, String(currentFails));

  if (currentFails >= MAX_LOGIN_ATTEMPTS) {
    localStorage.setItem(LOGIN_LOCK_UNTIL_KEY, String(Date.now() + LOGIN_LOCK_MS));
  }
}

function authNotify(message, type = "error") {
  const text = String(message || "").trim();
  if (!text) return;

  if (window.BudaUI?.notify) {
    window.BudaUI.notify(text, { type, target: "#auth-feedback", duration: 5000 });
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
  holder.textContent = text;
  holder.classList.remove("hidden", "error", "success", "info");
  holder.classList.add("status-note", type === "success" ? "success" : type === "info" ? "info" : "error");
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function ensureEmailJSReady() {
  if (!window.emailjs) {
    throw new Error("مكتبة EmailJS غير محمّلة.");
  }

  if (window.__Buda_EMAILJS_READY__) return;

  try {
    window.emailjs.init({ publicKey: "xdVqEELgzBCftq4cf" });
    window.__Buda_EMAILJS_READY__ = true;
  } catch (error) {
    console.warn("EmailJS init skipped", error);
  }
}

async function sendOTPEmail(email, otp) {
  ensureEmailJSReady();

  const expirationTime = new Date(Date.now() + 15 * 60000);
  const timeString = expirationTime.toLocaleTimeString("ar-EG");

  try {
    const result = await emailjs.send("service_xsps2sb", "template_o7zn76j", {
      to_email: email,
      email: email,
      passcode: otp,
      time: timeString,
    });

    if (result && result.status !== 200) {
      console.warn("[sendOTPEmail] unexpected status:", result.status, result.text);
    }
  } catch (err) {
    console.error("[sendOTPEmail] EmailJS error:", err);
    throw err;
  }

  return true;
}

function getLoginPath() {
  const path = (window.location.pathname || "").toLowerCase();
  if (path.includes("/pages/signup/")) return "../signin/login.html";
  if (path.includes("/pages/signin/")) return "login.html";
  return "pages/signin/login.html";
}

function redirectToLoginWithEmail(email) {
  const normalized = normalizeEmail(email);
  const query = normalized ? `?${new URLSearchParams({ email: normalized }).toString()}` : "";
  window.location.href = `${getLoginPath()}${query}`;
}

async function findUserByEmail(client, email) {
  const { data, error } = await client.from("users").select("*").eq("email", email).limit(1);
  if (error) throw error;
  return Array.isArray(data) && data.length ? data[0] : null;
}

function getStoredPasswordValue(user) {
  if (!user || typeof user !== "object") return "";

  const candidates = [
    user.password_hash,
    user.password,
    user.pass,
    user.user_password,
    user.passwordHash,
    user.hashed_password,
  ];

  for (const value of candidates) {
    const text = String(value || "").trim();
    if (text) return text;
  }

  return "";
}

async function handleSignUp(event) {
  event.preventDefault();

  const name = window.BudaSecurity?.sanitizeText
    ? window.BudaSecurity.sanitizeText(document.querySelector('input[name="name"]')?.value, 120)
    : document.querySelector('input[name="name"]')?.value.trim();
  const email = normalizeEmail(document.querySelector('input[name="email"]')?.value);
  const password = document.querySelector('input[name="password"]')?.value;
  const confirmPassword = document.querySelector('input[name="confirm-password"]')?.value;
  const country = document.querySelector('select[name="country"]')?.value || "EG";
  console.log("[signup] selected country =", country);
  if (!name || !email || !password || !confirmPassword) {
    authNotify("الرجاء ملء جميع الحقول.");
    return;
  }

  if (!isValidEmail(email)) {
    authNotify("صيغة البريد الإلكتروني غير صحيحة.");
    return;
  }

  if (password !== confirmPassword) {
    authNotify("كلمتا المرور غير متطابقتين.");
    return;
  }

  if (window.BudaSecurity?.isStrongPassword && !window.BudaSecurity.isStrongPassword(password)) {
    authNotify("استخدم كلمة مرور قوية: 8 أحرف على الأقل مع حرف كبير وصغير ورقم ورمز.");
    return;
  }

  let client;
  try {
    client = getSupabaseClient();
  } catch (error) {
    console.error("supabase init error", error);
    authNotify("تعذر الاتصال بالخدمة الآن.");
    return;
  }

  try {
    const existingUser = await findUserByEmail(client, email);
    if (existingUser) {
      authNotify("هذا البريد مسجل بالفعل. استخدم صفحة تسجيل الدخول.", "info");
      setTimeout(() => redirectToLoginWithEmail(email), 650);
      return;
    }

    const otp = generateOTP();
    await sendOTPEmail(email, otp);

    sessionStorage.setItem("signup_email", email);
    sessionStorage.setItem("signup_otp", otp);
    sessionStorage.setItem(
      "signup_data",
      JSON.stringify({
        name,
        email,
        password,
        country,
      })
    );
    sessionStorage.setItem("resend_attempts", "0");
    sessionStorage.setItem("max_resend_attempts", "3");
    sessionStorage.setItem("otp_expires_at", String(Date.now() + 600000));

    authNotify(`تم إرسال رمز التحقق إلى ${email}`, "success");
    setTimeout(() => {
      window.location.href = "verify.html";
    }, 600);
  } catch (error) {
    console.error("signup error", error);
    var errMsg = String(error?.message || error || "").toLowerCase();
    if (errMsg.includes("limit") || errMsg.includes("429") || errMsg.includes("quota")) {
      authNotify("تم تجاوز حد الإرسال اليومي. حاول لاحقاً أو تواصل مع الدعم.");
    } else if (errMsg.includes("network") || errMsg.includes("fetch") || errMsg.includes("connect")) {
      authNotify("فشل الاتصال بالبريد. تحقق من اتصالك بالإنترنت.");
    } else {
      authNotify("حدث خطأ أثناء الإرسال. حاول مرة أخرى.");
    }
  }
}

async function handleLogIn(event) {
  if (event) event.preventDefault();

  const username = normalizeEmail(document.getElementById("username")?.value);
  const password = document.getElementById("password")?.value;

  if (!username || !password) {
    authNotify("الرجاء إدخال البريد الإلكتروني وكلمة المرور.");
    return;
  }

  if (!isValidEmail(username)) {
    authNotify("صيغة البريد الإلكتروني غير صحيحة.");
    return;
  }

  const lockSeconds = getRemainingLockSeconds();
  if (lockSeconds > 0) {
    authNotify(`تم إيقاف المحاولات مؤقتًا. حاول بعد ${lockSeconds} ثانية.`, "info");
    return;
  }

  let client;
  try {
    client = getSupabaseClient();
  } catch (error) {
    console.error("supabase init error", error);
    authNotify("تعذر الاتصال بالخدمة الآن.");
    return;
  }

  try {
    // Check if account is deleted FIRST (قبل البحث في users لأن الحساب محذوف منه)
    var { data: deletedData } = await client.from("deleted_accounts").select("name").eq("email", username).limit(1);
    if (deletedData && deletedData.length > 0) {
      var card = document.querySelector(".auth-card");
      if (card) {
        card.innerHTML =
          '<div style="text-align:center;padding:20px 0;">' +
          '<div style="width:64px;height:64px;margin:0 auto 14px;border-radius:50%;background:#fee4e2;display:grid;place-items:center;">' +
          '<span class="material-icons-outlined" style="color:#dc2626;font-size:32px;">block</span></div>' +
          '<h2 style="margin:0 0 8px;font-size:1.2rem;">الحساب محذوف</h2>' +
          '<p style="color:#6b7280;font-size:0.9rem;margin:0 0 6px;">لقد تم حذف هذا الحساب مسبقاً. لا يمكنك تسجيل الدخول مرة أخرى.</p>' +
          '<p style="color:#6b7280;font-size:0.9rem;margin:0 0 20px;">إذا كنت تعتقد أن هناك خطأ، يرجى التواصل مع خدمة العملاء.</p>' +
          '<a href="../complaints.html" class="auth-btn" style="display:inline-block;text-decoration:none;">' +
          'تواصل مع خدمة العملاء</a>' +
          '</div>';
      }
      return;
    }

    const user = await findUserByEmail(client, username);
    if (!user) {
      registerLoginFailure();
      authNotify("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      return;
    }

    const storedPassword = getStoredPasswordValue(user);
    if (!storedPassword) {
      console.error("login password column missing", user);
      authNotify("تعذر التحقق من كلمة المرور لهذا الحساب.");
      return;
    }

    const passwordOk = window.BudaSecurity?.verifyPassword
      ? await window.BudaSecurity.verifyPassword(password, storedPassword, user.email || username)
      : storedPassword === password;

    if (!passwordOk) {
      registerLoginFailure();
      authNotify("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      return;
    }

    resetLoginAttemptState();

    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      loginTime: new Date().toISOString(),
    };

    localStorage.setItem("currentUser", JSON.stringify(userData));
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("userFullName", user.name);

    // Load user's saved country from profile and set it automatically
    try {
      var { data: profileData } = await client.from("profiles").select("country_code").eq("email", user.email).limit(1);
      var profileCountry = null;
      if (Array.isArray(profileData) && profileData.length && profileData[0].country_code) {
        profileCountry = profileData[0].country_code;
      }
      // Only override if profile has a non-default country (SA was deliberately chosen)
      // Don't override with "EG" (default from ALTER TABLE) if user already has SA in localStorage
      if (profileCountry && profileCountry !== "EG") {
        localStorage.setItem("userCountry", profileCountry);
        if (window.TaagerIntegration) {
          var countryObj = null;
          var countries = window.TaagerIntegration.getAvailableCountries();
          for (var ci = 0; ci < countries.length; ci++) {
            if (countries[ci].code === profileCountry) {
              countryObj = countries[ci];
              break;
            }
          }
          if (countryObj) {
            window.TaagerIntegration.setSelectedCountry(countryObj);
          }
        }
      }
    } catch (_e) {
      console.warn("Failed to load user country", _e);
    }

    authNotify(`مرحبًا ${user.name}`, "success");
    setTimeout(() => {
      window.location.href = getHomePath();
    }, 500);
  } catch (error) {
    console.error("login catch error", error);
    authNotify("حدث خطأ أثناء تسجيل الدخول.");
  }
}

window.TFA = async function TFA(response) {
  if (!googleAuthUserIntent) {
    // Ignore implicit/automatic callbacks to avoid accidental login.
    console.warn("Ignored Google callback without explicit user intent.");
    return;
  }
  googleAuthUserIntent = false;

  let decodedToken = null;
  try {
    decodedToken = jwt_decode(response?.credential || "");
  } catch (error) {
    console.error("google decode error", error);
    authNotify("تعذر التحقق من تسجيل الدخول عبر Google.");
    return;
  }

  const email = normalizeEmail(decodedToken?.email);
  const name = String(decodedToken?.name || "مستخدم Google").trim() || "مستخدم Google";
  if (!isValidEmail(email)) {
    authNotify("تعذر قراءة البريد الإلكتروني من Google.");
    return;
  }

  const googleUser = {
    id: `google_${decodedToken.sub}`,
    email,
    name,
    provider: "google",
    loginTime: new Date().toISOString(),
  };

  localStorage.setItem("currentUser", JSON.stringify(googleUser));
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("userEmail", email);
  localStorage.setItem("userFullName", name);

  // Load user's saved country from profile for Google login
  try {
    var client = getSupabaseClient();
    var { data: profileData } = await client.from("profiles").select("country_code").eq("email", email).limit(1);
    var profileCountry = null;
    if (Array.isArray(profileData) && profileData.length && profileData[0].country_code) {
      profileCountry = profileData[0].country_code;
    }
    if (profileCountry && profileCountry !== "EG") {
      localStorage.setItem("userCountry", profileCountry);
      if (window.TaagerIntegration) {
        var countryObj = null;
        var countries = window.TaagerIntegration.getAvailableCountries();
        for (var ci = 0; ci < countries.length; ci++) {
          if (countries[ci].code === profileCountry) {
            countryObj = countries[ci];
            break;
          }
        }
        if (countryObj) {
          window.TaagerIntegration.setSelectedCountry(countryObj);
        }
      }
    }
  } catch (_e) {
    console.warn("Failed to load user country for Google login", _e);
  }

  authNotify(`مرحبًا ${name}`, "success");
  setTimeout(() => {
    window.location.href = getHomePath();
  }, 350);
};

function bindGoogleSignInIntent(target) {
  if (!target) return;

  const markIntent = () => {
    googleAuthUserIntent = true;
    window.setTimeout(() => {
      googleAuthUserIntent = false;
    }, 60 * 1000);
  };

  target.addEventListener("pointerdown", markIntent, { passive: true });
  target.addEventListener("click", markIntent);
  target.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") markIntent();
  });
}

function detectAdBlocker() {
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
    s.onload = () => resolve(false);
    s.onerror = () => resolve(true);
    s.type = 'text/javascript';
    document.head.appendChild(s);
    setTimeout(() => resolve(true), 3000);
  });
}

function initGoogleSignIn() {
  var wrap = document.getElementById("google-button-wrap");
  if (!wrap) return;

  if (!window.crossOriginIsolated) {
    wrap.innerHTML = '<p style="text-align:center;color:#64748b;font-size:13px;padding:12px;">تسجيل الدخول عبر Google غير متاح حالياً. يرجى استخدام البريد الإلكتروني وكلمة المرور.</p>';
    return;
  }

  detectAdBlocker().then(function(adBlocked) {
    if (adBlocked) {
      wrap.innerHTML = '<p style="text-align:center;color:#ef4444;font-size:13px;padding:12px;">يبدو أن لديك مانع إعلانات مفعّل. يرجى تعطيله للمتابعة باستخدام تسجيل الدخول عبر Google.</p>';
      return;
    }
    if (!window.google || !google.accounts || !google.accounts.id) {
      setTimeout(initGoogleSignIn, 300);
      return;
    }

    const GOOGLE_CLIENT_ID = getGoogleClientId();
    if (!GOOGLE_CLIENT_ID) {
      console.warn("Missing Google client ID. Set window.__Buda_GOOGLE_CLIENT_ID.");
      return;
    }

    if (!window.__Buda_GOOGLE_INIT_DONE) {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: TFA,
      });
      window.__Buda_GOOGLE_INIT_DONE = true;
    }

    let btn = wrap.querySelector(".g_id_signin");
    if (!btn) {
      btn = document.createElement("div");
      btn.className = "g_id_signin";
      wrap.appendChild(btn);
    }

    bindGoogleSignInIntent(btn);

    google.accounts.id.renderButton(btn, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "left",
    });
  });
}

function attachPasswordToggle() {
  const password = document.getElementById("password");
  const eye = document.getElementById("eye");
  if (!password || !eye) return;

  eye.addEventListener("click", () => {
    const icon = eye.children[0];
    const hidden = password.type === "password";
    password.type = hidden ? "text" : "password";
    if (icon) {
      icon.classList.toggle("fa-eye", !hidden);
      icon.classList.toggle("fa-eye-slash", hidden);
    }
  });
}

function showResetSuccessIfAny() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("reset") !== "success") return;

  const email = params.get("email");
  if (email) {
    const usernameInput = document.getElementById("username");
    if (usernameInput) usernameInput.value = email;
  }

  authNotify("تم تحديث كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.", "success");
  params.delete("reset");
  params.delete("email");
  const query = params.toString();
  const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash || ""}`;
  window.history.replaceState({}, "", cleanUrl);
}

function prefillEmailFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const email = normalizeEmail(params.get("email"));
  if (!email || !isValidEmail(email)) return;

  const usernameInput = document.getElementById("username");
  if (usernameInput && !String(usernameInput.value || "").trim()) {
    usernameInput.value = email;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const cachedUser = getCurrentUser();
  const cachedEmail = normalizeEmail(cachedUser?.email);
  const cachedId = String(cachedUser?.id || "").trim();

  // Cleanup old/stale local sessions (including legacy signup_* placeholder ids).
  if (
    (localStorage.getItem("isLoggedIn") === "true" && !cachedUser) ||
    (cachedUser && (!isValidEmail(cachedEmail) || cachedId.startsWith("signup_")))
  ) {
    clearLocalAuthState();
  }

  const currentPath = (window.location.pathname || "").toLowerCase();
  if (currentPath.endsWith("/pages/signin/login.html")) {
    // Visiting login page should not keep stale signup OTP/session data.
    clearPendingSignupSession();
  }

  attachPasswordToggle();
  prefillEmailFromQuery();
  showResetSuccessIfAny();
  initGoogleSignIn();
});

function logout() {
  clearLocalAuthState();
  window.location.href = getHomePath();
}

function confirmLogout() {
  logout();
}

function isLoggedIn() {
  return localStorage.getItem("isLoggedIn") === "true" && Boolean(getCurrentUser());
}

function getCurrentUser() {
  const user = localStorage.getItem("currentUser");
  if (!user) return null;
  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
}

window.getConfig = getConfig;
window.generateOTP = generateOTP;
window.sendOTPEmail = sendOTPEmail;
window.handleSignUp = handleSignUp;
window.handleLogIn = handleLogIn;
window.logout = logout;
window.confirmLogout = confirmLogout;
window.isLoggedIn = isLoggedIn;
window.getCurrentUser = getCurrentUser;
