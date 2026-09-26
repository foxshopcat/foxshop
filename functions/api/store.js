import { json, getStore } from './_shared.js';

export async function onRequestGet(context) {
  try {
    return json({ ok: true, ...(await getStore(context.env.DB)) }, 200, {
      'cache-control': 'no-store, max-age=0',
      'cdn-cache-control': 'no-store'
    });
  } catch (error) {
    console.error('FoxShop /api/store error:', error);
    return json({ ok: false, error: 'خطا در خواندن دیتابیس فروشگاه' }, 500, {
      'cache-control': 'no-store',
      'cdn-cache-control': 'no-store'
    });
  }
}
