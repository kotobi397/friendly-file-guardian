CREATE TABLE public.noor_reviewed_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_url text NOT NULL UNIQUE,
  title text,
  rating integer,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.noor_reviewed_books TO authenticated;
GRANT ALL ON public.noor_reviewed_books TO service_role;

ALTER TABLE public.noor_reviewed_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage noor reviewed books"
ON public.noor_reviewed_books FOR ALL TO authenticated
USING (public.is_current_user_admin())
WITH CHECK (public.is_current_user_admin());

CREATE INDEX idx_noor_reviewed_books_url ON public.noor_reviewed_books (book_url);

INSERT INTO public.noor_reviewed_books (book_url, title, rating, reviewed_at)
SELECT book_url, title, rating, COALESCE(posted_at, now())
FROM public.noor_review_queue
WHERE status = 'done'
ON CONFLICT (book_url) DO NOTHING;