/**
 * FoxShop Cat Boutique - Vanilla JavaScript Core
 * Cloudflare Pages Ready - No build step or npm required
 */

// Global Configuration
const INSTAGRAM_URL = "https://www.instagram.com/foxshop.cat?stkn=MTRud2VncmpudDZpeg==";
const SUPPORT_PHONE = "09934191774";

// Storage Keys
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
  aboutText: "پت‌شاپ FoxShop در تبریز با هدف ارائه مرغوب‌ترین و اصیل‌ترین خوراک و ملزومات گربه‌ها ایجاد شده است. ما اهمیت عشق و مراقبتی که نسبت به گربه‌تان دارید را درک می‌کنیم؛ از این رو محصولات را با اطلاعات قابل بررسی درباره برند، اصالت و انقضا عرضه می‌کنیم.",
  storeLocation: "تبریز، ایران",
  freeShippingThreshold: 3500000,
  shippingCost: 120000,
  shippingDispatchTime: "۱ تا ۲ روز کاری",
  returnPolicy: "شرایط مرجوعی طبق سیاست ثبت‌شده فروشگاه و با بررسی وضعیت کالا انجام می‌شود.",
  authenticityPolicy: "اطلاعات اصالت و مستندات هر محصول فقط در صورت ثبت و قابل ارائه بودن نمایش داده می‌شود."
};

let logoClickCount = 0;
let logoClickTimer = null;
let isAdminLoggedIn = false;
let adminUsername = DEFAULT_ADMIN_USERNAME;
let backendReady = false;
let lastRemoteStore = null;
let customerStories = [];
if (typeof window !== 'undefined') {
  window.__FOXSHOP_STORE_READY__ = false;
  window.__FOXSHOP_STORE_LOADING__ = true;
}

// Safe read-only bridges for additive storefront modules. Existing internal state remains the source of truth.
if (typeof window !== "undefined") {
  const expose = (name, getter) => {
    try { Object.defineProperty(window, name, { configurable: true, get: getter }); } catch (_) { /* legacy browser guard */ }
  };
  expose("products", () => products);
  expose("categories", () => categories);
  expose("cart", () => cart);
  expose("settings", () => settings);
  expose("customerStories", () => customerStories);
}

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  initFoxShopPageNavigationLoader();
  initMobileBottomNav();
  try { initStorage().catch(err => console.error("Init storage error:", err)); } catch (err) { console.error("Init storage error:", err); }
  initHeader();
  initCartUI();
  initSecretAdminTrigger();
  createToastContainer();
  checkRemoteAdminSession();
  if (typeof initPage === "function") { initPage(); }
  if (new URLSearchParams(window.location.search).get("cart") === "1") {
    setTimeout(() => { if (document.getElementById("cart-drawer")) toggleCartDrawer(); }, 40);
  }
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
  return list.filter(item => item && typeof item === "object").map(item => ({
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
    isFeatured: Boolean(item.isFeatured),
    isBestSeller: Boolean(item.isBestSeller),
    isNew: Boolean(item.isNew)
  })).filter(item => item.id && item.name && item.categoryId);
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
  const { timeoutMs = 0, ...requestOptions } = options || {};
  const controller = timeoutMs > 0 && typeof AbortController !== "undefined" ? new AbortController() : null;
  let timeoutId = null;
  if (controller) timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const fetchOptions = {
      credentials: "same-origin",
      ...requestOptions,
      headers: {
        ...(requestOptions.body instanceof FormData ? {} : { "content-type": "application/json" }),
        ...(requestOptions.headers || {})
      }
    };
    if (controller && !fetchOptions.signal) fetchOptions.signal = controller.signal;
    const response = await fetch(`/api${path}`, fetchOptions);
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { ok: false, error: text || "پاسخ نامعتبر از سرور" }; }
    if (!response.ok || data?.ok === false) {
      const err = new Error(data?.error || `HTTP ${response.status}`);
      err.status = response.status;
      throw err;
    }
    return data;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function applyRemoteStore(store) {
  if (!store || typeof store !== "object") return false;
  categories = normalizeCategories(store.categories || []);
  products = normalizeProducts(store.products || []);
  if (store.settings && typeof store.settings === "object") settings = { ...settings, ...store.settings };
  customerStories = Array.isArray(store.customerStories) ? store.customerStories : [];
  lastRemoteStore = { categories, products, settings: { ...settings }, customerStories };
  backendReady = true;
  if (typeof window !== 'undefined') {
    window.__FOXSHOP_STORE_READY__ = true;
    window.__FOXSHOP_STORE_LOADING__ = false;
    window.dispatchEvent(new CustomEvent('foxshop:store-ready'));
  }
  return true;
}

