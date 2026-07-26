/**
 * Noon-style Phone Verification Modal Component
 * Shared across Edit Account Page and Cart Checkout protection.
 */

// Helper to get Supabase client from any page
function _getClient() {
  if (window.getSupabaseClient) return window.getSupabaseClient();
  if (window.supabaseClient) return window.supabaseClient;
  throw new Error("Supabase client not initialised on this page.");
}

(function () {
  // SVG Icons
  const WHATSAPP_SVG = `<svg viewBox="0 0 24 24"><path fill="#25D366" d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.37 5.04l-1.46 5.334 5.47-1.43a9.926 9.926 0 004.61 1.139h.004c5.502 0 9.99-4.478 9.99-9.988 0-2.668-1.036-5.176-2.92-7.062C17.182 3.14 14.685 2 12.012 2z"/><path fill="#FFF" d="M12.012 3.586c2.247 0 4.36.877 5.95 2.467 1.589 1.591 2.465 3.705 2.465 5.934 0 4.629-3.771 8.4-8.411 8.4-.904 0-1.794-.146-2.645-.436l-.378-.127-3.268.858.873-3.19-.142-.228a8.318 8.318 0 01-1.277-4.498c0-4.631 3.773-8.408 8.413-8.408zm5.088 8.948c-.282-.142-1.666-.822-1.924-.916-.257-.094-.446-.142-.634.142-.187.283-.726.916-.889 1.103-.163.189-.327.212-.609.07a7.683 7.683 0 01-2.261-1.396 8.46 8.46 0 01-1.564-1.946c-.163-.284-.017-.436.124-.577.127-.127.283-.33.424-.496.142-.165.188-.283.283-.472.094-.189.047-.354-.023-.496-.071-.142-.634-1.528-.868-2.09-.229-.55-.497-.473-.68-.482-.178-.009-.382-.009-.588-.009-.205 0-.54.077-.822.385-.282.308-1.077 1.053-1.077 2.569 0 1.516 1.103 2.983 1.256 3.19.153.205 2.169 3.312 5.253 4.646.734.317 1.306.506 1.751.648.738.234 1.41.201 1.942.122.593-.089 1.666-.679 1.9-.1333.234-.347.234-.644.164-.707-.07-.063-.257-.156-.54-.298z"/></svg>`;
  const SMS_SVG = `<svg viewBox="0 0 24 24"><path fill="#4b5563" d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>`;

  const MODAL_HTML = `
    <div id="phoneVerificationModal" class="phone-modal">
      
      <!-- Panel 1: Enter Phone Number -->
      <div id="panelPhoneInput" class="phone-modal-panel active">
        <div class="phone-modal-header">
          <h3 class="phone-modal-title">تغيير رقم الهاتف</h3>
          <button type="button" class="phone-modal-close" id="closePhoneModalBtn">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
        <p class="phone-modal-subtitle">أضف معلومات الهاتف للتحقق من حسابك</p>
        
        <div class="phone-input-row" id="phoneInputRow">
          <!-- Country Select -->
          <div class="country-select-wrap">
            <select id="modalCountrySelect">
              <option value="EG">🇪🇬 +20</option>
              <option value="SA">🇸🇦 +966</option>
            </select>
          </div>
          <!-- Number Input -->
          <input type="tel" id="modalPhoneInput" class="phone-modal-input" placeholder="أدخل رقم الجوال" />
        </div>
        
        <span class="phone-error-msg" id="phoneErrorMsg"></span>
        
        <div class="channel-title">اختر طريقة استلام الرمز</div>
        <div class="channel-options">
          <label class="channel-card active whatsapp" id="channelWhatsappLabel">
            <input type="radio" name="otp_channel" value="whatsapp" checked />
            ${WHATSAPP_SVG}
            <span>📱 WhatsApp (موصى به)</span>
          </label>
          <label class="channel-card sms" id="channelSmsLabel">
            <input type="radio" name="otp_channel" value="sms" />
            ${SMS_SVG}
            <span>💬 رسالة SMS</span>
          </label>
        </div>
        
        <button type="button" class="phone-primary-btn" id="sendOtpBtn" disabled>إرسال رمز التحقق</button>
      </div>
      
      <!-- Panel 2: Enter OTP -->
      <div id="panelOtpInput" class="phone-modal-panel">
        <div class="phone-modal-header">
          <h3 class="phone-modal-title">تحقق من حسابك</h3>
          <button type="button" class="phone-modal-close" id="closeOtpModalBtn">
            <span class="material-icons-outlined">close</span>
          </button>
        </div>
        <p class="phone-modal-subtitle">
          أدخل رمز التحقق المكون من 6 أرقام والمرسل إلى:
          <span class="otp-target-phone" id="otpTargetPhoneText"></span>
        </p>
        
        <!-- Channel indicator badge -->
        <div style="text-align: center;">
          <div class="otp-channel-badge" id="otpChannelBadge"></div>
        </div>
        
        <!-- OTP digit input row -->
        <div class="otp-inputs-row" id="otpInputsGrid">
          <input type="text" maxlength="1" class="otp-digit-input" inputmode="numeric" autocomplete="one-time-code" />
          <input type="text" maxlength="1" class="otp-digit-input" inputmode="numeric" autocomplete="one-time-code" />
          <input type="text" maxlength="1" class="otp-digit-input" inputmode="numeric" autocomplete="one-time-code" />
          <input type="text" maxlength="1" class="otp-digit-input" inputmode="numeric" autocomplete="one-time-code" />
          <input type="text" maxlength="1" class="otp-digit-input" inputmode="numeric" autocomplete="one-time-code" />
          <input type="text" maxlength="1" class="otp-digit-input" inputmode="numeric" autocomplete="one-time-code" />
        </div>
        
        <!-- Countdown timer -->
        <div class="otp-timer-container" id="otpTimerContainer">
          إعادة إرسال الرمز بعد: <span class="otp-time-val" id="otpTimerVal">00:59</span>
        </div>
        
        <!-- Resend options -->
        <div class="otp-resend-container" id="otpResendContainer">
          <button type="button" class="otp-resend-btn whatsapp" id="resendWhatsappBtn">
            ${WHATSAPP_SVG}
            <span>📱 WhatsApp</span>
          </button>
          <button type="button" class="otp-resend-btn sms" id="resendSmsBtn">
            ${SMS_SVG}
            <span>💬 رسالة SMS</span>
          </button>
        </div>
        
        <!-- Attempts counter -->
        <div class="otp-attempts-left" id="otpAttemptsLeftText"></div>
        
        <button type="button" class="phone-primary-btn" id="verifyOtpBtn">تحقق</button>
        
        <div class="otp-back-container">
          <button type="button" class="otp-back-btn" id="otpBackBtn">
            <span class="material-icons-outlined" style="font-size: 16px;">arrow_forward</span>
            <span>تغيير رقم الهاتف</span>
          </button>
        </div>
      </div>
      
      <!-- Panel 3: Success Animation -->
      <div id="panelSuccess" class="phone-modal-panel">
        <div class="success-panel">
          <svg class="success-checkmark-svg" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="25" fill="none"/>
            <path fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
          </svg>
          <h3 class="phone-modal-title" style="text-align: center; margin-bottom: 8px;">تم التحقق بنجاح!</h3>
          <p class="phone-modal-subtitle" style="text-align: center; margin-bottom: 0;">تم حفظ وتأكيد رقم الهاتف لحسابك.</p>
        </div>
      </div>
      
    </div>
  `;

  // UI state variables
  let backdropEl = null;
  let modalEl = null;
  let userEmail = "";
  let successCallback = null;
  
  let countdownTimer = null;
  let attemptsLeft = 7;
  let isSendingOtp = false;
  let isVerifyingOtp = false;
  let currentVerifyTargetPhone = "";
  let currentVerifyTargetCountry = "";

  // Inject modal markup dynamically on load
  function injectModalHTML() {
    if (document.getElementById("phoneVerificationBackdrop")) return;
    
    backdropEl = document.createElement("div");
    backdropEl.id = "phoneVerificationBackdrop";
    backdropEl.className = "phone-backdrop";
    backdropEl.innerHTML = MODAL_HTML;
    document.body.appendChild(backdropEl);

    modalEl = document.getElementById("phoneVerificationModal");
    bindModalEvents();
  }

  function bindModalEvents() {
    const closePhoneModalBtn = document.getElementById("closePhoneModalBtn");
    const closeOtpModalBtn = document.getElementById("closeOtpModalBtn");
    const modalCountrySelect = document.getElementById("modalCountrySelect");
    const modalPhoneInput = document.getElementById("modalPhoneInput");
    const sendOtpBtn = document.getElementById("sendOtpBtn");
    const verifyOtpBtn = document.getElementById("verifyOtpBtn");
    const resendWhatsappBtn = document.getElementById("resendWhatsappBtn");
    const resendSmsBtn = document.getElementById("resendSmsBtn");
    const otpBackBtn = document.getElementById("otpBackBtn");
    const channelCards = modalEl.querySelectorAll(".channel-card");

    // Close events
    if (closePhoneModalBtn) closePhoneModalBtn.addEventListener("click", closeVerificationModal);
    if (closeOtpModalBtn) closeOtpModalBtn.addEventListener("click", closeVerificationModal);

    // Country & phone input validation
    if (modalCountrySelect) modalCountrySelect.addEventListener("change", validatePhoneInput);
    if (modalPhoneInput) {
      modalPhoneInput.addEventListener("input", validatePhoneInput);
      modalPhoneInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter" && !sendOtpBtn.disabled) {
          sendOtpBtn.click();
        }
      });
    }

    // Toggle active channel cards
    channelCards.forEach(card => {
      card.addEventListener("click", function () {
        channelCards.forEach(c => c.classList.remove("active"));
        this.classList.add("active");
        const radio = this.querySelector("input[type='radio']");
        if (radio) radio.checked = true;
      });
    });

    // Send click
    if (sendOtpBtn) {
      sendOtpBtn.addEventListener("click", () => triggerSendOtp(false));
    }

    // Verify click
    if (verifyOtpBtn) {
      verifyOtpBtn.addEventListener("click", triggerVerifyOtp);
    }

    // Resend clicks
    if (resendWhatsappBtn) {
      resendWhatsappBtn.addEventListener("click", () => triggerSendOtp(true, "whatsapp"));
    }
    if (resendSmsBtn) {
      resendSmsBtn.addEventListener("click", () => triggerSendOtp(true, "sms"));
    }

    // Back click
    if (otpBackBtn) {
      otpBackBtn.addEventListener("click", () => {
        clearInterval(countdownTimer);
        modalPhoneInput.disabled = false;
        modalCountrySelect.disabled = false;
        showPanel("phone-input");
        clearOtpInputs();
        isVerifyingOtp = false;
      });
    }

    // OTP auto advance keyboard actions
    const otpInputs = document.getElementById("otpInputsGrid").querySelectorAll("input");
    otpInputs.forEach((input, index) => {
      input.addEventListener("input", function () {
        var val = this.value.replace(/\D/g, ""); // Digits only
        this.value = val;

        if (val.length === 1) {
          if (index < otpInputs.length - 1) {
            otpInputs[index + 1].focus();
          } else {
            triggerVerifyOtp(); // Auto-verify on last digit
          }
        }
      });

      input.addEventListener("keydown", function (e) {
        if (e.key === "Backspace") {
          if (this.value.length === 0 && index > 0) {
            otpInputs[index - 1].focus();
            otpInputs[index - 1].value = "";
          } else {
            this.value = "";
          }
          e.preventDefault();
        }
      });

      input.addEventListener("paste", function (e) {
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData).getData("text");
        var cleaned = text.replace(/\D/g, "").slice(0, 6);
        if (cleaned.length === 6) {
          for (var i = 0; i < cleaned.length; i++) {
            if (otpInputs[i]) otpInputs[i].value = cleaned[i];
          }
          triggerVerifyOtp();
        }
      });
    });
  }

  function validatePhoneInput() {
    const modalPhoneInput = document.getElementById("modalPhoneInput");
    const modalCountrySelect = document.getElementById("modalCountrySelect");
    const phoneInputRow = document.getElementById("phoneInputRow");
    const phoneErrorMsg = document.getElementById("phoneErrorMsg");
    const sendOtpBtn = document.getElementById("sendOtpBtn");

    if (!modalPhoneInput || !modalCountrySelect) return;

    var rawVal = modalPhoneInput.value.replace(/\D/g, "");
    modalPhoneInput.value = rawVal;

    var country = modalCountrySelect.value;
    var isValid = false;
    var errorText = "";

    if (rawVal.length > 0) {
      if (country === "EG") {
        var validPrefix = /^(0?1[0125]\d{8})$/;
        if (validPrefix.test(rawVal)) isValid = true;
        else errorText = "يرجى إدخال رقم هاتف مصري صحيح (مثال: 01XXXXXXXXX)";
      } else if (country === "SA") {
        var validPrefix = /^(0?5\d{8})$/;
        if (validPrefix.test(rawVal)) isValid = true;
        else errorText = "يرجى إدخال رقم هاتف سعودي صحيح (مثال: 05XXXXXXXX)";
      }
    }

    if (errorText) {
      if (phoneErrorMsg) phoneErrorMsg.textContent = errorText;
      if (phoneInputRow) phoneInputRow.classList.add("invalid");
    } else {
      if (phoneErrorMsg) phoneErrorMsg.textContent = "";
      if (phoneInputRow) phoneInputRow.classList.remove("invalid");
    }

    if (sendOtpBtn) sendOtpBtn.disabled = !isValid;
  }

  function showPanel(panelName) {
    const panelPhoneInput = document.getElementById("panelPhoneInput");
    const panelOtpInput = document.getElementById("panelOtpInput");
    const panelSuccess = document.getElementById("panelSuccess");

    panelPhoneInput.classList.remove("active");
    panelOtpInput.classList.remove("active");
    panelSuccess.classList.remove("active");

    if (panelName === "phone-input") panelPhoneInput.classList.add("active");
    else if (panelName === "otp-input") panelOtpInput.classList.add("active");
    else if (panelName === "success") panelSuccess.classList.add("active");
  }

  function closeVerificationModal() {
    if (backdropEl) backdropEl.classList.remove("active");
    clearInterval(countdownTimer);
    clearOtpInputs();
    isSendingOtp = false;
    isVerifyingOtp = false;
  }

  function clearOtpInputs() {
    const otpInputs = document.getElementById("otpInputsGrid").querySelectorAll("input");
    otpInputs.forEach(input => {
      input.value = "";
      input.disabled = false;
    });
    const otpAttemptsLeftText = document.getElementById("otpAttemptsLeftText");
    if (otpAttemptsLeftText) otpAttemptsLeftText.textContent = "";
  }

  function focusFirstOtpInput() {
    const otpInputs = document.getElementById("otpInputsGrid").querySelectorAll("input");
    if (otpInputs[0]) {
      setTimeout(() => otpInputs[0].focus(), 150);
    }
  }

  function maskPhoneNumber(phone, countryCode) {
    var cleaned = phone.replace(/\D/g, "");
    var local = cleaned;
    if (local.startsWith("0")) local = local.slice(1);
    
    if (countryCode === "EG") {
      return `+20 ${local.slice(0, 2)}••••${local.slice(-4)}`;
    } else if (countryCode === "SA") {
      return `+966 ${local.slice(0, 1)}••••${local.slice(-4)}`;
    }
    return phone;
  }

  function startCountdown(seconds) {
    clearInterval(countdownTimer);
    const otpTimerContainer = document.getElementById("otpTimerContainer");
    const otpResendContainer = document.getElementById("otpResendContainer");
    const otpTimerVal = document.getElementById("otpTimerVal");

    if (otpTimerContainer) otpTimerContainer.style.display = "block";
    if (otpResendContainer) otpResendContainer.style.display = "none";

    let remaining = seconds;
    if (otpTimerVal) otpTimerVal.textContent = `00:${String(remaining).padStart(2, "0")}`;

    countdownTimer = setInterval(() => {
      remaining--;
      if (otpTimerVal) otpTimerVal.textContent = `00:${String(remaining).padStart(2, "0")}`;
      
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        if (otpTimerContainer) otpTimerContainer.style.display = "none";
        if (otpResendContainer) otpResendContainer.style.display = "flex";
      }
    }, 1000);
  }

  async function triggerSendOtp(isResend = false, channelOverride = null) {
    if (isSendingOtp) return;

    const modalPhoneInput = document.getElementById("modalPhoneInput");
    const modalCountrySelect = document.getElementById("modalCountrySelect");
    const sendOtpBtn = document.getElementById("sendOtpBtn");
    const resendWhatsappBtn = document.getElementById("resendWhatsappBtn");
    const resendSmsBtn = document.getElementById("resendSmsBtn");
    const phoneErrorMsg = document.getElementById("phoneErrorMsg");
    const otpTargetPhoneText = document.getElementById("otpTargetPhoneText");
    const otpChannelBadge = document.getElementById("otpChannelBadge");

    const phoneVal = modalPhoneInput.value.trim();
    const countryVal = modalCountrySelect.value;
    
    let channelVal = "whatsapp";
    if (channelOverride) {
      channelVal = channelOverride;
    } else {
      const checkedRadio = document.querySelector("input[name='otp_channel']:checked");
      if (checkedRadio) channelVal = checkedRadio.value;
    }

    isSendingOtp = true;
    const activeBtn = isResend ? (channelVal === "whatsapp" ? resendWhatsappBtn : resendSmsBtn) : sendOtpBtn;
    if (!activeBtn) return;

    const origHtml = activeBtn.innerHTML;
    activeBtn.disabled = true;
    activeBtn.innerHTML = (isResend ? 'إرسال الرمز' : 'إرسال رمز التحقق') + ' <span class="btn-loader"></span>';

    try {
      const client = _getClient();
      
      const { data, error } = await client.functions.invoke("phone-verification", {
        body: {
          action: "send-otp",
          phone_number: phoneVal,
          country_code: countryVal,
          channel: channelVal,
          email: userEmail
        }
      });

      if (error) throw error;

      if (data && data.success) {
        showToast(data.fallback ? "تم التحويل إلى SMS تلقائياً لعدم توفر واتساب" : "تم إرسال رمز التحقق بنجاح!");
        
        currentVerifyTargetPhone = phoneVal;
        currentVerifyTargetCountry = countryVal;

        modalPhoneInput.disabled = true;
        modalCountrySelect.disabled = true;

        showPanel("otp-input");

        if (otpTargetPhoneText) {
          otpTargetPhoneText.textContent = maskPhoneNumber(phoneVal, countryVal);
        }

        const finalChannel = data.channel || channelVal;
        if (otpChannelBadge) {
          if (finalChannel === "whatsapp") {
            otpChannelBadge.className = "otp-channel-badge whatsapp";
            otpChannelBadge.innerHTML = `${WHATSAPP_SVG} <span>📱 WhatsApp</span>`;
          } else {
            otpChannelBadge.className = "otp-channel-badge sms";
            otpChannelBadge.innerHTML = `${SMS_SVG} <span>💬 الرسائل النصية (SMS)</span>`;
          }
        }

        startCountdown(59);
        attemptsLeft = 7;
        updateAttemptsDisplay();
        clearOtpInputs();
        focusFirstOtpInput();
      } else {
        throw new Error((data && data.error) || "فشل إرسال كود التحقق.");
      }
    } catch (err) {
      console.error("Send OTP error:", err);
      let msg = err.message || "حدث خطأ أثناء إرسال الرمز. يرجى المحاولة لاحقاً.";
      
      try {
        if (err.context && typeof err.context.text === 'function') {
          var text = await err.context.text();
          var parsed = JSON.parse(text);
          if (parsed && parsed.error) msg = parsed.error;
        }
      } catch (e) {}

      showToast(msg);
      if (phoneErrorMsg) phoneErrorMsg.textContent = msg;
    } finally {
      isSendingOtp = false;
      activeBtn.disabled = false;
      activeBtn.innerHTML = origHtml;
    }
  }

  async function triggerVerifyOtp() {
    if (isVerifyingOtp) return;

    const otpInputs = document.getElementById("otpInputsGrid").querySelectorAll("input");
    const verifyOtpBtn = document.getElementById("verifyOtpBtn");
    const otpAttemptsLeftText = document.getElementById("otpAttemptsLeftText");
    const panelSuccess = document.getElementById("panelSuccess");

    var digits = [];
    otpInputs.forEach(input => digits.push(input.value.trim()));
    var code = digits.join("");

    if (code.length < 6) {
      showToast("يرجى إدخال الرمز المكون من 6 أرقام كاملاً");
      return;
    }

    isVerifyingOtp = true;
    let origHtml = "";
    if (verifyOtpBtn) {
      verifyOtpBtn.disabled = true;
      origHtml = verifyOtpBtn.innerHTML;
      verifyOtpBtn.innerHTML = 'تحقق <span class="btn-loader"></span>';
    }

    otpInputs.forEach(input => input.disabled = true);

    try {
      const client = _getClient();

      var { data, error } = await client.functions.invoke("phone-verification", {
        body: {
          action: "verify-otp",
          phone_number: currentVerifyTargetPhone,
          country_code: currentVerifyTargetCountry,
          otp_code: code,
          email: userEmail
        }
      });

      if (error) throw error;

      if (data && data.success) {
        clearInterval(countdownTimer);
        showPanel("success");
        
        var rawNumber = currentVerifyTargetPhone.replace(/\D/g, "");
        if (rawNumber.startsWith("0")) rawNumber = rawNumber.slice(1);
        var prefix = currentVerifyTargetCountry === "EG" ? "+20" : "+966";
        var finalPhone = `${prefix}${rawNumber}`;

        // Save states
        localStorage.setItem("userPhone", finalPhone);
        localStorage.setItem("userPhoneVerified", "true");
        localStorage.setItem("userPhoneCountry", currentVerifyTargetCountry);

        setTimeout(() => {
          closeVerificationModal();
          showToast("تم التحقق وتأكيد رقم الهاتف بنجاح!");
          if (successCallback) {
            successCallback(finalPhone, currentVerifyTargetCountry);
          }
        }, 1300);

      } else {
        throw new Error((data && data.error) || "كود التحقق غير صحيح");
      }
    } catch (err) {
      console.error("Verification failed:", err);
      
      // Play shake animation
      if (modalEl) {
        modalEl.classList.add("shake");
        setTimeout(() => modalEl.classList.remove("shake"), 400);
      }

      otpInputs.forEach(input => input.disabled = false);
      clearOtpInputs();
      focusFirstOtpInput();

      var msg = "رمز التحقق غير صحيح.";
      try {
        if (err.context && typeof err.context.text === 'function') {
          var text = await err.context.text();
          var parsed = JSON.parse(text);
          if (parsed) {
            if (parsed.error) msg = parsed.error;
            if (parsed.attempts_left !== undefined) {
              attemptsLeft = parsed.attempts_left;
              updateAttemptsDisplay();
            }
            if (parsed.locked) {
              attemptsLeft = 0;
              updateAttemptsDisplay();
              otpInputs.forEach(input => input.disabled = true);
              if (verifyOtpBtn) verifyOtpBtn.disabled = true;
            }
          }
        }
      } catch (e) {}

      showToast(msg);
      if (otpAttemptsLeftText) otpAttemptsLeftText.textContent = msg;

      if (verifyOtpBtn) {
        verifyOtpBtn.disabled = false;
        verifyOtpBtn.innerHTML = origHtml;
      }
      isVerifyingOtp = false;
    } finally {
      if (!panelSuccess.classList.contains("active") && attemptsLeft > 0) {
        if (verifyOtpBtn) {
          verifyOtpBtn.disabled = false;
          verifyOtpBtn.innerHTML = origHtml;
        }
        isVerifyingOtp = false;
      }
    }
  }

  function updateAttemptsDisplay() {
    const otpAttemptsLeftText = document.getElementById("otpAttemptsLeftText");
    if (!otpAttemptsLeftText) return;
    if (attemptsLeft <= 0) {
      otpAttemptsLeftText.textContent = "تم قفل العملية بسبب محاولات خاطئة كثيرة. يرجى المحاولة بعد 15 دقيقة.";
    } else if (attemptsLeft < 7) {
      otpAttemptsLeftText.textContent = `متبقي: ${attemptsLeft} محاولات`;
    } else {
      otpAttemptsLeftText.textContent = "";
    }
  }

  function showToast(msg) {
    var el = document.createElement("div");
    el.textContent = msg;
    el.style.cssText = "position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:10px;font-size:0.85rem;font-weight:700;z-index:999999;opacity:0;transition:opacity 0.3s;text-align:center;";
    document.body.appendChild(el);
    requestAnimationFrame(() => el.style.opacity = "1");
    setTimeout(() => {
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 300);
    }, 2800);
  }

  function openPhoneVerificationModal(prefillPhone, prefillCountry) {
    if (!backdropEl) injectModalHTML();
    backdropEl.classList.add("active");
    showPanel("phone-input");

    const modalCountrySelect = document.getElementById("modalCountrySelect");
    const modalPhoneInput = document.getElementById("modalPhoneInput");

    // Determine country — force to user's account country
    var userCountry = (typeof getUserCountryCode === 'function') ? getUserCountryCode() : (prefillCountry || localStorage.getItem('userCountry') || 'SA');
    var country = userCountry;
    if (modalCountrySelect) {
      // Show only the matching country option
      for (var pi = 0; pi < modalCountrySelect.options.length; pi++) {
        modalCountrySelect.options[pi].style.display = modalCountrySelect.options[pi].value === country ? '' : 'none';
      }
      modalCountrySelect.value = country;
      modalCountrySelect.disabled = false;
    }

    // Pre-fill phone number if provided (strip country prefix → local 0XXXXXXXXX)
    var localNum = "";
    if (prefillPhone) {
      var raw = String(prefillPhone).replace(/\s/g, "");
      if (country === "EG") {
        raw = raw.replace(/^\+?20/, "");
        if (!raw.startsWith("0")) raw = "0" + raw;
      } else if (country === "SA") {
        raw = raw.replace(/^\+?966/, "");
        if (!raw.startsWith("0")) raw = "0" + raw;
      }
      localNum = raw.replace(/\D/g, "");
    }

    if (modalPhoneInput) {
      modalPhoneInput.value = localNum;
      modalPhoneInput.disabled = false;
    }

    // Validate after a tick so the DOM updates first
    setTimeout(validatePhoneInput, 0);
  }

  // Export globally
  window.PhoneVerification = {
    /**
     * @param {string}   email          - User's email for OTP logging
     * @param {Function} callback        - Called with (phone, country) on success
     * @param {object}   [options]       - Optional: { prefillPhone, prefillCountry }
     */
    show: function (email, callback, options) {
      userEmail = String(email || "").trim().toLowerCase();
      successCallback = callback;

      // Inject HTML if not already there
      injectModalHTML();

      // Clear previous timer/state
      clearInterval(countdownTimer);
      isSendingOtp = false;
      isVerifyingOtp = false;
      attemptsLeft = 7;

      var opts = options || {};
      openPhoneVerificationModal(opts.prefillPhone || "", opts.prefillCountry || "EG");
    }
  };
})();
