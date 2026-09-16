import { bad, getStore, json, requireAdmin, requireJson, cleanString } from '../_shared.js';

export async function onRequestPost(context) {
  const admin = await requireAdmin(context); if (!admin) return bad('نیاز به ورود مدیر دارید.', 401);
  const b = await requireJson(context.request);
  const id = cleanString(b?.id, 100) || `prod_${crypto.randomUUID()}`;
  const name = cleanString(b?.name, 180);
  const categoryId = cleanString(b?.categoryId, 100);
  if (!name || !categoryId) return bad('نام محصول و دسته‌بندی الزامی است.');
  const originalPrice = Number(b?.originalPrice) || 0;
  const discountPercent = Math.min(90, Math.max(0, Number(b?.discountPercent) || 0));
  const finalPrice = Number(b?.finalPrice) || Math.round(originalPrice * (1 - discountPercent / 100));
  await context.env.DB.prepare(`INSERT INTO products
    (id,name,category_id,stock_status,original_price,discount_percent,final_price,is_featured,is_best_seller,is_new,image,image_key,short_desc,full_desc,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id,name,categoryId,cleanString(b?.stockStatus,30)||'in_stock',originalPrice,discountPercent,finalPrice,
      Boolean(b?.isFeatured)?1:0,Boolean(b?.isBestSeller)?1:0,Boolean(b?.isNew)?1:0,
      cleanString(b?.image,500000),cleanString(b?.imageKey,200),cleanString(b?.shortDesc,1000),cleanString(b?.fullDesc,10000),new Date().toISOString(),new Date().toISOString()).run();
  return json({ ok:true, store: await getStore(context.env.DB) });
}
