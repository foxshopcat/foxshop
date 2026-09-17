/**
 * FoxShop Cat Boutique - Vanilla JavaScript Core
 * Cloudflare Pages Ready - No build step or npm required
 */

// Global Configuration
const INSTAGRAM_URL = "https://www.instagram.com/foxshop.cat?stkn=MTRud2VncmpudDZpeg==";
const SUPPORT_PHONE = "09934191774";

// Storage Keys
const LS_PRODUCTS = "foxshop_products_data";
const LS_CATEGORIES = "foxshop_categories_data";
const LS_CART = "foxshop_cart_data";
const LS_SETTINGS = "foxshop_settings_data";
const LS_ADMIN = "foxshop_admin_credentials";
const LS_ADMIN_USERNAME = "foxshop_admin_username";
const DEFAULT_ADMIN_USERNAME = "admin";
const RUBIKA_URL = "https://rubika.ir/baloot_cats";

// State
let products = [];
let categories = [];
let cart = [];
let settings = {
  shopName: "FoxShop",
  phone: "+98 993 419 1774",
  instagramUrl: INSTAGRAM_URL,
  aboutText: "پت‌شاپ FoxShop در تبریز با تمرکز بر محصولات گربه فعالیت می‌کند.",
  shopCity: "تبریز",
  freeShippingThreshold: 2000000,
  shippingTable: "هزینه و زمان ارسال بر اساس شهر و روش ارسال هنگام ثبت سفارش اعلام می‌شود.",
  returnPolicy: "سیاست مرجوعی: کالا باید سالم، استفاده‌نشده و مطابق شرایط اعلام‌شده در فاکتور تحویل باشد.",
  storageText: "شرایط نگهداری هر محصول در صفحه همان محصول درج می‌شود.",
  authenticityText: "ضمانت اصالت کالا بر اساس فاکتور فروشگاه و شرایط اعلام‌شده در سفارش.",
  licenseText: "",
  supportText: "پشتیبانی و ثبت سفارش از طریق اینستاگرام و روبیکا انجام می‌شود."
};

let logoClickCount = 0;
let logoClickTimer = null;
let isAdminLoggedIn = false;
let adminUsername = DEFAULT_ADMIN_USERNAME;
let backendReady = false;
let lastRemoteStore = null;

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", async () => {
  try { await initStorage(); } catch (err) { console.error("Init storage error:", err); }
  initHeader();
  initCartUI();
  initSecretAdminTrigger();
  createToastContainer();
  checkRemoteAdminSession();
  if (typeof initPage === "function") { initPage(); }
});

/**
 * Storage Initialization
 */
function normalizeCategories(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(item => item && typeof item === "object").map(item => ({
    id: String(item.id || "").trim(),
    name: String(item.name || "").trim(),
    slug: String(item.slug || item.name || "").trim(),
    image: typeof item.image === "string" ? item.image : "",
    icon: typeof item.icon === "string" && item.icon ? item.icon : "fa-paw",
    color: typeof item.color === "string" && item.color ? item.color : "from-orange-500 to-amber-500"
  })).filter(item => item.id && item.name);
}

function normalizeProducts(list) {
  if (!Array.isArray(list)) return [];
  const defaults = (typeof DEFAULT_PRODUCTS !== "undefined" && Array.isArray(DEFAULT_PRODUCTS)) ? DEFAULT_PRODUCTS : [];
  const defaultMap = new Map(defaults.map(item => [String(item.id), item]));
  const parseArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value.trim()) {
      try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch (_) {}
    }
    return [];
  };
  return list.filter(item => item && typeof item === "object").map(item => {
    const fallback = defaultMap.get(String(item.id || "")) || {};
    return {
      ...fallback,
      ...item,
      id: String(item.id || "").trim(),
      name: String(item.name || "").trim(),
      categoryId: String(item.categoryId || "").trim(),
      originalPrice: Number(item.originalPrice) || 0,
      finalPrice: Number(item.finalPrice) || 0,
      discountPercent: Number(item.discountPercent) || 0,
      stockStatus: item.stockStatus || "in_stock",
      image: typeof item.image === "string" ? item.image : "",
      shortDesc: typeof item.shortDesc === "string" ? item.shortDesc : "",
      fullDesc: typeof item.fullDesc === "string" ? item.fullDesc : "",
      slug: String(item.slug || fallback.slug || item.id || "").trim(),
      brand: String(item.brand || fallback.brand || inferBrandFromName(item.name) || "").trim(),
      weight: String(item.weight || fallback.weight || inferWeightFromName(item.name) || "").trim(),
      flavor: String(item.flavor ?? fallback.flavor ?? "").trim(),
      ageRange: String(item.ageRange ?? fallback.ageRange ?? "").trim(),
      goal: String(item.goal ?? fallback.goal ?? "").trim(),
      ingredients: String(item.ingredients ?? fallback.ingredients ?? "").trim(),
      nutritionAnalysis: String(item.nutritionAnalysis ?? fallback.nutritionAnalysis ?? "").trim(),
      countryOfOrigin: String(item.countryOfOrigin ?? fallback.countryOfOrigin ?? "").trim(),
      barcode: String(item.barcode ?? fallback.barcode ?? "").trim(),
      expirationDate: String(item.expirationDate ?? fallback.expirationDate ?? "").trim(),
      usage: String(item.usage ?? fallback.usage ?? "").trim(),
      warranty: String(item.warranty ?? fallback.warranty ?? "").trim(),
      storage: String(item.storage ?? fallback.storage ?? "").trim(),
      authenticity: String(item.authenticity ?? fallback.authenticity ?? "").trim(),
      stockQuantity: Math.max(0, Number(item.stockQuantity ?? fallback.stockQuantity ?? 0) || 0),
      minStock: Math.max(0, Number(item.minStock ?? fallback.minStock ?? 0) || 0),
      restockTime: String(item.restockTime ?? fallback.restockTime ?? "").trim(),
      rating: Math.min(5, Math.max(0, Number(item.rating ?? fallback.rating ?? 0) || 0)),
      reviewCount: Math.max(0, Number(item.reviewCount ?? fallback.reviewCount ?? 0) || 0),
      salesCount: Math.max(0, Number(item.salesCount ?? fallback.salesCount ?? 0) || 0),
      extraImages: parseArray(item.extraImages ?? fallback.extraImages),
      relatedProductIds: parseArray(item.relatedProductIds ?? fallback.relatedProductIds),
      complementaryProductIds: parseArray(item.complementaryProductIds ?? fallback.complementaryProductIds),
      faq: parseArray(item.faq ?? fallback.faq),
      isConsumable: Boolean(item.isConsumable || fallback.isConsumable || /غذا|خاک|پوچ|کنسرو|تشویقی|مالت|litter|food|treat/i.test(`${item.name||''} ${item.goal||''}`)),
      shippingNote: String(item.shippingNote ?? fallback.shippingNote ?? "").trim(),
      returnPolicy: String(item.returnPolicy ?? fallback.returnPolicy ?? "").trim(),
      isFeatured: Boolean(item.isFeatured),
      isBestSeller: Boolean(item.isBestSeller),
      isNew: Boolean(item.isNew)
    };
  }).filter(item => item.id && item.name && item.categoryId);
}

function inferBrandFromName(name) {
  const n = String(name || "").toLowerCase();
  const brands = [
    ["royal canin", "Royal Canin"], ["رویال کنین", "Royal Canin"],
    ["gimcat", "GimCat"], ["جیم کت", "GimCat"],
    ["schesir", "Schesir"], ["شسیر", "Schesir"],
    ["wanpy", "Wanpy"], ["وانپی", "Wanpy"],
    ["van cat", "Van Cat"], ["ون کت", "Van Cat"]
  ];
  return brands.find(([needle]) => n.includes(needle))?.[1] || "";
}
function inferWeightFromName(name) {
  const match = String(name || "").match(/(?:وزن|حجم)\\s*([۰-۹0-9۰-۹٫.,]+\\s*(?:کیلوگرم|kg|گرم|g|میلی‌لیتر|ml|عدد|عددی))/i);
  return match ? match[1] : "";
}

