import { json } from './_shared.js';

function cleanRow(row) {
  return {
    id: String(row?.id ?? ''),
    name: String(row?.name ?? ''),
    categoryId: String(row?.categoryId ?? ''),
    stockStatus: String(row?.stockStatus ?? 'in_stock'),
    originalPrice: Number(row?.originalPrice) || 0,
    discountPercent: Number(row?.discountPercent) || 0,
    finalPrice: Number(row?.finalPrice) || 0,
    isFeatured: Boolean(row?.isFeatured),
    isBestSeller: Boolean(row?.isBestSeller),
    isNew: Boolean(row?.isNew),
    image: typeof row?.image === 'string' ? row.image : '',
    imageKey: typeof row?.imageKey === 'string' ? row.imageKey : '',
    shortDesc: typeof row?.shortDesc === 'string' ? row.shortDesc : '',
    fullDesc: typeof row?.fullDesc === 'string' ? row.fullDesc : '',
    details: row?.details || {}
  };
}

export async function onRequestGet(context) {
  const db = context.env.DB;
  if (!db) return json({ ok: false, error: 'اتصال Worker به D1 برقرار نیست.' }, 500, { 'cache-control':'no-store' });
  try {
    const [products, categories] = await Promise.all([
      db.prepare(`SELECT p.id,p.name,p.category_id AS categoryId,p.stock_status AS stockStatus,p.original_price AS originalPrice,
        p.discount_percent AS discountPercent,p.final_price AS finalPrice,p.is_featured AS isFeatured,p.is_best_seller AS isBestSeller,
        p.is_new AS isNew,p.image,p.image_key AS imageKey,p.short_desc AS shortDesc,p.full_desc AS fullDesc
        FROM products p ORDER BY p.created_at DESC`).all(),
      db.prepare(`SELECT id,name,slug,image,image_key AS imageKey,icon,color,sort_order AS sortOrder FROM categories ORDER BY sort_order ASC, created_at ASC`).all().catch(() => ({ results: [] }))
    ]);

    let detailRows = { results: [] };
    try { detailRows = await db.prepare(`SELECT * FROM product_details`).all(); } catch (_) {}
    const details = {};
    for (const row of detailRows?.results || []) details[row.product_id] = {
      slug: String(row.slug || ''), brand: String(row.brand || ''), weight: String(row.weight || ''), volume: String(row.volume || ''),
      flavor: String(row.flavor || ''), suitableAge: String(row.suitable_age || ''), goals: String(row.goals || ''),
      ingredients: String(row.ingredients || ''), nutritionAnalysis: String(row.nutrition_analysis || ''), country: String(row.country || ''),
      barcode: String(row.barcode || ''), expiryDate: String(row.expiry_date || ''), usageMethod: String(row.usage_method || ''),
      warranty: String(row.warranty || ''), storage: String(row.storage || ''), authenticity: String(row.authenticity || ''),
      actualStock: row.actual_stock == null ? null : Number(row.actual_stock), minStock: row.min_stock == null ? null : Number(row.min_stock),
      restockTime: String(row.restock_time || ''), moreImages: safeArray(row.more_images_json), faq: safeArray(row.faq_json),
      relatedIds: safeArray(row.related_ids_json), tags: safeArray(row.tags_json), consumable: Boolean(Number(row.consumable || 0)),
      rating: 0, reviewCount: 0
    };

    const rows = (products?.results || []).map(row => cleanRow({ ...row, details: details[row.id] || {} }));
    return json({ ok: true, products: rows, categories: categories?.results || [], settings: {}, customerStories: [] }, 200, {
      'cache-control':'no-store, max-age=0', 'cdn-cache-control':'no-store'
    });
  } catch (error) {
    console.error('FoxShop /api/products error:', error);
    return json({ ok: false, error: 'خطا در خواندن محصولات از D1' }, 500, { 'cache-control':'no-store' });
  }
}

function safeArray(value) {
  try { const parsed = JSON.parse(String(value ?? '')); return Array.isArray(parsed) ? parsed : []; } catch (_) { return []; }
}
