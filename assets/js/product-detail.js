console.log("[PD] version=20260703f");

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const id = (sel) => document.getElementById(sel);
const qp = (key) => new URLSearchParams(window.location.search).get(key);
const esc = (v) => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");

function money(v, plain) {
  return window.BudaStore ? window.BudaStore.formatMoney(v, {minimumFractionDigits:2,maximumFractionDigits:2,plain:plain}) : (Number(v)||0).toFixed(2);
}

function safeImg(path) {
  const fb = window.BudaStore?.DEFAULT_PRODUCT_IMAGE || (location.pathname.indexOf("/pages/")>=0?"../assets/images/unnamed.png":"assets/images/unnamed.png");
  let r = window.BudaStore?.getImagePath ? window.BudaStore.getImagePath(path) : path || fb;
  if (/^\s*javascript:/i.test(String(r||""))) r = (window.BudaStore?.getImagePath ? window.BudaStore.getImagePath(fb) : fb);
  if (typeof r==="string" && r.indexOf("media.taager.com")>=0 && window.TAAGER_EDGE_FUNCTION_URL) {
    r = window.TAAGER_EDGE_FUNCTION_URL + "?action=proxy-image&url=" + encodeURIComponent(r);
  }
  return r;
}

function fbImg() { return "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="; }

function notify(msg, type) {
  msg = String(msg||"").trim(); if (!msg) return;
  if (window.BudaUI?.notify) try { window.BudaUI.notify(msg,{type,target:"#product-status"}); } catch(e) {}
  const els = [id("product-status"),id("pd-inline-status")].filter(Boolean);
  if (!els.length) return;
  els.forEach(el => { el.textContent=msg; el.classList.remove("hidden","error","success","info"); el.classList.add("status-note",type==="error"?"error":type==="success"?"success":"info"); });
}

function getRating(product) {
  const r = window.BudaStore?.resolveProductRating?.(product);
  return r ? {rating:r.rating||0,count:r.reviewCount||0} : {rating:0,count:0};
}

function stars(v) {
  if (window.BudaStore?.renderProductStars) return window.BudaStore.renderProductStars(v);
  const r = Math.max(0,Math.min(5,Number(v)||0));
  const f = Math.floor(r), h = r-f>=0.5?1:0, e = 5-f-h;
  return [...Array(f).fill("star"),...Array(h).fill("star_half"),...Array(e).fill("star_border")].map(i=>`<span class="material-icons-outlined">${i}</span>`).join("");
}

function parsePrice(product) {
  let base = Number(product?.price)||0;
  if (window.BudaStore?.resolveProductPrice) {
    const r = window.BudaStore.resolveProductPrice(product);
    base = r.currentPrice>0 ? r.currentPrice : base;
    let sell = base;
    if (window.PricingEngine?.tiersLoaded) sell = window.PricingEngine.calculate(base);
    return {cur:sell,orig:r.originalPrice>sell?r.originalPrice:sell};
  }
  let v = Number(product?.price)||0;
  if (window.PricingEngine?.tiersLoaded) v = window.PricingEngine.calculate(v);
  return {cur:v,orig:v};
}

