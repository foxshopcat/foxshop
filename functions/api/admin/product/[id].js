import { bad, getStore, json, requireAdmin } from '../../_shared.js';
export async function onRequestDelete(context) {
  if (!(await requireAdmin(context))) return bad('نیاز به ورود مدیر دارید.', 401);
  const id = context.params.id;
  if (!id) return bad('شناسه محصول نامعتبر است.');
  await context.env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
  return json({ ok:true, store: await getStore(context.env.DB) });
}
