ALTER TABLE public.bulk_upload_queue
  ADD COLUMN IF NOT EXISTS source_description text,
  ADD COLUMN IF NOT EXISTS source_author_bio text,
  ADD COLUMN IF NOT EXISTS source_author_image_url text;