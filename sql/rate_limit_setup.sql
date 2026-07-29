-- ============================================================
-- Rate Limiting Tables for Supabase Edge Functions
-- المشروع: BudoQ (msgqzgzoslearaprgiqq)
-- تم الإنشاء: 2026-07-29
-- ============================================================

-- جدول تتبع الطلبات لكل IP
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip text NOT NULL,
  function_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_ip_func_time 
ON public.api_rate_limits(ip, function_name, created_at);

-- تفعيل RLS (للقراءة فقط)
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- سياسة: يقرأ فقط عن طريق service_role (Edge Functions)
DROP POLICY IF EXISTS "api_rate_limits_insert" ON public.api_rate_limits;
CREATE POLICY "api_rate_limits_insert" ON public.api_rate_limits
  FOR INSERT TO anon, authenticated, service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "api_rate_limits_select" ON public.api_rate_limits;
CREATE POLICY "api_rate_limits_select" ON public.api_rate_limits
  FOR SELECT TO service_role
  USING (true);

-- دالة مساعدة: تنظيف السجلات القديمة (أكبر من ساعة)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.api_rate_limits
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- تنظيف تلقائي كل ساعة (يتطلب pg_cron)
-- SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', 'SELECT public.cleanup_rate_limits();');
