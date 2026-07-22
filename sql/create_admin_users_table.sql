-- Run this in Supabase SQL Editor
-- 1. Creates admin_users table
-- 2. Inserts default admin (username: admin, password: admin)

CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_users_select_self" ON public.admin_users;
CREATE POLICY "admin_users_select_self"
  ON public.admin_users
  FOR SELECT
  TO anon
  USING (true);

INSERT INTO public.admin_users (username, password_hash)
VALUES ('admin', '2222')
ON CONFLICT (username) DO NOTHING;
