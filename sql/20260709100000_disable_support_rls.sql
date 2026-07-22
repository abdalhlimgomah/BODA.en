-- The app uses custom auth (not Supabase Auth), so auth.uid() is always NULL.
-- RLS policies based on auth.uid() block all anon-key operations.
-- Solution: disable RLS on the new support tables and allow anon key access.

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own support conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Users can update their own support conversations" ON public.support_conversations;
DROP POLICY IF EXISTS "Users can insert their own support conversations" ON public.support_conversations;

DROP POLICY IF EXISTS "Users can view messages of their own conversations" ON public.support_messages;
DROP POLICY IF EXISTS "Users can insert messages into their own conversations" ON public.support_messages;

-- Disable RLS — application code handles user filtering by user_id / user_email
ALTER TABLE public.support_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages DISABLE ROW LEVEL SECURITY;

-- Grant full access to the anon role (needed for Supabase JS client with anon key)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_conversations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_messages TO anon;
