-- Add created_at column with default now() if not exists
alter table if exists public.ratings
add column if not exists created_at timestamptz default now();