function splitField(v) {
  if (Array.isArray(v)) return v.flatMap(x=>splitField(x));
  const s = String(v||"").trim(); if (!s) return [];
  if (/^data:image\//i.test(s)||/^(https?:|blob:)/i.test(s)) return [s.replace(/^['"]|['"]$/g,"")];
  if ((s.startsWith("[")&&s.endsWith("]"))||(s.startsWith("{")&&s.endsWith("}"))) try { const p=JSON.parse(s); if (Array.isArray(p)) return p.flatMap(x=>splitField(x)); } catch(e) {}
  if (/[;\n\r|]/.test(s)) return s.split(/[;\n\r|]+/g).map(x=>x.trim().replace(/^['"]|['"]$/g,"")).filter(Boolean);
  if (s.includes(",")) return s.split(/\s*,\s*/g).map(x=>x.trim().replace(/^['"]|['"]$/g,"")).filter(Boolean);
  return [s.replace(/^['"]|['"]$/g,"")];
}

function getImages(product) {
  const slots = [product?.image,product?.image1,product?.image2,product?.image3,product?.image4,product?.image5,product?.image6,product?.image7,product?.image8,
    product?.image_1,product?.image_2,product?.image_3,product?.image_4,product?.image_5,product?.image_6,product?.image_7,product?.image_8]
    .flatMap(v=>splitField(v)).map(p=>safeImg(p)).filter(Boolean);
  const uniq = []; const seen = new Set();
  slots.forEach(p=>{if(!seen.has(p)){seen.add(p);uniq.push(p);}});
  return uniq.length ? uniq : (window.BudaStore?.getProductImages ? window.BudaStore.getProductImages(product).map(p=>safeImg(p)) : [safeImg(product?.image)]);
}

function getVideos(product) {
  const v = product?.videos; if (!Array.isArray(v)) return [];
  return v.map(x=>String(x||"").trim()).filter(Boolean);
}

// ========== RENDERERS ==========

function renderName(product) {
  const el = $("[data-product-title]");
  if (el) el.textContent = product?.name || "منتج";
}

function renderPrice(product) {
  const p = parsePrice(product);
  const cur = p.cur, orig = p.orig;
  const priceEl = $("[data-product-price]");
  const origEl = $("[data-product-original]");
  const discEl = $("[data-product-discount]");
  const noteEl = id("pd-price-note");
  if (priceEl) priceEl.innerHTML = window.BudaStore ? window.BudaStore.formatMoney(cur,{minimumFractionDigits:2,maximumFractionDigits:2}) : money(cur,true);
  if (origEl) { origEl.textContent = orig ? money(orig,true) : ""; origEl.style.display = orig&&orig>cur?"inline":"none"; }
  if (discEl) {
    const hd = orig&&orig>cur;
    if (hd) { const pct=Math.round(((orig-cur)/orig)*100); discEl.textContent="-"+pct+"%"; discEl.style.display="inline-flex"; }
    else discEl.style.display="none";
  }
  if (noteEl) { noteEl.style.display=orig&&orig>cur?"block":"none"; noteEl.textContent="السعر شامل ضريبة القيمة المضافة"; }
  const sticky = id("pd-sticky-price");
  if (sticky) sticky.innerHTML = window.BudaStore ? window.BudaStore.formatMoney(cur,{minimumFractionDigits:2,maximumFractionDigits:2}) : money(cur,true);
}

function renderBrand(product) {
  const el = id("pd-brand");
  if (el) el.textContent = product?.brand || product?.brand_name || product?.vendor || "";
}

function renderNudges(product) {
  const el = id("pd-nudges"); if (!el) return;
  let h = "";
  if (product?.express||product?.noon_express||product?.isExpress) h+='<span class="pd-nudge pd-nudge-blue"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>توصيل سريع</span>';
  if (product?.free_shipping||product?.freeShipping) h+='<span class="pd-nudge"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12H19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12 5L12 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>توصيل مجاني</span>';
  if (product?.bestseller||product?.bestSeller||product?.best_seller) h+='<span class="pd-nudge pd-nudge-hot">الأكثر مبيعاً</span>';
  el.innerHTML = h;
}

function renderSales(product) {
  const el = id("pd-sold"); if (!el) return;
  const s = product?.sales_count||product?.sold||product?.sales||0;
  el.textContent = Number(s)>0 ? "أكثر من "+Number(s)+" تم بيعها" : "";
}

function renderVariants(product) {
  const c = id("pd-variants"); if (!c) return;
  const v = product?.variants||product?.options||product?.variant_options||[];
  if (!Array.isArray(v)||v.length<2) { c.innerHTML=""; return; }
  let h = '<span class="pd-variant-label">اختر النوع:</span>';
  v.forEach((x,i)=>{ const n=typeof x==="string"?x:(x.name||x.label||x.value||""); if(n) h+=`<button type="button" class="pd-variant-btn${i===0?" active":""}" data-vi="${i}">${esc(n)}</button>`; });
  if (h==='<span class="pd-variant-label">اختر النوع:</span>') { c.innerHTML=""; return; }
  c.innerHTML = h;
  c.addEventListener("click",function(e){ const b=e.target.closest(".pd-variant-btn"); if(!b)return; c.querySelectorAll(".pd-variant-btn").forEach(x=>x.classList.remove("active")); b.classList.add("active"); });
}

function renderHighlights(product) {
  const grid = id("pd-overview-grid"), sec = id("pd-overview-section"), more = id("pd-overview-more");
  if (!grid) return;
  const keys = ["highlights","specifications","specs","features","attributes","key_features","keyFeatures"];
  let items = [];
  for (const k of keys) {
    const v = product?.[k]; if (!v) continue;
    if (Array.isArray(v)) { items=v.filter(Boolean).map(String); break; }
    if (typeof v==="object") { items=Object.values(v).filter(Boolean).map(String); break; }
    if (typeof v==="string") {
      items=v.split("\n").filter(Boolean).map(s=>s.replace(/^[-•*]\s*/,"").trim()).filter(Boolean);
      if (items.length>=2) break;
      items=v.split(/[،,]/).filter(Boolean).map(s=>s.trim()).filter(Boolean);
      if (items.length>=2) break;
    }
  }
  if (items.length<2) { if(sec)sec.style.display="none"; return; }
  if (sec) sec.style.display="";
  const icons = ["star","verified","flash_on","sell","new_releases","local_offer","auto_awesome","check_circle","done_all","trending_up"];
  let h = "";
  const limit = 4;
  items.slice(0,8).forEach((x,i)=>{ h+=`<div class="pd-overview-item${i>=limit?' pd-ov-hidden" style="display:none;"':'"'}><span class="material-icons-outlined">${icons[i%icons.length]}</span><span>${esc(x)}</span></div>`; });
  grid.innerHTML = h;
  if (items.length>limit && more) { more.style.display="block"; more.onclick=function(){ grid.querySelectorAll(".pd-ov-hidden").forEach(e=>e.style.display="flex"); more.style.display="none"; }; }
  else if (more) more.style.display="none";
}

function renderSpecs(product) {
  const table = id("pd-spec-table"), empty = id("pd-spec-empty");
  if (!table) return;
  const fields = [
    {k:"sku",l:"رمز المنتج"},{k:"model",l:"الموديل"},{k:"brand",l:"العلامة التجارية"},{k:"brand_name",l:"العلامة التجارية"},{k:"category",l:"الفئة"},
    {k:"color",l:"اللون"},{k:"material",l:"الخامة"},{k:"weight",l:"الوزن"},{k:"dimensions",l:"الأبعاد"},{k:"country_of_origin",l:"بلد المنشأ"},
    {k:"warranty",l:"الضمان"},{k:"guarantee",l:"الضمان"},{k:"size",l:"المقاس"},{k:"style",l:"النمط"},{k:"gender",l:"الجنس"},
  ];
  const rows = [];
  fields.forEach(f=>{ const v=product?.[f.k]; if(v&&String(v).trim()){ if(f.k==="brand_name"&&product?.brand)return; rows.push({l:f.l,v:String(v).trim()}); }});
  const ci = product?.content_ideas||""; if(ci) rows.push({l:"أفكار للمحتوى",v:ci});
  if (!rows.length) { table.innerHTML=""; if(empty)empty.style.display="block"; return; }
  if(empty)empty.style.display="none";
  table.innerHTML = rows.map(r=>"<tr><td>"+esc(r.l)+"</td><td>"+esc(r.v)+"</td></tr>").join("");
}

function renderDescription(product) {
  const el = id("pd-desc-text"); if (!el) return;
  const desc = product?.description||"", quick = product?.quick_details||"";
  const full = quick ? quick+(desc?"\n\n"+desc:"") : desc;
  el.textContent = full || "لا يوجد وصف متاح لهذا المنتج.";
  const btn = id("pd-desc-toggle"); if (!btn) return;
  let clamped = true;
  if (el.textContent.length>200 || (el.scrollHeight>el.clientHeight && el.offsetHeight<el.scrollHeight)) {
    el.classList.add("pd-desc-clamp"); btn.style.display="block";
    btn.onclick=function(){ if(clamped){ el.classList.remove("pd-desc-clamp"); btn.textContent="عرض أقل"; } else { el.classList.add("pd-desc-clamp"); btn.textContent="عرض المزيد"; } clamped=!clamped; };
  } else btn.style.display="none";
}

function renderSeller(product) {
  const name = id("pd-seller-name"), meta = id("pd-seller-meta"), btn = id("pd-seller-btn");
  if (!name) return;
  const s = product?.seller||product?.vendor||product?.brand||"المتجر";
  name.textContent = String(s);
  const m = []; if(product?.seller_rating) m.push("تقييم "+product.seller_rating); if(product?.seller_orders) m.push(product.seller_orders+" طلب"); if(product?.seller_satisfaction) m.push(product.seller_satisfaction+"% رضا");
  if(meta) meta.innerHTML = m.length ? m.join(" • ") : "";
  if(btn) btn.onclick=function(){ window.location.href="products.html?seller="+encodeURIComponent(String(s)); };
}

function renderGallery(product, images) {
  const main = id("pd-gv-img"), thumbsC = id("pd-gallery-thumbs"), dotsC = id("pd-gallery-dots"), badge = id("pd-gv-badge");
  if (!main) return;
  const fb = fbImg();
  const list = images.length ? images : [safeImg(product?.image)];
  if (badge) {
    const p = parsePrice(product);
    if (p.orig>p.cur) { const pct=Math.round(((p.orig-p.cur)/p.orig)*100); badge.textContent="-"+pct+"%"; badge.style.display="flex"; }
    else badge.style.display="none";
  }
  let vp = null;
  function vpEl() { if(!vp){ vp=document.createElement("div"); vp.className="pd-gv-video"; vp.style.display="none"; const gv=id("pd-gv"); if(gv)gv.appendChild(vp); } return vp; }
  const isVid = s => typeof s==="string" && s.indexOf("__video__")===0;
  const vidUrl = s => s?s.replace("__video__",""):"";
  function embedVid(url) {
    const v = vpEl(); main.style.display="none";
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
    if (m) v.innerHTML='<iframe src="https://www.youtube.com/embed/'+encodeURIComponent(m[1])+'?autoplay=1" frameborder="0" allowfullscreen allow="autoplay"></iframe>';
    else v.innerHTML='<video controls autoplay preload="metadata" onerror="this.style.display=\'none\';this.parentNode.innerHTML=\'<div style=\\"padding:40px;text-align:center;color:#999;\\">الفيديو غير متاح حالياً</div>\'"><source src="'+url+'" type="video/mp4"></video>';
    v.style.display="";
  }
  function show(idx) {
    const src = list[idx]||list[0]||fb;
    if (vp) vp.style.display="none";
    if (isVid(src)) { main.style.display="none"; embedVid(vidUrl(src)); return; }
    main.style.display=""; main.style.opacity="0"; main.src=src;
    let retries=0;
    main.onload=()=>main.style.opacity="1";
    main.onerror=function(){ if(retries++<1){ const t=main.src; main.src=""; setTimeout(()=>main.src=t,1500); return; } main.onerror=null; main.src=fb; main.style.opacity="1"; };
    thumbsC?.querySelectorAll(".pd-gallery-thumb").forEach((el,i)=>el.classList.toggle("active",i===idx));
    dotsC?.querySelectorAll(".pd-gallery-dot").forEach((el,i)=>el.classList.toggle("active",i===idx));
  }
  let cur = 0;
  function setActive(i) { cur=Math.max(0,Math.min(i,list.length-1)); show(cur); }
  show(0);
  if (list.length>1) {
    if (thumbsC) {
      thumbsC.innerHTML = list.map((src,i)=>{
        const v = isVid(src); const ts = v?fb:src;
        return `<button type="button" class="pd-gallery-thumb${i===0?" active":""}" data-gi="${i}">${v?'<span class="pd-thumb-play-icon"><span class="material-icons-outlined">play_arrow</span></span>':""}<img src="${ts}" alt="${v?"فيديو":"صورة المنتج"}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${fb}'" /></button>`;
      }).join("");
      thumbsC.addEventListener("click",function(e){ const b=e.target.closest(".pd-gallery-thumb"); if(b)setActive(Number(b.getAttribute("data-gi"))); });
    }
    if (dotsC) {
      dotsC.innerHTML = list.map((_,i)=>`<button class="pd-gallery-dot${i===0?" active":""}" data-gi="${i}" aria-label="الصورة ${i+1}"></button>`).join("");
      dotsC.addEventListener("click",function(e){ const d=e.target.closest(".pd-gallery-dot"); if(d)setActive(Number(d.getAttribute("data-gi"))); });
    }
  } else { if(thumbsC)thumbsC.innerHTML=""; if(dotsC)dotsC.innerHTML=""; }
  const gv = id("pd-gv"); if(gv) gv.onclick=function(){ if(vp&&vp.style.display!=="none")return; openLightbox(list,cur); };
  window.__pdGalleryImages = list;
  window.__pdGalleryIdx = function(){return cur;};
}

function renderVideos(product) {
  const sec = id("pd-videos-section"), c = id("pd-videos-container");
  if (!sec||!c) return;
  const vids = getVideos(product);
  if (!vids.length) { sec.style.display="none"; return; }
  sec.style.display="";
  c.innerHTML = vids.map((url,i)=>{
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
    if (m) return '<div class="pd-video-item"><iframe src="https://www.youtube.com/embed/'+encodeURIComponent(m[1])+'" frameborder="0" allowfullscreen loading="lazy"></iframe></div>';
    return '<div class="pd-video-item"><video controls preload="metadata" onerror="this.style.display=\'none\';this.parentNode.innerHTML=\'<div class=\\"pd-video-error\\">الفيديو غير متاح حالياً</div>\'"><source src="'+url+'" type="video/mp4"></video></div>';
  }).join("");
}

function renderSubGallery(images) {
  const sec = id("pd-subg-section"), c = id("pd-sub-gallery");
  if (!sec||!c) return;
  const extra = images.slice(1).filter(s=>typeof s==="string"&&s.indexOf("__video__")!==0);
  if (!extra.length) { sec.style.display="none"; return; }
  sec.style.display="";
  c.innerHTML = extra.map((src,i)=>'<div class="pd-subg-item"><img src="'+src+'" alt="صورة المنتج" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-lb="'+(i+1)+'" onerror="this.style.display=\'none\'" /></div>').join("");
  c.addEventListener("click",function(e){ const img=e.target.closest("img"); if(img&&img.hasAttribute("data-lb"))openLightbox(images,Number(img.getAttribute("data-lb"))); });
}

function openLightbox(imgs, idx) {
  const lb = id("pd-lightbox"), img = id("pd-lb-img"), c = id("pd-lb-counter"), prev = id("pd-lb-prev"), next = id("pd-lb-next");
  if (!lb||!img||!imgs?.length) return;
  const only = imgs.filter(s=>typeof s!=="string"||s.indexOf("__video__")!==0); if(!only.length)return;
  let i = Math.max(0,Math.min(idx||0,only.length-1));
  function showImg(){ img.src=only[i]; if(c)c.textContent=(i+1)+" / "+only.length; if(prev)prev.style.display=only.length>1?"flex":"none"; if(next)next.style.display=only.length>1?"flex":"none"; }
  showImg(); lb.classList.add("open"); document.body.style.overflow="hidden";
  const close=function(){lb.classList.remove("open");document.body.style.overflow="";};
  id("pd-lb-close").onclick=close; lb.onclick=function(e){if(e.target===lb)close();};
  if(prev)prev.onclick=function(){i=(i-1+only.length)%only.length;showImg();};
  if(next)next.onclick=function(){i=(i+1)%only.length;showImg();};
  const kb=function(e){if(e.key==="Escape"){close();document.removeEventListener("keydown",kb);}if(e.key==="ArrowRight"){i=(i-1+only.length)%only.length;showImg();e.preventDefault();}if(e.key==="ArrowLeft"){i=(i+1)%only.length;showImg();e.preventDefault();}};
  document.addEventListener("keydown",kb);
}

function renderRating(product, comments, rows) {
  const starsEl=id("pd-stars"), link=id("pd-review-link"), avgEl=id("pd-rating-avg"), cntEl=id("pd-comments-count"),
    sumStars=id("pd-rating-stars"), sumTotal=id("pd-rating-total"), bars=id("pd-rating-bars");
  const snap = getRating(product);
  const avg = snap.rating, count = snap.count, cc = comments?.length||0;
  if(starsEl)starsEl.innerHTML=stars(avg||0);
  if(link){link.textContent=count?"("+count+")":"(0)";link.href="product-reviews.html?id="+encodeURIComponent(String(product?.id||""));}
  if(avgEl)avgEl.textContent=avg?avg.toFixed(1):"0.0";
  if(sumStars)sumStars.innerHTML=stars(avg||0);
  if(sumTotal)sumTotal.textContent=count?count+" من التقييمات":"";
  if(cntEl)cntEl.textContent=String(cc);
  if(bars&&rows?.length){
    const dist=[0,0,0,0,0]; rows.forEach(r=>{const v=Number(r.rating)||0;if(v>=1&&v<=5)dist[5-v]++;});
    const total=dist.reduce((s,n)=>s+n,0)||1;
    bars.innerHTML=dist.map((n,i)=>'<div class="pd-rating-bar"><span class="pd-rating-bar-label">'+(5-i)+'</span><div class="pd-rating-bar-track"><div class="pd-rating-bar-fill" style="width:'+Math.round((n/total)*100)+'%"></div></div><span class="pd-rating-bar-pct">'+Math.round((n/total)*100)+'%</span></div>').join("");
  } else if(bars) bars.innerHTML='<div class="pd-rating-bar" style="justify-content:center;color:#94a3b8;font-size:0.8rem;">لا توجد تقييمات بعد</div>';
  const filter=id("pd-rating-filter"); if(filter){
    let fh='<button class="pd-rating-filter-btn active" data-rf="all">الكل</button>';
    for(let f=5;f>=1;f--) fh+='<button class="pd-rating-filter-btn" data-rf="'+f+'">'+f+' نجوم</button>';
    filter.innerHTML=fh;
    filter.addEventListener("click",function(e){const b=e.target.closest(".pd-rating-filter-btn");if(!b)return;filter.querySelectorAll(".pd-rating-filter-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");const val=b.getAttribute("data-rf");const filtered=val==="all"?comments:(Array.isArray(comments)?comments.filter(c=>c.rating===Number(val)):[]);renderCommentsList(filtered,{limit:3,source:comments});});
  }
}

function renderCommentsList(comments, opts) {
  const el=id("pd-comments"); if(!el)return;
  const src=Array.isArray(comments)?comments:[];
  if(!src.length){el.innerHTML='<div class="pd-comment-empty">لا توجد تعليقات بعد. كن أول من يقيّم هذا المنتج.</div>';return;}
  const limit=Math.max(0,Number(opts?.limit)||0);
  const sorted=[].concat(src).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const visible=limit>0?sorted.slice(0,limit):sorted;
  el.innerHTML=visible.map(c=>{const d=c.createdAt?new Date(c.createdAt).toLocaleDateString("ar-EG"):"";return '<article class="pd-comment"><div class="pd-comment-head"><strong class="pd-comment-author">'+esc(c.name||"عميل")+'</strong><span class="pd-comment-date">'+d+'</span></div><div class="pd-stars">'+stars(c.rating||0)+'</div><p class="pd-comment-body">'+esc(c.text||"")+'</p></article>';}).join("");
}

function renderAllReviewsBtn(productId, count) {
  const w=id("pd-view-all-wrap"), b=id("pd-view-all-btn"); if(!w||!b)return;
  const show=Number(count||0)>3&&String(productId||"").trim()!=="";
  w.style.display=show?"flex":"none";
  if(show) b.onclick=function(){window.location.href="product-reviews.html?id="+encodeURIComponent(String(productId));};
}

function syncRating(product, comments) {
  if (!product?.id) return;
  product.rating=Math.max(0,Math.min(5,Number(product.rating)||0));
  product.reviewCount=Math.max(0,Math.round(Number(product.reviewCount)||0));
  product.ratingSource="ratings"; product.rating_source="ratings"; product.hasSupabaseRatings=true;
  product.reviews=comments; product.comments=comments;
  window._supabaseProductCache=window._supabaseProductCache||{}; window._supabaseProductCache[String(product.id)]=product;
  document.dispatchEvent(new CustomEvent("boda:products-updated",{detail:{productId:product.id}}));
}

function bindActions(product) {
  const btns=["pd-btn-cart","pd-sticky-btn"].map(x=>id(x)).filter(Boolean);
  const wbtns=["pd-btn-wish","pd-sticky-wish"].map(x=>id(x)).filter(Boolean);
  const pid=String(product.id);
  btns.forEach(b=>b.addEventListener("click",function(){window.BudaStore.addToCart(product,1);window.BudaStore.updateCartCount();if(window.BudaUI)window.BudaUI.refreshShell();}));
  function sync(){const s=window.BudaStore?.isInWishlist?window.BudaStore.isInWishlist(pid):false;wbtns.forEach(b=>{b.classList.toggle("is-active",Boolean(s));b.setAttribute("aria-pressed",s?"true":"false");const i=b.querySelector(".material-icons-outlined");if(i)i.textContent=s?"favorite":"favorite_border";});}
  sync();
  wbtns.forEach(b=>b.addEventListener("click",function(){const s=window.BudaStore.toggleWishlist(pid);wbtns.forEach(x=>{x.classList.toggle("is-active",Boolean(s));x.setAttribute("aria-pressed",s?"true":"false");const i=x.querySelector(".material-icons-outlined");if(i)i.textContent=s?"favorite":"favorite_border";});notify(s?"تمت الإضافة إلى المفضلة.":"تمت الإزالة من المفضلة.","info");}));
  document.addEventListener("boda:wishlist-updated",sync);
}

function buildCard(product) {
  const p=parsePrice(product), hd=p.orig>p.cur, dp=hd?Math.round(((p.orig-p.cur)/p.orig)*100):0;
  const ri=getRating(product), imgs=getImages(product), fb=fbImg(), pid=String(product.id);
  const wl=window.BudaStore?.isInWishlist?window.BudaStore.isInWishlist(pid):false;
  let gi="", dh="";
  imgs.forEach(function(src,i){
    gi+='<img class="noon-gallery-img'+(i===0?" active":"")+'" src="'+src+'" alt="'+esc(product.name)+'" loading="lazy" onerror="this.onerror=null;this.src=\''+fb+'\'" />';
    if(imgs.length>1) dh+='<span'+(i===0?' class="active"':"")+' data-index="'+i+'"></span>';
  });
  var r = '<article class="noon-product-card">';
  r += '<div class="noon-product-media-wrap">';
  r += '<button class="icon-btn noon-wishlist-btn '+(wl?"is-active":"")+'" data-card-wishlist="'+pid+'" aria-label="إضافة إلى المفضلة" aria-pressed="'+(wl?"true":"false")+'">';
  r += '<span class="material-icons-outlined" style="font-size:18px;">'+(wl?"favorite":"favorite_border")+'</span></button>';
  r += '<button class="noon-product-media" type="button" data-card-view="'+pid+'">'+gi;
  r += '<span class="noon-img-dots">'+dh+'</span></button>';
  r += '<button class="noon-add-square" type="button" data-card-add="'+pid+'" aria-label="إضافة إلى السلة">+</button>';
  r += '</div>';
  r += '<div class="noon-product-body">';
  r += '<h3 class="noon-title">'+esc(product.name)+'</h3>';
  if (ri.count>0) r += '<div class="noon-rating-pill"><span class="noon-rating-stars">★</span> <span>'+ri.rating.toFixed(1)+'</span> <span class="noon-rating-count">('+ri.count+')</span></div>';
  r += '<div class="noon-price-line">';
  r += '<p class="noon-price">'+money(p.cur)+'</p>';
  if (hd) r += '<p class="noon-old-price">'+money(p.orig)+'</p>';
  if (hd) r += '<span class="noon-discount-pill">'+dp+'%</span>';
  r += '</div></div></article>';
  return r;
}

function renderHSection(cid, products, pmap) {
  const c=id(cid); if(!c)return;
  if(!products?.length){c.innerHTML="";const s=c.closest(".pd-section");if(s)s.style.display="none";return;}
  c.innerHTML=products.map(p=>buildCard(p)).join("");
  const dd={isDown:false,moved:false};
  enableDragScroll(c,dd);
  c.querySelectorAll("[data-card-view]").forEach(b=>b.addEventListener("click",function(e){if(dd.moved){e.preventDefault();e.stopPropagation();return;}if(e.target.closest(".noon-img-dots"))return;const p=b.getAttribute("data-card-view");const s=pmap.get(String(p));if(s)try{sessionStorage.setItem("selectedProduct",encodeURIComponent(JSON.stringify(s)));}catch(e){}window.location.href="product.html?id="+encodeURIComponent(p);}));
  c.addEventListener("click",function(e){const d=e.target.closest(".noon-img-dots span");if(!d)return;e.preventDefault();e.stopPropagation();const dots=d.parentNode,imgs=dots.parentNode.querySelectorAll(".noon-gallery-img"),idx=parseInt(d.getAttribute("data-index"),10);if(isNaN(idx))return;dots.querySelectorAll("span").forEach(s=>s.classList.remove("active"));imgs.forEach(i=>i.classList.remove("active"));if(imgs[idx])imgs[idx].classList.add("active");if(dots.children[idx])dots.children[idx].classList.add("active");});
  c.querySelectorAll("[data-card-add]").forEach(b=>b.addEventListener("click",function(){const p=b.getAttribute("data-card-add"),pr=pmap.get(String(p))||(window.BudaStore?window.BudaStore.getProductById(p):null);if(!pr)return;window.BudaStore.addToCart(pr,1);window.BudaStore.updateCartCount();if(window.BudaUI)window.BudaUI.refreshShell();}));
  c.querySelectorAll("[data-card-wishlist]").forEach(b=>b.addEventListener("click",function(){const p=b.getAttribute("data-card-wishlist");if(!p)return;const s=window.BudaStore.toggleWishlist(p);b.classList.toggle("is-active",Boolean(s));b.setAttribute("aria-pressed",s?"true":"false");const i=b.querySelector(".material-icons-outlined");if(i)i.textContent=s?"favorite":"favorite_border";notify(s?"تمت الإضافة إلى المفضلة.":"تمت الإزالة من المفضلة.","info");}));
  syncWishButtons(c);
}

function syncWishButtons(container) {
  if(!container)return;
  container.querySelectorAll("[data-card-wishlist]").forEach(b=>{const p=b.getAttribute("data-card-wishlist"),s=window.BudaStore?.isInWishlist?window.BudaStore.isInWishlist(p):false;b.classList.toggle("is-active",Boolean(s));b.setAttribute("aria-pressed",s?"true":"false");const i=b.querySelector(".material-icons-outlined");if(i)i.textContent=s?"favorite":"favorite_border";});
}

function enableDragScroll(container, dd) {
  let startX=0,scrollLeft=0;
  if(container.classList.contains("dragging"))return;
  container.addEventListener("mousedown",function(e){dd.isDown=true;dd.moved=false;container.classList.add("dragging");startX=e.pageX-container.offsetLeft;scrollLeft=container.scrollLeft;});
  container.addEventListener("mouseleave",function(){dd.isDown=false;container.classList.remove("dragging");});
  container.addEventListener("mouseup",function(){dd.isDown=false;container.classList.remove("dragging");});
  container.addEventListener("mousemove",function(e){if(!dd.isDown)return;e.preventDefault();const x=e.pageX-container.offsetLeft,walk=(x-startX)*1.5;container.scrollLeft=scrollLeft-walk;if(Math.abs(walk)>5)dd.moved=true;});
  const cs=container.closest(".pd-carousel");if(!cs)return;
  const prev=cs.querySelector(".pd-carousel-prev"),next=cs.querySelector(".pd-carousel-next");
  if(!prev||!next)return;
  function update(){const as=container.scrollLeft<=2,ae=container.scrollLeft>=container.scrollWidth-container.clientWidth-2;prev.classList.toggle("visible",!as);next.classList.toggle("visible",!ae);}
  container.addEventListener("scroll",update);setTimeout(update,100);
  function scrollBy(d){const cards=container.querySelectorAll(".noon-product-card");if(!cards.length)return;container.scrollBy({left:d*(cards[0].offsetWidth+10),behavior:"smooth"});}
  prev.addEventListener("click",function(){scrollBy(-1);});next.addEventListener("click",function(){scrollBy(1);});
}

function scoreSimilar(current, all) {
  const cid=String(current.id), cp=Number(current.price)||0, cn=String(current.name||"").toLowerCase(), cw=cn.split(/[\s,;\-_()]+/).filter(w=>w.length>1);
  const scored=[];
  all.forEach(item=>{
    if(!item||String(item.id)===cid)return;
    let score=0; const ip=Number(item.price)||0, iname=String(item.name||"").toLowerCase();
    if(cp>0&&ip>0){const r=Math.min(cp,ip)/Math.max(cp,ip);if(r>=0.3)score+=Math.round(r*20);}
    const iw=iname.split(/[\s,;\-_()]+/).filter(w=>w.length>1), seen={};
    let shared=0;
    cw.forEach(w=>{for(let k=0;k<iw.length;k++){if(w===iw[k]&&!seen[w]){seen[w]=true;shared++;break;}}});
    score+=shared*20;
    if(shared===0&&cw.length>0&&iw.length>0){cw.forEach(w=>{for(let k=0;k<iw.length;k++){if(w.length>3&&iw[k].length>3&&(w.indexOf(iw[k])!==-1||iw[k].indexOf(w)!==-1)){score+=10;break;}}});}
    if(score>0)scored.push({item,score});
  });
  scored.sort((a,b)=>b.score-a.score);
  return scored.length ? scored.slice(0,15).map(s=>s.item) : [];
}

function renderSimilar(current, all) {
  let products=scoreSimilar(current,all);
  if(!products.length){const fb=all.filter(p=>p&&String(p.id)!==String(current.id));fb.sort(()=>Math.random()-0.5);products=fb.slice(0,15);}
  const pmap=new Map(products.map(p=>[String(p.id),p]));
  renderHSection("pd-similar",products,pmap);
}

function renderMoreSimilar(current, all) {
  const used=new Set([String(current.id)]);
  document.querySelectorAll("#pd-similar [data-card-view]").forEach(b=>{if(b)used.add(b.getAttribute("data-card-view"));});
  let products=scoreSimilar(current,all).filter(p=>!used.has(String(p.id))).slice(0,10);
  if(!products.length){const fb=all.filter(p=>p&&!used.has(String(p.id)));fb.sort(()=>Math.random()-0.5);products=fb.slice(0,10);}
  if(!products.length){const s=id("pd-more-section");if(s)s.style.display="none";return;}
  const s=id("pd-more-section");if(s)s.style.display="";
  const pmap=new Map(products.map(p=>[String(p.id),p]));
  renderHSection("pd-more",products,pmap);
}

function renderMayLike(current, all) {
  const used=new Set([String(current.id)]);
  document.querySelectorAll("[data-card-view]").forEach(b=>{if(b)used.add(b.getAttribute("data-card-view"));});
  const cat=String(current.category||"").toLowerCase();
  const others=all.filter(p=>p&&!used.has(String(p.id))).filter(p=>String(p.category||"").toLowerCase()!==cat);
  others.sort(()=>Math.random()-0.5);
  const products=others.slice(0,10);
  const pmap=new Map(products.map(p=>[String(p.id),p]));
  renderHSection("pd-maylike",products,pmap);
}

function renderRecommended(current, all) {
  const used=new Set([String(current.id)]);
  document.querySelectorAll("[data-card-view]").forEach(b=>{if(b)used.add(b.getAttribute("data-card-view"));});
  const rest=all.filter(p=>p&&!used.has(String(p.id)));rest.sort(()=>Math.random()-0.5);
  const products=rest.slice(0,10);
  const pmap=new Map(products.map(p=>[String(p.id),p]));
  renderHSection("pd-rec",products,pmap);
}

function renderFreqBought(product, all) {
  const sec=id("pd-together-section"),c=id("pd-together");if(!sec||!c)return;
  const cat=String(product.category||"").toLowerCase();
  let related=all.filter(p=>p&&String(p.id)!==String(product.id)&&cat&&String(p.category||"").toLowerCase()===cat);
  for(let i=related.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=related[i];related[i]=related[j];related[j]=t;}
  const picks=related.slice(0,2);
  if(!picks.length){sec.style.display="none";return;}
  sec.style.display="";
  let total=Number(product.price)||0;
  const imgs=getImages(product);
  let h='<div class="pd-together-items"><div class="pd-together-item"><img src="'+(imgs[0]||fbImg())+'" alt="" loading="lazy" /><div class="pd-together-item-info"><p class="pd-together-item-name">'+esc(product.name)+'</p><p class="pd-together-item-price">'+money(product.price)+'</p></div></div>';
  picks.forEach(p=>{const pi=getImages(p);total+=Number(p.price)||0;h+='<div class="pd-together-item" data-tog-id="'+String(p.id)+'"><img src="'+(pi[0]||fbImg())+'" alt="" loading="lazy" /><div class="pd-together-item-info"><p class="pd-together-item-name">'+esc(p.name)+'</p><p class="pd-together-item-price">'+money(p.price)+'</p></div></div>';});
  h+='</div><div class="pd-together-total"><div><span class="pd-together-total-label">المجموع</span><br/><span class="pd-together-total-price">'+money(total)+'</span></div><button class="pd-together-btn" id="pd-together-btn">أضف الكل إلى السلة</button></div>';
  c.innerHTML=h;
  id("pd-together-btn").onclick=function(){window.BudaStore.addToCart(product,1);picks.forEach(p=>window.BudaStore.addToCart(p,1));window.BudaStore.updateCartCount();if(window.BudaUI)window.BudaUI.refreshShell();notify("تمت إضافة المنتجات إلى السلة","success");};
}

// ========== DATA LOADING ==========

async function loadProduct(id) {
  if (!id) return null;
  // Taager products
  if (String(id).startsWith("taager_")) {
    const local = window.BudaStore?.getProductById?.(id);
    if (local) return local;
    try {
      const base = window.TAAGER_EDGE_FUNCTION_URL || "";
      if (base) {
        const res = await fetch(base + "?action=get-product&id=" + encodeURIComponent(id));
        if (res.ok) {
          const data = await res.json();
          if (data?.id) {
            if (window.addProductToStore) window.addProductToStore(data);
            return data;
          }
        }
      }
    } catch (e) { console.warn("get-product fetch failed", e); }
    return null;
  }
  // Regular products
  let record = null;
  try {
    let resp = await window.supabaseClient.from("products").select("*").eq("id",String(id)).limit(1);
    if (!resp.error && resp.data?.length) record = resp.data[0];
    if (!record && /^\d+$/.test(String(id))) {
      resp = await window.supabaseClient.from("products").select("*").eq("id",Number(id)).limit(1);
      if (!resp.error && resp.data?.length) record = resp.data[0];
    }
    if (!record && typeof window.supabaseClient.fetchAllProducts==="function") {
      const pool = (await window.supabaseClient.fetchAllProducts())||[];
      record = pool.find(p=>String(p.id)===String(id))||null;
    }
  } catch (e) { console.warn("supabase lookup failed", e); }
  if (!record) return null;
  if (window.addProductToStore) window.addProductToStore(record);
  const norm = window.BudaStore?.getProductById ? window.BudaStore.getProductById(record.id)||null : null;
  return norm ? {...record,...norm} : record;
}

function readStored(id) {
  try {
    const s = sessionStorage.getItem("selectedProduct");
    if (!s) return null;
    let p = null;
    try { p=JSON.parse(decodeURIComponent(s)); } catch(e) { p=JSON.parse(s); }
    if (!p) return null;
    if (id && String(p.id)!==String(id)) return null;
    return p;
  } catch(e) { return null; }
}

function persistProduct(p) {
  if (!p) return;
  try { sessionStorage.setItem("selectedProduct",encodeURIComponent(JSON.stringify(p))); } catch(e) {}
}

function setLoading(v) { document.body?.classList.toggle("product-detail-loading",Boolean(v)); }

function showMissing(msg) {
  const page=document.querySelector(".pd-page"); if(!page)return;
  page.querySelectorAll(".pd-section, .pd-content").forEach(s=>{if(s.id!=="pd-missing-state")s.style.display="none";});
  const t=String(msg||"تعذر تحميل بيانات المنتج الآن.").trim();
  const ex=id("pd-missing-state");
  if(ex){ex.style.display="";const e=ex.querySelector(".pd-comment-empty");if(e)e.textContent=t;return;}
  const el=document.createElement("div");el.id="pd-missing-state";el.className="pd-section";el.style.padding="20px";
  el.innerHTML='<div class="pd-comment-empty">'+esc(t)+'</div>';page.appendChild(el);
}

// ========== MAIN ==========

function buildGallery(product, imgs) {
  const vids = product?.videos||[];
  if (Array.isArray(vids)&&vids.length) {
    for (let i=0;i<vids.length;i++) {
      const v=String(vids[i]||"").trim();
      if (v) return imgs.concat(["__video__"+v]);
    }
  }
  return imgs;
}

async function getAllProducts() {
  const local = window.BudaStore ? Object.values(window.BudaStore.getAllProducts()) : [];
  const hasTaager = window.TaagerIntegration?.fetchTaagerProducts;
  const hasSupabase = window.supabaseClient?.fetchAllProducts;
  if (!hasTaager&&!hasSupabase) return local;
  try {
    const selectedCountry = window.TaagerIntegration?.getSelectedCountry?.();
    const countryCode = selectedCountry?.code||null;
    let remote = [];
    if (hasSupabase) remote = (await window.supabaseClient.fetchAllProducts())||[];
    if (hasTaager) { const tp=await window.TaagerIntegration.fetchTaagerProducts(countryCode); window.TaagerIntegration.mergeTaagerIntoStore(tp); remote=remote.concat(tp); }
    const map = new Map();
    [...local,...remote].forEach(p=>{if(p&&typeof p.id!=="undefined"&&p.id!==null)map.set(String(p.id),p);});
    return [...map.values()];
  } catch(e) { return local; }
}

async function fetchRatings(id) {
  if (!id||!window.supabaseClient?.from) return {ratings:[],comments:[],average:0,total:0};
  if (String(id).startsWith("taager_")) return {ratings:[],comments:[],average:0,total:0};
  try {
    const {data,error} = await window.supabaseClient.from("ratings").select("*").eq("item_id",String(id)).order("created_at",{ascending:false});
    if (error) return {ratings:[],comments:[],average:0,total:0};
    const list = Array.isArray(data)?data:[];
    const comments = list.map(r=>({id:String(r?.id||""),name:(r?.reviewer_name||r?.name||r?.user_name||"عميل"),rating:Number(r?.rating)||0,text:String(r?.comment||"").trim(),createdAt:r?.created_at||new Date().toISOString()})).filter(c=>c.id&&c.rating>0&&c.text);
    const vals = list.map(r=>Number(r.rating)||0).filter(v=>v>0);
    const avg = vals.length ? Number((vals.reduce((s,v)=>s+v,0)/vals.length).toFixed(1)) : 0;
    return {ratings:list,comments,average:avg,total:vals.length};
  } catch(e) { return {ratings:[],comments:[],average:0,total:0}; }
}

async function resolveProduct() {
  const id = qp("id");
  let product = null;
  // Try local store first
  if (id) product = window.BudaStore?.getProductById?.(id)||null;
  // Try session
  const stored = readStored(id);
  if (stored) product = product ? {...product,...stored} : stored;
  // Try remote for Taager
  if (id && String(id).startsWith("taager_")) {
    const remote = await loadProduct(id);
    if (remote) product = remote;
  } else if (id && (!product||getImages(product).length<=1)) {
    const remote = await loadProduct(id);
    if (remote) product = product ? {...product,...remote} : remote;
  }
  // Fallback: no id, try first product
  if (!product&&!id) product = Object.values(window.BudaStore?.getAllProducts?.()||{})[0]||null;
  // Normalize
  if (product && window.BudaStore?.normalizeProductRecord) {
    const n = window.BudaStore.normalizeProductRecord(product);
    if (n) product = {...product,...n};
  }
  persistProduct(product);
  return product;
}

async function renderProductDetail() {
  setLoading(true);
  try {
    if (!window.BudaStore) { showMissing("تعذر تحميل بيانات المنتج الآن. حاول مرة أخرى."); notify("تعذر تحميل بيانات المنتج الآن. حاول مرة أخرى.","error"); return; }
    const product = await resolveProduct();
    if (!product) { showMissing("تعذر العثور على المنتج المطلوب."); notify("تعذر العثور على المنتج المطلوب.","error"); return; }
    console.log("[PD] product resolved:", product?.name, product?.price);

    // Render basics
    renderName(product);
    renderPrice(product);
    renderBrand(product);
    renderNudges(product);
    renderSales(product);
    renderVariants(product);
    renderHighlights(product);
    renderSpecs(product);
    renderDescription(product);
    renderSeller(product);

    // Gallery
    const imgs = getImages(product);
    const galleryImgs = buildGallery(product, imgs);
    renderGallery(product, galleryImgs);

    // Videos
    renderVideos(product);

    // Sub gallery
    renderSubGallery(imgs);

    // Actions
    bindActions(product);

    // Ratings
    const ratings = await fetchRatings(product.id);
    product.rating=ratings.average; product.reviewCount=ratings.total;
    product.ratingSource="ratings"; product.rating_source="ratings"; product.hasSupabaseRatings=true;
    const comments = Array.isArray(ratings.comments)?[...ratings.comments]:[];
    const ratingRows = Array.isArray(ratings.ratings)?[...ratings.ratings]:[];
    renderRating(product, comments, ratingRows);
    renderCommentsList(comments,{limit:3});
    renderAllReviewsBtn(product.id, comments.length);
    syncRating(product, comments);

    // Related products
    const pool = await getAllProducts();
    renderSimilar(product, pool);
    renderMoreSimilar(product, pool);
    renderMayLike(product, pool);
    renderRecommended(product, pool);
    renderFreqBought(product, pool);

    // Wishlist sync
    document.addEventListener("boda:wishlist-updated",function(){["pd-similar","pd-more","pd-maylike","pd-rec"].forEach(function(i){syncWishButtons(document.getElementById(i));});});
  } catch (e) {
    console.error("[PD] render failed", e);
    showMissing("تعذر تحميل بيانات المنتج الآن. حاول مرة أخرى.");
    notify("تعذر تحميل بيانات المنتج الآن. حاول مرة أخرى.","error");
  } finally {
    setLoading(false);
  }
}

document.addEventListener("DOMContentLoaded", renderProductDetail);
