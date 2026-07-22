function getSearchHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem("searchHistory") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeTerm(value) {
  return String(value || "").trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function saveSearchHistory(term) {
  const normalized = normalizeTerm(term);
  if (!normalized) return;

  const history = getSearchHistory();
  const existing = history.indexOf(normalized);
  if (existing !== -1) history.splice(existing, 1);
  history.unshift(normalized);

  if (history.length > 10) {
    history.length = 10;
  }

  localStorage.setItem("searchHistory", JSON.stringify(history));
}

function setHistoryVisibility(visible) {
  const historyEl = document.getElementById("search-history");
  if (!historyEl) return;
  const hasHistory = getSearchHistory().length > 0;
  historyEl.classList.toggle("hidden", !visible || !hasHistory);
}

function hideSuggestions() {
  const suggestionsEl = document.getElementById("suggestions");
  if (!suggestionsEl) return;
  suggestionsEl.classList.add("hidden");
}

function clearResults() {
  const resultsEl = document.getElementById("search-results");
  if (!resultsEl) return;
  resultsEl.innerHTML = "";
  const sortBar = document.getElementById("search-sort-bar");
  if (sortBar) sortBar.classList.add("hidden");
}

function formatMoney(value) {
  return window.BudaStore
    ? window.BudaStore.formatMoney(value)
    : (Number(value) || 0).toFixed(2);
}

function resolvePrice(product) {
  var supplierPrice = Number(product?.price) || 0;
  var sellingPrice = supplierPrice;
  if (window.PricingEngine && window.PricingEngine.tiersLoaded) {
    sellingPrice = window.PricingEngine.calculate(supplierPrice);
  }
  if (window.BudaStore?.resolveProductPrice) {
    var r = window.BudaStore.resolveProductPrice(product);
    var basePrice = r.currentPrice > 0 ? r.currentPrice : supplierPrice;
    var finalPrice = basePrice;
    if (window.PricingEngine && window.PricingEngine.tiersLoaded) {
      finalPrice = window.PricingEngine.calculate(basePrice);
    }
    var hasDiscount = r.hasDiscount || r.originalPrice > finalPrice;
    var origPrice =
      r.originalPrice > finalPrice
        ? r.originalPrice
        : hasDiscount
          ? finalPrice * 1.25
          : finalPrice;
    return {
      finalPrice: finalPrice,
      originalPrice: origPrice,
      hasDiscount: hasDiscount,
      discountPercent: hasDiscount
        ? Math.round(((origPrice - finalPrice) / origPrice) * 100)
        : 0,
    };
  }
  return {
    finalPrice: sellingPrice,
    originalPrice: sellingPrice,
    hasDiscount: false,
    discountPercent: 0,
  };
}

function resolveRating(product) {
  if (window.BudaStore?.resolveProductRating) {
    var r = window.BudaStore.resolveProductRating(product);
    return { rating: r.rating > 0 ? r.rating : 0, reviews: r.reviewCount };
  }
  return { rating: 0, reviews: 0 };
}

function isWishlistedProduct(productId) {
  return window.BudaStore?.isInWishlist
    ? window.BudaStore.isInWishlist(productId)
    : false;
}

function navigateToProduct(pid) {
  if (!pid) return;
  var selected = window.BudaStore?.getProductById
    ? window.BudaStore.getProductById(pid)
    : null;
  if (selected) {
    try {
      sessionStorage.setItem(
        "selectedProduct",
        encodeURIComponent(JSON.stringify(selected)),
      );
    } catch {}
  }
  window.location.href = "product.html?id=" + encodeURIComponent(pid);
}

// Arabic↔English transliteration for bilingual search
const AR2EN = {
  'ا':'a','أ':'a','إ':'a','آ':'a','ب':'b','ت':'t','ث':'th','ج':'g','ح':'h',
  'خ':'kh','د':'d','ذ':'th','ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d',
  'ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m',
  'ن':'n','ه':'h','و':'w','ي':'y','ة':'a','ى':'a','ئ':'a','ء':'a'
};

const EN2AR = {
  'sh':'ش','kh':'خ','gh':'غ','th':'ث','dh':'ذ', 'ch':'ش',
  'a':'ا','b':'ب','t':'ت','g':'ج','h':'ه','d':'د','r':'ر',
  'z':'ز','s':'س','f':'ف','q':'ق','k':'ك','l':'ل','m':'م',
  'n':'ن','w':'و','y':'ي','o':'و','e':'ي','i':'ي','u':'و',
  'c':'ك','p':'ب','v':'ف','x':'س','j':'ج'
};

function latinizeArabic(text) {
  return String(text).split('').map(ch => AR2EN[ch] || ch).join('');
}

function arabizeLatin(text) {
  let result = '', i = 0;
  text = String(text).toLowerCase();
  while (i < text.length) {
    let found = false;
    for (let len = 2; len >= 1; len--) {
      const chunk = text.substr(i, len);
      if (EN2AR[chunk]) {
        result += EN2AR[chunk];
        i += len;
        found = true;
        break;
      }
    }
    if (!found) { result += text[i]; i++; }
  }
  return result;
}

function hasArabic(text) { return /[\u0600-\u06FF]/.test(text); }
function hasLatin(text) { return /[a-zA-Z]/.test(text); }

// Arabic↔English translation dictionary for search (500+ entries)
var AR2EN_DICT = {
  // === Watches & Jewelry ===
  "ساعة":"watch","ساعات":"watch","ساعه":"watch","ساعا":"watch","ساعتين":"watch","ساعات":"watches",
  "سلسلة":"chain","سلسال":"necklace","خاتم":"ring","خواتم":"ring","اسوارة":"bracelet","أساور":"bracelet","دبلة":"ring",
  "مجوهرات":"jewelry","اكسسوارات":"accessories","اكسسوار":"accessory","اكسسوارات":"accessory",
  "ساعة":"watch","ساعات":"watches","ساعة ذكية":"smartwatch","ساعات ذكية":"smartwatch","ساعه ذكيه":"smartwatch",
  "سوار":"band","استيك":"strap","سير":"strap",
  // === Phones & Electronics ===
  "موبايل":"mobile","موبيل":"mobile","جوال":"mobile","هاتف":"phone","تليفون":"phone","فون":"phone","تلفون":"phone",
  "ايفون":"iphone","ايباد":"ipad","ايبود":"ipod","ماك":"mac","ماك بوك":"macbook",
  "سامسونج":"samsung","سامسونغ":"samsung","نوكيا":"nokia","هواوي":"huawei","شاومي":"xiaomi","ابل":"apple",
  "أبل":"apple","اوبو":"oppo","فيفو":"vivo","ون بلس":"oneplus","ون":"one","بلس":"plus",
  "لينوفو":"lenovo","ديل":"dell","اتش بي":"hp","اتش":"h","بي":"p","اسوس":"asus","اسس":"asus",
  "سوني":"sony","انكر":"anker","جوي":"joy","شاومي":"xiaomi","شاومي":"xiaomi",
  "تاب":"tablet","تابلت":"tablet","لابتوب":"laptop","لاب":"laptop","لاب توب":"laptop","كمبيوتر":"computer",
  "شاشة":"screen","شاشه":"screen","شاشات":"screen","شاشه":"monitor","شاشة":"monitor",
  "كيبورد":"keyboard","كي بورد":"keyboard","ماوس":"mouse","موس":"mouse","ماوس":"mouse",
  "سماعة":"headphone","سماعات":"headphone","سماعه":"headphone","سماعه":"earphone","سماعة":"earphone",
  "سماعة":"headset","سماعات":"headset","سماعه":"headset",
  "ايربودز":"airpods","ايربود":"airpods","اير":"air","بودز":"pods",
  "شاحن":"charger","شواحن":"charger","شحن":"charging","شاحن":"charging",
  "جراب":"case","جرابات":"case","غطا":"case","غطاء":"case","كفر":"cover",
  "باوربانك":"powerbank","باور":"power","بانك":"bank",
  "وصلة":"cable","وصلات":"cable","سلك":"cable","اسلاك":"cable","كابل":"cable","كابلات":"cable",
  "باور":"power","بطارية":"battery","بطاريه":"battery","بطاريات":"battery",
  "ذاكرة":"memory","فلاشة":"flash","فلاش":"flash","usb":"usb",
  "راوتر":"router","واي فاي":"wifi","واي":"wi","فاي":"fi","راوتر":"modem",
  "بروجيكتور":"projector","عارض":"projector",
  "بلاي ستيشن":"playstation","بلاستيشن":"playstation","بي":"p","اس":"s","بيس":"ps","اكس":"x","بوكس":"box",
  "ننتندو":"nintendo","سويتش":"switch",
  // === Fashion & Clothing ===
  "ملابس":"clothes","هدوم":"clothes","ازياء":"fashion","موضة":"fashion",
  "بنطلون":"pants","بنطال":"pants","بنطلون":"trousers","جينز":"jeans",
  "تيشرت":"t-shirt","تيشيرت":"t-shirt","تي":"t","شيرت":"shirt",
  "فستان":"dress","فساتين":"dress","جاكيت":"jacket","جاكيت":"coat","بلوزة":"blouse","بلوزه":"blouse",
  "حذاء":"shoes","احذية":"shoes","حذيه":"shoes","جزمة":"boots","جزمه":"boots","جزم":"boots",
  "كوتشي":"sneakers","كوتشى":"sneakers","رياضي":"sneakers","سبورت":"sport",
  "صنادل":"sandals","صندل":"sandals","شبشب":"slippers","شباشب":"slippers",
  "طقم":"suit","بدلة":"suit","بدله":"suit",
  "قميص":"shirt","قمصان":"shirt","بلوفر":"sweater","هودي":"hoodie","هود":"hoodie",
  "بيجاما":"pajamas","بيجامه":"pajamas","نوم":"sleep",
  "ملابس داخلية":"underwear","داخلي":"underwear",
  "طرحه":"scarf","حجاب":"hijab","ايشارب":"scarf","شال":"shawl",
  "قبعة":"hat","قبعه":"hat","كاب":"cap","طاقية":"cap",
  "حزام":"belt","حزم":"belt",
  "محفظة":"wallet","محفظه":"wallet",
  "شمسية":"sunglasses","نظارة":"glasses","نظاره":"glasses",
  "ساعة":"watch","ساعات":"watches",
  // === Beauty & Personal Care ===
  "كريم":"cream","كريمات":"cream","مكياج":"makeup","ميكاب":"makeup",
  "بشرة":"skin","بشره":"skin","عناية":"care","تجميل":"beauty","جمال":"beauty",
  "شعر":"hair","شامبو":"shampoo","بلسم":"conditioner","كونديشنر":"conditioner",
  "صابون":"soap","صابونة":"soap","صابونه":"soap",
  "مرطب":"moisturizer","مرطبات":"moisturizer",
  "روج":"lipstick","روج":"lip","احمر":"red","شفايف":"lips",
  "مسك":"musk","عطور":"perfume","عطر":"perfume","برفان":"perfume","برفيوم":"perfume",
  "ماء ورد":"rose","ورد":"rose","فل":"jasmine","ياسمين":"jasmine",
  "دهن":"oil","زيت":"oil","زيوت":"oil","سيروم":"serum",
  "غسول":"wash","غسول":"cleanser","تونر":"toner","مقشر":"scrub",
  "معجون":"paste","اسنان":"teeth","سنان":"tooth","فرشاة":"brush","فرشاه":"brush",
  "ماكينة":"machine","ماكينه":"machine","حلاقة":"shave","حلاقه":"shave",
  "مزيل":"remover","عرق":"sweat","ازالة":"remove",
  "صبغة":"dye","صبغه":"dye","لون":"color",
  "منشفة":"towel","منشفه":"towel","فوطة":"towel","فوطة":"towel",
  "دبوس":"pin","مشط":"comb","ربط":"tie","استيك":"elastic",
  // === Home & Kitchen ===
  "مطبخ":"kitchen","منزل":"home","بيت":"home",
  "اثاث":"furniture","مفروشات":"furniture","أثاث":"furniture",
  "ديكور":"decor","ديكورات":"decor",
  "خلاط":"blender","ميكرويف":"microwave","فرن":"oven","ثلاجة":"fridge","تلاجه":"fridge",
  "غسالة":"washer","غساله":"washer","غسالة":"washing","نشاف":"dryer",
  "مكنسة":"vacuum","مكنسه":"vacuum","مكانس":"vacuum",
  "مكواة":"iron","مكواه":"iron","كاوي":"iron",
  "مروحة":"fan","مروحه":"fan","مراوح":"fan","تكييف":"ac","تكيف":"ac",
  "سخان":"heater","سخانات":"heater","دفاية":"heater","دفايه":"heater",
  "شاشة":"tv","شاشه":"tv","تلفزيون":"tv","تلفاز":"tv",
  "سماعات":"speaker","مكبر":"speaker","صوت":"sound","سبيكر":"speaker",
  "ريسيفر":"receiver","رسيفر":"receiver",
  "لمبة":"lamp","لمبه":"lamp","لمبات":"lamp","اضاءة":"lighting","اضاءه":"lighting",
  "سجادة":"rug","سجاده":"rug","سجاد":"rug","موكيت":"carpet",
  "مفرش":"tablecloth","مفارش":"tablecloth","شرشف":"sheet","شراشف":"sheet",
  "وسادة":"pillow","وساده":"pillow","مخدة":"pillow","مخده":"pillow","وسائد":"pillow",
  "لحاف":"blanket","بطانية":"blanket","بطانيه":"blanket",
  "ستاير":"curtain","ستارة":"curtain","ستاره":"curtain",
  "اطباق":"dishes","طبق":"dish","كوب":"cup","كاسة":"glass","كاسه":"glass",
  "طنجرة":"pot","طنجره":"pot","حلة":"pot","حله":"pot","مقلاة":"pan","مقلاه":"pan",
  "سكين":"knife","سكينة":"knife","سكينه":"knife","شوكة":"fork","شوكه":"fork","ملعقة":"spoon","ملعقه":"spoon",
  // === Sports & Fitness ===
  "رياضة":"sports","رياضه":"sports","جيم":"gym","نادي":"club",
  "دمبل":"dumbbell","دمبلز":"dumbbell","اوزان":"weights","ثقل":"weight",
  "ترابيز":"trap","بار":"bar","بنش":"bench",
  "مقاومه":"resistance","مقاومة":"resistance",
  "حبل":"rope","عقلة":"pullup","عقله":"pullup",
  "كورة":"ball","كورة":"football","كرة":"ball","مرمى":"goal",
  "دراجة":"bike","دراجه":"bike","بسكليت":"bicycle","عجلة":"bicycle",
  "ترامبولين":"trampoline",
  "يوغا":"yoga","تمارين":"exercise","تمرين":"exercise",
  "لياقة":"fitness","لياقه":"fitness","تخسيس":"slimming","دايت":"diet",
  "مشي":"walking","جري":"running","ركض":"running","عدو":"sprint",
  "سباحة":"swimming"," swim":"swim",
  // === Kids & Toys ===
  "اطفال":"kids","طفل":"kids","اطفال":"children","رضع":"baby","رضيع":"baby",
  "العاب":"games","لعبة":"game","لعبه":"game","العاب":"toys","لعبة":"toy",
  "ليجو":"lego","مكعبات":"blocks","تركيب":"building",
  "عروسة":"doll","عروسه":"doll","دمى":"doll","عرايس":"doll",
  "سيارة":"car","عربية":"car","عربيات":"car",
  "قطار":"train","طائرة":"plane","طياره":"plane",
  "بازل":"puzzle","الغاز":"puzzle",
  "تلوين":"coloring","رسم":"drawing","ألوان":"colors","الوان":"colors",
  "مدرسة":"school","دراسة":"study","حقيبة":"backpack","شنطة":"bag","شنطه":"bag",
  // === Groceries & Food ===
  "قهوة":"coffee","قهوه":"coffee","بن":"beans",
  "شاي":"tea","اعشاب":"herbs","ينسون":"anise","نعناع":"mint","كركديه":"hibiscus",
  "ماء":"water","عصير":"juice","مشروب":"drink","غازية":"soda",
  "شوكولاتة":"chocolate","شوكولاته":"chocolate","كاكاو":"cocoa",
  "بسكويت":"biscuit","بسكوت":"biscuit","كوكيز":"cookies","حلوي":"candy","حلوى":"candy","سكاكر":"candy",
  "ارز":"rice","رز":"rice","مكرونة":"pasta","معكرونه":"pasta","شعرية":"noodles",
  "عدس":"lentils","فول":"beans","حمص":"chickpeas","فاصوليا":"beans",
  "زيت":"oil","سمن":"ghee","زيتون":"olive","زيتون":"olives",
  "سكر":"sugar","ملح":"salt","طحين":"flour","دقيق":"flour",
  "بهارات":"spices","توابل":"spices","فلفل":"pepper","كمون":"cumin","كزبرة":"coriander",
  "عسل":"honey","مربى":"jam","مربى":"jam",
  "جبن":"cheese","جبنة":"cheese","جبنه":"cheese","زبدة":"butter","زبده":"butter",
  "حليب":"milk","لبن":"yogurt","زبادي":"yogurt",
  "لحم":"meat","دجاج":"chicken","فراخ":"chicken","سمك":"fish","جمبري":"shrimp",
  "خضار":"vegetables","خضروات":"vegetables","فواكه":"fruit","فاكهة":"fruit",
  "طبخ":"cooking","اكل":"food","طعام":"food","طبخ":"cook",
  // === Pets ===
  "قطط":"cat","قط":"cat","قطة":"cat","قطه":"cat","هر":"cat","بس":"cat",
  "كلاب":"dog","كلب":"dog","عقاب":"dog",
  "حيوان":"pet","حيوانات":"pet","طائر":"bird","سمك":"fish","سلحفاة":"turtle",
  "طعام":"food","أكل":"food","دراي":"dry","جاف":"dry","رطب":"wet",
  // === Office & Stationery ===
  "مكتب":"office","قرطاسية":"stationery","ادوات":"supplies",
  "قلم":"pen","اقلام":"pen","قلم":"pencil","رصاص":"pencil",
  "دفتر":"notebook","دفتـر":"notebook","كشكول":"notebook","كراسة":"notebook",
  "مسطرة":"ruler","مسطره":"ruler",
  "ممحاة":"eraser","ممحاه":"eraser","استيكة":"eraser",
  "مبراة":"sharpener","براية":"sharpener",
  "دباسة":"stapler","دباس":"stapler",
  "ورق":"paper","كارتون":"cardboard","مجلد":"folder",
  "طباعة":"printing","طابعة":"printer","طابعه":"printer","حبر":"ink",
  // === Automotive ===
  "سيارة":"car","سياره":"car","عربية":"car","عربيه":"car",
  "زيت":"oil","موتور":"engine","محرك":"engine",
  "اطارات":"tires","عجلات":"tires","كاوتش":"tire","جنط":"rim",
  "بطارية":"battery","بطاريه":"battery","بطاريات":"battery",
  "ماسح":"wiper","مساحات":"wiper","زجاج":"glass",
  "مكيف":"ac","تكييف":"ac","تكيف":"ac",
  "لمبة":"bulb","لمبه":"bulb","زين":"headlight","نور":"light",
  "فواحه":"air freshener","معطر":"freshener",
  // === Books & Media ===
  "كتب":"books","كتاب":"book","روايات":"novels","قصة":"story","قصص":"stories",
  "مجلد":"magazine","مجلة":"magazine",
  // === Seasons & Occasions ===
  "صيف":"summer","شتاء":"winter","خريف":"fall","ربيع":"spring",
  "عيد":"eid","ميلاد":"birthday","هدية":"gift","هديه":"gift","وليمة":"party",
  "زواج":"wedding","فرح":"wedding","عروسة":"bride","عريس":"groom",
  "مدرسة":"school","جامعة":"university","كلية":"college",
  // === Colors & Sizes ===
  "احمر":"red","ازرق":"blue","أزرق":"blue","اخضر":"green","أخضر":"green",
  "اصفر":"yellow","أصفر":"yellow","ابيض":"white","أبيض":"white","اسود":"black","أسود":"black",
  "بنى":"brown","بني":"brown","رمادي":"gray","رمادى":"gray","فضي":"silver","دهبي":"gold","ذهبي":"gold",
  "صغير":"small","وسط":"medium","كبير":"large","ضخم":"xl"," كبير جدا":"xxl",
  // === Common Verbs & Nouns ===
  "بحث":"search","نتائج":"results","نتيجة":"result"," تصفح":"browse",
  "قائمة":"list","مفضلة":"wishlist","عربة":"basket","عربه":"basket","عربيه":"basket","عربيات":"basket","سلة":"cart",
  "طلبات":"order","طلب":"order","طلبك":"order","اوردر":"order",
  "توصيل":"delivery","شحن":"shipping","شحن":"ship","رجوع":"return","مرتجع":"return","استبدال":"exchange",
  "خصم":"discount","سعر":"price","كود":"code","قسط":"installment","ضريبة":"tax","ضريبه":"tax",
  "تقييم":"rating","مراجعة":"review","نجمة":"star","نجمه":"star","تعليق":"comment",
  "حجم":"size","مقاس":"size","لون":"color","نوع":"type","ماركة":"brand","ماركه":"brand","صنع":"made",
  "جودة":"quality","جوده":"quality","ممتاز":"premium","رخيص":"cheap","غالي":"expensive",
  "جديد":"new","قديم":"old","مستعمل":"used","مستخدم":"used","مخفض":"discounted",
  "عنوان":"address","الاسم":"name","اسم":"name","بريد":"email","رقم":"number",
  "كلمة":"word","مرور":"password","تسجيل":"register","دخول":"login",
  "دفع":"payment","كاش":"cash","فيزا":"visa","بطاقة":"card","ائتمان":"credit",
  // === Countries & Cities ===
  "مصر":"egypt","القاهرة":"cairo","اسكندرية":"alexandria",
  "سعودية":"saudi","السعودية":"saudi","رياض":"riyadh","جدة":"jeddah","مكة":"makkah","المدينة":"madinah",
  "كويت":"kuwait","امارات":"uae","دبي":"dubai","ابوظبي":"abu dhabi","الشارقة":"sharjah",
  "قطر":"qatar","البحرين":"bahrain","عمان":"oman",
  // === Brands (expanded) ===
  "ايفون":"iphone","سامسونج":"samsung","سامسونغ":"samsung","جالاكسي":"galaxy","نوت":"note",
  "نوكيا":"nokia","هواوي":"huawei","شاومي":"xiaomi","ابل":"apple","أبل":"apple",
  "اوبو":"oppo","فيفو":"vivo","ون بلس":"oneplus",
  "لينوفو":"lenovo","ديل":"dell","اتش بي":"hp","اسوس":"asus","اسس":"asus",
  "سوني":"sony","انكر":"anker","جوي":"joy",
  "اديداس":"adidas","نايك":"nike","نايك":"nike","بوما":"puma","ريبوك":"reebok",
  "زاكموس":"zackmoss","بوما":"puma","كونفرس":"converse","فان":"vans",
  "زارا":"zara","اتش اند ام":"hm","مانجو":"mango",
  "لوريال":"loreal","غارنييه":"garnier","نيفيا":"nivea","جونسون":"johnson","جونسون":"johnsons",
  "اولاي":"olay","بانثينول":"panthenol","هيد":"head"," اند":"and","شولدرز":"shoulders",
  "براون":"braun","فيليبس":"philips","باناسونيك":"panasonic",
  "توشيبا":"toshiba","شارب":"sharp","ال جي":"lg","ال جي":"lg",
  "بي تك":"btc","راية":"raya","سامح":"sameh",
  "قطعة":"piece","حبة":"unit","حبه":"unit","زوج":"pair",
  "رجالي":"men","رجال":"men","نسائي":"women","نساء":"women","ولادي":"boys","بناتي":"girls",
  "محمول":"mobile","لاسلكي":"wireless","بلوتوث":"bluetooth",
  "صحة":"health","عناية":"care",
  "إلكترونيات":"electronics","الكترونيات":"electronics",
  "منزل":"home","حديقة":"garden",
};

// Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
  var alen = a.length, blen = b.length;
  if (alen === 0) return blen;
  if (blen === 0) return alen;
  var prev = new Array(blen + 1), curr = new Array(blen + 1);
  for (var i = 0; i <= blen; i++) prev[i] = i;
  for (var i = 0; i < alen; i++) {
    curr[0] = i + 1;
    for (var j = 0; j < blen; j++) {
      var cost = a[i] === b[j] ? 0 : 1;
      curr[j + 1] = Math.min(curr[j] + 1, prev[j + 1] + 1, prev[j] + cost);
    }
    var tmp = prev; prev = curr; curr = tmp;
  }
  return prev[blen];
}

