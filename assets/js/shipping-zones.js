var ShippingZones = {
  // Egypt zones (default)
  zones: [
    { fee: 33, label: "رسوم الشحن 33 جنيه", cities: ["القاهرة", "الجيزة", "الإسكندرية"] },
    { fee: 38, label: "رسوم الشحن 38 جنيه", cities: ["البحيرة", "بورسعيد", "الدقهلية", "كفر الشيخ", "الشرقية", "الغربية", "طنطا", "المحلة", "القليوبية", "الإسماعيلية", "بني سويف", "السويس", "دمياط", "المنوفيه", "العاشر من رمضان"] },
    { fee: 43, label: "رسوم الشحن 43 جنيه", cities: ["الفيوم", "المنيا", "أسيوط", "سوهاج", "الأقصر", "أسوان", "قنا", "البحر الأحمر", "مطروح", "وادي النطرون", "العين السخنة", "الساحل الشمالي"] },
    { fee: 48, label: "رسوم الشحن 48 جنيه", cities: ["الوادي الجديد", "شمال سيناء", "جنوب سيناء", "نويبع", "طابا", "حلايب", "شلاتين", "أبو رماد", "الفرافرة", "الداخلة", "الخارجة", "باريس", "بلاط", "موط"] },
  ],

  // Saudi Arabia zones - flat 28 SAR
  saudiZones: [
    { fee: 28, label: "رسوم الشحن 28 ريال", cities: ["الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام", "الخبر", "الظهران", "القطيف", "الأحساء", "بريدة", "عنيزة", "الطائف", "أبها", "خميس مشيط", "نجران", "جيزان", "تبوك", "حائل", "عرعر", "سكاكا", "الباحة", "الليث", "رابغ", "ينبع", "العلا", "حفر الباطن", "الخرج", "المجمعة", "شقراء", "الدوادمي", "القويعية", "مكة", "المدينة", "الدمام", "الخبر", "الجبيل", "القطيف", "الاحساء"] },
  ],

  getAll: function () {
    var all = [];
    var zones = this.zones;
    for (var i = 0; i < zones.length; i++) {
      for (var j = 0; j < zones[i].cities.length; j++) {
        all.push({ name: zones[i].cities[j], fee: zones[i].fee });
      }
    }
    return all;
  },

  getSaudiAll: function () {
    var all = [];
    var zones = this.saudiZones;
    for (var i = 0; i < zones.length; i++) {
      for (var j = 0; j < zones[i].cities.length; j++) {
        all.push({ name: zones[i].cities[j], fee: zones[i].fee });
      }
    }
    return all;
  },

  getFee: function (cityName) {
    for (var i = 0; i < this.zones.length; i++) {
      for (var j = 0; j < this.zones[i].cities.length; j++) {
        if (this.zones[i].cities[j] === cityName) return this.zones[i].fee;
      }
    }
    // Check Saudi zones
    for (var i = 0; i < this.saudiZones.length; i++) {
      for (var j = 0; j < this.saudiZones[i].cities.length; j++) {
        if (this.saudiZones[i].cities[j] === cityName) return this.saudiZones[i].fee;
      }
    }
    return 0;
  },

  search: function (query) {
    var q = query.trim().toLowerCase();
    if (!q) return this.getAll();
    var results = [];
    var all = this.getAll();
    for (var i = 0; i < all.length; i++) {
      if (all[i].name.toLowerCase().indexOf(q) !== -1) results.push(all[i]);
    }
    return results;
  },

  searchSaudi: function (query) {
    var q = query.trim().toLowerCase();
    if (!q) return this.getSaudiAll();
    var results = [];
    var all = this.getSaudiAll();
    for (var i = 0; i < all.length; i++) {
      if (all[i].name.toLowerCase().indexOf(q) !== -1) results.push(all[i]);
    }
    return results;
  },

  getGrouped: function () {
    return this.zones;
  },

  getSaudiGrouped: function () {
    return this.saudiZones;
  },

  isSaudiArabia: function () {
    try {
      var selected = window.TaagerIntegration?.getSelectedCountry?.();
      return selected && selected.code === "SA";
    } catch (e) {
      return false;
    }
  },

  getCurrentZones: function () {
    return this.isSaudiArabia() ? this.saudiZones : this.zones;
  },

  getCurrentAll: function () {
    return this.isSaudiArabia() ? this.getSaudiAll() : this.getAll();
  },

  getCurrentGrouped: function () {
    return this.isSaudiArabia() ? this.getSaudiGrouped() : this.getGrouped();
  },

  getCurrentFee: function (cityName) {
    if (this.isSaudiArabia()) return 28; // Flat rate for Saudi Arabia
    return this.getFee(cityName);
  },

  searchCurrent: function (query) {
    return this.isSaudiArabia() ? this.searchSaudi(query) : this.search(query);
  }
};
