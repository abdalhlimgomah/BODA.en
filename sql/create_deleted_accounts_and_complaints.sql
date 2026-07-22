-- =============================================
-- 1. deleted_accounts table
-- حفظ بيانات الحسابات المحذوفة
-- =============================================
CREATE TABLE IF NOT EXISTS public.deleted_accounts (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) DEFAULT '',
    password VARCHAR(255) DEFAULT '',
    deleted_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. complaints table
-- حفظ شكاوي ورسائل المستخدمين
-- =============================================
CREATE TABLE IF NOT EXISTS public.complaints (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    reply TEXT DEFAULT '',
    replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