// Dictionary fuzzy match cache
var _fuzzyCache = {};

function fuzzyDictLookup(word, maxDist) {
  maxDist = maxDist || 2;
  if (word.length <= 3) maxDist = 1;
  if (word.length <= 2) maxDist = 0;
  var cacheKey = word + "|" + maxDist;
  if (_fuzzyCache[cacheKey]) return _fuzzyCache[cacheKey];
  var bestMatch = null, bestDist = Infinity;
  for (var arWord in AR2EN_DICT) {
    var dist = levenshtein(word, arWord);
    if (dist < bestDist) { bestDist = dist; bestMatch = arWord; }
  }
  // Also search English values
  for (var ar2 in AR2EN_DICT) {
    var enVal = AR2EN_DICT[ar2];
    if (typeof enVal === "string") {
      var dist = levenshtein(word, enVal);
      if (dist < bestDist) { bestDist = dist; bestMatch = enVal; }
    }
  }
  if (bestDist <= maxDist && bestMatch) {
    _fuzzyCache[cacheKey] = bestMatch;
    return bestMatch;
  }
  _fuzzyCache[cacheKey] = null;
  return null;
}

// Multi-word phrase translations (e.g. "سماعة بلوتوث" → "bluetooth headphone")
var AR2EN_PHRASES = {
  "سماعة بلوتوث":"bluetooth headphone","سماعه بلوتوث":"bluetooth headphone","سماعات بلوتوث":"bluetooth headphone",
  "سماعة لاسلكية":"wireless headphone","سماعه لاسلكيه":"wireless headphone","سماعات لاسلكية":"wireless headphone",
  "سماعة رأس":"headphone","سماعه رأس":"headphone","سماعات رأس":"headphone",
  "ساعة ذكية":"smartwatch","ساعه ذكيه":"smartwatch","ساعات ذكية":"smartwatches",
  "شاحن سريع":"fast charger","شاحن لاسلكي":"wireless charger",
  "جراب موبايل":"phone case","جراب جوال":"phone case","كفر موبايل":"phone case",
  "حماية شاشة":"screen protector","حمايه شاشه":"screen protector",
  "باور بانك":"powerbank","باور بنك":"powerbank","باوربانك":"powerbank",
  "سماعة ايفون":"iphone headphone","سماعه ايفون":"iphone headphone",
  "شاحن ايفون":"iphone charger",
  "سماعة ايربودز":"airpods","سماعه ايربودز":"airpods",
  "غسول وجه":"face wash","غسول بشرة":"face wash","غسول وجه":"face cleanser",
  "كريم مرطب":"moisturizer cream","كريم ترطيب":"moisturizer",
  "كريم بشرة":"face cream","كريم وجه":"face cream",
  "زيت شعر":"hair oil","زيت للشعر":"hair oil",
  "شامبو شعر":"hair shampoo",
  "ماكينة حلاقة":"shaver","ماكينه حلاقه":"shaver",
  "ورق عنب":"grape leaves","ورق":"leaves","عنب":"grape",
  "زيت زيتون":"olive oil",
  "خل بلسمي":"balsamic vinegar",
  "صوص طماطم":"tomato sauce","صلصة":"sauce","طماطم":"tomato",
  "جبنة رومي":"cheese","جبنه رومى":"cheese",
  "جبنة موزاريلا":"mozzarella cheese",
  "جبنة شيدر":"cheddar cheese",
  "عصير برتقال":"orange juice",
  "عصير مانجو":"mango juice",
  "ال جي":"lg","ال جي":"lg",
  "ون بلس":"oneplus","ون":"one","بلس":"plus",
  "اتش بي":"hp","اتش":"h","بي":"p",
  "بي تك":"btc",
};

