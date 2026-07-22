-- Fix kobon table: create if not exists, add RLS policies for anon access
CREATE TABLE IF NOT EXISTS public.kobon (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cbon text UNIQUE NOT NULL,
  rate numeric DEFAULT 5 NOT NULL,
  minimum_amount numeric DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add rate and minimum_amount columns if not exists (for existing table)
ALTER TABLE public.kobon ADD COLUMN IF NOT EXISTS rate numeric DEFAULT 5 NOT NULL;
ALTER TABLE public.kobon ADD COLUMN IF NOT EXISTS minimum_amount numeric DEFAULT 0 NOT NULL;

-- Enable RLS
ALTER TABLE public.kobon ENABLE ROW LEVEL SECURITY;

-- Allow anon SELECT (needed for coupon validation from frontend)
DROP POLICY IF EXISTS "kobon_anon_select" ON public.kobon;
CREATE POLICY "kobon_anon_select"
  ON public.kobon FOR SELECT
  TO anon
  USING (true);

-- Allow anon INSERT/UPDATE/DELETE (for admin panel)
DROP POLICY IF EXISTS "kobon_anon_insert" ON public.kobon;
CREATE POLICY "kobon_anon_insert"
  ON public.kobon FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "kobon_anon_update" ON public.kobon;
CREATE POLICY "kobon_anon_update"
  ON public.kobon FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "kobon_anon_delete" ON public.kobon;
CREATE POLICY "kobon_anon_delete"
  ON public.kobon FOR DELETE
  TO anon
  USING (true);

-- Insert test coupon if none exist
INSERT INTO public.kobon (cbon, rate, minimum_amount)
SELECT 'SAVE10', 10, 0
WHERE NOT EXISTS (SELECT 1 FROM public.kobon WHERE cbon = 'SAVE10');
