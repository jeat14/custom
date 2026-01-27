create extension if not exists pg_cron;
create extension if not exists pg_net;

select
  cron.schedule(
    'evaluate-deadman-switch-daily',
    '0 0 * * *',
    $$
    select net.http_post(
      url := 'https://your-project-ref.functions.supabase.co/evaluate-switches',
      headers := jsonb_build_object('Authorization', 'Bearer ' || 'YOUR_CRON_TOKEN')
    );
    $$
  );