function generateBilingualKeys(text) {
  const keys = new Set();
  const s = String(text || '').toLowerCase().trim();
  if (!s) return keys;
  keys.add(s);
  const norm = normalizeArabicText(s);
  keys.add(norm);
  if (hasArabic(s)) {
    keys.add(latinizeArabic(norm));
    keys.add(latinizeArabic(s));
  }
  if (hasLatin(s)) {
    keys.add(arabizeLatin(s));
    keys.add(arabizeLatin(norm));
  }
  // Add phrase translations (multi-word)
  for (var phrase in AR2EN_PHRASES) {
    var pval = AR2EN_PHRASES[phrase];
    if (typeof pval === "string" && s.includes(phrase)) {
      keys.add(pval);
      keys.add(pval.toLowerCase());
      var pwords = pval.split(/\s+/);
      for (var pwi = 0; pwi < pwords.length; pwi++) {
        if (pwords[pwi].length > 1) keys.add(pwords[pwi]);
      }
    }
  }
  // Add dictionary translations for each word
  var words = s.split(/\s+/);
  for (var wi = 0; wi < words.length; wi++) {
    var w = words[wi];
    if (!w || w.length < 1) continue;
    if (hasArabic(w)) {
      var en = AR2EN_DICT[w];
      // Try stripping "ال" prefix for Arabic words
      if (typeof en !== "string" && w.length > 3 && w.indexOf("ال") === 0) {
        en = AR2EN_DICT[w.substring(2)];
      }
      if (typeof en === "string") { keys.add(en); keys.add(en.toLowerCase()); }
      // Fuzzy fallback for Arabic words not in dictionary
      if (typeof en !== "string" && w.length > 2) {
        var fuzzy = fuzzyDictLookup(w, 1);
        if (fuzzy) { keys.add(fuzzy); keys.add(fuzzy.toLowerCase()); }
      }
    } else if (hasLatin(w)) {
      var arVersion = _EN2AR_LOOKUP[w];
      if (arVersion) { keys.add(arVersion); keys.add(normalizeArabicText(arVersion)); }
      // Fuzzy fallback for English words
      if (!arVersion && w.length > 2) {
        var fuzzy2 = fuzzyDictLookup(w, 2);
        if (fuzzy2) { keys.add(fuzzy2); keys.add(fuzzy2.toLowerCase()); }
      }
    }
  }
  return keys;
}

// Pre-build reverse lookup for English→Arabic dictionary
var _EN2AR_LOOKUP = {};
(function buildReverseLookup() {
  for (var ar in AR2EN_DICT) {
    var en = AR2EN_DICT[ar];
    if (typeof en === "string") { _EN2AR_LOOKUP[en.toLowerCase()] = ar; }
  }
})();

// Precompute bilingual search keys for all products
let _productSearchKeys = new Map();
var _bilingualKeysCache = {};

function buildProductSearchKeys(products) {
  _productSearchKeys.clear();
  _bilingualKeysCache = {};
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const id = String(p.id);
    const fields = [p.name, p.title, p.category, p.brand, p.type, p.description];
    if (Array.isArray(p.tags)) fields.push(...p.tags);
    if (Array.isArray(p.categories)) fields.push(...p.categories);
    const combined = fields.filter(Boolean).join(' ');
    var cached = _bilingualKeysCache[combined];
    if (!cached) {
      cached = generateBilingualKeys(combined);
      _bilingualKeysCache[combined] = cached;
    }
    _productSearchKeys.set(id, cached);
  }
}

