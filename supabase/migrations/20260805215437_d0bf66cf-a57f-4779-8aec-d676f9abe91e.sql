GRANT SELECT ON public.book_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_requests TO authenticated;
GRANT ALL ON public.book_requests TO service_role;

GRANT SELECT ON public.book_request_votes TO anon;
GRANT SELECT, INSERT, DELETE ON public.book_request_votes TO authenticated;
GRANT ALL ON public.book_request_votes TO service_role;