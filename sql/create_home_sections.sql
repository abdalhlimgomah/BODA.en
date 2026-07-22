-- Home Sections: dynamic sections for home page
CREATE TABLE IF NOT EXISTS public.home_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_type text NOT NULL DEFAULT 'custom',
  title text NOT NULL DEFAULT '',
  subtitle text DEFAULT '',
  badge text DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  selection_mode text NOT NULL DEFAULT 'auto' CHECK (selection_mode IN ('auto', 'manual')),
  auto_rules jsonb DEFAULT '{}'::jsonb,
  display_count int DEFAULT 12,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Section-Product assignments
CREATE TABLE IF NOT EXISTS public.section_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.home_sections(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(section_id, product_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_section_products_section_id ON public.section_products(section_id);
CREATE INDEX IF NOT EXISTS idx_home_sections_sort ON public.home_sections(sort_order);

-- RLS: anon can read
ALTER TABLE public.home_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_products ENABLE ROW LEVEL SECURITY;

-- Read policies for anon
DROP POLICY IF EXISTS "home_sections_anon_select" ON public.home_sections;
CREATE POLICY "home_sections_anon_select"
  ON public.home_sections FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "section_products_anon_select" ON public.section_products;
CREATE POLICY "section_products_anon_select"
  ON public.section_products FOR SELECT TO anon USING (true);

-- CRUD policies for anon (for admin panel)
DROP POLICY IF EXISTS "home_sections_anon_insert" ON public.home_sections;
CREATE POLICY "home_sections_anon_insert"
  ON public.home_sections FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "home_sections_anon_update" ON public.home_sections;
CREATE POLICY "home_sections_anon_update"
  ON public.home_sections FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "home_sections_anon_delete" ON public.home_sections;
CREATE POLICY "home_sections_anon_delete"
  ON public.home_sections FOR DELETE TO anon USING (true);

DROP POLICY IF EXISTS "section_products_anon_insert" ON public.section_products;
CREATE POLICY "section_products_anon_insert"
  ON public.section_products FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "section_products_anon_update" ON public.section_products;
CREATE POLICY "section_products_anon_update"
  ON public.section_products FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "section_products_anon_delete" ON public.section_products;
CREATE POLICY "section_products_anon_delete"
  ON public.section_products FOR DELETE TO anon USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_home_sections_updated_at()
RETURNS trigger AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_home_sections_updated_at ON public.home_sections;
CREATE TRIGGER trg_home_sections_updated_at BEFORE UPDATE ON public.home_sections
  FOR EACH ROW EXECUTE FUNCTION update_home_sections_updated_at();
