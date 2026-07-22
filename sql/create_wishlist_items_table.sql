-- ========================================
-- Wishlist items table — حفظ المفضلة
-- كل مستخدم له مفضلة خاصة به مرتبطة بالايميل
-- ========================================

CREATE TABLE IF NOT EXISTS public.wishlist_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  product_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  price NUMERIC DEFAULT 0,
  image TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  category TEXT DEFAULT '',
  description TEXT DEFAULT '',
  seller_id TEXT DEFAULT '',
  seller_email TEXT DEFAULT '',
  source TEXT DEFAULT 'internal',
  taager_product_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_email, product_id)
);

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wishlist_items_select_own" ON public.wishlist_items;
CREATE POLICY "wishlist_items_select_own"
  ON public.wishlist_items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "wishlist_items_insert_own" ON public.wishlist_items;
CREATE POLICY "wishlist_items_insert_own"
  ON public.wishlist_items FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "wishlist_items_update_own" ON public.wishlist_items;
CREATE POLICY "wishlist_items_update_own"
  ON public.wishlist_items FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "wishlist_items_delete_own" ON public.wishlist_items;
CREATE POLICY "wishlist_items_delete_own"
  ON public.wishlist_items FOR DELETE
  USING (true);

CREATE OR REPLACE FUNCTION update_wishlist_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_wishlist_items_updated_at ON public.wishlist_items;
CREATE TRIGGER set_wishlist_items_updated_at
  BEFORE UPDATE ON public.wishlist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_wishlist_items_updated_at();

CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_email ON public.wishlist_items (user_email);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_product_id ON public.wishlist_items (product_id);
