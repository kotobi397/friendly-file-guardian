-- جدول طلبات الكتب
CREATE TABLE public.book_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  language TEXT NOT NULL DEFAULT 'العربية',
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  fulfilled_book_id UUID,
  admin_note TEXT,
  votes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_book_requests_votes ON public.book_requests (votes_count DESC, created_at DESC);
CREATE INDEX idx_book_requests_user ON public.book_requests (user_id);
CREATE INDEX idx_book_requests_status ON public.book_requests (status);

GRANT SELECT ON public.book_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_requests TO authenticated;
GRANT ALL ON public.book_requests TO service_role;

ALTER TABLE public.book_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "book_requests_public_read" ON public.book_requests
  FOR SELECT USING (true);

CREATE POLICY "book_requests_insert_own" ON public.book_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "book_requests_update_own" ON public.book_requests
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "book_requests_delete_own" ON public.book_requests
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "book_requests_admin_all" ON public.book_requests
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

-- جدول الأصوات
CREATE TABLE public.book_request_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.book_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, user_id)
);

CREATE INDEX idx_book_request_votes_request ON public.book_request_votes (request_id);

GRANT SELECT ON public.book_request_votes TO anon;
GRANT SELECT, INSERT, DELETE ON public.book_request_votes TO authenticated;
GRANT ALL ON public.book_request_votes TO service_role;

ALTER TABLE public.book_request_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "book_request_votes_public_read" ON public.book_request_votes
  FOR SELECT USING (true);

CREATE POLICY "book_request_votes_insert_own" ON public.book_request_votes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "book_request_votes_delete_own" ON public.book_request_votes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- تحديث عدد الأصوات تلقائياً
CREATE OR REPLACE FUNCTION public.sync_book_request_votes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.book_requests
      SET votes_count = votes_count + 1, updated_at = now()
      WHERE id = NEW.request_id;
    RETURN NEW;
  ELSE
    UPDATE public.book_requests
      SET votes_count = GREATEST(votes_count - 1, 0), updated_at = now()
      WHERE id = OLD.request_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER trg_book_request_votes_count
AFTER INSERT OR DELETE ON public.book_request_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_book_request_votes_count();

-- تحديث updated_at
CREATE OR REPLACE FUNCTION public.set_book_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_book_requests_updated_at
BEFORE UPDATE ON public.book_requests
FOR EACH ROW EXECUTE FUNCTION public.set_book_requests_updated_at();

-- حد أقصى 5 طلبات يومياً لكل مستخدم
CREATE OR REPLACE FUNCTION public.enforce_book_request_daily_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt
  FROM public.book_requests
  WHERE user_id = NEW.user_id AND created_at > now() - INTERVAL '1 day';

  IF cnt >= 5 THEN
    RAISE EXCEPTION 'لقد وصلت للحد الأقصى من الطلبات اليومية (5 طلبات)';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_book_requests_daily_limit
BEFORE INSERT ON public.book_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_book_request_daily_limit();