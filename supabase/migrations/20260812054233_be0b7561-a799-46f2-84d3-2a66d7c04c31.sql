select cron.unschedule('noor-review-queue-every-10-min') where exists (select 1 from cron.job where jobname = 'noor-review-queue-every-10-min');

select cron.schedule(
  'noor-review-queue-every-10-min',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://kydmyxsgyxeubhmqzrgo.supabase.co/functions/v1/auto-discover-noor-worker',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"processQueue": true, "max": 12}'::jsonb
  );
  $$
);