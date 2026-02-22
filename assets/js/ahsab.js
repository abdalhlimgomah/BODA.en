document.addEventListener("DOMContentLoaded", () => {
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  const userEmail = localStorage.getItem("userEmail") || sessionStorage.getItem("user_email");
  const userFullName = localStorage.getItem("userFullName") || sessionStorage.getItem("user_name");

  const profileNameEl = document.getElementById("profile-name");
  const profileEmailEl = document.getElementById("profile-email");
  const profileAvatarEl = document.getElementById("profile-avatar");

  const editBtn = document.getElementById("edit-profile-btn");
  const editModal = document.getElementById("editProfileModal");
  const inputFull = document.getElementById("input-fullname");
  const inputEmail = document.getElementById("input-email");
  const inputPhone = document.getElementById("input-phone");
  const inputPic = document.getElementById("input-profile-pic");
  const profilePreview = document.getElementById("profile-preview");
  const cancelEdit = document.getElementById("cancel-edit");
  const saveProfileBtn = document.getElementById("save-profile-btn");

  const addressesLink = document.getElementById("addresses-link");
  const addressesModal = document.getElementById("addressesModal");
  const addressesList = document.getElementById("addresses-list");
  const inputAddress = document.getElementById("input-address");
  const cancelAddress = document.getElementById("cancel-address");
  const saveAddressBtn = document.getElementById("save-address-btn");

  const preferencesLink = document.getElementById("preferences-link");
  const prefLanguageEl = document.getElementById("preference-language");

  const signOutLink = document.getElementById("sign-out-link");

  if (!isLoggedIn || !userEmail) {
    // If not logged in, redirect to login
    // keep profile page accessible but encourage login
    // redirecting for now
    // window.location.href = "login.html"; // uncomment if strict
  }

  function getProfileImage(email) {
    return localStorage.getItem(`profileImage_${email}`) || null;
  }

  function setAvatar(name, email) {
    const img = getProfileImage(email);
    if (img) {
      profileAvatarEl.innerHTML = `<img src="${img}" alt="avatar" class="w-14 h-14 rounded-full object-cover"/>`;
    } else {
      const initials = (name || "").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "U";
      profileAvatarEl.textContent = initials;
    }
  }

  function populateProfile() {
    profileNameEl.textContent = userFullName || "Hello";
    profileEmailEl.textContent = userEmail || "";
    setAvatar(userFullName, userEmail);
    if (prefLanguageEl) {
      const loc = localStorage.getItem("locale") || "en";
      prefLanguageEl.textContent = loc === "ar" ? "AR" : "EN";
    }
  }

  populateProfile();

  // Open edit modal
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      inputFull.value = localStorage.getItem("userFullName") || sessionStorage.getItem("user_name") || "";
      inputEmail.value = localStorage.getItem("userEmail") || sessionStorage.getItem("user_email") || "";
      inputPhone.value = localStorage.getItem("userPhone") || "";
      const img = getProfileImage(inputEmail.value);
      if (img) {
        profilePreview.src = img;
        profilePreview.classList.remove("hidden");
      } else {
        profilePreview.classList.add("hidden");
      }
      editModal.classList.remove("hidden");
      editModal.classList.add("flex");
    });
  }

  cancelEdit?.addEventListener("click", () => {
    editModal.classList.add("hidden");
    editModal.classList.remove("flex");
  });

  // Preview uploaded pic
  inputPic?.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      profilePreview.src = ev.target.result;
      profilePreview.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  });

  // Save profile
  saveProfileBtn?.addEventListener("click", async () => {
    const name = inputFull.value.trim();
    const email = inputEmail.value.trim().toLowerCase();
    const phone = inputPhone.value.trim();
    const imgSrc = profilePreview.src || null;

    // update users_db in localStorage
    try {
      const users = JSON.parse(localStorage.getItem("users_db") || "[]");
      const idx = users.findIndex((u) => u.email === (localStorage.getItem("userEmail") || sessionStorage.getItem("user_email")));
      if (idx !== -1) {
        users[idx].fullName = name || users[idx].fullName;
        users[idx].email = email || users[idx].email;
        users[idx].phone = phone || users[idx].phone;
        localStorage.setItem("users_db", JSON.stringify(users));
      }
    } catch (err) {
      console.warn("Failed to update users_db", err);
    }

    if (imgSrc) {
      localStorage.setItem(`profileImage_${email}`, imgSrc);
    }

    localStorage.setItem("userFullName", name);
    localStorage.setItem("userEmail", email);
    if (phone) localStorage.setItem("userPhone", phone);

    // update UI
    profileNameEl.textContent = name;
    profileEmailEl.textContent = email;
    setAvatar(name, email);

    editModal.classList.add("hidden");
    editModal.classList.remove("flex");
    alert("Profile saved");
  });

  // Addresses handling
  function renderAddresses() {
    addressesList.innerHTML = "";
    const addresses = JSON.parse(localStorage.getItem(`addresses_${userEmail}`) || "[]");
    if (!Array.isArray(addresses) || addresses.length === 0) {
      addressesList.innerHTML = `<div class='text-sm text-gray-500'>No addresses yet</div>`;
      return;
    }
    addresses.forEach((addr, i) => {
      const el = document.createElement("div");
      el.className = "p-2 border rounded flex items-center justify-between";
      el.innerHTML = `<div class='text-sm'>${addr}</div><div><button data-addr-remove='${i}' class='text-xs text-red-500'>Remove</button></div>`;
      addressesList.appendChild(el);
    });
    addressesList.querySelectorAll("[data-addr-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-addr-remove"));
        const list = JSON.parse(localStorage.getItem(`addresses_${userEmail}`) || "[]");
        list.splice(idx, 1);
        localStorage.setItem(`addresses_${userEmail}`, JSON.stringify(list));
        // update selected address if necessary
        if (list.length > 0) localStorage.setItem(`selected_address_${userEmail}`, list[0]);
        else localStorage.removeItem(`selected_address_${userEmail}`);
        renderAddresses();
        // notify home via storage event (same-tab) by manually updating element if present
        const deliverEl = document.getElementById("deliver-to-text");
        if (deliverEl) deliverEl.textContent = localStorage.getItem(`selected_address_${userEmail}`) || "Deliver to";
      });
    });
  }

  addressesLink?.addEventListener("click", (e) => {
    e.preventDefault();
    renderAddresses();
    addressesModal.classList.remove("hidden");
    addressesModal.classList.add("flex");
  });

  cancelAddress?.addEventListener("click", () => {
    addressesModal.classList.add("hidden");
    addressesModal.classList.remove("flex");
  });

  saveAddressBtn?.addEventListener("click", () => {
    const addr = inputAddress.value.trim();
    if (!addr) return alert("Please enter an address");
    const list = JSON.parse(localStorage.getItem(`addresses_${userEmail}`) || "[]");
    list.unshift(addr);
    localStorage.setItem(`addresses_${userEmail}`, JSON.stringify(list));
    // set selected address
    localStorage.setItem(`selected_address_${userEmail}`, addr);
    renderAddresses();
    inputAddress.value = "";
    addressesModal.classList.add("hidden");
    addressesModal.classList.remove("flex");
    // update home header if present
    const deliverEl = document.getElementById("deliver-to-text");
    if (deliverEl) deliverEl.textContent = addr;
  });

  // Preferences (language toggle)
  preferencesLink?.addEventListener("click", (e) => {
    e.preventDefault();
    const current = localStorage.getItem("locale") || "en";
    const next = current === "en" ? "ar" : "en";
    localStorage.setItem("locale", next);
    prefLanguageEl.textContent = next === "ar" ? "AR" : "EN";
    if (next === "ar") {
      document.documentElement.lang = "ar";
      document.documentElement.dir = "rtl";
    } else {
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
    }
    alert("Language changed. Reloading page...");
    window.location.reload();
  });

  // Sign out
  signOutLink?.addEventListener("click", async (e) => {
    // allow default link to logout-confirmation if present, but also perform logout
    e.preventDefault();
    if (window.mockAPI && typeof window.mockAPI.logout === "function") {
      await window.mockAPI.logout();
    }
    // clear session flags
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userFullName");
    localStorage.removeItem("userRole");
    sessionStorage.clear();
    window.location.href = "../pages/login.html".replace("../pages/", "login.html");
  });
});
