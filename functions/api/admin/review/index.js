import { bad, ensureStoreSchema, json, requireAdmin, requireJson, cleanString } from '../../_shared.js';

export async function onRequestGet(context) {
  if(!(await requireAdmin(context))) return bad('نیاز به ورود مدیر دارید.',401);
  await ensureStoreSchema(context.env.DB);
  const rows=await context.env.DB.prepare(`SELECT r.id,r.product_id AS productId,r.customer_name AS customerName,r.body,r.rating,r.photo_url AS photoUrl,
      r.approved,r.created_at AS createdAt,p.name AS productName
    FROM product_reviews r JOIN products p ON p.id=r.product_id
    ORDER BY r.approved ASC,r.created_at DESC LIMIT 300`).all();
  return json({ok:true,reviews:rows?.results||[]});
}

export async function onRequestPut(context) {
  if(!(await requireAdmin(context))) return bad('نیاز به ورود مدیر دارید.',401);
  await ensureStoreSchema(context.env.DB);
  const id=cleanString(context.params.id,100);
  if(!id) return bad('شناسه نظر نامعتبر است.');
  const body=await requireJson(context.request);
  const approved=Boolean(body?.approved);
  const result=await context.env.DB.prepare('UPDATE product_reviews SET approved=? WHERE id=?').bind(approved?1:0,id).run();
  if(!result.meta?.changes) return bad('نظر پیدا نشد.',404);
  return json({ok:true});
}

export async function onRequestDelete(context) {
  if(!(await requireAdmin(context))) return bad('نیاز به ورود مدیر دارید.',401);
  await ensureStoreSchema(context.env.DB);
  const id=cleanString(context.params.id,100);
  if(!id) return bad('شناسه نظر نامعتبر است.');
  await context.env.DB.prepare('DELETE FROM product_reviews WHERE id=?').bind(id).run();
  return json({ok:true});
}