function normalizeCart(list) {
  if (!Array.isArray(list)) return [];
  return list.filter(item => item && typeof item === "object").map(item => ({
    id: String(item.id || "").trim(),
    name: String(item.name || "").trim(),
    price: Number(item.price) || 0,
    quantity: Math.max(1, Number(item.quantity) || 1),
    image: typeof item.image === "string" ? item.image : ""
  })).filter(item => item.id && item.name);
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "content-type": "application/json" }),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { ok: false, error: text || "پاسخ نامعتبر از سرور" }; }
  if (!response.ok || data?.ok === false) {
    const err = new Error(data?.error || `HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }
  return data;
}

function applyRemoteStore(store) {
  if (!store || typeof store !== "object") return false;
  categories = normalizeCategories(store.categories || []);
  products = normalizeProducts(store.products || []);
  if (store.settings && typeof store.settings === "object") settings = { ...settings, ...store.settings };
  lastRemoteStore = { categories, products, settings: { ...settings } };
  backendReady = true;
  return true;
}

async function refreshRemoteStore() {
  const data = await apiRequest("/store");
  applyRemoteStore(data);
  return data;
}

async function checkRemoteAdminSession() {
  try {
    const data = await apiRequest("/admin/me", { method: "GET" });
    if (data.authenticated) {
      isAdminLoggedIn = true;
      adminUsername = data.username || DEFAULT_ADMIN_USERNAME;
      applyRemoteStore(data.store);
    }
  } catch (_) {
    // Not logged in or backend is unavailable; public catalog fallback remains active.
  }
}

async function initStorage() {
  // Public catalog comes from Cloudflare D1 when the API is configured.
  try {
    await refreshRemoteStore();
  } catch (remoteErr) {
    backendReady = false;
    console.warn("Remote store unavailable; using built-in catalog fallback:", remoteErr);
    try {
      const savedCats = localStorage.getItem(LS_CATEGORIES);
      const defaultCats = (typeof DEFAULT_CATEGORIES !== "undefined") ? [...DEFAULT_CATEGORIES] : [];
      categories = normalizeCategories(savedCats ? JSON.parse(savedCats) : null);
      if (!categories.length) categories = normalizeCategories(defaultCats);

      const savedProds = localStorage.getItem(LS_PRODUCTS);
      const defaultProds = (typeof DEFAULT_PRODUCTS !== "undefined") ? [...DEFAULT_PRODUCTS] : [];
      products = normalizeProducts(savedProds ? JSON.parse(savedProds) : null);
      if (!products.length) products = normalizeProducts(defaultProds);

      const savedSettings = localStorage.getItem(LS_SETTINGS);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        if (parsedSettings && typeof parsedSettings === "object" && !Array.isArray(parsedSettings)) settings = { ...settings, ...parsedSettings };
      }
    } catch (err) {
      console.error("Local fallback load error:", err);
      categories = normalizeCategories(typeof DEFAULT_CATEGORIES !== "undefined" ? DEFAULT_CATEGORIES : []);
      products = normalizeProducts(typeof DEFAULT_PRODUCTS !== "undefined" ? DEFAULT_PRODUCTS : []);
    }
  }

  try {
    const savedCart = localStorage.getItem(LS_CART);
    cart = normalizeCart(savedCart ? JSON.parse(savedCart) : []);
  } catch { cart = []; }
}

function saveCart() {
  safeSaveStorage(LS_CART, cart);
  updateCartBadge();
  renderCartDrawer();
}

/**
 * Toast Notifications
 */
function createToastContainer() {
  if (!document.getElementById("toast-container")) {
    const container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
}

function showToast(message, type = "success") {
  createToastContainer();
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  let icon = "fa-circle-check text-emerald-400";
  if (type === "info") icon = "fa-circle-info text-amber-400";

  toast.innerHTML = `<i class="fa-solid ${icon} text-base"></i><span>${message}</span>`;
  container.appendChild(toast);

  // Trigger anim
  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/**
 * Persian Number Formatter
 */
function formatPrice(num) {
  if (num === undefined || num === null) return "۰";
  return Number(num).toLocaleString("fa-IR");
}

function toPersianDigits(str) {
  const persian = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  return String(str).replace(/[0-9]/g, w => persian[+w]);
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, function(m) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m];
  });
}

/**
 * Header & Mobile Navigation
 */
function initHeader() {
  const mobileBtn = document.getElementById("mobile-menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  const closeBtn = document.getElementById("close-mobile-menu");

  if (mobileBtn && mobileMenu) {
    mobileBtn.addEventListener("click", () => mobileMenu.classList.remove("hidden"));
  }
  if (closeBtn && mobileMenu) {
    closeBtn.addEventListener("click", () => mobileMenu.classList.add("hidden"));
  }

  // Populate categories dropdown if exists
  const dropdown = document.getElementById("header-categories-dropdown");
  if (dropdown) {
    if (categories.length === 0) {
      dropdown.innerHTML = `<div class="p-3 text-xs text-slate-400 text-center font-normal">دسته‌بندی ثبت نشده است</div>`;
    } else {
      dropdown.innerHTML = categories.map(cat => `
        <a href="products.html?category=${cat.id}" class="flex items-center justify-between p-2.5 rounded-xl hover:bg-orange-50 text-slate-700 text-xs font-semibold transition">
          <span class="flex items-center gap-2">
            <i class="fa-solid fa-paw text-orange-500 text-[10px]"></i>
            <span>${escapeHtml(cat.name)}</span>
          </span>
          <span class="text-[10px] text-slate-400 font-normal">${products.filter(p => p.categoryId === cat.id).length} کالا</span>
        </a>
      `).join("");
    }
  }

  // Global Search Box
  const globalSearchInput = document.getElementById("global-search-input");
  if (globalSearchInput) {
    globalSearchInput.dataset.foxBound = "1";
    globalSearchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const query = globalSearchInput.value.trim();
        window.location.href = `products.html?search=${encodeURIComponent(query)}`;
      }
    });
  }

  updateCartBadge();
}

/**
 * Cart Functionality
 */
function initCartUI() {
  const cartTrigger = document.getElementById("cart-trigger-btn");
  const cartDrawer = document.getElementById("cart-drawer");
  const closeCartBtn = document.getElementById("close-cart-btn");

  if (cartTrigger && cartDrawer) {
    cartTrigger.addEventListener("click", () => {
      renderCartDrawer();
      cartDrawer.classList.remove("hidden");
    });
  }

  if (closeCartBtn && cartDrawer) {
    closeCartBtn.addEventListener("click", () => {
      cartDrawer.classList.add("hidden");
    });
  }

  // Close when clicking outside overlay
  if (cartDrawer) {
    cartDrawer.addEventListener("click", (e) => {
      if (e.target === cartDrawer) {
        cartDrawer.classList.add("hidden");
      }
    });
  }
}

function addToCart(productId, quantity = 1) {
  const prod = products.find(p => p.id === productId);
  if (!prod) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      id: prod.id,
      name: prod.name,
      price: prod.finalPrice,
      image: prod.image,
      quantity: quantity
    });
  }

  saveCart();
  showToast(`«${prod.name}» به سبد خرید اضافه شد 🐾`, "success");
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  showToast("کالا از سبد خرید حذف شد", "info");
}

function updateCartQuantity(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    removeFromCart(productId);
  } else {
    saveCart();
  }
}

function updateCartBadge() {
  const badges = document.querySelectorAll(".cart-count-badge");
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  badges.forEach(b => {
    b.textContent = toPersianDigits(totalItems);
    if (totalItems > 0) {
      b.classList.remove("hidden");
    } else {
      b.classList.add("hidden");
    }
  });
}

function calculateCartTotal() {
  return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function renderCartDrawer() {
  const container = document.getElementById("cart-items-container");
  const emptyView = document.getElementById("cart-empty-view");
  const footerView = document.getElementById("cart-footer-view");
  const totalAmountEl = document.getElementById("cart-total-amount");

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = "";
    if (emptyView) emptyView.classList.remove("hidden");
    if (footerView) footerView.classList.add("hidden");
    return;
  }

  if (emptyView) emptyView.classList.add("hidden");
  if (footerView) footerView.classList.remove("hidden");

  container.innerHTML = cart.map(item => `
    <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
      <img src="${item.image}" alt="${escapeHtml(item.name)}" loading="lazy" decoding="async" class="w-14 h-14 object-contain rounded-xl bg-white p-1 border border-slate-200">
      <div class="flex-1 min-w-0">
        <h4 class="font-bold text-xs text-slate-800 line-clamp-1">${escapeHtml(item.name)}</h4>
        <p class="text-xs font-black text-orange-600 mt-1">${formatPrice(item.price)} <span class="text-[10px] font-normal text-slate-500">تومان</span></p>
      </div>
      <div class="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1">
        <button onclick="updateCartQuantity('${item.id}', 1)" class="w-6 h-6 rounded-lg text-slate-600 hover:bg-orange-50 hover:text-orange-600 font-bold text-xs flex items-center justify-center">+</button>
        <span class="w-6 text-center text-xs font-black text-slate-800">${toPersianDigits(item.quantity)}</span>
        <button onclick="updateCartQuantity('${item.id}', -1)" class="w-6 h-6 rounded-lg text-slate-600 hover:bg-rose-50 hover:text-rose-600 font-bold text-xs flex items-center justify-center">-</button>
      </div>
      <button onclick="removeFromCart('${item.id}')" class="text-slate-400 hover:text-rose-500 p-1.5" title="حذف">
        <i class="fa-solid fa-trash-can text-xs"></i>
      </button>
    </div>
  `).join("");

  if (totalAmountEl) {
    totalAmountEl.textContent = formatPrice(calculateCartTotal());
  }
}

/**
 * Product Quick View Modal & Logo Reveal Animation
 */
function openProductDetailModalWithSplash(productId) {
  let loader = document.getElementById("fox-product-loader");
  if (!loader) {
    loader = document.createElement("div");
    loader.id = "fox-product-loader";
    loader.innerHTML = `
      <div class="fox-loader-card">
        <div class="fox-loader-logo-ring">
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCA9wPsl74QezScl6MSgkI2o0xUTzfcjGUtFbzxomrJAIf6RXTyJ4Vt37NbG-HSROy0k7OY1w1g0FQycVmExxDWxx-pTo4BozV8Rt7OnTeb8vvsIBis0RxQIaeFqPPYcMaOM7KMCmth-w7A9l_TAW9Z_nmWueMMYj89L-312K11CIz-TgjjEO9hEsd41UPsCivtswJi7O-hpFxHWGJl4xZHf5w5R50arV9ZPUhMFzPJlfyNtICfR0IBS6hMALr65T-hxkA" alt="FoxShop Logo" class="w-12 h-12 object-contain">
        </div>
        <div class="text-center">
          <span class="text-xs font-black text-slate-800 tracking-tight block">Fox<span class="text-orange-600">Shop</span></span>
          <span class="text-[10px] text-slate-400 font-medium">پت‌شاپ تخصصی گربه‌ها • در حال نمایش...</span>
        </div>
      </div>
    `;
    document.body.appendChild(loader);
  }

  loader.classList.remove("closing");
  loader.classList.add("active");

  setTimeout(() => {
    loader.classList.add("closing");
    setTimeout(() => {
      loader.classList.remove("active", "closing");
      openProductDetailModal(productId, true);
    }, 180);
  }, 420);
}

function openProductDetailModal(productId, skipSplash = false) {
  if (!skipSplash) {
    openProductDetailModalWithSplash(productId);
    return;
  }

  const prod = products.find(p => p.id === productId);
  if (!prod) return;

  const modal = document.getElementById("product-detail-modal");
  if (!modal) return;

  const catObj = categories.find(c => c.id === prod.categoryId);
  const catName = catObj ? catObj.name : "عمومی";

  document.getElementById("detail-modal-product-id").value = prod.id;
  document.getElementById("detail-modal-img").src = prod.image;
  document.getElementById("detail-modal-title").textContent = prod.name;
  document.getElementById("detail-modal-category").textContent = catName;
  document.getElementById("detail-modal-short").textContent = prod.shortDesc || "";
  document.getElementById("detail-modal-full").textContent = prod.fullDesc || "";
  
  document.getElementById("detail-modal-price").textContent = formatPrice(prod.finalPrice);
  
  const origPriceEl = document.getElementById("detail-modal-orig-price");
  if (origPriceEl) {
    if (prod.discountPercent > 0) {
      origPriceEl.textContent = formatPrice(prod.originalPrice) + " تومان";
      origPriceEl.classList.remove("hidden");
    } else {
      origPriceEl.classList.add("hidden");
    }
  }

  // Stock status badge
  const stockEl = document.getElementById("detail-modal-stock");
  if (stockEl) {
    if (prod.stockStatus === "out_of_stock") {
      stockEl.className = "bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full";
      stockEl.textContent = "ناموجود";
    } else if (prod.stockStatus === "low_stock") {
      stockEl.className = "bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full";
      stockEl.textContent = "تعداد محدود در انبار";
    } else {
      stockEl.className = "bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full";
      stockEl.textContent = "موجود و آماده ارسال";
    }
  }

  modal.classList.remove("hidden");
}

function closeProductDetailModal() {
  const modal = document.getElementById("product-detail-modal");
  if (modal) modal.classList.add("hidden");
}

/**
 * Direct Instagram Product Order / Inquiries
 */
function openInstagramProduct(productId) {
  const prod = products.find(p => p.id === productId);
  if (!prod) return;

  const msg = `🐾 سلام و وقت بخیر از سایت FoxShop\nاستعلام موجودی و سفارش کالا:\n📦 نام کالا: ${prod.name}\n💰 قیمت: ${formatPrice(prod.finalPrice)} تومان`;
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(msg).catch(() => {});
  }

  showToast("اطلاعات کالا کپی شد! در حال انتقال به اینستاگرام...", "instagram");
  setTimeout(() => {
    window.open(INSTAGRAM_URL, "_blank");
  }, 400);
}

/**
 * Secret 5-Clicks on Brand Logo -> Opens In-Browser Admin Management
 * Prevents default navigation so tapping never reloads or returns to home page!
 */
function initSecretAdminTrigger() {
  const triggers = document.querySelectorAll(".brand-logo-trigger");
  const badge = document.getElementById("tap-badge");

  triggers.forEach(trigger => {
    trigger.addEventListener("click", (e) => {
      // Prevent standard link navigation so tapping does not reload or leave the page
      if (e) e.preventDefault();

      logoClickCount++;
      trigger.classList.remove("logo-tap");
      void trigger.offsetWidth;
      trigger.classList.add("logo-tap");

      if (badge) {
        badge.textContent = `${logoClickCount}/5`;
        badge.classList.remove("opacity-0");
      }

      clearTimeout(logoClickTimer);
      logoClickTimer = setTimeout(() => {
        // If clicked only once and on another page, user intended to go home
        if (logoClickCount === 1) {
          const isHome = window.location.pathname.endsWith("index.html") || 
                         window.location.pathname === "/" || 
                         window.location.pathname === "" ||
                         window.location.pathname.endsWith("/");
          if (!isHome) {
            window.location.href = "index.html";
          }
        }
        logoClickCount = 0;
        if (badge) badge.classList.add("opacity-0");
      }, 700);

      if (logoClickCount >= 5) {
        logoClickCount = 0;
        clearTimeout(logoClickTimer);
        if (badge) badge.classList.add("opacity-0");
        openAdminModal();
      }
    });
  });
}

/**
 * Robust Client-Side Storage & Image Compression Engine
 * Guarantees zero QuotaExceededError crashes and ultrafast loading
 */
function safeSaveStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error("Storage save error:", err);
    showToast("حافظه مرورگر پر شده است. لطفاً از تصویر با حجم کمتر استفاده نمایید.", "error");
    return false;
  }
}

/**
 * High-performance Canvas Image Compressor
 * Converts any camera/gallery photo into a lightweight, crisp WebP/JPEG (approx 15-35KB)
 */
function compressImage(file, maxWidth = 360, maxHeight = 360, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("هیچ فایلی انتخاب نشده است"));
    
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("خطا در خواندن فایل"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("فرمت فایل تصویری معتبر نیست"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL("image/webp", quality);
        if (!dataUrl || dataUrl.indexOf("data:image/webp") !== 0) {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Security: SHA-256 Hashing and Brute-Force Rate Limiting
 */
const LS_FAILED_ATTEMPTS = "foxshop_failed_login_attempts";
const LS_LOCKOUT_UNTIL = "foxshop_lockout_until";
const LS_ADMIN_HASH = "foxshop_admin_password_hash";
const DEFAULT_ADMIN_HASHES = [
  "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", // admin
  "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9", // admin123
  "0e71c6674fa77ef7aa85ffc327ec29a67471fb627d3539bc2ac08819a8e0f6fc"  // foxadmin
];

async function sha256Hash(message) {
  try {
    if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    }
  } catch (e) {}
  
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    hash = ((hash << 5) - hash) + message.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

function getLockoutRemainingSeconds() {
  return 0;
}

let activeAdminTab = "products";

/**
 * Compatibility handlers kept for the existing HTML templates.
 * They delegate to the current modal/order implementations without reloading the page.
 */
function copyTextToClipboard(text) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try { document.execCommand("copy"); } catch (err) { console.warn("Clipboard copy failed:", err); }
  textarea.remove();
}

function toggleMobileMenu() {
  const mobileMenu = document.getElementById("mobile-menu");
  if (!mobileMenu) return;
  mobileMenu.classList.toggle("hidden");
}

function toggleCartDrawer() {
  const drawer = document.getElementById("cart-drawer");
  if (!drawer) return;
  if (drawer.classList.contains("hidden")) {
    renderCartDrawer();
    drawer.classList.remove("hidden");
  } else {
    drawer.classList.add("hidden");
  }
}

function openAdminPortalModal() {
  openAdminModal();
}

function closeAdminPortalModal() {
  closeAdminModal();
}

function setAdminTab(tab) {
  adminSwitchTab(tab);
}

function openRubikaOrderModal(prefilledProductId = null) {
  let targetItems = [];

  if (prefilledProductId) {
    const prod = products.find(p => p.id === prefilledProductId);
    if (prod) {
      targetItems = [{ name: prod.name, price: prod.finalPrice, quantity: 1 }];
    }
  } else {
    targetItems = [...cart];
  }

  if (targetItems.length === 0) {
    showToast("لطفاً ابتدا کالایی را انتخاب کنید یا به سبد خرید اضافه کنید.", "info");
    return;
  }

  const modal = document.getElementById("rubika-order-modal");
  const list = document.getElementById("rb-order-items-list");
  const total = document.getElementById("rb-order-total-amount");

  if (list) {
    list.innerHTML = targetItems.map(item => `
      <div class="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
        <span class="font-medium text-slate-800 truncate max-w-[200px]">${escapeHtml(item.name)}</span>
        <span class="text-slate-500 font-bold">${toPersianDigits(item.quantity)} عدد × ${formatPrice(item.price)}</span>
      </div>
    `).join("");
  }

  if (total) {
    total.textContent = formatPrice(
      targetItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0)
    ) + " تومان";
  }

  if (modal) modal.classList.remove("hidden");
}

function closeRubikaOrderModal() {
  const modal = document.getElementById("rubika-order-modal");
  if (modal) modal.classList.add("hidden");
}

function buildOrderMessageFromForm() {
  const name = document.getElementById("rb-customer-name")?.value.trim() || "همراه عزیز";
  const phone = document.getElementById("rb-customer-phone")?.value.trim() || "";
  const address = document.getElementById("rb-customer-address")?.value.trim() || "هماهنگی در چت";
  const notes = document.getElementById("rb-customer-notes")?.value.trim() || "-";

  let itemsSummary = "";
  let totalPrice = 0;

  if (cart.length > 0) {
    cart.forEach(item => {
      const price = Number(item.price) || 0;
      const quantity = Number(item.quantity) || 0;
      itemsSummary += `• ${item.name} (${toPersianDigits(quantity)} عدد) - ${formatPrice(price * quantity)} تومان\n`;
      totalPrice += price * quantity;
    });
  } else {
    const activeDetailId = document.getElementById("detail-modal-product-id")?.value;
    const prod = products.find(p => p.id === activeDetailId);
    if (prod) {
      itemsSummary = `• ${prod.name} (۱ عدد) - ${formatPrice(prod.finalPrice)} تومان\n`;
      totalPrice = Number(prod.finalPrice) || 0;
    }
  }

  return `🐾 سفارش جدید از سایت FoxShop.cat 🐾\n\n` +
    `👤 نام مشتری: ${name}\n` +
    `📞 شماره تماس: ${phone}\n` +
    `📍 آدرس تحویل: ${address}\n\n` +
    `📦 اقلام سفارش:\n${itemsSummary}\n` +
    `💰 مبلغ کل: ${formatPrice(totalPrice)} تومان\n` +
    `📝 توضیحات: ${notes}\n\n` +
    `با تشکر از پت‌شاپ تخصصی گربه‌ها FoxShop`;
}

function submitRubikaOrder(event) {
  if (event?.preventDefault) event.preventDefault();
  const message = buildOrderMessageFromForm();
  copyTextToClipboard(message);
  showToast("متن سفارش کپی شد! در حال باز کردن روبیکا @baloot_cats...", "rubika");
  setTimeout(() => window.open(RUBIKA_URL, "_blank", "noopener,noreferrer"), 600);
}

function submitInstagramOrder() {
  const message = buildOrderMessageFromForm();
  copyTextToClipboard(message);
  showToast("متن سفارش کپی شد! در حال انتقال به دایرکت اینستاگرام...", "instagram");
  setTimeout(() => window.open(INSTAGRAM_URL, "_blank", "noopener,noreferrer"), 600);
}

function openAdminModal() {
  let modal = document.getElementById("admin-portal-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "admin-portal-modal";
    modal.className = "fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm hidden flex items-center justify-center p-2 sm:p-5";
    document.body.appendChild(modal);
  }

  try {
    renderAdminPortal();
  } catch (err) {
    console.error("renderAdminPortal error:", err);
  }
  modal.classList.remove("hidden");
}

function closeAdminModal() {
  const modal = document.getElementById("admin-portal-modal");
  if (modal) modal.classList.add("hidden");
}

function adminSwitchTab(tab) {
  activeAdminTab = tab;
  renderAdminPortal();
  if (tab === 'reviews') setTimeout(loadAdminReviews, 0);
}

function renderAdminPortal() {
  const modal = document.getElementById("admin-portal-modal");
  if (!modal) return;

  const remainingLockout = getLockoutRemainingSeconds();

  if (!isAdminLoggedIn) {
    // Render Auth Screen with Brute Force Protection
    modal.innerHTML = `
      <div class="glass-card fox-admin-theme fox-admin-login bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-orange-200 relative animate-float">
        <button onclick="closeAdminModal()" class="absolute top-4 left-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-gradient-to-tr from-orange-500 to-amber-400 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-orange-500/30 mb-3">
            <i class="fa-solid fa-shield-halved text-2xl"></i>
          </div>
          <h3 class="text-lg font-black text-slate-800">ورود به مدیریت FoxShop</h3>
          <p class="text-xs text-slate-500 mt-1">سامانه امن مدیریت اختصاصی پت‌شاپ گربه‌ها</p>
        </div>

        ${remainingLockout > 0 ? `
          <div class="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2">
            <i class="fa-solid fa-triangle-exclamation text-base"></i>
            <div>
              <p class="font-bold">حساب موقتاً قفل شده است</p>
              <p class="text-[11px]">به دلیل تلاش‌های ناموفق، لطفاً <span id="lockout-timer" class="font-bold text-rose-900">${toPersianDigits(remainingLockout)}</span> ثانیه صبر کنید.</p>
            </div>
          </div>
        ` : ""}

        <form onsubmit="handleAdminLogin(event)" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">نام کاربری مدیریت:</label>
            <input type="text" id="admin-username-input" required autocomplete="username" ${remainingLockout > 0 ? "disabled" : ""}
              value="${escapeHtml(adminUsername || DEFAULT_ADMIN_USERNAME)}"
              placeholder="نام کاربری را وارد نمایید..."
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-xs font-mono transition bg-slate-50 disabled:bg-slate-100">
            <p class="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
              <i class="fa-solid fa-user-shield text-orange-400"></i>
              <span>نام کاربری پیش‌فرض: <code class="font-bold text-slate-600">${escapeHtml(DEFAULT_ADMIN_USERNAME)}</code></span>
            </p>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">رمز عبور مدیریت:</label>
            <input type="password" id="admin-password-input" required ${remainingLockout > 0 ? "disabled" : ""}
              placeholder="رمز عبور را وارد نمایید..."
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-xs font-mono transition bg-slate-50 disabled:bg-slate-100">
            <p class="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
              <i class="fa-solid fa-key text-orange-400"></i>
              <span>رمز پیش‌فرض سیستم: <code class="font-bold text-slate-600">admin123</code></span>
            </p>
          </div>

          <button type="submit" ${remainingLockout > 0 ? "disabled" : ""}
            class="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/25 transition flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed">
            <i class="fa-solid fa-lock-open"></i>
            <span>ورود امن به داشبورد</span>
          </button>
        </form>

        <div class="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span class="flex items-center gap-1"><i class="fa-solid fa-shield-check text-emerald-500"></i> محافظت ضد Brute-force</span>
          <span>نسخه پایدار v2.4</span>
        </div>
      </div>
    `;
    return;
  }

  // Render Logged-in Dashboard
  modal.innerHTML = `
    <div class="glass-card fox-admin-theme fox-admin-dashboard bg-white rounded-3xl p-4 sm:p-6 max-w-4xl w-full shadow-2xl border border-orange-200 relative max-h-[92vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-600/20">
            <i class="fa-solid fa-paw text-lg"></i>
          </div>
          <div>
            <h3 class="text-sm sm:text-base font-black text-slate-800 flex items-center gap-2">
              <span>پنل مدیریت پیشرفته FoxShop</span>
              <span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">احراز هویت شده</span>
            </h3>
            <p class="text-[11px] text-slate-400">مدیریت آنی محصولات و دسته‌بندی‌ها با Cloudflare D1 و تصاویر ذخیره‌شده در دیتابیس آنلاین</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="adminLogout()" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-bold transition flex items-center gap-1.5">
            <i class="fa-solid fa-right-from-bracket"></i>
            <span class="hidden sm:inline">خروج</span>
          </button>
          <button onclick="closeAdminModal()" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="flex items-center gap-2 pt-3 pb-2 border-b border-slate-100 shrink-0 overflow-x-auto">
        <button onclick="adminSwitchTab('products')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeAdminTab === 'products' ? 'bg-orange-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
          <i class="fa-solid fa-boxes-stacked"></i>
          <span>محصولات (${toPersianDigits(products.length)})</span>
        </button>
        <button onclick="adminSwitchTab('categories')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeAdminTab === 'categories' ? 'bg-orange-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
          <i class="fa-solid fa-layer-group"></i>
          <span>دسته‌بندی‌ها با تصویر WebP (${toPersianDigits(categories.length)})</span>
        </button>
        <button onclick="adminSwitchTab('commerce')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeAdminTab === 'commerce' ? 'bg-orange-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
          <i class="fa-solid fa-store"></i>
          <span>فروش و اعتماد</span>
        </button>
        <button onclick="adminSwitchTab('reviews')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeAdminTab === 'reviews' ? 'bg-orange-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
          <i class="fa-solid fa-star"></i>
          <span>نظرات مشتری</span>
        </button>
        <button onclick="adminSwitchTab('security')" class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${activeAdminTab === 'security' ? 'bg-orange-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">
          <i class="fa-solid fa-shield-halved"></i>
          <span>امنیت و پشتیبان‌گیری</span>
        </button>
      </div>

      <!-- Tab Content (Scrollable) -->
      <div class="overflow-y-auto custom-scroll flex-1 py-4">
        ${renderAdminTabContent()}
      </div>
    </div>
  `;
}

function renderAdminTabContent() {
  if (activeAdminTab === "products") {
    return `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <!-- New Product Form -->
        <div class="lg:col-span-5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <h4 class="font-bold text-xs text-slate-800 mb-3 flex items-center gap-2">
            <i class="fa-solid fa-plus text-orange-600"></i>
            <span>افزودن محصول جدید</span>
          </h4>
          <form onsubmit="handleAdminAddProduct(event)" class="space-y-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">نام محصول:</label>
              <input type="text" id="admin-new-name" required placeholder="مثال: غذای خشک گربه رویال کنین 4kg"
                class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-orange-500">
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">دسته‌بندی:</label>
                <select id="admin-new-cat" class="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none">
                  ${categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("")}
                </select>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">قیمت (تومان):</label>
                <input type="number" id="admin-new-price" required placeholder="1250000"
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-orange-500">
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">درصد تخفیف (%):</label>
                <input type="number" id="admin-new-discount" value="0" min="0" max="90"
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-orange-500">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">وضعیت انبار:</label>
                <select id="admin-new-stock" class="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none">
                  <option value="in_stock">موجود در انبار</option>
                  <option value="low_stock">موجودی محدود</option>
                  <option value="out_of_stock">ناموجود</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">آدرس عکس یا فایل تصویر:</label>
              <input type="text" id="admin-new-img" inputmode="url" placeholder="https://... یا عکس ذخیره‌شده در سایت"
                class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-orange-500 mb-1.5">
              <input type="file" id="admin-product-file" accept="image/webp,image/png,image/jpeg"
                onchange="handleAdminFileToInput('admin-product-file', 'admin-new-img', 'admin-prod-preview')"
                class="block w-full text-[11px] text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer">
              <input type="hidden" id="admin-new-img-key" value="">
              <div id="admin-prod-preview" class="hidden mt-2 p-1.5 bg-white rounded-xl border border-slate-200 flex items-center gap-2">
                <img id="admin-prod-preview-img" class="w-10 h-10 object-contain rounded-lg">
                <span class="text-[10px] text-slate-500">پیش‌نمایش تصویر انتخابی</span>
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">توضیحات مختصر:</label>
              <textarea id="admin-new-desc" rows="2" placeholder="توضیحات کوتاه برای مشخصات محصول..."
                class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-orange-500"></textarea>
            </div>

            <div class="rounded-2xl border border-orange-100 bg-orange-50/40 p-3 space-y-2">
              <p class="text-[10px] font-black text-orange-700 flex items-center gap-1.5"><i class="fa-solid fa-database"></i> اطلاعات فروشگاهی محصول</p>
              <div class="grid grid-cols-2 gap-2">
                <input id="admin-new-brand" placeholder="برند" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
                <input id="admin-new-weight" placeholder="وزن / حجم" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
                <input id="admin-new-flavor" placeholder="طعم / تنوع" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
                <input id="admin-new-age" placeholder="سن مناسب" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
                <input id="admin-new-goal" placeholder="هدف مصرف (حساس، عقیم، مو، ... )" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs col-span-2">
                <input id="admin-new-country" placeholder="کشور سازنده" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
                <input id="admin-new-barcode" placeholder="بارکد" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
                <input id="admin-new-stock-qty" type="number" min="0" placeholder="تعداد واقعی انبار" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
                <input id="admin-new-min-stock" type="number" min="0" placeholder="حداقل موجودی" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
                <input id="admin-new-restock" placeholder="زمان تأمین مجدد" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
              </div>
              <textarea id="admin-new-ingredients" rows="2" placeholder="ترکیبات" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"></textarea>
              <textarea id="admin-new-nutrition" rows="2" placeholder="آنالیز تغذیه‌ای" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"></textarea>
              <textarea id="admin-new-usage" rows="2" placeholder="روش مصرف" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"></textarea>
              <textarea id="admin-new-storage" rows="2" placeholder="روش نگهداری" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"></textarea>
            </div>

            <button type="submit" class="w-full py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-floppy-disk"></i>
              <span>ذخیره و انتشار محصول</span>
            </button>
          </form>
        </div>

        <!-- Products List -->
        <div class="lg:col-span-7 flex flex-col">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-bold text-xs text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-list text-orange-600"></i>
              <span>لیست محصولات فعال (${toPersianDigits(products.length)})</span>
            </h4>
            <input type="text" id="admin-prod-search" oninput="adminFilterProducts(this.value)" placeholder="جستجوی سریع در محصولات..."
              class="px-3 py-1 rounded-xl border border-slate-200 text-xs w-48 outline-none focus:border-orange-500">
          </div>

          <div id="admin-products-list" class="space-y-2 max-h-[460px] overflow-y-auto custom-scroll pr-1">
            ${renderAdminProductsRows(products)}
          </div>
        </div>
      </div>
    `;
  } else if (activeAdminTab === "categories") {
    return `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <!-- Add Category Form with WebP Support -->
        <div class="lg:col-span-5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <h4 class="font-bold text-xs text-slate-800 mb-3 flex items-center gap-2">
            <i class="fa-solid fa-folder-plus text-orange-600"></i>
            <span>افزودن دسته‌بندی جدید با عکس WebP</span>
          </h4>
          <form onsubmit="handleAdminAddCategory(event)" class="space-y-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">نام دسته‌بندی (فارسی):</label>
              <input type="text" id="admin-cat-name" required placeholder="مثال: بستنی و کرمی گربه"
                class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-orange-500">
            </div>

            <div class="p-3 rounded-xl bg-orange-50/70 border border-orange-200/80 flex items-center gap-2">
              <i class="fa-solid fa-wand-magic-sparkles text-orange-500"></i>
              <p class="text-[10px] text-orange-800 leading-relaxed">
                شناسهٔ داخلی این دسته‌بندی به‌صورت خودکار توسط سیستم ساخته می‌شود و نیازی به ورود Slug / ID نیست.
              </p>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">
                <span class="text-orange-600 font-black">تصویر WebP دسته‌بندی:</span>
                <span class="text-[10px] text-slate-400 mr-1">(آدرس اینترنتی یا فایل WebP)</span>
              </label>
              <input type="url" id="admin-cat-img" placeholder="https://... یا انتخاب فایل با فرمت .webp"
                class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-orange-500 mb-1.5">
              
              <div class="p-2.5 bg-orange-50/60 rounded-xl border border-orange-200/80">
                <p class="text-[10px] text-orange-800 font-semibold mb-1 flex items-center gap-1">
                  <i class="fa-solid fa-file-image"></i>
                  <span>آپلود فایل WebP مستقیم از دستگاه:</span>
                </p>
                <input type="file" id="admin-cat-file" accept="image/webp,image/png,image/jpeg"
                  onchange="handleAdminFileToInput('admin-cat-file', 'admin-cat-img', 'admin-cat-preview')"
                  class="block w-full text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-orange-600 file:text-white hover:file:bg-orange-700 cursor-pointer">
              </div>

              <div id="admin-cat-preview" class="hidden mt-2 p-2 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                <img id="admin-cat-preview-img" class="w-12 h-12 object-cover rounded-lg border border-orange-200">
                <div>
                  <span class="text-[11px] font-bold text-slate-700 block">پیش‌نمایش تصویر WebP</span>
                  <span class="text-[9px] text-emerald-600 font-semibold">آماده استفاده در طراحی</span>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">آیکون دسته‌بندی:</label>
                <select id="admin-cat-icon" class="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none">
                  <option value="fa-paw">🐾 رد پنجه (fa-paw)</option>
                  <option value="fa-bowl-food">🍲 ظرف غذا (fa-bowl-food)</option>
                  <option value="fa-fish">🐟 ماهی و کنسرو (fa-fish)</option>
                  <option value="fa-cookie-bite">🍪 تشویقی (fa-cookie-bite)</option>
                  <option value="fa-shield-heart">🛡️ مکمل و درمانی (fa-shield-heart)</option>
                  <option value="fa-box">📦 جعبه و بستر (fa-box)</option>
                  <option value="fa-cat">🐱 گربه (fa-cat)</option>
                  <option value="fa-soap">🧼 بهداشت و شستشو (fa-soap)</option>
                </select>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">گرادیان رنگی:</label>
                <select id="admin-cat-color" class="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none">
                  <option value="from-orange-500 to-amber-500">نارنجی طلایی (Fox)</option>
                  <option value="from-rose-500 to-pink-500">رز و تمشکی</option>
                  <option value="from-amber-400 to-orange-500">عسلی کهربایی</option>
                  <option value="from-emerald-500 to-teal-600">سبز زمردی</option>
                  <option value="from-blue-500 to-indigo-600">آبی اقیانوسی</option>
                  <option value="from-purple-500 to-indigo-500">بنفش سلطنتی</option>
                </select>
              </div>
            </div>

            <button type="submit" class="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5">
              <i class="fa-solid fa-plus-circle"></i>
              <span>افزودن دسته‌بندی با عکس WebP</span>
            </button>
          </form>
        </div>

        <!-- Categories List -->
        <div class="lg:col-span-7 flex flex-col">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-bold text-xs text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-layer-group text-orange-600"></i>
              <span>دسته‌بندی‌های فعال (${toPersianDigits(categories.length)})</span>
            </h4>
          </div>

          <div class="space-y-2.5 max-h-[460px] overflow-y-auto custom-scroll pr-1">
            ${categories.map(cat => {
              const catProds = products.filter(p => p.categoryId === cat.id);
              return `
                <div class="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs hover:bg-orange-50/40 transition">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-xl overflow-hidden bg-white border border-slate-200 relative shrink-0 shadow-sm">
                      ${cat.image ? `
                        <img src="${cat.image}" class="w-full h-full object-cover" alt="${escapeHtml(cat.name)}" loading="lazy" decoding="async">
                      ` : `
                        <div class="w-full h-full bg-gradient-to-br ${cat.color || 'from-orange-500 to-amber-500'} flex items-center justify-center text-white">
                          <i class="fa-solid ${cat.icon || 'fa-paw'} text-base"></i>
                        </div>
                      `}
                      <span class="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-white/90 text-orange-600 flex items-center justify-center text-[9px] shadow">
                        <i class="fa-solid ${cat.icon || 'fa-paw'}"></i>
                      </span>
                    </div>

                    <div>
                      <p class="font-black text-slate-800 text-xs">${escapeHtml(cat.name)}</p>
                      <p class="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1"><i class="fa-solid fa-fingerprint text-orange-300"></i> شناسه خودکار</p>
                      <div class="flex items-center gap-2 mt-1">
                        <span class="bg-white px-2 py-0.5 rounded-md border text-[10px] text-slate-600 font-bold">
                          ${toPersianDigits(catProds.length)} محصول
                        </span>
                        ${cat.image ? '<span class="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold"><i class="fa-solid fa-image"></i> دارای تصویر WebP</span>' : '<span class="text-[9px] text-slate-400">بدون تصویر</span>'}
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-1.5 shrink-0">
                    <label class="px-2.5 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95" title="انتخاب مستقیم عکس WebP از حافظه دستگاه">
                      <i class="fa-solid fa-cloud-arrow-up text-orange-600"></i>
                      <span class="hidden sm:inline">آپلود WebP</span>
                      <span class="sm:hidden">عکس</span>
                      <input type="file" accept="image/*" class="hidden" onchange="handleDirectCategoryFileUpload('${cat.id}', this)">
                    </label>
                    <button type="button" onclick="adminEditCategoryUrl('${cat.id}')" class="px-2 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-orange-300 text-slate-600 hover:text-orange-600 text-[11px] font-bold transition flex items-center gap-1" title="تغییر با آدرس اینترنتی">
                      <i class="fa-solid fa-link text-[10px]"></i>
                      <span class="hidden sm:inline">لینک</span>
                    </button>
                    ${cat.image ? `
                      <button type="button" onclick="adminRemoveCategoryPhoto('${cat.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="حذف عکس و بازگشت به آیکون">
                        <i class="fa-solid fa-image-slash text-xs"></i>
                      </button>
                    ` : ''}
                    <button type="button" onclick="adminDeleteCategory('${cat.id}')" class="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition" title="حذف دسته">
                      <i class="fa-solid fa-trash text-xs"></i>
                    </button>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    `;
  } else if (activeAdminTab === "commerce") {
    const current = settings || {};
    return `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div class="bg-slate-50 rounded-2xl border border-slate-200 p-4">
          <h4 class="font-bold text-xs text-slate-800 mb-3 flex items-center gap-2"><i class="fa-solid fa-truck-fast text-orange-600"></i> فروش، ارسال و اعتماد</h4>
          <form onsubmit="saveCommerceSettings(event)" class="space-y-3">
            <div class="grid grid-cols-2 gap-2">
              <input id="setting-shop-city" value="${escapeHtml(current.shopCity || 'تبریز')}" placeholder="شهر فروشگاه" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
              <input id="setting-free-shipping" type="number" min="0" value="${Number(current.freeShippingThreshold)||0}" placeholder="حد ارسال رایگان (تومان)" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
            </div>
            <textarea id="setting-shipping" rows="3" placeholder="جدول هزینه و زمان ارسال" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">${escapeHtml(current.shippingTable || '')}</textarea>
            <textarea id="setting-return" rows="3" placeholder="سیاست مرجوعی" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">${escapeHtml(current.returnPolicy || '')}</textarea>
            <textarea id="setting-storage" rows="2" placeholder="روش نگهداری عمومی" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">${escapeHtml(current.storageText || '')}</textarea>
            <textarea id="setting-authenticity" rows="2" placeholder="ضمانت اصالت" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">${escapeHtml(current.authenticityText || '')}</textarea>
            <textarea id="setting-license" rows="2" placeholder="مجوزها / مدارک قابل نمایش" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">${escapeHtml(current.licenseText || '')}</textarea>
            <textarea id="setting-support" rows="2" placeholder="متن پشتیبانی" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">${escapeHtml(current.supportText || '')}</textarea>
            <button type="submit" class="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center justify-center gap-2"><i class="fa-solid fa-floppy-disk"></i> ذخیره تنظیمات فروشگاه</button>
          </form>
        </div>
        <div class="space-y-4">
          <div class="p-4 rounded-2xl bg-orange-50 border border-orange-200">
            <p class="text-xs font-black text-orange-900 mb-2">وضعیت فعلی</p>
            <div class="text-[11px] text-orange-800 leading-7">شهر: <b>${escapeHtml(current.shopCity || 'تبریز')}</b><br>حد ارسال رایگان: <b>${formatPrice(Number(current.freeShippingThreshold)||0)}</b><br>این اطلاعات در صفحه محصول، سبد خرید و صفحات اعتماد نمایش داده می‌شوند.</div>
          </div>
          <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
            برای «اصالت کالا» و «مجوزها» فقط متن و مدارکی را وارد کنید که واقعاً در اختیار فروشگاه است. سیستم ادعای بدون مدرک تولید نمی‌کند.
          </div>
        </div>
      </div>`;
  } else if (activeAdminTab === "reviews") {
    return `
      <div class="space-y-3">
        <div class="p-3 rounded-2xl bg-orange-50 border border-orange-200 text-[11px] text-orange-900 leading-relaxed">نظرهای مشتری ابتدا در وضعیت «در انتظار بررسی» ذخیره می‌شوند. فقط نظرهای تأییدشده در سایت و امتیاز محصول نمایش داده می‌شوند.</div>
        <div id="admin-reviews-list" class="space-y-2"><div class="py-10 text-center text-xs text-slate-400"><i class="fa-solid fa-spinner fa-spin text-orange-500"></i> در حال دریافت نظرها...</div></div>
      </div>`;
  } else if (activeAdminTab === "security") {
    return `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <!-- Security Status -->
        <div class="lg:col-span-6 space-y-4">
          <div class="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
            <div class="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-2">
              <i class="fa-solid fa-shield-check text-base"></i>
              <span>وضعیت امنیت فرانت‌اند و Cloudflare Pages: فعال و امن</span>
            </div>
            <ul class="text-[11px] text-emerald-700 space-y-1.5 leading-relaxed">
              <li class="flex items-center gap-1.5">
                <i class="fa-solid fa-check text-[10px]"></i>
                <span>محافظت در برابر حملات تزریق کد (XSS Sanitation Engine)</span>
              </li>
              <li class="flex items-center gap-1.5">
                <i class="fa-solid fa-check text-[10px]"></i>
                <span>محدودسازی تلاش ورود سمت سرور در Cloudflare D1</span>
              </li>
              <li class="flex items-center gap-1.5">
                <i class="fa-solid fa-check text-[10px]"></i>
                <span>هش رمز عبور سمت سرور با PBKDF2 + salt و نشست HttpOnly</span>
              </li>
              <li class="flex items-center gap-1.5">
                <i class="fa-solid fa-check text-[10px]"></i>
                <span>هدرهای امنیتی Cloudflare Pages (_headers): CSP, X-Frame, X-Content-Type</span>
              </li>
            </ul>
          </div>

          <!-- Change Username Form -->
          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <h4 class="font-bold text-xs text-slate-800 mb-3 flex items-center gap-2">
              <i class="fa-solid fa-user-shield text-orange-600"></i>
              <span>تغییر نام کاربری مدیریت</span>
            </h4>
            <form onsubmit="handleAdminChangeUsername(event)" class="space-y-3">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">نام کاربری فعلی:</label>
                <input type="text" value="${escapeHtml(adminUsername || DEFAULT_ADMIN_USERNAME)}" disabled
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs outline-none">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">نام کاربری جدید:</label>
                <input type="text" id="admin-new-username" required minlength="3" maxlength="40" autocomplete="username"
                  placeholder="مثال: foxadmin"
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-orange-500">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">رمز عبور فعلی برای تأیید:</label>
                <input type="password" id="admin-username-current-pwd" required autocomplete="current-password"
                  placeholder="رمز عبور فعلی..."
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-orange-500">
              </div>
              <button type="submit" class="w-full py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-user-pen"></i>
                <span>ذخیره نام کاربری جدید</span>
              </button>
            </form>
          </div>

          <!-- Change Password Form -->
          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <h4 class="font-bold text-xs text-slate-800 mb-3 flex items-center gap-2">
              <i class="fa-solid fa-key text-orange-600"></i>
              <span>تغییر رمز عبور مدیریت (رمزنگاری SHA-256)</span>
            </h4>
            <form onsubmit="handleAdminChangePassword(event)" class="space-y-3">
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">رمز عبور فعلی:</label>
                <input type="password" id="admin-current-pwd" required placeholder="رمز فعلی..."
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-orange-500">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">رمز عبور جدید:</label>
                <input type="password" id="admin-new-pwd" required minlength="6" placeholder="حداقل ۶ کاراکتر..."
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-orange-500">
              </div>
              <div>
                <label class="block text-[11px] font-bold text-slate-600 mb-1">تکرار رمز عبور جدید:</label>
                <input type="password" id="admin-confirm-pwd" required minlength="6" placeholder="تکرار رمز جدید..."
                  class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-orange-500">
              </div>

              <button type="submit" class="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-lock"></i>
                <span>ذخیره هش رمز جدید</span>
              </button>
            </form>
          </div>
        </div>

        <!-- Backup & Database Management -->
        <div class="lg:col-span-6 space-y-4">
          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <h4 class="font-bold text-xs text-slate-800 mb-2 flex items-center gap-2">
              <i class="fa-solid fa-database text-orange-600"></i>
              <span>پشتیبان‌گیری و خروجی داده‌ها (JSON Backup)</span>
            </h4>
            <p class="text-[11px] text-slate-500 mb-3 leading-relaxed">
              محصولات، دسته‌بندی‌ها و تنظیمات در Cloudflare D1 نگهداری می‌شوند و تصاویر آپلودی در D1 ذخیره می‌شوند. پشتیبان JSON نیز از داده‌های آنلاین تهیه می‌شود.
            </p>

            <div class="grid grid-cols-2 gap-2">
              <button onclick="adminExportBackup()" class="py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm">
                <i class="fa-solid fa-download"></i>
                <span>دانلود پشتیبان کامل</span>
              </button>

              <label class="py-2.5 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm text-center">
                <i class="fa-solid fa-upload"></i>
                <span>بازیابی فایل JSON</span>
                <input type="file" accept=".json" onchange="adminImportBackup(event)" class="hidden">
              </label>
            </div>
          </div>

          <div class="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <h4 class="font-bold text-xs text-amber-900 mb-1.5 flex items-center gap-1.5">
              <i class="fa-solid fa-rotate-left text-amber-600"></i>
              <span>بازنشانی به داده‌های پیش‌فرض اولیه FoxShop</span>
            </h4>
            <p class="text-[11px] text-amber-800 mb-3 leading-relaxed">
              در صورت تمایل می‌توانید کاتالوگ را به محصولات و دسته‌بندی‌های استاندارد اولیه بازگردانید.
            </p>
            <button onclick="adminResetDefaults()" class="py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition flex items-center gap-1.5">
              <i class="fa-solid fa-arrows-rotate"></i>
              <span>بازنشانی به کاتالوگ اولیه</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

function renderAdminProductsRows(productList) {
  if (productList.length === 0) {
    return `<div class="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed">هیچ کالایی یافت نشد</div>`;
  }

  return productList.map(prod => `
    <div class="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-orange-50/40 rounded-xl border border-slate-200 text-xs transition">
      <div class="flex items-center gap-2.5">
        <img src="${prod.image}" class="w-10 h-10 object-contain rounded-lg bg-white border border-slate-200 p-0.5 shrink-0" alt="${escapeHtml(prod.name)}" loading="lazy" decoding="async">
        <div>
          <p class="font-bold text-slate-800 line-clamp-1 max-w-[240px] sm:max-w-xs">${escapeHtml(prod.name)}</p>
          <div class="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
            <span class="font-bold text-orange-600">${formatPrice(prod.finalPrice)} تومان</span>
            ${prod.discountPercent > 0 ? `<span class="bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold">${toPersianDigits(prod.discountPercent)}٪ تخفیف</span>` : ""}
          </div>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <button onclick="openProductDetailModalWithSplash('${prod.id}')" class="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition" title="مشاهده">
          <i class="fa-solid fa-eye text-xs"></i>
        </button>
        <button onclick='openAdminProductEditor(${JSON.stringify(String(prod.id)).replace(/'/g, "&#39;")})' class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="ویرایش محصول">
          <i class="fa-solid fa-pen-to-square text-xs"></i>
        </button>
        <button onclick="adminDeleteProduct('${prod.id}')" class="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition" title="حذف">
          <i class="fa-solid fa-trash text-xs"></i>
        </button>
      </div>
    </div>
  `).join("");
}

function adminFilterProducts(query) {
  const q = query.trim().toLowerCase();
  const listEl = document.getElementById("admin-products-list");
  if (!listEl) return;
  const filtered = products.filter(p => p.name.toLowerCase().includes(q) || (p.shortDesc && p.shortDesc.toLowerCase().includes(q)));
  listEl.innerHTML = renderAdminProductsRows(filtered);
}

function waitForImageLoad(url, timeout = 12000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let done = false;
    const finish = (fn, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      fn(value);
    };
    const timer = setTimeout(() => finish(reject, new Error('تصویر در سرور ذخیره شد اما مرورگر نتوانست آن را لود کند.')), timeout);
    img.onload = () => finish(resolve, true);
    img.onerror = () => finish(reject, new Error('تصویر در سرور ذخیره شد اما فایل خروجی قابل نمایش نیست.'));
    img.src = `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
  });
}

