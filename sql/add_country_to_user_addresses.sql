-- Add country column to user_addresses table
-- لتخزين الدولة التي تم إضافة العنوان فيها (EG / SA)
ALTER TABLE public.user_addresses
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'EG';

-- Update existing rows to have a country value based on current logic
-- (default to EG for existing addresses)
