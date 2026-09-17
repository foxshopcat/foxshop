import { bad, cleanString, ensureExtendedSchema, getStore, json, requireAdmin } from '../../_shared.js';
export async function onRequestDelete(context) {
  if (!(await requireAdmin(context))) return bad('نیاز به ورود مدیر دارید.', 401);
  const id = cleanString(context.params.id, 120);
  if (!id) return bad('شناسه نظر نامعتبر است.');
  await ensureExtendedSchema(context.env.DB);
  const row = await context.env.DB.prepare('SELECT product_id AS productId FROM product_reviews WHERE id=?').bind(id).first();
  await context.env.DB.prepare('DELETE FROM product_reviews WHERE id=?').bind(id).run();
  if (row?.productId) await context.env.DB.prepare(`UPDATE product_details SET review_count=(SELECT COUNT(*) FROM product_reviews WHERE product_id=? AND approved=1), rating=COALESCE((SELECT ROUND(AVG(rating),2) FROM product_reviews WHERE product_id=? AND approved=1),0), updated_at=? WHERE product_id=?`).bind(row.productId,row.productId,new Date().toISOString(),row.productId).run();
  return json({ ok: true, store: await getStore(context.env.DB) });
}
