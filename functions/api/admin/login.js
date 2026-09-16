import { bad, createSession, json, passwordHash, sessionCookie, verifyPassword, getStore } from '../_shared.js';

const MAX_FAILS = 5;
const LOCK_MS = 10 * 60 * 1000;

export async function onRequestPost(context) {
  const body = await context.request.json().catch(() => null);
  const username = String(body?.username || '').trim();
  const password = String(body?.password || '');
  if (!username || !password) return bad('نام کاربری و رمز عبور الزامی است.', 400);

  const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
  const attemptKey = `${username}:${ip}`.slice(0, 180);
  const attempt = await context.env.DB.prepare('SELECT fail_count, locked_until FROM login_attempts WHERE key = ?').bind(attemptKey).first();
  const now = Date.now();
  if (attempt?.locked_until && Number(attempt.locked_until) > now) {
    const sec = Math.ceil((Number(attempt.locked_until) - now) / 1000);
    return bad(`تلاش‌های ورود موقتاً قفل شده است. ${sec} ثانیه دیگر دوباره امتحان کنید.`, 429);
  }

  const admin = await context.env.DB.prepare('SELECT id, username, password_hash, password_salt FROM admins WHERE username = ? LIMIT 1').bind(username).first();
  const valid = Boolean(admin && await verifyPassword(password, admin.password_salt, admin.password_hash));

  if (!valid) {
    const next = Number(attempt?.fail_count || 0) + 1;
    const lockedUntil = next >= MAX_FAILS ? now + LOCK_MS : 0;
    await context.env.DB.prepare(`INSERT INTO login_attempts (key, fail_count, locked_until, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET fail_count=excluded.fail_count, locked_until=excluded.locked_until, updated_at=excluded.updated_at`)
      .bind(attemptKey, next, lockedUntil, new Date().toISOString()).run();
    return bad('نام کاربری یا رمز عبور اشتباه است.', 401);
  }

  await context.env.DB.prepare('DELETE FROM login_attempts WHERE key = ?').bind(attemptKey).run();
  await context.env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now).run();
  const session = await createSession(context.env.DB, admin.id);
  const store = await getStore(context.env.DB);
  return json({ ok: true, username: admin.username, store }, 200, { 'Set-Cookie': sessionCookie(session.raw) });
}