function renderSearchHistory() {
  const historyEl = document.getElementById("search-history");
  const inputEl = document.getElementById("search-input");
  if (!historyEl || !inputEl) return;

  const history = getSearchHistory();
  if (!history.length) {
    historyEl.innerHTML = "";
    return;
  }

  historyEl.innerHTML = history
    .map(
      (term) => `
        <li class="search-row">
          <button type="button" class="search-item-btn" data-term="${escapeHtml(term)}">
            <span class="material-icons-outlined">history</span>
            <span>${escapeHtml(term)}</span>
          </button>
        </li>
      `
    )
    .join("");

  historyEl.querySelectorAll("[data-term]").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const term = item.getAttribute("data-term") || "";
      inputEl.value = term;
      _suppressSuggestions = true;
      var sug = document.getElementById("suggestions");
      if (sug) { sug.innerHTML = ""; sug.classList.add("hidden"); }
      setHistoryVisibility(false);
      performSearch(term).finally(function(){ _suppressSuggestions = false; });
    });
  });
}

const CATEGORY_SYNONYMS = {
  "ساعات": ["ساعه", "ساعات", "watch", "watches", "ساعا", "كاسيو", "casio", "ساعة"],
  "موبايلات وملحقاتها": ["موبايل", "موبيل", "جوال", "تليفون", "هاتف", "فون", "phone", "phones", "جراب", "شاحن", "سماعه", "سماعات", "ايربودز", "airpods", "وصله", "سلك", "راس شاحن", "باوربانك", "باور بانك"],
  "إلكترونيات": ["الكترونيات", "كمبيوتر", "لاب", "لابتوب", "شاشه", "شاشات", "كيبورد", "ماوس", "تلفزيون", "راديو", "كشاف", "وصلة", "سلك", "مشترك"],
  "ملابس وأحذية": ["ملابس", "هدوم", "قميص", "بنطلون", "تيشرت", "تي شيرت", "فستان", "جاكيت", "حذاء", "كوتشي", "شورت", "شراب", "جزمة", "جزمه", "ترينج", "بلوزه", "طرحه"],
  "منتجات تجميل وعناية": ["تجميل", "عنايه", "كريم", "مكياج", "بشره", "شعر", "صابون", "شامبو", "مرطب", "روج", "مسك", "سيروم", "زيت", "غسول", "معجون"],
  "عطور": ["عطر", "عطور", "برفان", "ريحه", "perfume", "عود", "بخور", "برفيوم", "معطر"],
  "منتجات رياضية": ["رياضه", "جيم", "تمارين", "تمرين", "كوره", "ملعب", "دمبل", "اوزان", "مقاومه", "عقله", "حبل"],
  "منزل ومطبخ": ["مطبخ", "منزل", "بيت", "ديكور", "وساده", "مخده", "كوب", "طبق", "معلقه", "سكينه", "خلاط", "ميكرويف", "مج", "مفرش", "سجاده", "اضاءه", "لمبه"],
  "ألعاب": ["العاب", "لعبه", "العاب اطفال", "بلاستيشن", "ليجو", "عروسه", "بازل", "كوتشينه", "مسدس"],
  "حيوانات أليفة": ["قطط", "كلاب", "حيوان", "طعام قطط", "كلب", "قطه", "دراي فود"],
  "مكتب ودراسة": ["مكتب", "دراسه", "قلم", "دفتر", "كشكول", "شنطه مدرسه", "مبراة", "مسطره"],
  "سيارات": ["سيارات", "سياره", "عربيه", "عربيات", "فواحه سياره", "منظف عربيه", "شاحن سياره"]
};

function getShortTitle(fullName) {
  if (!fullName) return "";
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  // Return first 3 words
  return words.slice(0, 3).join(" ");
}

let _extractedKeywords = new Set();

function extractKeywordsFromProducts() {
  _extractedKeywords.clear();

  const categoriesList = [
    "ساعات", "موبايلات وملحقاتها", "إلكترونيات", "ملابس وأحذية", 
    "منتجات تجميل وعناية", "عطور", "منتجات رياضية", "منزل ومطبخ", 
    "ألعاب", "حيوانات أليفة", "مكتب ودراسة", "كتب ومجلات", "سيارات", "مجوهرات وإكسسوارات"
  ];
  categoriesList.forEach(c => _extractedKeywords.add(c));

  if (!_allSearchProducts || !_allSearchProducts.length) return;

  for (let i = 0; i < _allSearchProducts.length; i++) {
    const p = _allSearchProducts[i];
    if (p.brand) {
      _extractedKeywords.add(p.brand.trim());
    }
    if (p.category) {
      _extractedKeywords.add(p.category.trim());
    }

    const name = (p.name || p.title || "").trim();
    if (!name) continue;

    const words = name.split(/\s+/).filter(w => w.length > 1);

    // Add each individual word
    words.forEach(w => _extractedKeywords.add(w));

    // Add all word pairs (bigrams)
    for (let wi = 0; wi < words.length - 1; wi++) {
      _extractedKeywords.add(words[wi] + " " + words[wi + 1]);
    }

    // Add first 3 words
    if (words.length >= 3) {
      _extractedKeywords.add(words.slice(0, 3).join(" "));
      _extractedKeywords.add(words.slice(0, 4).join(" "));
    }

    // Add brand + category combo
    if (p.brand && p.category) {
      _extractedKeywords.add(`${p.brand} ${p.category}`);
    }

    // Add bilingual versions
    const bilingual = generateBilingualKeys(name);
    bilingual.forEach(k => { if (k.length > 1) _extractedKeywords.add(k); });
  }
}

// Pre-normalized keyword index for fast suggestions
let _keywordIndex = [];

function rebuildKeywordIndex() {
  _keywordIndex = Array.from(_extractedKeywords)
    .filter(k => k && k.length > 1)
    .map(k => ({ raw: k, norm: normalizeArabicText(k) }))
    .sort((a, b) => a.raw.localeCompare(b.raw, "ar"));
}

async function fetchSuggestions(term) {
  if (!term) return [];
  const suggestions = new Set();
  const normTerm = normalizeArabicText(term);
  const termKeys = generateBilingualKeys(term);

  // 1. Category / synonym matches
  for (const [catName, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    const normCat = normalizeArabicText(catName);
    if (normCat.includes(normTerm) || normTerm.includes(normCat)) suggestions.add(catName);
    for (const syn of synonyms) {
      const normSyn = normalizeArabicText(syn);
      if (normSyn.includes(normTerm) || normTerm.includes(normSyn)) suggestions.add(syn);
    }
  }

  // 2. Match on keyword index (broad substring matching)
  if (_keywordIndex.length) {
    for (const { raw, norm } of _keywordIndex) {
      if (suggestions.size >= 10) break;
      if (norm.includes(normTerm) || normTerm.includes(norm)) {
        suggestions.add(raw);
      }
    }
  }

  // 3. Bilingual key matching (for transliterated/English terms)
  if (suggestions.size < 6 && _keywordIndex.length) {
    for (const { raw, norm } of _keywordIndex) {
      if (suggestions.size >= 10) break;
      for (const k of termKeys) {
        if (norm.includes(k) || k.includes(norm)) {
          suggestions.add(raw);
          break;
        }
      }
    }
  }

  // 4. Product name matching (direct from loaded products)
  if (suggestions.size < 8 && _allSearchProducts.length) {
    const seen = new Set();
    for (const p of _allSearchProducts) {
      if (suggestions.size >= 12) break;
      const name = (p.name || p.title || "").trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const normName = normalizeArabicText(name);
      if (normName.includes(normTerm)) suggestions.add(name);
    }
  }

  return Array.from(suggestions).slice(0, 10);
}

// Flag to suppress suggestions after Enter/search is triggered
let _suppressSuggestions = false;

async function renderSuggestions(term) {
  const suggestionsEl = document.getElementById("suggestions");
  const inputEl = document.getElementById("search-input");
  if (!suggestionsEl || !inputEl) return;

  if (!term) {
    suggestionsEl.innerHTML = "";
    suggestionsEl.classList.add("hidden");
    return;
  }

  const suggestions = await fetchSuggestions(term);

  // If Enter was pressed while we were fetching, don't show the dropdown
  if (_suppressSuggestions) return;

  if (!suggestions.length) {
    suggestionsEl.innerHTML = "";
    suggestionsEl.classList.add("hidden");
    return;
  }

  suggestionsEl.innerHTML = suggestions
    .map(
      (name) => `
        <li class="search-row">
          <button type="button" class="search-item-btn" data-value="${escapeHtml(name)}">
            <span class="material-icons-outlined">search</span>
            <span>${escapeHtml(name)}</span>
          </button>
        </li>
      `
    )
    .join("");

  suggestionsEl.classList.add("noon-suggestions");
  suggestionsEl.classList.remove("hidden");

  suggestionsEl.querySelectorAll("[data-value]").forEach(function(item) {
    item.addEventListener("click", function() {
      var val = item.getAttribute("data-value") || "";
      inputEl.value = val;
      suggestionsEl.classList.add("hidden");
      _suppressSuggestions = true;
      performSearch(val).finally(function(){ _suppressSuggestions = false; });
    });
  });
}

// Variables for search results, filters and pagination
let _allSearchProducts = [];
let _keysBuilt = false;
let _currentSearchResults = [];
let _filteredSearchResults = [];
let _currentPage = 1;
const _PRODUCTS_PER_PAGE = 24;
let _currentCategoryFilter = "الكل";

// Normalizes Arabic text to handle variations in letters
function normalizeArabicText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[أإآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ًٌٍَُِّْ]/g, "") // remove diacritics
    .replace(/\s+/g, " ")       // normalize spaces
    .trim();
}

