-- Add extra fields from Taager merchant-info API to taager_products table
-- Run this in Supabase SQL Editor

alter table if exists public.taager_products
add column if not exists quick_details text,
add column if not exists content_ideas text,
add column if not exists how_to_use text,
add column if not exists videos jsonb default '[]'::jsonb;
