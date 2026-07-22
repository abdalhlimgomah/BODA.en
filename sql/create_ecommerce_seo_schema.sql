-- =====================================================
-- E-commerce SEO Schema for Buda
-- =====================================================

-- 1. PRODUCT SEO DATA (per-product SEO overrides)
CREATE TABLE IF NOT EXISTS public.product_seo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL UNIQUE,
  seo_title text DEFAULT '',
  meta_description text DEFAULT '',
  focus_keyword text DEFAULT '',
  canonical_url text DEFAULT '',
  product_slug text DEFAULT '',
  image_alt_text text DEFAULT '',
  og_title text DEFAULT '',
  og_description text DEFAULT '',
  og_image text DEFAULT '',
  short_description text DEFAULT '',
  long_description text DEFAULT '',
  
  -- FAQ
  faq_data jsonb DEFAULT '[]'::jsonb,
  
  -- Related products (manual override)
  related_product_ids jsonb DEFAULT '[]'::jsonb,
  alternative_product_ids jsonb DEFAULT '[]'::jsonb,
  complementary_product_ids jsonb DEFAULT '[]'::jsonb,
  
  -- Status
  is_optimized boolean DEFAULT false,
  seo_score int DEFAULT 0,
  last_analyzed_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. BRAND SEO DATA
CREATE TABLE IF NOT EXISTS public.brand_seo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_slug text NOT NULL UNIQUE,
  brand_name text DEFAULT '',
  
  seo_title text DEFAULT '',
  meta_description text DEFAULT '',
  focus_keyword text DEFAULT '',
  
  banner_image text DEFAULT '',
  description text DEFAULT '',
  about text DEFAULT '',
  
  faq_data jsonb DEFAULT '[]'::jsonb,
  featured_product_ids jsonb DEFAULT '[]'::jsonb,
  
  is_optimized boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. CATEGORY SEO DATA
CREATE TABLE IF NOT EXISTS public.category_seo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug text NOT NULL UNIQUE,
  category_name text DEFAULT '',
  
  seo_title text DEFAULT '',
  meta_description text DEFAULT '',
  focus_keyword text DEFAULT '',
  
  banner_image text DEFAULT '',
  description text DEFAULT '',
  buying_guide text DEFAULT '',
  
  faq_data jsonb DEFAULT '[]'::jsonb,
  featured_brand_ids jsonb DEFAULT '[]'::jsonb,
  featured_product_ids jsonb DEFAULT '[]'::jsonb,
  
  is_optimized boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. SELLER PROFILES (SEO)
CREATE TABLE IF NOT EXISTS public.seller_seo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id text NOT NULL UNIQUE,
  seller_name text DEFAULT '',
  
  seo_title text DEFAULT '',
  meta_description text DEFAULT '',
  focus_keyword text DEFAULT '',
  
  logo text DEFAULT '',
  cover_image text DEFAULT '',
  about text DEFAULT '',
  
  faq_data jsonb DEFAULT '[]'::jsonb,
  featured_product_ids jsonb DEFAULT '[]'::jsonb,
  
  rating decimal(3,2) DEFAULT 0,
  total_orders int DEFAULT 0,
  total_products int DEFAULT 0,
  
  is_active boolean DEFAULT true,
  is_optimized boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. OFFERS & CAMPAIGNS
CREATE TABLE IF NOT EXISTS public.seo_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  
  offer_type text NOT NULL CHECK (offer_type IN ('sale', 'discount', 'coupon', 'campaign', 'seasonal', 'flash')),
  
  seo_title text DEFAULT '',
  meta_description text DEFAULT '',
  
  banner_image text DEFAULT '',
  description text DEFAULT '',
  content_html text DEFAULT '',
  
  discount_percent int DEFAULT 0,
  coupon_code text DEFAULT '',
  start_date timestamptz,
  end_date timestamptz,
  
  featured_product_ids jsonb DEFAULT '[]'::jsonb,
  faq_data jsonb DEFAULT '[]'::jsonb,
  
  is_active boolean DEFAULT true,
  is_noindex boolean DEFAULT false,
  view_count int DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. ENHANCED REVIEWS
CREATE TABLE IF NOT EXISTS public.seo_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  user_name text NOT NULL DEFAULT '',
  user_id uuid,
  
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text DEFAULT '',
  content text DEFAULT '',
  
  images jsonb DEFAULT '[]'::jsonb,
  video_url text DEFAULT '',
  
  purchase_date timestamptz,
  review_date timestamptz DEFAULT now(),
  
  recommend_product boolean DEFAULT true,
  like_count int DEFAULT 0,
  is_verified_purchase boolean DEFAULT false,
  is_approved boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now()
);