// Preload all products (local store + Supabase/Taager)
async function loadAllSearchProducts() {
  try {
    // 1. Start with local store products as fast offline fallback
    if (window.BudaStore && typeof window.BudaStore.getAllProducts === "function") {
      _allSearchProducts = Object.values(window.BudaStore.getAllProducts()).filter(Boolean);
    }
    
    // 2. Fetch from Supabase + Taager if online (only if it gives us MORE products than local store)
    const selectedCountry = window.TaagerIntegration ? window.TaagerIntegration.getSelectedCountry() : null;
    const countryCode = selectedCountry ? selectedCountry.code : null;

    if (window.supabaseClient && typeof window.supabaseClient.fetchAllProductsWithTaager === "function") {
      const remote = await window.supabaseClient.fetchAllProductsWithTaager(countryCode);
      if (remote && remote.length > _allSearchProducts.length) {
        _allSearchProducts = remote.map(p => 
          window.BudaStore && typeof window.BudaStore.normalizeProductRecord === "function"
            ? window.BudaStore.normalizeProductRecord(p)
            : p
        ).filter(Boolean);
      }
    } else if (window.fetchSupabaseProducts) {
      const remote = await window.fetchSupabaseProducts("");
      if (remote && remote.length > _allSearchProducts.length) {
        _allSearchProducts = remote.map(p => 
          window.BudaStore && typeof window.BudaStore.normalizeProductRecord === "function"
            ? window.BudaStore.normalizeProductRecord(p)
            : p
        ).filter(Boolean);
      }
    }

    // Build search keys synchronously so search works immediately
    buildProductSearchKeys(_allSearchProducts);
    // Defer suggestion index building (not needed for search results)
    setTimeout(() => {
      extractKeywordsFromProducts();
      rebuildKeywordIndex();
      _keysBuilt = true;
    }, 0);

  } catch (error) {
    console.warn("Error loading products for search index:", error);
  }
}

