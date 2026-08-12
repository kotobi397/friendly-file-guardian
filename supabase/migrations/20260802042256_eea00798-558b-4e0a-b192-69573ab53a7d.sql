CREATE TABLE public.site_update_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id uuid NOT NULL REFERENCES public.site_updates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (update_id, user_id, emoji)
);

CREATE INDEX idx_site_update_reactions_update ON public.site_update_reactions(update_id);

GRANT SELECT ON public.site_update_reactions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_update_reactions TO authenticated;
GRANT ALL ON public.site_update_reactions TO service_role;

ALTER TABLE public.site_update_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view update reactions"
ON public.site_update_reactions FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Users can add their own reactions"
ON public.site_update_reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own reactions"
ON public.site_update_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);