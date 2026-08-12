CREATE TABLE public.noor_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  book_url text NOT NULL UNIQUE,
  cover_url text,
  rating smallint NOT NULL DEFAULT 5,
  review_text text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  error text,
  posted_at timestamptz,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.noor_review_queue TO authenticated;
GRANT ALL ON public.noor_review_queue TO service_role;

ALTER TABLE public.noor_review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view noor review queue" ON public.noor_review_queue
  FOR SELECT TO authenticated USING (is_current_user_admin());
CREATE POLICY "Admins can insert noor review queue" ON public.noor_review_queue
  FOR INSERT TO authenticated WITH CHECK (is_current_user_admin());
CREATE POLICY "Admins can update noor review queue" ON public.noor_review_queue
  FOR UPDATE TO authenticated USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());
CREATE POLICY "Admins can delete noor review queue" ON public.noor_review_queue
  FOR DELETE TO authenticated USING (is_current_user_admin());

CREATE TRIGGER update_noor_review_queue_updated_at
  BEFORE UPDATE ON public.noor_review_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();