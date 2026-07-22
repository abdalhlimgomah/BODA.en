-- App Settings table لتخزين إعدادات التطبيق (مثل توكن تاجر)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_anon_select" ON public.app_settings;
CREATE POLICY "app_settings_anon_select"
  ON public.app_settings FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "app_settings_anon_insert" ON public.app_settings;
CREATE POLICY "app_settings_anon_insert"
  ON public.app_settings FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "app_settings_anon_update" ON public.app_settings;
CREATE POLICY "app_settings_anon_update"
  ON public.app_settings FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "app_settings_anon_delete" ON public.app_settings;
CREATE POLICY "app_settings_anon_delete"
  ON public.app_settings FOR DELETE
  TO anon
  USING (true);

-- Insert default keys if not exist
INSERT INTO public.app_settings (key, value) VALUES
  ('taager_api_key', ''),
  ('taager_taager_id', '2226119'),
  ('taager_session_key', ''),
  ('taager_merchant_api', 'https://merchant.api.taager.com/api'),
  ('taager_edge_function_url', 'https://msgqzgzoslearaprgiqq.supabase.co/functions/v1/taager-proxy')
ON CONFLICT (key) DO NOTHING;
