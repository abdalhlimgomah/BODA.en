-- ============================================
-- Buda Categories System — Migration Script
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add keywords column to existing categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';

-- 2. Create category_branches table if not exists
CREATE TABLE IF NOT EXISTS category_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  branch_name TEXT NOT NULL,
  branch_image TEXT DEFAULT '',
  branch_keywords TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add unique constraint on categories.slug if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_slug_key'
  ) THEN
    ALTER TABLE categories ADD CONSTRAINT categories_slug_key UNIQUE (slug);
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if duplicates exist
END $$;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_category_branches_category ON category_branches(category_id);
CREATE INDEX IF NOT EXISTS idx_category_branches_sort ON category_branches(sort_order);
CREATE INDEX IF NOT EXISTS idx_category_branches_active ON category_branches(is_active);

-- 5. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_category_branches_updated_at ON category_branches;
CREATE TRIGGER update_category_branches_updated_at
  BEFORE UPDATE ON category_branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_branches ENABLE ROW LEVEL SECURITY;

-- 7. Public read access
DROP POLICY IF EXISTS "Public read access for categories" ON categories;
CREATE POLICY "Public read access for categories"
  ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access for category_branches" ON category_branches;
CREATE POLICY "Public read access for category_branches"
  ON category_branches FOR SELECT USING (true);

-- 8. Admin full access (authenticated users)
DROP POLICY IF EXISTS "Admin full access for categories" ON categories;
CREATE POLICY "Admin full access for categories"
  ON categories FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin full access for category_branches" ON category_branches;
CREATE POLICY "Admin full access for category_branches"
  ON category_branches FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 9. Insert sample data (skip if slug already exists)
INSERT INTO categories (name, slug, image_url, keywords, description, sort_order, is_active)
SELECT * FROM (VALUES
('إلكترونيات', 'electronics', 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=400', ARRAY['هاتف','موبايل','سامسونج','آيفون','شاومي','هواوي','تابلت','سماعات','لاب توب'], 'أحدث الأجهزة الإلكترونية', 1, true),
('ملابس', 'clothing', 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400', ARRAY['ملابس','موضة','تيشيرت','بنطلون','جاكيت','فساتين','أزياء'], 'أحدث صيحات الموضة', 2, true),
('الصحة والجمال', 'beauty', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400', ARRAY['عطور','مكياج','كريم','شعر','بشرة','عناية','جمال'], 'منتجات العناية والجمال', 3, true),
('المنزل', 'home', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400', ARRAY['أثاث','ديكور','مطبخ','منزل','مفروشات','ستائر','سجاد'], 'كل ما يهم منزلك', 4, true),
('رياضة', 'sports', 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', ARRAY['رياضة','جيم','لياقة','أجهزة رياضية','مشي','جري','weights'], 'مستلزمات الرياضة واللياقة', 5, true),
('ألعاب', 'toys', 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400', ARRAY['ألعاب','أطفال','دمى','سيارات','ليجو','ترفيه'], 'ألعاب للأطفال والكبار', 6, true),
('كتب', 'books', 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400', ARRAY['كتب','روايات','قصص','تعليم','ثقافة','مكتبة'], 'عالم الكتب والقراءة', 7, true),
('ساعات', 'watches', 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400', ARRAY['ساعات','ساعة','سويسري','سوار','كوارتز','أكسسوارات'], 'أفخر الساعات والمجوهرات', 8, true),
('حقائب', 'bags', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400', ARRAY['حقائب','شنط','ظهر','يد','سفر','ماركات'], 'أجمل الحقائب والشنط', 9, true)
) AS v(name, slug, image_url, keywords, description, sort_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.slug = v.slug);