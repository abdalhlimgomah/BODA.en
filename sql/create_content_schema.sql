-- =====================================================
-- Content & Knowledge System Schema for Buda
-- =====================================================

-- 1. BLOG CATEGORIES
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text DEFAULT '',
  meta_title text DEFAULT '',
  meta_description text DEFAULT '',
  image text DEFAULT '',
  color text DEFAULT '#1a2530',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. BLOG TAGS
CREATE TABLE IF NOT EXISTS public.blog_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. BLOG AUTHORS
CREATE TABLE IF NOT EXISTS public.blog_authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  email text DEFAULT '',
  bio text DEFAULT '',
  avatar text DEFAULT '',
  facebook_url text DEFAULT '',
  twitter_url text DEFAULT '',
  linkedin_url text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. BLOG POSTS (main table)
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text DEFAULT '',
  content text DEFAULT '',
  content_html text DEFAULT '',
  
  -- SEO
  meta_title text DEFAULT '',
  meta_description text DEFAULT '',
  focus_keyword text DEFAULT '',
  
  -- Media
  featured_image text DEFAULT '',
  gallery jsonb DEFAULT '[]'::jsonb,
  video_url text DEFAULT '',
  
  -- Settings
  category_id uuid REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  author_id uuid REFERENCES public.blog_authors(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  
  -- Stats
  reading_time int DEFAULT 0,
  view_count int DEFAULT 0,
  like_count int DEFAULT 0,
  share_count int DEFAULT 0,
  
  -- Relations
  related_post_ids jsonb DEFAULT '[]'::jsonb,
  related_product_ids jsonb DEFAULT '[]'::jsonb,
  related_brand_ids jsonb DEFAULT '[]'::jsonb,
  related_section_ids jsonb DEFAULT '[]'::jsonb,
  
  -- Table of Contents
  has_toc boolean DEFAULT true,
  toc_data jsonb DEFAULT '[]'::jsonb,
  
  -- FAQ
  faq_data jsonb DEFAULT '[]'::jsonb,
  
  -- Dates
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. BLOG POST TAGS (many-to-many)
CREATE TABLE IF NOT EXISTS public.blog_post_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  UNIQUE(post_id, tag_id)
);

-- 6. BLOG MEDIA (uploaded assets)
CREATE TABLE IF NOT EXISTS public.blog_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  filename text NOT NULL,
  url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video', 'document', 'other')),
  alt_text text DEFAULT '',
  width int DEFAULT 0,
  height int DEFAULT 0,
  file_size int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 7. BLOG RELATED PRODUCTS (explicit linking)
CREATE TABLE IF NOT EXISTS public.blog_related_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  anchor_text text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, product_id)
);

