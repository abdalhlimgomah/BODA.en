-- ============================================================
-- SQL to disable RLS and drop incompatible constraints.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- Disable RLS to allow your custom anonymous authentication to read/write profiles
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verification_logs DISABLE ROW LEVEL SECURITY;

-- Drop any incompatible foreign key constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_users_id_fkey;

-- Drop old policies to keep the database clean
DROP POLICY IF EXISTS "profiles_select_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own"  ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own"  ON public.profiles;

DROP POLICY IF EXISTS "phone_verifications_select_own" ON public.phone_verifications;
DROP POLICY IF EXISTS "phone_verifications_insert_own" ON public.phone_verifications;
DROP POLICY IF EXISTS "phone_verifications_update_own" ON public.phone_verifications;
DROP POLICY IF EXISTS "phone_verifications_delete_own" ON public.phone_verifications;

DROP POLICY IF EXISTS "logs_select_own" ON public.phone_verification_logs;
DROP POLICY IF EXISTS "logs_insert_own" ON public.phone_verification_logs;

-- Verify RLS is disabled (rls_enabled should be false for all)
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename IN ('profiles', 'phone_verifications', 'phone_verification_logs')
  AND schemaname = 'public';
