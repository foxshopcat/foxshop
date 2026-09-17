import { bad, ensureStoreSchema, json, requireAdmin, requireJson, cleanString } from '../../_shared.js';

export async function onRequestGet(context) {
  if (!(await requireAdmin(context))) return bad('نیاز به ورود مدیر دارید.', 401);

  await ensureStoreSchema(context.env.DB);

  const rows = await context.env.DB.prepare(`
    SELECT
      r.id,
      r.product_id AS productId,
      r.customer_name AS customerName,
      r.body,
      r.rating,
      r.photo_url AS photoUrl,
      r.approved,
      r.created_at AS createdAt,
      p.name AS productName
    FROM reviews r
    LEFT JOIN products p ON p.id = r.product_id
    ORDER BY r.created_at DESC
  `).all();

  return json(rows.results || []);
}

export async function onRequestPost(context) {
  if (!(await requireAdmin(context))) return bad('نیاز به ورود مدیر دارید.', 401);

  await ensureStoreSchema(context.env.DB);

  const data = await requireJson(context.request);

  const productId = cleanString(data.productId);
  const customerName = cleanString(data.customerName);
  const body = cleanString(data.body);
  const rating = Number(data.rating || 5);

  if (!productId || !customerName || !body) {
    return bad('اطلاعات ناقص است.', 400);
  }

  await context.env.DB.prepare(`
    INSERT INTO reviews
    (product_id, customer_name, body, rating, approved, created_at)
    VALUES (?, ?, ?, ?, 0, datetime('now'))
  `)
    .bind(productId, customerName, body, rating)
    .run();

  return json({ ok: true });
}

export async function onRequestPut(context) {
  if (!(await requireAdmin(context))) return bad('نیاز به ورود مدیر دارید.', 401);

  await ensureStoreSchema(context.env.DB);

  const data = await requireJson(context.request);
  const id = Number(data.id);

  if (!id) {
    return bad('شناسه نظر نامعتبر است.', 400);
  }

  await context.env.DB.prepare(`
    UPDATE reviews
    SET approved = ?
    WHERE id = ?
  `)
    .bind(data.approved ? 1 : 0, id)
    .run();

  return json({ ok: true });
}

export async function onRequestDelete(context) {
  if (!(await requireAdmin(context))) return bad('نیاز به ورود مدیر دارید.', 401);

  await ensureStoreSchema(context.env.DB);

  const data = await requireJson(context.request);
  const id = Number(data.id);

  if (!id) {
    return bad('شناسه نظر نامعتبر است.', 400);
  }

  await context.env.DB.prepare(`
    DELETE FROM reviews
    WHERE id = ?
  `)
    .bind(id)
    .run();

  return json({ ok: true });
}
