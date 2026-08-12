-- 1. events table
CREATE TABLE public.book_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id uuid NOT NULL,
  uploader_id uuid,
  user_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('card_click','detail_view','read_online','download')),
  country_code text,
  country_name text,
  device_type text,
  referrer text,
  session_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.book_events TO anon;
GRANT SELECT, INSERT ON public.book_events TO authenticated;
GRANT ALL ON public.book_events TO service_role;

ALTER TABLE public.book_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a book event"
  ON public.book_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Uploaders can view events for their books"
  ON public.book_events FOR SELECT
  TO authenticated
  USING (uploader_id = auth.uid());

CREATE POLICY "Admins can view all book events"
  ON public.book_events FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

CREATE INDEX idx_book_events_uploader ON public.book_events (uploader_id, created_at DESC);
CREATE INDEX idx_book_events_book ON public.book_events (book_id, event_type);
CREATE INDEX idx_book_events_country ON public.book_events (uploader_id, country_code);

-- 2. auto-fill uploader_id from the book, keep client from spoofing it
CREATE OR REPLACE FUNCTION public.book_events_set_uploader()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT bs.user_id INTO NEW.uploader_id
  FROM public.book_submissions bs
  WHERE bs.id = NEW.book_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_book_events_set_uploader
BEFORE INSERT ON public.book_events
FOR EACH ROW EXECUTE FUNCTION public.book_events_set_uploader();

