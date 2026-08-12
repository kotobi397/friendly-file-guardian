DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE command ILIKE '%auto-generate-stories-worker%';
  END IF;
END $$;

DROP TABLE IF EXISTS public.story_chapters CASCADE;
DROP TABLE IF EXISTS public.user_stories CASCADE;
DROP TABLE IF EXISTS public.auto_story_config CASCADE;