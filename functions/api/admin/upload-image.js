import { bad, json, requireAdmin } from "../_shared.js";

const MAX_IMAGE_BYTES = 1700000; // stay safely below D1 2 MB BLOB/row limit

export async function onRequestPost(context) {
  if (!(await requireAdmin(context))) return bad("نیاز به ورود مدیر دارید.", 401);
  const form = await context.request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return bad("فایل تصویر ارسال نشده است.");
  if (!file.type.startsWith("image/")) return bad("فقط فایل تصویری مجاز است.");
  if (file.size > MAX_IMAGE_BYTES) return bad("حجم تصویر فشرده‌شده نباید بیشتر از حدود ۱.۷ مگابایت باشد.");

  const key = crypto.randomUUID().replaceAll("-", "");
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_IMAGE_BYTES) return bad("حجم تصویر برای ذخیره در دیتابیس زیاد است. تصویر کوچک‌تر انتخاب کنید.");

  try {
    await context.env.DB.prepare(`
      INSERT INTO media_assets (id, mime_type, size_bytes, data, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(key, file.type, bytes.byteLength, bytes, new Date().toISOString()).run();
  } catch (error) {
    console.error(error);
    return bad("ذخیره تصویر در D1 انجام نشد. مطمئن شوید جدول media_assets ساخته شده است و تصویر زیر ۲ مگابایت است.", 500);
  }

  return json({ ok: true, key, url: `/api/media/${key}` });
}
