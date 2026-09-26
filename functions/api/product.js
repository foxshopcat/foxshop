import { json } from './_shared.js';

export async function onRequestGet(context) {
  const id = String(new URL(context.request.url).searchParams.get('id') || '').trim().slice(0, 120);
  if (!id) return json({ ok:false, error:'شناسه محصول نامعتبر است.' }, 400, { 'cache-control':'no-store' });
  const db = context.env.DB;
  if (!db) return json({ ok:false, error:'اتصال Worker به D1 برقرار نیست.' }, 500, { 'cache-control':'no-store' });

  try {
    const row = await db.prepare(`SELECT id,name,category_id AS categoryId,stock_status AS stockStatus,original_price AS originalPrice,
      discount_percent AS discountPercent,final_price AS finalPrice,is_featured AS isFeatured,is_best_seller AS isBestSeller,is_new AS isNew,
      image,image_key AS imageKey,short_desc AS shortDesc,full_desc AS fullDesc FROM products WHERE id=? LIMIT 1`).bind(id).first();
    if (!row) return json({ ok:false, error:'محصول پیدا نشد.' }, 404, { 'cache-control':'no-store' });

    let details = {};
    try {
      const d = await db.prepare('SELECT * FROM product_details WHERE product_id=? LIMIT 1').bind(id).first();
      if (d) details = {
        slug:String(d.slug||''), brand:String(d.brand||''), weight:String(d.weight||''), volume:String(d.volume||''), flavor:String(d.flavor||''),
        suitableAge:String(d.suitable_age||''), goals:String(d.goals||''), ingredients:String(d.ingredients||''), nutritionAnalysis:String(d.nutrition_analysis||''),
        country:String(d.country||''), barcode:String(d.barcode||''), expiryDate:String(d.expiry_date||''), usageMethod:String(d.usage_method||''),
        warranty:String(d.warranty||''), storage:String(d.storage||''), authenticity:String(d.authenticity||''),
        actualStock:d.actual_stock==null?null:Number(d.actual_stock), minStock:d.min_stock==null?null:Number(d.min_stock), restockTime:String(d.restock_time||''),
        moreImages:safeArray(d.more_images_json), faq:safeArray(d.faq_json), relatedIds:safeArray(d.related_ids_json), tags:safeArray(d.tags_json), consumable:Boolean(Number(d.consumable||0)), rating:0, reviewCount:0
      };
    } catch (_) {}

    let category = null;
    try { category = await db.prepare('SELECT id,name,slug,image,image_key AS imageKey,icon,color,sort_order AS sortOrder FROM categories WHERE id=? LIMIT 1').bind(String(row.categoryId||'')).first(); } catch (_) {}
    const product = {
      id:String(row.id), name:String(row.name||''), categoryId:String(row.categoryId||''), stockStatus:String(row.stockStatus||'in_stock'),
      originalPrice:Number(row.originalPrice)||0, discountPercent:Number(row.discountPercent)||0, finalPrice:Number(row.finalPrice)||0,
      isFeatured:Boolean(row.isFeatured), isBestSeller:Boolean(row.isBestSeller), isNew:Boolean(row.isNew), image:String(row.image||''), imageKey:String(row.imageKey||''),
      shortDesc:String(row.shortDesc||''), fullDesc:String(row.fullDesc||''), details
    };
    return json({ ok:true, product, category: category || null }, 200, { 'cache-control':'no-store', 'cdn-cache-control':'no-store' });
  } catch (error) {
    console.error('FoxShop /api/product error:', error);
    return json({ ok:false, error:'خطا در خواندن محصول از D1' }, 500, { 'cache-control':'no-store' });
  }
}

function safeArray(value) {
  try { const parsed = JSON.parse(String(value ?? '')); return Array.isArray(parsed) ? parsed : []; } catch (_) { return []; }
}