-- 8. CONTENT COMMENTS
CREATE TABLE IF NOT EXISTS public.blog_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id uuid,
  author_name text NOT NULL,
  author_email text DEFAULT '',
  content text NOT NULL,
  is_approved boolean DEFAULT false,
  parent_id uuid REFERENCES public.blog_comments(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- 9. LANDING PAGES (dynamic)
CREATE TABLE IF NOT EXISTS public.landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  page_type text NOT NULL CHECK (page_type IN ('section', 'brand', 'seller', 'company', 'campaign', 'season', 'event', 'custom')),
  reference_id text DEFAULT '',
  subtitle text DEFAULT '',
  description text DEFAULT '',
  content_html text DEFAULT '',
  
  -- Hero
  banner_image text DEFAULT '',
  banner_video text DEFAULT '',
  
  -- SEO
  meta_title text DEFAULT '',
  meta_description text DEFAULT '',
  
  -- Features
  show_faq boolean DEFAULT true,
  show_featured_products boolean DEFAULT true,
  show_new_products boolean DEFAULT true,
  show_best_sellers boolean DEFAULT true,
  show_related_articles boolean DEFAULT true,
  show_reviews boolean DEFAULT false,
  
  -- Products (manual selection)
  featured_product_ids jsonb DEFAULT '[]'::jsonb,
  
  -- Settings
  faq_data jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  is_noindex boolean DEFAULT false,
  
  -- Stats
  view_count int DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 10. COMPARISON PAGES
CREATE TABLE IF NOT EXISTS public.comparison_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  subtitle text DEFAULT '',
  content text DEFAULT '',
  content_html text DEFAULT '',
  
  -- Type
  comparison_type text NOT NULL CHECK (comparison_type IN ('product_vs_product', 'brand_vs_brand', 'category_vs_category')),
  
  -- References
  entity_a_id text DEFAULT '',
  entity_a_type text DEFAULT '',
  entity_a_name text DEFAULT '',
  entity_b_id text DEFAULT '',
  entity_b_type text DEFAULT '',
  entity_b_name text DEFAULT '',
  
  -- Comparison data
  comparison_data jsonb DEFAULT '[]'::jsonb,
  features_table jsonb DEFAULT '[]'::jsonb,
  
  -- Winner
  winner_id text DEFAULT '',
  winner_summary text DEFAULT '',
  
  -- SEO
  meta_title text DEFAULT '',
  meta_description text DEFAULT '',
  image text DEFAULT '',
  
  -- Status
  is_active boolean DEFAULT true,
  is_noindex boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 11. BUYING GUIDES
CREATE TABLE IF NOT EXISTS public.buying_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  subtitle text DEFAULT '',
  content text DEFAULT '',
  content_html text DEFAULT '',
  
  -- Guide type
  guide_type text NOT NULL DEFAULT 'buying' CHECK (guide_type IN ('buying', 'how_to', 'top_picks', 'review', 'tutorial', 'comparison')),
  
  -- Category
  category_id text DEFAULT '',
  category_name text DEFAULT '',
  
  -- SEO
  meta_title text DEFAULT '',
  meta_description text DEFAULT '',
  image text DEFAULT '',
  
  -- Products
  recommended_product_ids jsonb DEFAULT '[]'::jsonb,
  
  -- Steps
  steps_data jsonb DEFAULT '[]'::jsonb,
  
  -- FAQ
  faq_data jsonb DEFAULT '[]'::jsonb,
  
  -- Status
  is_active boolean DEFAULT true,
  is_noindex boolean DEFAULT false,
  
  -- Stats
  view_count int DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 12. KNOWLEDGE CENTER SECTIONS
CREATE TABLE IF NOT EXISTS public.knowledge_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text DEFAULT '',
  icon text DEFAULT 'article',
  color text DEFAULT '#1a2530',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 13. CAMPAIGN TRACKING
CREATE TABLE IF NOT EXISTS public.content_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text DEFAULT '',
  campaign_type text NOT NULL CHECK (campaign_type IN ('seasonal', 'promotional', 'brand', 'event', 'content', 'other')),
  start_date timestamptz,
  end_date timestamptz,
  landing_page_id uuid REFERENCES public.landing_pages(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON public.blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts(published_at) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blog_posts_created ON public.blog_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_post ON public.blog_post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_post_tags_tag ON public.blog_post_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_blog_media_post ON public.blog_media(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_post ON public.blog_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON public.landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_landing_pages_type ON public.landing_pages(page_type);
CREATE INDEX IF NOT EXISTS idx_comparison_pages_slug ON public.comparison_pages(slug);
CREATE INDEX IF NOT EXISTS idx_buying_guides_slug ON public.buying_guides(slug);
CREATE INDEX IF NOT EXISTS idx_knowledge_sections_slug ON public.knowledge_sections(slug);

-- Full text search
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
  to_tsvector('arabic', coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, ''))
) STORED;
CREATE INDEX IF NOT EXISTS idx_blog_posts_search ON public.blog_posts USING GIN(search_vector);

-- =====================
-- RLS POLICIES
-- =====================
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_related_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparison_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buying_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_campaigns ENABLE ROW LEVEL SECURITY;

-- Anon can read active content
CREATE POLICY "anon_read_blog_categories" ON public.blog_categories FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_blog_tags" ON public.blog_tags FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_blog_authors" ON public.blog_authors FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_blog_posts" ON public.blog_posts FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "anon_read_blog_post_tags" ON public.blog_post_tags FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_blog_media" ON public.blog_media FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_blog_related_products" ON public.blog_related_products FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_blog_comments" ON public.blog_comments FOR SELECT TO anon USING (is_approved = true);
CREATE POLICY "anon_read_landing_pages" ON public.landing_pages FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "anon_read_comparison_pages" ON public.comparison_pages FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "anon_read_buying_guides" ON public.buying_guides FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "anon_read_knowledge_sections" ON public.knowledge_sections FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_content_campaigns" ON public.content_campaigns FOR SELECT TO anon USING (is_active = true);

-- Admin full access
CREATE POLICY "admin_all_blog_categories" ON public.blog_categories FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_blog_tags" ON public.blog_tags FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_blog_authors" ON public.blog_authors FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_blog_posts" ON public.blog_posts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_blog_post_tags" ON public.blog_post_tags FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_blog_media" ON public.blog_media FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_blog_related_products" ON public.blog_related_products FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_blog_comments" ON public.blog_comments FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_landing_pages" ON public.landing_pages FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_comparison_pages" ON public.comparison_pages FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_buying_guides" ON public.buying_guides FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_content_campaigns" ON public.content_campaigns FOR ALL TO anon USING (true) WITH CHECK (true);

-- =====================
-- AUTO UPDATE TRIGGERS
-- =====================
CREATE OR REPLACE FUNCTION update_content_updated_at()
RETURNS trigger AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['blog_categories','blog_authors','blog_posts','landing_pages','comparison_pages','buying_guides','content_campaigns']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', tbl, tbl);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION update_content_updated_at()', tbl, tbl);
  END LOOP;
END $$;

-- =====================
-- STORAGE BUCKET
-- =====================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('blog_media', 'blog_media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "anon_read_blog_media" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'blog_media');
CREATE POLICY "admin_all_blog_media" ON storage.objects FOR ALL TO anon USING (bucket_id = 'blog_media') WITH CHECK (bucket_id = 'blog_media');
