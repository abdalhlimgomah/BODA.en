-- Product Original Prices (Fake "before discount" prices)
-- تخزين سعر قبل الخصم وهمي لكل منتج
CREATE TABLE IF NOT EXISTS public.product_original_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text UNIQUE NOT NULL,
  product_name text NOT NULL DEFAULT '',
  product_price numeric NOT NULL,
  fake_original_price numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_original_prices ENABLE ROW LEVEL SECURITY;

-- Allow anon SELECT (needed for frontend to read fake prices)
DROP POLICY IF EXISTS "product_original_prices_anon_select" ON public.product_original_prices;
CREATE POLICY "product_original_prices_anon_select"
  ON public.product_original_prices FOR SELECT
  TO anon
  USING (true);

-- Allow anon INSERT/UPDATE/DELETE (for admin panel)
DROP POLICY IF EXISTS "product_original_prices_anon_insert" ON public.product_original_prices;
CREATE POLICY "product_original_prices_anon_insert"
  ON public.product_original_prices FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "product_original_prices_anon_update" ON public.product_original_prices;
CREATE POLICY "product_original_prices_anon_update"
  ON public.product_original_prices FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "product_original_prices_anon_delete" ON public.product_original_prices;
CREATE POLICY "product_original_prices_anon_delete"
  ON public.product_original_prices FOR DELETE
  TO anon
  USING (true);
