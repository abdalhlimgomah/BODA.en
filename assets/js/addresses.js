// ===== Addresses Module =====
// Single-page address management with 3 views: List, Map, Form

const AddressesModule = (function() {
  'use strict';

  // ===== Configuration =====
  const CONFIG = {
    storageKey: 'buda_saved_addresses',
    selectedAddressKey: 'buda_selected_address',
    map: {
      defaultCenter: { lat: 30.0444, lng: 31.2357 },
      saudiCenter: { lat: 24.7136, lng: 46.6753 },
      defaultZoom: 13,
      minZoom: 8,
      maxZoom: 18,
    },
    form: {
      minApartment: 'يرجى إدخال رقم الشقة',
      minBuilding: 'يرجى إدخال رقم المبنى',
      minStreet: 'يرجى إدخال اسم الشارع',
    },
    ui: {
      toastDuration: 2500,
      mapUpdateThrottle: 600,
      confirmButtonText: 'تأكيد الموقع',
      saveButtonText: 'حفظ العنوان',
    }
  };

  // ===== State Management =====
  const state = {
    currentView: 'list', // 'list', 'map', 'form'
    addresses: [],
    selectedAddress: null,
    editingAddressId: null, // non-null when editing an existing address
    map: null,
    marker: null,
    currentLocation: { lat: CONFIG.map.defaultCenter.lat, lng: CONFIG.map.defaultCenter.lng },
    isMapInitialized: false,
    isLocationConfirmed: false,
    isGpsMismatched: false,
    isVpnDetected: false,
    toastTimeout: null,
  };

  // ===== Active Email Helper =====
  function getActiveEmail() {
    return (localStorage.getItem("userEmail") || sessionStorage.getItem("user_email") || "").trim();
  }

  function getUserCountryCode() {
    var country = localStorage.getItem("userCountry") || "EG";
    if (window.TaagerIntegration) {
      var selected = window.TaagerIntegration.getSelectedCountry();
      if (selected && selected.code) country = selected.code;
    }
    return country;
  }

  function getCountryCenter(countryCode) {
    return countryCode === "SA" ? CONFIG.map.saudiCenter : CONFIG.map.defaultCenter;
  }

  function getCountryBounds(countryCode) {
    var bounds = {
      EG: [[22.0, 24.0], [32.0, 37.0]],
      SA: [[16.0, 35.0], [32.0, 56.0]],
    };
    return bounds[countryCode] || bounds.EG;
  }

  function getCountryName(code) {
    var names = { EG: "مصر", SA: "السعودية" };
    return names[code] || code;
  }

  // Get current country for address storage separation
  function getStorageCountry() {
    return getUserCountryCode() || "EG";
  }

  // ===== Storage Utilities =====
  const Storage = {
    getActualKey: function(key) {
      const email = getActiveEmail();
      // Make address keys country-specific so SA/EG addresses don't mix
      if (key === CONFIG.storageKey || key === CONFIG.selectedAddressKey) {
        var country = getStorageCountry();
        return email ? `${key}_${email}_${country}` : `${key}_${country}`;
      }
      return email ? `${key}_${email}` : key;
    },

    get: function(key, defaultValue = null) {
      try {
        const actualKey = this.getActualKey(key);
        const value = localStorage.getItem(actualKey);
        return value ? JSON.parse(value) : defaultValue;
      } catch (error) {
        console.warn('خطأ في قراءة localStorage:', error);
        return defaultValue;
      }
    },

    set: function(key, value) {
      try {
        const actualKey = this.getActualKey(key);
        localStorage.setItem(actualKey, JSON.stringify(value));
        
        // Auto-sync legacy storage on updates
        if (key === CONFIG.storageKey || key === CONFIG.selectedAddressKey) {
          syncLegacyStorage();
        }
      } catch (error) {
        console.warn('خطأ في كتابة localStorage:', error);
      }
    },

    remove: function(key) {
      try {
        const actualKey = this.getActualKey(key);
        localStorage.removeItem(actualKey);
        
        // Auto-sync legacy storage on removals
        if (key === CONFIG.storageKey || key === CONFIG.selectedAddressKey) {
          syncLegacyStorage();
        }
      } catch (error) {
        console.warn('خطأ في إزالة localStorage:', error);
      }
    }
  };

  // ===== Legacy Storage Sync Utility =====
  function syncLegacyStorage() {
    const email = getActiveEmail();
    if (!email) return;

    const savedAddresses = Storage.get(CONFIG.storageKey, []);
    const selectedIdActual = localStorage.getItem(`buda_selected_address_${email}`);
    let selectedAddress = null;

    if (selectedIdActual) {
      try {
        const parsedId = JSON.parse(selectedIdActual);
        selectedAddress = savedAddresses.find(addr => addr.id === parsedId);
      } catch (e) {
        selectedAddress = savedAddresses.find(addr => addr.id === selectedIdActual);
      }
    }

    if (!selectedAddress && savedAddresses.length) {
      selectedAddress = savedAddresses.find(addr => addr.isDefault) || savedAddresses[0];
    }

    const legacyList = savedAddresses.map(addr => addr.fullAddress).filter(Boolean);
    try {
      localStorage.setItem(`addresses_${email}`, JSON.stringify(legacyList));
    } catch (e) {
      console.warn('Error syncing legacy addresses list:', e);
    }

    try {
      if (selectedAddress && selectedAddress.fullAddress) {
        localStorage.setItem(`selected_address_${email}`, selectedAddress.fullAddress);
      } else {
        localStorage.removeItem(`selected_address_${email}`);
      }
    } catch (e) {
      console.warn('Error syncing legacy selected address:', e);
    }
  }

  // ===== API Integration =====
  const API = {
    async fetchFromSupabase(email) {
      try {
        const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
        if (!client) return null;

        const { data, error } = await client
          .from('profiles')
          .select('*')
          .eq('email', email)
          .limit(1);

        if (error) throw error;
        return data?.[0] || null;
      } catch (error) {
        console.warn('خطأ في جلب البيانات من Supabase:', error);
        return null;
      }
    },

    async saveToSupabase(profileData) {
      try {
        const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
        if (!client) return false;

        const { data, error } = await client
          .from('profiles')
          .upsert([profileData], {
            onConflict: 'email',
            merge: true
          });

        if (error) throw error;
        return true;
      } catch (error) {
        console.warn('خطأ في حفظ البيانات إلى Supabase:', error);
        return false;
      }
    },

    // Fetch user addresses from user_addresses table
    async fetchAddressesFromSupabase(email) {
      try {
        const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
        if (!client) return [];

        const { data, error } = await client
          .from('user_addresses')
          .select('*')
          .eq('email', email)
          .order('created_at', { ascending: true });

        if (error) throw error;

        return (data || []).map(row => ({
          id: row.id,
          email: row.email,
          type: row.type,
          name: row.name,
          fullAddress: row.full_address,
          phone: row.phone,
          lat: row.lat,
          lng: row.lng,
          street: row.street,
          building: row.building,
          area: row.area,
          floor: row.floor,
          isDefault: row.is_default,
          country: row.country || "EG",
          createdAt: row.created_at
        }));
      } catch (error) {
        console.warn('خطأ في جلب العناوين من Supabase:', error);
        return null; // Return null to fallback to local storage
      }
    },

    // Save/Upsert an address in user_addresses table
    async saveAddressToSupabase(addressData) {
      try {
        const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
        if (!client) return false;

        const dbRow = {
          id: addressData.id,
          email: addressData.email,
          type: addressData.type,
          name: addressData.name,
          full_address: addressData.fullAddress,
          phone: addressData.phone,
          lat: addressData.lat,
          lng: addressData.lng,
          street: addressData.street,
          building: addressData.building,
          area: addressData.area,
          floor: addressData.floor,
          is_default: addressData.isDefault,
          country: addressData.country || "EG"
        };

        const { error } = await client
          .from('user_addresses')
          .upsert([dbRow], { onConflict: 'id' });

        if (error) throw error;
        return true;
      } catch (error) {
        console.warn('خطأ في حفظ العنوان إلى Supabase:', error);
        return false;
      }
    },

    // Delete address from user_addresses table
    async deleteAddressFromSupabase(addressId) {
      try {
        const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
        if (!client) return false;

        const { error } = await client
          .from('user_addresses')
          .delete()
          .eq('id', addressId);

        if (error) throw error;
        return true;
      } catch (error) {
        console.warn('خطأ في حذف العنوان من Supabase:', error);
        return false;
      }
    },

    // Sync default address state in database
    async setDefaultAddressInSupabase(email, defaultAddressId) {
      try {
        const client = window.getSupabaseClient ? window.getSupabaseClient() : null;
        if (!client) return false;

        // Set all addresses of this user to is_default = false
        const { error: resetError } = await client
          .from('user_addresses')
          .update({ is_default: false })
          .eq('email', email);

        if (resetError) throw resetError;

        // Set chosen address to is_default = true
        const { error: setError } = await client
          .from('user_addresses')
          .update({ is_default: true })
          .eq('id', defaultAddressId);

        if (setError) throw setError;
        return true;
      } catch (error) {
        console.warn('خطأ في تعيين العنوان كافتراضي في Supabase:', error);
        return false;
      }
    }
  };

  // ===== DOM Elements =====
  const DOM = {
    get: function(selector) {
      return document.querySelector(selector);
    },

    getAll: function(selector) {
      return document.queryQuerySelectorAll(selector);
    },

    create: function(html) {
      const temp = document.createElement('div');
      temp.innerHTML = html.trim();
      return temp.firstChild;
    }
  };

  // ===== UI Components =====
  const UI = {
    // Navigation Methods
    showView: function(view) {
      // Hide all views
      document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
      });

      // Show target view
      const targetView = document.getElementById(`${view}-screen`);
      if (targetView) {
        targetView.classList.add('active');
        state.currentView = view;

        // Initialize or resize map when switching to map view
        if (view === 'map') {
          if (!state.isMapInitialized) {
            setTimeout(() => this.initMap(), 100);
          } else if (state.map) {
            setTimeout(() => {
              state.map.invalidateSize();
            }, 100);
          }
        }
      }
    },

    // Address List Rendering
    renderAddressList: function() {
      const container = DOM.get('#address-list-container');
      if (!container) return;

      const addresses = state.addresses;
      // Find default address (is_default=true) or fall back to selectedAddress
      const defaultAddr = addresses.find(a => a.isDefault);
      const selectedId = defaultAddr?.id || state.selectedAddress?.id;

      // Hide loading spinner if still present
      const loadingEl = DOM.get('#addresses-loading');
      if (loadingEl) loadingEl.remove();

      if (!addresses.length) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">
              <span class="material-icons-outlined">location_on</span>
            </div>
            <div class="empty-state-title">لا توجد عناوين محفوظة</div>
            <div class="empty-state-subtitle">ابدأ بإضافة عنوانك الأول</div>
          </div>
        `;
        return;
      }

      container.innerHTML = addresses.map(addr => {
        const isActive = addr.id === selectedId || addr.isDefault;
        const typeIcon = addr.type === 'home' ? 'home' : addr.type === 'work' ? 'work' : 'place';
        const displayName = addr.name || (addr.type === 'home' ? 'المنزل' : addr.type === 'work' ? 'العمل' : 'آخر');
        const displayAddress = addr.fullAddress || [addr.building, addr.street, addr.area].filter(Boolean).join('، ') || 'عنوان غير مكتمل';
        const displayPhone = addr.phone || '';

        return `
          <div class="address-card ${isActive ? 'active' : ''}" onclick="AddressesModule.selectAddress('${addr.id}')">
            <div class="address-card-header">
              <div class="type-icon">
                <span class="material-icons-outlined">${typeIcon}</span>
              </div>
              <div class="address-info">
                <h3 class="address-label">${displayName}</h3>
                <p class="address-text">${displayAddress}</p>
                ${displayPhone ? `<p class="address-phone">${displayPhone}</p>` : ''}
              </div>
              <button class="address-edit-btn" onclick="event.stopPropagation();AddressesModule.editAddress('${addr.id}')" title="تعديل العنوان" type="button">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11.5 1.5L14.5 4.5L5.5 13.5L2 14L2.5 10.5L11.5 1.5Z" stroke="#6b7c93" stroke-width="1.3" stroke-linejoin="round"/><path d="M9.5 3.5L12.5 6.5" stroke="#6b7c93" stroke-width="1.3"/></svg>
              </button>
              ${isActive ? `<div class="default-badge">افتراضي</div>` : ''}
            </div>
            <div class="address-actions" onclick="event.stopPropagation()">
              ${!isActive ? `<button class="action-btn default-btn" onclick="AddressesModule.setDefaultAddress('${addr.id}')">تعيين كافتراضي</button>` : ''}
              <button class="action-btn delete-btn" onclick="AddressesModule.deleteAddress('${addr.id}')">حذف</button>
            </div>
          </div>
        `;
      }).join('');
    },

    // Map Initialization
    initMap: function() {
      if (typeof L === 'undefined') {
        console.warn('Leaflet not loaded');
        return;
      }

      const mapEl = DOM.get('#map');
      if (!mapEl) return;

      // Clean up previous map instance
      if (state.map) {
        state.map.remove();
        state.map = null;
        state.isMapInitialized = false;
      }

      var self = this;
      var userCountryCode = getUserCountryCode();
      var defaultCenter = getCountryCenter(userCountryCode);
      var countryBounds = getCountryBounds(userCountryCode);
      state.currentLocation.lat = defaultCenter.lat;
      state.currentLocation.lng = defaultCenter.lng;
      console.log("[map] userCountry =", userCountryCode, "| center =", defaultCenter, "| bounds =", countryBounds);
      console.log("[map] localStorage.userCountry =", localStorage.getItem("userCountry"));
      if (window.TaagerIntegration) {
        var sel = window.TaagerIntegration.getSelectedCountry();
        console.log("[map] TaagerIntegration country =", sel ? sel.code : "null");
      }

      // Initialize map — restricted to country bounds
      state.map = L.map(mapEl, {
        center: [state.currentLocation.lat, state.currentLocation.lng],
        zoom: CONFIG.map.defaultZoom,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        dragging: true,
        touchZoom: true,
        zoomAnimation: true,
        maxBounds: countryBounds,
        maxBoundsViscosity: 1.0,
      });

      // Tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: CONFIG.map.maxZoom,
      }).addTo(state.map);

      // Zoom control bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(state.map);

      const mapScreen = document.getElementById('map-screen');

      // When drag STARTS — add class to lift pin and squish shadow
      state.map.on('movestart', () => {
        if (mapScreen) mapScreen.classList.add('dragging');
        // Show loading dot
        const dot = DOM.get('#map-loading-dot');
        if (dot) dot.classList.add('active');
        // Set label to loading state
        const label = DOM.get('#pin-label');
        if (label) label.classList.add('loading');
        const labelText = DOM.get('#pin-label-text');
        if (labelText) labelText.textContent = 'جارٍ تحديد الموقع...';
      });

      // When drag ENDS — remove class and geocode center
      state.map.on('moveend', () => {
        if (mapScreen) mapScreen.classList.remove('dragging');
        const center = state.map.getCenter();
        state.currentLocation.lat = center.lat;
        state.currentLocation.lng = center.lng;
        state.isLocationConfirmed = true;

        // Reverse geocode the center point
        this.reverseGeocode(center.lat, center.lng, (name) => {
          // Update pin label
          const label = DOM.get('#pin-label');
          if (label) label.classList.remove('loading');
          const labelText = DOM.get('#pin-label-text');
          if (labelText) labelText.textContent = name;
          // Update bottom panel
          const bottomAddr = DOM.get('#location-display');
          if (bottomAddr) bottomAddr.textContent = name;
          // Hide loading dot
          const dot = DOM.get('#map-loading-dot');
          if (dot) dot.classList.remove('active');
          // Enable confirm button
          const btn = DOM.get('#confirm-location-btn');
          if (btn) btn.disabled = false;
        });
      });

      // Initial geocode for default center
      this.reverseGeocode(
        state.currentLocation.lat,
        state.currentLocation.lng,
        (name) => {
          const labelText = DOM.get('#pin-label-text');
          if (labelText) labelText.textContent = name;
          const bottomAddr = DOM.get('#location-display');
          if (bottomAddr) bottomAddr.textContent = name;
        }
      );

      // Verify GPS location against account country
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          function(pos) {
            self.verifyGpsLocation(pos.coords.latitude, pos.coords.longitude, userCountryCode, defaultCenter);
          },
          function() {},
          { timeout: 5000, maximumAge: 0 }
        );
      }

      // VPN / Proxy detection via IP range and hosting detection
      state.isVpnDetected = false;
      var vpnKeywords = ["digitalocean", "aws ", "amazon", "google cloud", "googlecloud", "microsoft azure", "azure", "hetzner", "ovh ", "scaleway", "vultr", "linode", "oracle cloud", "alibaba cloud", "tencent cloud", "hostinger", "namecheap", "cloudflare", "incapsula", "akamai", "fastly", "datacamp", "psychz", "m247", "multacom", "quadranet", "sharktech", "nocix", "buyvm", "frantech", "colocrossing", "dacentec", "wholesale", "serverhub", "hostkey", "xirra", "terrahost", "voxility", "netolutions", "hosting", "datacenter", "vpn", "proxy"];
      // Use a simple IP lookup + org check
      fetch("https://ipinfo.io/json")
        .then(function(res) { return res.json(); })
        .then(function(data) {
          var org = (data.org || "").toLowerCase();
          var ipCountry = (data.country || "").toUpperCase();
          for (var vi = 0; vi < vpnKeywords.length; vi++) {
            if (org.indexOf(vpnKeywords[vi]) >= 0) {
              state.isVpnDetected = true;
              console.log("[map] VPN detected — IP:", data.ip, "org:", data.org, "country:", ipCountry);
              var banner = document.getElementById("country-block-banner");
              if (banner) {
                var vpnLine = document.createElement("div");
                vpnLine.id = "vpn-warning-line";
                vpnLine.style.cssText = "margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.3);font-size:0.8rem;";
                vpnLine.innerHTML = '<span class="material-icons-outlined" style="font-size:16px;vertical-align:middle;">security</span> تم الكشف عن استخدام VPN. يرجى تعطيله لإضافة عنوان.';
                banner.appendChild(vpnLine);
              }
              break;
            }
          }
          if (!state.isVpnDetected) {
            console.log("[map] no VPN detected — IP:", data.ip, "org:", data.org);
          }
        })
        .catch(function() {
          console.warn("[map] VPN detection unavailable");
        });

      state.isMapInitialized = true;
      window._mapRef = state.map;
    },

    // Verify GPS location against account country and handle accordingly
    // Remove any existing country block banner
    removeCountryBanner: function() {
      var existing = document.getElementById("country-block-banner");
      if (existing) existing.remove();
    },

    // Show persistent blocking banner on map screen
    showCountryBlockBanner: function(userCountryName, accountCountryName, isVpn) {
      this.removeCountryBanner();

      var banner = document.createElement("div");
      banner.id = "country-block-banner";
      banner.style.cssText = "position:absolute;top:0;left:0;right:0;z-index:1000;background:#D92D20;color:#fff;padding:14px 16px;font-size:0.85rem;text-align:center;direction:rtl;box-shadow:0 2px 12px rgba(217,45,32,0.3);";

      var html =
        '<div style="display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;">' +
        '<span class="material-icons-outlined" style="font-size:20px;">block</span>' +
        '<span><strong>أنت في ' + userCountryName + '</strong> — حسابك مسجل في <strong>' + accountCountryName + '</strong>.</span>' +
        '</div>' +
        '<div style="margin-top:8px;font-size:0.8rem;opacity:0.9;">لا يمكنك إضافة عنوان من دولة مختلفة. غير دولتك من <a href="ahsab.html" style="color:#fff;text-decoration:underline;font-weight:600;">صفحة الحساب</a>.</div>';

      if (isVpn || state.isVpnDetected) {
        html +=
          '<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.3);font-size:0.8rem;">' +
          '<span class="material-icons-outlined" style="font-size:16px;vertical-align:middle;">security</span> تم الكشف عن استخدام VPN. يرجى تعطيله لإضافة عنوان.</div>';
      }

      banner.innerHTML = html;

      var mapContainer = document.getElementById("map-screen");
      if (mapContainer) {
        mapContainer.appendChild(banner);
      }
    },

    verifyGpsLocation: function(gpsLat, gpsLng, accountCountry, defaultCenter) {
      var self = this;
      var url = "https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" + gpsLat + "&longitude=" + gpsLng + "&localityLanguage=en";
      fetch(url)
        .then(function(res) { return res.json(); })
        .then(function(data) {
          var gpsCountryCode = "EG";
          var gpsCountryName = data.countryName || "مصر";
          if (data.countryCode) {
            gpsCountryCode = data.countryCode.toUpperCase();
          } else if (data.countryName) {
            var cn = data.countryName.toLowerCase();
            if (cn.indexOf("saudi") >= 0 || cn.indexOf("arabia") >= 0 || cn.indexOf("kingdom") >= 0) {
              gpsCountryCode = "SA";
              gpsCountryName = "السعودية";
            }
          }
          console.log("[map] GPS country =", gpsCountryCode, "| account country =", accountCountry);
          localStorage.setItem('gpsCountry', gpsCountryCode);
          if (gpsCountryCode === accountCountry) {
            console.log("[map] GPS matches — panning to GPS location:", gpsLat, gpsLng);
            state.isGpsMismatched = false;
            self.removeCountryBanner();
            var confirmBtn = DOM.get('#confirm-location-btn');
            if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.style.opacity = ''; }
            if (state.map) {
              state.map.setView([gpsLat, gpsLng], 16);
            }
          } else {
            console.log("[map] GPS MISMATCH — blocked");
            state.isGpsMismatched = true;
            var confirmBtn = DOM.get('#confirm-location-btn');
            if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.style.opacity = '0.4'; }
            self.showCountryBlockBanner(gpsCountryName, getCountryName(accountCountry));
            state.currentLocation.lat = defaultCenter.lat;
            state.currentLocation.lng = defaultCenter.lng;
            if (state.map) {
              state.map.setView([defaultCenter.lat, defaultCenter.lng], CONFIG.map.defaultZoom);
            }
          }
        })
        .catch(function() {
          if (state.map) {
            state.map.setView([gpsLat, gpsLng], 16);
          }
        });
    },

    // Locate Me — pan map to user's GPS position (with country verification)
    locateMe: function() {
      if (!state.map) return;
      if (!navigator.geolocation) return;
      var self = this;
      var userCountryCode = getUserCountryCode();
      var defaultCenter = getCountryCenter(userCountryCode);
      const dot = DOM.get('#map-loading-dot');
      if (dot) dot.classList.add('active');
      navigator.geolocation.getCurrentPosition(
        function(pos) {
          self.verifyGpsLocation(pos.coords.latitude, pos.coords.longitude, userCountryCode, defaultCenter);
          if (dot) dot.classList.remove('active');
        },
        function() {
          if (dot) dot.classList.remove('active');
        },
        { timeout: 8000, maximumAge: 0 }
      );
    },

    // -- End of map/location functions --

    // Reverse geocode using BigDataCloud (free, no key, CORS-friendly)
    reverseGeocode: function(lat, lon, callback) {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ar`;

      fetch(url)
        .then(res => res.json())
        .then(data => {
          const parts = [];
          if (data.localityInfo?.administrative) {
            const admins = data.localityInfo.administrative
              .filter(a => a.order >= 6 && a.order <= 9)
              .sort((a, b) => b.order - a.order);
            admins.slice(0, 2).forEach(a => { if (a.name) parts.push(a.name); });
          }
          if (!parts.length && data.locality) parts.push(data.locality);
          if (!parts.length && data.city) parts.push(data.city);
          if (data.principalSubdivision && parts.length < 2) parts.push(data.principalSubdivision);
          if (data.countryName && parts.length < 2) parts.push(data.countryName);

          const name = parts.length ? parts.join('، ') : `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
          callback(name);
        })
        .catch(() => {
          callback(`${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        });
    },

    // Debounce utility (kept for compatibility)
    debounceUpdateLocationDisplay: function() {},

    // Update UI status (kept for compatibility)
    updateMapStatus: function() {},





    // Toast notification
    showToast: function(message, type = 'info') {
      const container = DOM.get('#toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;

      container.appendChild(toast);

      // Trigger animation
      requestAnimationFrame(() => {
        toast.classList.add('show');
      });

      // Auto-remove
      clearTimeout(state.toastTimeout);
      state.toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          toast.remove();
        }, 300);
      }, CONFIG.ui.toastDuration);
    },

    // Form population from location
    populateFormFromLocation: function() {
      // Reset any edit state
      state.editingAddressId = null;

      // Reset form title and button
      var sectionTitle = document.querySelector('.form-section .section-title');
      if (sectionTitle) sectionTitle.innerHTML = '<span class="material-icons-outlined">location_on</span> تفاصيل العنوان';
      var submitBtn = document.querySelector('.save-btn span');
      if (submitBtn) submitBtn.textContent = 'حفظ العنوان';

      // Show country banner (hidden in edit mode)
      var countryBanner = DOM.get('#address-form-country-banner');
      if (countryBanner) countryBanner.style.display = '';

      // Pre-fill area from reverse geocode result
      const areaInput = DOM.get('#area-input');
      if (areaInput) areaInput.value = '';
      if (areaInput && state.lastLocationName) {
        areaInput.value = state.lastLocationName;
      }

      // Clear other fields when coming from map (new address)
      var floorInput = DOM.get('#floor-input');
      if (floorInput) floorInput.value = '';
      var buildingInput = DOM.get('#building-input');
      if (buildingInput) buildingInput.value = '';
      var streetInput = DOM.get('#street-input');
      if (streetInput) streetInput.value = '';
      var landmarkInput = DOM.get('#landmark-input');
      if (landmarkInput) landmarkInput.value = '';
      var directionsInput = DOM.get('#directions-input');
      if (directionsInput) directionsInput.value = '';
      var phoneInput = DOM.get('#phone-input');
      if (phoneInput) {
        phoneInput.value = '';
        phoneInput.readOnly = false;
        phoneInput.style.backgroundColor = '';
        phoneInput.style.color = '';
        phoneInput.style.cursor = '';
      }

      // Set phone country code based on user's country
      var phoneSelect = DOM.get('#phone-country-code');
      if (phoneSelect) {
        var userCountry = getUserCountryCode();
        // Show only the option matching user's country, hide the other
        for (var pi = 0; pi < phoneSelect.options.length; pi++) {
          phoneSelect.options[pi].style.display = phoneSelect.options[pi].value === userCountry ? '' : 'none';
        }
        phoneSelect.value = userCountry;
        // Update placeholder based on country
        if (phoneInput) {
          var placeholders = { SA: 'مثال: 5xxxxxxx', EG: 'مثال: 11xxxxxxx' };
          phoneInput.placeholder = placeholders[userCountry] || 'رقم الهاتف';
        }
      }

      // Reset type selector to home
      var typeChips = document.querySelectorAll('.type-chip');
      typeChips.forEach(function(chip) {
        var radio = chip.querySelector('input[type="radio"]');
        if (radio) {
          if (radio.value === 'home') {
            radio.checked = true;
            chip.classList.add('active');
          } else {
            radio.checked = false;
            chip.classList.remove('active');
          }
        }
      });

      // Scroll to top of form
      const formScreen = document.getElementById('address-form-screen');
      if (formScreen) formScreen.scrollTop = 0;
    },

    // Phone validation
    validatePhone: function(phone, countryCode) {
      if (!phone) return { valid: false, message: 'يرجى إدخال رقم الهاتف' };
      var digits = phone.replace(/\D/g, '');
      if (countryCode === 'SA') {
        if (digits.length !== 9 && digits.length !== 10) {
          return { valid: false, message: 'رقم الهاتف السعودي يجب أن يتكون من 9 أرقام (مثال: 5xxxxxxxx)' };
        }
        if (digits[0] !== '5') {
          return { valid: false, message: 'رقم الهاتف السعودي يجب أن يبدأ بـ 5' };
        }
      } else if (countryCode === 'EG') {
        if (digits.length !== 10 && digits.length !== 11) {
          return { valid: false, message: 'رقم الهاتف المصري يجب أن يتكون من 10 أرقام (مثال: 11xxxxxxx)' };
        }
        if (digits[0] !== '1') {
          return { valid: false, message: 'رقم الهاتف المصري يجب أن يبدأ بـ 1' };
        }
      }
      return { valid: true };
    },

    // Form validation
    validateForm: function() {
      const form = DOM.get('#address-form');
      if (!form) return true;

      const streetInput = DOM.get('#street-input');
      const areaInput = DOM.get('#area-input');;
      const buildingInput = DOM.get('#building-input');;

      let isValid = true;
      let errorMessage = '';

      if (!streetInput || !streetInput.value.trim()) {
        isValid = false;
        errorMessage = CONFIG.form.minStreet;
      } else if (!areaInput || !areaInput.value.trim()) {
        isValid = false;
        errorMessage = 'يرجى إدخال اسم المنطقة/الحي';
      }

      if (!isValid) {
        this.showToast(errorMessage, 'error');
      }

      return isValid;
    }
  };

  // ===== Business Logic =====
  const BusinessLogic = {
    // Address management
    addAddress: async function(addressData) {
      const savedAddresses = Storage.get(CONFIG.storageKey, []);
      const newAddress = {
        id: Date.now().toString(),
        ...addressData,
        isDefault: savedAddresses.length === 0,
        createdAt: new Date().toISOString(),
      };

      savedAddresses.push(newAddress);
      Storage.set(CONFIG.storageKey, savedAddresses);

      // Sync with Supabase
      if (addressData.email) {
        await API.saveAddressToSupabase(newAddress);
      }

      return newAddress;
    },

    updateAddress: async function(addressId, updateData) {
      const savedAddresses = Storage.get(CONFIG.storageKey, []);
      const index = savedAddresses.findIndex(addr => addr.id === addressId);

      if (index === -1) {
        throw new Error('العنوان غير موجود');
      }

      savedAddresses[index] = { ...savedAddresses[index], ...updateData };
      Storage.set(CONFIG.storageKey, savedAddresses);

      // Sync with Supabase
      const email = getActiveEmail();
      if (email) {
        await API.saveAddressToSupabase(savedAddresses[index]);
      }

      return savedAddresses[index];
    },

    deleteAddress: async function(addressId) {
      let savedAddresses = Storage.get(CONFIG.storageKey, []);
      savedAddresses = savedAddresses.filter(addr => addr.id !== addressId);

      Storage.set(CONFIG.storageKey, savedAddresses);

      // Remove from Supabase
      await API.deleteAddressFromSupabase(addressId);
    },

    setDefaultAddress: async function(addressId) {
      let savedAddresses = Storage.get(CONFIG.storageKey, []);

      // Reset all addresses to non-default
      savedAddresses = savedAddresses.map(addr => ({
        ...addr,
        isDefault: false,
      }));

      // Set selected address as default
      const selectedAddress = savedAddresses.find(addr => addr.id === addressId);
      if (selectedAddress) {
        selectedAddress.isDefault = true;
        Storage.set(CONFIG.storageKey, savedAddresses);

        // Sync with Supabase
        const email = getActiveEmail();
        if (email) {
          await API.setDefaultAddressInSupabase(email, addressId);
        }
      }
    },

    // Load addresses from storage & Supabase
    loadAddresses: async function() {
      const email = getActiveEmail();
      var currentCountry = getUserCountryCode();
      let addresses = [];

      if (email) {
        // Fetch from Supabase
        const dbAddresses = await API.fetchAddressesFromSupabase(email);
        if (dbAddresses !== null) {
          // Save all addresses to storage (per-country key)
          Storage.set(CONFIG.storageKey, dbAddresses);
          // Filter to ONLY show addresses for current country
          addresses = dbAddresses.filter(function(addr) { return addr.country === currentCountry; });
        } else {
          // Migration: try old key if new country key is empty
          addresses = Storage.get(CONFIG.storageKey, []);
          if (!addresses.length) {
            var oldKey = CONFIG.storageKey + '_' + email;
            var oldData = localStorage.getItem(oldKey);
            if (oldData) {
              try { addresses = JSON.parse(oldData) || []; } catch {}
              // Tag migrated addresses with current country
              for (var mi = 0; mi < addresses.length; mi++) {
                if (!addresses[mi].country) addresses[mi].country = currentCountry;
              }
              // Save to new per-country key (migration complete)
              Storage.set(CONFIG.storageKey, addresses);
            }
          }
        }
      } else {
        // Fallback to local storage if not logged in
        addresses = Storage.get(CONFIG.storageKey, []);
      }

      var selectedId = Storage.get(CONFIG.selectedAddressKey);
      // Migration: try old selected address key
      if (!selectedId) {
        var oldSelKey = CONFIG.selectedAddressKey + '_' + email;
        selectedId = localStorage.getItem(oldSelKey);
        if (selectedId) {
          try { selectedId = JSON.parse(selectedId); } catch {}
          Storage.set(CONFIG.selectedAddressKey, selectedId);
        }
      }
      const selectedAddress = addresses.find(addr => String(addr.id) === String(selectedId));

      state.addresses = addresses;
      state.selectedAddress = selectedAddress || null;

      UI.renderAddressList();
      syncLegacyStorage();
    }
  };

  // ===== Event Handlers =====
  const EventHandlers = {
    // Navigation
    setupNavigation: function() {
      // List view navigation
      DOM.get('#btn-add-new')?.addEventListener('click', () => UI.showView('map'));

      // Map view navigation
      DOM.get('#map-back-btn')?.addEventListener('click', () => UI.showView('address-list'));

      // Form view navigation — if editing, go back to list; if new, go back to map
      DOM.get('#form-back-btn')?.addEventListener('click', function () {
        if (state.editingAddressId) {
          state.editingAddressId = null;
          UI.showView('address-list');
        } else {
          UI.showView('map');
        }
      });

      // Confirm location button
      DOM.get('#confirm-location-btn')?.addEventListener('click', () => this.confirmLocation());

      // Form submission
      DOM.get('#address-form')?.addEventListener('submit', (e) => this.saveAddress(e));

      // Map search input
      DOM.get('#map-search-input')?.addEventListener('input', this.handleMapSearch);
    },

    // Map navigation — always confirm (pin always has a location)
    confirmLocation: function() {
      var self = this;
      var userCountryCode = getUserCountryCode();

      // Fast pre-check: if GPS mismatch was detected, block immediately
      if (state.isGpsMismatched) {
        UI.showToast('لا يمكن تأكيد الموقع لأن GPS لا يتطابق مع ' + getCountryName(userCountryCode) + '.', 'error');
        return;
      }

      // Block if VPN detected
      if (state.isVpnDetected) {
        UI.showToast('تم اكتشاف VPN. يرجى تعطيله لإضافة عنوان.', 'error');
        return;
      }

      // Check if pin location matches account country
      var pinLat = state.currentLocation.lat;
      var pinLng = state.currentLocation.lng;
      var url = "https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" + pinLat + "&longitude=" + pinLng + "&localityLanguage=en";
      DOM.get('#confirm-location-btn').disabled = true;
      DOM.get('#confirm-location-btn').textContent = 'جارٍ التحقق من الموقع...';

      fetch(url)
        .then(function(res) { return res.json(); })
        .then(function(data) {
          var pinCountry = "EG";
          if (data.countryCode) {
            pinCountry = data.countryCode.toUpperCase();
          } else if (data.countryName) {
            var cn = data.countryName.toLowerCase();
            if (cn.indexOf("saudi") >= 0 || cn.indexOf("arabia") >= 0 || cn.indexOf("kingdom") >= 0) {
              pinCountry = "SA";
            }
          }

          DOM.get('#confirm-location-btn').disabled = false;
          DOM.get('#confirm-location-btn').textContent = CONFIG.ui.confirmButtonText;

          if (pinCountry !== userCountryCode) {
            var pinCountryName = data.countryName || getCountryName(pinCountry);
            if (pinCountry === "SA") pinCountryName = "السعودية";
            DOM.get('#confirm-location-btn').disabled = true;
            DOM.get('#confirm-location-btn').style.opacity = '0.4';
            DOM.get('#confirm-location-btn').textContent = CONFIG.ui.confirmButtonText;
            state.isGpsMismatched = true;
            UI.showCountryBlockBanner(pinCountryName, getCountryName(userCountryCode));
            return;
          }

          // Store current location name for pre-filling form
          const locationDisplay = DOM.get('#location-display');
          state.lastLocationName = locationDisplay ? locationDisplay.textContent : '';

          // Show country banner in form
          var countryBanner = DOM.get('#address-form-country-banner');
          var countryText = DOM.get('#address-form-country-text');
          if (countryBanner && countryText) {
            var names = { EG: '🇪🇬 مصر', SA: '🇸🇦 السعودية' };
            countryText.textContent = 'العنوان سيتم إضافته في ' + (names[userCountryCode] || userCountryCode);
            countryBanner.style.display = 'block';
          }

          UI.showView('address-form');
          UI.populateFormFromLocation();
        })
        .catch(function() {
          // If geocode fails, allow proceeding
          DOM.get('#confirm-location-btn').disabled = false;
          DOM.get('#confirm-location-btn').textContent = CONFIG.ui.confirmButtonText;

          const locationDisplay = DOM.get('#location-display');
          state.lastLocationName = locationDisplay ? locationDisplay.textContent : '';

          var countryBanner = DOM.get('#address-form-country-banner');
          var countryText = DOM.get('#address-form-country-text');
          if (countryBanner && countryText) {
            var names = { EG: '🇪🇬 مصر', SA: '🇸🇦 السعودية' };
            countryText.textContent = 'العنوان سيتم إضافته في ' + (names[userCountryCode] || userCountryCode);
            countryBanner.style.display = 'block';
          }

          UI.showView('address-form');
          UI.populateFormFromLocation();
        });
    },

    handleMapSearch: function(event) {
      const searchTerm = event.target.value.toLowerCase();
      console.log('بحث في الخريطة:', searchTerm);
    },

    // Form handling
    saveAddress: async function(e) {
      e.preventDefault();

      if (!UI.validateForm()) {
        return;
      }

      // Validate phone number matches user's country
      var phoneCountryCode = DOM.get('#phone-country-code')?.value || getUserCountryCode();
      var rawPhone = DOM.get('#phone-input')?.value || '';
      var phoneValidation = UI.validatePhone(rawPhone, phoneCountryCode);
      if (!phoneValidation.valid) {
        UI.showToast(phoneValidation.message, 'error');
        DOM.get('#phone-input')?.focus();
        return;
      }

      const addressTypeRadio = DOM.get('input[name="address-type"]:checked');
      const addressTypeVal = addressTypeRadio ? addressTypeRadio.value : 'home';
      const addressTypeLabel = addressTypeRadio ? addressTypeRadio.parentElement.textContent.trim() : 'المنزل';
      const email = getActiveEmail();

      // Build full phone with country code
      var phoneCodes = { EG: '+20', SA: '+966' };
      var fullPhone = (phoneCodes[phoneCountryCode] || '') + ' ' + rawPhone.replace(/\D/g, '');

      const formData = {
        email: email,
        type: addressTypeVal,
        name: addressTypeLabel,
        fullAddress: [
          DOM.get('#building-input')?.value,
          DOM.get('#street-input')?.value,
          DOM.get('#area-input')?.value
        ].filter(Boolean).join(', '),
        phone: fullPhone,
        country: getUserCountryCode(),
        lat: state.currentLocation.lat,
        lng: state.currentLocation.lng,
        street: DOM.get('#street-input')?.value || '',
        building: DOM.get('#building-input')?.value || '',
        area: DOM.get('#area-input')?.value || '',
        floor: DOM.get('#floor-input')?.value || '',
      };

      if (state.editingAddressId) {
        // Edit mode: update existing address
        var editId = state.editingAddressId;
        var existing = state.addresses.find(function(a) { return a.id === editId; });
        formData.id = editId;
        formData.isDefault = existing ? existing.isDefault : false;
        formData.createdAt = existing ? existing.createdAt : new Date().toISOString();

        await BusinessLogic.updateAddress(editId, formData);
        state.selectedAddress = formData;
        Storage.set(CONFIG.selectedAddressKey, formData.id);
        state.editingAddressId = null;

        UI.showToast('تم تحديث العنوان بنجاح!', 'success');
      } else {
        // New address mode
        formData.id = Date.now().toString();
        formData.isDefault = false;

        const newAddress = await BusinessLogic.addAddress(formData);
        state.selectedAddress = newAddress;
        Storage.set(CONFIG.selectedAddressKey, newAddress.id);

        UI.showToast('تم حفظ العنوان بنجاح!', 'success');
      }

      // Reset form title and button
      var sectionTitle = document.querySelector('.form-section .section-title');
      if (sectionTitle) sectionTitle.innerHTML = '<span class="material-icons-outlined">location_on</span> تفاصيل العنوان';
      var submitBtn = document.querySelector('.save-btn span');
      if (submitBtn) submitBtn.textContent = 'حفظ العنوان';

      var urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('redirect') === 'checkout') {
        setTimeout(function () { window.location.href = 'checkout.html'; }, 600);
        return;
      }
      UI.showView('address-list');
    },

    // Address selection
    selectAddress: function(addressId) {
      const address = state.addresses.find(addr => addr.id === addressId);
      if (address) {
        state.selectedAddress = address;
        Storage.set(CONFIG.selectedAddressKey, addressId);
        UI.renderAddressList();
      }
    },

    editAddress: function(addressId) {
      const address = state.addresses.find(addr => addr.id === addressId);
      if (!address) return;

      state.editingAddressId = addressId;

      // Pre-fill form fields
      var typeChips = document.querySelectorAll('.type-chip');
      typeChips.forEach(function(chip) {
        var radio = chip.querySelector('input[type="radio"]');
        if (radio) {
          if (radio.value === (address.type || 'home')) {
            radio.checked = true;
            chip.classList.add('active');
          } else {
            radio.checked = false;
            chip.classList.remove('active');
          }
        }
      });

      var phoneVal = (address.phone || '').replace(/^(\+20|\+966)\s*/, '');
      var countryCode = 'EG';
      if ((address.phone || '').indexOf('+966') === 0) countryCode = 'SA';

      var phoneSelect = DOM.get('#phone-country-code');
      if (phoneSelect) phoneSelect.value = countryCode;

      var phoneInput = DOM.get('#phone-input');
      if (phoneInput) {
        phoneInput.value = phoneVal;
        phoneInput.readOnly = true;
        phoneInput.style.backgroundColor = '#f3f4f6';
        phoneInput.style.color = '#6b7280';
        phoneInput.style.cursor = 'not-allowed';
      }

      var floorInput = DOM.get('#floor-input');
      if (floorInput) floorInput.value = address.floor || '';

      var buildingInput = DOM.get('#building-input');
      if (buildingInput) buildingInput.value = address.building || '';

      var streetInput = DOM.get('#street-input');
      if (streetInput) streetInput.value = address.street || '';

      var areaInput = DOM.get('#area-input');
      if (areaInput) areaInput.value = address.area || '';

      var landmarkInput = DOM.get('#landmark-input');
      if (landmarkInput) landmarkInput.value = address.landmark || '';

      var directionsInput = DOM.get('#directions-input');
      if (directionsInput) directionsInput.value = address.directions || '';

      // Set current location to address location
      if (address.lat && address.lng) {
        state.currentLocation.lat = address.lat;
        state.currentLocation.lng = address.lng;
      }

      // Update form title
      var sectionTitle = document.querySelector('.form-section .section-title');
      if (sectionTitle) sectionTitle.innerHTML = '<span class="material-icons-outlined">edit</span> تعديل العنوان';

      // Update submit button text
      var submitBtn = document.querySelector('.save-btn span');
      if (submitBtn) submitBtn.textContent = 'حفظ التعديلات';

      // Hide country banner in edit mode
      var countryBanner = DOM.get('#address-form-country-banner');
      if (countryBanner) countryBanner.style.display = 'none';

      UI.showView('address-form');
    },

    setDefaultAddress: async function(addressId) {
      await BusinessLogic.setDefaultAddress(addressId);
      UI.renderAddressList();
      UI.showToast('تم تعيين العنوان كافتراضي', 'success');
    },

    deleteAddress: async function(addressId) {
      if (confirm('هل أنت متأكد من حذف هذا العنوان؟')) {
        await BusinessLogic.deleteAddress(addressId);

        if (state.selectedAddress?.id === addressId) {
          state.selectedAddress = null;
          Storage.remove(CONFIG.selectedAddressKey);
        }

        UI.renderAddressList();
        UI.showToast('تم حذف العنوان', 'success');
      }
    }
  };

  // ===== Public API =====
  return {
    init: async function() {
      // Setup UI event handlers
      EventHandlers.setupNavigation();

      // Load addresses from Supabase (await so list renders before spinner hides)
      await BusinessLogic.loadAddresses();

      // Reload page when country changes (so addresses filter per country)
      document.addEventListener("boda:country-changed", function() {
        window.location.reload();
      });

      var urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('redirect') === 'checkout') {
        setTimeout(function () { AddressesModule.showView('map'); }, 300);
      }

      console.log('🔧 Addresses Module initialized successfully');
    },

    // Exposed methods for external access
    showView: function(view) {
      UI.showView(view);
    },

    confirmLocation: function() {
      EventHandlers.confirmLocation();
    },

    selectAddress: function(addressId) {
      EventHandlers.selectAddress(addressId);
    },

    setDefaultAddress: async function(addressId) {
      await EventHandlers.setDefaultAddress(addressId);
    },

    deleteAddress: async function(addressId) {
      await EventHandlers.deleteAddress(addressId);
    },

    editAddress: function(addressId) {
      EventHandlers.editAddress(addressId);
    },

    getState: function() {
      return {
        currentView: state.currentView,
        addresses: state.addresses,
        selectedAddress: state.selectedAddress,
        currentLocation: state.currentLocation,
      };
    }
  };
})();