/**
 * Handle File Upload (WebP, PNG, JPG) with Automatic Canvas Compression
 * Safely converts camera/gallery photos into tiny, crisp WebP/JPEG dataURL
 */
async function handleAdminFileToInput(fileInputId, targetInputId, previewWrapperId) {
  const fileInput = document.getElementById(fileInputId);
  const targetInput = document.getElementById(targetInputId);
  const previewWrapper = document.getElementById(previewWrapperId);
  if (!fileInput?.files?.[0]) return;
  if (!backendReady || !isAdminLoggedIn) { showToast("لطفاً ابتدا وارد پنل مدیریت شوید.", "error"); return; }

  const file = fileInput.files[0];
  fileInput.dataset.uploading = "1";
  showToast("در حال فشرده‌سازی و ذخیره تصویر در دیتابیس...", "info");
  try {
    const blob = await compressImageBlob(file);
    const form = new FormData();
    form.append("file", blob, "foxshop-image.webp");
    const data = await apiRequest("/admin/upload-image", { method: "POST", body: form });
    await waitForImageLoad(data.url);
    if (targetInput) targetInput.value = data.url;
    if (previewWrapper) {
      previewWrapper.classList.remove("hidden");
      const img = previewWrapper.querySelector("img");
      if (img) img.src = data.url;
    }
    const keyInputId = targetInputId === "admin-new-img" ? "admin-new-img-key" : "admin-cat-img-key";
    const keyInput = document.getElementById(keyInputId);
    if (keyInput) keyInput.value = data.key;
    fileInput.dataset.uploading = "0";
    showToast("تصویر با موفقیت در دیتابیس آنلاین ذخیره شد 🐾", "success");
  } catch (err) {
    fileInput.dataset.uploading = "0";
    console.error(err); showToast(err.message || "خطا در بارگذاری تصویر", "error");
  }
}

