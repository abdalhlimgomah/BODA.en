-- Fix: تغيير product_id من uuid إلى text عشان يدعم IDs زي "taager_17296"
alter table if exists public.order_items
alter column product_id type text using product_id::text;
