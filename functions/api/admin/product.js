import { bad, ensureStoreSchema, getStore, json, normalizeProductPayload, requireAdmin, requireJson, safeProductJsonArray, cleanString } from '../_shared.js';

function values(p, now) {
  return [
    p.id,p.name,p.categoryId,p.stockStatus,p.originalPrice,p.discountPercent,p.finalPrice,
    p.isFeatured?1:0,p.isBestSeller?1:0,p.isNew?1:0,p.image,p.imageKey,p.shortDesc,p.fullDesc,
    p.slug,p.brand,p.weight,p.flavor,p.ageRange,p.goal,p.ingredients,p.nutritionAnalysis,p.countryOfOrigin,
    p.barcode,p.expirationDate,p.usage,p.warranty,p.storage,p.authenticity,p.stockQuantity,p.minStock,
    p.restockTime,p.rating,p.salesCount,JSON.stringify(p.extraImages),JSON.stringify(p.relatedProductIds),
    JSON.stringify(p.complementaryProductIds),JSON.stringify(p.faq),p.isConsumable?1:0,p.shippingNote,p.returnPolicy,now,now
  ];
}

const INSERT_SQL = `INSERT INTO products (
  id,name,category_id,stock_status,original_price,discount_percent,final_price,
  is_featured,is_best_seller,is_new,image,image_key,short_desc,full_desc,
  slug,brand,weight,flavor,age_range,goal,ingredients,nutrition_analysis,country_of_origin,
  barcode,expiration_date,usage,warranty,storage,authenticity,stock_quantity,min_stock,
  restock_time,rating,sales_count,extra_images,related_product_ids,complementary_product_ids,faq,
  is_consumable,shipping_note,return_policy,created_at,updated_at
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

export async function onRequestPost(context) {
  const admin=await requireAdmin(context);
  if(!admin) return bad('نیاز به ورود مدیر دارید.',401);

  const db=context.env.DB;
  await ensureStoreSchema(db);
  const p = normalizeProductPayload(await requireJson(context.request));
  if (!p.name || !p.categoryId) return bad('نام محصول و دسته‌بندی الزامی است.');

  const exists = await db.prepare('SELECT 1 FROM categories WHERE id=? LIMIT 1').bind(p.categoryId).first();
  if (!exists) return bad('دسته‌بندی انتخاب‌شده وجود ندارد.', 400);

  const now=new Date().toISOString();
  try {
    await db.prepare(INSERT_SQL).bind(...values(p,now)).run();
  } catch (error) {
    console.error('product create error', error);
    return bad('ذخیره محصول انجام نشد. شناسه/Slug محصول باید یکتا باشد.',409);
  }
  return json({ok:true,store:await getStore(db)});
}
