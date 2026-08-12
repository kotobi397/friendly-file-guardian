CREATE TABLE public.site_update_dismissals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  update_id uuid NOT NULL REFERENCES public.site_updates(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, update_id)
);
GRANT SELECT, INSERT, DELETE ON public.site_update_dismissals TO authenticated;
GRANT ALL ON public.site_update_dismissals TO service_role;
ALTER TABLE public.site_update_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their dismissals" ON public.site_update_dismissals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create their dismissals" ON public.site_update_dismissals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete their dismissals" ON public.site_update_dismissals FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_site_update_dismissals_user ON public.site_update_dismissals(user_id);