import { bad, ensureStoreSchema, getStore, json, normalizeProductPayload, requireAdmin, requireJson, cleanString } from '../../_shared.js';

export async function onRequestPut(context) {
  const admin=await requireAdmin(context);
  if(!admin) return bad('نیاز به ورود مدیر دارید.',401);

  const db=context.env.DB;
  await ensureStoreSchema(db);
  const id = cleanString(context.params.id, 100);
  if (!id) return bad('شناسه محصول نامعتبر است.');

  const input = await requireJson(context.request);
  const p = normalizeProductPayload({ ...(input || {}), id }, id);
  if (!p.name || !p.categoryId) return bad('نام محصول و دسته‌بندی الزامی است.');

  const result = await db.prepare(`UPDATE products SET
    name=?,category_id=?,stock_status=?,original_price=?,discount_percent=?,final_price=?,
    is_featured=?,is_best_seller=?,is_new=?,image=?,image_key=?,short_desc=?,full_desc=?,
    slug=?,brand=?,weight=?,flavor=?,age_range=?,goal=?,ingredients=?,nutrition_analysis=?,
    country_of_origin=?,barcode=?,expiration_date=?,usage=?,warranty=?,storage=?,authenticity=?,
    stock_quantity=?,min_stock=?,restock_time=?,rating=?,sales_count=?,extra_images=?,
    related_product_ids=?,complementary_product_ids=?,faq=?,is_consumable=?,shipping_note=?,return_policy=?,updated_at=?
    WHERE id=?`)
    .bind(
      p.name,p.categoryId,p.stockStatus,p.originalPrice,p.discountPercent,p.finalPrice,
      p.isFeatured?1:0,p.isBestSeller?1:0,p.isNew?1:0,p.image,p.imageKey,p.shortDesc,p.fullDesc,
      p.slug,p.brand,p.weight,p.flavor,p.ageRange,p.goal,p.ingredients,p.nutritionAnalysis,
      p.countryOfOrigin,p.barcode,p.expirationDate,p.usage,p.warranty,p.storage,p.authenticity,
      p.stockQuantity,p.minStock,p.restockTime,p.rating,p.salesCount,JSON.stringify(p.extraImages),
      JSON.stringify(p.relatedProductIds),JSON.stringify(p.complementaryProductIds),JSON.stringify(p.faq),
      p.isConsumable?1:0,p.shippingNote,p.returnPolicy,new Date().toISOString(),id
    ).run();

  if (!result.meta?.changes) return bad('محصول موردنظر پیدا نشد.',404);
  return json({ok:true,store:await getStore(db)});
}

export async function onRequestDelete(context) {
  const admin=await requireAdmin(context);
  if(!admin) return bad('نیاز به ورود مدیر دارید.',401);
  const id=cleanString(context.params.id,100);
  if(!id) return bad('شناسه محصول نامعتبر است.');
  await ensureStoreSchema(context.env.DB);
  await context.env.DB.prepare('DELETE FROM products WHERE id=?').bind(id).run();
  return json({ok:true,store:await getStore(context.env.DB)});
}