// Local robust search matching logic with bilingual support
function searchProductsLocal(query) {
  const normQuery = normalizeArabicText(query);
  if (!normQuery) return [];

  const words = normQuery.split(" ").filter(Boolean);
  const queryBilingualKeys = generateBilingualKeys(query);
  const allQueryKeys = new Set();
  queryBilingualKeys.forEach(k => {
    allQueryKeys.add(k);
    if (k.length > 2) {
      for (let i = 1; i < k.length; i++) allQueryKeys.add(k.slice(0, i + 1));
    }
  });

  // Find if query matches any category synonyms
  const matchedCategories = [];
  for (const [catName, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    const matchesSynonym = synonyms.some(syn => {
      const normSyn = normalizeArabicText(syn);
      return words.some(word => normSyn.includes(word) || word.includes(normSyn));
    });
    if (matchesSynonym) {
      matchedCategories.push(catName);
    }
  }

  // Check if any products match the current country to avoid empty results
  var currentCountry = (window.TaagerIntegration?.getSelectedCountry?.() || {}).code || "EG";
  var countryCode = currentCountry.toUpperCase();
  var hasCountryMatch = _allSearchProducts.some(function (p) {
    var pc = (p?.country || p?.country_code || "").toUpperCase();
    return pc === countryCode;
  });

  return _allSearchProducts.filter(product => {
    // Filter by country first (skip if no products match this country at all)
    var pCountry = (product?.country || product?.country_code || "").toUpperCase();
    if (hasCountryMatch && pCountry && pCountry !== countryCode) return false;

    // 1. Check if product category matches the matched categories from query synonyms
    if (product.category) {
      const prodCatNorm = normalizeArabicText(product.category);
      const matchesCategorySynonym = matchedCategories.some(cat => 
        prodCatNorm.includes(normalizeArabicText(cat))
      );
      if (matchesCategorySynonym) return true;
    }

    // 2. Standard word matching in product text (fast pre-filter)
    const fields = [
      product.name, product.title, product.description,
      product.category, product.brand, product.type
    ];
    if (Array.isArray(product.tags)) fields.push(...product.tags);
    if (Array.isArray(product.categories)) fields.push(...product.categories);

    const productText = normalizeArabicText(fields.filter(Boolean).join(" "));

    if (words.some(word => productText.includes(word))) return true;

    // 3. Bilingual key matching (slower, only for cross-language matches)
    const pid = String(product.id);
    const searchKeys = _productSearchKeys.get(pid);
    if (searchKeys && searchKeys.size) {
      for (const qKey of allQueryKeys) {
        for (const pKey of searchKeys) {
          if (pKey.includes(qKey) || qKey.includes(pKey)) return true;
        }
      }
    }

    return false;
  });
}

// Render dynamic category filter chips based on matching products
function renderCategoryFilters() {
  const filterContainer = document.getElementById("search-filter-container");
  if (!filterContainer) return;

  if (!_currentSearchResults || !_currentSearchResults.length) {
    filterContainer.classList.add("hidden");
    return;
  }

  var catMap = {};
  _currentSearchResults.forEach(function(p) {
    var cat = (p.category || "أخرى").trim();
    if (!catMap[cat]) catMap[cat] = 0;
    catMap[cat]++;
  });

  var cats = Object.keys(catMap).sort();
  if (cats.length <= 1) {
    filterContainer.classList.add("hidden");
    return;
  }

  var html = '<button type="button" class="noon-filter-chip' + (_currentCategoryFilter === "الكل" ? " active" : "") + '" data-category="الكل">الكل</button>';
  cats.forEach(function(c) {
    html += '<button type="button" class="noon-filter-chip' + (_currentCategoryFilter === c ? " active" : "") + '" data-category="' + escapeHtml(c) + '">' + escapeHtml(c) + ' (' + catMap[c] + ')</button>';
  });
  filterContainer.innerHTML = html;
  filterContainer.classList.remove("hidden");

  filterContainer.querySelectorAll(".noon-filter-chip").forEach(function(btn) {
    btn.addEventListener("click", function() {
      _currentCategoryFilter = btn.getAttribute("data-category");
      _currentPage = 1;
      applyCategoryFilterAndRender();
    });
  });
}

// Filter results by selected category
function applyCategoryFilterAndRender() {
  if (_currentCategoryFilter === "الكل") {
    _filteredSearchResults = _currentSearchResults;
  } else {
    _filteredSearchResults = _currentSearchResults.filter(p => {
      const cat = p.category ? String(p.category).trim() : "أخرى";
      return cat === _currentCategoryFilter;
    });
  }

  renderResultsPage();
}

// Build a bilingual category group lookup from CATEGORY_SYNONYMS.
// Returns: a Map where the key is normalizedArabicText(category/synonym)
//          and the value is a Set of all normalized synonym forms (including English).
function buildCategoryGroupMap() {
  const map = new Map();
  for (const [catName, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    const allForms = new Set([catName, ...synonyms].map(s => normalizeArabicText(s)));
    // Every form of this group points to the same Set
    allForms.forEach(form => map.set(form, allForms));
  }
  return map;
}
const _CATEGORY_GROUP_MAP = buildCategoryGroupMap();

// Given any category string, return the Set of all equivalent category forms (bilingual).
function getCategoryGroup(categoryStr) {
  const norm = normalizeArabicText(categoryStr || "");
  // Exact match
  if (_CATEGORY_GROUP_MAP.has(norm)) return _CATEGORY_GROUP_MAP.get(norm);
  // Partial match: find the group whose forms partially contain this norm
  for (const [form, group] of _CATEGORY_GROUP_MAP.entries()) {
    if (norm.includes(form) || form.includes(norm)) return group;
  }
  // No synonym group found — return single-element set (just itself)
  return new Set([norm]);
}

// Returns true if two category strings belong to the same bilingual group
function categoriesMatch(catA, catB) {
  if (!catA || !catB) return false;
  const normA = normalizeArabicText(catA);
  const normB = normalizeArabicText(catB);
  if (normA === normB) return true;
  const groupA = getCategoryGroup(catA);
  return groupA.has(normB);
}

// Get products similar or related to search results (Advanced Bilingual Similarity Scorer)
function getSimilarProducts(exactMatches, query) {
  const exactIds = new Set(exactMatches.map(p => String(p.id)));
  const similar = [];

  // 1. Analyze exact matches to extract bilingual category groups, brands, and title word patterns
  const matchedCategoryGroups = new Set(); // normalized forms of matched categories (all synonyms)
  const brands = new Set();
  const titleWordsCount = {};

  exactMatches.forEach(p => {
    if (p.brand) brands.add(normalizeArabicText(p.brand));

    // Expand category into its full bilingual group
    if (p.category) {
      const group = getCategoryGroup(p.category);
      group.forEach(form => matchedCategoryGroups.add(form));
    }

    // Extract title words for text similarity scoring
    const name = p.name || p.title || "";
    const words = normalizeArabicText(name).split(/\s+/).filter(w => w.length > 2);
    const fillers = new Set(["على", "من", "في", "مع", "الذي", "التي", "هذا", "هذه", "عن", "بين", "تحت", "فوق", "لكن", "او", "for", "and", "the", "with", "of"]);
    words.forEach(w => {
      if (!fillers.has(w)) {
        titleWordsCount[w] = (titleWordsCount[w] || 0) + 1;
      }
    });
  });

  // Get most common title words (top 15 words)
  const commonTitleWords = Object.keys(titleWordsCount)
    .sort((a, b) => titleWordsCount[b] - titleWordsCount[a])
    .slice(0, 15);

  // 2. Score all other products in the store based on bilingual patterns
  _allSearchProducts.forEach(p => {
    const id = String(p.id);
    if (exactIds.has(id)) return;

    let score = 0;

    // A. Bilingual category match score
    if (p.category) {
      const normPCat = normalizeArabicText(p.category);
      if (matchedCategoryGroups.has(normPCat)) {
        score += 15;
      } else {
        for (const groupForm of matchedCategoryGroups) {
          if (normPCat.includes(groupForm) || groupForm.includes(normPCat)) {
            score += 12;
            break;
          }
        }
      }
    }

    // B. Brand match score
    if (p.brand && brands.has(normalizeArabicText(p.brand))) {
      score += 8;
    }

    // C. Title keyword matching score
    const pFullText = normalizeArabicText([p.name, p.title, p.description, p.brand, p.category].filter(Boolean).join(" "));
    commonTitleWords.forEach(word => {
      if (pFullText.includes(word)) {
        score += 4 * (titleWordsCount[word] || 1);
      }
    });

    if (score > 0) {
      similar.push({ product: p, score: score });
    }
  });

  // 3. If we have 0 exact matches, perform bilingual loose keyword matching on query
  if (exactMatches.length === 0) {
    const normQuery = normalizeArabicText(query);
    if (normQuery) {
      const words = normQuery.split(" ").filter(w => w.length > 2);
      const queryGroups = new Set();
      for (const [catName, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
        const allForms = [catName, ...synonyms].map(s => normalizeArabicText(s));
        if (allForms.some(f => words.some(w => f.includes(w) || w.includes(f)))) {
          allForms.forEach(f => queryGroups.add(f));
        }
      }

      if (words.length > 0) {
        _allSearchProducts.forEach(p => {
          const id = String(p.id);
          const pCatNorm = normalizeArabicText(p.category || "");
          const pFullText = normalizeArabicText([p.name, p.title, p.description, p.category, p.brand].filter(Boolean).join(" "));

          let score = 0;

          if (queryGroups.size > 0 && (queryGroups.has(pCatNorm) || [...queryGroups].some(g => pCatNorm.includes(g) || g.includes(pCatNorm)))) {
            score += 18;
          }

          words.forEach(word => {
            if (pFullText.includes(word)) score += 10;
          });

          if (score > 0) {
            similar.push({ product: p, score: score });
          }
        });
      }
    }
  }

  // 4. Fillers: if we have fewer than 37 products, grab popular/random ones that aren't already included
  if (similar.length < 37 && _allSearchProducts.length > 0) {
    const seen = new Set([...exactIds, ...similar.map(s => String(s.product.id))]);
    const candidates = _allSearchProducts.filter(p => !seen.has(String(p.id)));
    const shuffled = candidates.sort(() => 0.5 - Math.random()).slice(0, 40 - similar.length);
    shuffled.forEach(p => {
      similar.push({ product: p, score: 0 });
    });
  }

  // Sort by score descending and return the product objects (max 37)
  return similar
    .sort((a, b) => b.score - a.score)
    .map(s => s.product)
    .slice(0, 37);
}

// Render paginated search results
function getSearchSuggestions(query) {
  var suggestions = [];
  var norm = normalizeArabicText(query);
  if (!norm) return suggestions;
  var words = norm.split(" ").filter(Boolean);
  // 1. Match against CATEGORY_SYNONYMS
  for (var _i = 0; _i < words.length; _i++) {
    var word = words[_i];
    if (word.length < 2) continue;
    for (var cat in CATEGORY_SYNONYMS) {
      var allForms = [cat].concat(CATEGORY_SYNONYMS[cat]);
      for (var _j = 0; _j < allForms.length; _j++) {
        var form = allForms[_j];
        var normForm = normalizeArabicText(form);
        if (normForm.includes(word) || word.includes(normForm)) {
          suggestions.push(form);
        }
      }
    }
  }
  // 2. Match against AR2EN_DICT (both Arabic keys and English values)
  for (var _l = 0; _l < words.length; _l++) {
    var w2 = words[_l];
    if (w2.length < 2) continue;
    for (var arWord in AR2EN_DICT) {
      var enVal = AR2EN_DICT[arWord];
      var normAr = normalizeArabicText(arWord);
      if (normAr.includes(w2) || w2.includes(normAr)) suggestions.push(arWord);
      if (typeof enVal === "string" && (enVal.includes(w2) || w2.includes(enVal))) suggestions.push(enVal);
    }
  }
  // 3. Add fuzzy correction if no suggestions and query has no results
  if (suggestions.length < 2 && window._isFuzzySearch) {
    for (var _m = 0; _m < words.length; _m++) {
      var w3 = words[_m];
      if (w3.length < 2) continue;
      var fuzzy = fuzzyDictLookup(w3, 2);
      if (fuzzy) suggestions.push(fuzzy);
    }
  }
  var unique = []; var seen = {};
  for (var _k = 0; _k < suggestions.length; _k++) {
    if (!seen[suggestions[_k]]) { seen[suggestions[_k]] = true; unique.push(suggestions[_k]); }
  }
  return unique.slice(0, 8);
}

const _SORT_OPTIONS = [
  { key: "relevance", label: "الأكثر صلة" },
  { key: "price_asc", label: "السعر: من الأقل" },
  { key: "price_desc", label: "السعر: من الأعلى" },
  { key: "rating", label: "التقييم" },
  { key: "newest", label: "الأحدث" },
  { key: "discount", label: "الخصم" },
];
let _currentSort = "relevance";

function getImagesList(product) {
  if (Array.isArray(product.images)) return product.images.filter(Boolean);
  const imgs = [];
  for (let i = 1; i <= 8; i++) {
    const key = "image" + i;
    if (product[key]) imgs.push(product[key]);
  }
  for (let i = 1; i <= 8; i++) {
    const key = "img" + i;
    if (product[key] && !imgs.includes(product[key])) imgs.push(product[key]);
  }
  for (let i = 1; i <= 8; i++) {
    const key = "image_link" + i;
    if (product[key] && !imgs.includes(product[key])) imgs.push(product[key]);
  }
  if (product.image && !imgs.includes(product.image)) imgs.push(product.image);
  return imgs.length ? imgs : [];
}

function renderStars(rating) {
  if (!rating || rating <= 0) return "";
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  let s = "";
  for (let i = 0; i < 5; i++) {
    if (i < full) s += "★";
    else if (i === full && half) s += "★";
    else s += "☆";
  }
  return s;
}

function buildNoonProductCard(product) {
  const id = String(product.id);
  const name = product.name || product.title || "منتج";
  const images = getImagesList(product);
  const hasMultipleImages = images.length > 1;
  const rp = resolvePrice(product);
  const rr = resolveRating(product);
  const isWish = isWishlistedProduct(id);
  const fb = "assets/images/unnamed.png";
  const hasDiscount = rp.hasDiscount && rp.discountPercent > 0;

  let imgsHtml = "";
  if (images.length) {
    for (let gi = 0; gi < images.length; gi++) {
      imgsHtml += `<img class="noon-gallery-img${gi === 0 ? " active" : ""}" src="${escapeHtml(images[gi])}" alt="${escapeHtml(name)}" loading="lazy" onerror="this.onerror=null;this.closest('.noon-product-media-wrap')&&(this.src='${fb}')" />`;
    }
  } else {
    imgsHtml = `<img class="noon-gallery-img active" src="${fb}" alt="${escapeHtml(name)}" />`;
  }

  let dotsHtml = "";
  if (hasMultipleImages && images.length <= 8) {
    for (let di = 0; di < images.length; di++) {
      dotsHtml += `<span${di === 0 ? ' class="active"' : ''}></span>`;
    }
  }

  let counterHtml = "";
  if (hasMultipleImages) {
    counterHtml = `<span class="noon-img-counter"><span class="noon-img-current">1</span>/<span class="noon-img-total">${images.length}</span></span>`;
  }

  let arrowsHtml = "";
  if (hasMultipleImages) {
    arrowsHtml = `<button class="noon-gallery-arrow noon-gallery-arrow-prev" type="button" aria-label="السابق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg></button><button class="noon-gallery-arrow noon-gallery-arrow-next" type="button" aria-label="التالي"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>`;
  }

  let badges = "";
  if (hasDiscount) {
    badges += `<span class="noon-badge-discount">-${rp.discountPercent}%</span>`;
  }
  if (product.isOfficial) {
    badges += `<span class="noon-badge-official">رسمي</span>`;
  }
  if (product.isTopProduct) {
    badges += `<span class="noon-badge-top">الأفضل</span>`;
  }

  let starsHtml = "";
  let ratingHtml = "";
  if (rr.reviews > 0) {
    starsHtml = `<span class="noon-stars">${renderStars(rr.rating)}</span>`;
    ratingHtml = `<span class="noon-rating-value">${rr.rating.toFixed(1)}</span><span class="noon-rating-count">(${rr.reviews})</span>`;
  } else {
    ratingHtml = `<span class="noon-no-rating">لا توجد تقييمات</span>`;
  }

  let shippingHtml = "";
  if (product.freeShipping || product.shipping === "free") {
    shippingHtml = `<div class="noon-shipping"><span>🚚</span> شحن مجاني</div>`;
  } else if (product.shipping === "tomorrow") {
    shippingHtml = `<div class="noon-shipping"><span>🚚</span> يصل غدًا</div>`;
  } else if (product.shipping) {
    shippingHtml = `<div class="noon-shipping"><span>🚚</span> ${escapeHtml(product.shipping)}</div>`;
  }

  let stockHtml = "";
  const qty = Number(product.quantity) || Number(product.stock) || 0;
  if (qty <= 0) {
    stockHtml = `<div class="noon-stock out">نفدت الكمية</div>`;
  } else if (qty <= 3) {
    stockHtml = `<div class="noon-stock">تبقى ${qty} فقط</div>`;
  }

  const isOutOfStock = qty <= 0;
  const addBtnClass = "noon-add-square" + (isOutOfStock ? " disabled" : "");

  return `<article class="noon-product-card" data-product-id="${escapeHtml(id)}">
    <div class="noon-product-media-wrap">
      <div class="noon-gallery-imgs">${imgsHtml}</div>
      ${dotsHtml ? `<div class="noon-img-dots">${dotsHtml}</div>` : ""}
      ${counterHtml}
      ${arrowsHtml}
      ${badges}
      <button class="icon-btn noon-wishlist-btn ${isWish ? "is-active" : ""}" data-wishlist="${escapeHtml(id)}" aria-label="إضافة إلى المفضلة" aria-pressed="${isWish ? "true" : "false"}">
        <span class="material-icons-outlined">${isWish ? "favorite" : "favorite_border"}</span>
      </button>
    </div>
    <div class="noon-product-body">
      <div class="noon-title" title="${escapeHtml(name)}">${escapeHtml(name)}</div>
      <div class="noon-rating-row">${starsHtml} ${ratingHtml}</div>
      <div class="noon-price-line">
        <span class="noon-price">${formatMoney(rp.finalPrice)}</span>
        ${hasDiscount ? `<span class="noon-old-price">${formatMoney(rp.originalPrice)}</span>` : ""}
        ${hasDiscount ? `<span class="noon-discount-pill">-${rp.discountPercent}%</span>` : ""}
      </div>
      ${shippingHtml}
      ${stockHtml}
      <div class="noon-add-cart-wrap">
        <button class="${addBtnClass}" data-add-to-cart="${escapeHtml(id)}" aria-label="إضافة إلى السلة"${isOutOfStock ? " disabled" : ""}>+</button>
      </div>
    </div>
  </article>`;
}

function renderSortBar() {
  const container = document.getElementById("search-sort-bar");
  if (!container) return;
  container.classList.remove("hidden");
  let html = `<div class="noon-sort-bar"><div class="noon-sort-options">`;
  _SORT_OPTIONS.forEach(opt => {
    html += `<button type="button" class="noon-sort-btn${_currentSort === opt.key ? " active" : ""}" data-sort="${opt.key}">${opt.label}</button>`;
  });
  html += `</div></div>`;
  container.innerHTML = html;
  container.querySelectorAll(".noon-sort-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      _currentSort = btn.getAttribute("data-sort");
      sortAndRenderResults();
    });
  });
}

function sortResults(products) {
  const sorted = [...products];
  switch (_currentSort) {
    case "price_asc": sorted.sort((a, b) => (a.price || 0) - (b.price || 0)); break;
    case "price_desc": sorted.sort((a, b) => (b.price || 0) - (a.price || 0)); break;
    case "rating": sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
    case "newest": sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)); break;
    case "discount": sorted.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0)); break;
    default: break;
  }
  return sorted;
}

