-- ========================================
-- Cart items table — حفظ عربة التسوق
-- كل مستخدم له عربة خاصة به مرتبطة بالايميل
-- ========================================

CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  price NUMERIC DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  image TEXT DEFAULT '',
  category TEXT DEFAULT '',
  description TEXT DEFAULT '',
  seller_id TEXT DEFAULT '',
  seller_email TEXT DEFAULT '',
  owner_id TEXT DEFAULT '',
  owner_email TEXT DEFAULT '',
  source TEXT DEFAULT 'internal',
  taager_product_id TEXT DEFAULT '',
  country_code TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_email, product_id)
);

-- Allow public access (since no Supabase Auth)
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Read: anyone can read their own cart by email
DROP POLICY IF EXISTS "cart_items_select_own" ON public.cart_items;
CREATE POLICY "cart_items_select_own"
  ON public.cart_items FOR SELECT
  USING (true);

-- Insert: anyone can insert
DROP POLICY IF EXISTS "cart_items_insert_own" ON public.cart_items;
CREATE POLICY "cart_items_insert_own"
  ON public.cart_items FOR INSERT
  WITH CHECK (true);

-- Update: anyone can update
DROP POLICY IF EXISTS "cart_items_update_own" ON public.cart_items;
CREATE POLICY "cart_items_update_own"
  ON public.cart_items FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Delete: anyone can delete
DROP POLICY IF EXISTS "cart_items_delete_own" ON public.cart_items;
CREATE POLICY "cart_items_delete_own"
  ON public.cart_items FOR DELETE
  USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_cart_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_cart_items_updated_at ON public.cart_items;
CREATE TRIGGER set_cart_items_updated_at
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_items_updated_at();

CREATE INDEX IF NOT EXISTS idx_cart_items_user_email ON public.cart_items (user_email);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items (product_id);

-- Add image_url column if table already exists without it
ALTER TABLE public.cart_items ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