async function compressImageBlob(file, maxWidth = 1000, maxHeight = 1000, quality = 0.80) {
  if (!file) throw new Error('هیچ فایلی انتخاب نشده است');
  const type = String(file.type || '').toLowerCase();
  if (!/^image\/(webp|jpeg|jpg|png|avif|gif)$/.test(type)) {
    throw new Error('فقط تصویر JPG، PNG، WebP، AVIF یا GIF مجاز است.');
  }

  let source = null;
  let objectUrl = null;
  try {
    // createImageBitmap avoids a giant base64 Data URL in memory on mobile.
    if ('createImageBitmap' in window) {
      try {
        source = await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch (_) {
        source = await createImageBitmap(file);
      }
    }
  } catch (_) {}

  if (!source) {
    objectUrl = URL.createObjectURL(file);
    source = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('فرمت فایل تصویری معتبر نیست'));
      img.src = objectUrl;
    });
  }

  const srcWidth = source.width || source.naturalWidth;
  const srcHeight = source.height || source.naturalHeight;
  if (!srcWidth || !srcHeight) throw new Error('ابعاد تصویر قابل تشخیص نیست.');

  const scale = Math.min(1, maxWidth / srcWidth, maxHeight / srcHeight);
  const width = Math.max(1, Math.round(srcWidth * scale));
  const height = Math.max(1, Math.round(srcHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('مرورگر از پردازش تصویر پشتیبانی نمی‌کند');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);

  const canvasBlob = (mime, q) => new Promise((resolve) => canvas.toBlob(resolve, mime, q));

  // Prefer WebP; fall back to JPEG. Keep the file comfortably below D1's
  // 2,000,000-byte BLOB/row limit so the image remains reliable in D1.
  const attempts = [
    ['image/webp', Math.min(0.86, Math.max(0.62, quality))],
    ['image/webp', 0.72],
    ['image/webp', 0.62],
    ['image/jpeg', 0.82],
    ['image/jpeg', 0.72]
  ];

  let best = null;
  for (const [mime, q] of attempts) {
    const blob = await canvasBlob(mime, q);
    if (!blob) continue;
    if (!best || blob.size < best.size) best = blob;
    if (blob.size <= 900000) {
      best = blob;
      break;
    }
  }

  if (!best) throw new Error('فشرده‌سازی تصویر انجام نشد.');
  if (best.size > 1800000) throw new Error('حجم تصویر بعد از فشرده‌سازی هنوز زیاد است؛ عکس کوچک‌تری انتخاب کنید.');
  return best;
}

/**
 * Direct File Upload for Existing Category
 * Triggered directly by native <input type="file"> on iOS/Android/Desktop
 */
async function handleDirectCategoryFileUpload(catId, inputEl) {
  if (!inputEl?.files?.[0]) return;
  if (!backendReady || !isAdminLoggedIn) { showToast("لطفاً ابتدا وارد پنل مدیریت شوید.", "error"); return; }
  const cat = categories.find(c => c.id === catId); if (!cat) return;
  showToast(`در حال فشرده‌سازی و ذخیره عکس «${cat.name}» در دیتابیس...`, "info");
  try {
    const blob = await compressImageBlob(inputEl.files[0]);
    const form = new FormData(); form.append("file", blob, "category-image.webp");
    const uploaded = await apiRequest("/admin/upload-image", { method: "POST", body: form });
    await waitForImageLoad(uploaded.url);
    const saved = await apiRequest(`/admin/category/${encodeURIComponent(catId)}`, { method: "PUT", body: JSON.stringify({ ...cat, image: uploaded.url, imageKey: uploaded.key }) });
    applyRemoteStore(saved.store); renderAdminPortal(); initHeader();
    if (typeof renderHomeCategories === "function") renderHomeCategories();
    if (typeof renderCategoryPills === "function") renderCategoryPills();
    showToast(`عکس جدید دسته‌بندی «${cat.name}» ذخیره شد 🐾`, "success");
  } catch (err) { console.error(err); showToast(err.message || "خطا در بارگذاری عکس", "error"); }
}

/**
 * Change Category Image via Internet URL
 */
async function adminEditCategoryUrl(catId) {
  const cat = categories.find(c => c.id === catId); if (!cat) return;
  const currentUrl = cat.image && !cat.image.startsWith("data:") ? cat.image : "";
  const newUrl = prompt(`آدرس اینترنتی تصویر WebP برای دسته‌بندی «${cat.name}» را وارد کنید:`, currentUrl);
  if (newUrl === null) return;
  const image = newUrl.trim(); if (!image) return;
  try {
    const data = await apiRequest(`/admin/category/${encodeURIComponent(catId)}`, { method: "PUT", body: JSON.stringify({ ...cat, image }) });
    applyRemoteStore(data.store); renderAdminPortal(); initHeader();
    if (typeof renderHomeCategories === "function") renderHomeCategories();
    if (typeof renderCategoryPills === "function") renderCategoryPills();
    showToast(`عکس دسته‌بندی «${cat.name}» به‌روزرسانی شد 🐾`, "success");
  } catch (err) { showToast(err.message || "خطا در ذخیره تصویر", "error"); }
}

/**
 * Remove Category Photo (Revert to colored gradient icon)
 */
async function adminRemoveCategoryPhoto(catId) {
  const cat = categories.find(c => c.id === catId); if (!cat) return;
  if (!confirm(`آیا می‌خواهید تصویر دسته‌بندی «${cat.name}» را حذف کنید و به آیکون بازگردد؟`)) return;
  try {
    const data = await apiRequest(`/admin/category/${encodeURIComponent(catId)}`, { method: "PUT", body: JSON.stringify({ ...cat, image: "" }) });
    applyRemoteStore(data.store); renderAdminPortal(); initHeader();
    if (typeof renderHomeCategories === "function") renderHomeCategories();
    if (typeof renderCategoryPills === "function") renderCategoryPills();
    showToast("تصویر دسته‌بندی حذف شد و به آیکون پیش‌فرض برگشت", "info");
  } catch (err) { showToast(err.message || "خطا در حذف تصویر", "error"); }
}

/**
 * Fallback prompt edit category photo
 */
function adminPromptEditCategoryPhoto(catId) {
  adminEditCategoryUrl(catId);
}

/**
 * Add / Edit Category with WebP Image
 */
async function handleAdminAddCategory(e) {
  e.preventDefault();
  if (!backendReady || !isAdminLoggedIn) { showToast("ورود مدیریت لازم است.", "error"); return; }
  const name = document.getElementById("admin-cat-name")?.value.trim() || "";
  const img = document.getElementById("admin-cat-img")?.value.trim() || "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80&fm=webp";
  const icon = document.getElementById("admin-cat-icon")?.value || "fa-paw";
  const color = document.getElementById("admin-cat-color")?.value || "from-orange-500 to-amber-500";
  const imageKey = document.getElementById("admin-cat-img-key")?.value || "";
  if (!name) { showToast("لطفاً نام دسته‌بندی را وارد نمایید", "info"); return; }
  try {
    const data = await apiRequest("/admin/category", { method:"POST", body: JSON.stringify({ name, slug:name, image:img, imageKey, icon, color }) });
    applyRemoteStore(data.store); renderAdminPortal(); initHeader();
    if (typeof renderHomeCategories === "function") renderHomeCategories();
    if (typeof renderCategoryPills === "function") renderCategoryPills();
    showToast("دسته‌بندی جدید با شناسه خودکار ذخیره شد 🐾", "success");
  } catch (err) { showToast(err.message || "خطا در ذخیره دسته‌بندی", "error"); }
}

async function adminDeleteCategory(catId) {
  if (categories.length <= 1) { showToast("امکان حذف همه دسته‌بندی‌ها وجود ندارد", "info"); return; }
  if (!confirm("آیا از حذف این دسته‌بندی اطمینان دارید؟")) return;
  try {
    const data = await apiRequest(`/admin/category/${encodeURIComponent(catId)}`, { method:"DELETE" });
    applyRemoteStore(data.store); renderAdminPortal(); initHeader();
    if (typeof renderHomeCategories === "function") renderHomeCategories();
    showToast("دسته‌بندی حذف شد", "info");
  } catch (err) { showToast(err.message || "خطا در حذف دسته‌بندی", "error"); }
}

