-- ========================================
-- Fix: إزالة foreign key constraint من ratings
-- السبب: المنتجات من Taager مش موجودة في products
-- ========================================

-- إزالة الـ foreign key (السبب الرئيسي للخطأ 23503)
ALTER TABLE public.ratings DROP CONSTRAINT IF EXISTS ratings_item_id_fkey;

-- تغيير item_id من uuid إلى text عشان يدعم IDs زي "taager_17296"
ALTER TABLE public.ratings ALTER COLUMN item_id TYPE text USING item_id::text;

-- إضافة user_email (لأن التطبيق يستخدم localStorage auth)
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS user_email TEXT;

-- تغيير unique index لاستخدام user_email بدلاً من user_id
DROP INDEX IF EXISTS ratings_user_item_unique;
CREATE UNIQUE INDEX IF NOT EXISTS ratings_email_item_unique ON public.ratings(user_email, item_id);

-- تحديث RLS policies
DROP POLICY IF EXISTS "ratings_insert_own" ON public.ratings;
DROP POLICY IF EXISTS "ratings_insert_anon" ON public.ratings;
DROP POLICY IF EXISTS "ratings_update_own" ON public.ratings;

CREATE POLICY "ratings_insert_own"
  ON public.ratings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "ratings_update_own"
  ON public.ratings FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
