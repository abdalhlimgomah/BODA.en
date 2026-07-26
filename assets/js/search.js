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
    item.addEventListener("click", () => {
      const term = item.getAttribute("data-term") || "";
      inputEl.value = term;
      performSearch(term);
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

  // Add categories
  const categoriesList = [
    "ساعات", "موبايلات وملحقاتها", "إلكترونيات", "ملابس وأحذية", 
    "منتجات تجميل وعناية", "عطور", "منتجات رياضية", "منزل ومطبخ", 
    "ألعاب", "حيوانات أليفة", "مكتب ودراسة", "كتب ومجلات", "سيارات", "مجوهرات وإكسسوارات"
  ];
  categoriesList.forEach(c => _extractedKeywords.add(c));

  if (!_allSearchProducts || !_allSearchProducts.length) return;

  _allSearchProducts.forEach(p => {
    // Add brands
    if (p.brand) {
      _extractedKeywords.add(p.brand.trim());
    }
    if (p.category) {
      _extractedKeywords.add(p.category.trim());
    }

    const name = p.name || p.title || "";
    if (!name) return;

    // Extract meaningful phrases
    const words = name.split(/\s+/).filter(w => w.length > 2);
    
    if (words.length >= 2) {
      _extractedKeywords.add(words.slice(0, 2).join(" "));
    }
    if (words.length >= 3) {
      _extractedKeywords.add(words.slice(0, 3).join(" "));
    }
    if (p.brand && p.category) {
      _extractedKeywords.add(`${p.brand} ${p.category}`);
    }
  });
}

async function fetchSuggestions(term) {
  if (!term) return [];
  const suggestions = new Set();
  const normTerm = normalizeArabicText(term);

  // 1. Suggest exact category / synonym matches
  for (const [catName, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    if (normalizeArabicText(catName).includes(normTerm)) {
      suggestions.add(catName);
    }
    for (const syn of synonyms) {
      if (normalizeArabicText(syn).includes(normTerm)) {
        suggestions.add(syn);
      }
    }
  }

  // 2. Suggest matching phrases/words from extracted keywords
  const keywordList = Array.from(_extractedKeywords);
  for (const kw of keywordList) {
    if (suggestions.size >= 8) break;
    const normKw = normalizeArabicText(kw);
    // Prefer words starting with term
    if (normKw.startsWith(normTerm) || normKw.includes(" " + normTerm)) {
      suggestions.add(kw);
    }
  }

  // Fallback keyword scanning
  if (suggestions.size < 6) {
    for (const kw of keywordList) {
      if (suggestions.size >= 8) break;
      const normKw = normalizeArabicText(kw);
      if (normKw.includes(normTerm)) {
        suggestions.add(kw);
      }
    }
  }

  // Return max 6 unique suggestions
  return Array.from(suggestions).filter(val => val && val.length > 1).slice(0, 6);
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

  suggestionsEl.classList.remove("hidden");

  suggestionsEl.querySelectorAll("[data-value]").forEach((item) => {
    item.addEventListener("click", () => {
      const value = item.getAttribute("data-value") || "";
      inputEl.value = value;
      suggestionsEl.classList.add("hidden");
      performSearch(value);
    });
  });
}

// Variables for search results, filters and pagination
let _allSearchProducts = [];
let _currentSearchResults = [];
let _filteredSearchResults = [];
let _currentPage = 1;
const _PRODUCTS_PER_PAGE = 20;

// State for new sidebar filters
let _activeCategoryFilter = "الكل";
let _activeBrandFilter = "الكل";
let _activePriceFilter = null;

function renderSidebarFilters() {
  const catContainer = document.getElementById("category-filters");
  const brandContainer = document.getElementById("brand-filters");
  const priceSlider = document.getElementById('price-range-slider');
  const priceMaxDisplay = document.getElementById('price-max-display');

  if (!catContainer || !brandContainer || !priceSlider) return;

  const categories = { "الكل": _currentSearchResults.length };
  const brands = { "الكل": _currentSearchResults.length };
  let maxPrice = 0;

  _currentSearchResults.forEach(p => {
    const cat = p.category ? String(p.category).trim() : "أخرى";
    if (cat) categories[cat] = (categories[cat] || 0) + 1;

    const brand = p.brand ? String(p.brand).trim() : "";
    if (brand) brands[brand] = (brands[brand] || 0) + 1;

    const price = p.price || 0;
    if (price > maxPrice) maxPrice = price;
  });

  // Render Categories
  const sortedCategories = Object.keys(categories).filter(k => k !== "الكل").sort((a, b) => categories[b] - categories[a]);
  let catHtml = `<li><a href="#" class="active" data-category="الكل">الكل (${categories['الكل']})</a></li>`;
  sortedCategories.forEach(cat => {
    catHtml += `<li><a href="#" data-category="${escapeHtml(cat)}">${escapeHtml(cat)} (${categories[cat]})</a></li>`;
  });
  catContainer.innerHTML = catHtml;

  // Render Brands
  const sortedBrands = Object.keys(brands).filter(k => k !== "الكل").sort((a, b) => brands[b] - brands[a]);
  let brandHtml = `<li><a href="#" class="active" data-brand="الكل">الكل (${brands['الكل']})</a></li>`;
  sortedBrands.slice(0, 10).forEach(brand => { // Show top 10 brands
    brandHtml += `<li><a href="#" data-brand="${escapeHtml(brand)}">${escapeHtml(brand)} (${brands[brand]})</a></li>`;
  });
  brandContainer.innerHTML = brandHtml;

  // Setup Price Slider
  maxPrice = Math.ceil(maxPrice / 100) * 100; // Round up to nearest 100
  if (maxPrice > 0) {
    priceSlider.max = maxPrice;
    priceSlider.value = maxPrice;
    if (priceMaxDisplay) priceMaxDisplay.value = maxPrice;
    _activePriceFilter = maxPrice;
  }

  // Bind events
  catContainer.querySelectorAll('a').forEach(a => a.addEventListener('click', handleFilterChange));
  brandContainer.querySelectorAll('a').forEach(a => a.addEventListener('click', handleFilterChange));
  priceSlider.addEventListener('input', handlePriceSliderChange);
}

function handleFilterChange(e) {
  e.preventDefault();
  const target = e.currentTarget;
  const category = target.dataset.category;
  const brand = target.dataset.brand;

  if (category) {
    _activeCategoryFilter = category;
    document.querySelectorAll('#category-filters a').forEach(a => a.classList.remove('active'));
    target.classList.add('active');
  }

  if (brand) {
    _activeBrandFilter = brand;
    document.querySelectorAll('#brand-filters a').forEach(a => a.classList.remove('active'));
    target.classList.add('active');
  }

  applyAllFiltersAndRender();
}

function handlePriceSliderChange(e) {
  const priceMaxDisplay = document.getElementById('price-max-display');
  _activePriceFilter = Number(e.target.value);
  if (priceMaxDisplay) priceMaxDisplay.value = _activePriceFilter;
  
  // Debounce rendering for better performance
  clearTimeout(window._priceSliderTimeout);
  window._priceSliderTimeout = setTimeout(() => {
    applyAllFiltersAndRender();
  }, 250);
}

function applyAllFiltersAndRender() {
  _filteredSearchResults = _currentSearchResults.filter(p => {
    // Category filter
    if (_activeCategoryFilter !== "الكل") {
      const cat = p.category ? String(p.category).trim() : "أخرى";
      if (cat !== _activeCategoryFilter) return false;
    }

    // Brand filter
    if (_activeBrandFilter !== "الكل") {
      const brand = p.brand ? String(p.brand).trim() : "";
      if (brand !== _activeBrandFilter) return false;
    }

    // Price filter
    if (_activePriceFilter !== null) {
      const price = p.price || 0;
      if (price > _activePriceFilter) return false;
    }

    return true;
  });

  _currentPage = 1;
  renderResultsPage();
}

// Normalizes Arabic text to handle variations in letters
function normalizeArabicText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[أإآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ًٌٍَُِّْ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Light Arabic stemmer: strips plural suffixes, ال prefix, تاء مربوطة
function stemArabic(word) {
  var w = word.replace(/ات$/, "").replace(/ون$/, "").replace(/ين$/, "").replace(/ان$/, "").replace(/^ال/, "");
  // Also strip trailing ة/ه for تاء مربوطة normalization
  var w2 = w.replace(/[هة]$/, "");
  if (w2.length >= 2) w = w2;
  if (w.length < 2) w = word.replace(/^ال/, "");
  return w;
}

// Bilingual dictionary for common marketplace terms (Arabic ↔ English)
var BILINGUAL_DICT = {
  "ساعه":"watch", "ساعة":"watch", "ساعات":"watches", "ساعتين":"watches",
  "موبايل":"mobile", "موبيل":"mobile", "جوال":"mobile",
  "ايفون":"iphone", "اي فون":"iphone",
  "لاب توب":"laptop", "لابتوب":"laptop", "حاسوب":"computer", "كمبيوتر":"computer",
  "سماعه":"headphones", "سماعة":"headphones", "سماعات":"headphones",
  "شاحن":"charger",
  "حذاء":"shoes", "جزمة":"shoes", "كوتشي":"sneakers",
  "قميص":"shirt",
  "بنطلون":"pants", "بنطال":"pants",
  "فستان":"dress",
  "جاكيت":"jacket",
  "تيشرت":"t-shirt", "تي شيرت":"t-shirt",
  "طقم":"set",
  "عطر":"perfume",
  "ميك اب":"makeup", "ميكب":"makeup",
  "كريم":"cream",
  "عسل":"honey",
  "زيت":"oil",
  "ارز":"rice",
  "شاي":"tea",
  "قهوه":"coffee", "قهوة":"coffee",
  "سكر":"sugar",
  "ملح":"salt",
  "حليب":"milk",
  "جبنه":"cheese", "جبنة":"cheese",
  "خضار":"vegetables",
  "فواكه":"fruits",
  "لحم":"meat",
  "دجاج":"chicken",
  "سمك":"fish",
  "بيض":"eggs",
  "خبز":"bread",
  "ماء":"water", "مياة":"water",
  "عصير":"juice",
  "كوك":"coke", "كولا":"cola",
  "شوكولاته":"chocolate", "شوكولاتة":"chocolate",
  "حلوي":"candy", "حلوى":"candy",
  "بسكوت":"biscuit", "بسكويت":"biscuit",
  "كيك":"cake",
  "قهوة":"coffee", "قهوه":"coffee",
  "شنطه":"bag", "شنطة":"bag", "حقيبه":"bag", "حقيبة":"bag",
  "محفظه":"wallet", "محفظة":"wallet",
  "نضاره":"glasses", "نظارة":"glasses",
  "ساعه":"watch", "ساعة":"watch",
  "خاتم":"ring",
  "سلسله":"chain", "سلسلة":"chain",
  "اسواره":"bracelet", "سوار":"bracelet",
  "ذهب":"gold",
  "فضه":"silver", "فضة":"silver",
  "غرفه":"room", "غرفة":"room",
  "اثاث":"furniture", "أثاث":"furniture",
  "كرسي":"chair",
  "طاوله":"table", "طاولة":"table",
  "سرير":"bed",
  "خزانه":"cabinet", "خزانة":"cabinet",
  "ستاير":"curtains", "ستائر":"curtains",
  "سجاده":"rug", "سجادة":"rug",
  "لمبه":"lamp", "لمبة":"lamp",
  "ثلاجه":"fridge", "ثلاجة":"fridge",
  "غساله":"washer", "غسالة":"washer",
  "مكنسه":"vacuum", "مكنسة":"vacuum",
  "مكيف":"ac", "تكييف":"ac",
  "دفايه":"heater", "دفاية":"heater",
  "مروحه":"fan", "مروحة":"fan",
  "فرن":"oven",
  "ميكروويف":"microwave", "ميكرويف":"microwave",
  "خلاط":"blender",
  "غلايه":"kettle", "غلاية":"kettle",
  "محمصه":"toaster", "محمصة":"toaster",
  "كاميرا":"camera",
  "طابعه":"printer", "طابعة":"printer",
  "شاشه":"screen", "شاشة":"screen", "شاشات":"screens",
  "ماوس":"mouse",
  "كيبورد":"keyboard",
  "بطاريه":"battery", "بطارية":"battery",
  "تاب":"tablet", "تابلت":"tablet",
  "سماعه":"headphone", "سماعة":"headphone",
  "ميك":"mic", "ميكروفون":"microphone",
  "سيرفر":"server",
  "لعبه":"toy", "لعبة":"toy", "العاب":"toys", "ألعاب":"toys",
  "هديه":"gift", "هدية":"gift", "هدايا":"gifts",
  "ورق":"paper",
  "قلم":"pen",
  "دفتر":"notebook",
  "كتاب":"book",
  "مسطره":"ruler", "مسطرة":"ruler"
};

function getBilingualAlternatives(word) {
  var alts = [];
  // 1. Check hardcoded dictionary
  var stem = stemArabic(word);
  var keys = [word, stem].filter(function(k) { return k.length >= 2; });
  keys.forEach(function(k) {
    var val = BILINGUAL_DICT[k];
    if (val && alts.indexOf(val) < 0) alts.push(val);
    for (var ar in BILINGUAL_DICT) {
      if (BILINGUAL_DICT[ar] === k.toLowerCase() && alts.indexOf(ar) < 0) alts.push(ar);
    }
  });
  // 2. Check translation cache (populated by API)
  if (window.__transCache) {
    var cached = window.__transCache[word];
    if (cached) {
      cached.forEach(function(t) { if (alts.indexOf(t) < 0) alts.push(t); });
    }
  }
  return alts;
}

// Async translation via MyMemory API (free, no key needed)
// Results are cached so subsequent searches are instant
var __transCache = {};
var __transPending = {};

function fetchTranslation(word, fromLang, toLang) {
  if (__transPending[word]) return __transPending[word];
  if (__transCache[word]) return Promise.resolve(__transCache[word]);
  // Skip very short words and numbers
  if (word.length < 3 || /^[\d\s]+$/.test(word)) return Promise.resolve([]);
  __transPending[word] = new Promise(function(resolve) {
    var url = "https://api.mymemory.translated.net/get?q=" + encodeURIComponent(word) + "&langpair=" + fromLang + "|" + toLang + "&de=demo@example.com";
    var timeout = setTimeout(function() { resolve([]); delete __transPending[word]; }, 3000);
    fetch(url).then(function(r) { return r.json(); }).then(function(data) {
      clearTimeout(timeout);
      var results = [];
      if (data && data.responseData && data.responseData.translatedText) {
        var t = data.responseData.translatedText.trim().toLowerCase();
        if (t && t !== word.toLowerCase() && t.length >= 2) {
          results.push(t);
          // Also add individual words from phrase
          t.split(" ").forEach(function(w) { if (w.length >= 2 && results.indexOf(w) < 0) results.push(w); });
        }
      }
      __transCache[word] = results;
      delete __transPending[word];
      resolve(results);
    }).catch(function() {
      clearTimeout(timeout);
      delete __transPending[word];
      resolve([]);
    });
  });
  return __transPending[word];
}

function fetchTranslations(words) {
  var promises = [];
  words.forEach(function(w) {
    var isArabic = w.charCodeAt(0) > 127;
    var p = fetchTranslation(w, isArabic ? "ar" : "en", isArabic ? "en" : "ar");
    promises.push(p);
  });
  return Promise.all(promises);
}

// Skeleton loading for search results
function showSearchSkeleton() {
  var el = document.getElementById("search-results");
  if (!el) return;
  if (el.querySelector(".search-skeleton")) return;
  var html = '<div class="search-skeleton" style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:4px 0">';
  for (var i = 0; i < 6; i++) {
    html += '<div style="background:#F2F3F5;border-radius:14px;overflow:hidden;padding:10px">' +
      '<div class="skeleton" style="width:100%;aspect-ratio:3/4;border-radius:8px;margin-bottom:8px"></div>' +
      '<div class="skeleton" style="height:16px;width:80%;border-radius:4px;margin:0 auto 6px"></div>' +
      '<div class="skeleton" style="height:14px;width:50%;border-radius:4px;margin:0 auto"></div>' +
      '</div>';
  }
  html += '</div>';
  el.insertAdjacentHTML("afterbegin", html);
}

function hideSearchSkeleton() {
  var el = document.getElementById("search-results");
  if (!el) return;
  var sk = el.querySelector(".search-skeleton");
  if (sk) sk.remove();
}

// Preload all products (local store + Supabase/Taager)
async function loadAllSearchProducts() {
  try {
    // 1. Start with local store products as fast offline fallback
    if (window.BudaStore && typeof window.BudaStore.getAllProducts === "function") {
      _allSearchProducts = Object.values(window.BudaStore.getAllProducts()).filter(Boolean);
    }
    
    // 2. Fetch from Supabase + Taager if online
    const selectedCountry = window.TaagerIntegration ? window.TaagerIntegration.getSelectedCountry() : null;
    const countryCode = selectedCountry ? selectedCountry.code : null;

    if (window.supabaseClient && typeof window.supabaseClient.fetchAllProductsWithTaager === "function") {
      const remote = await window.supabaseClient.fetchAllProductsWithTaager(countryCode);
      if (remote && remote.length) {
        _allSearchProducts = remote;
      }
    } else if (window.fetchSupabaseProducts) {
      const remote = await window.fetchSupabaseProducts("");
      if (remote && remote.length) {
        _allSearchProducts = remote;
      }
    }

    // Extract search keywords index on startup
    extractKeywordsFromProducts();

  } catch (error) {
    console.warn("Error loading products for search index:", error);
  }
}

// Local robust search matching logic with category synonym expansion
function generateBilingualKeys(text) {
  if (!text) return [text || ""].filter(Boolean);
  var keys = [text];
  var latin = latinizeArabic(text);
  if (latin && latin !== text) keys.push(latin);
  var latinSoft = latinizeArabicSoft(text);
  if (latinSoft && latinSoft !== text && latinSoft !== latin) keys.push(latinSoft);
  var arabic = arabizeLatin(text);
  if (arabic && arabic !== text && arabic !== latin && arabic !== latinSoft) keys.push(arabic);
  return keys.filter(Boolean);
}

// Generate multiple latin forms of Arabic text for better cross-script matching
function latinizeArabic(text) {
  // Standard: و→w, ي→y
  var map = { "ا":"a","أ":"a","إ":"a","آ":"a","ب":"b","ت":"t","ث":"th","ج":"j","ح":"h","خ":"kh","د":"d","ذ":"dh","ر":"r","ز":"z","س":"s","ش":"sh","ص":"s","ض":"d","ط":"t","ظ":"z","ع":"a","غ":"gh","ف":"f","ق":"q","ك":"k","ل":"l","م":"m","ن":"n","ه":"h","و":"w","ي":"y","ة":"h","ى":"a","ئ":"a","ء":"a"," ":" " };
  return String(text).split("").map(function(c) { return map[c] || c; }).join("").replace(/\s+/g, " ").trim().toLowerCase();
}

function latinizeArabicSoft(text) {
  // Soft: و→o, ي→i, ج→g, ع→e, ق→k — matches common Arabic→English spellings
  var map = { "ا":"a","أ":"a","إ":"a","آ":"a","ب":"b","ت":"t","ث":"th","ج":"g","ح":"h","خ":"kh","د":"d","ذ":"z","ر":"r","ز":"z","س":"s","ش":"sh","ص":"s","ض":"d","ط":"t","ظ":"z","ع":"e","غ":"gh","ف":"f","ق":"k","ك":"k","ل":"l","م":"m","ن":"n","ه":"h","و":"o","ي":"i","ة":"h","ى":"a","ئ":"a","ء":"a"," ":" " };
  return String(text).split("").map(function(c) { return map[c] || c; }).join("").replace(/\s+/g, " ").trim().toLowerCase();
}

function arabizeLatin(text) {
  var map = { "a":"ا","b":"ب","t":"ت","th":"ث","j":"ج","h":"ح","kh":"خ","d":"د","dh":"ذ","r":"ر","z":"ز","s":"س","sh":"ش","c":"ك","ch":"تش","f":"ف","g":"ج","k":"ك","l":"ل","m":"م","n":"ن","p":"ب","q":"ق","w":"و","x":"كس","y":"ي" };
  var result = "", i = 0;
  text = String(text).toLowerCase();
  while (i < text.length) {
    var two = text.slice(i, i + 2);
    if (two === "sh" || two === "kh" || two === "dh" || two === "th" || two === "ch") { result += map[two] || two; i += 2; continue; }
    result += map[text[i]] || text[i]; i++;
  }
  return result.replace(/\s+/g, " ").trim();
}

function searchProductsLocal(query) {
  const normQuery = normalizeArabicText(query);
  if (!normQuery) return [];

  var words = normQuery.split(" ").filter(Boolean);
  if (!words.length) return [];

  // Find category synonyms
  var matchedCategories = [];
  for (var catName in CATEGORY_SYNONYMS) {
    var synonyms = CATEGORY_SYNONYMS[catName];
    for (var si = 0; si < synonyms.length; si++) {
      var normSyn = normalizeArabicText(synonyms[si]);
      for (var wi = 0; wi < words.length; wi++) {
        if (normSyn.indexOf(words[wi]) >= 0 || words[wi].indexOf(normSyn) >= 0) {
          matchedCategories.push(catName);
          si = synonyms.length; break;
        }
      }
    }
  }

  return _allSearchProducts.filter(function(product) {
    // Category synonym match
    if (product.category) {
      var prodCatNorm = normalizeArabicText(product.category);
      for (var mc = 0; mc < matchedCategories.length; mc++) {
        if (prodCatNorm.indexOf(normalizeArabicText(matchedCategories[mc])) >= 0) return true;
      }
    }

    // Build product text
    var fields = [product.name, product.title, product.description, product.category, product.brand, product.type];
    if (Array.isArray(product.tags)) { for (var t = 0; t < product.tags.length; t++) fields.push(product.tags[t]); }
    if (Array.isArray(product.categories)) { for (var c = 0; c < product.categories.length; c++) fields.push(product.categories[c]); }
    var rawText = fields.filter(Boolean).join(" ");
    var arabicText = normalizeArabicText(rawText);
    var latinStd = latinizeArabic(rawText.substring(0, 500));
    var latinSoft = latinizeArabicSoft(rawText.substring(0, 500));

    // Check every query word
    for (var wi = 0; wi < words.length; wi++) {
      var word = words[wi];
      if (!matchWord(word, arabicText, latinStd, latinSoft)) return false;
    }
    return true;
  });
}

function matchWord(word, arabicText, latinStd, latinSoft) {
  // Collect all variations of this word
  var vars = [word];
  // Morphological (singular/plural)
  if (word.endsWith("ات")) { addVar(vars, word.slice(0, -2) + "ه"); addVar(vars, word.slice(0, -2)); }
  if (word.endsWith("ون") || word.endsWith("ين") || word.endsWith("ان")) addVar(vars, word.slice(0, -2));
  if (word.endsWith("ه") || word.endsWith("ة")) { addVar(vars, word.slice(0, -1) + "ات"); addVar(vars, word.slice(0, -1)); }
  // Bilingual alternatives
  var alts = getBilingualAlternatives(word);
  for (var ai = 0; ai < alts.length; ai++) addVar(vars, alts[ai]);

  // Check all variations against Arabic text
  for (var vi = 0; vi < vars.length; vi++) {
    if (vars[vi] && arabicText.indexOf(vars[vi]) >= 0) return true;
  }

  // Direct Latin match
  var wl = word.toLowerCase();
  if (latinStd.indexOf(wl) >= 0 || latinSoft.indexOf(wl) >= 0) return true;

  // Bilingual variations against Latin text
  for (var vi = 0; vi < vars.length; vi++) {
    if (vars[vi] !== word) {
      var vl = vars[vi] ? vars[vi].toLowerCase() : "";
      if (vl && (latinStd.indexOf(vl) >= 0 || latinSoft.indexOf(vl) >= 0)) return true;
    }
  }

  // Latinize Arabic word and check
  if (word.charCodeAt(0) > 127) {
    var ws = latinizeArabic(word);
    var wo = latinizeArabicSoft(word);
    if (ws && (latinStd.indexOf(ws) >= 0 || latinSoft.indexOf(ws) >= 0)) return true;
    if (wo && wo !== ws && (latinStd.indexOf(wo) >= 0 || latinSoft.indexOf(wo) >= 0)) return true;
  }

  return false;
}

function addVar(arr, v) { if (v && v.length >= 2 && arr.indexOf(v) < 0) arr.push(v); }

// Render dynamic category filter chips based on matching products
function renderCategoryFilters() {
  const filterContainer = document.getElementById("search-filter-container");
  if (!filterContainer) return;

  const counts = {};

  
  _currentSearchResults.forEach(p => {
    const cat = p.category ? String(p.category).trim() : "أخرى";
    counts[cat] = (counts[cat] || 0) + 1;
  });

  const categories = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

    if (categories.length <= 1) {
    filterContainer.classList.add("hidden");
    return;
  }

  filterContainer.classList.remove("hidden");

  let html = `<button type="button" class="filter-btn${_currentCategoryFilter === "الكل" ? " active" : ""}" data-category="الكل">
    <span>الكل</span> <small style="opacity:0.75; margin-right:4px;">(${_currentSearchResults.length})</small>
  </button>`;

  categories.forEach(cat => {
    html += `<button type="button" class="filter-btn${_currentCategoryFilter === cat ? " active" : ""}" data-category="${escapeHtml(cat)}">
      <span>${escapeHtml(cat)}</span> <small style="opacity:0.75; margin-right:4px;">(${counts[cat]})</small>
    </button>`;
  });

  filterContainer.innerHTML = html;

  filterContainer.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.getAttribute("data-category");
      _currentCategoryFilter = cat;
      _currentPage = 1;
      
      filterContainer.querySelectorAll(".filter-btn").forEach(b => {
        b.classList.toggle("active", b.getAttribute("data-category") === cat);
      });

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

// Render paginated search results
function renderResultsPage() {
  const resultsEl = document.getElementById("search-results");
  if (!resultsEl) return;
  hideSearchSkeleton();

  const start = (_currentPage - 1) * _PRODUCTS_PER_PAGE;
  const pageItems = (_filteredSearchResults || []).slice(start, start + _PRODUCTS_PER_PAGE);

  if (!pageItems.length) {
    resultsEl.innerHTML = '<div class="search-empty-state">لا توجد نتائج مطابقة في هذا القسم.</div>';
    renderPagination(_filteredSearchResults.length);
    return;
  }

  let html = '<div class="noon-grid">';
  for (let i = 0; i < pageItems.length; i++) {
    html += typeof buildProductCard === "function" ? buildProductCard(pageItems[i]) : "<div>product</div>";
  }
  html += '</div>';
  resultsEl.innerHTML = html;

  if (typeof attachProductCardEvents === "function") {
    attachProductCardEvents(resultsEl);
  }

  renderPagination(_filteredSearchResults.length);
}

// Render pagination navigation controls
function renderPagination(total) {
  const paginationEl = document.getElementById("pagination");
  if (!paginationEl) return;

  const totalPages = Math.ceil(total / _PRODUCTS_PER_PAGE);
  if (totalPages <= 1) {
    paginationEl.innerHTML = "";
    return;
  }

  const parts = [];

  parts.push('<button type="button" class="page-btn page-nav" data-page="1"' + (_currentPage === 1 ? ' disabled' : '') + '>«</button>');
  parts.push('<button type="button" class="page-btn page-nav" data-page="' + (_currentPage - 1) + '"' + (_currentPage === 1 ? ' disabled' : '') + '>‹</button>');

  const rangeStart = Math.max(1, _currentPage - 2);
  const rangeEnd = Math.min(totalPages, _currentPage + 2);

  if (rangeStart > 1) {
    parts.push('<button type="button" class="page-btn" data-page="1">1</button>');
    if (rangeStart > 2) {
      parts.push('<span class="page-ellipsis">...</span>');
    }
  }

  for (let p = rangeStart; p <= rangeEnd; p++) {
    parts.push('<button type="button" class="page-btn' + (p === _currentPage ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>');
  }

  if (rangeEnd < totalPages) {
    if (rangeEnd < totalPages - 1) {
      parts.push('<span class="page-ellipsis">...</span>');
    }
    parts.push('<button type="button" class="page-btn" data-page="' + totalPages + '">' + totalPages + '</button>');
  }

  parts.push('<button type="button" class="page-btn page-nav" data-page="' + (_currentPage + 1) + '"' + (_currentPage === totalPages ? ' disabled' : '') + '>›</button>');
  parts.push('<button type="button" class="page-btn page-nav" data-page="' + totalPages + '"' + (_currentPage === totalPages ? ' disabled' : '') + '>»</button>');

  paginationEl.innerHTML = parts.join("");

  paginationEl.querySelectorAll(".page-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      _currentPage = parseInt(btn.getAttribute("data-page"), 10);
      renderResultsPage();
      const resultsEl = document.getElementById("search-results");
      if (resultsEl) {
        window.scrollTo({ top: resultsEl.offsetTop - 80, behavior: "smooth" });
      }
    });
  });
}

// Global wrapper to prevent errors if called from external components
window.renderProductsInContainer = function(container, products) {
  _currentSearchResults = products || [];
  _currentCategoryFilter = "الكل";
  _currentPage = 1;
  renderCategoryFilters();
  applyCategoryFilterAndRender();
};

async function performSearch(query) {
  const resultsEl = document.getElementById("search-results");
  if (!resultsEl) return;
  const layoutEl = document.querySelector('.search-page-layout');

  const term = normalizeTerm(query);
  if (!term) {
    clearResults();
    setHistoryVisibility(true);
    renderSearchHistory();
    const filterContainer = document.getElementById("search-filter-container");
    if (filterContainer) filterContainer.classList.add("hidden");
    const paginationEl = document.getElementById("pagination");
    if (paginationEl) paginationEl.innerHTML = "";
    if (layoutEl) layoutEl.classList.remove('results-visible');
    return;
  }

  hideSuggestions();
  setHistoryVisibility(false);
  saveSearchHistory(term);
  renderSearchHistory();

  if (!_allSearchProducts.length) {
    showSearchSkeleton();
    await loadAllSearchProducts();
  }

  // Initial search (instant, uses dictionary + morphological)
  _currentSearchResults = searchProductsLocal(term);
  _currentCategoryFilter = "الكل";
  _currentPage = 1;

  // Background translation via API for better results (non-blocking)
  var apiWords = normalizeArabicText(term).split(" ").filter(Boolean);
  var _searchTermAtFetch = term;
  fetchTranslations(apiWords).then(function() {
    if (_searchTermAtFetch !== normalizeTerm(document.getElementById("search-input")?.value || document.getElementById("buda-header-search-input")?.value || "")) return;
    var enriched = searchProductsLocal(term);
    if (enriched.length > (_currentSearchResults || []).length) {
      _currentSearchResults = enriched;
      _currentCategoryFilter = "الكل";
      _currentPage = 1;
      hideSearchSkeleton();
      renderSidebarFilters();
      applyAllFiltersAndRender();
      if (layoutEl) layoutEl.classList.add('results-visible');
    }
  });

  if (!_currentSearchResults.length) {
    hideSearchSkeleton();
    resultsEl.innerHTML = '<div class="search-empty-state">لا توجد نتائج مطابقة لهذا البحث.</div>';
    const filterContainer = document.getElementById("search-filter-container");
    if (filterContainer) filterContainer.classList.add("hidden");
    const paginationEl = document.getElementById("pagination");
    if (paginationEl) paginationEl.innerHTML = "";
    if (layoutEl) layoutEl.classList.remove('results-visible');
    return;
  }

  renderSidebarFilters();
  applyAllFiltersAndRender();
  if (layoutEl) layoutEl.classList.add('results-visible');
}

document.addEventListener("DOMContentLoaded", () => {
  var mobileInput = document.getElementById("search-input");
  var desktopInput = document.getElementById("buda-header-search-input");
  // Pick the visible input
  var inputEl = mobileInput || desktopInput;
  if (mobileInput && desktopInput && mobileInput !== desktopInput) {
    var mobileHidden = mobileInput.offsetParent === null;
    var desktopHidden = desktopInput.offsetParent === null;
    if (desktopHidden && !mobileHidden) inputEl = mobileInput;
    else if (mobileHidden && !desktopHidden) inputEl = desktopInput;
    // Sync values between both
    mobileInput.addEventListener("input", function () { desktopInput.value = mobileInput.value; });
    desktopInput.addEventListener("input", function () { mobileInput.value = desktopInput.value; });
  }
  const clearBtn = document.getElementById("clear-button");
  const searchBtn = document.getElementById("search-button");
  const suggestionsEl = document.getElementById("suggestions");

  if (!inputEl) return;

  // Attach keydown to both inputs
  function attachSearchKeydown(el) {
    if (!el) return;
    el.addEventListener("keydown", function (event) {
      if (event.key !== "Enter") return;
      event.preventDefault();
      _suppressSuggestions = true;
      if (suggestionsEl) {
        suggestionsEl.innerHTML = "";
        suggestionsEl.classList.add("hidden");
      }
      setHistoryVisibility(false);
      performSearch(el.value).finally(function () {
        _suppressSuggestions = false;
      });
    });
  }
  attachSearchKeydown(mobileInput);
  attachSearchKeydown(desktopInput);

  // Load search index immediately
  loadAllSearchProducts();

  // Check for ?q= query param from search redirect with Enter key
  var urlParams = new URLSearchParams(window.location.search);
  var queryFromUrl = normalizeTerm(urlParams.get("q") || "");
  inputEl.value = queryFromUrl ? queryFromUrl : "";
  localStorage.removeItem("lastSearch");

  renderSearchHistory();
  setHistoryVisibility(true);
  clearResults();

  if (queryFromUrl) {
    performSearch(queryFromUrl);
  }

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

  inputEl.addEventListener("input", () => {
    const term = normalizeTerm(inputEl.value);
    renderSuggestions(term);
    toggleClear();

    if (term) {
      setHistoryVisibility(false);
      return;
    }

    hideSuggestions();
    clearResults();
    renderSearchHistory();
    setHistoryVisibility(true);
    const filterContainer = document.getElementById("search-filter-container");
    if (filterContainer) filterContainer.classList.add("hidden");
    const paginationEl = document.getElementById("pagination");
    if (paginationEl) paginationEl.innerHTML = "";
  });

  inputEl.addEventListener("blur", () => {
    setTimeout(() => suggestionsEl?.classList.add("hidden"), 160);
  });

  clearBtn?.addEventListener("click", () => {
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
    const filterContainer = document.getElementById("search-filter-container");
    if (filterContainer) filterContainer.classList.add("hidden");
    const paginationEl = document.getElementById("pagination");
    if (paginationEl) paginationEl.innerHTML = "";
  });

  searchBtn?.addEventListener("click", () => {
    _suppressSuggestions = true;
    if (suggestionsEl) {
      suggestionsEl.innerHTML = "";
      suggestionsEl.classList.add("hidden");
    }
    setHistoryVisibility(false);
    performSearch(inputEl.value).finally(() => {
      _suppressSuggestions = false;
    });
  });

  toggleClear();
});