// Auto-initialize when DOM is ready
function _initAddresses() {
  AddressesModule.init().catch(err => console.warn('Init error:', err));
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initAddresses);
} else {
  _initAddresses();
}

console.log('📍 Addresses module loaded successfully');

// Global wrapper functions for HTML onclick attributes
window.showMapScreen = function() {
  AddressesModule.showView('map');
};

window.showAddressListScreen = function() {
  AddressesModule.showView('address-list');
};

window.confirmLocation = function() {
  AddressesModule.confirmLocation();
};

window.selectType = function(type) {
  const chips = document.querySelectorAll('.type-chip');
  chips.forEach(chip => {
    const radio = chip.querySelector('input[type="radio"]');
    if (radio) {
      if (radio.value === type) {
        radio.checked = true;
        chip.classList.add('active');
      } else {
        radio.checked = false;
        chip.classList.remove('active');
      }
    }
  });
};

window.locateMe = function() {
  if (!AddressesModule) return;
  // Access the internal locateMe through the map object directly
  if (window._addressesUIRef) {
    window._addressesUIRef.locateMe();
  } else if (navigator.geolocation && window._mapRef) {
    navigator.geolocation.getCurrentPosition(
      (pos) => { window._mapRef.flyTo([pos.coords.latitude, pos.coords.longitude], 17, { duration: 1.2 }); },
      () => {},
      { timeout: 8000 }
    );
  }
};