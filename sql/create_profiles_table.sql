-- ========================================
-- Profiles table — تخزين بيانات الحساب
-- ========================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  phone TEXT DEFAULT '',
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  full_name TEXT DEFAULT '',
  birth_day INTEGER,
  birth_month INTEGER,
  birth_year INTEGER,
  gender TEXT DEFAULT '',
  nationality TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow public access (since no Supabase Auth)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all select" ON public.profiles;
DROP POLICY IF EXISTS "Allow all insert" ON public.profiles;
DROP POLICY IF EXISTS "Allow all update" ON public.profiles;

CREATE POLICY "Allow all select"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Allow all insert"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow all update"
  ON public.profiles FOR UPDATE
  USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