/**
 * Handle Admin Add Product
 */
async function handleAdminAddProduct(e) {
  e.preventDefault();
  if (!backendReady || !isAdminLoggedIn) { showToast("ورود مدیریت لازم است.", "error"); return; }
  const name = document.getElementById("admin-new-name")?.value.trim() || "";
  const cat = document.getElementById("admin-new-cat")?.value || "";
  const price = parseFloat(document.getElementById("admin-new-price")?.value) || 0;
  const discount = parseInt(document.getElementById("admin-new-discount")?.value, 10) || 0;
  const stock = document.getElementById("admin-new-stock")?.value || "in_stock";
  const img = document.getElementById("admin-new-img")?.value.trim() || "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=600&q=80";
  const imageKey = document.getElementById("admin-new-img-key")?.value || "";
  const fileInput = document.getElementById("admin-product-file");
  const desc = document.getElementById("admin-new-desc")?.value.trim() || "";
  const extra = id => document.getElementById(id)?.value.trim() || "";
  if (fileInput?.dataset.uploading === "1") {
    showToast("لطفاً صبر کنید تا آپلود و فشرده‌سازی تصویر تمام شود.", "info");
    return;
  }
  if (!name || !cat) { showToast("نام محصول و دسته‌بندی الزامی است.", "info"); return; }
  const finalPrice = discount > 0 ? Math.round(price * (1 - discount / 100)) : price;
  try {
    const data = await apiRequest("/admin/product", { method:"POST", body: JSON.stringify({
      name, categoryId:cat, originalPrice:price, discountPercent:discount, finalPrice, stockStatus:stock,
      image:img, imageKey, shortDesc:desc, fullDesc:desc, isFeatured:true, isBestSeller:false, isNew:true,
      brand:extra('admin-new-brand'), weight:extra('admin-new-weight'), flavor:extra('admin-new-flavor'), ageRange:extra('admin-new-age'),
      goal:extra('admin-new-goal'), countryOfOrigin:extra('admin-new-country'), barcode:extra('admin-new-barcode'),
      stockQuantity:Number(document.getElementById('admin-new-stock-qty')?.value)||0,
      minStock:Number(document.getElementById('admin-new-min-stock')?.value)||0,
      restockTime:extra('admin-new-restock'), ingredients:extra('admin-new-ingredients'), nutritionAnalysis:extra('admin-new-nutrition'),
      usage:extra('admin-new-usage'), storage:extra('admin-new-storage'), isConsumable:/غذا|خاک|پوچ|کنسرو|تشویقی|مالت|litter|food|treat/i.test(name)
    }) });
    applyRemoteStore(data.store); renderAdminPortal(); e.target.reset();
    if (typeof renderProductsCatalog === "function") renderProductsCatalog();
    if (typeof renderFeaturedProducts === "function") renderFeaturedProducts();
    showToast("محصول جدید با موفقیت در Cloudflare D1 ذخیره و منتشر شد 🐾", "success");
  } catch (err) { showToast(err.message || "خطا در ذخیره محصول", "error"); }
}

function closeAdminProductEditor() {
  document.getElementById('admin-product-editor-modal')?.remove();
}

function openAdminProductEditor(productId) {
  const prod = products.find(p => p.id === productId);
  if (!prod) { showToast('محصول موردنظر پیدا نشد.', 'error'); return; }
  closeAdminProductEditor();

  const modal = document.createElement('div');
  modal.id = 'admin-product-editor-modal';
  modal.className = 'fixed inset-0 z-[70] bg-slate-950/70 flex items-center justify-center p-3 sm:p-5';
  modal.innerHTML = `
    <div class="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-orange-200 p-4 sm:p-6">
      <div class="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 class="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2"><i class="fa-solid fa-pen-to-square text-orange-600"></i> ویرایش محصول</h3>
          <p class="text-[11px] text-slate-400 mt-1">تغییرات مستقیماً در Cloudflare D1 ذخیره می‌شود.</p>
        </div>
        <button type="button" onclick="closeAdminProductEditor()" class="w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <form onsubmit='handleAdminEditProduct(event, ${JSON.stringify(String(productId)).replace(/'/g, "&#39;")})' class="space-y-3">
        <div>
          <label class="block text-[11px] font-bold text-slate-600 mb-1">نام محصول:</label>
          <input id="edit-prod-name" required value="${escapeHtml(prod.name)}" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-orange-500">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">دسته‌بندی:</label>
            <select id="edit-prod-cat" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-orange-500">
              ${categories.map(c => `<option value="${escapeHtml(c.id)}" ${c.id === prod.categoryId ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">وضعیت انبار:</label>
            <select id="edit-prod-stock" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-orange-500">
              <option value="in_stock" ${prod.stockStatus === 'in_stock' ? 'selected' : ''}>موجود در انبار</option>
              <option value="low_stock" ${prod.stockStatus === 'low_stock' ? 'selected' : ''}>موجودی محدود</option>
              <option value="out_of_stock" ${prod.stockStatus === 'out_of_stock' ? 'selected' : ''}>ناموجود</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div><label class="block text-[11px] font-bold text-slate-600 mb-1">قیمت اصلی:</label><input id="edit-prod-price" type="number" min="0" value="${Number(prod.originalPrice) || 0}" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-orange-500"></div>
          <div><label class="block text-[11px] font-bold text-slate-600 mb-1">تخفیف ٪:</label><input id="edit-prod-discount" type="number" min="0" max="90" value="${Number(prod.discountPercent) || 0}" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-orange-500"></div>
          <div><label class="block text-[11px] font-bold text-slate-600 mb-1">قیمت نهایی:</label><input id="edit-prod-final" type="number" min="0" value="${Number(prod.finalPrice) || 0}" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-orange-500"></div>
        </div>

        <div>
          <label class="block text-[11px] font-bold text-slate-600 mb-1">آدرس عکس:</label>
          <input id="edit-prod-image" type="text" inputmode="url" value="${escapeHtml(prod.image || '')}" placeholder="https://... یا عکس را از دستگاه انتخاب کنید" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-orange-500">
          <input id="edit-prod-image-key" type="hidden" value="${escapeHtml(prod.imageKey || '')}">
          <div class="mt-2 flex items-center gap-2">
            <label class="px-3 py-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-[11px] font-bold cursor-pointer flex items-center gap-1.5">
              <i class="fa-solid fa-image"></i><span>انتخاب و فشرده‌سازی عکس</span>
              <input id="edit-prod-file" type="file" accept="image/webp,image/jpeg,image/png,image/avif,image/gif" class="hidden" onchange="handleAdminEditProductFile(this)">
            </label>
            <span id="edit-prod-upload-status" class="text-[10px] text-slate-400"></span>
          </div>
          <div class="mt-2 p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 ${prod.image ? '' : 'hidden'}" id="edit-prod-preview-wrap">
            <img id="edit-prod-preview" src="${escapeHtml(prod.image || '')}" class="w-14 h-14 object-contain rounded-lg bg-white border border-slate-200" alt="پیش‌نمایش">
            <span class="text-[10px] text-slate-500">پیش‌نمایش تصویر فعلی</span>
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-bold text-slate-600 mb-1">توضیحات کوتاه:</label>
          <textarea id="edit-prod-short" rows="2" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-orange-500">${escapeHtml(prod.shortDesc || '')}</textarea>
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-600 mb-1">توضیحات کامل:</label>
          <textarea id="edit-prod-full" rows="4" class="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-orange-500">${escapeHtml(prod.fullDesc || '')}</textarea>
        </div>

        <div class="rounded-2xl border border-orange-100 bg-orange-50/40 p-3 space-y-2">
          <p class="text-[10px] font-black text-orange-700 flex items-center gap-1.5"><i class="fa-solid fa-list-check"></i> مشخصات تکمیلی و SEO</p>
          <div class="grid grid-cols-2 gap-2">
            <input id="edit-prod-brand" value="${escapeHtml(prod.brand || '')}" placeholder="برند" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
            <input id="edit-prod-weight" value="${escapeHtml(prod.weight || '')}" placeholder="وزن / حجم" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
            <input id="edit-prod-flavor" value="${escapeHtml(prod.flavor || '')}" placeholder="طعم / تنوع" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
            <input id="edit-prod-age" value="${escapeHtml(prod.ageRange || '')}" placeholder="سن مناسب" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
            <input id="edit-prod-goal" value="${escapeHtml(prod.goal || '')}" placeholder="هدف مصرف" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs col-span-2">
            <input id="edit-prod-country" value="${escapeHtml(prod.countryOfOrigin || '')}" placeholder="کشور سازنده" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
            <input id="edit-prod-barcode" value="${escapeHtml(prod.barcode || '')}" placeholder="بارکد" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
            <input id="edit-prod-expiration" value="${escapeHtml(prod.expirationDate || '')}" placeholder="تاریخ انقضا" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
            <input id="edit-prod-warranty" value="${escapeHtml(prod.warranty || '')}" placeholder="ضمانت" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
            <input id="edit-prod-stock-qty" type="number" min="0" value="${Number(prod.stockQuantity) || 0}" placeholder="تعداد واقعی انبار" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
            <input id="edit-prod-sales-count" type="number" min="0" value="${Number(prod.salesCount) || 0}" placeholder="تعداد فروش" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
            <input id="edit-prod-min-stock" type="number" min="0" value="${Number(prod.minStock) || 0}" placeholder="حداقل موجودی" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
            <input id="edit-prod-restock" value="${escapeHtml(prod.restockTime || '')}" placeholder="زمان تأمین مجدد" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
            <input id="edit-prod-shipping-note" value="${escapeHtml(prod.shippingNote || '')}" placeholder="یادداشت ارسال" class="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
          </div>
          <textarea id="edit-prod-ingredients" rows="2" placeholder="ترکیبات">${escapeHtml(prod.ingredients || '')}</textarea>
          <textarea id="edit-prod-nutrition" rows="2" placeholder="آنالیز تغذیه‌ای">${escapeHtml(prod.nutritionAnalysis || '')}</textarea>
          <textarea id="edit-prod-usage" rows="2" placeholder="روش مصرف">${escapeHtml(prod.usage || '')}</textarea>
          <textarea id="edit-prod-storage" rows="2" placeholder="روش نگهداری">${escapeHtml(prod.storage || '')}</textarea>
          <textarea id="edit-prod-authenticity" rows="2" placeholder="ضمانت اصالت">${escapeHtml(prod.authenticity || '')}</textarea>
          <textarea id="edit-prod-faq" rows="2" placeholder='FAQ به صورت JSON، مثال: [{"q":"...","a":"..."}]'>${escapeHtml(JSON.stringify(prod.faq || []))}</textarea>
          <textarea id="edit-prod-extra-images" rows="2" placeholder="آدرس عکس‌های بیشتر، هر خط یک URL">${escapeHtml((prod.extraImages || []).join('\n'))}</textarea>
          <input id="edit-prod-related" value="${escapeHtml((prod.relatedProductIds || []).join(', '))}" placeholder="شناسه محصولات مرتبط با کاما" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
          <input id="edit-prod-complementary" value="${escapeHtml((prod.complementaryProductIds || []).join(', '))}" placeholder="شناسه محصولات مکمل با کاما" class="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs">
          <label class="flex items-center gap-2 text-[11px] font-bold text-slate-700"><input id="edit-prod-consumable" type="checkbox" ${prod.isConsumable ? 'checked' : ''}> محصول مصرفی؛ پیشنهاد خرید تکراری فعال باشد</label>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200">
          <label class="flex items-center gap-2 text-[11px] font-bold text-slate-700"><input id="edit-prod-featured" type="checkbox" ${prod.isFeatured ? 'checked' : ''}> ویژه</label>
          <label class="flex items-center gap-2 text-[11px] font-bold text-slate-700"><input id="edit-prod-best" type="checkbox" ${prod.isBestSeller ? 'checked' : ''}> پرفروش</label>
          <label class="flex items-center gap-2 text-[11px] font-bold text-slate-700"><input id="edit-prod-new" type="checkbox" ${prod.isNew ? 'checked' : ''}> جدید</label>
        </div>

        <div class="flex gap-2 pt-1">
          <button type="submit" class="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"><i class="fa-solid fa-floppy-disk"></i> ذخیره تغییرات</button>
          <button type="button" onclick="closeAdminProductEditor()" class="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">انصراف</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);
}

async function handleAdminEditProductFile(inputEl) {
  const file = inputEl?.files?.[0];
  if (!file) return;
  if (!backendReady || !isAdminLoggedIn) { showToast('لطفاً ابتدا وارد پنل مدیریت شوید.', 'error'); return; }
  const status = document.getElementById('edit-prod-upload-status');
  try {
    if (status) status.textContent = 'در حال فشرده‌سازی...';
    const blob = await compressImageBlob(file);
    const form = new FormData();
    form.append('file', blob, blob.type === 'image/jpeg' ? 'foxshop-image.jpg' : 'foxshop-image.webp');
    const uploaded = await apiRequest('/admin/upload-image', { method: 'POST', body: form });
    await waitForImageLoad(uploaded.url);
    document.getElementById('edit-prod-image').value = uploaded.url;
    document.getElementById('edit-prod-image-key').value = uploaded.key;
    const preview = document.getElementById('edit-prod-preview');
    const wrap = document.getElementById('edit-prod-preview-wrap');
    if (preview) preview.src = `${uploaded.url}?v=${Date.now()}`;
    if (wrap) wrap.classList.remove('hidden');
    if (status) status.textContent = `آماده؛ ${Math.round(blob.size / 1024)}KB`;
    showToast('عکس فشرده شد و با موفقیت در D1 ذخیره شد 🐾', 'success');
  } catch (err) {
    console.error(err);
    if (status) status.textContent = '';
    showToast(err.message || 'خطا در آپلود تصویر', 'error');
  }
}

