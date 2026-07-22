-- ============================================
-- Category Landing Pages — Complete Schema
-- Independent tables, no dependency on old ones
-- ============================================

-- 1. CATEGORIES — main categories for landing pages
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text DEFAULT '',
  slug text NOT NULL UNIQUE,
  description text DEFAULT '',
  image_url text DEFAULT '',
  icon text DEFAULT '',
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  meta_title text DEFAULT '',
  meta_description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. CATEGORY BANNERS — hero slider banners for each category
CREATE TABLE IF NOT EXISTS public.category_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  title text DEFAULT '',
  subtitle text DEFAULT '',
  button_text text DEFAULT 'استكشف الآن',
  button_link text DEFAULT '#',
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. CATEGORY SECTIONS — configurable sections inside category landing
CREATE TABLE IF NOT EXISTS public.category_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  section_type text NOT NULL DEFAULT 'products',
  title text NOT NULL,
  subtitle text DEFAULT '',
  badge text DEFAULT '',
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  display_count int DEFAULT 6,
  selection_mode text DEFAULT 'auto',
  auto_rules jsonb DEFAULT '{}',
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. CATEGORY SECTION PRODUCTS — manual product assignments
CREATE TABLE IF NOT EXISTS public.category_section_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.category_sections(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(section_id, product_id)
);

-- 5. BRANDS — independent brands
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_en text DEFAULT '',
  slug text NOT NULL UNIQUE,
  description text DEFAULT '',
  logo_url text DEFAULT '',
  cover_url text DEFAULT '',
  website text DEFAULT '',
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  meta_title text DEFAULT '',
  meta_description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. BRAND BANNERS — hero slider for brand landing
CREATE TABLE IF NOT EXISTS public.brand_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  title text DEFAULT '',
  subtitle text DEFAULT '',
  button_text text DEFAULT 'تسوق الآن',
  button_link text DEFAULT '#',
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 7. BRAND SECTIONS — sections inside brand landing
CREATE TABLE IF NOT EXISTS public.brand_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  section_type text DEFAULT 'products',
  title text NOT NULL,
  subtitle text DEFAULT '',
  badge text DEFAULT '',
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  display_count int DEFAULT 6,
  selection_mode text DEFAULT 'auto',
  auto_rules jsonb DEFAULT '{}',
  meta jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8. BRAND SECTION PRODUCTS
CREATE TABLE IF NOT EXISTS public.brand_section_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.brand_sections(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(section_id, product_id)
);

-- 9. CATEGORY-BRAND relations (which brands appear in which category)
CREATE TABLE IF NOT EXISTS public.category_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category_id, brand_id)
);

