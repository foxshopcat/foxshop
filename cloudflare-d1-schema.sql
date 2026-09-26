PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_admin ON sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  key TEXT PRIMARY KEY,
  fail_count INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  image TEXT NOT NULL DEFAULT '',
  image_key TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'fa-paw',
  color TEXT NOT NULL DEFAULT 'from-orange-500 to-amber-500',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT NOT NULL,
  stock_status TEXT NOT NULL DEFAULT 'in_stock',
  original_price REAL NOT NULL DEFAULT 0,
  discount_percent REAL NOT NULL DEFAULT 0,
  final_price REAL NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_best_seller INTEGER NOT NULL DEFAULT 0,
  is_new INTEGER NOT NULL DEFAULT 0,
  image TEXT NOT NULL DEFAULT '',
  image_key TEXT NOT NULL DEFAULT '',
  short_desc TEXT NOT NULL DEFAULT '',
  full_desc TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  data BLOB NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_assets_created ON media_assets(created_at);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Initial admin account.
-- IMPORTANT: change the initial password immediately from the management panel.
-- Seed hash uses PBKDF2-HMAC-SHA256 with 100,000 iterations.
INSERT OR IGNORE INTO admins (id, username, password_hash, password_salt, created_at, updated_at)
VALUES (
  1,
  'admin',
  'a8884f6291a2fa0d1c8ed3a8b0a13e0d0a94b65e7fca77194d66b1b5cd853688',
  'f31a69ce8aec54ac4f6663adb05ead3e',
  datetime('now'), datetime('now')
);

-- Default store settings. The UI may overwrite these later.
INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES
('shopName', '"FoxShop"', datetime('now')),
('phone', '"+98 993 419 1774"', datetime('now')),
('instagramUrl', '"https://www.instagram.com/foxshop.cat?stkn=MTRud2VncmpudDZpeg=="', datetime('now')),
('storeLocation', '"تبریز، ایران"', datetime('now')) ,
('freeShippingThreshold', '2500000', datetime('now')),
('shippingCost', '120000', datetime('now')),
('shippingDispatchTime', '"۱ تا ۲ روز کاری"', datetime('now')),
('returnPolicy', '"در صورت ایراد یا مغایرت کالا، مطابق سیاست مرجوعی فروشگاه پیگیری می‌شود."', datetime('now')),
('authenticityPolicy', '"ارائه فاکتور و امکان ارائه اطلاعات اصالت و تاریخ انقضا بر اساس کالای موجود."', datetime('now')),
('aboutText', '"پت‌شاپ FoxShop با هدف ارائه مرغوب‌ترین و اصیل‌ترین خوراک و ملزومات گربه‌ها ایجاد شده است. ما اهمیت عشق و مراقبتی که نسبت به گربه‌تان دارید را درک می‌کنیم؛ از این رو تمامی محصولات ما دست‌چین شده از معتبرترین برندهای جهانی با تضمین کیفیت، اصالت و انقضای معتبر می‌باشند."', datetime('now'));

INSERT OR IGNORE INTO categories(id,name,slug,image,image_key,icon,color,sort_order,created_at,updated_at) VALUES ('cat_dry_food','غذای خشک گربه','Dry Cat Food','https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=400&q=80&fm=webp','','fa-bowl-food','from-orange-500 to-amber-500',0,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO categories(id,name,slug,image,image_key,icon,color,sort_order,created_at,updated_at) VALUES ('cat_wet_food','کنسرو و پوچ لذیذ','Wet Food & Pouches','https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80&fm=webp','','fa-fish','from-rose-500 to-pink-500',0,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO categories(id,name,slug,image,image_key,icon,color,sort_order,created_at,updated_at) VALUES ('cat_treats','تشویقی و بستنی گربه','Cat Treats & Pastes','https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&w=400&q=80&fm=webp','','fa-cookie-bite','from-amber-400 to-orange-500',0,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO categories(id,name,slug,image,image_key,icon,color,sort_order,created_at,updated_at) VALUES ('cat_supplements','مکمل، خمیر مالت و ویتامین','Supplements & Care','https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=400&q=80&fm=webp','','fa-shield-heart','from-emerald-500 to-teal-600',0,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO categories(id,name,slug,image,image_key,icon,color,sort_order,created_at,updated_at) VALUES ('cat_litter','خاک بستر و ملزومات بهداشتی','Cat Litter & Hygiene','https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=400&q=80&fm=webp','','fa-box','from-blue-500 to-indigo-600',0,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO categories(id,name,slug,image,image_key,icon,color,sort_order,created_at,updated_at) VALUES ('cat_toys','اسباب‌بازی و لوازم خواب','Toys & Accessories','https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=400&q=80&fm=webp','','fa-paw','from-purple-500 to-indigo-500',0,datetime('now'),datetime('now'));

CREATE TABLE IF NOT EXISTS product_details (
  product_id TEXT PRIMARY KEY,
  slug TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL DEFAULT '',
  weight TEXT NOT NULL DEFAULT '',
  volume TEXT NOT NULL DEFAULT '',
  flavor TEXT NOT NULL DEFAULT '',
  suitable_age TEXT NOT NULL DEFAULT '',
  goals TEXT NOT NULL DEFAULT '',
  ingredients TEXT NOT NULL DEFAULT '',
  nutrition_analysis TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  barcode TEXT NOT NULL DEFAULT '',
  expiry_date TEXT NOT NULL DEFAULT '',
  usage_method TEXT NOT NULL DEFAULT '',
  warranty TEXT NOT NULL DEFAULT '',
  storage TEXT NOT NULL DEFAULT '',
  authenticity TEXT NOT NULL DEFAULT '',
  actual_stock INTEGER,
  min_stock INTEGER,
  restock_time TEXT NOT NULL DEFAULT '',
  rating REAL NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  sales_count INTEGER NOT NULL DEFAULT 0,
  more_images_json TEXT NOT NULL DEFAULT '[]',
  faq_json TEXT NOT NULL DEFAULT '[]',
  related_ids_json TEXT NOT NULL DEFAULT '[]',
  tags_json TEXT NOT NULL DEFAULT '[]',
  consumable INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_product_details_brand ON product_details(brand);

CREATE TABLE IF NOT EXISTS foxshop_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_stories (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL DEFAULT '',
  cat_name TEXT NOT NULL DEFAULT '',
  photo_url TEXT NOT NULL DEFAULT '',
  quote TEXT NOT NULL DEFAULT '',
  approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

