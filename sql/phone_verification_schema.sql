-- ========================================================
-- Phone Verification Schema - Noon Simulation
-- ========================================================

-- 1) Add new fields to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS phone_country TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- 2) Create phone_verifications table for tracking OTP codes
CREATE TABLE IF NOT EXISTS public.phone_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  country_code TEXT NOT NULL, -- 'EG' or 'SA'
  otp_code TEXT NOT NULL,
  channel TEXT NOT NULL, -- 'whatsapp' or 'sms'
  attempts INTEGER DEFAULT 0,
  resends INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Create phone_verification_logs table for audit trail
CREATE TABLE IF NOT EXISTS public.phone_verification_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  action TEXT NOT NULL, -- 'send_request', 'send_success', 'send_fail', 'verify_success', 'verify_fail', 'lockout'
  channel TEXT, -- 'whatsapp', 'sms'
  ip_address TEXT,
  device_type TEXT,
  user_agent TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Keep it service_role access only)
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verification_logs ENABLE ROW LEVEL SECURITY;
