DO $$
DECLARE tbl record;
BEGIN
  FOR tbl IN SELECT c.relname AS t FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE c.relkind='r' AND n.nspname='public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.t);
  END LOOP;
END $$;

GRANT SELECT ON public.book_submissions TO anon;
GRANT SELECT ON public.authors TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.book_reviews TO anon;
GRANT SELECT ON public.book_stats TO anon;
GRANT SELECT ON public.quotes TO anon;
GRANT SELECT ON public.book_likes TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.books TO anon;
GRANT SELECT ON public.author_cards TO anon;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;