console.log("[ahsab.js] version 20260630f loaded");
document.addEventListener("DOMContentLoaded", async () => {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const storedEmail = (localStorage.getItem("userEmail") || sessionStorage.getItem("user_email") || "").trim();
  const normalizedStoredEmail = storedEmail.toLowerCase();
  const userFullName = localStorage.getItem("userFullName") || sessionStorage.getItem("user_name") || "";

  const profileNameEl = document.getElementById("profile-name");
  const profileAvatarEl = document.getElementById("profile-avatar");

  const addressesLink = document.getElementById("addresses-link");

  const countryLink = document.getElementById("country-link");
  const countryModal = document.getElementById("countryModal");
  const countryOptions = document.getElementById("country-options");
  const selectedCountryName = document.getElementById("selected-country-name");
  const cancelCountry = document.getElementById("cancel-country");


  const signOutLink = document.getElementById("sign-out-link");

  if (!isLoggedIn || !normalizedStoredEmail) return;

  let activeEmail = normalizedStoredEmail;

  function accountNotify(message, type = "info", target = "#account-status") {
    const raw = String(message || "").trim();
    if (!raw) return;
    const text = raw;

    if (window.BudaUI?.notify) {
      window.BudaUI.notify(text, { type, target });
      return;
    }

    const holder = typeof target === "string" ? document.querySelector(target) : target;
    if (!holder) return;
    holder.textContent = text;
    holder.classList.remove("hidden", "error", "success", "info");
    holder.classList.add("status-note", type === "error" ? "error" : type === "success" ? "success" : "info");
  }

  function openModal(modal) {
    modal?.classList.add("show");
  }

  function closeModal(modal) {
    modal?.classList.remove("show");
  }

  function getEmailCandidates(primaryEmail = activeEmail) {
    const values = [
      String(primaryEmail || "").trim(),
      String(localStorage.getItem("userEmail") || "").trim(),
      String(sessionStorage.getItem("user_email") || "").trim(),
      String(storedEmail || "").trim(),
    ].filter(Boolean);

    const set = new Set();
    values.forEach((value) => {
      set.add(value);
      set.add(value.toLowerCase());
    });

    return Array.from(set);
  }

  function readFirstStorageValue(prefix, defaultValue = "") {
    const candidates = getEmailCandidates();
    for (const keyEmail of candidates) {
      const value = localStorage.getItem(`${prefix}_${keyEmail}`);
      if (value !== null && value !== undefined && String(value).trim() !== "") {
        return value;
      }
    }
    return defaultValue;
  }

  function readAddresses() {
    const candidates = getEmailCandidates();
    for (const keyEmail of candidates) {
      try {
        const raw = localStorage.getItem(`addresses_${keyEmail}`);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          return parsed.map((item) => String(item || "").trim()).filter(Boolean);
        }
      } catch {
      }
    }
    return [];
  }

  function writeAddresses(addresses) {
    const normalized = Array.isArray(addresses)
      ? addresses.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    localStorage.setItem(`addresses_${activeEmail}`, JSON.stringify(normalized));
  }

  function readSelectedAddress() {
    return String(readFirstStorageValue("selected_address", "") || "").trim();
  }

  function writeSelectedAddress(address) {
    const normalizedAddress = String(address || "").trim();
    if (!normalizedAddress) {
      localStorage.removeItem(`selected_address_${activeEmail}`);
      return;
    }
    localStorage.setItem(`selected_address_${activeEmail}`, normalizedAddress);
  }

  function getProfileImage(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const direct = localStorage.getItem(`profileImage_${normalizedEmail}`);
    if (direct) return direct;
    const old = localStorage.getItem(`profileImage_${email}`);
    return old || null;
  }

  function isSafeImageUrl(url) {
    const value = String(url || "").trim();
    if (!value) return false;
    if (/^\s*javascript:/i.test(value)) return false;
    return (
      value.startsWith("data:image/") ||
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("blob:")
    );
  }

  function setAvatar(name, email) {
    if (!profileAvatarEl) return;

    const image = getProfileImage(email);
    if (image && isSafeImageUrl(image)) {
      profileAvatarEl.textContent = "";
      const img = document.createElement("img");
      img.src = image;
      img.alt = "avatar";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.style.borderRadius = "50%";
      profileAvatarEl.appendChild(img);
      return;
    }

    const initials = (name || "")
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

    profileAvatarEl.textContent = initials;
  }



  function calcProfileCompletion(profile) {
    var p = profile || {};
    var fields = [
      storedEmail || p.email,
      p.phone || localStorage.getItem("userPhone"),
      p.first_name || localStorage.getItem("userFirstName"),
      p.last_name || localStorage.getItem("userLastName"),
      (p.birth_day && p.birth_month && p.birth_year) ? "ok" : (localStorage.getItem("userBirthDay") && localStorage.getItem("userBirthMonth") && localStorage.getItem("userBirthYear")) ? "ok" : "",
      p.gender || localStorage.getItem("userGender"),
      p.nationality || localStorage.getItem("userNationality"),
    ];
    var filled = fields.filter(function (v) { return v && String(v).trim(); }).length;
    return Math.round((filled / fields.length) * 100);
  }

  function updateProfileProgress(profile) {
    var pct = calcProfileCompletion(profile);
    var fill = document.getElementById("profileProgressFill");
    var label = document.getElementById("profileProgressLabel");
    var row = document.getElementById("profileProgressRow");
    if (fill) fill.style.width = pct + "%";
    if (label) label.textContent = "اكتملت بنسبة " + pct + "%";
    if (row) row.style.display = pct >= 100 ? "none" : "flex";
  }

  function populateProfileSync() {
    var name = localStorage.getItem("userFullName") || userFullName || "مرحبًا";
    var email = localStorage.getItem("userEmail") || activeEmail;
    if (profileNameEl) profileNameEl.textContent = name;
    var emailEl = document.getElementById("profile-email");
    if (emailEl) emailEl.textContent = email;
    setAvatar(name, email);
  }

  async function populateProfileAsync() {
    var email = localStorage.getItem("userEmail") || activeEmail;
    try {
      var client = window.getSupabaseClient ? window.getSupabaseClient() : null;
      if (client && email) {
        var { data } = await client.from("profiles").select("*").eq("email", email).limit(1);
        if (Array.isArray(data) && data.length) {
          updateProfileProgress(data[0]);
          return;
        }
      }
    } catch (e) { console.warn("profile fetch error", e); }
    updateProfileProgress(null);
  }

  function syncDeliverAddress() {
    const deliverEl = document.getElementById("deliver-to-text");
    if (!deliverEl) return;
    const selected = readSelectedAddress() || "اختر عنوان التوصيل";
    deliverEl.textContent = selected;
  }

  function migrateAddressStorage(previousEmail, nextEmail) {
    const oldKey = String(previousEmail || "").trim().toLowerCase();
    const newKey = String(nextEmail || "").trim().toLowerCase();
    if (!oldKey || !newKey || oldKey === newKey) return;

    try {
      const oldAddresses = JSON.parse(localStorage.getItem(`addresses_${oldKey}`) || "[]");
      const newAddresses = JSON.parse(localStorage.getItem(`addresses_${newKey}`) || "[]");
      if (Array.isArray(oldAddresses) && oldAddresses.length && (!Array.isArray(newAddresses) || !newAddresses.length)) {
        localStorage.setItem(`addresses_${newKey}`, JSON.stringify(oldAddresses));
      }
    } catch {}

    const oldSelected = localStorage.getItem(`selected_address_${oldKey}`);
    const newSelected = localStorage.getItem(`selected_address_${newKey}`);
    if (oldSelected && !newSelected) {
      localStorage.setItem(`selected_address_${newKey}`, oldSelected);
    }
  }

  function renderCountryOptions() {
    if (!countryOptions || !window.TaagerIntegration) return;
    var countries = window.TaagerIntegration.getAvailableCountries();
    var selected = window.TaagerIntegration.getSelectedCountry();
    countryOptions.innerHTML = countries.map(function (c) {
      var active = selected && selected.code === c.code ? " is-active" : "";
      return '<button type="button" class="country-chip' + active + '" data-country-code="' + c.code + '" style="width: 100%; justify-content: center; padding: 10px; font-size: 0.9rem;">' + '<span class="country-flag">' + c.flag + "</span> " + c.name + "</button>";
    }).join("");
    countryOptions.querySelectorAll("[data-country-code]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var code = btn.getAttribute("data-country-code");
        for (var i = 0; i < countries.length; i++) {
          if (countries[i].code === code) {
            var oldCode = window.TaagerIntegration.getSelectedCountry();
            if (oldCode && oldCode.code === code) { closeModal(countryModal); return; }
            window.TaagerIntegration.setSelectedCountry(countries[i]);
            localStorage.setItem("userCountry", code);
            populateProfileSync();
            updateSelectedCountryDisplay();
            closeModal(countryModal);
            window.location.href = "home.html";
            break;
          }
        }
      });
    });
  }

  function updateSelectedCountryDisplay() {
    if (!selectedCountryName || !window.TaagerIntegration) return;
    var selected = window.TaagerIntegration.getSelectedCountry();
    selectedCountryName.textContent = selected ? selected.name : "اختر دولة";
  }

  updateSelectedCountryDisplay();

  countryLink?.addEventListener("click", function () {
    renderCountryOptions();
    openModal(countryModal);
  });

  cancelCountry?.addEventListener("click", function () {
    closeModal(countryModal);
  });

  await populateProfileAsync();
  syncDeliverAddress();

  [countryModal].forEach(function (modal) {
    modal?.addEventListener("click", function (event) {
      if (event.target === modal) closeModal(modal);
    });
  });

  if (profileAvatarEl) {
    profileAvatarEl.setAttribute("role", "button");
    profileAvatarEl.setAttribute("tabindex", "0");
    profileAvatarEl.addEventListener("click", function () {
      window.location.href = "edit-account.html";
    });
    profileAvatarEl.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        window.location.href = "edit-account.html";
      }
    });
  }

  addressesLink?.addEventListener("click", function () {
    window.location.href = "addresses.html";
  });

  signOutLink?.addEventListener("click", function () {
    window.location.href = "logout-confirmation.html";
  });

});
