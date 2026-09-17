const SESSION_DAYS = 7;
const SESSION_COOKIE = 'foxshop_session';
const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;
// Cloudflare Workers production caps WebCrypto PBKDF2 at 100,000 iterations.
// Keep this at the platform ceiling so production login does not throw.
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_SCHEME = `pbkdf2-sha256:${PBKDF2_ITERATIONS}`;
const PBKDF2_BYTES = 32;

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extra
    }
  });
}

export function bad(message, status = 400, extra = {}) {
  return json({ ok: false, error: message }, status, extra);
}

function bytesToHex(bytes) {
  let out = '';
  for (const b of bytes) out += Number(b).toString(16).padStart(2, '0');
  return out;
}

function hexToBytes(hex) {
  const clean = String(hex ?? '').trim();
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length === 0 || clean.length % 2 !== 0) {
    throw new Error('Invalid hexadecimal salt');
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return bytesToHex(new Uint8Array(digest));
}

export async function randomHex(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

// Authentication uses the Cloudflare Workers-native Web Crypto PBKDF2 API.
// This avoids the Node/OpenSSL compatibility layer and matches the PBKDF2-
// HMAC-SHA256 format already stored in D1.
export async function passwordHash(password, saltHex) {
  const salt = hexToBytes(saltHex);
  const passBytes = new TextEncoder().encode(String(password ?? ''));
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    passBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    key,
    PBKDF2_BYTES * 8
  );
  return bytesToHex(new Uint8Array(bits));
}

