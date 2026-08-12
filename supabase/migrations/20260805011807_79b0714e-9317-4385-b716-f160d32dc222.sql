DROP FUNCTION IF EXISTS public.get_uploader_book_analytics(integer);

CREATE OR REPLACE FUNCTION public.get_uploader_book_analytics(p_days integer DEFAULT 0, p_limit integer DEFAULT 24, p_offset integer DEFAULT 0)
 RETURNS TABLE(book_id uuid, title text, cover_image_url text, slug text, category text, created_at timestamp with time zone, downloads bigint, reads_online bigint, card_clicks bigint, detail_views bigint, views bigint, reviews_count bigint, average_rating numeric, likes_count bigint, completions bigint, avg_progress numeric, total_books bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH my_books AS (
    SELECT bs.id, bs.title,
           COALESCE(bs.s3_cover_image_url, bs.cover_image_url) AS cover_image_url,
           bs.slug, bs.category, bs.created_at, COALESCE(bs.views, 0) AS views,
           COUNT(*) OVER () AS total_books
    FROM public.book_submissions bs
    WHERE bs.user_id = auth.uid() AND bs.status = 'approved'
    ORDER BY COALESCE(bs.views, 0) DESC, bs.created_at DESC
    LIMIT CASE WHEN p_limit > 0 THEN p_limit ELSE NULL END
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  ),
  ev AS (
    SELECT be.book_id,
           COUNT(*) FILTER (WHERE be.event_type = 'card_click') AS card_clicks,
           COUNT(*) FILTER (WHERE be.event_type = 'detail_view') AS detail_views,
           COUNT(*) FILTER (WHERE be.event_type = 'read_online') AS reads_online,
           COUNT(*) FILTER (WHERE be.event_type = 'download') AS ev_downloads
    FROM public.book_events be
    WHERE be.uploader_id = auth.uid()
      AND be.book_id IN (SELECT id FROM my_books)
      AND (p_days <= 0 OR be.created_at >= now() - make_interval(days => p_days))
    GROUP BY be.book_id
  ),
  dl AS (
    SELECT ud.book_id, COUNT(*) AS c
    FROM public.user_downloads ud
    WHERE ud.book_id IN (SELECT id FROM my_books)
      AND (p_days <= 0 OR ud.created_at >= now() - make_interval(days => p_days))
    GROUP BY ud.book_id
  ),
  st AS (
    SELECT bst.book_id, COALESCE(bst.downloads, 0) AS downloads FROM public.book_stats bst
    WHERE bst.book_id IN (SELECT id FROM my_books)
  ),
  rv AS (
    SELECT br.book_id, COUNT(*) AS c, ROUND(AVG(br.rating)::numeric, 2) AS avg_rating
    FROM public.book_reviews br WHERE br.book_id IN (SELECT id FROM my_books) GROUP BY br.book_id
  ),
  lk AS (
    SELECT bl.book_id, COUNT(*) AS c FROM public.book_likes bl
    WHERE bl.book_id IN (SELECT id FROM my_books) GROUP BY bl.book_id
  ),
  rh AS (
    SELECT h.book_id,
           COUNT(*) FILTER (WHERE h.is_completed) AS completions,
           ROUND(AVG(h.progress_percentage)::numeric, 1) AS avg_progress
    FROM public.reading_history h WHERE h.book_id IN (SELECT id FROM my_books) GROUP BY h.book_id
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
         COALESCE(rh.avg_progress, 0),
         b.total_books::bigint
  FROM my_books b
  LEFT JOIN ev ON ev.book_id = b.id
  LEFT JOIN dl ON dl.book_id = b.id
  LEFT JOIN st ON st.book_id = b.id
  LEFT JOIN rv ON rv.book_id = b.id
  LEFT JOIN lk ON lk.book_id = b.id
  LEFT JOIN rh ON rh.book_id = b.id
  ORDER BY b.views DESC, b.created_at DESC;
$function$;

REVOKE ALL ON FUNCTION public.get_uploader_book_analytics(integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_uploader_book_analytics(integer, integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_uploader_overall_stats(p_days integer DEFAULT 0)
 RETURNS TABLE(total_books bigint, downloads bigint, reads_online bigint, card_clicks bigint, detail_views bigint, views bigint, reviews_count bigint, average_rating numeric, likes_count bigint, completions bigint, avg_progress numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH my_books AS (
    SELECT bs.id, COALESCE(bs.views, 0) AS views
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
    WHERE ud.book_id IN (SELECT id FROM my_books)
      AND (p_days <= 0 OR ud.created_at >= now() - make_interval(days => p_days))
    GROUP BY ud.book_id
  ),
  st AS (
    SELECT bst.book_id, COALESCE(bst.downloads, 0) AS downloads FROM public.book_stats bst
    WHERE bst.book_id IN (SELECT id FROM my_books)
  ),
  rv AS (
    SELECT br.book_id, COUNT(*) AS c, AVG(br.rating)::numeric AS avg_rating
    FROM public.book_reviews br WHERE br.book_id IN (SELECT id FROM my_books) GROUP BY br.book_id
  ),
  lk AS (
    SELECT bl.book_id, COUNT(*) AS c FROM public.book_likes bl
    WHERE bl.book_id IN (SELECT id FROM my_books) GROUP BY bl.book_id
  ),
  rh AS (
    SELECT h.book_id,
           COUNT(*) FILTER (WHERE h.is_completed) AS completions,
           AVG(h.progress_percentage)::numeric AS avg_progress
    FROM public.reading_history h WHERE h.book_id IN (SELECT id FROM my_books) GROUP BY h.book_id
  ),
  per_book AS (
    SELECT b.id,
           GREATEST(COALESCE(st.downloads, 0), COALESCE(dl.c, 0), COALESCE(ev.ev_downloads, 0)) AS downloads,
           COALESCE(ev.reads_online, 0) AS reads_online,
           COALESCE(ev.card_clicks, 0) AS card_clicks,
           COALESCE(ev.detail_views, 0) AS detail_views,
           b.views,
           COALESCE(rv.c, 0) AS reviews_count,
           rv.avg_rating,
           COALESCE(lk.c, 0) AS likes_count,
           COALESCE(rh.completions, 0) AS completions,
           rh.avg_progress
    FROM my_books b
    LEFT JOIN ev ON ev.book_id = b.id
    LEFT JOIN dl ON dl.book_id = b.id
    LEFT JOIN st ON st.book_id = b.id
    LEFT JOIN rv ON rv.book_id = b.id
    LEFT JOIN lk ON lk.book_id = b.id
    LEFT JOIN rh ON rh.book_id = b.id
  )
  SELECT COUNT(*)::bigint,
         COALESCE(SUM(downloads), 0)::bigint,
         COALESCE(SUM(reads_online), 0)::bigint,
         COALESCE(SUM(card_clicks), 0)::bigint,
         COALESCE(SUM(detail_views), 0)::bigint,
         COALESCE(SUM(views), 0)::bigint,
         COALESCE(SUM(reviews_count), 0)::bigint,
         ROUND(COALESCE(AVG(avg_rating), 0), 2),
         COALESCE(SUM(likes_count), 0)::bigint,
         COALESCE(SUM(completions), 0)::bigint,
         ROUND(COALESCE(AVG(avg_progress), 0), 1)
  FROM per_book;
$function$;

REVOKE ALL ON FUNCTION public.get_uploader_overall_stats(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_uploader_overall_stats(integer) TO authenticated;