function sortAndRenderResults() {
  _currentSearchResults = sortResults(_currentSearchResults);
  _currentCategoryFilter = "الكل";
  _currentPage = 1;
  renderCategoryFilters();
  applyCategoryFilterAndRender();
}

function renderSkeleton() {
  const resultsEl = document.getElementById("search-results");
  if (!resultsEl) return;
  let html = '<div class="noon-skeleton-grid">';
  for (let i = 0; i < 12; i++) {
    html += `<div class="noon-skeleton-card"><div class="noon-skeleton-img"></div><div class="noon-skeleton-body"><div class="noon-skeleton-line w80 h12"></div><div class="noon-skeleton-line w60 h12"></div><div class="noon-skeleton-line w40 h16"></div><div class="noon-skeleton-line w80 h24"></div></div></div>`;
  }
  html += '</div>';
  resultsEl.innerHTML = html;
}

function renderResultsPage() {
  const resultsEl = document.getElementById("search-results");
  if (!resultsEl) return;

  const start = (_currentPage - 1) * _PRODUCTS_PER_PAGE;
  const pageItems = _filteredSearchResults.slice(start, start + _PRODUCTS_PER_PAGE);

  if (_currentPage === 1) {
    resultsEl.innerHTML = "";
  }

  if (!pageItems.length && _currentPage === 1) {
    const inputEl2 = document.getElementById("search-input");
    const q = inputEl2 ? inputEl2.value : "";
    let emptyHtml = `<div class="noon-empty-state"><img src="../assets/images/empty-search.png" alt="" onerror="this.style.display='none'" /><h3>لا توجد نتائج</h3><p>لم نعثر على نتائج مطابقة لـ "${escapeHtml(q)}". جرب كلمات بحث أخرى.</p><a href="home.html" class="noon-empty-btn">العودة للرئيسية</a></div>`;
    resultsEl.innerHTML = emptyHtml;
    return;
  }

  if (!pageItems.length) return;

  var isFuzzy = window._isFuzzySearch;
  if (isFuzzy && _currentPage === 1) {
    var notice = document.createElement("div");
    notice.style.cssText = "padding:10px 14px;margin-bottom:12px;background:#fef3c7;border-radius:10px;color:#92400e;font-size:0.82rem;text-align:right;";
    var inputEl2 = document.getElementById("search-input");
    var q = inputEl2 ? inputEl2.value : "";
    var spellCheck = fuzzyDictLookup(normalizeArabicText(q), 2);
    var noticeMsg = "لم نعثر على نتائج مطابقة لـ \u201C" + q + "\u201D. إليك نتائج مشابهة:";
    if (spellCheck && normalizeArabicText(spellCheck) !== normalizeArabicText(q)) {
      noticeMsg = "\u201C" + q + "\u201D لم يعثر على نتائج. عرض نتائج مشابهة لـ \u201C" + spellCheck + "\u201D:";
    }
    notice.textContent = noticeMsg;
    resultsEl.appendChild(notice);
  }

  if (_currentPage === 1) {
    renderSortBar();
  }

  var grid = document.createElement("div");
  grid.className = "noon-grid";
  for (let i = 0; i < pageItems.length; i++) {
    grid.innerHTML += buildNoonProductCard(pageItems[i]);
  }
  resultsEl.appendChild(grid);

  if (_currentCategoryFilter === "الكل" && _currentPage === 1 && _allSearchProducts.length > 0) {
    const inputEl = document.getElementById("search-input");
    const queryVal = inputEl ? inputEl.value : "";

    if (_currentSearchResults.length > 0 && !window._isFuzzySearch) {
      var similarProducts = getSimilarProducts(_currentSearchResults, queryVal);
      if (similarProducts.length > 0) {
        var similarWrap = document.createElement("div");
        similarWrap.className = "similar-products-wrap";
        var similarTitle = document.createElement("h3");
        similarTitle.style.cssText = "margin:20px 0 12px;font-size:1.05rem;font-weight:700;text-align:right;";
        similarTitle.textContent = "منتجات قد تعجبك";
        similarWrap.appendChild(similarTitle);
        var similarGrid = document.createElement("div");
        similarGrid.className = "noon-grid";
        for (var si = 0; si < similarProducts.length; si++) {
          similarGrid.innerHTML += buildNoonProductCard(similarProducts[si]);
        }
        similarWrap.appendChild(similarGrid);
        resultsEl.appendChild(similarWrap);
      }
    }

    var suggChips = getSearchSuggestions(queryVal);
    if (suggChips.length > 0) {
      var chipWrap = document.createElement("div");
      chipWrap.style.cssText = "margin:16px 0 4px;text-align:right;";
      var chipLabel = document.createElement("div");
      chipLabel.style.cssText = "font-size:0.82rem;color:#6b7280;margin-bottom:8px;";
      chipLabel.textContent = "هل تبحث عن:";
      chipWrap.appendChild(chipLabel);
      var chipRow = document.createElement("div");
      chipRow.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;";
      for (var ci = 0; ci < suggChips.length; ci++) {
        (function(term) {
          var chip = document.createElement("button");
          chip.type = "button";
          chip.textContent = term;
          chip.style.cssText = "padding:5px 12px;border:1px solid #e5e7eb;border-radius:20px;background:#fff;font-size:0.78rem;cursor:pointer;color:#1a1a1a;font-family:inherit;";
          chip.addEventListener("click", function() {
            if (inputEl) { inputEl.value = term; }
            performSearch(term);
          });
          chipRow.appendChild(chip);
        })(suggChips[ci]);
      }
      chipWrap.appendChild(chipRow);
      resultsEl.appendChild(chipWrap);
    }
  }

  attachCardEvents(resultsEl);
  checkInfiniteScroll();
}