-- 7. INTERNAL LINKS (tracked)
CREATE TABLE IF NOT EXISTS public.seo_internal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text NOT NULL,
  target_url text NOT NULL,
  link_type text NOT NULL CHECK (link_type IN ('product', 'category', 'brand', 'seller', 'article', 'guide', 'comparison', 'landing', 'offer', 'related', 'alternative', 'complementary')),
  anchor_text text DEFAULT '',
  is_auto_generated boolean DEFAULT true,
  click_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 8. SEO AUDIT LOG
CREATE TABLE IF NOT EXISTS public.seo_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url text NOT NULL,
  page_type text NOT NULL,
  
  has_title boolean DEFAULT false,
  title_length int DEFAULT 0,
  has_description boolean DEFAULT false,
  description_length int DEFAULT 0,
  has_canonical boolean DEFAULT false,
  has_og_tags boolean DEFAULT false,
  has_twitter_tags boolean DEFAULT false,
  has_schema boolean DEFAULT false,
  has_h1 boolean DEFAULT false,
  has_image_alt boolean DEFAULT false,
  is_indexable boolean DEFAULT true,
  
  issues jsonb DEFAULT '[]'::jsonb,
  warnings jsonb DEFAULT '[]'::jsonb,
  score int DEFAULT 0,
  
  audited_at timestamptz DEFAULT now()
);

-- 9. SITEMAP TRACKING
CREATE TABLE IF NOT EXISTS public.seo_sitemap_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sitemap_type text NOT NULL UNIQUE CHECK (sitemap_type IN ('products', 'categories', 'brands', 'blog', 'guides', 'comparisons', 'images', 'videos', 'landing', 'main')),
  url text NOT NULL,
  url_count int DEFAULT 0,
  last_generated timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'generated', 'error')),
  error_message text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 10. REDIRECT RULES (enhanced)
CREATE TABLE IF NOT EXISTS public.seo_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_path text NOT NULL UNIQUE,
  target_url text NOT NULL,
  redirect_type int NOT NULL DEFAULT 301 CHECK (redirect_type IN (301, 302)),
  is_regex boolean DEFAULT false,
  is_active boolean DEFAULT true,
  click_count int DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_product_seo_product ON public.product_seo(product_id);
CREATE INDEX IF NOT EXISTS idx_brand_seo_slug ON public.brand_seo(brand_slug);
CREATE INDEX IF NOT EXISTS idx_category_seo_slug ON public.category_seo(category_slug);
CREATE INDEX IF NOT EXISTS idx_seller_seo_seller ON public.seller_seo(seller_id);
CREATE INDEX IF NOT EXISTS idx_seo_offers_slug ON public.seo_offers(slug);
CREATE INDEX IF NOT EXISTS idx_seo_offers_type ON public.seo_offers(offer_type);
CREATE INDEX IF NOT EXISTS idx_seo_reviews_product ON public.seo_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_seo_audit_url ON public.seo_audit_log(page_url);
CREATE INDEX IF NOT EXISTS idx_seo_redirects_source ON public.seo_redirects(source_path);

-- =====================
-- RLS
-- =====================
ALTER TABLE public.product_seo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_seo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_seo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_seo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_internal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_sitemap_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_redirects ENABLE ROW LEVEL SECURITY;

-- Anon read policies
CREATE POLICY "anon_read_product_seo" ON public.product_seo FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_brand_seo" ON public.brand_seo FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_category_seo" ON public.category_seo FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_seller_seo" ON public.seller_seo FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "anon_read_seo_offers" ON public.seo_offers FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "anon_read_seo_reviews" ON public.seo_reviews FOR SELECT TO anon USING (is_approved = true);

-- Admin full access
CREATE POLICY "admin_all_product_seo" ON public.product_seo FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_brand_seo" ON public.brand_seo FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_category_seo" ON public.category_seo FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_seller_seo" ON public.seller_seo FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_seo_offers" ON public.seo_offers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_seo_reviews" ON public.seo_reviews FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_seo_internal_links" ON public.seo_internal_links FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_seo_audit_log" ON public.seo_audit_log FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_seo_sitemap_status" ON public.seo_sitemap_status FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_seo_redirects" ON public.seo_redirects FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================
-- TRIGGERS
-- =====================
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['product_seo','brand_seo','category_seo','seller_seo','seo_offers','seo_redirects']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', tbl, tbl);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION update_content_updated_at()', tbl, tbl);
  END LOOP;
END $$;
