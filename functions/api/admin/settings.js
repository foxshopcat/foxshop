import { bad, ensureStoreSchema, getStore, json, requireAdmin, requireJson, cleanString } from '../_shared.js';

const ALLOWED = new Set([
  'shopCity','freeShippingThreshold','shippingTable','returnPolicy','storageText',
  'authenticityText','licenseText','supportText','shopName','phone','instagramUrl','aboutText'
]);

export async function onRequestPut(context) {
  if (!(await requireAdmin(context))) return bad('نیاز به ورود مدیر دارید.', 401);
  const db = context.env.DB;
  await ensureStoreSchema(db);
  const body = await requireJson(context.request);
  const settings = body?.settings && typeof body.settings === 'object' ? body.settings : body;
  if (!settings || typeof settings !== 'object') return bad('تنظیمات نامعتبر است.', 400);

  const entries = Object.entries(settings).filter(([key]) => ALLOWED.has(key));
  if (!entries.length) return bad('هیچ تنظیم قابل ویرایشی ارسال نشده است.', 400);

  for (const [key, value] of entries) {
    let safe;
    if (key === 'freeShippingThreshold') {
      safe = String(Math.max(0, Math.min(100000000000, Number(value) || 0)));
    } else if (key === 'phone') {
      safe = cleanString(value, 40);
    } else if (key === 'instagramUrl') {
      const candidate = cleanString(value, 500);
      safe = /^https:\/\/(www\.)?instagram\.com\//i.test(candidate) ? candidate : '';
    } else {
      safe = cleanString(value, 50000);
    }
    await db.prepare(`INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).bind(key, safe).run();
  }

  return json({ ok: true, store: await getStore(db) });
}