function attachCardEvents(container) {
  // Use event delegation - attach ONCE to container, not to each element
  if (container.dataset.eventsAttached === "true") return;
  container.dataset.eventsAttached = "true";

  // Wishlist toggle
  container.addEventListener("click", function(e) {
    var wishBtn = e.target.closest("[data-wishlist]");
    if (wishBtn) {
      e.stopPropagation();
      var pid = wishBtn.getAttribute("data-wishlist");
      if (!window.BudaStore) return;
      var active = window.BudaStore.toggleWishlist(pid);
      wishBtn.classList.toggle("is-active", Boolean(active));
      wishBtn.setAttribute("aria-pressed", active ? "true" : "false");
      var icon = wishBtn.querySelector(".material-icons-outlined");
      if (icon) icon.textContent = active ? "favorite" : "favorite_border";
      return;
    }

    // Add to cart
    var addBtn = e.target.closest("[data-add-to-cart]");
    if (addBtn && !addBtn.disabled) {
      e.stopPropagation();
      var pid = addBtn.getAttribute("data-add-to-cart");
      if (!window.BudaStore) return;
      var p = window.BudaStore.getProductById(pid);
      if (!p) return;
      window.BudaStore.addToCart(p, 1);
      window.BudaStore.updateCartCount();
      addBtn.style.transform = "scale(0.8)";
      setTimeout(function() { addBtn.style.transform = ""; }, 150);
      return;
    }

    // Product card click (navigate) - but not if clicking gallery controls
    var card = e.target.closest(".noon-product-card");
    if (card && !e.target.closest("[data-wishlist]") && !e.target.closest("[data-add-to-cart]") && !e.target.closest(".noon-gallery-arrow") && !e.target.closest(".noon-img-dots")) {
      var pid = card.getAttribute("data-product-id");
      if (pid) navigateToProduct(pid);
    }
  });

  function updateSearchCounter(wrap) {
    var container2 = wrap && wrap.querySelector(".noon-gallery-imgs");
    if (!container2) return;
    var current = parseInt(container2.dataset.current || "0", 10);
    var imgs = wrap.querySelectorAll(".noon-gallery-img");
    if (!imgs.length) return;
    var counterEl = wrap.querySelector(".noon-img-counter .noon-img-current");
    if (counterEl) counterEl.textContent = Math.min(current + 1, imgs.length);
  }

  // Gallery controls - hover auto-slide (desktop) + touch swipe (mobile)
  container.addEventListener("mouseenter", function(e) {
    var wrap = e.target.closest(".noon-product-media-wrap");
    if (!wrap) return;
    var imgs = wrap.querySelectorAll(".noon-gallery-img");
    if (imgs.length < 2) return;
    if (window.matchMedia("(hover: none)").matches) return; // skip on touch devices
    wrap.dataset.autoActive = "true";
    var timer = setInterval(function() {
      if (wrap.dataset.autoActive !== "true") {
        clearInterval(timer);
        return;
      }
      var container2 = wrap.querySelector(".noon-gallery-imgs");
      if (!container2) return;
      var current = parseInt(container2.dataset.current || "0", 10);
      var next = (current + 1) % imgs.length;
      container2.style.transform = "translateX(-" + (next * 100) + "%)";
      container2.dataset.current = next;
      var dots = wrap.querySelector(".noon-img-dots");
      if (dots) {
        dots.querySelectorAll("span").forEach(function(s, si) {
          s.classList.toggle("active", si === next);
        });
      }
      updateSearchCounter(wrap);
    }, 1200);
    wrap.dataset.autoTimer = timer;
  });

  container.addEventListener("mouseleave", function(e) {
    var wrap = e.target.closest(".noon-product-media-wrap");
    if (!wrap) return;
    wrap.dataset.autoActive = "false";
    var timer = wrap.dataset.autoTimer;
    if (timer) {
      clearInterval(timer);
      wrap.dataset.autoTimer = "";
    }
    var container2 = wrap.querySelector(".noon-gallery-imgs");
    if (container2) {
      container2.style.transform = "translateX(0%)";
      container2.dataset.current = "0";
    }
    var dots = wrap.querySelector(".noon-img-dots");
    if (dots) {
      updateSearchCounter(wrap);
      dots.querySelectorAll("span").forEach(function(s, si) {
        s.classList.toggle("active", si === 0);
      });
    }
  });

  // Gallery arrow clicks
  container.addEventListener("click", function(e) {
    var prevBtn = e.target.closest(".noon-gallery-arrow-prev");
    var nextBtn = e.target.closest(".noon-gallery-arrow-next");
    if (!prevBtn && !nextBtn) return;
    e.stopPropagation();
    var wrap = prevBtn ? prevBtn.closest(".noon-product-media-wrap") : nextBtn.closest(".noon-product-media-wrap");
    if (!wrap) return;
    var container2 = wrap.querySelector(".noon-gallery-imgs");
    var imgs = wrap.querySelectorAll(".noon-gallery-img");
    if (!container2 || imgs.length < 2) return;
    var current = parseInt(container2.dataset.current || "0", 10);
    var next = prevBtn ? current - 1 : current + 1;
    if (next < 0) next = imgs.length - 1;
    if (next >= imgs.length) next = 0;
    container2.style.transform = "translateX(-" + (next * 100) + "%)";
    container2.dataset.current = next;
    var dots = wrap.querySelector(".noon-img-dots");
    if (dots) {
      dots.querySelectorAll("span").forEach(function(s, si) {
        s.classList.toggle("active", si === next);
      });
    }
    updateSearchCounter(wrap);
  });

  // Gallery dot clicks
  container.addEventListener("click", function(e) {
    var dot = e.target.closest(".noon-img-dots span");
    if (!dot) return;
    e.stopPropagation();
    var wrap = dot.closest(".noon-product-media-wrap");
    if (!wrap) return;
    var container2 = wrap.querySelector(".noon-gallery-imgs");
    var imgs = wrap.querySelectorAll(".noon-gallery-img");
    var index = Array.from(dot.parentNode.children).indexOf(dot);
    if (index >= 0 && index < imgs.length) {
      container2.style.transform = "translateX(-" + (index * 100) + "%)";
      container2.dataset.current = index;
      dot.parentNode.querySelectorAll("span").forEach(function(s, si) {
        s.classList.toggle("active", si === index);
      });
    }
    updateSearchCounter(wrap);
  });

  // Touch swipe for mobile
  container.addEventListener("touchstart", function(e) {
    var wrap = e.target.closest(".noon-product-media-wrap");
    if (!wrap) return;
    wrap.dataset.touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  container.addEventListener("touchend", function(e) {
    var wrap = e.target.closest(".noon-product-media-wrap");
    if (!wrap || !wrap.dataset.touchStartX) return;
    var touchEndX = e.changedTouches[0].screenX;
    var diff = wrap.dataset.touchStartX - touchEndX;
    if (Math.abs(diff) > 30) {
      var container2 = wrap.querySelector(".noon-gallery-imgs");
      var imgs = wrap.querySelectorAll(".noon-gallery-img");
      if (!container2 || imgs.length < 2) return;
      var current = parseInt(container2.dataset.current || "0", 10);
      var next = diff > 0 ? current + 1 : current - 1;
      if (next < 0) next = imgs.length - 1;
      if (next >= imgs.length) next = 0;
      container2.style.transform = "translateX(-" + (next * 100) + "%)";
      container2.dataset.current = next;
      var dots = wrap.querySelector(".noon-img-dots");
      if (dots) {
        dots.querySelectorAll("span").forEach(function(s, si) {
          s.classList.toggle("active", si === next);
        });
      }
      updateSearchCounter(wrap);
    }
    delete wrap.dataset.touchStartX;
  }, { passive: true });
}

// REMOVE the old setupGalleryControls function - replaced by delegation above
// function setupGalleryControls(container) { ... }

// Infinite scroll
function checkInfiniteScroll() {
  var loader = document.getElementById("infinite-loader");
  if (loader) loader.remove();
  var totalPages = Math.ceil(_filteredSearchResults.length / _PRODUCTS_PER_PAGE);
  if (_currentPage >= totalPages) return;
  var resultsEl = document.getElementById("search-results");
  if (!resultsEl) return;
  var sentinel = document.createElement("div");
  sentinel.id = "infinite-loader";
  sentinel.className = "noon-infinite-loader";
  sentinel.textContent = "جاري تحميل المزيد...";
  resultsEl.after(sentinel);
  var observer = new IntersectionObserver(function(entries) {
    if (entries[0].isIntersecting) {
      observer.disconnect();
      _currentPage++;
      renderResultsPage();
    }
  }, { rootMargin: "200px" });
  observer.observe(sentinel);
}

// Update renderPagination to use infinite scroll instead
function renderPagination(total) {
  // Replaced by infinite scroll
}

// Global wrapper to prevent errors if called from external components
window.renderProductsInContainer = function(container, products) {
  _currentSearchResults = (products || []).map(p => 
    window.BudaStore && typeof window.BudaStore.normalizeProductRecord === "function"
      ? window.BudaStore.normalizeProductRecord(p)
      : p
  ).filter(Boolean);
  _currentCategoryFilter = "الكل";
  _currentPage = 1;
  renderCategoryFilters();
  applyCategoryFilterAndRender();
};

var _searchInProgress = false;
var _searchDebounceTimer = null;
var _suggestionDebounceTimer = null;

async function performSearch(query) {
  if (_searchInProgress) return Promise.resolve();
  const resultsEl = document.getElementById("search-results");
  if (!resultsEl) return;

  const term = normalizeTerm(query);
  if (!term) {
    clearResults();
    setHistoryVisibility(true);
    renderSearchHistory();
    const filterContainer = document.getElementById("search-filter-container");
    if (filterContainer) filterContainer.classList.add("hidden");
    return Promise.resolve();
  }

  _searchInProgress = true;
  if (_searchDebounceTimer) { clearTimeout(_searchDebounceTimer); _searchDebounceTimer = null; }

  try {
    hideSuggestions();
    setHistoryVisibility(false);
    saveSearchHistory(term);
    renderSearchHistory();

    renderSkeleton();

    if (!_allSearchProducts.length) {
      await loadAllSearchProducts();
    }

    _currentSearchResults = searchProductsLocal(term);
    if (window.Analytics) Analytics.trackSearch(term, _currentSearchResults);
    _currentCategoryFilter = "الكل";
    _currentPage = 1;

    if (!_currentSearchResults.length) {
      window._isFuzzySearch = true;
      var similarFallback = getSimilarProducts([], term);
      if (similarFallback.length > 0) {
        _currentSearchResults = similarFallback;
      } else {
        resultsEl.innerHTML = '<div class="search-empty-state">لا توجد نتائج مطابقة لهذا البحث.</div>';
        const filterContainer = document.getElementById("search-filter-container");
        if (filterContainer) filterContainer.classList.add("hidden");
        const sortBar = document.getElementById("search-sort-bar");
        if (sortBar) sortBar.classList.add("hidden");
        return;
      }
    } else {
      window._isFuzzySearch = false;
    }

    renderCategoryFilters();
    applyCategoryFilterAndRender();
  } finally {
    _searchInProgress = false;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const inputEl = document.getElementById("search-input");
  const clearBtn = document.getElementById("clear-button");
  const searchBtn = document.getElementById("search-button");
  const suggestionsEl = document.getElementById("suggestions");

  if (!inputEl) return;

  // Check for ?q= query param from search redirect
  var urlParams = new URLSearchParams(window.location.search);
  var queryFromUrl = normalizeTerm(urlParams.get("q") || "");
  inputEl.value = queryFromUrl ? queryFromUrl : "";
  localStorage.removeItem("lastSearch");

  renderSearchHistory();
  setHistoryVisibility(true);
  clearResults();

  function toggleClear() {
    if (!clearBtn) return;
    clearBtn.classList.toggle("hidden", !normalizeTerm(inputEl.value));
  }

  inputEl.addEventListener("focus", () => {
    if (!normalizeTerm(inputEl.value)) {
      renderSearchHistory();
      setHistoryVisibility(true);
    }
  });

  inputEl.addEventListener("input", function() {
    var term = normalizeTerm(inputEl.value);
    toggleClear();

    if (_suggestionDebounceTimer) {
      clearTimeout(_suggestionDebounceTimer);
      _suggestionDebounceTimer = null;
    }

    if (term) {
      setHistoryVisibility(false);
      _suggestionDebounceTimer = setTimeout(function() {
        renderSuggestions(term);
      }, 120);
      return;
    }

    hideSuggestions();
    clearResults();
    renderSearchHistory();
    setHistoryVisibility(true);
    var filterContainer = document.getElementById("search-filter-container");
    if (filterContainer) filterContainer.classList.add("hidden");
  });

  inputEl.addEventListener("keydown", function(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (_searchDebounceTimer) { clearTimeout(_searchDebounceTimer); _searchDebounceTimer = null; }
    if (_suggestionDebounceTimer) { clearTimeout(_suggestionDebounceTimer); _suggestionDebounceTimer = null; }
    _suppressSuggestions = true;
    if (suggestionsEl) {
      suggestionsEl.innerHTML = "";
      suggestionsEl.classList.add("hidden");
    }
    setHistoryVisibility(false);
    performSearch(inputEl.value).finally(function() {
      _suppressSuggestions = false;
    });
  });

  inputEl.addEventListener("blur", () => {
    setTimeout(() => suggestionsEl?.classList.add("hidden"), 160);
  });

  clearBtn?.addEventListener("click", function() {
    if (_searchDebounceTimer) { clearTimeout(_searchDebounceTimer); _searchDebounceTimer = null; }
    if (_suggestionDebounceTimer) { clearTimeout(_suggestionDebounceTimer); _suggestionDebounceTimer = null; }
    inputEl.value = "";
    inputEl.focus();

    if (suggestionsEl) {
      suggestionsEl.innerHTML = "";
      suggestionsEl.classList.add("hidden");
    }

    clearResults();
    renderSearchHistory();
    setHistoryVisibility(true);
    toggleClear();
    var filterContainer = document.getElementById("search-filter-container");
    if (filterContainer) filterContainer.classList.add("hidden");
    var paginationEl = document.getElementById("pagination");
    if (paginationEl) paginationEl.innerHTML = "";
  });

  searchBtn?.addEventListener("click", function() {
    if (_searchDebounceTimer) { clearTimeout(_searchDebounceTimer); _searchDebounceTimer = null; }
    if (_suggestionDebounceTimer) { clearTimeout(_suggestionDebounceTimer); _suggestionDebounceTimer = null; }
    _suppressSuggestions = true;
    if (suggestionsEl) {
      suggestionsEl.innerHTML = "";
      suggestionsEl.classList.add("hidden");
    }
    setHistoryVisibility(false);
    performSearch(inputEl.value).finally(function() {
      _suppressSuggestions = false;
    });
  });

  toggleClear();

  // Load products in background, then perform initial search if query param exists
  loadAllSearchProducts().then(function() {
    if (queryFromUrl) {
      performSearch(queryFromUrl);
    }
  });

  // Reload search products when country changes
  document.addEventListener("boda:country-changed", async function () {
    _allSearchProducts = [];
    _productSearchKeys.clear();
    await loadAllSearchProducts();
    // Re-run current search if there's a query
    var q = normalizeTerm(inputEl.value);
    if (q) {
      performSearch(q);
    } else {
      hideSuggestions();
      clearResults();
      renderSearchHistory();
      setHistoryVisibility(true);
    }
  });

});