// Cloudflare D1 is the single source of truth for the public catalog.
// No browser/session cache is allowed to replace live D1 data.
async function refreshRemoteStore() {
  const data = await apiRequest("/store", { timeoutMs: 12000, cache: "no-store" });
  applyRemoteStore(data);
  return data;
}

// Start the live D1 request as soon as this script is parsed.
let foxShopEarlyStorePromise = null;
function getRemoteStoreOnce() {
  if (!foxShopEarlyStorePromise) foxShopEarlyStorePromise = refreshRemoteStore();
  return foxShopEarlyStorePromise;
}

if (typeof window !== "undefined" && typeof fetch === "function") {
  try {
    const prime = getRemoteStoreOnce();
    // Prevent an early network rejection from becoming an unhandled-promise event;
    // initStorage() will still observe the same promise and apply the normal fallback.
    if (prime && typeof prime.catch === "function") prime.catch(() => {});
  } catch (_) {}
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
  // Public products/categories are never read from browser storage or bundled demo data.
  // Remove legacy caches once so old catalog entries cannot reappear.
  try {
    localStorage.removeItem("foxshop_products_data");
    localStorage.removeItem("foxshop_categories_data");
    sessionStorage.removeItem("foxshop_store_cache_v1");
  } catch (_) {}

  products = [];
  categories = [];
  customerStories = [];

  try {
    const savedSettings = localStorage.getItem(LS_SETTINGS);
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      if (parsedSettings && typeof parsedSettings === "object" && !Array.isArray(parsedSettings)) settings = { ...settings, ...parsedSettings };
    }
  } catch (_) {}

  try {
    const savedCart = localStorage.getItem(LS_CART);
    cart = normalizeCart(savedCart ? JSON.parse(savedCart) : []);
  } catch (_) { cart = []; }

  // Wait for D1 before page-specific rendering. Direct product URLs therefore
  // resolve against exactly the same live catalog as the storefront grid.
  try {
    await getRemoteStoreOnce();
  } catch (remoteErr) {
    backendReady = false;
    if (typeof window !== 'undefined') {
      window.__FOXSHOP_STORE_LOADING__ = false;
      window.__FOXSHOP_STORE_READY__ = true;
      window.dispatchEvent(new CustomEvent('foxshop:store-ready'));
    }
    console.warn("Remote D1 store unavailable; showing an empty live catalog:", remoteErr);
  }
}


async function adminAddStory(event) {
  event.preventDefault();
  try {
    const data=await apiRequest('/admin/story',{method:'POST',body:JSON.stringify({
      customerName:document.getElementById('admin-story-name')?.value.trim()||'', catName:document.getElementById('admin-story-cat')?.value.trim()||'',
      photoUrl:document.getElementById('admin-story-photo')?.value.trim()||'', quote:document.getElementById('admin-story-quote')?.value.trim()||''
    })});
    applyRemoteStore(data.store); renderAdminPortal(); showToast('تجربه مشتری ثبت شد و برای اثبات اجتماعی سایت آماده است.','success');
  } catch(err){ showToast(err.message||'خطا در ثبت تجربه مشتری','error'); }
}

