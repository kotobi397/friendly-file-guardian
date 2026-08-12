CREATE OR REPLACE FUNCTION public.is_book_requests_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.user_id = _user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_book_requests_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_book_requests_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_book_requests_admin(uuid) TO service_role;

DROP POLICY IF EXISTS book_requests_admin_all ON public.book_requests;

CREATE POLICY book_requests_admin_select
ON public.book_requests
FOR SELECT
TO authenticated
USING (public.is_book_requests_admin(auth.uid()));

CREATE POLICY book_requests_admin_update
ON public.book_requests
FOR UPDATE
TO authenticated
USING (public.is_book_requests_admin(auth.uid()))
WITH CHECK (public.is_book_requests_admin(auth.uid()));

CREATE POLICY book_requests_admin_delete
ON public.book_requests
FOR DELETE
TO authenticated
USING (public.is_book_requests_admin(auth.uid()));