-- ========================================
-- Buda Rewards & Contest System
-- Migration: 20260725
-- ========================================
-- تنبيه: طبق هذا الملف في مشروع Supabase الصحيح
-- URL المقارنة: https://msgqzgzoslearaprgiqq.supabase.co
-- افتح Supabase Dashboard -> SQL Editor -> الصق هذا الملف وشغّله
-- ========================================

-- The app uses custom auth (localStorage), not Supabase Auth.
-- RLS is disabled on contest tables following the same pattern as
-- support_conversations / support_messages.
-- Application code handles user filtering via user_id / email columns.

-- Drop existing tables (safe to re-run if first run failed with wrong types)
DROP TABLE IF EXISTS public.contest_messages CASCADE;
DROP TABLE IF EXISTS public.reward_assignments CASCADE;
DROP TABLE IF EXISTS public.referrals CASCADE;
DROP TABLE IF EXISTS public.contest_participants CASCADE;
DROP TABLE IF EXISTS public.contest_settings CASCADE;
DROP TABLE IF EXISTS public.contest_rewards CASCADE;
DROP TABLE IF EXISTS public.contest_campaigns CASCADE;

-- ========================================
-- 1. contest_campaigns
-- ========================================
CREATE TABLE IF NOT EXISTS public.contest_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contest_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_campaigns DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.contest_campaigns TO anon;

DROP TRIGGER IF EXISTS set_contest_campaigns_updated_at ON public.contest_campaigns;
CREATE TRIGGER set_contest_campaigns_updated_at
  BEFORE UPDATE ON public.contest_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 2. contest_participants
-- ========================================
CREATE TABLE IF NOT EXISTS public.contest_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  campaign_id UUID NOT NULL REFERENCES public.contest_campaigns(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  family_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT NOT NULL,
  birth_date DATE NOT NULL,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT,
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  terms_accepted_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, campaign_id)
);

ALTER TABLE public.contest_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_participants DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.contest_participants TO anon;

DROP TRIGGER IF EXISTS set_contest_participants_updated_at ON public.contest_participants;
CREATE TRIGGER set_contest_participants_updated_at
  BEFORE UPDATE ON public.contest_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 3. referrals
-- ========================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.contest_campaigns(id) ON DELETE CASCADE,
  referrer_user_id TEXT NOT NULL,
  referred_user_id TEXT,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referral_code, referred_user_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.referrals TO anon;

-- ========================================
-- 4. contest_rewards
-- ========================================
CREATE TABLE IF NOT EXISTS public.contest_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.contest_campaigns(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('cash', 'product', 'coupon')),
  title TEXT NOT NULL,
  description TEXT,
  value TEXT,
  quantity INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contest_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_rewards DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.contest_rewards TO anon;

-- ========================================
-- 5. reward_assignments
-- ========================================
CREATE TABLE IF NOT EXISTS public.reward_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.contest_campaigns(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.contest_participants(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.contest_rewards(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'not_won', 'contacted', 'fulfilled')),
  message TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reward_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_assignments DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.reward_assignments TO anon;

-- ========================================
-- 6. contest_messages
-- ========================================
CREATE TABLE IF NOT EXISTS public.contest_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  campaign_id UUID NOT NULL REFERENCES public.contest_campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reward_type TEXT,
  reward_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

ALTER TABLE public.contest_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_messages DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.contest_messages TO anon;

-- ========================================
-- 7. contest_settings
-- ========================================
CREATE TABLE IF NOT EXISTS public.contest_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.contest_campaigns(id) ON DELETE CASCADE UNIQUE,
  referral_required_count INTEGER DEFAULT 0,
  auto_assign_on_qualify BOOLEAN DEFAULT false,
  max_referrals_per_user INTEGER DEFAULT 100,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contest_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_settings DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.contest_settings TO anon;

DROP TRIGGER IF EXISTS set_contest_settings_updated_at ON public.contest_settings;
CREATE TRIGGER set_contest_settings_updated_at
  BEFORE UPDATE ON public.contest_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Seed Data: Default Campaign
-- ========================================
INSERT INTO public.contest_campaigns (name, description, start_at, end_at, status)
VALUES (
  'Buda Rewards Contest',
  'مسابقة Buda Rewards — شارك واربح جوائز قيمة!',
  NOW(),
  NOW() + INTERVAL '2 months',
  'active'
) ON CONFLICT DO NOTHING;

-- Seed Rewards
INSERT INTO public.contest_rewards (campaign_id, reward_type, title, description, value, quantity, image_url)
SELECT
  c.id,
  'cash',
  'الجائزة المالية',
  'جوائز مالية بقيمة 70,000 جنيه مصري',
  '70,000 EGP',
  69,
  'https://iili.io/CevCThb.jpg'
FROM public.contest_campaigns c
WHERE c.name = 'Buda Rewards Contest'
AND NOT EXISTS (SELECT 1 FROM public.contest_rewards WHERE reward_type = 'cash' AND campaign_id = c.id);

INSERT INTO public.contest_rewards (campaign_id, reward_type, title, description, value, quantity, image_url)
SELECT
  c.id,
  'product',
  'جوائز المنتجات',
  'أكثر من 200 منتج مجاني للفائزين',
  '200+ products',
  200,
  'https://iili.io/CevoHWG.jpg'
FROM public.contest_campaigns c
WHERE c.name = 'Buda Rewards Contest'
AND NOT EXISTS (SELECT 1 FROM public.contest_rewards WHERE reward_type = 'product' AND campaign_id = c.id);

INSERT INTO public.contest_rewards (campaign_id, reward_type, title, description, value, quantity, image_url)
SELECT
  c.id,
  'coupon',
  'كوبونات الخصم',
  'كوبونات خصم تصل إلى 50%',
  'up to 50%',
  500,
  'https://iili.io/Cevop2V.jpg'
FROM public.contest_campaigns c
WHERE c.name = 'Buda Rewards Contest'
AND NOT EXISTS (SELECT 1 FROM public.contest_rewards WHERE reward_type = 'coupon' AND campaign_id = c.id);

-- Seed Settings
INSERT INTO public.contest_settings (campaign_id, referral_required_count, auto_assign_on_qualify, max_referrals_per_user)
SELECT id, 0, false, 100
FROM public.contest_campaigns
WHERE name = 'Buda Rewards Contest'
AND NOT EXISTS (SELECT 1 FROM public.contest_settings WHERE campaign_id = contest_campaigns.id);
