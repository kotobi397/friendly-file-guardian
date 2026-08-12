CREATE TABLE public.ktobati_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  book_url text NOT NULL UNIQUE,
  cover_url text,
  rating integer NOT NULL DEFAULT 5,
  review_text text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  error text,
  posted_at timestamptz,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ktobati_review_queue TO authenticated;
GRANT ALL ON public.ktobati_review_queue TO service_role;

ALTER TABLE public.ktobati_review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ktobati queue"
ON public.ktobati_review_queue FOR ALL TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

CREATE TABLE public.ktobati_reviewed_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_url text NOT NULL UNIQUE,
  title text,
  rating integer,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ktobati_reviewed_books TO authenticated;
GRANT ALL ON public.ktobati_reviewed_books TO service_role;

ALTER TABLE public.ktobati_reviewed_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ktobati reviewed books"
ON public.ktobati_reviewed_books FOR ALL TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

CREATE TRIGGER update_ktobati_review_queue_updated_at
BEFORE UPDATE ON public.ktobati_review_queue
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();