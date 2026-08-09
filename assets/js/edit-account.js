console.log("[edit-account.js] version 20260809 shared-verification loaded");

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

  // Phone Verification State
  var currentPhoneVerified = false;
  var currentPhoneNumber = "";
  var currentPhoneCountry = "";

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
  // Change Phone - shared modal (phone-verification-modal.js)
  // ==========================================

  if (editPhoneTriggerBtn) {
    editPhoneTriggerBtn.addEventListener("click", function () {
      if (typeof window.PhoneVerification === "undefined") {
        showToast("خدمة تغيير رقم الهاتف غير متاحة حالياً.");
        return;
      }
      var accCountry = currentPhoneCountry || localStorage.getItem("userCountry") || "SA";
      window.PhoneVerification.show(
        storedEmail,
        function (phone, country) {
          updatePhoneDisplayCard(phone, true, country);
          localStorage.setItem("userPhone", phone);
          localStorage.setItem("userPhoneCountry", country);
          localStorage.setItem("userPhoneVerified", "true");
        },
        {
          prefillPhone: currentPhoneNumber,
          prefillCountry: accCountry
        }
      );
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