-- 10. FEATURED COLLECTIONS — for premium showcase on home page
CREATE TABLE IF NOT EXISTS public.featured_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text DEFAULT '',
  image_url text DEFAULT '',
  link_url text DEFAULT '#',
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 11. SMART CATEGORY SHOWCASE — the 4 cards on home page
CREATE TABLE IF NOT EXISTS public.smart_category_showcase (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  subtitle text DEFAULT '',
  image_url text NOT NULL,
  link_url text DEFAULT '#',
  gradient_from text DEFAULT '#000000',
  gradient_to text DEFAULT '#000000',
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 12. HOME PAGE BANNERS — promotional banners for landing pages
CREATE TABLE IF NOT EXISTS public.promotional_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text DEFAULT '',
  image_url text NOT NULL,
  link_url text DEFAULT '#',
  badge_text text DEFAULT '',
  position text DEFAULT 'inline',
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ========== INDEXES ==========
CREATE INDEX IF NOT EXISTS idx_category_banners_category ON public.category_banners(category_id);
CREATE INDEX IF NOT EXISTS idx_category_sections_category ON public.category_sections(category_id);
CREATE INDEX IF NOT EXISTS idx_category_section_products_section ON public.category_section_products(section_id);
CREATE INDEX IF NOT EXISTS idx_brand_banners_brand ON public.brand_banners(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_sections_brand ON public.brand_sections(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_section_products_section ON public.brand_section_products(section_id);
CREATE INDEX IF NOT EXISTS idx_category_brands_category ON public.category_brands(category_id);
CREATE INDEX IF NOT EXISTS idx_category_brands_brand ON public.category_brands(brand_id);
CREATE INDEX IF NOT EXISTS idx_smart_category_showcase_sort ON public.smart_category_showcase(sort_order);

-- ========== RLS: allow anon read/write ==========
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_section_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_section_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_category_showcase ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='categories' AND policyname='categories_anon_select') THEN
    CREATE POLICY "categories_anon_select" ON public.categories FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='category_banners' AND policyname='category_banners_anon_select') THEN
    CREATE POLICY "category_banners_anon_select" ON public.category_banners FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='category_sections' AND policyname='category_sections_anon_select') THEN
    CREATE POLICY "category_sections_anon_select" ON public.category_sections FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='category_section_products' AND policyname='category_section_products_anon_select') THEN
    CREATE POLICY "category_section_products_anon_select" ON public.category_section_products FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='brands' AND policyname='brands_anon_select') THEN
    CREATE POLICY "brands_anon_select" ON public.brands FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='brand_banners' AND policyname='brand_banners_anon_select') THEN
    CREATE POLICY "brand_banners_anon_select" ON public.brand_banners FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='brand_sections' AND policyname='brand_sections_anon_select') THEN
    CREATE POLICY "brand_sections_anon_select" ON public.brand_sections FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='brand_section_products' AND policyname='brand_section_products_anon_select') THEN
    CREATE POLICY "brand_section_products_anon_select" ON public.brand_section_products FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='category_brands' AND policyname='category_brands_anon_select') THEN
    CREATE POLICY "category_brands_anon_select" ON public.category_brands FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='featured_collections' AND policyname='featured_collections_anon_select') THEN
    CREATE POLICY "featured_collections_anon_select" ON public.featured_collections FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='smart_category_showcase' AND policyname='smart_category_showcase_anon_select') THEN
    CREATE POLICY "smart_category_showcase_anon_select" ON public.smart_category_showcase FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='promotional_banners' AND policyname='promotional_banners_anon_select') THEN
    CREATE POLICY "promotional_banners_anon_select" ON public.promotional_banners FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- CRUD policies for anon (admin panel)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='categories' AND policyname='categories_anon_insert') THEN
    CREATE POLICY "categories_anon_insert" ON public.categories FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='categories' AND policyname='categories_anon_update') THEN
    CREATE POLICY "categories_anon_update" ON public.categories FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='categories' AND policyname='categories_anon_delete') THEN
    CREATE POLICY "categories_anon_delete" ON public.categories FOR DELETE TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='brands' AND policyname='brands_anon_insert') THEN
    CREATE POLICY "brands_anon_insert" ON public.brands FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='brands' AND policyname='brands_anon_update') THEN
    CREATE POLICY "brands_anon_update" ON public.brands FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='brands' AND policyname='brands_anon_delete') THEN
    CREATE POLICY "brands_anon_delete" ON public.brands FOR DELETE TO anon USING (true);
  END IF;
END $$;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_category_landing_updated_at()
RETURNS trigger AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_category_landing_updated_at();

DROP TRIGGER IF EXISTS trg_category_sections_updated_at ON public.category_sections;
CREATE TRIGGER trg_category_sections_updated_at BEFORE UPDATE ON public.category_sections
  FOR EACH ROW EXECUTE FUNCTION update_category_landing_updated_at();

DROP TRIGGER IF EXISTS trg_brands_updated_at ON public.brands;
CREATE TRIGGER trg_brands_updated_at BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION update_category_landing_updated_at();

DROP TRIGGER IF EXISTS trg_brand_sections_updated_at ON public.brand_sections;
CREATE TRIGGER trg_brand_sections_updated_at BEFORE UPDATE ON public.brand_sections
  FOR EACH ROW EXECUTE FUNCTION update_category_landing_updated_at();

DROP TRIGGER IF EXISTS trg_featured_collections_updated_at ON public.featured_collections;
CREATE TRIGGER trg_featured_collections_updated_at BEFORE UPDATE ON public.featured_collections
  FOR EACH ROW EXECUTE FUNCTION update_category_landing_updated_at();