async function handleAdminEditProduct(event, productId) {
  event.preventDefault();
  if (!backendReady || !isAdminLoggedIn) { showToast('ورود مدیریت لازم است.', 'error'); return; }
  const prod = products.find(p => p.id === productId);
  if (!prod) { showToast('محصول موردنظر پیدا نشد.', 'error'); return; }

  const originalPrice = Number(document.getElementById('edit-prod-price')?.value) || 0;
  const discountPercent = Math.min(90, Math.max(0, Number(document.getElementById('edit-prod-discount')?.value) || 0));
  const finalField = document.getElementById('edit-prod-final')?.value;
  const finalPrice = finalField === '' ? Math.round(originalPrice * (1 - discountPercent / 100)) : Math.max(0, Number(finalField) || 0);

  try {
    const data = await apiRequest(`/admin/product/${encodeURIComponent(productId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: document.getElementById('edit-prod-name')?.value.trim() || '',
        categoryId: document.getElementById('edit-prod-cat')?.value || '',
        stockStatus: document.getElementById('edit-prod-stock')?.value || 'in_stock',
        originalPrice,
        discountPercent,
        finalPrice,
        isFeatured: !!document.getElementById('edit-prod-featured')?.checked,
        isBestSeller: !!document.getElementById('edit-prod-best')?.checked,
        isNew: !!document.getElementById('edit-prod-new')?.checked,
        image: document.getElementById('edit-prod-image')?.value.trim() || '',
        imageKey: document.getElementById('edit-prod-image-key')?.value || '',
        shortDesc: document.getElementById('edit-prod-short')?.value.trim() || '',
        fullDesc: document.getElementById('edit-prod-full')?.value.trim() || '',
        brand: document.getElementById('edit-prod-brand')?.value.trim() || '',
        weight: document.getElementById('edit-prod-weight')?.value.trim() || '',
        flavor: document.getElementById('edit-prod-flavor')?.value.trim() || '',
        ageRange: document.getElementById('edit-prod-age')?.value.trim() || '',
        goal: document.getElementById('edit-prod-goal')?.value.trim() || '',
        countryOfOrigin: document.getElementById('edit-prod-country')?.value.trim() || '',
        barcode: document.getElementById('edit-prod-barcode')?.value.trim() || '',
        expirationDate: document.getElementById('edit-prod-expiration')?.value.trim() || '',
        warranty: document.getElementById('edit-prod-warranty')?.value.trim() || '',
        stockQuantity: Number(document.getElementById('edit-prod-stock-qty')?.value) || 0,
        salesCount: Number(document.getElementById('edit-prod-sales-count')?.value) || 0,
        minStock: Number(document.getElementById('edit-prod-min-stock')?.value) || 0,
        restockTime: document.getElementById('edit-prod-restock')?.value.trim() || '',
        shippingNote: document.getElementById('edit-prod-shipping-note')?.value.trim() || '',
        ingredients: document.getElementById('edit-prod-ingredients')?.value.trim() || '',
        nutritionAnalysis: document.getElementById('edit-prod-nutrition')?.value.trim() || '',
        usage: document.getElementById('edit-prod-usage')?.value.trim() || '',
        storage: document.getElementById('edit-prod-storage')?.value.trim() || '',
        authenticity: document.getElementById('edit-prod-authenticity')?.value.trim() || '',
        faq: (() => { try { const v=JSON.parse(document.getElementById('edit-prod-faq')?.value || '[]'); return Array.isArray(v)?v:[]; } catch(_) { return []; } })(),
        extraImages: (document.getElementById('edit-prod-extra-images')?.value || '').split(/\n+/).map(v=>v.trim()).filter(Boolean),
        relatedProductIds: (document.getElementById('edit-prod-related')?.value || '').split(',').map(v=>v.trim()).filter(Boolean),
        complementaryProductIds: (document.getElementById('edit-prod-complementary')?.value || '').split(',').map(v=>v.trim()).filter(Boolean),
        isConsumable: !!document.getElementById('edit-prod-consumable')?.checked
      })
    });
    applyRemoteStore(data.store);
    closeAdminProductEditor();
    renderAdminPortal();
    if (typeof renderProductsCatalog === 'function') renderProductsCatalog();
    if (typeof renderFeaturedProducts === 'function') renderFeaturedProducts();
    showToast('تغییرات محصول با موفقیت ذخیره شد 🐾', 'success');
  } catch (err) {
    console.error(err);
    showToast(err.message || 'خطا در ویرایش محصول', 'error');
  }
}

async function adminDeleteProduct(id) {
  if (!confirm("آیا از حذف این محصول اطمینان دارید؟")) return;
  try {
    const data = await apiRequest(`/admin/product/${encodeURIComponent(id)}`, { method:"DELETE" });
    applyRemoteStore(data.store); renderAdminPortal();
    if (typeof renderProductsCatalog === "function") renderProductsCatalog();
    if (typeof renderFeaturedProducts === "function") renderFeaturedProducts();
    showToast("محصول با موفقیت از دیتابیس حذف شد", "info");
  } catch (err) { showToast(err.message || "خطا در حذف محصول", "error"); }
}

/**
 * Handle Admin Login with Rate Limiting & SHA-256
 */
async function handleAdminLogin(event) {
  event.preventDefault();
  const usernameInput = document.getElementById("admin-username-input")?.value.trim() || "";
  const passInput = document.getElementById("admin-password-input")?.value || "";
  try {
    const data = await apiRequest("/admin/login", { method:"POST", body:JSON.stringify({username:usernameInput,password:passInput}) });
    isAdminLoggedIn = true; adminUsername = data.username || usernameInput; applyRemoteStore(data.store);
    showToast("ورود موفقیت‌آمیز به پنل مدیریت FoxShop 🐾", "success"); renderAdminPortal();
  } catch (err) { showToast(err.message || "نام کاربری یا رمز عبور اشتباه است.", err.status===429 ? "info" : "error"); renderAdminPortal(); }
}

async function saveCommerceSettings(e) {
  e.preventDefault();
  try {
    const data = await apiRequest('/admin/settings', {method:'PUT', body:JSON.stringify({settings:{
      shopCity: document.getElementById('setting-shop-city')?.value.trim() || 'تبریز',
      freeShippingThreshold: Number(document.getElementById('setting-free-shipping')?.value)||0,
      shippingTable: document.getElementById('setting-shipping')?.value.trim() || '',
      returnPolicy: document.getElementById('setting-return')?.value.trim() || '',
      storageText: document.getElementById('setting-storage')?.value.trim() || '',
      authenticityText: document.getElementById('setting-authenticity')?.value.trim() || '',
      licenseText: document.getElementById('setting-license')?.value.trim() || '',
      supportText: document.getElementById('setting-support')?.value.trim() || ''
    }})});
    applyRemoteStore(data.store); renderAdminPortal(); showToast('تنظیمات فروش، ارسال و اعتماد ذخیره شد 🐾','success');
  } catch(err) { showToast(err.message || 'ذخیره تنظیمات انجام نشد.','error'); }
}

async function loadAdminReviews() {
  const box=document.getElementById('admin-reviews-list');
  if(!box) return;
  try {
    const data=await apiRequest('/admin/reviews');
    const rows=Array.isArray(data.reviews)?data.reviews:[];
    box.innerHTML=rows.length?rows.map(r=>`<div class="p-3 rounded-2xl border ${r.approved?'border-emerald-200 bg-emerald-50/40':'border-amber-200 bg-amber-50/40'}">
      <div class="flex items-start justify-between gap-3"><div><p class="text-xs font-black text-slate-800">${escapeHtml(r.customerName||'مشتری')} <span class="text-amber-500">${'★'.repeat(Number(r.rating)||0)}</span></p><p class="text-[10px] text-slate-400 mt-0.5">${escapeHtml(r.productName||'')}</p></div><span class="text-[10px] font-bold ${r.approved?'text-emerald-700':'text-amber-700'}">${r.approved?'تأییدشده':'در انتظار بررسی'}</span></div>
      <p class="text-[11px] text-slate-700 mt-2 leading-relaxed">${escapeHtml(r.body||'')}</p>
      ${r.photoUrl?`<a href="${escapeHtml(r.photoUrl)}" target="_blank" rel="noopener" class="text-[10px] text-orange-600 inline-flex items-center gap-1 mt-2"><i class="fa-solid fa-image"></i> عکس مشتری</a>`:''}
      <div class="flex gap-2 mt-3"><button onclick="adminToggleReview('${escapeHtml(r.id)}',${r.approved?'false':'true'})" class="px-3 py-1.5 rounded-xl ${r.approved?'bg-slate-800':'bg-emerald-600'} text-white text-[10px] font-bold">${r.approved?'لغو تأیید':'تأیید نمایش'}</button><button onclick="adminDeleteReview('${escapeHtml(r.id)}')" class="px-3 py-1.5 rounded-xl bg-rose-100 text-rose-700 text-[10px] font-bold">حذف</button></div>
    </div>`).join(''):'<div class="py-10 text-center text-xs text-slate-400">هنوز نظری ثبت نشده است.</div>';
  } catch(err) { box.innerHTML=`<div class="py-8 text-center text-xs text-rose-600">${escapeHtml(err.message||'خطا در دریافت نظرها')}</div>`; }
}
async function adminToggleReview(id, approved) {
  try { await apiRequest(`/admin/review/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify({approved})}); showToast(approved?'نظر تأیید شد.':'تأیید نظر برداشته شد.','success'); await loadAdminReviews(); } catch(err){showToast(err.message||'خطا در تغییر وضعیت نظر','error');}
}
async function adminDeleteReview(id) {
  if(!confirm('این نظر حذف شود؟')) return;
  try { await apiRequest(`/admin/review/${encodeURIComponent(id)}`,{method:'DELETE'}); showToast('نظر حذف شد.','info'); await loadAdminReviews(); } catch(err){showToast(err.message||'خطا در حذف نظر','error');}
}

async function handleAdminChangeUsername(e) {
  e.preventDefault();
  const nextUsername = document.getElementById("admin-new-username")?.value.trim() || "";
  const currentPassword = document.getElementById("admin-username-current-pwd")?.value || "";
  try {
    const data = await apiRequest("/admin/username", {method:"PUT", body:JSON.stringify({username:nextUsername,currentPassword})});
    adminUsername = data.username || nextUsername; applyRemoteStore(data.store); renderAdminPortal();
    showToast("نام کاربری مدیریت با موفقیت تغییر کرد 🔐", "success");
  } catch (err) { showToast(err.message || "خطا در تغییر نام کاربری", "error"); }
}

async function handleAdminChangePassword(e) {
  e.preventDefault();
  const curr = document.getElementById("admin-current-pwd")?.value || "";
  const next = document.getElementById("admin-new-pwd")?.value || "";
  const conf = document.getElementById("admin-confirm-pwd")?.value || "";
  if (next !== conf) { showToast("رمز جدید و تکرار آن همخوانی ندارند", "info"); return; }
  try {
    const data = await apiRequest("/admin/password", {method:"PUT", body:JSON.stringify({currentPassword:curr,newPassword:next})});
    adminUsername = data.username || adminUsername; applyRemoteStore(data.store); renderAdminPortal();
    showToast("رمز عبور مدیریت در Cloudflare D1 تغییر کرد و نشست امن جدید ساخته شد 🔒", "success");
  } catch (err) { showToast(err.message || "خطا در تغییر رمز عبور", "error"); }
}

async function adminLogout() {
  try { await apiRequest("/admin/logout", {method:"POST"}); } catch (_) {}
  isAdminLoggedIn = false; adminUsername = DEFAULT_ADMIN_USERNAME;
  showToast("خروج امن از پنل مدیریت انجام شد", "info"); renderAdminPortal();
}

