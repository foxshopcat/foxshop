import { bad, ensureStoreSchema, getStore, json, requireAdmin, requireJson, normalizeProductPayload, cleanString } from '../_shared.js';

const PRODUCT_COLUMNS = `id,name,category_id,stock_status,original_price,discount_percent,final_price,
is_featured,is_best_seller,is_new,image,image_key,short_desc,full_desc,slug,brand,weight,flavor,age_range,goal,
ingredients,nutrition_analysis,country_of_origin,barcode,expiration_date,usage,warranty,storage,authenticity,
stock_quantity,min_stock,restock_time,rating,sales_count,extra_images,related_product_ids,complementary_product_ids,
faq,is_consumable,shipping_note,return_policy,created_at,updated_at`;

function productValues(p, now) {
  return [
    p.id,p.name,p.categoryId,p.stockStatus,p.originalPrice,p.discountPercent,p.finalPrice,
    p.isFeatured?1:0,p.isBestSeller?1:0,p.isNew?1:0,p.image,p.imageKey,p.shortDesc,p.fullDesc,p.slug,p.brand,p.weight,
    p.flavor,p.ageRange,p.goal,p.ingredients,p.nutritionAnalysis,p.countryOfOrigin,p.barcode,p.expirationDate,p.usage,
    p.warranty,p.storage,p.authenticity,p.stockQuantity,p.minStock,p.restockTime,p.rating,p.salesCount,
    JSON.stringify(p.extraImages),JSON.stringify(p.relatedProductIds),JSON.stringify(p.complementaryProductIds),
    JSON.stringify(p.faq),p.isConsumable?1:0,p.shippingNote,p.returnPolicy,now,now
  ];
}

export async function onRequestPost(context) {
  if(!(await requireAdmin(context))) return bad('نیاز به ورود مدیر دارید.',401);
  const b=await requireJson(context.request);
  if(!b||!Array.isArray(b.products)||!Array.isArray(b.categories)) return bad('ساختار پشتیبان نامعتبر است.');
  const db=context.env.DB;
  await ensureStoreSchema(db);
  const now=new Date().toISOString();
  const batch=[
    db.prepare('DELETE FROM products'),
    db.prepare('DELETE FROM categories'),
    db.prepare('DELETE FROM product_reviews')
  ];

  for(const c of b.categories) {
    batch.push(db.prepare(`INSERT INTO categories(id,name,slug,image,image_key,icon,color,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)`)
      .bind(cleanString(c.id,100),cleanString(c.name,150),cleanString(c.slug,160),cleanString(c.image,500000),cleanString(c.imageKey,200),cleanString(c.icon,80)||'fa-paw',cleanString(c.color,120)||'from-orange-500 to-amber-500',0,now,now));
  }

  for(const raw of b.products) {
    const p=normalizeProductPayload(raw);
    if(!p.name||!p.categoryId) continue;
    batch.push(db.prepare(`INSERT INTO products(${PRODUCT_COLUMNS}) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(...productValues(p,now)));
  }

  if(b.settings&&typeof b.settings==='object') {
    for(const [key,value] of Object.entries(b.settings)) {
      const cleanKey=cleanString(key,80);
      if(!cleanKey || /^tele.*User$/i.test(cleanKey)) continue;
      batch.push(db.prepare('INSERT INTO settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at')
        .bind(cleanKey,JSON.stringify(value),now));
    }
  }

  await db.batch(batch);
  await db.prepare("DELETE FROM settings WHERE key LIKE 'tele%User'").run();
  return json({ok:true,store:await getStore(db)});
}
