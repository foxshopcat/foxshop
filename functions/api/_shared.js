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

export async function getStore(db) {
  const [cats, prods, rows] = await Promise.all([
    db.prepare('SELECT id,name,slug,image,image_key AS imageKey,icon,color,sort_order AS sortOrder FROM categories ORDER BY sort_order ASC, created_at ASC').all(),
    db.prepare('SELECT id,name,category_id AS categoryId,stock_status AS stockStatus,original_price AS originalPrice,discount_percent AS discountPercent,final_price AS finalPrice,is_featured AS isFeatured,is_best_seller AS isBestSeller,is_new AS isNew,image,image_key AS imageKey,short_desc AS shortDesc,full_desc AS fullDesc FROM products ORDER BY created_at DESC').all(),
    db.prepare('SELECT key,value FROM settings').all()
  ]);

  const settings = {};
  for (const r of (rows?.results || [])) settings[r.key] = r.value;
  return {
    categories: cats?.results || [],
    products: prods?.results || [],
    settings
  };
}

export function cleanString(value, max = 100000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
