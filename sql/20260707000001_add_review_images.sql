-- Add images column to ratings table for storing review image URLs
alter table if exists public.ratings
add column if not exists images jsonb default '[]'::jsonb;

-- Create storage bucket for review images if not exists
insert into storage.buckets (id, name, public)
values ('review-images', 'review-images', true)
on conflict (id) do nothing;

-- Allow public access to review-images bucket
do $$ begin
  create policy "Public Access review-images" on storage.objects for select using (bucket_id = 'review-images');
exception
  when duplicate_object then null;
end $$;

-- Allow anyone (anon + authenticated) to upload to review-images
do $$ begin
  create policy "Anyone can upload review images" on storage.objects for insert with check (bucket_id = 'review-images');
exception
  when duplicate_object then null;
end $$;

-- Allow anon to delete ratings
do $$ begin
  create policy "Anyone can delete ratings" on public.ratings for delete using (true);
exception
  when duplicate_object then null;
end $$;