function adminExportBackup() {
  const data = {
    version: "2.4",
    exportedAt: new Date().toISOString(),
    products,
    categories,
    settings
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `foxshop-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("فایل پشتیبان با موفقیت دانلود شد 📁", "success");
}

async function adminImportBackup(e) {
  const file=e.target.files&&e.target.files[0]; if(!file) return;
  try {
    const data=JSON.parse(await file.text());
    const res=await apiRequest("/admin/import",{method:"POST",body:JSON.stringify(data)});
    applyRemoteStore(res.store); renderAdminPortal(); initHeader();
    if(typeof renderProductsCatalog==="function") renderProductsCatalog();
    if(typeof renderHomeCategories==="function") renderHomeCategories();
    showToast("پشتیبان با موفقیت در Cloudflare D1 بازیابی شد 🐾","success");
  } catch(err){ showToast(err.message||"خطا در بازیابی فایل JSON","error"); }
  finally { e.target.value=""; }
}

async function adminResetDefaults() {
  if (!confirm("آیا اطمینان دارید که می‌خواهید کاتالوگ به حالت اولیه بازگردد؟")) return;
  if (!backendReady || !isAdminLoggedIn) { showToast("ورود مدیریت لازم است.", "error"); return; }
  try {
    const res=await apiRequest("/admin/reset",{method:"POST",body:JSON.stringify({products:typeof DEFAULT_PRODUCTS!=="undefined"?DEFAULT_PRODUCTS:[],categories:typeof DEFAULT_CATEGORIES!=="undefined"?DEFAULT_CATEGORIES:[]})});
    applyRemoteStore(res.store); renderAdminPortal(); initHeader();
    if(typeof renderProductsCatalog==="function") renderProductsCatalog();
    if(typeof renderHomeCategories==="function") renderHomeCategories();
    showToast("کاتالوگ به حالت اولیه در Cloudflare D1 بازنشانی شد 🐾","info");
  } catch(err){ showToast(err.message||"خطا در بازنشانی کاتالوگ","error"); }
}

// Global window assignments for all inline HTML handlers used by the static pages.
if (typeof window !== "undefined") {
  window.openProductDetailModalWithSplash = openProductDetailModalWithSplash;
  window.openProductDetailModal = openProductDetailModal;
  window.closeProductDetailModal = closeProductDetailModal;
  window.openInstagramProduct = openInstagramProduct;
  window.addToCart = addToCart;
  window.updateCartQuantity = updateCartQuantity;
  window.removeFromCart = removeFromCart;
  window.toggleMobileMenu = toggleMobileMenu;
  window.toggleCartDrawer = toggleCartDrawer;
  window.openRubikaOrderModal = openRubikaOrderModal;
  window.closeRubikaOrderModal = closeRubikaOrderModal;
  window.submitRubikaOrder = submitRubikaOrder;
  window.submitInstagramOrder = submitInstagramOrder;
  window.openAdminModal = openAdminModal;
  window.openAdminPortalModal = openAdminPortalModal;
  window.closeAdminPortalModal = closeAdminPortalModal;
  window.setAdminTab = setAdminTab;
  window.handleAdminLogin = handleAdminLogin;
  window.handleAdminChangeUsername = handleAdminChangeUsername;
  window.handleAdminChangePassword = handleAdminChangePassword;
  window.adminLogout = adminLogout;
  window.handleAdminFileToInput = handleAdminFileToInput;
  window.handleDirectCategoryFileUpload = handleDirectCategoryFileUpload;
  window.adminEditCategoryUrl = adminEditCategoryUrl;
  window.adminRemoveCategoryPhoto = adminRemoveCategoryPhoto;
  window.adminDeleteCategory = adminDeleteCategory;
  window.adminSwitchTab = adminSwitchTab;
  window.handleAdminAddCategory = handleAdminAddCategory;
  window.handleAdminAddProduct = handleAdminAddProduct;
  window.adminDeleteProduct = adminDeleteProduct;
  window.openAdminProductEditor = openAdminProductEditor;
  window.closeAdminProductEditor = closeAdminProductEditor;
  window.handleAdminEditProduct = handleAdminEditProduct;
  window.handleAdminEditProductFile = handleAdminEditProductFile;
  window.adminFilterProducts = adminFilterProducts;
  window.adminExportBackup = adminExportBackup;
  window.adminImportBackup = adminImportBackup;
  window.adminResetDefaults = adminResetDefaults;
  window.saveCommerceSettings = saveCommerceSettings;
  window.adminToggleReview = adminToggleReview;
  window.adminDeleteReview = adminDeleteReview;
  window.showToast = showToast;
  window.formatPrice = formatPrice;
  window.toPersianDigits = toPersianDigits;
  window.escapeHtml = escapeHtml;
  window.copyTextToClipboard = copyTextToClipboard;
}

/* FoxShop Premium Cat UI micro-interactions — visual only */
(() => {
  const initPremiumUI = () => {
    try {
      const revealSelectors = [
        'main > section',
        'main > div.bg-white',
        '.product-card-item',
        '#home-featured-grid > div',
        '#home-bestseller-grid > div',
        '#home-categories-container > a',
        '#catalog-products-grid > div',
        'footer'
      ];
      const elements = document.querySelectorAll(revealSelectors.join(','));
      const isTouchOrMobile = window.matchMedia && window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;

      if (!isTouchOrMobile) {
        elements.forEach((el, i) => {
          if (el.classList.contains('fixed')) return;
          el.classList.add('fox-reveal');
          el.style.animationDelay = `${Math.min(i * 35, 420)}ms`;
        });

        if ('IntersectionObserver' in window) {
          const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add('is-visible');
              obs.unobserve(entry.target);
            });
          }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
          elements.forEach(el => observer.observe(el));
        } else {
          elements.forEach(el => el.classList.add('is-visible'));
        }
      } else {
        elements.forEach(el => el.classList.add('is-visible'));
      }

      if (!document.querySelector('.fox-cat-pattern')) {
        const pattern = document.createElement('div');
        pattern.className = 'fox-cat-pattern';
        pattern.setAttribute('aria-hidden', 'true');
        const icons = ['🐱','🐾','😺','🐾','🐱','🐾','😸'];
        const count = isTouchOrMobile ? 12 : 24;
        for (let i = 0; i < count; i++) {
          const span = document.createElement('span');
          span.textContent = icons[i % icons.length];
          pattern.appendChild(span);
        }
        document.body.appendChild(pattern);
      }

      const header = document.querySelector('header.sticky');
      if (header) {
        let headerTick = false;
        const syncHeader = () => {
          if (headerTick) return;
          headerTick = true;
          requestAnimationFrame(() => {
            header.classList.toggle('is-scrolled', window.scrollY > 10);
            headerTick = false;
          });
        };
        syncHeader();
        window.addEventListener('scroll', syncHeader, { passive: true });
      }

      if (!document.querySelector('.fox-cat-corner')) {
        const badge = document.createElement('div');
        badge.className = 'fox-cat-corner';
        badge.setAttribute('aria-hidden', 'true');
        badge.innerHTML = '<span>🐱</span><small>🐾</small>';
        document.body.appendChild(badge);
      }
    } catch (err) {
      console.debug('Premium UI enhancement skipped:', err);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPremiumUI, { once: true });
  } else {
    initPremiumUI();
  }
})();


/* ==========================================================================
   FoxShop Growth + Product Experience Enhancements
   Additive layer: preserves the original catalog/cart/admin logic.
   ========================================================================== */

const LS_FAVORITES = "foxshop_favorites_v1";
const LS_COMPARE = "foxshop_compare_v1";
const LS_LAST_ORDER = "foxshop_last_order_v1";

function foxLoadIds(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.map(String).slice(0, 50) : [];
  } catch { return []; }
}
function foxSaveIds(key, ids) {
  try { localStorage.setItem(key, JSON.stringify([...new Set(ids)].slice(0, 50))); } catch {}
}
function foxGetProduct(id) { return products.find(p => String(p.id) === String(id)); }
function foxProductUrl(prod) {
  const key = String(prod?.slug || prod?.id || "").trim();
  return `product.html?id=${encodeURIComponent(key)}`;
}
function foxProductHref(prod) {
  return foxProductUrl(prod);
}
function foxOpenProduct(id) {
  const prod = foxGetProduct(id);
  if (prod) window.location.href = foxProductUrl(prod);
}
function foxOpenProductFromAttribute(card) {
  const btn = card.querySelector('[onclick*="addToCart"]');
  const value = btn?.getAttribute("onclick") || "";
  const match = value.match(/addToCart\(['"]([^'"]+)['"]/);
  return match ? match[1] : "";
}

function foxFormatPlainList(items) {
  return items.map(item => `• ${item.name} × ${item.quantity}`).join("\n");
}
function foxSaveLastOrder() {
  if (!cart.length) return;
  try {
    localStorage.setItem(LS_LAST_ORDER, JSON.stringify({
      createdAt: new Date().toISOString(),
      items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity }))
    }));
  } catch {}
}
function foxGetLastOrder() {
  try { return JSON.parse(localStorage.getItem(LS_LAST_ORDER) || "null"); } catch { return null; }
}

function foxCopy(text, successText = "کپی شد 🐾") {
  copyTextToClipboard(text);
  showToast(successText, "success");
}
function foxBuildCartCopy({ includeCustomer = false } = {}) {
  if (!cart.length) return "";
  const total = calculateCartTotal();
  const customer = includeCustomer ? (document.getElementById("rb-customer-name")?.value.trim() || "") : "";
  const phone = includeCustomer ? (document.getElementById("rb-customer-phone")?.value.trim() || "") : "";
  const address = includeCustomer ? (document.getElementById("rb-customer-address")?.value.trim() || "") : "";
  const notes = includeCustomer ? (document.getElementById("rb-customer-notes")?.value.trim() || "") : "";
  return `🐾 فاکتور سفارش FoxShop\n` +
    `📍 فروشگاه: تبریز\n\n` +
    `${cart.map((item, i) => `${i + 1}. ${item.name}\n   تعداد: ${toPersianDigits(item.quantity)} × ${formatPrice(item.price)} تومان`).join("\n")}\n\n` +
    `💰 مبلغ کل کالاها: ${formatPrice(total)} تومان\n` +
    (customer ? `👤 نام: ${customer}\n` : "") +
    (phone ? `📞 تماس: ${phone}\n` : "") +
    (address ? `📍 آدرس: ${address}\n` : "") +
    (notes ? `📝 توضیحات: ${notes}\n` : "") +
    `\nلطفاً موجودی و هزینه ارسال را تأیید و اطلاعات پرداخت را اعلام کنید.`;
}
function foxCopyCartProducts() {
  if (!cart.length) return showToast("سبد خرید خالی است.", "info");
  foxSaveLastOrder();
  foxCopy(foxFormatPlainList(cart), "لیست محصولات سبد خرید کپی شد. حالا در دایرکت اینستاگرام یا روبیکا جای‌گذاری کنید.");
}
function foxCopyInvoice() {
  if (!cart.length) return showToast("سبد خرید خالی است.", "info");
  foxSaveLastOrder();
  foxCopy(foxBuildCartCopy({ includeCustomer: true }), "فاکتور سفارش کپی شد.");
}
function foxSendOrderChannel(channel) {
  if (!cart.length) return showToast("ابتدا محصولی به سبد خرید اضافه کنید.", "info");
  foxSaveLastOrder();
  const message = foxBuildCartCopy({ includeCustomer: true });
  copyTextToClipboard(message);
  showToast("فاکتور کپی شد؛ حالا در حال باز کردن مقصد...", "success");
  const url = channel === "instagram" ? INSTAGRAM_URL : RUBIKA_URL;
  setTimeout(() => window.open(url, "_blank", "noopener,noreferrer"), 450);
}
function foxRepeatLastOrder() {
  const last = foxGetLastOrder();
  if (!last?.items?.length) return showToast("هنوز سفارشی برای خرید مجدد ذخیره نشده است.", "info");
  let added = 0;
  last.items.forEach(item => {
    if (foxGetProduct(item.id)) { addToCart(item.id, Math.max(1, Number(item.quantity) || 1)); added++; }
  });
  showToast(added ? `${toPersianDigits(added)} قلم از آخرین سفارش دوباره به سبد اضافه شد.` : "محصولات آخرین سفارش دیگر در کاتالوگ نیستند.", added ? "success" : "info");
}

function foxShippingThreshold() {
  const raw = Number(settings?.freeShippingThreshold);
  return Number.isFinite(raw) && raw > 0 ? raw : 2000000;
}
function foxShippingMessage() {
  const threshold = foxShippingThreshold();
  const total = calculateCartTotal();
  if (!cart.length) return `ارسال رایگان برای سفارش‌های بالای ${formatPrice(threshold)} تومان`;
  if (total >= threshold) return "تبریک! سفارش شما به حد ارسال رایگان رسیده است 🎉";
  return `فقط ${formatPrice(Math.max(0, threshold - total))} تومان تا ارسال رایگان`;
}
function foxEnsureShippingBar() {
  let bar = document.getElementById("fox-free-shipping-bar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "fox-free-shipping-bar";
    bar.className = "fox-free-shipping-bar";
    const header = document.querySelector("header.sticky") || document.querySelector("header");
    if (header) header.insertAdjacentElement("afterend", bar);
    else document.body.prepend(bar);
  }
  const threshold = foxShippingThreshold();
  const total = calculateCartTotal();
  const pct = Math.min(100, Math.round((total / threshold) * 100));
  bar.innerHTML = `
    <div class="fox-free-shipping-inner">
      <span><i class="fa-solid fa-truck-fast"></i> ${escapeHtml(foxShippingMessage())}</span>
      <div class="fox-free-shipping-track" aria-hidden="true"><i style="width:${pct}%"></i></div>
      <button type="button" onclick="toggleCartDrawer()" aria-label="باز کردن سبد"><i class="fa-solid fa-cart-shopping"></i> سبد</button>
    </div>`;
}
function foxEnsureStickyCart() {
  if (!document.getElementById('cart-drawer')) { document.getElementById('fox-mobile-cart-bar')?.remove(); return; }
  let bar = document.getElementById("fox-mobile-cart-bar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "fox-mobile-cart-bar";
    bar.className = "fox-mobile-cart-bar";
    document.body.appendChild(bar);
  }
  const totalItems = cart.reduce((s, x) => s + x.quantity, 0);
  bar.classList.toggle("is-active", totalItems > 0);
  bar.innerHTML = totalItems ? `
    <button type="button" onclick="toggleCartDrawer()" class="fox-sticky-cart-main">
      <span><i class="fa-solid fa-cart-shopping"></i> سبد خرید</span>
      <b>${toPersianDigits(totalItems)} قلم • ${formatPrice(calculateCartTotal())} تومان</b>
    </button>
    <button type="button" onclick="foxCopyInvoice()" class="fox-sticky-cart-copy" title="کپی فاکتور"><i class="fa-regular fa-copy"></i></button>
  ` : "";
}
function foxEnsureOrderGuide() {
  if (document.getElementById("fox-order-guide-modal")) return;
  const modal = document.createElement("div");
  modal.id = "fox-order-guide-modal";
  modal.className = "fixed inset-0 z-[90] hidden items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4";
  modal.innerHTML = `
    <div class="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4" dir="rtl">
      <div class="flex items-center justify-between">
        <div><h3 class="font-black text-slate-900">راهنمای ارسال سفارش</h3><p class="text-[11px] text-slate-400 mt-1">دو مرحله ساده برای ارسال سبد خرید</p></div>
        <button onclick="foxCloseGuide()" class="w-9 h-9 rounded-full bg-slate-100 text-slate-500"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="space-y-3 text-xs text-slate-700 leading-7">
        <div class="p-3 rounded-2xl bg-orange-50 border border-orange-100"><b>۱.</b> داخل سبد خرید روی «کپی فاکتور» بزنید.</div>
        <div class="p-3 rounded-2xl bg-pink-50 border border-pink-100"><b>۲.</b> مقصد را باز کنید و متن کپی‌شده را در دایرکت اینستاگرام یا روبیکا Paste و ارسال کنید.</div>
        <div class="p-3 rounded-2xl bg-slate-50 border border-slate-200"><i class="fa-solid fa-shield-halved text-emerald-600 ml-1"></i> قیمت و موجودی نهایی قبل از پرداخت توسط فروشگاه تأیید می‌شود.</div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button onclick="foxCopyInvoice();foxCloseGuide()" class="py-3 rounded-xl bg-orange-600 text-white font-bold text-xs">کپی فاکتور</button>
        <button onclick="foxCloseGuide()" class="py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">بستن</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}
function foxCloseGuide(){ document.getElementById("fox-order-guide-modal")?.classList.add("hidden"); document.getElementById("fox-order-guide-modal")?.classList.remove("flex"); }
function foxOpenGuide(){ foxEnsureOrderGuide(); const m=document.getElementById("fox-order-guide-modal"); m.classList.remove("hidden"); m.classList.add("flex"); }

function foxEnhanceCartDrawer() {
  const footer = document.getElementById("cart-footer-view");
  if (!footer) return;
  let box = document.getElementById("fox-cart-actions");
  if (!box) {
    box = document.createElement("div");
    box.id = "fox-cart-actions";
    footer.insertBefore(box, footer.firstElementChild);
  }
  if (!cart.length) { box.innerHTML=""; return; }
  box.innerHTML = `
    <div class="fox-cart-shipping-note"><i class="fa-solid fa-truck-fast"></i><span>${escapeHtml(foxShippingMessage())}</span></div>
    <div class="grid grid-cols-2 gap-2">
      <button onclick="foxCopyCartProducts()" class="py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold text-xs"><i class="fa-regular fa-copy ml-1"></i>کپی کالاها</button>
      <button onclick="foxCopyInvoice()" class="py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"><i class="fa-solid fa-file-invoice ml-1"></i>کپی فاکتور</button>
    </div>
    <button onclick="foxOpenGuide()" class="w-full py-2.5 rounded-xl bg-orange-50 text-orange-700 border border-orange-100 font-bold text-xs"><i class="fa-solid fa-circle-info ml-1"></i>راهنمای ارسال به اینستاگرام و روبیکا</button>
    <div class="grid grid-cols-2 gap-2">
      <button onclick="foxSendOrderChannel('instagram')" class="py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-xs"><i class="fa-brands fa-instagram ml-1"></i>ارسال اینستاگرام</button>
      <button onclick="foxSendOrderChannel('rubika')" class="py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-700 text-white font-bold text-xs"><i class="fa-solid fa-comments ml-1"></i>ارسال روبیکا</button>
    </div>
    <button onclick="foxRepeatLastOrder()" class="w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-xs"><i class="fa-solid fa-rotate-right ml-1"></i>خرید تکراری</button>
  `;
}
function foxWrapCartRender() {
  if (window.__foxCartWrapped) return;
  window.__foxCartWrapped = true;
  const original = renderCartDrawer;
  renderCartDrawer = function() {
    original();
    foxEnhanceCartDrawer();
    foxEnsureStickyCart();
    foxEnsureShippingBar();
    foxEnsureOrderGuide();
  };
}
function foxAddHeaderTools() {
  if (!document.querySelector("header")) return;
  if (!document.getElementById("fox-growth-tools")) {
    const header = document.querySelector("header");
    const tools = document.createElement("div");
    tools.id = "fox-growth-tools";
    tools.className = "fox-growth-tools";
    tools.innerHTML = `
      <button onclick="foxOpenFavorites()" title="علاقه‌مندی‌ها"><i class="fa-regular fa-heart"></i><span id="fox-fav-count">۰</span></button>
      <button onclick="foxOpenCompare()" title="مقایسه"><i class="fa-solid fa-code-compare"></i><span id="fox-compare-count">۰</span></button>`;
    const right = header.querySelector(".max-w-7xl");
    (right || header).appendChild(tools);
  }
  foxUpdateGrowthCounts();
}
function foxUpdateGrowthCounts() {
  const f=foxLoadIds(LS_FAVORITES).length, c=foxLoadIds(LS_COMPARE).length;
  const fe=document.getElementById("fox-fav-count"), ce=document.getElementById("fox-compare-count");
  if(fe) fe.textContent=toPersianDigits(f);
  if(ce) ce.textContent=toPersianDigits(c);
}
function foxToggleFavorite(id) {
  const ids=foxLoadIds(LS_FAVORITES), str=String(id), has=ids.includes(str);
  foxSaveIds(LS_FAVORITES, has ? ids.filter(x=>x!==str) : [...ids,str]);
  foxUpdateGrowthCounts(); foxSyncCardButtons();
  showToast(has ? "از علاقه‌مندی‌ها حذف شد." : "به علاقه‌مندی‌ها اضافه شد ❤️", has ? "info" : "success");
}
function foxToggleCompare(id) {
  const ids=foxLoadIds(LS_COMPARE), str=String(id), has=ids.includes(str);
  if (has) {
    foxSaveIds(LS_COMPARE, ids.filter(x=>x!==str));
  } else {
    if (ids.length>=3) return showToast("حداکثر ۳ محصول را هم‌زمان مقایسه کنید.", "info");
    foxSaveIds(LS_COMPARE, [...ids,str]);
  }
  foxUpdateGrowthCounts(); foxSyncCardButtons();
  showToast(has ? "از مقایسه حذف شد." : "به مقایسه اضافه شد.", "success");
}
function foxSyncCardButtons() {
  const favs=foxLoadIds(LS_FAVORITES), comps=foxLoadIds(LS_COMPARE);
  document.querySelectorAll(".product-card-item").forEach(card=>{
    const id=foxOpenProductFromAttribute(card); if(!id) return;
    let box=card.querySelector(".fox-card-actions");
    if(!box){
      box=document.createElement("div");
      box.className="fox-card-actions";
      box.innerHTML=`<button type="button" class="fox-fav-btn" aria-label="علاقه‌مندی"></button><button type="button" class="fox-compare-btn" aria-label="مقایسه"></button>`;
      card.appendChild(box);
      box.querySelector(".fox-fav-btn").addEventListener("click",e=>{e.stopPropagation();foxToggleFavorite(id);});
      box.querySelector(".fox-compare-btn").addEventListener("click",e=>{e.stopPropagation();foxToggleCompare(id);});
    }
    const fb=box.querySelector(".fox-fav-btn"), cb=box.querySelector(".fox-compare-btn");
    fb.innerHTML=favs.includes(String(id))?'<i class="fa-solid fa-heart"></i>':'<i class="fa-regular fa-heart"></i>';
    fb.classList.toggle("is-on",favs.includes(String(id)));
    cb.innerHTML=comps.includes(String(id))?'<i class="fa-solid fa-code-compare"></i>':'<i class="fa-solid fa-code-compare"></i>';
    cb.classList.toggle("is-on",comps.includes(String(id)));
  });
}
function foxModalShell(id,title,body) {
  let modal=document.getElementById(id);
  if(!modal){modal=document.createElement("div");modal.id=id;modal.className="fixed inset-0 z-[95] hidden items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4";document.body.appendChild(modal);}
  modal.innerHTML=`<div class="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-5" dir="rtl"><div class="flex justify-between items-center mb-4"><h3 class="font-black text-slate-900">${escapeHtml(title)}</h3><button onclick="foxCloseModal('${id}')" class="w-9 h-9 rounded-full bg-slate-100 text-slate-500"><i class="fa-solid fa-xmark"></i></button></div>${body}</div>`;
  modal.classList.remove("hidden"); modal.classList.add("flex"); return modal;
}
function foxCloseModal(id){const m=document.getElementById(id);if(m){m.classList.add("hidden");m.classList.remove("flex");}}
function foxOpenFavorites(){
  const ids=foxLoadIds(LS_FAVORITES), list=ids.map(foxGetProduct).filter(Boolean);
  const body=list.length?`<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${list.map(p=>`<div class="border rounded-2xl p-3 flex gap-3 items-center"><img src="${escapeHtml(p.image)}" class="w-16 h-16 object-contain rounded-xl bg-slate-50"><div class="flex-1"><a class="font-bold text-xs text-slate-800 hover:text-orange-600" href="${foxProductHref(p)}">${escapeHtml(p.name)}</a><p class="text-orange-600 font-black text-sm mt-1">${formatPrice(p.finalPrice)} تومان</p><div class="flex gap-2 mt-2"><button onclick="addToCart('${p.id}')" class="text-[10px] px-2.5 py-1.5 rounded-lg bg-orange-600 text-white font-bold">افزودن</button><button onclick="foxToggleFavorite('${p.id}');foxOpenFavorites()" class="text-[10px] px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-bold">حذف</button></div></div></div>`).join("")}</div>`:`<div class="py-10 text-center text-slate-400 text-xs">هنوز محصولی به علاقه‌مندی‌ها اضافه نشده است.</div>`;
  foxModalShell("fox-favorites-modal","علاقه‌مندی‌های من",body);
}
function foxOpenCompare(){
  const ids=foxLoadIds(LS_COMPARE), list=ids.map(foxGetProduct).filter(Boolean);
  if(!list.length) return foxModalShell("fox-compare-modal","مقایسه محصولات",`<div class="py-10 text-center text-slate-400 text-xs">حداقل یک محصول را برای مقایسه انتخاب کنید.</div>`);
  const fields=[["برند","brand"],["وزن/حجم","weight"],["سن مناسب","ageRange"],["هدف مصرف","goal"],["طعم/تنوع","flavor"],["کشور سازنده","countryOfOrigin"],["امتیاز","rating"],["تعداد نظر","reviewCount"],["قیمت","finalPrice"]];
  const head=list.map(p=>`<th class="p-2 text-xs align-top min-w-[150px]"><img src="${escapeHtml(p.image)}" class="w-16 h-16 object-contain mx-auto rounded-xl bg-slate-50"><a href="${foxProductHref(p)}" class="block mt-2 font-bold text-slate-800">${escapeHtml(p.name)}</a></th>`).join("");
  const rows=fields.map(([label,key])=>`<tr class="border-t">${`<th class="p-2 text-right text-[10px] text-slate-500 bg-slate-50">${label}</th>`}${list.map(p=>`<td class="p-2 text-center text-xs font-bold text-slate-700">${key==="finalPrice"?formatPrice(p[key])+" تومان":key==="rating"?(Number(p[key])?toPersianDigits(p[key])+" از ۵":"-"):escapeHtml(String(p[key]||"ثبت نشده"))}</td>`).join("")}</tr>`).join("");
  foxModalShell("fox-compare-modal","مقایسه محصولات",`<div class="overflow-x-auto"><table class="w-full border-collapse"><thead><tr><th class="p-2 bg-slate-50"></th>${head}</tr></thead><tbody>${rows}</tbody></table></div><p class="text-[10px] text-slate-400 mt-3">اطلاعاتی که برای یک محصول ثبت نشده باشد با «ثبت نشده» نمایش داده می‌شود.</p>`);
}

function foxEnsureBundles() {
  if (!document.querySelector("main") || document.getElementById("fox-bundles")) return;
  const mainEl=document.querySelector("main");
  const section=document.createElement("section");
  section.id="fox-bundles";
  section.className="space-y-4";
  section.innerHTML=`<div class="flex items-center justify-between"><div><span class="text-xs font-black text-orange-600">خرید هوشمند</span><h2 class="text-xl sm:text-2xl font-black text-slate-900">بسته‌های آماده برای گربه شما</h2></div></div><div class="grid grid-cols-1 md:grid-cols-3 gap-3"></div>`;
  const grid=section.querySelector(".grid");
  const bundles=[
    {title:"بچه‌گربه",hint:"غذا + تشویقی مناسب سن پایین",match:p=>/kitten|بچه/.test((p.name+" "+p.ageRange+" "+p.goal).toLowerCase())},
    {title:"ضد گلوله مو",hint:"محصولات مرتبط با مراقبت مو و مالت",match:p=>/مالت|مو|hairball|هربال/i.test(p.name+" "+p.goal+" "+p.shortDesc)},
    {title:"خاک ماهانه",hint:"خاک و اقلام بهداشتی برای خرید دوره‌ای",match:p=>/خاک|litter|بهداشتی/i.test(p.name+" "+p.goal)}
  ];
  bundles.forEach(b=>{
    const matches=products.filter(b.match).slice(0,3);
    if(!matches.length) return;
    const card=document.createElement("div");card.className="rounded-3xl p-5 bg-white border border-orange-100 shadow-sm";
    card.innerHTML=`<div class="flex items-center justify-between gap-3"><div><h3 class="font-black text-slate-800">${b.title}</h3><p class="text-[11px] text-slate-400 mt-1">${b.hint}</p></div><i class="fa-solid fa-box-open text-orange-500"></i></div><div class="mt-3 space-y-2">${matches.map(p=>`<div class="flex items-center gap-2 text-[11px]"><img src="${escapeHtml(p.image)}" class="w-9 h-9 rounded-lg object-contain bg-slate-50"><span class="flex-1 line-clamp-1">${escapeHtml(p.name)}</span><b class="text-orange-600">${formatPrice(p.finalPrice)}</b></div>`).join("")}</div><button class="mt-4 w-full py-2.5 rounded-xl bg-orange-600 text-white text-xs font-black">افزودن بسته به سبد</button>`;
    card.querySelector("button").addEventListener("click",()=>{matches.forEach(p=>addToCart(p.id,1));});
    grid.appendChild(card);
  });
  if(grid.children.length) mainEl.insertBefore(section,mainEl.firstElementChild?.nextElementSibling||mainEl.firstChild);
}

function foxEnsureQuizButton(){
  if(document.getElementById("fox-quiz-trigger")) return;
  const btn=document.createElement("button");btn.id="fox-quiz-trigger";btn.className="fox-quiz-trigger";btn.innerHTML='<i class="fa-solid fa-wand-magic-sparkles"></i><span>کوییز ۲ دقیقه‌ای انتخاب غذا</span>';btn.onclick=foxOpenQuiz;document.body.appendChild(btn);
}
function foxOpenQuiz(){
  let modal=document.getElementById("fox-quiz-modal");
  if(!modal){modal=document.createElement("div");modal.id="fox-quiz-modal";modal.className="fixed inset-0 z-[97] hidden items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4";document.body.appendChild(modal);}
  const state={age:"adult",weight:"medium",sterilized:"yes",sensitivity:"normal",budget:"medium"};
  const questions=[
    ["age","سن گربه","kitten","بچه‌گربه","adult","بالغ","senior","مسن"],
    ["weight","وزن تقریبی","light","کمتر از ۴ کیلو","medium","۴ تا ۶ کیلو","heavy","بیشتر از ۶ کیلو"],
    ["sterilized","عقیم‌شده؟","yes","بله","no","خیر"],
    ["sensitivity","حساسیت یا هدف اصلی","normal","عادی","sensitive","حساسیت غذایی","hair","مراقبت مو"],
    ["budget","بودجه","low","اقتصادی","medium","متوسط","high","پریمیوم"]
  ];
  let step=0;
  function render(){
    const q=questions[step];
    const options=[];for(let i=2;i<q.length;i+=2)options.push([q[i],q[i+1]]);
    modal.innerHTML=`<div class="bg-white w-full max-w-md rounded-3xl shadow-2xl p-5" dir="rtl">
      <div class="flex justify-between items-center"><div><span class="text-[10px] text-orange-600 font-black">گام ${toPersianDigits(step+1)} از ${toPersianDigits(questions.length)}</span><h3 class="font-black text-slate-900 mt-1">${q[1]}</h3></div><button onclick="foxCloseModal('fox-quiz-modal')" class="w-9 h-9 rounded-full bg-slate-100"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="grid grid-cols-1 gap-2 mt-5">${options.map(([v,label])=>`<button data-v="${v}" class="p-3 rounded-2xl border ${state[q[0]]===v?"border-orange-500 bg-orange-50 text-orange-700":"border-slate-200"} text-right text-xs font-bold">${label}</button>`).join("")}</div>
      <div class="flex gap-2 mt-5"><button id="fox-quiz-next" class="flex-1 py-3 rounded-xl bg-orange-600 text-white font-black text-xs">${step===questions.length-1?"دیدن پیشنهادها":"ادامه"}</button></div>
    </div>`;
    modal.querySelectorAll("[data-v]").forEach(b=>b.addEventListener("click",()=>{state[q[0]]=b.dataset.v;render();}));
    modal.querySelector("#fox-quiz-next").onclick=()=>{if(step<questions.length-1){step++;render();}else{foxShowQuizResults(state);}};
    modal.classList.remove("hidden");modal.classList.add("flex");
  }
  render();
}
function foxShowQuizResults(state){
  const scored=products.map(p=>{
    let score=0; const text=(p.name+" "+p.shortDesc+" "+p.goal+" "+p.ageRange).toLowerCase();
    if(state.age==="kitten" && /kitten|بچه/.test(text)) score+=6;
    if(state.age==="adult" && !/kitten|بچه/.test(text)) score+=2;
    if(state.age==="senior" && /senior|مسن|mature/.test(text)) score+=5;
    if(state.sterilized==="yes" && /sterilised|sterilized|عقیم/.test(text)) score+=4;
    if(state.sensitivity==="sensitive" && /حساس|sensitive|hypoallergenic/.test(text)) score+=6;
    if(state.sensitivity==="hair" && /مو|مالت|hairball|هربال/.test(text)) score+=6;
    if(state.budget==="low" && p.finalPrice<700000) score+=4;
    if(state.budget==="medium" && p.finalPrice>=400000 && p.finalPrice<=1800000) score+=3;
    if(state.budget==="high" && p.finalPrice>1200000) score+=3;
    if(p.isBestSeller) score+=1;
    return {...p,__score:score};
  }).sort((a,b)=>b.__score-a.__score).slice(0,3);
  const modal=document.getElementById("fox-quiz-modal");
  modal.innerHTML=`<div class="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-5" dir="rtl">
    <div class="text-center"><div class="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 mx-auto flex items-center justify-center text-2xl"><i class="fa-solid fa-sparkles"></i></div><h3 class="font-black text-slate-900 mt-3">سه پیشنهاد قابل خرید</h3><p class="text-[11px] text-slate-400 mt-1">این پیشنهادها بر اساس پاسخ‌های شما و اطلاعات ثبت‌شده در کاتالوگ مرتب شده‌اند.</p></div>
    <div class="space-y-3 mt-4">${scored.map((p,i)=>`<div class="p-3 rounded-2xl border border-slate-200 flex gap-3"><img src="${escapeHtml(p.image)}" class="w-16 h-16 object-contain rounded-xl bg-slate-50"><div class="flex-1"><a href="${foxProductHref(p)}" class="font-bold text-xs text-slate-800 hover:text-orange-600">${escapeHtml(p.name)}</a><p class="font-black text-orange-600 mt-1">${formatPrice(p.finalPrice)} تومان</p><button onclick="addToCart('${p.id}')" class="mt-2 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-[10px] font-bold">افزودن به سبد</button></div></div>`).join("")}</div>
    <button onclick="foxCloseModal('fox-quiz-modal')" class="w-full mt-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">بستن</button>
  </div>`;
}

async function foxLoadHomeSocialProof(){
  if(!document.querySelector("main") || document.getElementById("fox-social-proof")) return;
  const candidates=products.slice(0, Math.min(products.length, 6));
  let reviews=[];
  await Promise.all(candidates.map(async p=>{try{const r=await fetch(`/api/reviews?productId=${encodeURIComponent(p.id)}`,{credentials:"same-origin"});const d=await r.json();if(Array.isArray(d.reviews))d.reviews.forEach(x=>reviews.push({...x,productName:p.name}));}catch{}}));
  const mainEl=document.querySelector("main");
  if(!mainEl) return;
  const section=document.createElement("section");section.id="fox-social-proof";section.className="space-y-4";
  section.innerHTML=`<div class="flex items-center justify-between"><div><span class="text-xs font-black text-rose-600">صدای مشتری‌ها</span><h2 class="text-xl sm:text-2xl font-black text-slate-900">تجربه‌های واقعی مشتریان FoxShop</h2></div></div>
    <div class="fox-review-strip">${reviews.length?reviews.slice(0,6).map(r=>`<article class="fox-review-card">${r.photoUrl?`<img src="${escapeHtml(r.photoUrl)}" class="w-14 h-14 rounded-2xl object-cover" alt="">`:''}<div class="flex-1"><div class="flex items-center justify-between gap-2"><b>${escapeHtml(r.customerName)}</b><span class="text-amber-500">${"★".repeat(Math.min(5,Number(r.rating)||0))}</span></div><p class="text-[11px] text-slate-600 mt-2 leading-6">${escapeHtml(r.body)}</p><span class="text-[10px] text-slate-400 mt-2 block line-clamp-1">${escapeHtml(r.productName||"محصول")}</span></div></article>`).join(""):`<div class="py-8 px-5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">هنوز نظر تأییدشده‌ای ثبت نشده است؛ این بخش با نظرهای واقعی مشتری‌ها پر می‌شود.</div>`}</div>`;
  mainEl.appendChild(section);
}

function foxRefreshHomeSections(){
  if(!location.pathname.endsWith("index.html") && location.pathname !== "/" && !location.pathname.endsWith("/")) return;
  const featured=document.getElementById("home-featured-grid");
  const bestGrid=document.getElementById("home-bestseller-grid");
  if(featured){
    featured.classList.add("fox-horizontal-products");
    const header=featured.parentElement?.querySelector("h2"); if(header) header.textContent="تخفیف امروز";
    const discounted=products.filter(p=>Number(p.discountPercent)>0).sort((a,b)=>(b.discountPercent||0)-(a.discountPercent||0)).slice(0,8);
    if(discounted.length) featured.innerHTML=discounted.map(p=>renderProductCard(p)).join("");
  }
  if(bestGrid){
    bestGrid.classList.add("fox-horizontal-products");
    const header=bestGrid.parentElement?.querySelector("h2"); if(header) header.textContent="پرفروش‌ها";
    const best=products.filter(p=>p.isBestSeller).sort((a,b)=>(b.salesCount||0)-(a.salesCount||0)).slice(0,8);
    bestGrid.innerHTML=(best.length?best:products.slice(0,8)).map(p=>renderProductCard(p)).join("");
    if(!document.getElementById("fox-new-arrivals")){
      const section=document.createElement("section");section.id="fox-new-arrivals";section.className="space-y-4";
      section.innerHTML=`<div class="flex items-center justify-between"><div><span class="text-xs font-black text-emerald-600">تازه‌رسیده‌ها</span><h2 class="text-xl sm:text-2xl font-black text-slate-900">تازه‌رسیده‌های فروشگاه</h2></div><a href="products.html" class="text-xs font-bold text-orange-600">مشاهده همه</a></div><div id="fox-new-arrivals-grid" class="fox-horizontal-products"></div>`;
      bestGrid.parentElement.insertAdjacentElement("beforebegin",section);
      const newer=products.filter(p=>p.isNew).slice(0,8);
      section.querySelector("#fox-new-arrivals-grid").innerHTML=(newer.length?newer:products.slice(0,4)).map(p=>renderProductCard(p)).join("");
    }
  }
}

const FOX_STOCK_WATCH_KEY = 'foxshop_stock_watchlist';
function foxCheckStockAlerts() {
  try {
    const raw=localStorage.getItem(FOX_STOCK_WATCH_KEY);
    const list=raw?JSON.parse(raw):[];
    if(!Array.isArray(list)||!list.length)return;
    const still=[]; let changed=[];
    list.forEach(w=>{
      const p=foxGetProduct(w.id);
      if(p && p.stockStatus!=='out_of_stock') changed.push(p.name);
      else still.push(w);
    });
    localStorage.setItem(FOX_STOCK_WATCH_KEY,JSON.stringify(still));
    if(changed.length) setTimeout(()=>showToast(`محصول موردنظر شما دوباره موجود شده است: ${changed.slice(0,2).join('، ')}`,'success'),600);
  } catch {}
}
function foxEnsureGlobalSearch() {
  let input=document.getElementById('global-search-input');
  if(input){
    if(input.dataset.foxBound==='1')return;
    input.dataset.foxBound='1';
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){const q=input.value.trim();window.location.href=`products.html?search=${encodeURIComponent(q)}`;}});
    return;
  }
  const header=document.querySelector('header'); if(!header)return;
  const wrap=header.querySelector('.max-w-7xl')||header.firstElementChild||header;
  input=document.createElement('input');
  input.id='global-search-input'; input.className='fox-global-search'; input.placeholder='جستجوی غذا، خاک، مالت...'; input.autocomplete='off'; input.setAttribute('aria-label','جستجوی محصولات');
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){const q=input.value.trim();window.location.href=`products.html?search=${encodeURIComponent(q)}`;}});
  const existingFlex=wrap.querySelector('.flex');
  if(existingFlex) existingFlex.insertBefore(input,existingFlex.children[1]||null); else wrap.appendChild(input);
}

