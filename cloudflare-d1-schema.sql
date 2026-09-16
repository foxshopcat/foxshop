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
-- Username: admin
-- Initial password: admin123
-- Seed hash uses PBKDF2-HMAC-SHA256 with 100,000 iterations (Workers production ceiling).
-- IMPORTANT: change the password immediately from the management panel.
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
('telegramUser', '"foxshop_cat"', datetime('now')),
('instagramUrl', '"https://www.instagram.com/foxshop.cat?stkn=MTRud2VncmpudDZpeg=="', datetime('now')),
('aboutText', '"پت‌شاپ FoxShop با هدف ارائه مرغوب‌ترین و اصیل‌ترین خوراک و ملزومات گربه‌ها ایجاد شده است. ما اهمیت عشق و مراقبتی که نسبت به گربه‌تان دارید را درک می‌کنیم؛ از این رو تمامی محصولات ما دست‌چین شده از معتبرترین برندهای جهانی با تضمین کیفیت، اصالت و انقضای معتبر می‌باشند."', datetime('now'));

INSERT OR IGNORE INTO categories(id,name,slug,image,image_key,icon,color,sort_order,created_at,updated_at) VALUES ('cat_dry_food','غذای خشک گربه','Dry Cat Food','https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=400&q=80&fm=webp','','fa-bowl-food','from-orange-500 to-amber-500',0,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO categories(id,name,slug,image,image_key,icon,color,sort_order,created_at,updated_at) VALUES ('cat_wet_food','کنسرو و پوچ لذیذ','Wet Food & Pouches','https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80&fm=webp','','fa-fish','from-rose-500 to-pink-500',0,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO categories(id,name,slug,image,image_key,icon,color,sort_order,created_at,updated_at) VALUES ('cat_treats','تشویقی و بستنی گربه','Cat Treats & Pastes','https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&w=400&q=80&fm=webp','','fa-cookie-bite','from-amber-400 to-orange-500',0,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO categories(id,name,slug,image,image_key,icon,color,sort_order,created_at,updated_at) VALUES ('cat_supplements','مکمل، خمیر مالت و ویتامین','Supplements & Care','https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=400&q=80&fm=webp','','fa-shield-heart','from-emerald-500 to-teal-600',0,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO categories(id,name,slug,image,image_key,icon,color,sort_order,created_at,updated_at) VALUES ('cat_litter','خاک بستر و ملزومات بهداشتی','Cat Litter & Hygiene','https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=400&q=80&fm=webp','','fa-box','from-blue-500 to-indigo-600',0,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO categories(id,name,slug,image,image_key,icon,color,sort_order,created_at,updated_at) VALUES ('cat_toys','اسباب‌بازی و لوازم خواب','Toys & Accessories','https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=400&q=80&fm=webp','','fa-paw','from-purple-500 to-indigo-500',0,datetime('now'),datetime('now'));
INSERT OR IGNORE INTO products(id,name,category_id,stock_status,original_price,discount_percent,final_price,is_featured,is_best_seller,is_new,image,image_key,short_desc,full_desc,created_at,updated_at) VALUES ('fox_rc_fit32','غذای خشک گربه رویال کنین مدل Fit 32 وزن ۲ کیلوگرم','cat_dry_food','in_stock',1650000,12,1452000,1,1,0,'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=600&q=80','','فرمول اختصاصی برای گربه‌های بالغ ۱ تا ۷ سال با فعالیت بدنی متوسط','غذای خشک رویال کنین مدل فیت ۳۲ یکی از پرطرفدارترین غذاها در جهان است. حاوی فیبرهای طبیعی برای دفع هربال (گلوله مویی)، مواد مغذی متوازن برای حفظ وزن ایده‌آل و تقویت دستگاه گوارش گربه.',datetime('now'),datetime('now'));
INSERT OR IGNORE INTO products(id,name,category_id,stock_status,original_price,discount_percent,final_price,is_featured,is_best_seller,is_new,image,image_key,short_desc,full_desc,created_at,updated_at) VALUES ('fox_rc_kitten','غذای خشک بچه گربه رویال کنین مدل Kitten وزن ۲ کیلوگرم','cat_dry_food','in_stock',1780000,10,1602000,1,1,1,'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=600&q=80','','مناسب برای بچه گربه‌های ۴ تا ۱۲ ماهه جهت رشد استخوان و سیستم ایمنی','غنی از آنتی‌اکسیدان‌ها و ویتامین E برای رشد سلامت بچه گربه، هضم بسیار راحت به کمک پروتئین‌های LIP با قابلیت جذب بالا و تقویت کننده ایمنی طبیعی بدن.',datetime('now'),datetime('now'));
INSERT OR IGNORE INTO products(id,name,category_id,stock_status,original_price,discount_percent,final_price,is_featured,is_best_seller,is_new,image,image_key,short_desc,full_desc,created_at,updated_at) VALUES ('fox_rc_urinary','غذای درمانی مجاری ادراری رویال کنین Urinary S/O وزن ۱.۵ کیلوگرم','cat_dry_food','in_stock',1950000,8,1794000,1,0,0,'https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=600&q=80','','درمان و جلوگیری از تشکیل سنگ‌های استروویت و اگزالات کلسیم','فرمولاسیون پزشکی و دامپزشکی برای حل کردن سنگ‌های مثانه و بهبود سلامت سیستم ادراری در گربه‌های دارای بیماری FLUTD.',datetime('now'),datetime('now'));
INSERT OR IGNORE INTO products(id,name,category_id,stock_status,original_price,discount_percent,final_price,is_featured,is_best_seller,is_new,image,image_key,short_desc,full_desc,created_at,updated_at) VALUES ('fox_gimcat_malt','خمیر مالت اکسترا جیم کت (GimCat) ضد گلوله مو وزن ۱۰۰ گرم','cat_supplements','in_stock',580000,15,493000,1,1,0,'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=600&q=80','','جلوگیری موثر از تجمع مو در معده گربه با مالت طبیعی، روغن و فیبر بالا','خمیر مالت اکسترا جیم کت آلمان به دفع طبیعی موهای بلعیده شده کمک کرده و مانع از استفراغ و یبوست گربه می‌شود. فاقد شکر افزوده و بسیار خوش‌خوراک.',datetime('now'),datetime('now'));
INSERT OR IGNORE INTO products(id,name,category_id,stock_status,original_price,discount_percent,final_price,is_featured,is_best_seller,is_new,image,image_key,short_desc,full_desc,created_at,updated_at) VALUES ('fox_schesir_tuna','کنسرو فیله تن ماهی و میگو طبیعی شسیر (Schesir) وزن ۸۵ گرم','cat_wet_food','in_stock',195000,0,195000,0,1,1,'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80','','۱۰۰٪ فیله ماهی طبیعی، بدون رنگ و مواد نگهدارنده مصنوعی','غذای تر پریمیوم تولید ایتالیا با گوشت تازه ماهی تن صید شده پایدار و میگوی تازه در ژله سبک. آبرسانی عالی به بدن گربه‌ها.',datetime('now'),datetime('now'));
INSERT OR IGNORE INTO products(id,name,category_id,stock_status,original_price,discount_percent,final_price,is_featured,is_best_seller,is_new,image,image_key,short_desc,full_desc,created_at,updated_at) VALUES ('fox_wanpy_creamy','پک تشویقی بستنی مایع وانپی (Wanpy) طعم مرغ و خرچنگ ۵ عددی','cat_treats','in_stock',220000,14,189000,1,1,0,'https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&w=600&q=80','','تشویقی مایع فوق‌العاده لذیذ، غنی شده با تائورین و ویتامین‌ها','محبوب‌ترین میان‌وعده گربه‌ها برای دادن قرص، تقویت اشتها، آموزش و ایجاد رابطه عاطفی صمیمی با گربه.',datetime('now'),datetime('now'));
INSERT OR IGNORE INTO products(id,name,category_id,stock_status,original_price,discount_percent,final_price,is_featured,is_best_seller,is_new,image,image_key,short_desc,full_desc,created_at,updated_at) VALUES ('fox_bentonite_litter','خاک بستر کربن‌دار سوپر کلامپینگ ون کت (Van Cat) وزن ۱۰ کیلوگرم','cat_litter','in_stock',620000,10,558000,0,1,0,'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=600&q=80','','جذب بوی فوق‌العاده با کربن فعال، ۹۹.۵٪ بدون گرد و غبار','بنتونیت طبیعی سدیمی با قدرت کلامپینگ (گلوله‌شدن) فوری و محکم، آنتی‌باکتریال و بهداشتی برای حفاظت از دست و پای ظریف گربه.',datetime('now'),datetime('now'));
INSERT OR IGNORE INTO products(id,name,category_id,stock_status,original_price,discount_percent,final_price,is_featured,is_best_seller,is_new,image,image_key,short_desc,full_desc,created_at,updated_at) VALUES ('fox_laser_toy','اسباب‌بازی لیزر اتوماتیک ۳۶۰ درجه گربه مدل Smart Paw','cat_toys','low_stock',790000,20,632000,1,0,1,'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=600&q=80','','دارای تایمر خودکار و ۳ حالت سرعت مختلف برای تحرک و سرگرمی گربه','حفظ شادابی و جلوگیری از اضافه وزن و افسردگی گربه‌های خانگی با الگوهای نوری تصادفی هوشمند. قابل شارژ از طریق کابل Type-C.',datetime('now'),datetime('now'));