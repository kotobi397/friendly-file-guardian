CREATE TABLE public.noor_discover_config (
  id integer PRIMARY KEY DEFAULT 1,
  enabled boolean NOT NULL DEFAULT false,
  search_queries jsonb NOT NULL DEFAULT '["روايات","قصص","شعر","أدب","تاريخ","فلسفة","فقه","تفسير","حديث","عقيدة","تصوف","نحو","بلاغة","علم نفس","اجتماع","سياسة","اقتصاد","قانون","تربية","طب","علوم","فلك","حاسوب","فنون","أطفال","خيال علمي","بوليسية","رعب","تراث","سيرة ذاتية","تنمية بشرية","لغة انجليزية","رياضيات","كيمياء","فيزياء","جغرافيا","إدارة","تسويق","برمجة","هندسة","زراعة","بيئة","إعلام","ترجمة","مسرح","نقد أدبي","رحلات","طبخ","رياضة","موسوعات"]'::jsonb,
  current_query_index integer NOT NULL DEFAULT 0,
  page_cursor integer NOT NULL DEFAULT 1,
  batch_size integer NOT NULL DEFAULT 6,
  max_pending integer NOT NULL DEFAULT 60,
  total_discovered integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  last_status text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT noor_discover_config_singleton CHECK (id = 1)
);

GRANT SELECT, UPDATE ON public.noor_discover_config TO authenticated;
GRANT ALL ON public.noor_discover_config TO service_role;

ALTER TABLE public.noor_discover_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view noor discover config"
ON public.noor_discover_config FOR SELECT TO authenticated
USING (public.is_current_user_admin());

CREATE POLICY "Admins can update noor discover config"
ON public.noor_discover_config FOR UPDATE TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

CREATE TRIGGER update_noor_discover_config_updated_at
BEFORE UPDATE ON public.noor_discover_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.noor_discover_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;