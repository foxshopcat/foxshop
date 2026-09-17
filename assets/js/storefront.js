/* FoxShop storefront enhancements. This file is intentionally additive and keeps the original catalog/cart API intact. */
(() => {
  if (window.__FOXSHOP_ENHANCED__) return;
  window.__FOXSHOP_ENHANCED__ = true;

  const LS_WISHLIST = 'foxshop_wishlist_v1';
  const LS_COMPARE = 'foxshop_compare_v1';
  const LS_RESTOCK = 'foxshop_restock_v1';
  const LS_QUIZ = 'foxshop_quiz_v1';
  const FREE_SHIPPING_DEFAULT = 2500000;
  const SHOP_LOCATION = 'تبریز، ایران';
  const INSTAGRAM_URL = 'https://www.instagram.com/foxshop.cat?stkn=MTRud2VncmpudDZpeg==';
  const RUBIKA_URL = 'https://rubika.ir/baloot_cats';

  function readList(key) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(v) ? v.map(String).filter(Boolean) : [];
    } catch (_) { return []; }
  }
  function writeList(key, list) { try { localStorage.setItem(key, JSON.stringify([...new Set(list)])); } catch (_) {} }
  function getWishlist() { return readList(LS_WISHLIST); }
  function getCompare() { return readList(LS_COMPARE); }
  function getRestock() { return readList(LS_RESTOCK); }

  function getProduct(id) { return Array.isArray(window.products) ? window.products.find(p => String(p.id) === String(id)) : null; }
  function d(p) { return p?.details || {}; }
  function productUrl(p) { return `/product/${encodeURIComponent(String(p.id))}`; }
  function isConsumable(p) {
    if (!p) return false;
    const x = d(p);
    if (x.consumable) return true;
    const hay = `${p.name || ''} ${p.categoryId || ''} ${x.tags || ''}`.toLowerCase();
    return /food|litter|malt|treat|cat_dry_food|cat_wet_food|cat_litter|cat_treats|cat_supplements/.test(hay);
  }
  function inferredDetails(p) {
    const x = d(p);
    const name = String(p?.name || '');
    const out = { ...x };
    if (!out.brand) {
      const m = name.match(/(Royal Canin|GimCat|Schesir|Wanpy|Van Cat|Smart Paw|رویال کنین|جیم کت|شسیر|وانپی|ون کت)/i);
      out.brand = m ? m[1] : '';
    }
    if (!out.weight) {
      const m = name.match(/(?:وزن|weight)\s*([0-9۰-۹]+(?:[.,][0-9۰-۹]+)?\s*(?:کیلوگرم|kg|کیلو|گرم|g))/i);
      if (m) out.weight = m[1];
    }
    if (!out.suitableAge) {
      if (/kitten|بچه گربه/i.test(name)) out.suitableAge = 'بچه‌گربه';
      else if (/۱ تا ۷ سال|1\s*تا\s*7|adult|بالغ/i.test(name)) out.suitableAge = 'گربه بالغ';
    }
    if (!out.authenticity) out.authenticity = 'اطلاعات اصالت و تاریخ انقضا متناسب با کالای موجود قابل ارائه است.';
    return out;
  }

  function formatDateFa() {
    try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date()); }
    catch (_) { return new Date().toLocaleDateString('fa-IR'); }
  }

  function freeShippingThreshold() {
    const n = Number(window.settings?.freeShippingThreshold);
    return Number.isFinite(n) && n > 0 ? n : FREE_SHIPPING_DEFAULT;
  }

  function shippingMessage(total = 0) {
    const threshold = freeShippingThreshold();
    if (total >= threshold) return 'هزینه ارسال برای این سبد به حد ارسال رایگان رسیده است.';
    const remaining = threshold - total;
    return `${window.formatPrice(remaining)} تومان تا ارسال رایگان باقی مانده است.`;
  }

  function safeText(text) { return typeof window.escapeHtml === 'function' ? window.escapeHtml(text) : String(text ?? ''); }

  function toast(msg, type = 'success') { if (typeof window.showToast === 'function') window.showToast(msg, type); }

  window.openProductPage = function (id) {
    const p = getProduct(id); if (!p) return;
    window.location.href = productUrl(p);
  };

  window.isWishlisted = function (id) { return getWishlist().includes(String(id)); };
  window.toggleWishlist = function (id, event) {
    if (event) event.stopPropagation();
    const key = String(id); const list = getWishlist(); const i = list.indexOf(key);
    if (i >= 0) { list.splice(i, 1); toast('از علاقه‌مندی‌ها حذف شد', 'info'); }
    else { list.push(key); toast('به علاقه‌مندی‌ها اضافه شد'); }
    writeList(LS_WISHLIST, list); updateWishlistUI();
  };

  window.clearCompare = function () { writeList(LS_COMPARE, []); updateCompareBar(); };

  window.toggleCompare = function (id, event) {
    if (event) event.stopPropagation();
    const key = String(id); const list = getCompare();
    if (list.includes(key)) writeList(LS_COMPARE, list.filter(x => x !== key));
    else if (list.length >= 3) { toast('حداکثر ۳ محصول را می‌توانید همزمان مقایسه کنید.', 'info'); return; }
    else list.push(key), writeList(LS_COMPARE, list);
    updateCompareBar();
    toast(list.includes(key) ? 'به مقایسه اضافه شد' : 'از مقایسه حذف شد', 'info');
  };

  window.toggleRestockAlert = function (id) {
    const key = String(id); const list = getRestock();
    const i = list.indexOf(key);
    if (i >= 0) { list.splice(i, 1); toast('درخواست اطلاع موجودشدن حذف شد', 'info'); }
    else { list.push(key); toast('درخواست اطلاع موجودشدن روی این مرورگر ذخیره شد'); }
    writeList(LS_RESTOCK, list); updateRestockButtons();
  };

  function updateWishlistUI() {
    document.querySelectorAll('[data-wishlist-id]').forEach(btn => {
      const active = window.isWishlisted(btn.dataset.wishlistId);
      btn.classList.toggle('text-rose-600', active);
      btn.classList.toggle('bg-rose-50', active);
      const icon = btn.querySelector('i'); if (icon) icon.className = active ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
      btn.setAttribute('aria-pressed', String(active));
    });
    const count = getWishlist().length;
    document.querySelectorAll('[data-wishlist-count]').forEach(el => el.textContent = window.toPersianDigits(count));
  }
  function updateRestockButtons() {
    const list = getRestock();
    document.querySelectorAll('[data-restock-id]').forEach(btn => {
      const active = list.includes(String(btn.dataset.restockId));
      btn.innerHTML = active ? '<i class="fa-solid fa-bell"></i> ثبت شد' : '<i class="fa-regular fa-bell"></i> اطلاع موجودشدن';
      btn.classList.toggle('bg-emerald-600', active);
      btn.classList.toggle('bg-slate-100', !active);
      btn.classList.toggle('text-white', active);
    });
  }

  function buildInvoiceText(customCart = null) {
    const items = customCart || (Array.isArray(window.cart) ? window.cart : []);
    const total = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
    const lines = items.map((item, idx) => `${idx + 1}. ${item.name} × ${window.toPersianDigits(item.quantity)} = ${window.formatPrice((Number(item.price) || 0) * (Number(item.quantity) || 0))} تومان`);
    return [
      '🧾 فاکتور سفارش FoxShop',
      `📅 تاریخ: ${formatDateFa()}`,
      `📍 فروشگاه: FoxShop — ${SHOP_LOCATION}`,
      '',
      '📦 اقلام سفارش:',
      ...(lines.length ? lines : ['سبد خرید خالی است']),
      '',
      `💰 مبلغ کالاها: ${window.formatPrice(total)} تومان`,
      `🚚 ${shippingMessage(total)}`,
      `✅ مبلغ کل کالاها: ${window.formatPrice(total)} تومان`,
      '',
      'این متن از سبد خرید سایت کپی شده است. برای ثبت نهایی، آن را در دایرکت اینستاگرام یا روبیکا Paste کنید.'
    ].join('\n');
  }

  function buildItemsText(customCart = null) {
    const items = customCart || (Array.isArray(window.cart) ? window.cart : []);
    return items.map((item, idx) => `${idx + 1}. ${item.name} × ${window.toPersianDigits(item.quantity)}`).join('\n');
  }

  window.copyCartItems = async function () {
    const items = Array.isArray(window.cart) ? window.cart : [];
    if (!items.length) return toast('سبد خرید خالی است.', 'info');
    const ok = await window.copyTextToClipboard(buildItemsText());
    toast(ok ? 'نام و تعداد محصولات سبد کپی شد.' : 'کپی خودکار انجام نشد؛ متن آماده است و می‌توانید آن را دستی انتخاب و کپی کنید.', ok ? 'success' : 'info');
  };

  window.copyCartInvoice = async function () {
    const items = Array.isArray(window.cart) ? window.cart : [];
    if (!items.length) return toast('سبد خرید خالی است.', 'info');
    const ok = await window.copyTextToClipboard(buildInvoiceText());
    toast(ok ? 'فاکتور کامل کپی شد. آن را در اینستاگرام یا روبیکا Paste کنید.' : 'کپی خودکار انجام نشد؛ فاکتور همچنان در راهنما آماده است.', ok ? 'success' : 'info');
  };

  window.orderCartBy = async function (channel) {
    const items = Array.isArray(window.cart) ? window.cart : [];
    if (!items.length) return toast('سبد خرید خالی است.', 'info');
    const ok = await window.copyTextToClipboard(buildInvoiceText());
    if (!ok) toast('کپی خودکار انجام نشد؛ می‌توانید متن فاکتور را از دکمه «کپی فاکتور» انتخاب کنید.', 'info');
    openOrderGuide(channel);
  };

  function openOrderGuide(channel = 'instagram') {
    let modal = document.getElementById('fox-order-guide');
    if (!modal) {
      modal = document.createElement('div'); modal.id = 'fox-order-guide';
      modal.className = 'fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm hidden items-center justify-center p-4';
      document.body.appendChild(modal);
    }
    const isInsta = channel === 'instagram';
    modal.innerHTML = `<div class="w-full max-w-md rounded-3xl bg-white shadow-2xl p-6 space-y-4" dir="rtl">
      <div class="flex items-center justify-between gap-3"><div><h3 class="font-black text-base text-slate-900">راهنمای ارسال فاکتور</h3><p class="text-[11px] text-slate-400 mt-1">فاکتور همین حالا در کلیپ‌بورد کپی شده است.</p></div><button onclick="document.getElementById('fox-order-guide').classList.add('hidden')" class="w-9 h-9 rounded-xl bg-slate-100 text-slate-500"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="space-y-3 text-xs text-slate-700 leading-relaxed">
        <div class="flex gap-3"><span class="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-black">۱</span><p>روی دکمه پایین بزنید تا ${isInsta ? 'دایرکت اینستاگرام' : 'روبیکا'} باز شود.</p></div>
        <div class="flex gap-3"><span class="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-black">۲</span><p>گفت‌وگو با FoxShop را باز کنید.</p></div>
        <div class="flex gap-3"><span class="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center font-black">۳</span><p>داخل کادر پیام نگه دارید و گزینه «Paste / چسباندن» را بزنید و فاکتور را ارسال کنید.</p></div>
      </div>
      <button onclick="openOrderChannel('${isInsta ? 'instagram' : 'rubika'}')" class="w-full py-3.5 rounded-2xl ${isInsta ? 'bg-gradient-to-r from-pink-500 to-rose-600' : 'bg-gradient-to-r from-purple-600 to-indigo-700'} text-white font-black text-sm shadow">${isInsta ? 'باز کردن اینستاگرام' : 'باز کردن روبیکا'}</button>
      <button onclick="document.getElementById('fox-order-guide').classList.add('hidden')" class="w-full py-2.5 rounded-2xl bg-slate-100 text-slate-700 font-bold text-xs">بستن</button>
    </div>`;
    modal.classList.remove('hidden'); modal.classList.add('flex');
  }

  window.openOrderChannel = function (channel) {
    const url = channel === 'instagram' ? INSTAGRAM_URL : RUBIKA_URL;
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) window.location.href = url;
  };

  function addOrderButtonsToCart() {
    const footer = document.getElementById('cart-footer-view');
    if (!footer || footer.querySelector('[data-foxshop-order-tools]')) return;
    const tools = document.createElement('div');
    tools.dataset.foxshopOrderTools = '1';
    tools.className = 'space-y-2';
    tools.innerHTML = `<div class="rounded-2xl bg-orange-50 border border-orange-100 p-3"><div class="flex items-center justify-between text-[11px] font-bold text-slate-700"><span><i class="fa-solid fa-truck-fast text-orange-600"></i> ارسال رایگان</span><span data-free-shipping-note class="text-orange-700"></span></div><div class="mt-2 h-2 rounded-full bg-white overflow-hidden"><div data-free-shipping-progress class="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all"></div></div></div>
      <div class="grid grid-cols-2 gap-2"><button onclick="copyCartItems()" class="py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-[11px]"><i class="fa-solid fa-copy"></i> کپی محصولات</button><button onclick="copyCartInvoice()" class="py-2.5 rounded-xl bg-slate-900 text-white font-bold text-[11px]"><i class="fa-solid fa-file-invoice"></i> کپی فاکتور</button></div>
      <div class="grid grid-cols-2 gap-2"><button onclick="orderCartBy('rubika')" class="py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-black text-[11px]"><i class="fa-solid fa-comments"></i> روبیکا + کپی</button><button onclick="orderCartBy('instagram')" class="py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black text-[11px]"><i class="fa-brands fa-instagram"></i> اینستاگرام + کپی</button></div>
      <p class="text-[10px] text-slate-400 leading-relaxed">راهنما: با انتخاب هر گزینه، متن کپی می‌شود؛ سپس وارد گفت‌وگوی مقصد شوید و Paste کنید.</p>`;
    footer.appendChild(tools);
  }

  function updateShippingUI() {
    const total = typeof window.calculateCartTotal === 'function' ? window.calculateCartTotal() : 0;
    const threshold = freeShippingThreshold();
    document.querySelectorAll('[data-free-shipping-note]').forEach(el => el.textContent = shippingMessage(total));
    document.querySelectorAll('[data-free-shipping-progress]').forEach(el => el.style.width = `${Math.min(100, (total / threshold) * 100)}%`);
  }

  function patchCartRenderer() {
    if (!window.renderCartDrawer || window.renderCartDrawer.__foxWrapped) return;
    const base = window.renderCartDrawer;
    const wrapped = function (...args) {
      const result = base.apply(this, args);
      addOrderButtonsToCart(); updateShippingUI(); addMobileCartBar();
      return result;
    };
    wrapped.__foxWrapped = true; window.renderCartDrawer = wrapped;
  }

  function addMobileCartBar() {
    if (!window.cart || !window.cart.length || !/Mobi|Android/i.test(navigator.userAgent)) {
      document.getElementById('fox-mobile-cart-bar')?.remove(); return;
    }
    let bar = document.getElementById('fox-mobile-cart-bar');
    if (!bar) { bar = document.createElement('div'); bar.id='fox-mobile-cart-bar'; document.body.appendChild(bar); }
    bar.className = 'fixed bottom-3 inset-x-3 z-40 md:hidden rounded-2xl bg-slate-950/95 text-white shadow-2xl border border-white/10 p-3 backdrop-blur';
    bar.innerHTML = `<button onclick="toggleCartDrawer()" class="w-full flex items-center justify-between gap-3"><span class="flex items-center gap-2"><span class="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center"><i class="fa-solid fa-cart-shopping"></i></span><span class="text-right"><b class="block text-xs">سبد خرید</b><small class="text-[10px] text-white/60">${window.toPersianDigits(window.cart.reduce((s,i)=>s+i.quantity,0))} کالا</small></span></span><span class="font-black text-sm">${window.formatPrice(typeof window.calculateCartTotal === 'function' ? window.calculateCartTotal() : 0)} تومان</span></button>`;
  }

  function updateCompareBar() {
    document.getElementById('fox-compare-bar')?.remove();
    const ids = getCompare();
    if (!ids.length) return;
    const bar = document.createElement('div'); bar.id='fox-compare-bar';
    bar.className='fixed bottom-3 right-3 left-3 md:left-auto md:w-[420px] z-50 rounded-3xl bg-white/95 backdrop-blur border border-slate-200 shadow-2xl p-3';
    bar.innerHTML=`<div class="flex items-center justify-between gap-2"><div><b class="text-xs text-slate-900">مقایسه محصولات</b><span class="text-[10px] text-slate-400 mr-2">${window.toPersianDigits(ids.length)} از ۳</span></div><div class="flex gap-1"><a href="compare.html" class="px-3 py-2 rounded-xl bg-orange-600 text-white text-[11px] font-bold">مشاهده</a><button onclick="clearCompare()" class="w-9 h-9 rounded-xl bg-slate-100 text-slate-500"><i class="fa-solid fa-xmark"></i></button></div></div><div class="mt-2 flex gap-2 overflow-x-auto">${ids.map(id=>getProduct(id)).filter(Boolean).map(p=>`<a href="${productUrl(p)}" class="shrink-0 flex items-center gap-1.5 bg-slate-50 rounded-xl p-1.5 border"><img src="${safeText(p.image)}" class="w-8 h-8 object-contain rounded-lg bg-white"><span class="max-w-[150px] truncate text-[10px] font-bold text-slate-700">${safeText(p.name)}</span></a>`).join('')}</div>`;
    document.body.appendChild(bar);
  }

  function enhancedProductCard(prod) {
    const discount = Number(prod.discountPercent) || (prod.originalPrice > prod.finalPrice ? Math.round(((prod.originalPrice - prod.finalPrice)/prod.originalPrice)*100) : 0);
    const wished = window.isWishlisted(prod.id);
    const compare = getCompare().includes(String(prod.id));
    const x = inferredDetails(prod);
    return `<article class="product-card-item group bg-white rounded-3xl border border-orange-100/90 shadow-sm hover:shadow-xl hover:border-orange-300 transition-all duration-300 overflow-hidden relative flex flex-col">
      ${discount>0 ? `<span class="absolute top-3 right-3 z-10 bg-rose-500 text-white text-[11px] font-black px-2.5 py-0.5 rounded-xl shadow-md">${discount}٪ تخفیف امروز</span>`:''}
      <div class="absolute top-3 left-3 z-10 flex gap-1.5"><button data-wishlist-id="${safeText(prod.id)}" onclick="toggleWishlist('${safeText(prod.id)}',event)" class="w-9 h-9 rounded-xl bg-white/95 border border-slate-200 text-slate-500 shadow ${wished?'text-rose-600 bg-rose-50':''}" aria-label="علاقه‌مندی"><i class="${wished?'fa-solid':'fa-regular'} fa-heart"></i></button><button onclick="toggleCompare('${safeText(prod.id)}',event)" class="w-9 h-9 rounded-xl bg-white/95 border border-slate-200 ${compare?'text-orange-600 bg-orange-50':'text-slate-500'} shadow" aria-label="مقایسه"><i class="fa-solid fa-code-compare"></i></button></div>
      <a href="${productUrl(prod)}" class="aspect-square w-full bg-slate-50 overflow-hidden flex items-center justify-center p-6 group-hover:bg-orange-50/20 transition"><img src="${safeText(prod.image)}" alt="${safeText(prod.name)}" loading="lazy" decoding="async" class="w-full h-full object-contain group-hover:scale-105 transition duration-500"></a>
      <div class="p-5 flex-1 flex flex-col gap-3"><div><a href="${productUrl(prod)}" class="font-extrabold text-sm text-slate-800 hover:text-orange-600 transition line-clamp-2 leading-snug">${safeText(prod.name)}</a><p class="text-[11px] text-slate-400 line-clamp-1 mt-1">${safeText(prod.shortDesc||'')}</p></div>
        <div class="grid grid-cols-2 gap-1.5 text-[10px]"><span class="bg-slate-50 rounded-lg px-2 py-1 text-slate-500 truncate">${safeText(x.brand||'برند نامشخص')}</span><span class="bg-slate-50 rounded-lg px-2 py-1 text-slate-500 truncate">${safeText(x.weight||'وزن ثبت نشده')}</span></div>
        <div class="pt-2 border-t border-slate-100 flex items-end justify-between"><div>${discount>0?`<div class="text-[11px] text-slate-400 line-through">${window.formatPrice(prod.originalPrice)} تومان</div>`:''}<div class="font-black text-slate-900">${window.formatPrice(prod.finalPrice)} <span class="text-[10px] font-normal text-slate-500">تومان</span></div></div><span class="text-[10px] ${prod.stockStatus==='out_of_stock'?'text-rose-600':'text-emerald-600'} font-bold">${prod.stockStatus==='out_of_stock'?'ناموجود':prod.stockStatus==='low_stock'?'موجودی محدود':'موجود'}</span></div>
        <div class="grid grid-cols-2 gap-2 mt-auto">${prod.stockStatus==='out_of_stock' ? '<button disabled class="py-2.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-[11px] cursor-not-allowed"><i class="fa-solid fa-ban"></i> ناموجود</button>' : `<button onclick="addToCart('${safeText(prod.id)}')" class="py-2.5 rounded-xl bg-orange-50 hover:bg-orange-600 hover:text-white text-orange-700 font-bold text-[11px]"><i class="fa-solid fa-cart-plus"></i> سبد خرید</button>`}<a href="${productUrl(prod)}" class="py-2.5 rounded-xl bg-slate-900 text-white font-bold text-[11px] text-center"><i class="fa-solid fa-arrow-left"></i> صفحه محصول</a></div>
      </div></article>`;
  }

  function patchRenderers() {
    if (typeof window.renderProductCard === 'function' && !window.renderProductCard.__foxWrapped) {
      const wrappedCard = function(prod) { return enhancedProductCard(prod); };
      wrappedCard.__foxWrapped = true;
      window.renderProductCard = wrappedCard;
    }
    if (typeof window.renderProductsCatalog === 'function' && !window.renderProductsCatalog.__foxWrapped) {
      const wrapped = function () {
        const container = document.getElementById('catalog-products-grid');
        const emptyView = document.getElementById('catalog-empty-view');
        if (!container) return;
        const params = new URLSearchParams(window.location.search);
        const activeCategory = window.__foxActiveCategory || params.get('category') || 'all';
        const urlSearch = params.get('search') || '';
        const onlyDiscounted = params.get('discount') === '1';
        const searchInput = document.getElementById('catalog-search-input');
        if (searchInput && urlSearch && !searchInput.value) searchInput.value = urlSearch;
        const searchQuery = (searchInput?.value || urlSearch).trim().toLowerCase();
        const sortVal = document.getElementById('catalog-sort-select')?.value || 'default';
        let filtered = [...(window.products || [])];
        if (activeCategory !== 'all') filtered = filtered.filter(p => p.categoryId === activeCategory);
        if (onlyDiscounted) filtered = filtered.filter(p => Number(p.discountPercent) > 0 || Number(p.originalPrice) > Number(p.finalPrice));
        if (searchQuery) filtered = filtered.filter(p => {
          const x = inferredDetails(p);
          const hay = `${p.name} ${p.shortDesc || ''} ${x.brand || ''} ${x.weight || ''} ${x.flavor || ''} ${x.goals || ''} ${(x.tags || []).join ? x.tags.join(' ') : ''}`.toLowerCase();
          return hay.includes(searchQuery);
        });
        if (sortVal === 'price-asc') filtered.sort((a,b) => a.finalPrice-b.finalPrice);
        else if (sortVal === 'price-desc') filtered.sort((a,b) => b.finalPrice-a.finalPrice);
        else if (sortVal === 'discount') filtered.sort((a,b) => (b.discountPercent||0)-(a.discountPercent||0));
        else if (sortVal === 'bestseller') filtered.sort((a,b) => (b.isBestSeller?1:0)-(a.isBestSeller?1:0));
        container.innerHTML = filtered.map(enhancedProductCard).join('');
        if (emptyView) emptyView.classList.toggle('hidden', filtered.length > 0);
        updateWishlistUI(); updateCompareBar(); addTrustToExistingPriceAreas();
      };
      wrapped.__foxWrapped = true;
      window.renderProductsCatalog = wrapped;
    }
    if (typeof window.setCategoryFilter === 'function' && !window.setCategoryFilter.__foxWrapped) {
      const base = window.setCategoryFilter;
      const wrapped = function(catId) {
        window.__foxActiveCategory = catId || 'all';
        try { base.apply(this, arguments); } catch (_) {}
        if (typeof window.renderProductsCatalog === 'function') window.renderProductsCatalog();
      };
      wrapped.__foxWrapped = true;
      window.setCategoryFilter = wrapped;
    }
    if (typeof window.resetFilters === 'function' && !window.resetFilters.__foxWrapped) {
      const base = window.resetFilters;
      const wrapped = function() {
        window.__foxActiveCategory = 'all';
        try { base.apply(this, arguments); } catch (_) {}
        const input=document.getElementById('catalog-search-input');
        if(input) input.value='';
        const sort=document.getElementById('catalog-sort-select');
        if(sort) sort.value='default';
        if(typeof window.renderCategoryPills==='function') window.renderCategoryPills();
        if(typeof window.renderProductsCatalog==='function') window.renderProductsCatalog();
      };
      wrapped.__foxWrapped = true;
      window.resetFilters = wrapped;
    }
    const searchInput=document.getElementById('catalog-search-input');
    if(searchInput && !searchInput.dataset.foxEnhancedSearch){
      searchInput.dataset.foxEnhancedSearch='1';
      searchInput.addEventListener('input',()=>{ if(typeof window.renderProductsCatalog==='function') window.renderProductsCatalog(); });
    }
  }

  function patchHomeRenderers() {
    const wrapHome = (name, containerId, selector) => {
      if (typeof window[name] !== 'function' || window[name].__foxWrapped) return;
      const base = window[name];
      const wrapped = function(...args) {
        const result = base.apply(this, args);
        const container = document.getElementById(containerId);
        if (container) {
          const all = Array.isArray(window.products) ? window.products : [];
          const selected = selector(all);
          container.innerHTML = selected.map(enhancedProductCard).join('');
          updateWishlistUI();
          updateCompareBar();
        }
        return result;
      };
      wrapped.__foxWrapped = true;
      window[name] = wrapped;
    };
    wrapHome('renderHomeFeatured', 'home-featured-grid', products => {
      const featured = products.filter(p => p.isFeatured);
      return featured.length ? featured : products.slice(0, 4);
    });
    wrapHome('renderHomeBestSellers', 'home-bestseller-grid', products => {
      const best = products.filter(p => p.isBestSeller || p.isNew);
      return best.length ? best : products.slice(4, 8);
    });
  }

  function enhanceCatalogCards() {
    patchWishlistAndProductLinks(); updateWishlistUI(); updateCompareBar();
  }

  function patchWishlistAndProductLinks() {
    document.querySelectorAll('.product-card-item').forEach(card => {
      if (card.dataset.foxEnhanced) return;
      card.dataset.foxEnhanced='1';
    });
  }

  function injectHomeCommerceSections() {
    const home = document.getElementById('home-categories-grid');
    if (!home || document.getElementById('fox-home-commerce')) return;
    const products = Array.isArray(window.products) ? window.products : [];
    const root = document.createElement('div'); root.id='fox-home-commerce'; root.className='space-y-8 mt-2';
    const today = products.filter(p=>Number(p.discountPercent)>0).sort((a,b)=>(b.discountPercent||0)-(a.discountPercent||0)).slice(0,8);
    const best = products.filter(p=>p.isBestSeller).slice(0,8);
    const fresh = products.filter(p=>p.isNew).slice(0,8);
    root.innerHTML = `
      <section class="space-y-4"><div class="flex items-center justify-between"><h2 class="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2"><span class="w-2 h-7 rounded-full bg-rose-500"></span>تخفیف امروز</h2><a href="products.html?discount=1" class="text-xs font-bold text-orange-600">مشاهده همه</a></div><div data-home-row="today" class="flex gap-4 overflow-x-auto pb-2 custom-scroll snap-x snap-mandatory"></div></section>
      <section class="space-y-4"><div class="flex items-center justify-between"><h2 class="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2"><span class="w-2 h-7 rounded-full bg-amber-500"></span>پرفروش‌ها</h2></div><div data-home-row="best" class="flex gap-4 overflow-x-auto pb-2 custom-scroll snap-x snap-mandatory"></div></section>
      <section class="space-y-4"><div class="flex items-center justify-between"><h2 class="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2"><span class="w-2 h-7 rounded-full bg-emerald-500"></span>تازه‌رسیده‌ها</h2></div><div data-home-row="fresh" class="flex gap-4 overflow-x-auto pb-2 custom-scroll snap-x snap-mandatory"></div></section>
      <section class="rounded-3xl border border-orange-100 bg-white p-5 sm:p-7 shadow-sm"><div class="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><span class="text-[11px] font-black text-orange-600">پیشنهاد خرید هوشمند</span><h2 class="text-xl sm:text-2xl font-black text-slate-900 mt-1">بسته آماده برای نیازهای روزمره</h2><p class="text-xs text-slate-500 mt-1">بچه‌گربه، ضد گلوله مو و خاک ماهانه را با یک کلیک به سبد اضافه کنید.</p></div><div class="flex gap-2 flex-wrap"><button onclick="addSmartBundle('kitten')" class="px-4 py-2.5 rounded-xl bg-orange-50 text-orange-700 font-bold text-xs">🐱 بسته بچه‌گربه</button><button onclick="addSmartBundle('hairball')" class="px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs">🧴 ضد گلوله مو</button><button onclick="addSmartBundle('litter')" class="px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs">📦 خاک ماهانه</button></div></div></section>
      <section class="rounded-3xl bg-slate-900 text-white p-5 sm:p-7"><div class="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><span class="text-[11px] text-orange-300 font-black">انتخاب دقیق‌تر</span><h2 class="text-xl sm:text-2xl font-black mt-1">کوییز ۲ دقیقه‌ای غذای مناسب گربه</h2><p class="text-xs text-white/60 mt-1">سن، وزن، عقیم‌شدن، حساسیت و بودجه را بررسی می‌کنیم و ۳ پیشنهاد قابل خرید می‌دهیم.</p></div><a href="quiz.html" class="px-5 py-3 rounded-2xl bg-orange-500 text-white font-black text-xs shadow-lg">شروع کوییز</a></div></section>
      <section class="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7"><div class="flex items-center justify-between"><div><h2 class="text-xl sm:text-2xl font-black text-slate-900">اعتماد قابل مشاهده</h2><p class="text-xs text-slate-500 mt-1">فروشگاه در تبریز؛ ارسال و سیاست‌ها شفاف کنار محصول نمایش داده می‌شوند.</p></div><span class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><i class="fa-solid fa-shield-heart text-xl"></i></span></div><div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5"><div class="p-3 rounded-2xl bg-slate-50"><b class="block text-xs text-slate-800">اصالت</b><span class="text-[10px] text-slate-500">اطلاعات و فاکتور قابل ارائه</span></div><div class="p-3 rounded-2xl bg-slate-50"><b class="block text-xs text-slate-800">مرجوعی</b><span class="text-[10px] text-slate-500">سیاست شفاف فروشگاه</span></div><div class="p-3 rounded-2xl bg-slate-50"><b class="block text-xs text-slate-800">ارسال</b><span class="text-[10px] text-slate-500">زمان و هزینه کنار قیمت</span></div><div class="p-3 rounded-2xl bg-slate-50"><b class="block text-xs text-slate-800">نگهداری</b><span class="text-[10px] text-slate-500">روش نگهداری هر کالا</span></div></div></section>
      <section class="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7"><div class="flex items-center justify-between"><div><h2 class="text-xl sm:text-2xl font-black text-slate-900">گربه‌های مشتری‌ها</h2><p class="text-xs text-slate-500 mt-1">فقط عکس و تجربه واقعیِ ثبت‌شده توسط مشتری نمایش داده می‌شود.</p></div><i class="fa-solid fa-camera-retro text-2xl text-orange-500"></i></div><div data-customer-stories class="mt-5 flex gap-4 overflow-x-auto pb-2 custom-scroll"></div></section>`;
    home.closest('section')?.after(root);
    const stories = Array.isArray(window.customerStories) ? window.customerStories : [];
    const storyWrap = root.querySelector('[data-customer-stories]');
    if (storyWrap) storyWrap.innerHTML = stories.length ? stories.map(story => `<article class="min-w-[260px] max-w-[300px] rounded-2xl bg-slate-50 border border-slate-200 p-3">${story.photoUrl ? `<img src="${safeText(story.photoUrl)}" loading="lazy" class="w-full h-44 object-cover rounded-xl" alt="${safeText(story.catName||'گربه مشتری')}">` : ''}<div class="mt-3"><b class="text-xs text-slate-800">${safeText(story.customerName||'مشتری')}</b>${story.catName?`<span class="text-[10px] text-slate-400 mr-2">• ${safeText(story.catName)}</span>`:''}<p class="text-[11px] text-slate-600 leading-6 mt-1">${safeText(story.quote||'')}</p></div></article>`).join('') : '<div class="w-full rounded-2xl bg-slate-50 border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">هنوز عکس یا تجربه تأییدشده‌ای ثبت نشده است؛ برای حفظ اعتماد، اطلاعات ساختگی نمایش داده نمی‌شود.</div>';

    const rows={today,best,fresh};
    root.querySelectorAll('[data-home-row]').forEach(row=>{
      const key=row.dataset.homeRow;
      row.innerHTML=(rows[key]||[]).map(p=>`<div class="min-w-[270px] max-w-[270px] snap-start">${enhancedProductCard(p)}</div>`).join('');
      if (!(rows[key]||[]).length) row.innerHTML='<div class="w-full text-xs text-slate-400 py-5">هنوز محصولی برای این بخش ثبت نشده است.</div>';
    });
  }

  window.addSmartBundle = function(type){
    const products=Array.isArray(window.products)?window.products:[];
    let picks=[];
    if(type==='kitten') picks=products.filter(p=>/kitten|بچه گربه/i.test(p.name)).slice(0,2);
    if(type==='hairball') picks=products.filter(p=>/malt|مالت|مو/i.test(`${p.name} ${p.shortDesc}`)).slice(0,2);
    if(type==='litter') picks=products.filter(p=>p.categoryId==='cat_litter' || /خاک/.test(p.name)).slice(0,2);
    if(!picks.length) picks=products.filter(p=>p.isBestSeller).slice(0,2);
    picks.forEach(p=>window.addToCart(p.id, type==='litter'?2:1));
    toast('بسته آماده به سبد خرید اضافه شد.');
  };

  function addTrustToExistingPriceAreas() {
    document.querySelectorAll('.price-text, [id$="detail-modal-price"]').forEach(el=>{
      const host=el.closest('div'); if(!host || host.parentElement?.querySelector('[data-fox-trust-mini]')) return;
      const trust=document.createElement('div'); trust.dataset.foxTrustMini='1'; trust.className='flex flex-wrap gap-1 mt-1 text-[9px]';
      trust.innerHTML='<span class="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700">اصالت قابل ارائه</span><span class="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700">ارسال از تبریز</span>';
      host.parentElement.appendChild(trust);
    });
  }

  function buildProductSpecRows(p) {
    const x=inferredDetails(p);
    const pairs=[['برند',x.brand],['وزن',x.weight],['حجم',x.volume],['طعم و تنوع',x.flavor],['سن مناسب',x.suitableAge],['هدف مصرف',x.goals],['کشور سازنده',x.country],['بارکد',x.barcode],['تاریخ انقضا',x.expiryDate],['روش مصرف',x.usageMethod],['نگهداری',x.storage],['ضمانت',x.warranty],['تعداد واقعی انبار',x.actualStock==null?'':x.actualStock],['حداقل موجودی',x.minStock==null?'':x.minStock],['زمان تأمین',x.restockTime]];
    return pairs.filter(([,v])=>String(v??'').trim()).map(([k,v])=>`<div class="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100"><span class="text-[11px] text-slate-400">${k}</span><span class="text-[11px] font-bold text-slate-700 text-left">${safeText(v)}</span></div>`).join('');
  }

  function renderProductPage() {
    const root=document.getElementById('product-page-root'); if(!root) return;
    const id=new URLSearchParams(location.search).get('id') || location.pathname.split('/').filter(Boolean).pop();
    const p=getProduct(decodeURIComponent(id||''));
    if(!p){ root.innerHTML='<div class="bg-white rounded-3xl p-10 text-center"><h1 class="text-xl font-black">محصول پیدا نشد</h1><p class="text-xs text-slate-500 mt-2">ممکن است محصول حذف شده یا لینک قدیمی باشد.</p><a href="products.html" class="inline-block mt-5 px-5 py-2.5 rounded-xl bg-orange-600 text-white font-bold text-xs">بازگشت به فروشگاه</a></div>'; return; }
    const x=inferredDetails(p); const reviews=Array.isArray(p.reviews)?p.reviews:[];
    const relatedIds=(x.relatedIds||[]).map(String).filter(v=>v!==String(p.id));
    let related=relatedIds.map(getProduct).filter(Boolean);
    if(!related.length) related=(window.products||[]).filter(q=>q.id!==p.id&&q.categoryId===p.categoryId).slice(0,4);
    const images=[p.image,...(Array.isArray(x.moreImages)?x.moreImages:[])].filter(Boolean).slice(0,8);
    const wished=window.isWishlisted(p.id); const out=p.stockStatus==='out_of_stock';
    root.innerHTML=`<div class="space-y-6">
      <div class="flex items-center gap-2 text-[11px] text-slate-400"><a href="index.html" class="hover:text-orange-600">صفحه اصلی</a><i class="fa-solid fa-chevron-left text-[8px]"></i><a href="products.html" class="hover:text-orange-600">محصولات</a><i class="fa-solid fa-chevron-left text-[8px]"></i><span class="text-slate-800 font-bold">${safeText(p.name)}</span></div>
      <section class="bg-white rounded-3xl border border-orange-100 shadow-sm p-5 sm:p-7"><div class="grid grid-cols-1 lg:grid-cols-2 gap-7">
        <div><div class="aspect-square rounded-3xl bg-slate-50 border border-slate-200 p-6 flex items-center justify-center"><img id="fox-main-product-image" src="${safeText(images[0]||'')}" alt="${safeText(p.name)}" class="max-h-full max-w-full object-contain"></div><div class="flex gap-2 mt-3 overflow-x-auto">${images.map((img,i)=>`<button onclick="document.getElementById('fox-main-product-image').src='${safeText(img)}'" class="shrink-0 w-16 h-16 rounded-xl bg-slate-50 border ${i===0?'border-orange-400':'border-slate-200'} p-1"><img src="${safeText(img)}" class="w-full h-full object-contain rounded-lg"></button>`).join('')}</div></div>
        <div class="space-y-4"><div class="flex flex-wrap items-center gap-2"><span class="px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-[10px] font-black">${safeText((window.categories||[]).find(c=>c.id===p.categoryId)?.name||'محصول')}</span><span class="px-2.5 py-1 rounded-full ${out?'bg-rose-50 text-rose-700':'bg-emerald-50 text-emerald-700'} text-[10px] font-black">${out?'ناموجود':'موجود'}</span></div>
          <h1 class="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">${safeText(p.name)}</h1><p class="text-xs text-slate-500 leading-7">${safeText(p.shortDesc||p.fullDesc||'')}</p>
          <div class="flex flex-wrap items-center gap-3 text-[10px]">${x.brand?`<span class="bg-slate-50 px-2 py-1 rounded-lg">برند: <b>${safeText(x.brand)}</b></span>`:''}${x.weight?`<span class="bg-slate-50 px-2 py-1 rounded-lg">وزن: <b>${safeText(x.weight)}</b></span>`:''}${x.rating?`<span class="bg-amber-50 text-amber-700 px-2 py-1 rounded-lg">★ ${window.toPersianDigits(x.rating.toFixed(1))} ${x.reviewCount?`(${window.toPersianDigits(x.reviewCount)} نظر)`:''}</span>`:''}</div>
          <div class="rounded-2xl bg-orange-50 border border-orange-100 p-4"><div class="flex items-end justify-between gap-3"><div>${Number(p.discountPercent)>0?`<div class="text-xs text-slate-400 line-through">${window.formatPrice(p.originalPrice)} تومان</div>`:''}<div class="text-2xl font-black text-slate-900">${window.formatPrice(p.finalPrice)} <span class="text-xs font-normal text-slate-600">تومان</span></div><div class="flex flex-wrap gap-1 mt-1"><span class="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700">ضمانت سلامت/انقضا بر اساس کالای موجود</span><span class="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700">ارسال از تبریز</span></div></div><span class="text-[10px] text-slate-500">${safeText(shippingMessage(window.cart?.reduce((s,i)=>s+i.price*i.quantity,0)||0))}</span></div></div>
          <div class="grid grid-cols-2 gap-2"><button ${out?'disabled':''} onclick="addToCart('${safeText(p.id)}')" class="py-3.5 rounded-2xl ${out?'bg-slate-200 text-slate-400 cursor-not-allowed':'bg-orange-600 text-white hover:bg-orange-700'} font-black text-xs"><i class="fa-solid fa-cart-plus"></i> افزودن به سبد</button><button onclick="toggleWishlist('${safeText(p.id)}',event)" data-wishlist-id="${safeText(p.id)}" class="py-3.5 rounded-2xl ${wished?'bg-rose-50 text-rose-600':'bg-slate-100 text-slate-700'} font-black text-xs"><i class="${wished?'fa-solid':'fa-regular'} fa-heart"></i> علاقه‌مندی</button></div>
          <div class="grid grid-cols-2 gap-2"><button onclick="toggleCompare('${safeText(p.id)}',event)" class="py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-[11px]"><i class="fa-solid fa-code-compare"></i> مقایسه</button>${out?`<button onclick="toggleRestockAlert('${safeText(p.id)}')" data-restock-id="${safeText(p.id)}" class="py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-[11px]"><i class="fa-regular fa-bell"></i> اطلاع موجودشدن</button>`:`<button onclick="${isConsumable(p)?`repeatPurchase('${safeText(p.id)}')`:`addToCart('${safeText(p.id)}')`}" class="py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-[11px]"><i class="fa-solid fa-rotate"></i> ${isConsumable(p)?'خرید مجدد':'افزودن دوباره'}</button>`}</div>
        </div></div></section>
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-5"><div class="bg-white rounded-3xl border border-slate-200 p-5"><h2 class="font-black text-base mb-3">مشخصات کامل</h2><div>${buildProductSpecRows(p)}</div></div><div class="bg-white rounded-3xl border border-slate-200 p-5"><h2 class="font-black text-base mb-3">ترکیبات و آنالیز تغذیه‌ای</h2><p class="text-xs text-slate-600 leading-7 whitespace-pre-line">${safeText(x.ingredients||'اطلاعات ترکیبات این کالا هنوز توسط فروشگاه تکمیل نشده است.')}</p>${x.nutritionAnalysis?`<div class="mt-4 pt-4 border-t"><h3 class="text-xs font-black mb-2">آنالیز تغذیه‌ای</h3><p class="text-xs text-slate-600 leading-7 whitespace-pre-line">${safeText(x.nutritionAnalysis)}</p></div>`:''}</div></section>
      <section class="grid grid-cols-1 md:grid-cols-3 gap-3"><div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-100"><b class="text-xs text-emerald-800">ضمانت اصالت</b><p class="text-[11px] text-emerald-700 mt-1 leading-6">${safeText(x.authenticity||'اطلاعات اصالت و تاریخ انقضا برای کالای موجود قابل ارائه است.')}</p></div><div class="p-4 rounded-2xl bg-blue-50 border border-blue-100"><b class="text-xs text-blue-800">ارسال و هزینه</b><p class="text-[11px] text-blue-700 mt-1 leading-6">ارسال از ${SHOP_LOCATION}. ${safeText(window.settings?.shippingDispatchTime||'۱ تا ۲ روز کاری')} — هزینه پایه ${window.formatPrice(Number(window.settings?.shippingCost)||120000)} تومان.</p></div><div class="p-4 rounded-2xl bg-amber-50 border border-amber-100"><b class="text-xs text-amber-800">مرجوعی و نگهداری</b><p class="text-[11px] text-amber-700 mt-1 leading-6">${safeText(window.settings?.returnPolicy||'سیاست مرجوعی فروشگاه را قبل از سفارش بررسی کنید.')} ${x.storage?`نگهداری: ${safeText(x.storage)}`:''}</p></div></section>
      <section class="bg-white rounded-3xl border border-slate-200 p-5"><h2 class="text-base font-black mb-3">توضیحات</h2><p class="text-xs text-slate-600 leading-8 whitespace-pre-line">${safeText(p.fullDesc||p.shortDesc||'')}</p></section>
      <section class="bg-white rounded-3xl border border-slate-200 p-5"><h2 class="text-base font-black mb-4">پرسش‌های متداول</h2>${(Array.isArray(x.faq)&&x.faq.length)?x.faq.map((f,i)=>`<details class="border-b border-slate-100 py-3"><summary class="cursor-pointer font-bold text-xs text-slate-800">${safeText(f.question||f.q||'سؤال متداول')}</summary><p class="text-xs text-slate-500 leading-7 mt-2">${safeText(f.answer||f.a||'')}</p></details>`).join(''):'<p class="text-xs text-slate-400">FAQ این محصول هنوز تکمیل نشده است.</p>'}</section>
      <section class="bg-white rounded-3xl border border-slate-200 p-5"><div class="flex items-center justify-between gap-3"><h2 class="text-base font-black">نظرات و عکس مشتری‌ها</h2><span class="text-[10px] text-slate-400">${reviews.length?window.toPersianDigits(reviews.length)+' نظر تاییدشده':'هنوز نظر تاییدشده‌ای ثبت نشده'}</span></div><div class="mt-4 space-y-3">${reviews.length?reviews.map(r=>`<div class="p-3 rounded-2xl bg-slate-50 border"><div class="flex items-center justify-between"><b class="text-xs">${safeText(r.customerName||'مشتری')}</b><span class="text-amber-500 text-xs">${'★'.repeat(Math.min(5,Math.max(1,Number(r.rating)||5)))}</span></div><p class="text-[11px] text-slate-600 leading-7 mt-1">${safeText(r.reviewText)}</p>${r.photoUrl?`<img src="${safeText(r.photoUrl)}" loading="lazy" class="mt-2 w-28 h-28 object-cover rounded-xl border">`:''}</div>`).join(''):'<div class="p-5 rounded-2xl bg-slate-50 text-center"><p class="text-xs text-slate-400">برای حفظ اعتبار فروشگاه، فقط نظر و عکس واقعیِ تأییدشده نمایش داده می‌شود.</p></div>'}</div></section>
      <section class="space-y-4"><div class="flex items-center justify-between"><h2 class="text-base font-black">محصولات مرتبط</h2><a href="products.html" class="text-xs text-orange-600 font-bold">مشاهده فروشگاه</a></div><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">${related.map(q=>enhancedProductCard(q)).join('')}</div></section>
    </div>`;
    updateWishlistUI(); updateRestockButtons(); updateCompareBar();
    document.title=`${p.name} | FoxShop`;
    setMeta('description', (p.shortDesc||p.fullDesc||'').slice(0,155));
  }

  window.repeatPurchase=function(id){
    const p=getProduct(id); if(!p) return;
    if(typeof window.addToCart==='function') window.addToCart(id,1);
    window.location.hash='cart';
    if(typeof window.toggleCartDrawer==='function') window.toggleCartDrawer();
  };

  function setMeta(name, content){
    if(!content) return; let el=document.querySelector(`meta[name="${name}"]`);
    if(!el){el=document.createElement('meta');el.setAttribute('name',name);document.head.appendChild(el);} el.setAttribute('content',content);
  }

  function renderFavoritesPage(){
    const root=document.getElementById('favorites-root');if(!root)return;
    const list=getWishlist().map(getProduct).filter(Boolean);
    root.innerHTML=list.length?`<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">${list.map(enhancedProductCard).join('')}</div>`:`<div class="bg-white rounded-3xl border border-dashed p-10 text-center"><i class="fa-regular fa-heart text-4xl text-rose-300"></i><h1 class="text-xl font-black mt-4">هنوز محصولی ذخیره نشده</h1><p class="text-xs text-slate-400 mt-2">روی قلب محصولات بزنید تا اینجا نگه‌داری شوند.</p><a href="products.html" class="inline-block mt-5 px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold">رفتن به فروشگاه</a></div>`;
    updateCompareBar();
  }

  function renderComparePage(){
    const root=document.getElementById('compare-root');if(!root)return;
    const list=getCompare().map(getProduct).filter(Boolean);
    if(!list.length){root.innerHTML='<div class="bg-white rounded-3xl border border-dashed p-10 text-center"><i class="fa-solid fa-code-compare text-4xl text-orange-300"></i><h1 class="text-xl font-black mt-4">هنوز محصولی برای مقایسه انتخاب نشده</h1><a href="products.html" class="inline-block mt-5 px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold">انتخاب محصولات</a></div>';return;}
    const fields=[['قیمت','finalPrice'],['برند',x=>'details.brand'],['وزن',x=>'details.weight'],['سن مناسب',x=>'details.suitableAge'],['هدف مصرف',x=>'details.goals'],['کشور سازنده',x=>'details.country'],['تاریخ انقضا',x=>'details.expiryDate'],['امتیاز',x=>'details.rating']];
    root.innerHTML=`<div class="overflow-x-auto bg-white rounded-3xl border border-slate-200"><table class="min-w-[720px] w-full text-right"><thead><tr><th class="p-4 bg-slate-50 text-xs text-slate-500 w-40">ویژگی</th>${list.map(p=>`<th class="p-4 align-top"><img src="${safeText(p.image)}" class="w-28 h-28 object-contain rounded-2xl bg-slate-50 border mx-auto"><a href="${productUrl(p)}" class="block text-xs font-black text-slate-800 mt-2 hover:text-orange-600">${safeText(p.name)}</a></th>`).join('')}</tr></thead><tbody>${fields.map(([label,key])=>`<tr class="border-t"><td class="p-4 text-xs font-bold text-slate-500 bg-slate-50">${label}</td>${list.map(p=>{let v=typeof key==='function'?key(p):p[key]; if(label==='قیمت'&&typeof v==='number')v=window.formatPrice(v)+' تومان'; if(label==='امتیاز'&&v)v=`★ ${v}`; return `<td class="p-4 text-xs text-slate-700 font-bold">${safeText(v??'—')}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div><div class="mt-4 flex gap-2"><button onclick="clearCompare();renderComparePage();" class="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">پاک کردن مقایسه</button><a href="products.html" class="px-4 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold">افزودن محصول دیگر</a></div>`;
  }

  function renderQuizPage(){
    const root=document.getElementById('quiz-root');if(!root)return;
    root.innerHTML=`<div class="grid grid-cols-1 lg:grid-cols-2 gap-5"><form id="fox-quiz-form" class="bg-white rounded-3xl border border-slate-200 p-6 space-y-5"><div><span class="text-[11px] text-orange-600 font-black">۲ دقیقه</span><h1 class="text-2xl font-black text-slate-900 mt-1">کوییز انتخاب غذای مناسب</h1><p class="text-xs text-slate-500 mt-2">۵ سؤال کوتاه؛ خروجی فقط پیشنهاد اولیه فروشگاهی است و جایگزین نظر دامپزشک برای شرایط پزشکی نیست.</p></div>
      <label class="block"><span class="text-xs font-bold">سن</span><select name="age" class="mt-1 w-full rounded-xl border p-3 text-xs"><option value="kitten">بچه‌گربه</option><option value="adult">بالغ</option><option value="senior">سن بالا</option></select></label>
      <label class="block"><span class="text-xs font-bold">وزن</span><select name="weight" class="mt-1 w-full rounded-xl border p-3 text-xs"><option value="light">سبک</option><option value="normal">متوسط</option><option value="heavy">بالا</option></select></label>
      <label class="block"><span class="text-xs font-bold">عقیم‌شدن</span><select name="sterilized" class="mt-1 w-full rounded-xl border p-3 text-xs"><option value="yes">بله</option><option value="no">خیر</option></select></label>
      <label class="block"><span class="text-xs font-bold">حساسیت/نیاز ویژه</span><select name="sensitivity" class="mt-1 w-full rounded-xl border p-3 text-xs"><option value="none">ندارد</option><option value="urinary">ادراری</option><option value="sensitive">حساسیت گوارشی</option><option value="hairball">کنترل گلوله مو</option></select></label>
      <label class="block"><span class="text-xs font-bold">بودجه هر خرید</span><select name="budget" class="mt-1 w-full rounded-xl border p-3 text-xs"><option value="low">اقتصادی</option><option value="mid">متوسط</option><option value="high">پریمیوم</option></select></label>
      <button class="w-full py-3.5 rounded-2xl bg-orange-600 text-white font-black text-sm">دیدن ۳ پیشنهاد</button></form><div id="fox-quiz-result" class="bg-slate-900 text-white rounded-3xl p-6"><div class="h-full min-h-[360px] flex items-center justify-center text-center"><div><i class="fa-solid fa-wand-magic-sparkles text-4xl text-orange-300"></i><h2 class="text-xl font-black mt-4">هنوز نتیجه‌ای ساخته نشده</h2><p class="text-xs text-white/50 mt-2">پاسخ بده تا سه محصول از موجودی فعلی پیشنهاد شود.</p></div></div></div></div>`;
    const form=document.getElementById('fox-quiz-form');form.addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(form));localStorage.setItem(LS_QUIZ,JSON.stringify(data));const products=Array.isArray(window.products)?window.products:[];let scored=products.map(p=>{let score=0;const n=p.name||'', cat=p.categoryId||'';if(data.age==='kitten'&&/kitten|بچه گربه/i.test(n))score+=6;if(data.age==='adult'&&!/kitten|بچه گربه/i.test(n))score+=2;if(data.sensitivity==='urinary'&&/urinary|ادراری/i.test(n))score+=8;if(data.sensitivity==='hairball'&&/malt|مالت|مو/i.test(`${n} ${p.shortDesc}`))score+=7;if(data.sensitivity==='sensitive'&&/sensitive|حساس/i.test(n))score+=7;if(data.sterilized==='yes'&&/sterilised|sterilized|عقیم/i.test(n))score+=6;if(data.budget==='low'&&p.finalPrice<700000)score+=3;if(data.budget==='mid'&&p.finalPrice>=700000&&p.finalPrice<1600000)score+=3;if(data.budget==='high'&&p.finalPrice>=1600000)score+=3;if(p.isBestSeller)score+=1;return{p,score};}).sort((a,b)=>b.score-a.score).slice(0,3);document.getElementById('fox-quiz-result').innerHTML=`<h2 class="text-xl font-black">۳ پیشنهاد برای شما</h2><p class="text-xs text-white/50 mt-1">این پیشنهادها بر اساس پاسخ‌های همین کوییز و محصولات فعلی سایت انتخاب شدند.</p><div class="mt-5 space-y-3">${scored.map(({p})=>`<div class="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center gap-3"><img src="${safeText(p.image)}" class="w-16 h-16 object-contain rounded-xl bg-white"><div class="flex-1 min-w-0"><a href="${productUrl(p)}" class="font-bold text-xs block truncate">${safeText(p.name)}</a><div class="text-orange-300 font-black text-xs mt-1">${window.formatPrice(p.finalPrice)} تومان</div></div><button onclick="addToCart('${safeText(p.id)}')" class="px-3 py-2 rounded-xl bg-orange-500 text-white text-[10px] font-black">افزودن</button></div>`).join('')}</div>`;});
  }

  function injectHeaderLinks(){
    document.querySelectorAll('nav').forEach(nav=>{
      if(nav.querySelector('[data-foxshop-links]'))return;
      const wrap=document.createElement('div');wrap.dataset.foxshopLinks='1';wrap.className='hidden xl:flex items-center gap-2 mr-2';wrap.innerHTML='<a href="favorites.html" class="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-700">♥ علاقه‌مندی‌ها <span data-wishlist-count>۰</span></a><a href="compare.html" class="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700">مقایسه</a><a href="quiz.html" class="text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-orange-50 text-orange-700">کوییز</a>';nav.appendChild(wrap);
    });
  }


  function refreshAfterStoreReady(){
    patchCartRenderer(); patchRenderers(); patchHomeRenderers();
    if (document.getElementById('home-featured-grid') && typeof window.renderHomeFeatured === 'function') window.renderHomeFeatured();
    if (document.getElementById('home-bestseller-grid') && typeof window.renderHomeBestSellers === 'function') window.renderHomeBestSellers();
    if (document.getElementById('catalog-products-grid') && typeof window.renderProductsCatalog === 'function') window.renderProductsCatalog();
    const commerce = document.getElementById('fox-home-commerce');
    if (commerce) commerce.remove();
    if (document.getElementById('home-categories-grid')) injectHomeCommerceSections();
    updateWishlistUI(); updateCompareBar(); updateShippingUI(); addOrderButtonsToCart();
  }

  function initFeatures(){
    patchCartRenderer(); patchRenderers(); patchHomeRenderers(); injectHeaderLinks(); updateWishlistUI(); updateCompareBar();
    const path=location.pathname;
    if (document.getElementById('home-featured-grid') && typeof window.renderHomeFeatured === 'function') window.renderHomeFeatured();
    if (document.getElementById('home-bestseller-grid') && typeof window.renderHomeBestSellers === 'function') window.renderHomeBestSellers();
    if (document.getElementById('catalog-products-grid') && typeof window.renderProductsCatalog === 'function') window.renderProductsCatalog();
    if(document.getElementById('product-page-root')) renderProductPage();
    if(document.getElementById('favorites-root')) renderFavoritesPage();
    if(document.getElementById('compare-root')) renderComparePage();
    if(document.getElementById('quiz-root')) renderQuizPage();
    if(document.getElementById('home-categories-grid')) injectHomeCommerceSections();
    enhanceCatalogCards(); addTrustToExistingPriceAreas(); addOrderButtonsToCart(); updateShippingUI();
    if((path==='/products.html' || path.endsWith('/products.html')) && !document.getElementById('fox-products-helper')) { const main=document.querySelector('main'); if(main){ main.insertAdjacentHTML('afterbegin','<div id="fox-products-helper" class="mb-4 rounded-2xl bg-white border border-orange-100 p-3 flex flex-col sm:flex-row gap-2 items-center justify-between"><div class="text-[11px] text-slate-500"><i class="fa-solid fa-magnifying-glass text-orange-500"></i> جستجوی نام، برند، وزن، طعم و نیاز مصرفی</div><a href="quiz.html" class="px-3 py-2 rounded-xl bg-orange-600 text-white text-[10px] font-bold">کوییز انتخاب غذا</a></div>'); } }
  }

  function wrapInitPage(){
    if(typeof window.initPage !== 'function' || window.initPage.__foxWrapped) return;
    const base=window.initPage;
    const wrapped=function(...args){const r=base.apply(this,args);queueMicrotask(initFeatures);return r;}; wrapped.__foxWrapped=true;window.initPage=wrapped;
  }

  // Re-render additive sections once the remote D1 catalog or local fallback has finished loading.
  window.addEventListener('foxshop:store-ready', () => setTimeout(refreshAfterStoreReady, 0), { passive: true });

  // Wait until all existing inline page scripts have defined initPage, then wrap it.
  wrapInitPage();
  window.addEventListener('load', () => { wrapInitPage(); setTimeout(initFeatures, 60); }, { once: true });
  document.addEventListener('DOMContentLoaded', () => { setTimeout(initFeatures, 350); }, { once: true });

  window.__foxshopBuildInvoice = buildInvoiceText;
  window.__foxshopBuildItems = buildItemsText;
  window.updateCompareBar = updateCompareBar;
  window.renderFavoritesPage = renderFavoritesPage;
  window.renderComparePage = renderComparePage;
})();
