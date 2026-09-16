import { pbkdf2Sync } from 'node:crypto';

const SESSION_DAYS = 7;
const SESSION_COOKIE = 'foxshop_session';
const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;
const PBKDF2_ITERATIONS = 120000;

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra }
  });
}

export function bad(message, status = 400) { return json({ ok: false, error: message }, status); }

export async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function bytesToHex(bytes) { return [...bytes].map(b => b.toString(16).padStart(2, '0')).join(''); }
function hexToBytes(hex) {
  const clean = String(hex || '').trim();
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) throw new Error('Invalid hexadecimal salt');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export async function randomHex(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

// Use the native Workers-supported Node.js crypto implementation directly.
// This avoids the previous runtime problem caused by the asynchronous
// callback form of pbkdf2. Cloudflare Workers currently supports node:crypto
// for compatibility dates on/after 2026-08-04.
export async function passwordHash(password, saltHex) {
  const salt = hexToBytes(saltHex);
  const derived = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha256');
  return bytesToHex(new Uint8Array(derived));
}

export async function verifyPassword(password, saltHex, expectedHash) {
  const expected = String(expectedHash || '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(expected)) return false;
  const got = (await passwordHash(password, saltHex)).toLowerCase();
  if (got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
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
  const row = await context.env.DB.prepare(`
    SELECT a.id, a.username
    FROM sessions s JOIN admins a ON a.id = s.admin_id
    WHERE s.token_hash = ? AND s.expires_at > ?
    LIMIT 1
  `).bind(hash, Date.now()).first();
  if (!row) return null;
  return row;
}

export async function deleteSession(context) {
  const raw = getCookie(context.request, SESSION_COOKIE);
  if (raw) {
    const hash = await sha256Hex(raw);
    await context.env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(hash).run();
  }
}

export async function getStore(db) {
  const [cats, prods, settingsRows] = await Promise.all([
    db.prepare('SELECT id, name, slug, image, image_key AS imageKey, icon, color FROM categories ORDER BY sort_order ASC, created_at ASC').all(),
    db.prepare(`SELECT id, name, category_id AS categoryId, stock_status AS stockStatus, original_price AS originalPrice,
      discount_percent AS discountPercent, final_price AS finalPrice, is_featured AS isFeatured,
      is_best_seller AS isBestSeller, is_new AS isNew, image, image_key AS imageKey,
      short_desc AS shortDesc, full_desc AS fullDesc
      FROM products ORDER BY created_at DESC`).all(),
    db.prepare('SELECT key, value FROM settings').all()
  ]);
  const settings = {};
  for (const row of settingsRows.results || []) {
    try { settings[row.key] = JSON.parse(row.value); } catch { settings[row.key] = row.value; }
  }
  return {
    categories: cats.results || [],
    products: (prods.results || []).map(p => ({ ...p, isFeatured: Boolean(p.isFeatured), isBestSeller: Boolean(p.isBestSeller), isNew: Boolean(p.isNew) })),
    settings
  };
}

export async function requireJson(request) {
  try { return await request.json(); } catch { return null; }
}

export function cleanString(value, max = 100000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
