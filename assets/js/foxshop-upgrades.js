/* FoxShop additive upgrades: advanced filtering, recommendations, account sync, review UX and quiz v2. */
(() => {
  'use strict';
  if (window.__FOXSHOP_UPGRADES__) return;
  window.__FOXSHOP_UPGRADES__ = true;

  const LS_WISH = 'foxshop_wishlist_v1';
  const LS_CART = 'foxshop_cart_data';
  const LS_RECENT = 'foxshop_recent_v1';
  const LS_QUIZ = 'foxshop_quiz_v1';
  const safe = value => typeof window.escapeHtml === 'function' ? window.escapeHtml(value) : String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fa = value => { try { return Number(value || 0).toLocaleString('fa-IR'); } catch (_) { return String(value || 0); } };
  const money = value => `${fa(Math.round(Number(value) || 0))} تومان`;

  function products() { return Array.isArray(window.products) ? window.products : []; }
  function getProduct(id) { const k=String(id ?? ''); return products().find(p=>String(p?.id)===k) || null; }
  function details(p) { return p?.details || {}; }
  function brandOf(p) { const direct=String(details(p).brand||'').trim(); if(direct) return direct; const m=String(p?.name||'').match(/(Royal Canin|GimCat|Schesir|Wanpy|Van Cat|Smart Paw|رویال کنین|جیم کت|شسیر|وانپی|ون کت)/i); return m?m[1]:''; }
  function list(key) { try { const v=JSON.parse(localStorage.getItem(key)||'[]'); return Array.isArray(v)?v.map(String).filter(Boolean):[]; } catch (_) { return []; } }
  function saveList(key, value) { try { localStorage.setItem(key, JSON.stringify([...new Set(value.map(String))])); } catch (_) {} }
  function productUrl(p) { return `product.html?id=${encodeURIComponent(String(p.id))}`; }
  function textBlob(p) { const d=details(p); return `${p?.name||''} ${p?.shortDesc||''} ${d.brand||''} ${d.goals||''} ${d.suitableAge||''} ${Array.isArray(d.tags)?d.tags.join(' '):String(d.tags||'')} ${d.ingredients||''}`.toLowerCase(); }
  function normalize(value) { return String(value ?? '').toLowerCase().replace(/ي/g,'ی').replace(/ك/g,'ک').replace(/\s+/g,' ').trim(); }

  function rememberViewed(id) {
    const key=String(id||''); if(!key) return;
    const current=list(LS_RECENT).filter(x=>x!==key); current.unshift(key); saveList(LS_RECENT,current.slice(0,10));
  }

  function recommendationScore(p, seed) {
    if(!p) return -99999;
    const d=details(p), seedD=details(seed);
    let score=0;
    if(seed && String(p.categoryId)===String(seed.categoryId)) score+=32;
    if(seed && brandOf(p) && brandOf(seed) && normalize(brandOf(p))===normalize(brandOf(seed))) score+=26;
    const pTags=Array.isArray(d.tags)?d.tags.map(normalize):[];
    const sTags=Array.isArray(seedD.tags)?seedD.tags.map(normalize):[];
    if(pTags.length && sTags.length) score += sTags.filter(t=>pTags.includes(t)).length*7;
    const pGoals=normalize(d.goals), sGoals=normalize(seedD.goals);
    if(pGoals && sGoals && pGoals.split(/[,،\s]+/).some(x=>x && sGoals.includes(x))) score+=10;
    if(Number(p.isBestSeller)) score+=5;
    if(Number(p.isFeatured)) score+=3;
    if(Number(p.stockStatus)!==0 && p.stockStatus!=='out_of_stock') score+=3;
    if(seed && Number(seed.finalPrice)>0 && Number(p.finalPrice)>0) {
      const ratio=Number(p.finalPrice)/Number(seed.finalPrice);
      if(ratio>=0.65 && ratio<=1.35) score+=8;
    }
    const recent=list(LS_RECENT);
    if(recent.includes(String(p.id))) score+=6;
    return score;
  }

  function recommendationProducts(seed=null, limit=4) {
    const all=products().filter(p=>p && p.stockStatus!=='out_of_stock');
    const wish=list(LS_WISH), cart=(()=>{try{return JSON.parse(localStorage.getItem(LS_CART)||'[]')}catch(_){return[]}})();
    const seeds=[];
    if(seed) seeds.push(seed);
    for(const id of wish.slice(0,3)) { const p=getProduct(id); if(p) seeds.push(p); }
    for(const item of Array.isArray(cart)?cart.slice(0,3):[]) { const p=getProduct(item?.id); if(p) seeds.push(p); }
    let quiz=null; try { quiz=JSON.parse(localStorage.getItem(LS_QUIZ)||'null'); } catch(_){ quiz=null; }
    return all.map(p=>{
      let score=0;
      for(const s of seeds) score+=recommendationScore(p,s);
      const blob=textBlob(p);
      if(quiz?.age==='kitten' && /kitten|بچه.?گربه/.test(blob)) score+=20;
      if(quiz?.age==='senior' && /senior|سال.?بالا|مسن/.test(blob)) score+=20;
      if(quiz?.sterilized==='yes' && /steril|عقیم/.test(blob)) score+=15;
      if(quiz?.need && quiz.need!=='none') {
        const map={urinary:/urinary|ادراری|urine/,hairball:/hairball|مالت|گلوله.?مو/,sensitive:/sensitive|حساس|گوارش/,weight:/weight|وزن|چاق/};
        if(map[quiz.need]?.test(blob)) score+=22;
      }
      return {p,score};
    }).sort((a,b)=>b.score-a.score || Number(b.p.isBestSeller)-Number(a.p.isBestSeller) || Number(a.p.finalPrice)-Number(b.p.finalPrice))
      .slice(0,limit).map(x=>x.p);
  }

  function card(p) {
    const x=details(p), wished=list(LS_WISH).includes(String(p.id));
    const discount=Number(p.discountPercent)||((Number(p.originalPrice)>Number(p.finalPrice))?Math.round((1-Number(p.finalPrice)/Number(p.originalPrice))*100):0);
    return `<article class="fox-upgrade-card product-card-item"><div class="fox-upgrade-card-media"><a href="${productUrl(p)}"><img src="${safe(p.image||'')}" alt="${safe(p.name)}" loading="lazy" decoding="async"></a>${discount>0?`<span class="fox-upgrade-discount">${fa(discount)}٪ تخفیف</span>`:''}<button type="button" class="fox-upgrade-heart ${wished?'is-active':''}" onclick="toggleWishlist('${safe(p.id)}',event)" aria-label="علاقه‌مندی"><i class="${wished?'fa-solid':'fa-regular'} fa-heart"></i></button></div><div class="fox-upgrade-card-body"><a href="${productUrl(p)}" class="fox-upgrade-title">${safe(p.name)}</a><div class="fox-upgrade-meta"><span>${safe(x.brand||'برند نامشخص')}</span><span>${safe(x.weight||'')}</span></div><div class="fox-upgrade-price">${money(p.finalPrice)}</div><button type="button" onclick="addToCart('${safe(p.id)}')" class="fox-upgrade-add" ${p.stockStatus==='out_of_stock'?'disabled':''}>${p.stockStatus==='out_of_stock'?'ناموجود':'افزودن به سبد'} <i class="fa-solid fa-cart-plus"></i></button></div></article>`;
  }

  function injectAccountLinks() {
    document.querySelectorAll('header').forEach(header=>{
      if(header.querySelector('[data-fox-account-link]')) return;
      const action = header.querySelector('#cart-trigger-btn')?.parentElement || header.querySelector('.max-w-7xl > div:last-child') || header.querySelector('.max-w-7xl');
      if(!action) return;
      const a=document.createElement('a'); a.href='account.html'; a.dataset.foxAccountLink='1'; a.className='fox-account-link-inline'; a.innerHTML='<i class="fa-regular fa-user"></i><span>حساب کاربری</span>'; a.setAttribute('aria-label','حساب کاربری');
      action.insertBefore(a, action.firstElementChild || null);
    });
  }

  let catalogBase=null;
  function advancedFilterValues() {
    return {
      brand: document.getElementById('fox-filter-brand')?.value || 'all',
      min: Number(document.getElementById('fox-filter-min')?.value) || 0,
      max: Number(document.getElementById('fox-filter-max')?.value) || 0,
      stock: document.getElementById('fox-filter-stock')?.value || 'all',
      discount: Boolean(document.getElementById('fox-filter-discount')?.checked),
      best: Boolean(document.getElementById('fox-filter-best')?.checked)
    };
  }
  function applyAdvancedFilter(listValue, f) {
    return listValue.filter(p=>{
      if(f.brand!=='all' && normalize(brandOf(p))!==normalize(f.brand)) return false;
      const price=Number(p.finalPrice)||0;
      if(f.min && price<f.min) return false;
      if(f.max && price>f.max) return false;
      if(f.stock==='in' && p.stockStatus==='out_of_stock') return false;
      if(f.stock==='low' && p.stockStatus!=='low_stock') return false;
      if(f.stock==='out' && p.stockStatus!=='out_of_stock') return false;
      if(f.discount && !(Number(p.discountPercent)>0 || Number(p.originalPrice)>Number(p.finalPrice))) return false;
      if(f.best && !Number(p.isBestSeller)) return false;
      return true;
    });
  }
  function renderAdvancedFilterDom() {
    const grid=document.getElementById('catalog-products-grid'); if(!grid || document.getElementById('fox-advanced-filters')) return;
    const brands=[...new Set(products().map(p=>brandOf(p)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'fa'));
    const shell=document.createElement('section'); shell.id='fox-advanced-filters'; shell.className='fox-filter-shell';
    shell.innerHTML=`<div class="fox-filter-head"><div><span>فیلتر هوشمند</span><h2>پیدا کردن محصول مناسب</h2></div><button type="button" id="fox-filter-reset" class="fox-filter-reset">پاک کردن همه</button></div><div class="fox-filter-grid"><label>برند<select id="fox-filter-brand"><option value="all">همه برندها</option>${brands.map(b=>`<option value="${safe(b)}">${safe(b)}</option>`).join('')}</select></label><label>حداقل قیمت<input id="fox-filter-min" type="number" min="0" inputmode="numeric" placeholder="مثلاً ۳۰۰۰۰۰"></label><label>حداکثر قیمت<input id="fox-filter-max" type="number" min="0" inputmode="numeric" placeholder="مثلاً ۳۰۰۰۰۰۰"></label><label>موجودی<select id="fox-filter-stock"><option value="all">همه</option><option value="in">فقط موجود</option><option value="low">موجودی محدود</option><option value="out">ناموجود</option></select></label></div><div class="fox-filter-checks"><label><input id="fox-filter-discount" type="checkbox"> فقط تخفیف‌دار</label><label><input id="fox-filter-best" type="checkbox"> فقط پرفروش‌ها</label></div><div id="fox-filter-summary" class="fox-filter-summary"></div>`;
    grid.parentNode.insertBefore(shell,grid);
    const refresh=()=>{ if(typeof window.renderProductsCatalog==='function') window.renderProductsCatalog(); };
    shell.querySelectorAll('select,input').forEach(el=>el.addEventListener(el.type==='number'?'change':'change',refresh));
    shell.querySelectorAll('input[type=number]').forEach(el=>el.addEventListener('input',()=>{clearTimeout(el._t);el._t=setTimeout(refresh,250);}));
    shell.querySelector('#fox-filter-reset')?.addEventListener('click',()=>{
      document.getElementById('fox-filter-brand').value='all'; document.getElementById('fox-filter-min').value=''; document.getElementById('fox-filter-max').value=''; document.getElementById('fox-filter-stock').value='all'; document.getElementById('fox-filter-discount').checked=false; document.getElementById('fox-filter-best').checked=false; refresh();
    });
  }
  function applyAdvancedFilterToDom() {
    const grid=document.getElementById('catalog-products-grid'); if(!grid) return;
    const f=advancedFilterValues();
    const allowed=new Set(applyAdvancedFilter(products(),f).map(p=>String(p.id)));
    let shown=0;
    grid.querySelectorAll('.product-card-item').forEach(card=>{
      const id=card.querySelector('[data-wishlist-id]')?.getAttribute('data-wishlist-id') || card.querySelector('a[href*="product.html?id="]')?.href?.split('id=')[1] || '';
      const visible=allowed.has(String(id).split('&')[0]); card.hidden=!visible; if(visible) shown++;
    });
    const summary=document.getElementById('fox-filter-summary'); if(summary) summary.textContent=`${fa(shown)} محصول مطابق فیلترهای انتخاب‌شده است.`;
    const empty=document.getElementById('catalog-empty-view'); if(empty && grid.children.length) empty.classList.toggle('hidden', shown>0);
  }
  function wrapCatalog() {
    if(catalogBase || typeof window.renderProductsCatalog!=='function') return;
    // Let the existing storefront enhancement wrap the original renderer first.
    if(!window.renderProductsCatalog.__foxWrapped) return;
    catalogBase=window.renderProductsCatalog;
    const wrapped=function(...args){ const r=catalogBase.apply(this,args); applyAdvancedFilterToDom(); return r; };
    wrapped.__foxWrapped=true; wrapped.__foxAdvancedWrapped=true; window.renderProductsCatalog=wrapped;
    renderAdvancedFilterDom();
    window.renderProductsCatalog();
  }

  function installCustomerSync() {
    if(!window.fetch || window.__FOX_CUSTOMER_SYNC__) return;
    window.__FOX_CUSTOMER_SYNC__=true;
    let timer=null;
    const syncCart=()=>{
      clearTimeout(timer); timer=setTimeout(()=>{ const items=Array.isArray(window.cart)?window.cart.map(i=>({id:String(i.id),quantity:Math.min(99,Math.max(1,Math.floor(Number(i.quantity)||1)))})):[]; fetch('/api/account/cart',{method:'PUT',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({items})}).catch(()=>{}); },450);
    };
    const wrap=(name, after)=>{
      if(typeof window[name]!=='function' || window[name].__foxCustomerWrapped) return;
      const base=window[name]; const fn=function(...args){ const result=base.apply(this,args); try{after?.(...args);}catch(_){} return result; }; fn.__foxCustomerWrapped=true; window[name]=fn;
    };
    wrap('toggleWishlist',(id)=>{ const active=list(LS_WISH).includes(String(id)); fetch('/api/account/favorites',{method:'PUT',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({productId:String(id),active})}).catch(()=>{}); });
    wrap('addToCart',syncCart); wrap('removeFromCart',syncCart); wrap('updateCartQuantity',syncCart);
    wrap('orderCartBy',channel=>{ const items=Array.isArray(window.cart)?window.cart.map(i=>({id:String(i.id),quantity:Number(i.quantity)||1})):[]; if(!items.length)return; fetch('/api/account/orders',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({channel,items})}).catch(()=>{}); });
  }

  function injectHomeRecommendations() {
    const anchor=document.getElementById('home-categories-grid'); if(!anchor || document.getElementById('fox-home-recommendations')) return;
    const recs=recommendationProducts(null,4); if(!recs.length)return;
    const hasSignals=list(LS_RECENT).length || list(LS_WISH).length || (()=>{try{return JSON.parse(localStorage.getItem(LS_QUIZ)||'null')?1:0}catch(_){return 0}})();
    const section=document.createElement('section'); section.id='fox-home-recommendations'; section.className='fox-recommend-section';
    section.innerHTML=`<div class="fox-recommend-head"><div><span>${hasSignals?'پیشنهاد هوشمند':'محبوب‌های پیشنهادی'}</span><h2>${hasSignals?'شاید این‌ها هم برایت جذاب باشند 🐾':'چند انتخاب خوب برای شروع 🐾'}</h2><p>${hasSignals?'بر اساس علاقه‌مندی‌ها، سبد خرید، محصولات دیده‌شده و پاسخ‌های کوییز.':'برای شروع، محصولات پرفروش و منتخب فروشگاه را می‌بینی.'}</p></div><a href="products.html">مشاهده همه <i class="fa-solid fa-arrow-left"></i></a></div><div class="fox-upgrade-grid">${recs.map(card).join('')}</div>`;
    anchor.parentNode.insertBefore(section,anchor.nextSibling);
  }

  function injectProductRecommendations() {
    const root=document.getElementById('product-page-root'); if(!root) return;
    const raw=new URLSearchParams(location.search).get('id') || (location.pathname.match(/\/product\/([^/]+)/)||[])[1];
    const seed=getProduct(raw); if(!seed)return;
    rememberViewed(seed.id);
    injectProductSeo(seed);
    if(root.querySelector('#fox-product-smart-recs')) return;
    const recs=recommendationProducts(seed,4).filter(p=>String(p.id)!==String(seed.id)); if(!recs.length)return;
    const section=document.createElement('section'); section.id='fox-product-smart-recs'; section.className='fox-recommend-section';
    section.innerHTML=`<div class="fox-recommend-head"><div><span>برای تو انتخاب شده</span><h2>پیشنهادهای هوشمند نزدیک به این محصول</h2><p>محصولاتی با ویژگی‌ها یا کاربردهای نزدیک به چیزی که الان می‌بینی.</p></div></div><div class="fox-upgrade-grid">${recs.map(card).join('')}</div>`;
    root.appendChild(section);
  }

  function setMetaAttr(attr,name,content){ if(!content)return; let el=document.head.querySelector(`meta[${attr}="${name}"]`); if(!el){el=document.createElement('meta');el.setAttribute(attr,name);document.head.appendChild(el);} el.setAttribute('content',content); }
  function injectProductSeo(p){
    const origin=location.origin; const canonical=`${origin}/product/${encodeURIComponent(String(p.id))}`; const title=`${String(p.name||'محصول').trim()} | FoxShop`;
    const description=String(p.shortDesc||p.fullDesc||'خرید و مشخصات کامل محصول در پت‌شاپ FoxShop تبریز').replace(/\s+/g,' ').slice(0,170);
    let link=document.head.querySelector('link[rel="canonical"]'); if(!link){link=document.createElement('link');link.rel='canonical';document.head.appendChild(link);} link.href=canonical;
    document.title=title; setMetaAttr('name','description',description); setMetaAttr('property','og:title',title); setMetaAttr('property','og:description',description); setMetaAttr('property','og:url',canonical); if(p.image)setMetaAttr('property','og:image',p.image);
    let ld=document.getElementById('fox-product-jsonld'); if(!ld){ld=document.createElement('script');ld.id='fox-product-jsonld';ld.type='application/ld+json';document.head.appendChild(ld);}
    const d=details(p); const data={'@context':'https://schema.org','@type':'Product',name:p.name,image:p.image?[p.image]:[],description,brand:brandOf(p)?{'@type':'Brand',name:brandOf(p)}:undefined,sku:d.barcode||p.id,offers:{'@type':'Offer',price:Number(p.finalPrice)||0,priceCurrency:'IRR',availability:p.stockStatus==='out_of_stock'?'https://schema.org/OutOfStock':'https://schema.org/InStock',url:canonical},aggregateRating:Number(d.reviewCount)>0&&Number(d.rating)>0?{'@type':'AggregateRating',ratingValue:Number(d.rating),reviewCount:Number(d.reviewCount)}:undefined};
    ld.textContent=JSON.stringify(data);
  }

  function reviewEnhancement() {
    const section=document.querySelector('.fox-review-section'), listEl=section?.querySelector('.fox-approved-reviews'); if(!section || !listEl || section.dataset.foxReviewEnhanced) return;
    section.dataset.foxReviewEnhanced='1';
    const cards=[...listEl.querySelectorAll('.fox-review-card')];
    cards.forEach((el,index)=>{ const stars=el.querySelector('.fox-review-stars')?.textContent?.trim()||''; el.dataset.rating=String(Math.min(5,Math.max(1,stars.length))); el.dataset.order=String(index); });
    const total=cards.length; const counts=[1,2,3,4,5].map(n=>cards.filter(c=>Number(c.dataset.rating)===n).length);
    const summary=document.createElement('div'); summary.className='fox-review-analytics';
    summary.innerHTML=`<div class="fox-review-analytics-score"><strong>${cards.length?(counts.reduce((s,c,i)=>s+c*(i+1),0)/cards.length).toFixed(1):'—'}</strong><span>از ۵</span><small>${fa(total)} نظر ثبت‌شده</small></div><div class="fox-review-bars">${[5,4,3,2,1].map(n=>{const c=counts[n-1]||0;const pct=total?Math.round(c/total*100):0;return `<div><span>${fa(n)} ستاره</span><div><i style="width:${pct}%"></i></div><em>${fa(c)}</em></div>`}).join('')}</div>`;
    const heading=section.querySelector('.fox-review-heading'); heading?.after(summary);
    const toolbar=document.createElement('div'); toolbar.className='fox-review-toolbar'; toolbar.innerHTML='<span>مرتب‌سازی نظرات</span><div><button type="button" data-sort="new">جدیدترین</button><button type="button" data-sort="high">بالاترین امتیاز</button><button type="button" data-sort="low">کمترین امتیاز</button></div>';
    listEl.before(toolbar);
    toolbar.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{
      const sorted=[...cards].sort((a,b)=>{ if(btn.dataset.sort==='high'||btn.dataset.sort==='low'){const diff=Number(a.dataset.rating)-Number(b.dataset.rating);return btn.dataset.sort==='high'?-diff:diff;} return Number(a.dataset.order)-Number(b.dataset.order); });
      sorted.forEach(c=>listEl.appendChild(c)); toolbar.querySelectorAll('button').forEach(b=>b.classList.remove('is-active')); btn.classList.add('is-active');
    }));
    toolbar.querySelector('[data-sort="new"]')?.classList.add('is-active');
  }

  const quizQuestions=[
    {key:'age',title:'سن گربه‌ات چقدر است؟',options:[['kitten','بچه‌گربه'],['adult','بالغ'],['senior','سن بالا']]},
    {key:'lifestyle',title:'سبک زندگی‌اش چطور است؟',options:[['indoor','خانگی و کم‌تحرک'],['active','فعال و پرتحرک'],['mixed','ترکیبی']]},
    {key:'sterilized',title:'عقیم شده است؟',options:[['yes','بله'],['no','خیر']]},
    {key:'need',title:'نیاز اصلی یا دغدغه‌ات چیست؟',options:[['none','نیاز ویژه‌ای ندارد'],['urinary','مراقبت از دستگاه ادراری'],['hairball','کنترل گلوله مو'],['sensitive','گوارش حساس'],['weight','کنترل وزن']]},
    {key:'foodType',title:'چه مدل غذایی بیشتر می‌خواهی؟',options:[['dry','غذای خشک'],['wet','کنسرو/پوچ'],['mixed','ترکیبی'],['all','فرقی ندارد']]},
    {key:'budget',title:'بودجه تقریبی هر خرید؟',options:[['low','اقتصادی'],['mid','متوسط'],['high','پریمیوم']]},
    {key:'priority',title:'در انتخاب، چه چیزی مهم‌تر است؟',options:[['brand','برند شناخته‌شده'],['ingredient','ترکیبات و کیفیت'],['price','قیمت مناسب'],['rating','امتیاز کاربران']]}
  ];
  function quizScore(p,data){
    const blob=textBlob(p), d=details(p); let score=0; const reasons=[];
    const ageRx={kitten:/kitten|بچه.?گربه/,senior:/senior|سال.?بالا|مسن/,adult:/adult|بالغ/};
    if(ageRx[data.age]?.test(blob)){score+=35;reasons.push('هماهنگی با سن');}
    if(data.lifestyle==='active' && /active|فعال|energy|انرژی/.test(blob)){score+=14;reasons.push('مناسب سبک زندگی فعال');}
    if(data.lifestyle==='indoor' && /indoor|خانگی|کم.?تحرک/.test(blob)){score+=14;reasons.push('مناسب گربه خانگی');}
    if(data.sterilized==='yes' && /steril|عقیم/.test(blob)){score+=24;reasons.push('مناسب گربه عقیم‌شده');}
    const needRx={urinary:/urinary|ادراری|urine/,hairball:/hairball|مالت|گلوله.?مو/,sensitive:/sensitive|حساس|گوارش/,weight:/weight|وزن|چاق/};
    if(data.need!=='none' && needRx[data.need]?.test(blob)){score+=40;reasons.push('نزدیک به نیاز انتخابی');}
    if(data.foodType==='dry' && /dry|خشک/.test(blob)){score+=16;reasons.push('غذای خشک');}
    if(data.foodType==='wet' && /wet|کنسرو|پوچ/.test(blob)){score+=16;reasons.push('غذای مرطوب');}
    if(data.budget==='low' && Number(p.finalPrice)<700000){score+=12;reasons.push('بودجه اقتصادی');}
    if(data.budget==='mid' && Number(p.finalPrice)>=700000 && Number(p.finalPrice)<1600000){score+=12;reasons.push('بودجه متوسط');}
    if(data.budget==='high' && Number(p.finalPrice)>=1600000){score+=12;reasons.push('رده پریمیوم');}
    if(data.priority==='brand' && d.brand){score+=8;reasons.push('اطلاعات برند موجود است');}
    if(data.priority==='ingredient' && d.ingredients){score+=10;reasons.push('اطلاعات ترکیبات ثبت شده');}
    if(data.priority==='price') score += Math.max(0,10-Math.min(9,Math.floor((Number(p.finalPrice)||0)/1000000)));
    if(data.priority==='rating' && Number(d.rating)>0){score+=Number(d.rating)*3;reasons.push('امتیاز ثبت‌شده دارد');}
    if(Number(p.isBestSeller)) { score+=5; reasons.push('پرفروش'); }
    if(Number(p.isFeatured)) score+=2;
    return {score,reasons};
  }
  function renderQuizV2(){
    const root=document.getElementById('quiz-root'); if(!root || root.dataset.foxQuizV2) return; root.dataset.foxQuizV2='1';
    let saved={}; try{saved=JSON.parse(localStorage.getItem(LS_QUIZ)||'{}')||{};}catch(_){saved={};}
    let step=0, data={...saved};
    const draw=()=>{
      const q=quizQuestions[step];
      root.innerHTML=`<div class="fox-quiz-v2"><div class="fox-quiz-progress"><span>مرحله ${fa(step+1)} از ${fa(quizQuestions.length)}</span><div><i style="width:${Math.round((step/quizQuestions.length)*100)}%"></i></div></div><div class="fox-quiz-v2-grid"><section class="fox-quiz-v2-card"><span class="fox-eyebrow">کوییز هوشمند FoxShop</span><h1>${safe(q.title)}</h1><p>با یک انتخاب ساده، پیشنهادها براساس موجودی فعلی فروشگاه شخصی‌سازی می‌شوند.</p><div class="fox-quiz-options">${q.options.map(([value,label])=>`<button type="button" class="${data[q.key]===value?'is-active':''}" data-quiz-value="${value}">${safe(label)}<i class="fa-solid fa-check"></i></button>`).join('')}</div><div class="fox-quiz-actions">${step?'<button type="button" id="fox-quiz-prev" class="secondary">قبلی</button>':''}<button type="button" id="fox-quiz-next" class="primary" ${data[q.key]?'':'disabled'}>${step===quizQuestions.length-1?'مشاهده پیشنهادها':'مرحله بعد'} <i class="fa-solid fa-arrow-left"></i></button></div></section><aside class="fox-quiz-v2-side"><div class="fox-quiz-orb"><i class="fa-solid fa-wand-magic-sparkles"></i></div><h2>نتیجه فقط بر اساس حدس نیست.</h2><p>سن، نیاز، بودجه، نوع غذا و داده‌های محصول با هم در امتیازدهی استفاده می‌شوند.</p><span>راهنمای خرید فروشگاهی است و برای شرایط پزشکی جایگزین دامپزشک نیست.</span></aside></div></div>`;
      root.querySelectorAll('[data-quiz-value]').forEach(btn=>btn.addEventListener('click',()=>{data[q.key]=btn.dataset.quizValue;draw();}));
      root.querySelector('#fox-quiz-prev')?.addEventListener('click',()=>{step=Math.max(0,step-1);draw();});
      root.querySelector('#fox-quiz-next')?.addEventListener('click',()=>{if(!data[q.key])return;if(step<quizQuestions.length-1){step++;draw();}else{localStorage.setItem(LS_QUIZ,JSON.stringify(data)); renderQuizResult();}});
    };
    const renderQuizResult=()=>{
      const scored=products().filter(p=>p.stockStatus!=='out_of_stock').map(p=>({p,...quizScore(p,data)})).sort((a,b)=>b.score-a.score||Number(b.p.isBestSeller)-Number(a.p.isBestSeller)).slice(0,3);
      root.innerHTML=`<div class="fox-quiz-result-v2"><div class="fox-quiz-result-head"><span>نتیجه آماده شد ✨</span><h1>۳ محصول پیشنهادی برای گربه‌ات</h1><p>این نتیجه از پاسخ‌های تو و مشخصات محصولات فعلی ساخته شده است.</p></div><div class="fox-upgrade-grid">${scored.map(x=>`<article class="fox-quiz-result-card"><img src="${safe(x.p.image||'')}" alt="${safe(x.p.name)}" loading="lazy"><div class="fox-quiz-result-body"><span class="fox-quiz-match">${fa(Math.min(99,Math.round(x.score)))} امتیاز تطابق</span><a href="${productUrl(x.p)}">${safe(x.p.name)}</a><b>${money(x.p.finalPrice)}</b><div class="fox-quiz-reasons">${x.reasons.slice(0,3).map(r=>`<span><i class="fa-solid fa-check"></i>${safe(r)}</span>`).join('')}</div><button type="button" onclick="addToCart('${safe(x.p.id)}')">افزودن به سبد <i class="fa-solid fa-cart-plus"></i></button></div></article>`).join('')}</div><div class="fox-quiz-result-actions"><button type="button" id="fox-quiz-restart">اجرای دوباره کوییز</button><a href="products.html">مرور همه محصولات</a></div></div>`;
      root.querySelector('#fox-quiz-restart')?.addEventListener('click',()=>{step=0;data={};draw();});
    };
    draw();
  }

  function init() {
    injectAccountLinks();
    installCustomerSync();
    if(document.getElementById('products-page-root') || document.getElementById('catalog-products-grid')) wrapCatalog();
    if(document.getElementById('quiz-root')) renderQuizV2();
    if(document.getElementById('product-page-root')) { injectProductRecommendations(); reviewEnhancement(); }
    if(document.getElementById('home-categories-grid')) injectHomeRecommendations();
  }

  function readyInit() {
    injectAccountLinks();
    if(window.__FOXSHOP_STORE_READY__===true) setTimeout(init,30);
    window.addEventListener('foxshop:store-ready',()=>setTimeout(init,20),{once:false});
    setTimeout(()=>{try{init();}catch(e){console.error('FoxShop upgrade init error',e);}},250);
    setTimeout(()=>{try{wrapCatalog();reviewEnhancement();injectProductRecommendations();installCustomerSync();}catch(e){}},900);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',readyInit,{once:true}); else readyInit();
})();
