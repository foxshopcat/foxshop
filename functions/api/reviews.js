import { bad, ensureStoreSchema, json, requireJson, cleanString, randomHex, sha256Hex } from './_shared.js';

function validPhotoUrl(value) {
  const url = cleanString(value, 1000);
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? url : '';
  } catch {
    return '';
  }
}

async function ensureReviewRateTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS review_rate_limits (
    key TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL
  )`).run();
}

export async function onRequestGet(context) {
  const db=context.env.DB;
  await ensureStoreSchema(db);
  const productId=cleanString(new URL(context.request.url).searchParams.get('productId'),100);
  if(!productId) return bad('شناسه محصول الزامی است.');
  const rows=await db.prepare(`SELECT id,product_id AS productId,customer_name AS customerName,body,rating,photo_url AS photoUrl,created_at AS createdAt
    FROM product_reviews WHERE product_id=? AND approved=1 ORDER BY created_at DESC LIMIT 50`).bind(productId).all();
  return json({ok:true,reviews:rows?.results||[]});
}

export async function onRequestPost(context) {
  const db=context.env.DB;
  await ensureStoreSchema(db);
  await ensureReviewRateTable(db);

  const origin=context.request.headers.get('Origin');
  const requestUrl=new URL(context.request.url);
  if (origin) {
    try { if (new URL(origin).origin !== requestUrl.origin) return bad('مبدأ درخواست نامعتبر است.',403); }
    catch { return bad('مبدأ درخواست نامعتبر است.',403); }
  }

  const body=await requireJson(context.request);
  const productId=cleanString(body?.productId,100);
  const customerName=cleanString(body?.customerName,80);
  const reviewBody=cleanString(body?.body,2000);
  const rating=Math.min(5,Math.max(1,Math.floor(Number(body?.rating)||0)));
  const photoUrl=validPhotoUrl(body?.photoUrl);
  if(!productId||!customerName||!reviewBody||!rating) return bad('نام، امتیاز و متن نظر الزامی است.');
  if(reviewBody.length<8) return bad('متن نظر کوتاه است.');

  const product=await db.prepare('SELECT id FROM products WHERE id=? LIMIT 1').bind(productId).first();
  if(!product) return bad('محصول پیدا نشد.',404);

  const ip=context.request.headers.get('CF-Connecting-IP')||'unknown';
  const key=await sha256Hex(`${requestUrl.origin}|${ip}`);
  const now=Date.now();
  const previous=await db.prepare('SELECT created_at FROM review_rate_limits WHERE key=?').bind(key).first();
  if(previous && now-Number(previous.created_at)<60*60*1000) {
    return bad('برای ثبت نظر جدید لطفاً کمی بعد دوباره تلاش کنید.',429);
  }

  const id=await randomHex(16);
  await db.prepare(`INSERT INTO product_reviews(id,product_id,customer_name,body,rating,photo_url,approved,created_at)
    VALUES(?,?,?,?,?,?,0,?)`).bind(id,productId,customerName,reviewBody,rating,photoUrl,new Date().toISOString()).run();
  await db.prepare(`INSERT INTO review_rate_limits(key,created_at) VALUES(?,?)
    ON CONFLICT(key) DO UPDATE SET created_at=excluded.created_at`).bind(key,now).run();

  return json({ok:true,pending:true,message:'نظر شما ثبت شد و پس از بررسی نمایش داده می‌شود.'},201);
}
