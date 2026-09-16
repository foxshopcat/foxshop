import { json, getStore } from './_shared.js';

export async function onRequestGet(context) {
  try {
    return json({ ok: true, ...(await getStore(context.env.DB)) });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: 'خطا در خواندن دیتابیس فروشگاه' }, 500);
  }
}
