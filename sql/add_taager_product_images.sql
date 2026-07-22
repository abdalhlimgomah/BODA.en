-- Add image columns for multiple product images (up to 8)
-- Run this in Supabase SQL Editor

alter table if exists public.taager_products
add column if not exists image1 text,
add column if not exists image2 text,
add column if not exists image3 text,
add column if not exists image4 text,
add column if not exists image5 text,
add column if not exists image6 text,
add column if not exists image7 text,
add column if not exists image8 text;
