const SESSION_DAYS = 7;
const SESSION_COOKIE = 'foxshop_session';
const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_SCHEME = `pbkdf2-sha256:${PBKDF2_ITERATIONS}`;
const PBKDF2_BYTES = 32;
let extendedSchemaReady = false;

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
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
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

export async function passwordHash(password, saltHex) {
  const salt = hexToBytes(saltHex);
  const passBytes = new TextEncoder().encode(String(password ?? ''));
  const key = await globalThis.crypto.subtle.importKey('raw', passBytes, { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
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
  await db.prepare('INSERT INTO sessions (token_hash, admin_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .bind(tokenHash, adminId, expiresAt, new Date().toISOString()).run();
  return { raw, expiresAt };
}

export async function requireAdmin(context) {
  const raw = getCookie(context.request, SESSION_COOKIE);
  if (!raw) return null;
  const hash = await sha256Hex(raw);
  return context.env.DB.prepare(`
    SELECT a.id, a.username
    FROM sessions s JOIN admins a ON a.id = s.admin_id
    WHERE s.token_hash = ? AND s.expires_at > ? LIMIT 1
  `).bind(hash, Date.now()).first();
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

function safeJson(value, fallback) {
  try {
    const parsed = JSON.parse(String(value ?? ''));
    return parsed ?? fallback;
  } catch (_) {
    return fallback;
  }
}

function normalizeDetails(row) {
  if (!row) return {
    slug: '', brand: '', weight: '', volume: '', flavor: '', suitableAge: '', goals: '', ingredients: '', nutritionAnalysis: '', country: '', barcode: '', expiryDate: '', usageMethod: '', warranty: '', storage: '', authenticity: '', actualStock: null, minStock: null, restockTime: '', rating: 0, reviewCount: 0, salesCount: 0, moreImages: [], faq: [], relatedIds: [], tags: [], consumable: false
  };
  return {
    slug: String(row.slug || ''),
    brand: String(row.brand || ''),
    weight: String(row.weight || ''),
    volume: String(row.volume || ''),
    flavor: String(row.flavor || ''),
    suitableAge: String(row.suitable_age || ''),
    goals: String(row.goals || ''),
    ingredients: String(row.ingredients || ''),
    nutritionAnalysis: String(row.nutrition_analysis || ''),
    country: String(row.country || ''),
    barcode: String(row.barcode || ''),
    expiryDate: String(row.expiry_date || ''),
    usageMethod: String(row.usage_method || ''),
    warranty: String(row.warranty || ''),
    storage: String(row.storage || ''),
    authenticity: String(row.authenticity || ''),
    actualStock: row.actual_stock == null ? null : Number(row.actual_stock),
    minStock: row.min_stock == null ? null : Number(row.min_stock),
    restockTime: String(row.restock_time || ''),
    rating: Number(row.rating) || 0,
    reviewCount: Number(row.review_count) || 0,
    salesCount: Number(row.sales_count) || 0,
    moreImages: safeJson(row.more_images_json, []),
    faq: safeJson(row.faq_json, []),
    relatedIds: safeJson(row.related_ids_json, []),
    tags: safeJson(row.tags_json, []),
    consumable: Boolean(Number(row.consumable || 0))
  };
}

export async function ensureExtendedSchema(db) {
  if (!db || extendedSchemaReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS product_details (
      product_id TEXT PRIMARY KEY,
      slug TEXT NOT NULL DEFAULT '',
      brand TEXT NOT NULL DEFAULT '',
      weight TEXT NOT NULL DEFAULT '',
      volume TEXT NOT NULL DEFAULT '',
      flavor TEXT NOT NULL DEFAULT '',
      suitable_age TEXT NOT NULL DEFAULT '',
      goals TEXT NOT NULL DEFAULT '',
      ingredients TEXT NOT NULL DEFAULT '',
      nutrition_analysis TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      barcode TEXT NOT NULL DEFAULT '',
      expiry_date TEXT NOT NULL DEFAULT '',
      usage_method TEXT NOT NULL DEFAULT '',
      warranty TEXT NOT NULL DEFAULT '',
      storage TEXT NOT NULL DEFAULT '',
      authenticity TEXT NOT NULL DEFAULT '',
      actual_stock INTEGER,
      min_stock INTEGER,
      restock_time TEXT NOT NULL DEFAULT '',
      rating REAL NOT NULL DEFAULT 0,
      review_count INTEGER NOT NULL DEFAULT 0,
      sales_count INTEGER NOT NULL DEFAULT 0,
      more_images_json TEXT NOT NULL DEFAULT '[]',
      faq_json TEXT NOT NULL DEFAULT '[]',
      related_ids_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      consumable INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_product_details_brand ON product_details(brand)`),
    db.prepare(`INSERT OR IGNORE INTO product_details(product_id, created_at, updated_at)
      SELECT id, datetime('now'), datetime('now') FROM products`),
    db.prepare(`CREATE TABLE IF NOT EXISTS product_reviews (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      customer_name TEXT NOT NULL DEFAULT '',
      rating INTEGER NOT NULL DEFAULT 5,
      review_text TEXT NOT NULL DEFAULT '',
      photo_url TEXT NOT NULL DEFAULT '',
      approved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON product_reviews(product_id, approved)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS review_submission_log (
      id TEXT PRIMARY KEY,
      fingerprint TEXT NOT NULL,
      product_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_review_submission_fingerprint ON review_submission_log(fingerprint, created_at)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS customer_stories (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL DEFAULT '',
      cat_name TEXT NOT NULL DEFAULT '',
      photo_url TEXT NOT NULL DEFAULT '',
      quote TEXT NOT NULL DEFAULT '',
      approved INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS foxshop_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )`),
    db.prepare(`INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES ('storeLocation','"تبریز، ایران"',datetime('now'))`),
    db.prepare(`INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES ('freeShippingThreshold','2500000',datetime('now'))`),
    db.prepare(`INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES ('shippingCost','120000',datetime('now'))`),
    db.prepare(`INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES ('shippingDispatchTime','"۱ تا ۲ روز کاری"',datetime('now'))`),
    db.prepare(`INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES ('returnPolicy','"شرایط مرجوعی طبق سیاست ثبت‌شده فروشگاه و با بررسی وضعیت کالا انجام می‌شود."',datetime('now'))`),
    db.prepare(`INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES ('authenticityPolicy','"اطلاعات اصالت و مستندات هر محصول فقط در صورت ثبت و قابل ارائه بودن نمایش داده می‌شود."',datetime('now'))`),
    db.prepare(`INSERT OR IGNORE INTO foxshop_migrations(id, applied_at) VALUES('remove_telegram_setting', datetime('now'))`),
    db.prepare(`DELETE FROM settings WHERE key='telegramUser'`)
  ]);
  extendedSchemaReady = true;
}

export async function getStore(db) {
  await ensureExtendedSchema(db);
  const [cats, prods, details, reviews, stories, rows] = await Promise.all([
    db.prepare('SELECT id,name,slug,image,image_key AS imageKey,icon,color,sort_order AS sortOrder FROM categories ORDER BY sort_order ASC, created_at ASC').all(),
    db.prepare('SELECT id,name,category_id AS categoryId,stock_status AS stockStatus,original_price AS originalPrice,discount_percent AS discountPercent,final_price AS finalPrice,is_featured AS isFeatured,is_best_seller AS isBestSeller,is_new AS isNew,image,image_key AS imageKey,short_desc AS shortDesc,full_desc AS fullDesc FROM products ORDER BY created_at DESC').all(),
    db.prepare('SELECT * FROM product_details').all(),
    db.prepare('SELECT id,product_id AS productId,customer_name AS customerName,rating,review_text AS reviewText,photo_url AS photoUrl,created_at AS createdAt FROM product_reviews WHERE approved=1 ORDER BY created_at DESC').all(),
    db.prepare('SELECT id,customer_name AS customerName,cat_name AS catName,photo_url AS photoUrl,quote,created_at AS createdAt FROM customer_stories WHERE approved=1 ORDER BY created_at DESC').all(),
    db.prepare('SELECT key,value FROM settings').all()
  ]);

  const detailsByProduct = {};
  for (const row of details?.results || []) detailsByProduct[row.product_id] = normalizeDetails(row);
  const reviewsByProduct = {};
  for (const row of reviews?.results || []) (reviewsByProduct[row.productId] ||= []).push(row);

  const settings = {};
  for (const r of rows?.results || []) {
    const parsed = safeJson(r.value, null);
    settings[r.key] = parsed === null ? r.value : parsed;
  }

  const products = (prods?.results || []).map(p => ({
    ...p,
    isFeatured: Boolean(p.isFeatured),
    isBestSeller: Boolean(p.isBestSeller),
    isNew: Boolean(p.isNew),
    details: detailsByProduct[p.id] || normalizeDetails(null),
    reviews: reviewsByProduct[p.id] || []
  }));

  return {
    categories: cats?.results || [],
    products,
    settings,
    customerStories: stories?.results || []
  };
}

export function cleanString(value, max = 100000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function cleanJsonArray(value, maxItems = 40, maxItemLength = 2000) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map(item => {
    if (typeof item === 'string') return cleanString(item, maxItemLength);
    if (!item || typeof item !== 'object') return null;
    const copy = {};
    for (const [k, v] of Object.entries(item).slice(0, 16)) {
      if (typeof v === 'string') copy[k] = cleanString(v, maxItemLength);
      else if (typeof v === 'number' || typeof v === 'boolean') copy[k] = v;
    }
    return copy;
  }).filter(Boolean);
}

export function buildProductDetails(body = {}) {
  const list = cleanJsonArray;
  const actualStock = body.actualStock === '' || body.actualStock == null ? null : Math.max(0, Math.floor(Number(body.actualStock) || 0));
  const minStock = body.minStock === '' || body.minStock == null ? null : Math.max(0, Math.floor(Number(body.minStock) || 0));
  return {
    slug: cleanString(body.slug, 160),
    brand: cleanString(body.brand, 160),
    weight: cleanString(body.weight, 100),
    volume: cleanString(body.volume, 100),
    flavor: cleanString(body.flavor, 180),
    suitableAge: cleanString(body.suitableAge, 260),
    goals: cleanString(body.goals, 400),
    ingredients: cleanString(body.ingredients, 12000),
    nutritionAnalysis: cleanString(body.nutritionAnalysis, 10000),
    country: cleanString(body.country, 120),
    barcode: cleanString(body.barcode, 80),
    expiryDate: cleanString(body.expiryDate, 80),
    usageMethod: cleanString(body.usageMethod, 3000),
    warranty: cleanString(body.warranty, 500),
    storage: cleanString(body.storage, 1200),
    authenticity: cleanString(body.authenticity, 1000),
    actualStock,
    minStock,
    restockTime: cleanString(body.restockTime, 160),
    rating: Math.min(5, Math.max(0, Number(body.rating) || 0)),
    reviewCount: Math.max(0, Math.floor(Number(body.reviewCount) || 0)),
    salesCount: Math.max(0, Math.floor(Number(body.salesCount) || 0)),
    moreImages: list(body.moreImages, 8, 500000),
    faq: list(body.faq, 12, 1000),
    relatedIds: list(body.relatedIds, 12, 120),
    tags: list(body.tags, 30, 80),
    consumable: Boolean(body.consumable)
  };
}

export async function upsertProductDetails(db, productId, details) {
  await ensureExtendedSchema(db);
  const now = new Date().toISOString();
  return db.prepare(`INSERT INTO product_details(
    product_id,slug,brand,weight,volume,flavor,suitable_age,goals,ingredients,nutrition_analysis,country,barcode,expiry_date,
    usage_method,warranty,storage,authenticity,actual_stock,min_stock,restock_time,rating,review_count,sales_count,more_images_json,
    faq_json,related_ids_json,tags_json,consumable,created_at,updated_at
  ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT(product_id) DO UPDATE SET
    slug=excluded.slug,brand=excluded.brand,weight=excluded.weight,volume=excluded.volume,flavor=excluded.flavor,
    suitable_age=excluded.suitable_age,goals=excluded.goals,ingredients=excluded.ingredients,nutrition_analysis=excluded.nutrition_analysis,
    country=excluded.country,barcode=excluded.barcode,expiry_date=excluded.expiry_date,usage_method=excluded.usage_method,warranty=excluded.warranty,
    storage=excluded.storage,authenticity=excluded.authenticity,actual_stock=excluded.actual_stock,min_stock=excluded.min_stock,
    restock_time=excluded.restock_time,rating=excluded.rating,review_count=excluded.review_count,sales_count=excluded.sales_count,
    more_images_json=excluded.more_images_json,faq_json=excluded.faq_json,related_ids_json=excluded.related_ids_json,tags_json=excluded.tags_json,
    consumable=excluded.consumable,updated_at=excluded.updated_at`)
    .bind(
      productId, details.slug, details.brand, details.weight, details.volume, details.flavor, details.suitableAge, details.goals,
      details.ingredients, details.nutritionAnalysis, details.country, details.barcode, details.expiryDate, details.usageMethod,
      details.warranty, details.storage, details.authenticity, details.actualStock, details.minStock, details.restockTime, details.rating,
      details.reviewCount, details.salesCount, JSON.stringify(details.moreImages), JSON.stringify(details.faq), JSON.stringify(details.relatedIds),
      JSON.stringify(details.tags), details.consumable ? 1 : 0, now, now
    ).run();
}
