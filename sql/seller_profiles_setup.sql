-- =============================================================
-- Seller Profiles & Product Sellers — Schema Setup
-- Run once in Supabase SQL Editor.
-- Then run: SELECT * FROM generate_seller_profiles(2500);
-- =============================================================

-- 1. seller_profiles table
CREATE TABLE IF NOT EXISTS seller_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_name TEXT NOT NULL,
  years_with_buda INTEGER DEFAULT 1,
  rating NUMERIC(3,1) DEFAULT 4.5,
  satisfaction INTEGER DEFAULT 95,
  sales_count INTEGER DEFAULT 500,
  shipping_speed TEXT DEFAULT 'شحن سريع',
  is_official BOOLEAN DEFAULT false,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. product_sellers table (assignments)
CREATE TABLE IF NOT EXISTS product_sellers (
  product_id TEXT PRIMARY KEY,
  seller_name TEXT NOT NULL,
  years_with_buda INTEGER DEFAULT 0,
  rating NUMERIC(3,1) DEFAULT 0,
  satisfaction INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  shipping_speed TEXT DEFAULT '',
  is_official BOOLEAN DEFAULT false,
  profile_id UUID REFERENCES seller_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_product_sellers_profile_id ON product_sellers(profile_id);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_used_count ON seller_profiles(used_count);

-- 4. RLS (allow anonymous read/write since anon key is for public frontend)
ALTER TABLE seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon can read seller_profiles" ON seller_profiles;
CREATE POLICY "anon can read seller_profiles" ON seller_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon can update seller_profiles" ON seller_profiles;
CREATE POLICY "anon can update seller_profiles" ON seller_profiles
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon can read product_sellers" ON product_sellers;
CREATE POLICY "anon can read product_sellers" ON product_sellers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "anon can insert product_sellers" ON product_sellers;
CREATE POLICY "anon can insert product_sellers" ON product_sellers
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "anon can update product_sellers" ON product_sellers;
CREATE POLICY "anon can update product_sellers" ON product_sellers
  FOR UPDATE USING (true) WITH CHECK (true);

-- 5. Function to generate initial seller profiles
CREATE OR REPLACE FUNCTION generate_seller_profiles(p_count INTEGER DEFAULT 100)
RETURNS INTEGER AS $$
DECLARE
  names TEXT[] := ARRAY[
    'نجوم','سنسن','بصمة','إبداع','أصالة','تميز','فخامة','أناقة',
    'رقي','درة','لؤلؤ','مرجان','ياقوت','زمرد','فيروز','سحر',
    'أمل','ورد','نرجس','ياسمين','فل','ريحان','ندى','شهد',
    'عنبر','مسك','عطر','بهاء','ضياء','نور','قمر',
    'بدر','هلال','شمس','نجم','كوكب','أثير','سمو','مجد',
    'علياء','سندس','إستبرق','حرير','ديباج','أطلس','مخمل',
    'نخيل','بستان','واحة','زهرة','ربيع','كوثر','سلسبيل',
    'نماء','ازدهار','رفعة','علو','سؤدد','مهابة','وقار',
    'حكمة','دراية','خبرة','إتقان','براعة','مهارة',
    'نبع','مورد','غدير','فيض','مدد','عطاء','سنابل'
  ];
  shipping_options TEXT[] := ARRAY['شحن سريع','شحن فوري','شحن خلال 24 ساعة','توصيل سريع','شحن ممتاز','توصيل فوري'];
  inserted_count INTEGER := 0;
  i INTEGER;
  r NUMERIC;
BEGIN
  FOR i IN 1..p_count LOOP
    r := random();
    INSERT INTO seller_profiles (
      seller_name,
      years_with_buda,
      rating,
      satisfaction,
      sales_count,
      shipping_speed,
      is_official,
      used_count
    ) VALUES (
      names[1 + floor(random() * array_length(names, 1))::int],
      1 + floor(random() * 10)::int,
      round((38 + random() * 12)::numeric, 1) / 10,
      85 + floor(random() * 15)::int,
      round((50 + random() * 200)::numeric / 10) * 10 * (1 + 0.25 * (1 + floor(random() * 10)::int)),
      shipping_options[1 + floor(random() * array_length(shipping_options, 1))::int],
      r > 0.65,
      0
    );
    inserted_count := inserted_count + 1;
  END LOOP;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;