export async function verifyPassword(password, saltHex, expectedHash) {
  const expected = String(expectedHash ?? '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expected)) return false;
  const got = (await passwordHash(password, saltHex)).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(got) || got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export function getCookie(request, name) {
  const raw = request.headers.get('Cookie') || '';
  for (const chunk of raw.split(';')) {
    const [k, ...rest] = chunk.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function sessionCookie(value) {
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Max-Age=${SESSION_MAX_AGE}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export async function createSession(db, adminId) {
  const raw = await randomHex(32);
  const tokenHash = await sha256Hex(raw);
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  await db.prepare(
    'INSERT INTO sessions (token_hash, admin_id, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).bind(tokenHash, adminId, expiresAt, new Date().toISOString()).run();
  return { raw, expiresAt };
}

export async function requireAdmin(context) {
  const raw = getCookie(context.request, SESSION_COOKIE);
  if (!raw) return null;
  const hash = await sha256Hex(raw);
  const row = await context.env.DB.prepare(`
    SELECT a.id, a.username
    FROM sessions s
    JOIN admins a ON a.id = s.admin_id
    WHERE s.token_hash = ? AND s.expires_at > ?
    LIMIT 1
  `).bind(hash, Date.now()).first();
  return row || null;
}

export async function deleteSession(context) {
  const raw = getCookie(context.request, SESSION_COOKIE);
  if (!raw) return;
  const hash = await sha256Hex(raw);
  await context.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(hash).run();
}

export async function requireJson(request) {
  return request.json().catch(() => null);
}


let PRODUCT_SCHEMA_READY = false;

const PRODUCT_EXTRA_COLUMNS = [
  ['slug', "TEXT NOT NULL DEFAULT ''"],
  ['brand', "TEXT NOT NULL DEFAULT ''"],
  ['weight', "TEXT NOT NULL DEFAULT ''"],
  ['flavor', "TEXT NOT NULL DEFAULT ''"],
  ['age_range', "TEXT NOT NULL DEFAULT ''"],
  ['goal', "TEXT NOT NULL DEFAULT ''"],
  ['ingredients', "TEXT NOT NULL DEFAULT ''"],
  ['nutrition_analysis', "TEXT NOT NULL DEFAULT ''"],
  ['country_of_origin', "TEXT NOT NULL DEFAULT ''"],
  ['barcode', "TEXT NOT NULL DEFAULT ''"],
  ['expiration_date', "TEXT NOT NULL DEFAULT ''"],
  ['usage', "TEXT NOT NULL DEFAULT ''"],
  ['warranty', "TEXT NOT NULL DEFAULT ''"],
  ['storage', "TEXT NOT NULL DEFAULT ''"],
  ['authenticity', "TEXT NOT NULL DEFAULT ''"],
  ['stock_quantity', "INTEGER NOT NULL DEFAULT 0"],
  ['min_stock', "INTEGER NOT NULL DEFAULT 0"],
  ['restock_time', "TEXT NOT NULL DEFAULT ''"],
  ['rating', "REAL NOT NULL DEFAULT 0"],
  ['sales_count', "INTEGER NOT NULL DEFAULT 0"],
  ['extra_images', "TEXT NOT NULL DEFAULT '[]'"],
  ['related_product_ids', "TEXT NOT NULL DEFAULT '[]'"],
  ['complementary_product_ids', "TEXT NOT NULL DEFAULT '[]'"],
  ['faq', "TEXT NOT NULL DEFAULT '[]'"],
  ['is_consumable', "INTEGER NOT NULL DEFAULT 0"],
  ['shipping_note', "TEXT NOT NULL DEFAULT ''"],
  ['return_policy', "TEXT NOT NULL DEFAULT ''"]
];

function parseJsonField(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export async function ensureStoreSchema(db) {
  if (PRODUCT_SCHEMA_READY) return;

  const columns = await db.prepare('PRAGMA table_info(products)').all();
  const existing = new Set((columns?.results || []).map(row => String(row.name)));

  for (const [name, definition] of PRODUCT_EXTRA_COLUMNS) {
    if (!existing.has(name)) {
      try {
        await db.prepare(`ALTER TABLE products ADD COLUMN ${name} ${definition}`).run();
      } catch (error) {
        if (!/duplicate column name|already exists/i.test(String(error?.message || error))) throw error;
      }
    }
  }

  await db.prepare(`CREATE TABLE IF NOT EXISTS product_reviews (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    body TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    photo_url TEXT NOT NULL DEFAULT '',
    approved INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  )`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id)').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_product_reviews_approved ON product_reviews(approved, created_at)').run();

  const settingsDefaults = {
    shopCity: 'تبریز',
    freeShippingThreshold: 2000000,
    shippingTable: 'هزینه و زمان ارسال بر اساس شهر و روش ارسال هنگام ثبت سفارش اعلام می‌شود.',
    returnPolicy: 'سیاست مرجوعی: کالا باید سالم، استفاده‌نشده و مطابق شرایط اعلام‌شده در فاکتور تحویل باشد.',
    storageText: 'شرایط نگهداری هر محصول در صفحه همان محصول درج می‌شود؛ غذای خشک و تشویقی را در جای خشک، خنک و دور از نور مستقیم نگهداری کنید.',
    authenticityText: 'ضمانت اصالت کالا بر اساس فاکتور فروشگاه و شرایط اعلام‌شده در سفارش.',
    licenseText: '',
    supportText: 'پشتیبانی و ثبت سفارش از طریق اینستاگرام و روبیکا انجام می‌شود.'
  };
  const now = new Date().toISOString();
  for (const [key, value] of Object.entries(settingsDefaults)) {
    await db.prepare('INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES(?,?,?)')
      .bind(key, JSON.stringify(value), now).run();
  }
  await db.prepare("DELETE FROM settings WHERE key LIKE 'tele%User'").run();

  PRODUCT_SCHEMA_READY = true;
}

function safeJsonArray(value) {
  const parsed = parseJsonField(value, []);
  return Array.isArray(parsed) ? parsed : [];
}

export async function getStore(db) {
  // Never let optional enhancement migrations take down the existing catalog.
  // The original product tables must remain readable even if a new column cannot be added.
  try {
    await ensureStoreSchema(db);
  } catch (migrationError) {
    console.error('Optional store migration failed:', migrationError);
  }

  const [cats, prods, rows] = await Promise.all([
    db.prepare('SELECT id,name,slug,image,image_key AS imageKey,icon,color,sort_order AS sortOrder FROM categories ORDER BY sort_order ASC, created_at ASC').all(),
    db.prepare(`SELECT
      p.id,p.name,p.category_id AS categoryId,p.stock_status AS stockStatus,
      p.original_price AS originalPrice,p.discount_percent AS discountPercent,p.final_price AS finalPrice,
      p.is_featured AS isFeatured,p.is_best_seller AS isBestSeller,p.is_new AS isNew,
      p.image,p.image_key AS imageKey,p.short_desc AS shortDesc,p.full_desc AS fullDesc,
      p.slug,p.brand,p.weight,p.flavor,p.age_range AS ageRange,p.goal,
      p.ingredients,p.nutrition_analysis AS nutritionAnalysis,p.country_of_origin AS countryOfOrigin,
      p.barcode,p.expiration_date AS expirationDate,p.usage,p.warranty,p.storage,p.authenticity,
      p.stock_quantity AS stockQuantity,p.min_stock AS minStock,p.restock_time AS restockTime,
      p.sales_count AS salesCount,p.extra_images AS extraImages,p.related_product_ids AS relatedProductIds,
      p.complementary_product_ids AS complementaryProductIds,p.faq,p.is_consumable AS isConsumable,
      p.shipping_note AS shippingNote,p.return_policy AS returnPolicy,
      COALESCE((SELECT ROUND(AVG(r.rating),1) FROM product_reviews r WHERE r.product_id=p.id AND r.approved=1), p.rating, 0) AS rating,
      (SELECT COUNT(*) FROM product_reviews r WHERE r.product_id=p.id AND r.approved=1) AS reviewCount
      FROM products p ORDER BY p.created_at DESC`).all(),
    db.prepare('SELECT key,value FROM settings').all()
  ]);

  const settings = {};
  for (const r of (rows?.results || [])) {
    try { settings[r.key] = JSON.parse(r.value); }
    catch { settings[r.key] = r.value; }
  }

  const products = (prods?.results || []).map(p => ({
    ...p,
    isFeatured: Boolean(p.isFeatured),
    isBestSeller: Boolean(p.isBestSeller),
    isNew: Boolean(p.isNew),
    isConsumable: Boolean(p.isConsumable),
    extraImages: safeJsonArray(p.extraImages),
    relatedProductIds: safeJsonArray(p.relatedProductIds),
    complementaryProductIds: safeJsonArray(p.complementaryProductIds),
    faq: safeJsonArray(p.faq),
    stockQuantity: Number(p.stockQuantity || 0),
    minStock: Number(p.minStock || 0),
    salesCount: Number(p.salesCount || 0),
    rating: Number(p.rating || 0),
    reviewCount: Number(p.reviewCount || 0)
  }));

  return {
    categories: cats?.results || [],
    products,
    settings
  };
}

export function cleanString(value, max = 100000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function safeProductJsonArray(value, maxItems = 30, maxItemLength = 400) {
  let parsed = value;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { parsed = []; }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.slice(0, maxItems).map(item => {
    if (typeof item === 'string') return item.trim().slice(0, maxItemLength);
    if (item && typeof item === 'object') {
      return Object.fromEntries(Object.entries(item).slice(0, 12).map(([k,v]) => [
        String(k).slice(0, 60),
        typeof v === 'string' ? v.slice(0, maxItemLength) : v
      ]));
    }
    return null;
  }).filter(Boolean);
}

export function normalizeProductPayload(body, fallbackId = '') {
  const b = body && typeof body === 'object' ? body : {};
  const originalPrice = Math.max(0, Number(b.originalPrice) || 0);
  const discountPercent = Math.min(90, Math.max(0, Number(b.discountPercent) || 0));
  const rawFinal = Number(b.finalPrice);
  const finalPrice = Number.isFinite(rawFinal)
    ? Math.max(0, rawFinal)
    : Math.round(originalPrice * (1 - discountPercent / 100));
  const id = cleanString(b.id, 100) || fallbackId || `fox_${crypto.randomUUID().replaceAll('-', '').slice(0, 18)}`;
  const slug = cleanString(b.slug, 180) || id;
  return {
    id, name: cleanString(b.name, 180), categoryId: cleanString(b.categoryId, 100),
    stockStatus: cleanString(b.stockStatus, 30) || 'in_stock',
    originalPrice, discountPercent, finalPrice,
    isFeatured: Boolean(b.isFeatured), isBestSeller: Boolean(b.isBestSeller), isNew: Boolean(b.isNew),
    image: cleanString(b.image, 500000), imageKey: cleanString(b.imageKey, 200),
    shortDesc: cleanString(b.shortDesc, 3000), fullDesc: cleanString(b.fullDesc, 20000),
    slug, brand: cleanString(b.brand, 160), weight: cleanString(b.weight, 120),
    flavor: cleanString(b.flavor, 160), ageRange: cleanString(b.ageRange, 180),
    goal: cleanString(b.goal, 240), ingredients: cleanString(b.ingredients, 8000),
    nutritionAnalysis: cleanString(b.nutritionAnalysis, 5000),
    countryOfOrigin: cleanString(b.countryOfOrigin, 160), barcode: cleanString(b.barcode, 80),
    expirationDate: cleanString(b.expirationDate, 80), usage: cleanString(b.usage, 5000),
    warranty: cleanString(b.warranty, 1500), storage: cleanString(b.storage, 1500),
    authenticity: cleanString(b.authenticity, 1500),
    stockQuantity: Math.max(0, Math.floor(Number(b.stockQuantity) || 0)),
    minStock: Math.max(0, Math.floor(Number(b.minStock) || 0)),
    restockTime: cleanString(b.restockTime, 160),
    rating: Math.min(5, Math.max(0, Number(b.rating) || 0)),
    salesCount: Math.max(0, Math.floor(Number(b.salesCount) || 0)),
    extraImages: safeProductJsonArray(b.extraImages),
    relatedProductIds: safeProductJsonArray(b.relatedProductIds, 30, 100),
    complementaryProductIds: safeProductJsonArray(b.complementaryProductIds, 30, 100),
    faq: safeProductJsonArray(b.faq, 20, 1000),
    isConsumable: Boolean(b.isConsumable),
    shippingNote: cleanString(b.shippingNote, 1000),
    returnPolicy: cleanString(b.returnPolicy, 1500)
  };
}
