-- ========================================
-- Add country_code column to profiles table
-- لتخزين الدولة المختارة لكل مستخدم (EG / SA)
-- ========================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'EG';

-- Update RLS policies to allow public access to the new column
-- (already covered by existing "Allow all" policies)

