(function () {
  "use strict";

  const OTP_LENGTH = 6;
  const OTP_TTL_MS = 10 * 60 * 1000;
  const RESEND_COOLDOWN_MS = 60 * 1000;
  const MAX_RESEND_ATTEMPTS = 3;

  const EMAILJS_PUBLIC_KEY = "xdVqEELgzBCftq4cf";
  const EMAILJS_SERVICE_ID = "service_xsps2sb";
  const EMAILJS_TEMPLATE_ID = "template_o7zn76j";

  const STORAGE = {
    email: "reset_email",
    otp: "reset_otp",
    otpExpiresAt: "reset_otp_expires_at",
    verified: "reset_verified",
    resendAttempts: "reset_resend_attempts",
    maxResendAttempts: "reset_max_resend_attempts",
    resendCooldownUntil: "reset_resend_cooldown_until",
  };

  let countdownTimer = null;

  function notify(message, type = "error", duration = 4500) {
    const text = String(message || "").trim();
    if (!text) return;

    if (window.BudaUI?.notify) {
      window.BudaUI.notify(text, { type, target: "#auth-feedback", duration });
      return;
    }

    const feedback = document.getElementById("auth-feedback");
    if (!feedback) return;

    feedback.textContent = text;
    feedback.classList.remove("hidden", "success", "error", "info");
    feedback.classList.add("status-note", type === "success" ? "success" : type === "info" ? "info" : "error");
  }

  function getClient() {
    if (window.supabaseClient?.raw) return window.supabaseClient.raw();
    if (typeof window.getSupabaseClient === "function") return window.getSupabaseClient();
    throw new Error("تعذر تهيئة الاتصال بقاعدة البيانات.");
  }

  function normalizeEmail(email) {
    if (window.BudaSecurity?.normalizeEmail) {
      return window.BudaSecurity.normalizeEmail(email);
    }
    return String(email || "").trim().toLowerCase();
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  function setButtonState(button, loadingText, isLoading) {
    if (!button) return;
    if (!button.dataset.defaultText) {
      button.dataset.defaultText = button.textContent || "";
    }

    button.disabled = Boolean(isLoading);
    button.textContent = isLoading ? loadingText : button.dataset.defaultText;
  }

  function initEmailJS() {
    if (!window.emailjs) throw new Error("خدمة البريد غير متاحة الآن.");
    if (window.__Buda_EMAILJS_READY__) return;

    window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    window.__Buda_EMAILJS_READY__ = true;
  }

  async function sendOTPEmail(email, otp) {
    initEmailJS();
    const expirationTime = new Date(Date.now() + OTP_TTL_MS).toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    });

    try {
      await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email: email,
        email: email,
        passcode: otp,
        time: expirationTime,
      });
    } catch (err) {
      console.error("[password-reset] sendOTPEmail error:", err);
      throw err;
    }
  }

  async function checkUserExists(email) {
    const client = getClient();
    const { data, error } = await client.from("users").select("email").eq("email", email).limit(1);
    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
  }

  function setResetSession(email, otp) {
    sessionStorage.setItem(STORAGE.email, email);
    sessionStorage.setItem(STORAGE.otp, otp);
    sessionStorage.setItem(STORAGE.otpExpiresAt, String(Date.now() + OTP_TTL_MS));
    sessionStorage.setItem(STORAGE.verified, "0");
    sessionStorage.setItem(STORAGE.resendAttempts, "0");
    sessionStorage.setItem(STORAGE.maxResendAttempts, String(MAX_RESEND_ATTEMPTS));
    sessionStorage.setItem(STORAGE.resendCooldownUntil, String(Date.now() + RESEND_COOLDOWN_MS));
  }

  function updateOTPState(otp, isResend) {
    sessionStorage.setItem(STORAGE.otp, otp);
    sessionStorage.setItem(STORAGE.otpExpiresAt, String(Date.now() + OTP_TTL_MS));
    sessionStorage.setItem(STORAGE.verified, "0");
    sessionStorage.setItem(STORAGE.resendCooldownUntil, String(Date.now() + RESEND_COOLDOWN_MS));

    if (isResend) {
      const attempts = getResendAttempts() + 1;
      sessionStorage.setItem(STORAGE.resendAttempts, String(attempts));
    }
  }

  function getResendAttempts() {
    const value = parseInt(sessionStorage.getItem(STORAGE.resendAttempts) || "0", 10);
    return Number.isFinite(value) ? value : 0;
  }

  function getMaxResendAttempts() {
    const value = parseInt(sessionStorage.getItem(STORAGE.maxResendAttempts) || String(MAX_RESEND_ATTEMPTS), 10);
    return Number.isFinite(value) ? value : MAX_RESEND_ATTEMPTS;
  }

  function getCooldownUntil() {
    const value = parseInt(sessionStorage.getItem(STORAGE.resendCooldownUntil) || "0", 10);
    return Number.isFinite(value) ? value : 0;
  }

  function clearResetSession() {
    Object.values(STORAGE).forEach((key) => sessionStorage.removeItem(key));
  }

  function updateAttemptsText() {
    const attemptsBox = document.getElementById("reset-attempts");
    if (!attemptsBox) return;

    const attempts = getResendAttempts();
    const maxAttempts = getMaxResendAttempts();
    const remaining = Math.max(0, maxAttempts - attempts);

    if (remaining <= 0) {
      attemptsBox.textContent = "تم استهلاك كل محاولات إعادة الإرسال.";
      attemptsBox.className = "resend-attempts locked";
      return;
    }

    attemptsBox.textContent = `المحاولات المتبقية: ${remaining}`;
    attemptsBox.className = remaining === 1 ? "resend-attempts warning" : "resend-attempts";
  }

  function stopCountdown() {
    if (!countdownTimer) return;
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  function renderCountdown() {
    const resendBtn = document.getElementById("resend-code-btn");
    const countdown = document.getElementById("reset-countdown");
    if (!resendBtn || !countdown) return;

    stopCountdown();

    const tick = () => {
      const remainingMs = getCooldownUntil() - Date.now();
      const remainingSec = Math.ceil(remainingMs / 1000);
      if (remainingSec > 0) {
        resendBtn.disabled = true;
        countdown.style.display = "inline";
        countdown.textContent = `(${remainingSec}ث)`;
        return;
      }

      resendBtn.disabled = getResendAttempts() >= getMaxResendAttempts();
      countdown.style.display = "none";
      countdown.textContent = "";
      stopCountdown();
    };

    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  function getEnteredOTP(container) {
    const inputs = Array.from(container.querySelectorAll(".otp-input"));
    return inputs.map((input) => String(input.value || "").trim()).join("");
  }

  function bindOTPInputs(container) {
    if (!container) return;

    const inputs = Array.from(container.querySelectorAll(".otp-input"));
    if (!inputs.length) return;

    inputs[0].focus();

    inputs.forEach((input, index) => {
      input.addEventListener("input", (event) => {
        const value = String(event.target.value || "").replace(/\D/g, "").slice(0, 1);
        event.target.value = value;
        event.target.classList.toggle("filled", Boolean(value));

        if (value && index < inputs.length - 1) {
          inputs[index + 1].focus();
        }
      });

      input.addEventListener("keydown", (event) => {
        if (event.key === "Backspace" && !input.value && index > 0) {
          inputs[index - 1].focus();
        }
      });
    });

    container.addEventListener("paste", (event) => {
      const pasted = (event.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, OTP_LENGTH);
      if (!pasted) return;

      event.preventDefault();
      inputs.forEach((input, idx) => {
        const char = pasted[idx] || "";
        input.value = char;
        input.classList.toggle("filled", Boolean(char));
      });

      const focusIndex = Math.min(pasted.length, inputs.length - 1);
      inputs[focusIndex].focus();
    });
  }

  function getResetEmailOrRedirect() {
    const email = normalizeEmail(sessionStorage.getItem(STORAGE.email));
    if (email) return email;

    notify("انتهت جلسة الاستعادة. أعد المحاولة من البداية.", "error");
    setTimeout(() => {
      window.location.href = "forgot-password.html";
    }, 900);
    return "";
  }

  function initForgotPage() {
    const form = document.getElementById("forgot-form");
    if (!form) return;

    const emailInput = document.getElementById("reset-email");
    const sendBtn = document.getElementById("send-code-btn");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const email = normalizeEmail(emailInput?.value);
      if (!email || !isValidEmail(email)) {
        notify("يرجى إدخال بريد إلكتروني صحيح.", "error");
        return;
      }

      setButtonState(sendBtn, "جارٍ إرسال الكود...", true);

      try {
        const exists = await checkUserExists(email);
        if (!exists) {
          notify("لا يوجد حساب مسجل بهذا البريد الإلكتروني.", "error");
          return;
        }

        const otp = generateOTP();
        await sendOTPEmail(email, otp);
        setResetSession(email, otp);

        notify("تم إرسال كود التحقق إلى بريدك الإلكتروني.", "success");
        setTimeout(() => {
          window.location.href = "reset-code.html";
        }, 650);
      } catch (error) {
        console.error("forgot password error", error);
        notify("تعذر إرسال الكود الآن. حاول مرة أخرى لاحقًا.", "error");
      } finally {
        setButtonState(sendBtn, "", false);
      }
    });
  }

  function initResetCodePage() {
    const form = document.getElementById("reset-code-form");
    if (!form) return;

    const email = getResetEmailOrRedirect();
    if (!email) return;

    const emailDisplay = document.getElementById("reset-email-display");
    const verifyBtn = document.getElementById("verify-reset-code-btn");
    const resendBtn = document.getElementById("resend-code-btn");
    const otpContainer = document.getElementById("reset-otp-container");

    if (emailDisplay) emailDisplay.textContent = email;
    bindOTPInputs(otpContainer);
    updateAttemptsText();
    renderCountdown();

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const entered = getEnteredOTP(otpContainer);
      if (!/^\d{6}$/.test(entered)) {
        notify("يرجى إدخال كود مكوّن من 6 أرقام.", "error");
        return;
      }

      const expected = String(sessionStorage.getItem(STORAGE.otp) || "");
      const expiresAt = parseInt(sessionStorage.getItem(STORAGE.otpExpiresAt) || "0", 10);

      if (!expected || !expiresAt || Date.now() > expiresAt) {
        notify("انتهت صلاحية الكود. أعد الإرسال مرة أخرى.", "error");
        return;
      }

      if (entered !== expected) {
        notify("الكود غير صحيح. حاول مرة أخرى.", "error");
        otpContainer.querySelectorAll(".otp-input").forEach((input) => input.classList.add("error"));
        setTimeout(() => {
          otpContainer.querySelectorAll(".otp-input").forEach((input) => input.classList.remove("error"));
        }, 800);
        return;
      }

      sessionStorage.setItem(STORAGE.verified, "1");
      notify("تم التحقق بنجاح. سيتم تحويلك لإعادة تعيين كلمة المرور.", "success");
      setButtonState(verifyBtn, "جارٍ التحويل...", true);

      setTimeout(() => {
        window.location.href = "reset-password.html";
      }, 500);
    });

    resendBtn?.addEventListener("click", async () => {
      const attempts = getResendAttempts();
      const maxAttempts = getMaxResendAttempts();
      if (attempts >= maxAttempts) {
        notify("تم استهلاك محاولات إعادة الإرسال.", "error");
        updateAttemptsText();
        renderCountdown();
        return;
      }

      const cooldownUntil = getCooldownUntil();
      if (cooldownUntil > Date.now()) {
        notify("انتظر قليلًا قبل إعادة الإرسال.", "info", 2200);
        renderCountdown();
        return;
      }

      setButtonState(resendBtn, "جارٍ الإرسال...", true);

      try {
        const otp = generateOTP();
        await sendOTPEmail(email, otp);
        updateOTPState(otp, true);

        notify("تم إرسال كود جديد بنجاح.", "success");
        otpContainer.querySelectorAll(".otp-input").forEach((input) => {
          input.value = "";
          input.classList.remove("filled", "error");
        });
        otpContainer.querySelector(".otp-input")?.focus();
      } catch (error) {
        console.error("resend reset code error", error);
        notify("فشل إعادة إرسال الكود الآن. حاول بعد قليل.", "error");
      } finally {
        setButtonState(resendBtn, "", false);
        updateAttemptsText();
        renderCountdown();
      }
    });
  }

  function initPasswordToggle() {
    const buttons = document.querySelectorAll("[data-toggle-pass]");
    buttons.forEach((btn) => {
      const targetId = btn.getAttribute("data-toggle-pass");
      const input = targetId ? document.getElementById(targetId) : null;
      if (!input) return;

      btn.addEventListener("click", () => {
        const visible = input.type === "text";
        input.type = visible ? "password" : "text";
        const icon = btn.querySelector("i");
        if (icon) {
          icon.classList.toggle("fa-eye", visible);
          icon.classList.toggle("fa-eye-slash", !visible);
        }
      });
    });
  }

  function initResetPasswordPage() {
    const form = document.getElementById("reset-password-form");
    if (!form) return;

    const email = getResetEmailOrRedirect();
    if (!email) return;

    const isVerified = sessionStorage.getItem(STORAGE.verified) === "1";
    if (!isVerified) {
      notify("يجب التحقق من الكود أولًا.", "error");
      setTimeout(() => {
        window.location.href = "reset-code.html";
      }, 900);
      return;
    }

    const emailDisplay = document.getElementById("reset-email-display");
    const newPasswordInput = document.getElementById("new-password");
    const confirmPasswordInput = document.getElementById("confirm-new-password");
    const saveBtn = document.getElementById("reset-password-btn");

    if (emailDisplay) emailDisplay.textContent = email;
    initPasswordToggle();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const newPassword = String(newPasswordInput?.value || "");
      const confirmPassword = String(confirmPasswordInput?.value || "");

      if (newPassword.length < 8) {
        notify("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.", "error");
        return;
      }

      if (window.BudaSecurity?.isStrongPassword && !window.BudaSecurity.isStrongPassword(newPassword)) {
        notify("استخدم كلمة مرور قوية: حرف كبير وصغير ورقم ورمز.", "error");
        return;
      }

      if (newPassword !== confirmPassword) {
        notify("كلمتا المرور غير متطابقتين.", "error");
        return;
      }

      setButtonState(saveBtn, "جارٍ تحديث كلمة المرور...", true);

      try {
        const client = getClient();
        const passwordValue = window.BudaSecurity?.hashPassword
          ? await window.BudaSecurity.hashPassword(newPassword, email)
          : newPassword;

        const payloadAttempts = [
          { password: passwordValue, password_hash: passwordValue },
          { password: passwordValue },
          { password_hash: passwordValue },
        ];

        let updateError = null;
        for (const payload of payloadAttempts) {
          const { error } = await client.from("users").update(payload).eq("email", email);
          if (!error) {
            updateError = null;
            break;
          }

          updateError = error;
          const message = `${error.message || ""} ${error.details || ""}`.toLowerCase();
          const code = String(error.code || "").toLowerCase();
          const isMissingColumn =
            error.code === "PGRST204" ||
            code === "42703" ||
            (message.includes("column") && message.includes("does not exist"));
          if (isMissingColumn) continue;
          break;
        }

        if (updateError) throw updateError;

        clearResetSession();
        notify("تم تغيير كلمة المرور بنجاح.", "success");

        setTimeout(() => {
          const query = new URLSearchParams({ reset: "success", email }).toString();
          window.location.href = `login.html?${query}`;
        }, 650);
      } catch (error) {
        console.error("reset password error", error);
        notify("تعذر تحديث كلمة المرور الآن. حاول لاحقًا.", "error");
      } finally {
        setButtonState(saveBtn, "", false);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initForgotPage();
    initResetCodePage();
    initResetPasswordPage();
  });

  window.addEventListener("beforeunload", () => {
    stopCountdown();
  });
})();

