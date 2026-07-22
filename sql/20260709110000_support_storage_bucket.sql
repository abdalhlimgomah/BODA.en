-- Create support_files bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support_files',
  'support_files',
  true,
  52428800, -- 50MB
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if any to avoid duplicates
DROP POLICY IF EXISTS "Allow public read of support files" ON storage.objects;
DROP POLICY IF EXISTS "Allow anyone to upload support files" ON storage.objects;
DROP POLICY IF EXISTS "Allow anyone to update support files" ON storage.objects;
DROP POLICY IF EXISTS "Allow anyone to delete support files" ON storage.objects;

-- Policies for public access on support_files bucket
CREATE POLICY "Allow public read of support files"
ON storage.objects FOR SELECT
USING (bucket_id = 'support_files');

CREATE POLICY "Allow anyone to upload support files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'support_files');

CREATE POLICY "Allow anyone to update support files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'support_files');

CREATE POLICY "Allow anyone to delete support files"
ON storage.objects FOR DELETE
USING (bucket_id = 'support_files');
