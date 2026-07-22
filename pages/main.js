console.log("[main.js] version 20260630h loaded");
document.addEventListener("DOMContentLoaded", async () => {
  const productsGrid = document.getElementById("productsGrid");
  const filterContainer = document.getElementById("filterContainer");
  const paginationEl = document.getElementById("pagination");
  if (!productsGrid || !filterContainer) return;

  var allProducts = [];
  var currentPage = 1;
  var currentFiltered = [];
  var PRODUCTS_PER_PAGE = 92;

  const categories = [
    "الكل",
    "جمال وعناية",
    "إلكترونيات",
    "سماعات",
    "رياضة",
    "ساعات",
    "منزل",
    "أطفال",
    "أثاث",
    "عطور",
    "ألعاب",
    "كاميرات",
    "مجوهرات",
    "هدايا",
    "جملة",
  ];

  // ===== Mega Menu (Categories bar) =====
  const TAAGER_MEGA_MENU = [
    {
      name: "جمال وعناية",
      icon: "spa",
      subs: ["مستحضرات تجميل", "عناية بالبشرة", "عطور", "عناية بالشعر"],
    },
    {
      name: "إلكترونيات",
      icon: "smartphone",
      subs: ["موبايلات", "لابتوب", "سماعات", "كاميرات", "إكسسوارات إلكترونية"],
    },
    {
      name: "سماعات",
      icon: "headphones",
      subs: ["سماعات بلوتوث", "سماعات سلكية", "سماعات رأس", "سبيكرات ومكبرات"],
    },
    {
      name: "رياضة",
      icon: "sports_soccer",
      subs: ["أجهزة جيم", "ملابس رياضية", "مكملات غذائية", "أدوات رياضية"],
    },
    {
      name: "ساعات",
      icon: "watch",
      subs: ["ساعات ذكية", "ساعات رجالية", "ساعات نسائية"],
    },
    {
      name: "منزل",
      icon: "home",
      subs: ["أدوات مطبخ", "ديكور", "مفروشات", "أجهزة منزلية"],
    },
    {
      name: "أطفال",
      icon: "child_care",
      subs: ["ملابس أطفال", "حفاضات", "ألعاب أطفال", "مستلزمات رضع"],
    },
    {
      name: "أثاث",
      icon: "chair",
      subs: ["غرف نوم", "غرف معيشة", "مكاتب", "إضاءة"],
    },
    {
      name: "عطور",
      icon: "air",
      subs: ["عطور رجالية", "عطور نسائية", "بخور", "دهن عود"],
    },
    {
      name: "ألعاب",
      icon: "toys",
      subs: ["ألعاب تعليمية", "ألعاب إلكترونية", "دمى", "ألعاب خارجية"],
    },
    {
      name: "كاميرات",
      icon: "camera_alt",
      subs: ["كاميرات تصوير", "كاميرات مراقبة", "عدسات", "إكسسوارات تصوير"],
    },
    {
      name: "مجوهرات",
      icon: "diamond",
      subs: ["ذهب", "فضة", "إكسسوارات", "أحجار كريمة"],
    },
    {
      name: "هدايا",
      icon: "card_giftcard",
      subs: ["طقم هدايا", "ورد", "مناسبات"],
    },
    {
      name: "جملة",
      icon: "inventory_2",
      subs: ["منتجات بالجملة", "مستلزمات تجارية"],
    },
  ];

  // Map mega categories to their existing filter labels (for icon lookup)
  const MEGA_CAT_ICON_MAP = {};
  TAAGER_MEGA_MENU.forEach(function (item) { MEGA_CAT_ICON_MAP[item.name] = item.icon; });

  // Build subcategory → parent mapping for hierarchical filtering
  var SUB_TO_PARENT = {};
  TAAGER_MEGA_MENU.forEach(function (item) {
    item.subs.forEach(function (sub) {
      SUB_TO_PARENT[sub] = item.name;
    });
  });

  function renderMegaMenu() {
    var bar = document.getElementById("taagerMegaBar");
    if (!bar) return;

    // Build inner scroll wrapper + items
    var scrollWrap = document.createElement("div");
    scrollWrap.className = "taager-mega-scroll";

    TAAGER_MEGA_MENU.forEach(function (item) {
      var itemDiv = document.createElement("div");
      itemDiv.className = "taager-mega-item";

      var trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "taager-mega-trigger";
      trigger.innerHTML = '<span class="material-icons-outlined">' + item.icon + '</span><span>' + item.name + '</span>';
      itemDiv.appendChild(trigger);

      var dropdown = document.createElement("div");
      dropdown.className = "taager-mega-dropdown";

      item.subs.forEach(function (sub) {
        var subIcon = CATEGORY_ICONS[sub] || "chevron_left";
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "taager-mega-sub";
        btn.setAttribute("data-cat", sub);
        btn.innerHTML = '<span class="material-icons-outlined">' + subIcon + '</span><span>' + sub + '</span>';
        btn.addEventListener("click", function () {
          selectCategory(sub);
          closeAllMega();
        });
        dropdown.appendChild(btn);
      });

      itemDiv.appendChild(dropdown);
      scrollWrap.appendChild(itemDiv);

      // Show/hide dropdown on hover (desktop) / click (mobile)
      trigger.addEventListener("click", function (e) {
        e.stopPropagation();
        // Always filter products by this main category
        selectCategory(item.name);
        var isOpen = itemDiv.classList.contains("is-open");
        closeAllMega();
        if (!isOpen) {
          itemDiv.classList.add("is-open");
          positionDropdown(itemDiv);
        }
      });

      trigger.addEventListener("mouseenter", function () {
        if (window.innerWidth >= 768) {
          closeAllMega();
          itemDiv.classList.add("is-open");
          positionDropdown(itemDiv);
        }
      });

      // Keep open when hovering into the dropdown
      dropdown.addEventListener("mouseenter", function () {
        if (window.innerWidth >= 768) {
          itemDiv.classList.add("is-open");
        }
      });
    });

    bar.innerHTML = "";
    bar.appendChild(scrollWrap);

    // Close when mouse completely leaves the bar
    bar.addEventListener("mouseleave", function (e) {
      if (window.innerWidth >= 768) {
        var related = e.relatedTarget;
        if (related && bar.contains(related)) return;
        closeAllMega();
      }
    });
  }

  function positionDropdown(item) {
    var dropdown = item.querySelector(".taager-mega-dropdown");
    var trigger = item.querySelector(".taager-mega-trigger");
    if (!dropdown || !trigger) return;
    var rect = trigger.getBoundingClientRect();
    var isMobile = window.innerWidth < 768;
    if (isMobile) {
      // On mobile, stretch full width with padding
      dropdown.style.top = Math.min(rect.bottom + 4, window.innerHeight - 20) + "px";
      dropdown.style.left = "8px";
      dropdown.style.right = "8px";
      dropdown.style.width = "auto";
    } else {
      // On desktop, position below the trigger, aligned right
      var ddWidth = Math.max(220, Math.min(320, dropdown.offsetWidth || 220));
      var leftPos = rect.right - ddWidth;
      if (leftPos < 8) leftPos = 8;
      if (leftPos + ddWidth > window.innerWidth - 8) {
        leftPos = window.innerWidth - ddWidth - 8;
      }
      dropdown.style.top = (rect.bottom + 4) + "px";
      dropdown.style.left = leftPos + "px";
      dropdown.style.width = ddWidth + "px";
      dropdown.style.right = "auto";
    }
  }

  function closeAllMega() {
    var bar = document.getElementById("taagerMegaBar");
    if (!bar) return;
    bar.querySelectorAll(".taager-mega-item.is-open").forEach(function (el) { el.classList.remove("is-open"); });
  }

  const categoryMap = {
    phones: "موبايلات وملحقاتها",
    mobile: "موبايلات وملحقاتها",
    electronics: "إلكترونيات",
    watches: "ساعات",
    keyboards: "إلكترونيات",
    headphones: "سماعات",
    audio: "سماعات",
    headset: "سماعات",
    children: "ملابس وأحذية",
    clothes: "ملابس وأحذية",
    "beauty-and-care": "منتجات تجميل وعناية",
    cosmetics: "عطور",
    perfume: "عطور",
    sports: "منتجات رياضية",
    home: "منزل ومطبخ",
    kitchen: "منزل ومطبخ",
    toys: "ألعاب",
    baby: "حفاضات وأطفال",
    watches: "ساعات",
    books: "كتب ومجلات",
    pets: "حيوانات أليفة",
    auto: "سيارات",
    jewelry: "مجوهرات وإكسسوارات",
    cameras: "كاميرات وتصوير",
    gifts: "هدايا",
    office: "مكتب ودراسة",
    stationery: "مكتب ودراسة",
    study: "مكتب ودراسة",
    furniture: "مستلزمات المنزل",
  };

  function normalizeText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[أإآا]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[ًٌٍَُِّْ]/g, "")
      .trim();
  }

  function normalizeCategoryLabel(category) {
    var value = String(category || "").trim();
    var valueNorm = normalizeText(value);
    var map = {
      "منتجات تجميل وعناية": "جمال وعناية",
      "جمال وعناية": "جمال وعناية",
      "تجميل": "جمال وعناية",
      "إلكترونيات": "إلكترونيات",
      "الكترونيات": "إلكترونيات",
      "سماعات": "سماعات",
      "رياضة": "رياضة",
      "منتجات رياضية": "رياضة",
      "رياضة وترفيه": "رياضة",
      "ساعات": "ساعات",
      "منزل": "منزل",
      "منزل ومطبخ": "منزل",
      "مستلزمات المنزل": "منزل",
      "أطفال": "أطفال",
      "حفاضات وأطفال": "أطفال",
      "حفاضات": "أطفال",
      "ملابس أطفال": "أطفال",
      "ملابس اطفال": "أطفال",
      "أثاث": "أثاث",
      "عطور": "عطور",
      "ألعاب": "ألعاب",
      "كاميرات": "كاميرات",
      "كاميرات وتصوير": "كاميرات",
      "مجوهرات": "مجوهرات",
      "مجوهرات وإكسسوارات": "مجوهرات",
      "هدايا": "هدايا",
      "جملة": "جملة",
      "منتجات عامة": "",
      "ملابس": "رياضة",
      "ملابس وأحذية": "رياضة",
    };
    var engMap = {
      "electronics": "إلكترونيات",
      "clothing": "رياضة",
      "clothes": "رياضة",
      "fashion": "رياضة",
      "beauty": "جمال وعناية",
      "cosmetics": "جمال وعناية",
      "skincare": "جمال وعناية",
      "sports": "رياضة",
      "sport": "رياضة",
      "fitness": "رياضة",
      "home": "منزل",
      "kitchen": "منزل",
      "baby": "أطفال",
      "diapers": "أطفال",
      "watches": "ساعات",
      "watch": "ساعات",
      "toys": "ألعاب",
      "games": "ألعاب",
      "mobile": "إلكترونيات",
      "phones": "إلكترونيات",
      "smartphone": "إلكترونيات",
      "accessories": "إلكترونيات",
      "perfume": "عطور",
      "perfumes": "عطور",
      "fragrance": "عطور",
      "office": "أثاث",
      "stationery": "أثاث",
      "study": "أثاث",
      "school": "أثاث",
      "books": "ألعاب",
      "book": "ألعاب",
      "magazine": "ألعاب",
      "pet": "ألعاب",
      "pets": "ألعاب",
      "dog": "ألعاب",
      "cat": "ألعاب",
      "car": "رياضة",
      "auto": "رياضة",
      "automotive": "رياضة",
      "jewelry": "مجوهرات",
      "jewellery": "مجوهرات",
      "accessory": "مجوهرات",
      "camera": "كاميرات",
      "cameras": "كاميرات",
      "photography": "كاميرات",
      "gift": "هدايا",
      "gifts": "هدايا",
      "furniture": "أثاث",
      "decor": "منزل",
      "headphones": "سماعات",
      "headphone": "سماعات",
      "earphones": "سماعات",
      "earphone": "سماعات",
      "earbuds": "سماعات",
      "audio": "سماعات",
      "speaker": "سماعات",
      "speakers": "سماعات",
    };
    if (map[value] !== undefined) return map[value];
    if (engMap[valueNorm] !== undefined) return engMap[valueNorm];
    return value;
  }

  function getProductText(product) {
    var parts = [
      product.name,
      product.title,
      product.description,
      product.category,
      product.brand,
      product.type,
    ];
    if (Array.isArray(product.tags)) parts = parts.concat(product.tags);
    if (Array.isArray(product.categories)) parts = parts.concat(product.categories);
    return normalizeText(parts.filter(Boolean).join(" "));
  }

  const CATEGORY_KEYWORDS = {
    "جمال وعناية": [
      "تجميل", "عناية", "عطر", "perfume", "كريم", "cream",
      "مكياج", "makeup", "make up", "beauty", "skincare",
      "lotion", "مستحضر", "مستحضرات",
      "شعر", "hair", "بشرة", "skin", "face", "وجه",
      "جمال", "كولونيا", "cologne",
      "كحل", "kohl", "eyeliner", "روج", "lipstick", "أحمر شفاه", "احمر شفاه",
      "ماسك", "mask", "body", "soap", "صابون", "شامبو", "shampoo",
      "conditioner", "بلسم", "مرطب", "moisturizer", "واقي شمس", "sunscreen",
      "مقشر", "scrub", "serum", "سيروم", "toner", "تونر",
      "مزيل عرق", "deodorant", "deodarant",
      "nail", "أظافر", "اظافر", "manicure", "pedicure",
      "eyeshadow", "ظلال", "bronzer", "highlighter",
      "فرشاة", "brush", "اسفنجة", "sponge",
      "حلاقة", "shaving", "ماكينة حلاقة", "trimmer",
      "عناية بالشعر", "عناية بالبشرة", "عناية شخصية", "personal care",
      "oil", "زيت", "زيت شعر", "زيت للبشرة",
      "منتجات عضوية", "organic", "طبيعي", "natural",
    ],
    "إلكترونيات": [
      "هاتف", "جوال", "موبايل", "phone", "smartphone", "samsung", "iphone", "apple", "xiaomi", "redmi", "poco",
      "huawei", "oppo", "realme", "oneplus", "نوكيا", "nokia", "google", "pixel", "sony", "lg",
      "تابلت", "tablet", "ipad", "اجهزة", "اجهزه", "device", "لاب توب", "laptop", "laptob", "لابتوب",
      "كمبيوتر", "computer", "pc", "macbook", "mac",
      "keyboard", "كيبورد", "كيبود", "لوحة مفاتيح", "ماوس", "mouse", "mice",
      "شاحن", "charger", "كابل", "cable", "usb", "printer", "طابعة", "شاشة", "screen", "monitor",
      "الكتروني", "electronic", "إلكتروني", "جهاز", "device", "محمول", "wireless", "لاسلكي",
      "bluetooth", "واي فاي", "wifi", "بطارية", "battery", "معالج", "processor", "ram", "رام",
      "ذاكرة", "memory", "storage", "تخزين", "ssd", "hard", "قرص", "dvd", "cd",
      "router", "راوتر", "مودم", "modem", "internet", "انترنت", "نت", "net",
      "gamepad", "controller", "microphone", "ميكروفون",
      "power bank", "بنك طاقة", "powerbank",
      "projector", "بروجيكتور", "display", "touch",
      "جراب", "حافظة موبايل", "case", "cover", "screen protector",
      "حامل", "stand", "holder",
      "محول", "adapter", "converter",
      "galaxy", "نوت", "note", "هواوي", "شاومي", "ابل",
    ],
    "سماعات": [
      "سماعة", "سماعات", "headphone", "headphones",
      "earphone", "earphones", "earbuds", "ايربودز",
      "airpods", "headset", "هاندز فري", "handsfree",
      "سماعة بلوتوث", "سماعة لاسلكية", "wireless earphone",
      "speaker", "speakers", "سماعة محمولة", "سبيكر", "مكبر",
      "ميكروفون", "microphone", "mic",
      "samsung buds", "apple airpods", "جالكسي بادز",
      "حافظة سماعة", "جراب سماعة",
      "سماعة رأس", "over ear", "on ear",
      "سماعة رياضية", "صوت", "audio",
      "bluetooth earphone", "سماعة أذن",
    ],
    "رياضة": [
      "رياضي", "رياضة", "sport", "sports", "جيم", "gym",
      "fitness", "training", "تمرين", "تمارين", "exercise",
      "football", "كرة قدم", "basketball", "كرة سلة",
      "tennis", "تنس", "badminton", "volleyball",
      "sneakers", "حذاء رياضي", "رياضيه", "جري",
      "running", "weights", "أوزان", "دمبل", "dumbbell", "dumbbels",
      "yoga", "يوغا", "yogi", "مشي", "walking",
      "bike", "دراجة", "bicycle", "cycling",
      "outdoor", "تخييم", "camping",
      "swimming", "سباحة", "weightlifting", "رفع أثقال",
      "protein", "بروتين", "supplement", "مكمل", "مكمل غذائي",
      "treadmill", "جهاز جري", "elliptical",
      "كرة", "ball",
      "قميص", "تيشيرت", "تي شيرت", "t-shirt", "tshirt",
      "بنطلون", "جينز", "jeans", "pants",
      "فستان", "dress", "بلوزة", "بلوزه", "blouse",
      "shirt", "jacket", "جاكيت", "hoodie", "هودي", "sweater",
      "short", "شورت",
      "حذاء", "shoes", "sneakers", "boots", "جزم", "جزمة",
      "ملابس", "ملابس نسائية", "ملابس رجالية",
    ],
    "ساعات": [
      "ساعة يد", "ساعة ذكية", "ساعه ذكيه", "ساعه يد",
      "smartwatch", "smart watch", "apple watch",
      "samsung watch", "galaxy watch",
      "garmin", "fitbit", "wearable",
      "ساعة كاجوال", "ساعة رياضية",
      "wrist watch", "كاسيو", "casio",
      "رولكس", "rolex", "seiko", "citizen", "fossil",
      "ساعات فاخرة", "luxury watch",
      "timepiece", "ساعة", "ساعات",
    ],
    "منزل": [
      "منزل", "home", "مطبخ", "kitchen",
      "وسادة", "pillow", "وساده", "مخدة", "مخده",
      "مفروشات", "ديكور", "dekoration", "decoration",
      "طبق", "plate", "صحن",
      "كوب", "cup", "mug", "مج", "قدح",
      "ملعقة", "spoon", "fork", "شوكة", "سكين", "knife",
      "قدر", "pot", "مقلاة", "pan", "فرن", "oven",
      "مكنسة", "vacuum", "منظف", "cleaner",
      "مفارش", "tablecloth", "غطا", "غطاء",
      "حافظة", "container", "علبة", "box",
      "سلة", "basket",
      "إضاءة", "اضاءة", "light", "lamp", "مصباح", "اباجورة",
      "ستارة", "ستاير", "curtain", "blind",
      "سجاد", "carpet", "rug", "بساط",
      "حمام", "bathroom", "bath", " towel", "منشفة", "منشفه",
      "أدوات مطبخ", "ادوات مطبخ", "cookware", "kitchenware",
      "خلاط", "blender", "ميكرويف", "microwave", "toaster", "توستر",
      "غلاية", "kettle", "محمصة",
      "طقم", "set",
    ],
    "أطفال": [
      "حفاضات", "حفاض", "baby", "بيبي", "bebe",
      "أطفال", "اطفال", "مولود", "newborn", "infant",
      "diapers", "pampers", "بامبرز", "huggies",
      "رضاعة", "bottle", "ببرونة", "baby bottle",
      "لهاية", "pacifier", "teether",
      "حليب أطفال", "formula",
      "مناديل مبللة", "wipes", "baby wipes",
      "طفل", "kid", "toddler", "رضيع",
      "عربة أطفال", "stroller", "pram",
      "كرسي أطفال", "baby chair", "car seat",
      "لعبة أطفال", "baby toy",
      "مستلزمات أطفال", "baby care",
      "حقيبة أطفال", "baby bag", "diaper bag",
      "سرير أطفال", "baby bed", "cot", "crib",
      "حمام أطفال", "baby bath",
      "ملابس أطفال", "baby clothes",
    ],
    "أثاث": [
      "أثاث", "اثاث", "furniture", "كنبة", "sofa", "couch", "مجلس",
      "طاولة", "table", "منضدة", "كرسي", "chair", "seat",
      "سرير", "bed", "مرتبة", "mattress", "دولاب", "closet", "خزانة",
      "غرفة نوم", "bedroom", "غرفة معيشة", "living room",
      "مكتب", "desk", "طاولة مكتب",
      "رف", "shelf", "حامل", "منظم", "organizer",
      "برواز", "frame", "إطار", "مرآة", "mirror",
      "خزانة", "closet",
      "قرطاسية", "stationery", "office",
      "قلم", "pen", "pencil",
      "دفتر", "notebook",
      "حقيبة ظهر", "backpack", "حقيبة مدرسية", "حقيبة", "bag", "شنطة",
      "مدرسة", "school", "جامعة", "university", "تعليم", "education",
      "study", "دراسة", "طالب", "student",
    ],
    "عطور": [
      "عطر", "عطور", "perfume", "perfumes", "fragrance", "fragrances",
      "كولونيا", "cologne", "body spray",
      "دهن عود", "عود", "oud", "bakhoor", "بخور", "معطر",
      "ماء عطر", "eau de", "mist",
      "attar", "عطر عربي", "عطر فرنسي",
      "مسك", "musk", "amber", "عنبر", "vanilla", "فانيليا",
      "تواليت", "toilette",
    ],
    "ألعاب": [
      "لعبة", "لعبه", "لعبات", "ألعاب", "العاب", "toys",
      "games", "gamer", "gaming",
      "playstation", "ps4", "ps5", "xbox", "nintendo", "switch",
      "lego", "ليجو",
      "دمية", "doll", "dolls", "باربي", "barbie",
      "سيارة", "car", "سيارات",
      "board game", "لوحة", "monopoly", "uno",
      "puzzle", "لغز", "أحجية",
      "دراجة", "bike", "bicycle", "سكوتر", "scooter",
      "ترفيه", "entertainment",
      "مجسم", "figure", "action figure",
      "تلوين", "coloring", "drawing", "رسم",
      "تعليمية", "educational", "learning",
      "بطاقات", "cards", "card game",
      "remote control", "rc", "ريموت",
      "بناء", "building", "construct",
      "مجموعة", "set", "kit",
      "رواية", "novel", "قصة", "story", "أدب", "literature",
      "كتاب", "books", "book", "مجلة", "magazine", "مجلات",
      "كلب", "dog", "جرو", "puppy",
      "قط", "cat", "قطط", "هر", "kitten",
      "حيوانات", "حيوان", "pet", "pets",
    ],
    "كاميرات": [
      "كاميرا", "camera", "كاميرات",
      "تصوير", "photography",
      "عدسة", "lens", "عدسات",
      "tripod", "حامل كاميرا",
      "فلاش", "flash",
      "action cam", "gopro",
      "كاميرا مراقبة", "security camera", "cctv",
      "كاميرا رقمية", "dslr", "كاميرا فورية",
      "instant camera", "polaroid",
      "طائرة درون", "drone", "quadcopter",
      "حقيبة كاميرا", "camera bag",
      "بطاقة ذاكرة", "memory card",
      "كاميرا تصوير", "كاميرا ديجيتال",
      "video", "فيديو",
    ],
    "مجوهرات": [
      "مجوهرات", "jewelry", "jewellery", "إكسسوارات", "accessories",
      "قلادة", "necklace", "عقد",
      "أسورة", "bracelet", "سوار",
      "خاتم", "ring", "ألماس", "diamond",
      "أقراط", "earrings", "حلق",
      "سلسلة", "chain",
      "ذهب", "gold", "فضة", "silver",
      "لؤلؤ", "pearl",
      "نظارات", "glasses", "sunglasses", "شمسية",
      "شال", "scarf", "وشاح",
      "قبعة", "hat", "cap",
      "حزام", "belt",
      "محفظة", "wallet",
      "ربطة عنق", "tie",
      "مفاتيح", "keychain", "سلسلة مفاتيح",
    ],
    "هدايا": [
      "هدية", "هدايا", "gift", "gifts",
      "طقم هدايا", "gift set", "gift box",
      "سلة هدايا", "gift basket",
      "بطاقة هدايا", "gift card",
      "تغليف", "wrapping", "wrap",
      "مفاجأة", "surprise",
      "ذكرى", "anniversary",
      "عيد", "occasion", "birthday", "ميلاد",
      "مناسبة", "celebration",
      "زفاف", "wedding", "عروسة",
      "تخرج", "graduation",
      "رمضان", "ramadan", "عيد الفطر", "عيد الأضحى",
      "هدية عيد", "holiday gift",
      "ورد", "زهور", "flowers",
    ],
    "جملة": [
      "جملة", "بالجملة", "wholesale", "bulk",
      "مستلزمات تجارية", "business",
      "تاجر", "taager",
    ],
  };

  function applyCategoryFilter(selected) {
    currentPage = 1;
    if (selected === "الكل") {
      currentFiltered = allProducts.slice();
      renderProducts(currentFiltered);
      return;
    }

    var parent = SUB_TO_PARENT[selected];
    var allCategoryLabels = Object.keys(CATEGORY_KEYWORDS);
    var keywords = CATEGORY_KEYWORDS[selected] || [];

    // If selected is a subcategory (not in CATEGORY_KEYWORDS), inherit parent keywords + narrow
    if (keywords.length === 0 && parent && CATEGORY_KEYWORDS[parent]) {
      keywords = CATEGORY_KEYWORDS[parent].slice();
      // Add the normalized subcategory name as an additional keyword to narrow results
      var subNorm = normalizeText(selected);
      keywords.push(subNorm);
      // Also add each significant word of the subcategory name
      selected.split(/\s+/).forEach(function (w) {
        var wn = normalizeText(w);
        if (wn.length > 1 && keywords.indexOf(wn) === -1) keywords.push(wn);
      });
    }

    if (keywords.length === 0) {
      currentFiltered = [];
      renderProducts(currentFiltered);
      return;
    }

    var productHasCategory = {};
    allProducts.forEach(function (p) {
      var cat = normalizeCategoryLabel(p.category);
      if (cat && allCategoryLabels.indexOf(cat) !== -1) {
        productHasCategory[String(p.id)] = cat;
      }
    });

    var exact = [];
    var nameMatch = [];
    var seen = new Set();

    allProducts.forEach(function (product) {
      var catField = normalizeCategoryLabel(product.category);
      var id = String(product.id);
      // For subcategories, exact match on either subcategory or parent
      var matchCat = parent ? (catField === selected || catField === parent) : (catField === selected);
      if (matchCat) {
        exact.push(product);
        seen.add(id);
      }
    });

    allProducts.forEach(function (product) {
      var id = String(product.id);
      if (seen.has(id)) return;
      if (productHasCategory[id]) {
        var valid = parent ? [parent, selected] : [selected];
        if (valid.indexOf(productHasCategory[id]) === -1) return;
      }
      var text = getProductText(product);
      for (var ki = 0; ki < keywords.length; ki++) {
        if (text.indexOf(normalizeText(keywords[ki])) !== -1) {
          nameMatch.push(product);
          seen.add(id);
          break;
        }
      }
    });

    currentFiltered = exact.concat(nameMatch);
    renderProducts(currentFiltered);
  }

  function renderProducts(allItems) {
    if (!allItems.length) {
      productsGrid.innerHTML = '<div class="noon-muted">لا توجد منتجات في هذا القسم.</div>';
      if (paginationEl) paginationEl.innerHTML = "";
      return;
    }

    var start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    var pageItems = allItems.slice(start, start + PRODUCTS_PER_PAGE);

    if (window.renderProductsInContainer) {
      window.renderProductsInContainer(productsGrid, pageItems);
    } else {
      var html = '<div class="noon-grid">';
      for (var pi = 0; pi < pageItems.length; pi++) {
        html += typeof buildProductCard === "function" ? buildProductCard(pageItems[pi]) : "<div>product</div>";
      }
      html += "</div>";
      productsGrid.innerHTML = html;
      if (typeof attachProductCardEvents === "function") {
        attachProductCardEvents(productsGrid);
      }
    }

    renderPagination(allItems.length);
  }

  function renderPagination(total) {
    if (!paginationEl) return;
    var totalPages = Math.ceil(total / PRODUCTS_PER_PAGE);
    if (totalPages <= 1) {
      paginationEl.innerHTML = "";
      return;
    }

    var parts = [];

    // First page arrow
    parts.push('<button type="button" class="page-btn page-nav" data-page="1"');
    if (currentPage === 1) parts.push(' disabled');
    parts.push('>«</button>');

    // Previous page arrow
    parts.push('<button type="button" class="page-btn page-nav" data-page="' + (currentPage - 1) + '"');
    if (currentPage === 1) parts.push(' disabled');
    parts.push('>‹</button>');

    // Page numbers with ellipsis
    var rangeStart = Math.max(1, currentPage - 2);
    var rangeEnd = Math.min(totalPages, currentPage + 2);

    if (rangeStart > 1) {
      parts.push('<button type="button" class="page-btn" data-page="1">1</button>');
      if (rangeStart > 2) {
        parts.push('<span class="page-ellipsis">...</span>');
      }
    }

    for (var p = rangeStart; p <= rangeEnd; p++) {
      parts.push('<button type="button" class="page-btn' + (p === currentPage ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>');
    }

    if (rangeEnd < totalPages) {
      if (rangeEnd < totalPages - 1) {
        parts.push('<span class="page-ellipsis">...</span>');
      }
      parts.push('<button type="button" class="page-btn" data-page="' + totalPages + '">' + totalPages + '</button>');
    }

    // Next page arrow
    parts.push('<button type="button" class="page-btn page-nav" data-page="' + (currentPage + 1) + '"');
    if (currentPage === totalPages) parts.push(' disabled');
    parts.push('>›</button>');

    // Last page arrow
    parts.push('<button type="button" class="page-btn page-nav" data-page="' + totalPages + '"');
    if (currentPage === totalPages) parts.push(' disabled');
    parts.push('>»</button>');

    paginationEl.innerHTML = parts.join("");

    paginationEl.querySelectorAll(".page-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        currentPage = parseInt(btn.getAttribute("data-page"), 10);
        renderProducts(currentFiltered);
        window.scrollTo({ top: productsGrid.offsetTop - 20, behavior: "smooth" });
      });
    });
  }

  // أيقونة لكل قسم
  var CATEGORY_ICONS = {
    "الكل":                   "apps",
    "جمال وعناية":           "spa",
    "إلكترونيات":             "smartphone",
    "سماعات":                 "headphones",
    "رياضة":                  "sports_soccer",
    "ساعات":                  "watch",
    "منزل":                   "home",
    "أطفال":                  "child_care",
    "أثاث":                   "chair",
    "عطور":                   "air",
    "ألعاب":                  "toys",
    "كاميرات":                "camera_alt",
    "مجوهرات":                "diamond",
    "هدايا":                  "card_giftcard",
    "جملة":                   "inventory_2",
    // Subcategory icons
    "مستحضرات تجميل":        "face_retouching_natural",
    "عناية بالبشرة":         "spa",
    "عناية بالشعر":          "content_cut",
    "موبايلات":              "smartphone",
    "لابتوب":                "laptop",
    "إكسسوارات إلكترونية":  "cable",
    "سماعات بلوتوث":         "bluetooth",
    "سماعات سلكية":          "headphones",
    "سماعات رأس":            "headset_mic",
    "سبيكرات ومكبرات":       "speaker",
    "أجهزة جيم":             "fitness_center",
    "ملابس رياضية":          "checkroom",
    "مكملات غذائية":         "medication",
    "أدوات رياضية":          "sports_tennis",
    "ساعات ذكية":            "smartwatch",
    "ساعات رجالية":          "watch",
    "ساعات نسائية":          "watch",
    "أدوات مطبخ":            "kitchen",
    "ديكور":                 "palette",
    "مفروشات":               "bed",
    "أجهزة منزلية":          "local_laundry_service",
    "ملابس أطفال":           "checkroom",
    "حفاضات":                "baby_changing_station",
    "ألعاب أطفال":           "toys",
    "مستلزمات رضع":          "baby_changing_station",
    "غرف نوم":               "bed",
    "غرف معيشة":             "living",
    "مكاتب":                 "desk",
    "إضاءة":                 "lightbulb",
    "عطور رجالية":           "air",
    "عطور نسائية":           "air",
    "بخور":                  "air_freshener",
    "دهن عود":               "air_freshener",
    "ألعاب تعليمية":         "school",
    "ألعاب إلكترونية":       "videogame_asset",
    "دمى":                   "toys",
    "ألعاب خارجية":          "sports_tennis",
    "كاميرات تصوير":         "camera_alt",
    "كاميرات مراقبة":        "videocam",
    "عدسات":                 "camera",
    "إكسسوارات تصوير":       "camera",
    "ذهب":                   "diamond",
    "فضة":                   "diamond",
    "إكسسوارات":             "watch",
    "أحجار كريمة":           "diamond",
    "طقم هدايا":             "card_giftcard",
    "ورد":                   "local_florist",
    "مناسبات":               "celebration",
    "منتجات بالجملة":        "inventory_2",
    "مستلزمات تجارية":       "business_center",
  };

  function selectCategory(category) {
    document.querySelectorAll(".filter-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-cat") === category);
    });
    document.querySelectorAll(".sidebar-cat-btn").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-cat") === category);
    });
    applyCategoryFilter(category);
  }

  function renderFilters() {
    filterContainer.innerHTML = categories
      .map(function (c) {
        var icon = CATEGORY_ICONS[c] || "category";
        return '<button type="button" class="filter-btn" data-cat="' + c + '">' +
          '<span class="material-icons-outlined">' + icon + '</span>' +
          '<span>' + c + '</span>' +
          '</button>';
      })
      .join("");

    filterContainer.querySelectorAll(".filter-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectCategory(btn.getAttribute("data-cat"));
      });
    });
  }

  function renderSidebar() {
    var sidebar = document.getElementById("sidebarCats");
    if (!sidebar) return;
    sidebar.innerHTML = categories
      .map(function (c) {
        var icon = CATEGORY_ICONS[c] || "category";
        return '<button type="button" class="sidebar-cat-btn" data-cat="' + c + '">' +
          '<span class="material-icons-outlined">' + icon + '</span>' +
          '<span>' + c + '</span>' +
          '</button>';
      })
      .join("");

    sidebar.querySelectorAll(".sidebar-cat-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectCategory(btn.getAttribute("data-cat"));
      });
    });
  }

  function selectInitialCategory() {
    var urlCategory = new URLSearchParams(window.location.search).get("category");
    var target = urlCategory ? (categoryMap[urlCategory.toLowerCase()] || urlCategory) : "";
    var allBtns = document.querySelectorAll(".filter-btn, .sidebar-cat-btn");
    var found = false;
    if (target) {
      allBtns.forEach(function (btn) {
        if (btn.getAttribute("data-cat") === target) {
          selectCategory(target);
          found = true;
        }
      });
    }
    if (!found && allBtns.length) {
      selectCategory(allBtns[0].getAttribute("data-cat"));
    }
  }

  async function fetchProducts() {
    var selectedCountry = window.TaagerIntegration
      ? window.TaagerIntegration.getSelectedCountry()
      : null;
    var countryCode = selectedCountry ? selectedCountry.code : null;

    if (window.supabaseClient && typeof window.supabaseClient.fetchAllProductsWithTaager === "function") {
      try {
        allProducts = await window.supabaseClient.fetchAllProductsWithTaager(countryCode);
      } catch (error) {
        console.warn("failed fetching products with Taager", error);
        allProducts = window.BudaStore ? Object.values(window.BudaStore.getAllProducts()) : [];
      }
      var tc = {};
      allProducts.forEach(function (p) { if (p.source === "taager") tc[p.category || "(none)"] = (tc[p.category || "(none)"] || 0) + 1; });
      if (Object.keys(tc).length) console.log("[Products] Taager unique categories:", tc);
      renderFilters();
      renderSidebar();
      renderMegaMenu();
      selectInitialCategory();
      return;
    }

    if (window.supabaseClient && typeof window.supabaseClient.fetchAllProducts === "function") {
      try {
        allProducts = (await window.supabaseClient.fetchAllProducts()) || [];
      } catch (error) {
        console.warn("failed fetching products from supabase, fallback to local store", error);
        allProducts = window.BudaStore ? Object.values(window.BudaStore.getAllProducts()) : [];
      }

      if (window.TaagerIntegration) {
        var taagerProds = await window.TaagerIntegration.fetchTaagerProducts(countryCode);
        window.TaagerIntegration.mergeTaagerIntoStore(taagerProds);
        allProducts = allProducts.concat(taagerProds);
      }
    } else {
      allProducts = window.BudaStore ? Object.values(window.BudaStore.getAllProducts()) : [];
    }

    renderFilters();
    renderSidebar();
    renderMegaMenu();
    selectInitialCategory();
  }

  document.addEventListener("boda:country-changed", function () {
    fetchProducts();
  });

  fetchProducts();
  document.addEventListener("boda:wishlist-updated", () => {
    productsGrid.querySelectorAll("[data-wishlist]").forEach(function (btn) {
      var id = btn.getAttribute("data-wishlist");
      if (!id || !window.BudaStore) return;
      var active = window.BudaStore.isInWishlist(id);
      var icon = btn.querySelector(".material-icons-outlined");
      btn.classList.toggle("is-active", Boolean(active));
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      if (icon) icon.textContent = active ? "favorite" : "favorite_border";
    });
  });
});