function foxInitGrowthLayer(){
  try {
    if (!document.getElementById("fox-growth-css")) {
      const css=document.createElement("link");
      css.id="fox-growth-css"; css.rel="stylesheet"; css.href="assets/css/store-enhancements.css";
      document.head.appendChild(css);
    }
    foxWrapCartRender();
    foxAddHeaderTools();
    foxEnsureGlobalSearch();
    foxEnsureShippingBar();
    foxCheckStockAlerts();
    foxEnsureStickyCart();
    foxEnsureOrderGuide();
    foxEnsureQuizButton();
    foxEnsureBundles();
    if(typeof renderHomeFeatured==="function" || document.getElementById("home-featured-grid")) foxRefreshHomeSections();
    foxSyncCardButtons();
    setTimeout(foxSyncCardButtons,120);
    setTimeout(foxSyncCardButtons,500);
    if(document.getElementById("home-featured-grid")) setTimeout(foxLoadHomeSocialProof,300);
    if(document.body.dataset.foxEnhanced !== "1"){
      document.body.dataset.foxEnhanced="1";
      const obs=new MutationObserver(()=>{foxSyncCardButtons();foxEnsureShippingBar();foxEnsureStickyCart();});
      obs.observe(document.body,{subtree:true,childList:true});
    }
  } catch(err){ console.debug("FoxShop growth layer skipped:",err); }
}

/* Open product cards on a standalone, shareable page while preserving old inline handlers. */
const foxOriginalProductDetailOpener = (typeof window !== "undefined" && window.openProductDetailModalWithSplash) ? window.openProductDetailModalWithSplash : null;
window.openProductDetailModalWithSplash = foxOpenProduct;

/* Re-run growth features whenever D1 data is refreshed by the existing core. */
const foxOriginalApplyRemoteStore = applyRemoteStore;
applyRemoteStore = function(store){
  const result=foxOriginalApplyRemoteStore(store);
  setTimeout(foxInitGrowthLayer, 20);
  return result;
};

/* Keep the existing cart implementation and add copy/order utilities around it. */
document.addEventListener("DOMContentLoaded",()=>{setTimeout(foxInitGrowthLayer,80);});

/* Export enhancement handlers used by inline HTML/new pages. */
if(typeof window!=="undefined"){
  window.foxOpenProduct=foxOpenProduct;
  window.foxCopyCartProducts=foxCopyCartProducts;
  window.foxCopyInvoice=foxCopyInvoice;
  window.foxSendOrderChannel=foxSendOrderChannel;
  window.foxRepeatLastOrder=foxRepeatLastOrder;
  window.foxOpenGuide=foxOpenGuide;
  window.foxCloseGuide=foxCloseGuide;
  window.foxToggleFavorite=foxToggleFavorite;
  window.foxToggleCompare=foxToggleCompare;
  window.foxOpenFavorites=foxOpenFavorites;
  window.foxOpenCompare=foxOpenCompare;
  window.foxCloseModal=foxCloseModal;
  window.foxOpenQuiz=foxOpenQuiz;
  window.foxProductUrl=foxProductUrl;
  window.foxCheckStockAlerts=foxCheckStockAlerts;
}
