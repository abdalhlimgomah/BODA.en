console.log("[edit-account.js] version 20260703 noon-verification loaded");

document.addEventListener("DOMContentLoaded", function () {
  var storedEmail = (localStorage.getItem("userEmail") || sessionStorage.getItem("user_email") || "").trim().toLowerCase();

  // Profile Form Fields
  var emailInput = document.getElementById("editEmail");
  var phoneInput = document.getElementById("editPhone"); // hidden input now
  var firstNameInput = document.getElementById("editFirstName");
  var lastNameInput = document.getElementById("editLastName");
  var birthDay = document.getElementById("editBirthDay");
  var birthMonth = document.getElementById("editBirthMonth");
  var birthYear = document.getElementById("editBirthYear");
  var genderMale = document.getElementById("genderMale");
  var genderFemale = document.getElementById("genderFemale");
  var nationalitySelect = document.getElementById("editNationality");
  var submitBtn = document.getElementById("editSubmitBtn");
  var birthdayDisplay = document.getElementById("birthdayDisplay");

  // Readonly phone display card elements
  var phoneDisplayVal = document.getElementById("phoneDisplayVal");
  var phoneStatusBadge = document.getElementById("phoneStatusBadge");
  var phoneStatusBadgeText = document.getElementById("phoneStatusBadgeText");
  var editPhoneTriggerBtn = document.getElementById("editPhoneTriggerBtn");

  // Modal elements
  var phoneVerificationBackdrop = document.getElementById("phoneVerificationBackdrop");
  var phoneVerificationModal = document.getElementById("phoneVerificationModal");
  
  var closePhoneModalBtn = document.getElementById("closePhoneModalBtn");
  var closeOtpModalBtn = document.getElementById("closeOtpModalBtn");
  
  var panelPhoneInput = document.getElementById("panelPhoneInput");
  var panelOtpInput = document.getElementById("panelOtpInput");
  var panelSuccess = document.getElementById("panelSuccess");
  
  var modalCountrySelect = document.getElementById("modalCountrySelect");
  var modalPhoneInput = document.getElementById("modalPhoneInput");
  var phoneInputRow = document.getElementById("phoneInputRow");
  var phoneErrorMsg = document.getElementById("phoneErrorMsg");
  var sendOtpBtn = document.getElementById("sendOtpBtn");
  
  var otpTargetPhoneText = document.getElementById("otpTargetPhoneText");
  var otpChannelBadge = document.getElementById("otpChannelBadge");
  var otpInputsGrid = document.getElementById("otpInputsGrid");
  var otpTimerContainer = document.getElementById("otpTimerContainer");
  var otpTimerVal = document.getElementById("otpTimerVal");
  var otpResendContainer = document.getElementById("otpResendContainer");
  var resendWhatsappBtn = document.getElementById("resendWhatsappBtn");
  var resendSmsBtn = document.getElementById("resendSmsBtn");
  var otpAttemptsLeftText = document.getElementById("otpAttemptsLeftText");
  var verifyOtpBtn = document.getElementById("verifyOtpBtn");
  var otpBackBtn = document.getElementById("otpBackBtn");
  var otpWhatsappHelpBtn = document.getElementById("otpWhatsappHelpBtn");
  var otpEntryScreen    = document.getElementById("otpEntryScreen");
  var waHelpScreen      = document.getElementById("waHelpScreen");
  var waHelpBackToOtpBtn = document.getElementById("waHelpBackToOtpBtn");
  var closeWaHelpBtn    = document.getElementById("closeWaHelpBtn");

  // Phone Verification State
  var currentPhoneVerified = false;
  var currentPhoneNumber = "";
  var currentPhoneCountry = "";

  var currentVerifyTargetPhone = "";
  var currentVerifyTargetCountry = "";
  var countdownTimer = null;
  var attemptsLeft = 7;
  var isSendingOtp = false;
  var isVerifyingOtp = false;

  function getClient() {
    try { return window.getSupabaseClient(); } catch (e) { return null; }
  }

  // Populate birthday selects
  function populateBirthdaySelects() {
    if (!birthDay || !birthMonth || !birthYear) return;
    for (var d = 1; d <= 31; d++) {
      var opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      birthDay.appendChild(opt);
    }
    for (var m = 1; m <= 12; m++) {
      var opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      birthMonth.appendChild(opt);
    }
    var currentYear = new Date().getFullYear();
    for (var y = currentYear; y >= 1940; y--) {
      var opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      birthYear.appendChild(opt);
    }
  }

  // Set visual status card
  function updatePhoneDisplayCard(phone, verified, country) {
    currentPhoneNumber = phone || "";
    currentPhoneVerified = !!verified;
    currentPhoneCountry = country || "";

    if (phoneInput) phoneInput.value = currentPhoneNumber;

    if (phoneDisplayVal) {
      phoneDisplayVal.textContent = currentPhoneNumber || "لم يتم تعيين رقم هاتف";
    }

    if (phoneStatusBadge) {
      if (currentPhoneVerified && currentPhoneNumber) {
        phoneStatusBadge.className = "phone-badge verified";
        phoneStatusBadge.innerHTML = '<span class="material-icons-outlined">check_circle</span><span id="phoneStatusBadgeText">مُتحقق</span>';
      } else {
        phoneStatusBadge.className = "phone-badge unverified";
        phoneStatusBadge.innerHTML = '<span class="material-icons-outlined">warning</span><span id="phoneStatusBadgeText">غير متحقق</span>';
      }
    }
  }

  // Load from Supabase + localStorage fallback
  async function loadProfile() {
    if (emailInput) emailInput.value = storedEmail;

    var profile = null;
    var client = getClient();
    if (client && storedEmail) {
      try {
        console.log("[edit-account.js] Loading profile from Supabase for email:", storedEmail);
        var { data, error } = await client.from("profiles").select("*").eq("email", storedEmail).limit(1);
        
        if (error) {
          console.error("[edit-account.js] Supabase profile fetch error:", error);
        }

        if (Array.isArray(data) && data.length) {
          profile = data[0];
          console.log("[edit-account.js] Profile successfully loaded from Supabase:", profile);
        } else {
          console.log("[edit-account.js] Profile row not found. Auto-creating a new row...");
          // Auto-create profile row if missing
          var newProfile = {
            email: storedEmail,
            full_name: localStorage.getItem("userFullName") || "",
            first_name: localStorage.getItem("userFirstName") || "",
            last_name: localStorage.getItem("userLastName") || "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          var { error: insErr } = await client.from("profiles").insert(newProfile);
          if (!insErr) {
            console.log("[edit-account.js] Auto-created new profile successfully. Re-fetching...");
            // Re-fetch to get the auto-generated uuid
            var { data: reFetched, error: reFetchErr } = await client.from("profiles").select("*").eq("email", storedEmail).limit(1);
            if (reFetched && reFetched.length) {
              profile = reFetched[0];
              console.log("[edit-account.js] Profile re-fetched successfully:", profile);
            }
          } else {
            console.warn("[edit-account.js] Auto profile insert error:", insErr);
          }
        }
      } catch (e) { console.warn("[edit-account.js] Profile fetch exception:", e); }
    }

    // Safety check: Does the localStorage cache belong to the currently logged-in email?
    var cacheBelongsToCurrentUser = false;
    if (storedEmail) {
      cacheBelongsToCurrentUser = (localStorage.getItem("userEmail") || "").trim().toLowerCase() === storedEmail.trim().toLowerCase();
    }

    // Phone & Verification State
    var phone = "";
    var verified = false;
    var accCountry = localStorage.getItem('userCountry') || 'SA';
    var country = accCountry;

    if (profile) {
      phone = profile.phone_number || profile.phone || "";
      verified = !!profile.phone_verified;
      country = profile.phone_country || accCountry;
    } else if (cacheBelongsToCurrentUser) {
      phone = localStorage.getItem("userPhone") || "";
      verified = localStorage.getItem("userPhoneVerified") === "true";
      country = localStorage.getItem("userPhoneCountry") || accCountry;
    }
    
    updatePhoneDisplayCard(phone, verified, country);

    // First / Last name
    var firstName = "";
    var lastName = "";

    if (profile) {
      firstName = profile.first_name || "";
      lastName = profile.last_name || "";
    } else if (cacheBelongsToCurrentUser) {
      firstName = localStorage.getItem("userFirstName") || "";
      lastName = localStorage.getItem("userLastName") || "";
      if (!firstName && !lastName) {
        var full = localStorage.getItem("userFullName") || "";
        var parts = full.trim().split(/\s+/);
        firstName = parts[0] || "";
        lastName = parts.slice(1).join(" ") || "";
      }
    }

    if (firstNameInput) firstNameInput.value = firstName;
    if (lastNameInput) lastNameInput.value = lastName;

    // Birthday
    var bd = "";
    var bm = "";
    var by = "";

    if (profile) {
      bd = profile.birth_day || "";
      bm = profile.birth_month || "";
      by = profile.birth_year || "";
    } else if (cacheBelongsToCurrentUser) {
      bd = localStorage.getItem("userBirthDay") || "";
      bm = localStorage.getItem("userBirthMonth") || "";
      by = localStorage.getItem("userBirthYear") || "";
    }

    if (bd && birthDay) birthDay.value = bd;
    if (bm && birthMonth) birthMonth.value = bm;
    if (by && birthYear) birthYear.value = by;

    // Lock birthday once set
    if (bd && bm && by) {
      if (birthDay) { birthDay.disabled = true; birthDay.style.opacity = "0.6"; }
      if (birthMonth) { birthMonth.disabled = true; birthMonth.style.opacity = "0.6"; }
      if (birthYear) { birthYear.disabled = true; birthYear.style.opacity = "0.6"; }
    }

    // Gender
    var gender = "";
    if (profile) {
      gender = profile.gender || "";
    } else if (cacheBelongsToCurrentUser) {
      gender = localStorage.getItem("userGender") || "";
    }

    // Reset gender active classes first
    if (genderMale) genderMale.classList.remove("active");
    if (genderFemale) genderFemale.classList.remove("active");

    if (gender === "male" && genderMale) genderMale.classList.add("active");
    else if (gender === "female" && genderFemale) genderFemale.classList.add("active");

    // Nationality
    var nat = "";
    if (profile) {
      nat = profile.nationality || "";
    } else if (cacheBelongsToCurrentUser) {
      nat = localStorage.getItem("userNationality") || "";
    }

    if (nat && nationalitySelect) {
      for (var i = 0; i < nationalitySelect.options.length; i++) {
        if (nationalitySelect.options[i].value === nat) {
          nationalitySelect.value = nat;
          break;
        }
      }
    }

    updateBirthdayDisplay();
  }

  function updateBirthdayDisplay() {
    if (!birthdayDisplay) return;
    var d = birthDay ? birthDay.value : "";
    var m = birthMonth ? birthMonth.value : "";
    var y = birthYear ? birthYear.value : "";
    if (d && m && y) {
      birthdayDisplay.textContent = d + "/" + m + "/" + y + " — شوف العروض في يوم ميلادك!";
    } else {
      birthdayDisplay.textContent = "";
    }
  }

  // Gender click
  if (genderMale) {
    genderMale.addEventListener("click", function () {
      genderMale.querySelector("input").checked = true;
      genderMale.classList.add("active");
      if (genderFemale) genderFemale.classList.remove("active");
    });
  }
  if (genderFemale) {
    genderFemale.addEventListener("click", function () {
      genderFemale.querySelector("input").checked = true;
      genderFemale.classList.add("active");
      if (genderMale) genderMale.classList.remove("active");
    });
  }

  if (birthDay) birthDay.addEventListener("change", updateBirthdayDisplay);
  if (birthMonth) birthMonth.addEventListener("change", updateBirthdayDisplay);
  if (birthYear) birthYear.addEventListener("change", updateBirthdayDisplay);

  // ==========================================
  // Noon Phone Verification Modal Logic
  // ==========================================

  function showPanel(panelName) {
    if (panelPhoneInput) panelPhoneInput.classList.remove("active");
    if (panelOtpInput) panelOtpInput.classList.remove("active");
    if (panelSuccess) panelSuccess.classList.remove("active");

    if (panelName === "phone-input") {
      panelPhoneInput.classList.add("active");
    } else if (panelName === "otp-input") {
      panelOtpInput.classList.add("active");
      // Always reset to OTP entry sub-screen when opening this panel
      if (otpEntryScreen) otpEntryScreen.style.display = "block";
      if (waHelpScreen)   waHelpScreen.style.display   = "none";
    } else if (panelName === "success") {
      panelSuccess.classList.add("active");
    }
  }

  function openPhoneVerificationModal() {
    if (phoneVerificationBackdrop) {
      phoneVerificationBackdrop.classList.add("active");
    }
    showPanel("phone-input");

    // Pre-fill the current phone number (strip country prefix → local format)
    var displayNum = currentPhoneNumber || "";
    var userCountryCode = localStorage.getItem('userCountry') || 'SA';
    var countryToSet = userCountryCode;

    if (displayNum) {
      if (countryToSet === "EG") {
        // Remove +20 prefix, keep local digits (with or without leading 0)
        displayNum = displayNum.replace(/^\+?20/, "");
        // Ensure it starts with 0 for display (01XXXXXXXXX)
        if (!displayNum.startsWith("0")) displayNum = "0" + displayNum;
      } else if (countryToSet === "SA") {
        displayNum = displayNum.replace(/^\+?966/, "");
        if (!displayNum.startsWith("0")) displayNum = "0" + displayNum;
      }
    }

    if (modalCountrySelect) {
      // Show only the option matching user's account country
      for (var pi = 0; pi < modalCountrySelect.options.length; pi++) {
        modalCountrySelect.options[pi].style.display = modalCountrySelect.options[pi].value === countryToSet ? '' : 'none';
      }
      modalCountrySelect.value = countryToSet;
      modalCountrySelect.disabled = false;
    }

    // Show warning if GPS country differs from account country
    var phoneWarning = document.getElementById('phoneCountryWarning');
    var phoneWarningText = document.getElementById('phoneCountryWarningText');
    if (phoneWarning && phoneWarningText) {
      var gpsCountry = localStorage.getItem('gpsCountry');
      if (gpsCountry && gpsCountry !== countryToSet) {
        var countryNames = { SA: 'السعودية', EG: 'مصر' };
        var accName = countryNames[countryToSet] || countryToSet;
        var gpsName = countryNames[gpsCountry] || gpsCountry;
        phoneWarningText.textContent = 'موقعك الحالي في ' + gpsName + ' لكن حسابك مسجل في ' + accName + '. يرجى التأكد من استخدام رقم هاتف ' + accName;
        phoneWarning.style.display = 'flex';
      } else {
        phoneWarning.style.display = 'none';
      }
    }

    if (modalPhoneInput) {
      modalPhoneInput.value = displayNum;
      modalPhoneInput.disabled = false;
    }

    // Validate after a tick so the DOM updates first
    setTimeout(validateModalPhoneInput, 0);
  }


  function closeVerificationModal() {
    if (phoneVerificationBackdrop) {
      phoneVerificationBackdrop.classList.remove("active");
    }
    clearInterval(countdownTimer);
    clearOtpInputs();
    isSendingOtp = false;
    isVerifyingOtp = false;
  }

  // Masking phone helper: +20 11••••7592
  function maskPhoneNumber(phone, countryCode) {
    var cleaned = phone.replace(/\D/g, "");
    var local = cleaned;
    if (local.startsWith("0")) {
      local = local.slice(1);
    }
    if (countryCode === "EG") {
      return `+20 ${local.slice(0, 2)}••••${local.slice(-4)}`;
    } else if (countryCode === "SA") {
      return `+966 ${local.slice(0, 1)}••••${local.slice(-4)}`;
    }
    return phone;
  }

  // Input Restrictions & Validations
  function validateModalPhoneInput() {
    if (!modalPhoneInput || !modalCountrySelect) return;
    
    var rawVal = modalPhoneInput.value.replace(/\D/g, "");
    modalPhoneInput.value = rawVal; // Allow digits only

    var country = modalCountrySelect.value;
    var isValid = false;
    var errorText = "";

    if (rawVal.length > 0) {
      if (country === "EG") {
        // Egypt validation: 10 or 11 digits starting with optional 0 and then 10,11,12,15
        var validPrefix = /^(0?1[0125]\d{8})$/;
        if (validPrefix.test(rawVal)) {
          isValid = true;
        } else {
          errorText = "يرجى إدخال رقم هاتف مصري صحيح (مثال: 01XXXXXXXXX)";
        }
      } else if (country === "SA") {
        // Saudi validation: 9 or 10 digits starting with optional 0 and then 5
        var validPrefix = /^(0?5\d{8})$/;
        if (validPrefix.test(rawVal)) {
          isValid = true;
        } else {
          errorText = "يرجى إدخال رقم هاتف سعودي صحيح (مثال: 05XXXXXXXX)";
        }
      }
    }

    if (errorText) {
      if (phoneErrorMsg) phoneErrorMsg.textContent = errorText;
      if (phoneInputRow) phoneInputRow.classList.add("invalid");
    } else {
      if (phoneErrorMsg) phoneErrorMsg.textContent = "";
      if (phoneInputRow) phoneInputRow.classList.remove("invalid");
    }

    if (sendOtpBtn) {
      sendOtpBtn.disabled = !isValid;
    }
  }

  // Trigger click
  if (editPhoneTriggerBtn) {
    editPhoneTriggerBtn.addEventListener("click", function () {
      if (currentPhoneVerified) {
        var warn = confirm("تغيير رقم الهاتف سيؤدي إلى إزالة حالة التحقق من الرقم الحالي حتى يتم التحقق من الرقم الجديد.");
        if (!warn) return;
      }
      openPhoneVerificationModal();
    });
  }

  // Close triggers
  if (closePhoneModalBtn) closePhoneModalBtn.addEventListener("click", closeVerificationModal);
  if (closeOtpModalBtn) closeOtpModalBtn.addEventListener("click", closeVerificationModal);

  // Channel selections styling
  var channelCards = document.querySelectorAll(".channel-options .channel-card");
  channelCards.forEach(function (card) {
    card.addEventListener("click", function () {
      channelCards.forEach(function (c) { c.classList.remove("active"); });
      this.classList.add("active");
      var radio = this.querySelector("input[type='radio']");
      if (radio) radio.checked = true;
    });
  });

  // Country Selection Change
  if (modalCountrySelect) {
    modalCountrySelect.addEventListener("change", validateModalPhoneInput);
  }
  if (modalPhoneInput) {
    modalPhoneInput.addEventListener("input", validateModalPhoneInput);
  }

  // Start countdown timer: 00:59
  function startCountdown(seconds) {
    clearInterval(countdownTimer);
    if (otpTimerContainer) otpTimerContainer.style.display = "block";
    if (otpResendContainer) otpResendContainer.style.display = "none";
    
    var remaining = seconds;
    updateTimerText(remaining);

    countdownTimer = setInterval(function () {
      remaining--;
      updateTimerText(remaining);
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        if (otpTimerContainer) otpTimerContainer.style.display = "none";
        if (otpResendContainer) otpResendContainer.style.display = "flex";
      }
    }, 1000);
  }

  function updateTimerText(sec) {
    if (!otpTimerVal) return;
    var secStr = String(sec).padStart(2, "0");
    otpTimerVal.textContent = `00:${secStr}`;
  }

  function clearOtpInputs() {
    var otpInputs = otpInputsGrid ? otpInputsGrid.querySelectorAll("input") : [];
    otpInputs.forEach(function (input) {
      input.value = "";
      input.disabled = false;
    });
    if (otpAttemptsLeftText) otpAttemptsLeftText.textContent = "";
  }

  function focusFirstOtpInput() {
    var otpInputs = otpInputsGrid ? otpInputsGrid.querySelectorAll("input") : [];
    if (otpInputs[0]) {
      setTimeout(function () { otpInputs[0].focus(); }, 150);
    }
  }

  function updateAttemptsLeftDisplay() {
    if (!otpAttemptsLeftText) return;
    if (attemptsLeft <= 0) {
      otpAttemptsLeftText.textContent = "تم قفل العملية بسبب محاولات خاطئة كثيرة. يرجى المحاولة بعد 15 دقيقة.";
    } else if (attemptsLeft < 7) {
      otpAttemptsLeftText.textContent = `متبقي: ${attemptsLeft} محاولات`;
    } else {
      otpAttemptsLeftText.textContent = "";
    }
  }

  // Request Send OTP via Twilio Edge Function
  async function requestOtpCode(isResend, channelOverride) {
    if (isSendingOtp) return;
    
    var phoneVal = modalPhoneInput.value.trim();
    var countryVal = modalCountrySelect.value;
    
    var channelVal = "whatsapp";
    if (channelOverride) {
      channelVal = channelOverride;
    } else {
      var checkedRadio = document.querySelector("input[name='otp_channel']:checked");
      if (checkedRadio) channelVal = checkedRadio.value;
    }

    isSendingOtp = true;
    
    var activeBtn = isResend ? (channelVal === "whatsapp" ? resendWhatsappBtn : resendSmsBtn) : sendOtpBtn;
    if (!activeBtn) return;

    var origHtml = activeBtn.innerHTML;
    activeBtn.disabled = true;
    activeBtn.innerHTML = (isResend ? 'إرسال الرمز' : 'إرسال رمز التحقق') + ' <span class="btn-loader"></span>';

    try {
      var client = await getFunctionsClient();
      if (!client) {
        throw new Error("فشل الاتصال بقاعدة البيانات (Supabase client not found)");
      }

      var { data, error } = await client.functions.invoke("phone-verification", {
        body: {
          action: "send-otp",
          phone_number: phoneVal,
          country_code: countryVal,
          channel: channelVal,
          email: storedEmail
        }
      });

      if (error) throw error;

      if (data && data.success) {
        showToast(data.fallback ? "تم التحويل إلى SMS تلقائياً لعدم توفر واتساب" : "تم إرسال رمز التحقق بنجاح!");
        
        currentVerifyTargetPhone = phoneVal;
        currentVerifyTargetCountry = countryVal;

        // Freeze panel input numbers
        modalPhoneInput.disabled = true;
        modalCountrySelect.disabled = true;
        
        showPanel("otp-input");
        
        // Mask Phone Target text
        if (otpTargetPhoneText) {
          otpTargetPhoneText.textContent = maskPhoneNumber(phoneVal, countryVal);
        }
        
        // Channel Badge Indicator
        var finalChannel = data.channel || channelVal;
        if (otpChannelBadge) {
          if (finalChannel === "whatsapp") {
            otpChannelBadge.className = "otp-channel-badge whatsapp";
            otpChannelBadge.innerHTML = '<svg viewBox="0 0 24 24"><path fill="#128c7e" d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.37 5.04l-1.46 5.334 5.47-1.43a9.926 9.926 0 004.61 1.139h.004c5.502 0 9.99-4.478 9.99-9.988 0-2.668-1.036-5.176-2.92-7.062C17.182 3.14 14.685 2 12.012 2z"/><path fill="#FFF" d="M12.012 3.586c2.247 0 4.36.877 5.95 2.467 1.589 1.591 2.465 3.705 2.465 5.934 0 4.629-3.771 8.4-8.411 8.4-.904 0-1.794-.146-2.645-.436l-.378-.127-3.268.858.873-3.19-.142-.228a8.318 8.318 0 01-1.277-4.498c0-4.631 3.773-8.408 8.413-8.408zm5.088 8.948c-.282-.142-1.666-.822-1.924-.916-.257-.094-.446-.142-.634.142-.187.283-.726.916-.889 1.103-.163.189-.327.212-.609.07a7.683 7.683 0 01-2.261-1.396 8.46 8.46 0 01-1.564-1.946c-.163-.284-.017-.436.124-.577.127-.127.283-.33.424-.496.142-.165.188-.283.283-.472.094-.189.047-.354-.023-.496-.071-.142-.634-1.528-.868-2.09-.229-.55-.497-.473-.68-.482-.178-.009-.382-.009-.588-.009-.205 0-.54.077-.822.385-.282.308-1.077 1.053-1.077 2.569 0 1.516 1.103 2.983 1.256 3.19.153.205 2.169 3.312 5.253 4.646.734.317 1.306.506 1.751.648.738.234 1.41.201 1.942.122.593-.089 1.666-.679 1.9-.1333.234-.347.234-.644.164-.707-.07-.063-.257-.156-.54-.298z"/></svg> <span>📱 WhatsApp</span>';
          } else {
            otpChannelBadge.className = "otp-channel-badge sms";
            otpChannelBadge.innerHTML = '<svg viewBox="0 0 24 24"><path fill="#4b5563" d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg> <span>💬 الرسائل النصية (SMS)</span>';
          }
        }

        startCountdown(59);
        attemptsLeft = 7;
        updateAttemptsLeftDisplay();
        clearOtpInputs();
        focusFirstOtpInput();
      } else {
        throw new Error((data && data.error) || "فشل إرسال كود التحقق.");
      }
    } catch (err) {
      console.error("Send OTP request error:", err);
      var msg = err.message || "حدث خطأ أثناء إرسال الرمز. يرجى المحاولة لاحقاً.";
      
      // Try parsing function response error
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

  // Verify Code via Edge Function
  async function verifyOtpCode() {
    if (isVerifyingOtp) return;

    var otpInputs = otpInputsGrid ? otpInputsGrid.querySelectorAll("input") : [];
    var digits = [];
    otpInputs.forEach(function (input) { digits.push(input.value.trim()); });
    var code = digits.join("");

    if (code.length < 6) {
      showToast("يرجى إدخال الرمز المكون من 6 أرقام كاملاً");
      return;
    }

    isVerifyingOtp = true;
    if (verifyOtpBtn) {
      verifyOtpBtn.disabled = true;
      var origHtml = verifyOtpBtn.innerHTML;
      verifyOtpBtn.innerHTML = 'تحقق <span class="btn-loader"></span>';
    }

    otpInputs.forEach(function (input) { input.disabled = true; });

    try {
      var client = await getFunctionsClient();
      if (!client) {
        throw new Error("فشل الاتصال بـ Supabase client");
      }

      var { data, error } = await client.functions.invoke("phone-verification", {
        body: {
          action: "verify-otp",
          phone_number: currentVerifyTargetPhone,
          country_code: currentVerifyTargetCountry,
          otp_code: code,
          email: storedEmail
        }
      });

      if (error) throw error;

      if (data && data.success) {
        clearInterval(countdownTimer);
        showPanel("success");
        
        // E.164 conversion
        var rawNumber = currentVerifyTargetPhone.replace(/\D/g, "");
        if (rawNumber.startsWith("0")) rawNumber = rawNumber.slice(1);
        var countryPrefix = currentVerifyTargetCountry === "EG" ? "+20" : "+966";
        var finalPhoneFormatted = `${countryPrefix}${rawNumber}`;
        
        updatePhoneDisplayCard(finalPhoneFormatted, true, currentVerifyTargetCountry);
        localStorage.setItem("userPhone", finalPhoneFormatted);
        localStorage.setItem("userPhoneVerified", "true");
        localStorage.setItem("userPhoneCountry", currentVerifyTargetCountry);

        // Dispatches profile reload
        document.dispatchEvent(new CustomEvent("boda:profile-updated"));

        setTimeout(function () {
          closeVerificationModal();
          showToast("تم التحقق وتأكيد رقم الهاتف بنجاح!");
        }, 1300);

      } else {
        throw new Error((data && data.error) || "كود التحقق غير صحيح");
      }
    } catch (err) {
      console.error("Verification OTP error:", err);
      
      // Shake animation
      if (phoneVerificationModal) {
        phoneVerificationModal.classList.add("shake");
        setTimeout(function () {
          phoneVerificationModal.classList.remove("shake");
        }, 400);
      }

      otpInputs.forEach(function (input) { input.disabled = false; });
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
              updateAttemptsLeftDisplay();
            }
            if (parsed.locked) {
              attemptsLeft = 0;
              updateAttemptsLeftDisplay();
              otpInputs.forEach(function (input) { input.disabled = true; });
              if (verifyOtpBtn) verifyOtpBtn.disabled = true;
            }
          }
        }
      } catch (e) {}

      showToast(msg);
      if (otpAttemptsLeftText) otpAttemptsLeftText.textContent = msg;
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

  // OTP Digits Inputs Focus Jump Behavior
  var otpInputs = otpInputsGrid ? otpInputsGrid.querySelectorAll("input") : [];
  otpInputs.forEach(function (input, index) {
    input.addEventListener("input", function () {
      var val = this.value.replace(/\D/g, ""); // Allow only digits
      this.value = val;
      
      if (val.length === 1) {
        if (index < otpInputs.length - 1) {
          otpInputs[index + 1].focus();
        } else {
          // Fully filled! Auto verify
          verifyOtpCode();
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
        verifyOtpCode();
      }
    });
  });

  // Bind Buttons Action
  if (sendOtpBtn) {
    sendOtpBtn.addEventListener("click", function () {
      requestOtpCode(false);
    });
  }
  if (verifyOtpBtn) {
    verifyOtpBtn.addEventListener("click", verifyOtpCode);
  }
  if (resendWhatsappBtn) {
    resendWhatsappBtn.addEventListener("click", function () {
      requestOtpCode(true, "whatsapp");
    });
  }
  if (resendSmsBtn) {
    resendSmsBtn.addEventListener("click", function () {
      requestOtpCode(true, "sms");
    });
  }

  // Go Back to change number
  if (otpBackBtn) {
    otpBackBtn.addEventListener("click", function () {
      clearInterval(countdownTimer);
      if (modalPhoneInput) modalPhoneInput.disabled = false;
      if (modalCountrySelect) modalCountrySelect.disabled = false;
      showPanel("phone-input");
      clearOtpInputs();
      isVerifyingOtp = false;
    });
  }

  // WhatsApp Sandbox Help — in-panel screen flip
  function showWaHelpScreen() {
    if (otpEntryScreen) otpEntryScreen.style.display = "none";
    if (waHelpScreen)   waHelpScreen.style.display   = "block";
  }
  function showOtpEntryScreen() {
    if (waHelpScreen)   waHelpScreen.style.display   = "none";
    if (otpEntryScreen) otpEntryScreen.style.display = "block";
  }

  if (otpWhatsappHelpBtn) {
    otpWhatsappHelpBtn.addEventListener("click", showWaHelpScreen);
  }
  if (waHelpBackToOtpBtn) {
    waHelpBackToOtpBtn.addEventListener("click", showOtpEntryScreen);
  }
  if (closeWaHelpBtn) {
    closeWaHelpBtn.addEventListener("click", function () {
      // Close the entire modal panel and go back to phone input
      showOtpEntryScreen();
      clearInterval(countdownTimer);
      if (modalPhoneInput) modalPhoneInput.disabled = false;
      if (modalCountrySelect) modalCountrySelect.disabled = false;
      showPanel("phone-input");
      clearOtpInputs();
      isVerifyingOtp = false;
    });
  }

  // Form Submission
  // ==========================================

  submitBtn.addEventListener("click", async function () {
    var firstName = String(firstNameInput ? firstNameInput.value : "").trim();
    var lastName = String(lastNameInput ? lastNameInput.value : "").trim();
    var phone = String(phoneInput ? phoneInput.value : "").trim();

    if (!firstName || !lastName) {
      showToast("الاسم الأول واسم العائلة مطلوبان.");
      return;
    }

    var data = {
      email: storedEmail,
      phone: phone, // verified phone number
      first_name: firstName,
      last_name: lastName,
      full_name: firstName + " " + lastName,
      birth_day: birthDay ? parseInt(birthDay.value) || null : null,
      birth_month: birthMonth ? parseInt(birthMonth.value) || null : null,
      birth_year: birthYear ? parseInt(birthYear.value) || null : null,
      gender: (genderMale && genderMale.classList.contains("active")) ? "male" : (genderFemale && genderFemale.classList.contains("active")) ? "female" : "",
      nationality: nationalitySelect ? nationalitySelect.value : "",
      phone_number: phone,
      phone_country: currentPhoneCountry,
      phone_verified: currentPhoneVerified,
      verified_at: currentPhoneVerified ? new Date().toISOString() : null
    };

    // Save to localStorage as fallback
    localStorage.setItem("userFirstName", firstName);
    localStorage.setItem("userLastName", lastName);
    localStorage.setItem("userFullName", firstName + " " + lastName);
    localStorage.setItem("userPhone", phone);
    localStorage.setItem("userPhoneVerified", String(currentPhoneVerified));
    localStorage.setItem("userPhoneCountry", currentPhoneCountry);
    
    if (data.birth_day) localStorage.setItem("userBirthDay", String(data.birth_day));
    if (data.birth_month) localStorage.setItem("userBirthMonth", String(data.birth_month));
    if (data.birth_year) localStorage.setItem("userBirthYear", String(data.birth_year));
    if (data.gender) localStorage.setItem("userGender", data.gender);
    if (data.nationality) localStorage.setItem("userNationality", data.nationality);

    // Save to Supabase
    var client = getClient();
    var supabaseOk = false;

    if (client && storedEmail) {
      try {
        // Check if profile row exists for this email
        var { data: existing, error: findErr } = await client
          .from("profiles")
          .select("email")
          .eq("email", storedEmail)
          .limit(1);

        if (findErr) {
          console.warn("supabase find error", findErr);
        } else if (Array.isArray(existing) && existing.length) {
          // UPDATE profile
          var { error: updateErr } = await client
            .from("profiles")
            .update(data)
            .eq("email", storedEmail);
          if (updateErr) {
            console.warn("supabase update error", updateErr);
          } else {
            supabaseOk = true;
          }
        } else {
          // INSERT new profile
          var { error: insertErr } = await client
            .from("profiles")
            .insert({ ...data, email: storedEmail });
          if (insertErr) {
            console.warn("supabase insert error", insertErr);
          } else {
            supabaseOk = true;
          }
        }
      } catch (e) {
        console.warn("supabase save failed, data kept in localStorage", e);
      }
    }

    showToast(supabaseOk ? "تم تحديث حسابك بنجاح!" : "تم الحفظ محليًا (Supabase غير متاح)");
    document.dispatchEvent(new CustomEvent("boda:profile-updated"));
    setTimeout(function () {
      window.location.href = "ahsab.html";
    }, 1200);
  });

  function showToast(msg) {
    var el = document.createElement("div");
    el.textContent = msg;
    el.style.cssText = "position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#fff;padding:12px 24px;border-radius:10px;font-size:0.85rem;font-weight:700;z-index:99999;opacity:0;transition:opacity 0.3s;text-align:center;";
    document.body.appendChild(el);
    requestAnimationFrame(function () {
      el.style.opacity = "1";
    });
    setTimeout(function () {
      el.style.opacity = "0";
      setTimeout(function () { el.remove(); }, 300);
    }, 2800);
  }

  populateBirthdaySelects();
  loadProfile();
});