async function adminDeleteStory(id) {
  if(!confirm('این تجربه مشتری حذف شود؟')) return;
  try { const data=await apiRequest(`/admin/story/${encodeURIComponent(id)}`,{method:'DELETE'}); applyRemoteStore(data.store); renderAdminPortal(); showToast('تجربه حذف شد','info'); }
  catch(err){ showToast(err.message||'خطا در حذف تجربه','error'); }
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
        <button onclick="openProductDetailModal('${prod.id}', true)" class="p-1.5 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition" title="مشاهده">
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
  if (fileInput?.dataset.uploading === "1") {
    showToast("لطفاً صبر کنید تا آپلود و فشرده‌سازی تصویر تمام شود.", "info");
    return;
  }
  if (!name || !cat) { showToast("نام محصول و دسته‌بندی الزامی است.", "info"); return; }
  const finalPrice = discount > 0 ? Math.round(price * (1 - discount / 100)) : price;
  try {
    const data = await apiRequest("/admin/product", { method:"POST", body: JSON.stringify({
      name, categoryId:cat, originalPrice:price, discountPercent:discount, finalPrice, stockStatus:stock, image:img, imageKey, shortDesc:desc, fullDesc:desc,
      isFeatured:true, isBestSeller:false, isNew:true,
      brand:document.getElementById("admin-new-brand")?.value.trim() || "",
      weight:document.getElementById("admin-new-weight")?.value.trim() || "",
      flavor:document.getElementById("admin-new-flavor")?.value.trim() || "",
      suitableAge:document.getElementById("admin-new-age")?.value.trim() || "",
      goals:document.getElementById("admin-new-goals")?.value.trim() || "",
      country:document.getElementById("admin-new-country")?.value.trim() || "",
      barcode:document.getElementById("admin-new-barcode")?.value.trim() || "",
      expiryDate:document.getElementById("admin-new-expiry")?.value.trim() || "",
      actualStock:document.getElementById("admin-new-stock-qty")?.value || "",
      minStock:document.getElementById("admin-new-min-stock")?.value || "",
      restockTime:document.getElementById("admin-new-restock")?.value.trim() || "",
      consumable:!!document.getElementById("admin-new-consumable")?.checked,
      ingredients:document.getElementById("admin-new-ingredients")?.value.trim() || "",
      nutritionAnalysis:document.getElementById("admin-new-nutrition")?.value.trim() || "",
      usageMethod:document.getElementById("admin-new-usage")?.value.trim() || "",
      storage:document.getElementById("admin-new-storage")?.value.trim() || "",
      warranty:document.getElementById("admin-new-warranty")?.value.trim() || ""
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
  const pd = prod.details || {};
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

        <details open class="rounded-2xl border border-orange-100 bg-orange-50/40 p-3">
          <summary class="cursor-pointer text-[11px] font-black text-orange-700">مشخصات تکمیلی فروش، SEO و انبار</summary>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            <input id="edit-prod-slug" value="${escapeHtml(pd.slug || '')}" placeholder="Slug اختیاری" class="px-3 py-2 rounded-xl border bg-white text-xs" dir="ltr">
            <input id="edit-prod-brand" value="${escapeHtml(pd.brand || '')}" placeholder="برند" class="px-3 py-2 rounded-xl border bg-white text-xs">
            <input id="edit-prod-weight" value="${escapeHtml(pd.weight || '')}" placeholder="وزن / حجم" class="px-3 py-2 rounded-xl border bg-white text-xs">
            <input id="edit-prod-flavor" value="${escapeHtml(pd.flavor || '')}" placeholder="طعم و تنوع" class="px-3 py-2 rounded-xl border bg-white text-xs">
            <input id="edit-prod-age" value="${escapeHtml(pd.suitableAge || '')}" placeholder="سن مناسب" class="px-3 py-2 rounded-xl border bg-white text-xs">
            <input id="edit-prod-goals" value="${escapeHtml(pd.goals || '')}" placeholder="هدف مصرف" class="px-3 py-2 rounded-xl border bg-white text-xs">
            <input id="edit-prod-country" value="${escapeHtml(pd.country || '')}" placeholder="کشور سازنده" class="px-3 py-2 rounded-xl border bg-white text-xs">
            <input id="edit-prod-barcode" value="${escapeHtml(pd.barcode || '')}" placeholder="بارکد" class="px-3 py-2 rounded-xl border bg-white text-xs" dir="ltr">
            <input id="edit-prod-expiry" value="${escapeHtml(pd.expiryDate || '')}" placeholder="تاریخ انقضا" class="px-3 py-2 rounded-xl border bg-white text-xs">
            <input id="edit-prod-stock-qty" type="number" min="0" value="${pd.actualStock == null ? '' : Number(pd.actualStock)}" placeholder="تعداد واقعی انبار" class="px-3 py-2 rounded-xl border bg-white text-xs">
            <input id="edit-prod-min-stock" type="number" min="0" value="${pd.minStock == null ? '' : Number(pd.minStock)}" placeholder="حداقل موجودی" class="px-3 py-2 rounded-xl border bg-white text-xs">
            <input id="edit-prod-restock" value="${escapeHtml(pd.restockTime || '')}" placeholder="زمان تأمین مجدد" class="px-3 py-2 rounded-xl border bg-white text-xs">
            <label class="flex items-center gap-2 text-[11px] font-bold"><input id="edit-prod-consumable" type="checkbox" ${pd.consumable ? 'checked' : ''}> محصول مصرفی / مناسب خرید مجدد</label>
            <textarea id="edit-prod-ingredients" rows="2" placeholder="ترکیبات" class="sm:col-span-2 px-3 py-2 rounded-xl border bg-white text-xs">${escapeHtml(pd.ingredients || '')}</textarea>
            <textarea id="edit-prod-nutrition" rows="2" placeholder="آنالیز تغذیه‌ای" class="sm:col-span-2 px-3 py-2 rounded-xl border bg-white text-xs">${escapeHtml(pd.nutritionAnalysis || '')}</textarea>
            <textarea id="edit-prod-usage" rows="2" placeholder="روش مصرف" class="sm:col-span-2 px-3 py-2 rounded-xl border bg-white text-xs">${escapeHtml(pd.usageMethod || '')}</textarea>
            <textarea id="edit-prod-storage" rows="2" placeholder="روش نگهداری" class="sm:col-span-2 px-3 py-2 rounded-xl border bg-white text-xs">${escapeHtml(pd.storage || '')}</textarea>
            <input id="edit-prod-warranty" value="${escapeHtml(pd.warranty || '')}" placeholder="ضمانت" class="sm:col-span-2 px-3 py-2 rounded-xl border bg-white text-xs">
            <textarea id="edit-prod-authenticity" rows="2" placeholder="متن ضمانت اصالت" class="sm:col-span-2 px-3 py-2 rounded-xl border bg-white text-xs">${escapeHtml(pd.authenticity || '')}</textarea>
            <input id="edit-prod-sales-count" type="number" min="0" value="${Number(pd.salesCount)||0}" placeholder="تعداد فروش" class="px-3 py-2 rounded-xl border bg-white text-xs">
            <textarea id="edit-prod-more-images" rows="3" placeholder="عکس‌های بیشتر؛ هر آدرس در یک خط" class="sm:col-span-2 px-3 py-2 rounded-xl border bg-white text-xs">${escapeHtml(Array.isArray(pd.moreImages)?pd.moreImages.join('\n'):'')}</textarea>
            <textarea id="edit-prod-related" rows="2" placeholder="شناسه محصولات مرتبط؛ با ویرگول جدا کنید" class="sm:col-span-2 px-3 py-2 rounded-xl border bg-white text-xs">${escapeHtml(Array.isArray(pd.relatedIds)?pd.relatedIds.join(', '):'')}</textarea>
            <textarea id="edit-prod-faq" rows="4" placeholder='FAQ به صورت JSON؛ مثال: [{"question":"...","answer":"..."}]' class="sm:col-span-2 px-3 py-2 rounded-xl border bg-white text-xs" dir="ltr">${escapeHtml(JSON.stringify(Array.isArray(pd.faq)?pd.faq:[], null, 2))}</textarea>
          </div>
        </details>

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
        details: {
          slug: document.getElementById('edit-prod-slug')?.value.trim() || '',
          brand: document.getElementById('edit-prod-brand')?.value.trim() || '',
          weight: document.getElementById('edit-prod-weight')?.value.trim() || '',
          flavor: document.getElementById('edit-prod-flavor')?.value.trim() || '',
          suitableAge: document.getElementById('edit-prod-age')?.value.trim() || '',
          goals: document.getElementById('edit-prod-goals')?.value.trim() || '',
          country: document.getElementById('edit-prod-country')?.value.trim() || '',
          barcode: document.getElementById('edit-prod-barcode')?.value.trim() || '',
          expiryDate: document.getElementById('edit-prod-expiry')?.value.trim() || '',
          actualStock: document.getElementById('edit-prod-stock-qty')?.value || '',
          minStock: document.getElementById('edit-prod-min-stock')?.value || '',
          restockTime: document.getElementById('edit-prod-restock')?.value.trim() || '',
          consumable: !!document.getElementById('edit-prod-consumable')?.checked,
          ingredients: document.getElementById('edit-prod-ingredients')?.value.trim() || '',
          nutritionAnalysis: document.getElementById('edit-prod-nutrition')?.value.trim() || '',
          usageMethod: document.getElementById('edit-prod-usage')?.value.trim() || '',
          storage: document.getElementById('edit-prod-storage')?.value.trim() || '',
          warranty: document.getElementById('edit-prod-warranty')?.value.trim() || '',
          authenticity: document.getElementById('edit-prod-authenticity')?.value.trim() || '',
          salesCount: Number(document.getElementById('edit-prod-sales-count')?.value) || 0,
          moreImages: (document.getElementById('edit-prod-more-images')?.value || '').split(/\r?\n/).map(v => v.trim()).filter(Boolean),
          relatedIds: (document.getElementById('edit-prod-related')?.value || '').split(',').map(v => v.trim()).filter(Boolean),
          faq: (() => { try { const parsed = JSON.parse(document.getElementById('edit-prod-faq')?.value || '[]'); return Array.isArray(parsed) ? parsed : []; } catch (_) { return []; } })()
        }
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
    settings,
    customerStories
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
  showToast("بازنشانی به کاتالوگ پیش‌فرض غیرفعال شده است؛ محصولات فقط از Cloudflare D1 مدیریت می‌شوند.", "info");
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

      document.querySelectorAll('.fox-cat-pattern, .fox-cat-corner').forEach(el => el.remove());
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