-- 3. per-book analytics for the current uploader
CREATE OR REPLACE FUNCTION public.get_uploader_book_analytics(p_days integer DEFAULT 0)
RETURNS TABLE (
  book_id uuid,
  title text,
  cover_image_url text,
  slug text,
  category text,
  created_at timestamptz,
  downloads bigint,
  reads_online bigint,
  card_clicks bigint,
  detail_views bigint,
  views bigint,
  reviews_count bigint,
  average_rating numeric,
  likes_count bigint,
  completions bigint,
  avg_progress numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_books AS (
    SELECT bs.id, bs.title,
           COALESCE(bs.s3_cover_image_url, bs.cover_image_url) AS cover_image_url,
           bs.slug, bs.category, bs.created_at, COALESCE(bs.views, 0) AS views
    FROM public.book_submissions bs
    WHERE bs.user_id = auth.uid() AND bs.status = 'approved'
  ),
  ev AS (
    SELECT be.book_id,
           COUNT(*) FILTER (WHERE be.event_type = 'card_click') AS card_clicks,
           COUNT(*) FILTER (WHERE be.event_type = 'detail_view') AS detail_views,
           COUNT(*) FILTER (WHERE be.event_type = 'read_online') AS reads_online,
           COUNT(*) FILTER (WHERE be.event_type = 'download') AS ev_downloads
    FROM public.book_events be
    WHERE be.uploader_id = auth.uid()
      AND (p_days <= 0 OR be.created_at >= now() - make_interval(days => p_days))
    GROUP BY be.book_id
  ),
  dl AS (
    SELECT ud.book_id, COUNT(*) AS c
    FROM public.user_downloads ud
    WHERE (p_days <= 0 OR ud.created_at >= now() - make_interval(days => p_days))
    GROUP BY ud.book_id
  ),
  st AS (
    SELECT bst.book_id, COALESCE(bst.downloads, 0) AS downloads FROM public.book_stats bst
  ),
  rv AS (
    SELECT br.book_id, COUNT(*) AS c, ROUND(AVG(br.rating)::numeric, 2) AS avg_rating
    FROM public.book_reviews br GROUP BY br.book_id
  ),
  lk AS (
    SELECT bl.book_id, COUNT(*) AS c FROM public.book_likes bl GROUP BY bl.book_id
  ),
  rh AS (
    SELECT h.book_id,
           COUNT(*) FILTER (WHERE h.is_completed) AS completions,
           ROUND(AVG(h.progress_percentage)::numeric, 1) AS avg_progress
    FROM public.reading_history h GROUP BY h.book_id
  )
  SELECT b.id, b.title, b.cover_image_url, b.slug, b.category, b.created_at,
         GREATEST(COALESCE(st.downloads, 0), COALESCE(dl.c, 0), COALESCE(ev.ev_downloads, 0))::bigint,
         COALESCE(ev.reads_online, 0)::bigint,
         COALESCE(ev.card_clicks, 0)::bigint,
         COALESCE(ev.detail_views, 0)::bigint,
         b.views::bigint,
         COALESCE(rv.c, 0)::bigint,
         COALESCE(rv.avg_rating, 0),
         COALESCE(lk.c, 0)::bigint,
         COALESCE(rh.completions, 0)::bigint,
         COALESCE(rh.avg_progress, 0)
  FROM my_books b
  LEFT JOIN ev ON ev.book_id = b.id
  LEFT JOIN dl ON dl.book_id = b.id
  LEFT JOIN st ON st.book_id = b.id
  LEFT JOIN rv ON rv.book_id = b.id
  LEFT JOIN lk ON lk.book_id = b.id
  LEFT JOIN rh ON rh.book_id = b.id
  ORDER BY 7 DESC, b.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_uploader_book_analytics(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_uploader_book_analytics(integer) TO authenticated;

-- 4. top countries for the current uploader (optionally one book)
CREATE OR REPLACE FUNCTION public.get_uploader_top_countries(p_book_id uuid DEFAULT NULL, p_days integer DEFAULT 0, p_limit integer DEFAULT 10)
RETURNS TABLE (
  country_code text,
  country_name text,
  events bigint,
  reads_online bigint,
  downloads bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(be.country_code, 'XX') AS country_code,
         COALESCE(be.country_name, 'غير معروف') AS country_name,
         COUNT(*)::bigint AS events,
         COUNT(*) FILTER (WHERE be.event_type = 'read_online')::bigint AS reads_online,
         COUNT(*) FILTER (WHERE be.event_type = 'download')::bigint AS downloads
  FROM public.book_events be
  WHERE be.uploader_id = auth.uid()
    AND (p_book_id IS NULL OR be.book_id = p_book_id)
    AND (p_days <= 0 OR be.created_at >= now() - make_interval(days => p_days))
  GROUP BY 1, 2
  ORDER BY events DESC
  LIMIT GREATEST(p_limit, 1);
$$;

REVOKE ALL ON FUNCTION public.get_uploader_top_countries(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_uploader_top_countries(uuid, integer, integer) TO authenticated;

-- 5. daily trend for the current uploader
CREATE OR REPLACE FUNCTION public.get_uploader_events_timeline(p_days integer DEFAULT 30, p_book_id uuid DEFAULT NULL)
RETURNS TABLE (
  day date,
  card_clicks bigint,
  detail_views bigint,
  reads_online bigint,
  downloads bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d::date AS day,
         COUNT(be.id) FILTER (WHERE be.event_type = 'card_click')::bigint,
         COUNT(be.id) FILTER (WHERE be.event_type = 'detail_view')::bigint,
         COUNT(be.id) FILTER (WHERE be.event_type = 'read_online')::bigint,
         COUNT(be.id) FILTER (WHERE be.event_type = 'download')::bigint
  FROM generate_series(
         (now() - make_interval(days => GREATEST(p_days, 1) - 1))::date,
         now()::date,
         interval '1 day'
       ) AS d
  LEFT JOIN public.book_events be
    ON be.created_at::date = d::date
   AND be.uploader_id = auth.uid()
   AND (p_book_id IS NULL OR be.book_id = p_book_id)
  GROUP BY d
  ORDER BY d;
$$;

REVOKE ALL ON FUNCTION public.get_uploader_events_timeline(integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_uploader_events_timeline(integer, uuid) TO authenticated;