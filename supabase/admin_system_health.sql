create table if not exists public.system_job_runs (
  id bigserial primary key,
  job_name text not null,
  ok boolean not null default true,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  detail jsonb not null default '{}'::jsonb
);

create index if not exists system_job_runs_job_name_started_at_idx
  on public.system_job_runs (job_name, started_at desc);

create or replace function public.admin_system_health()
returns jsonb
language plpgsql
security definer
set search_path = public, cron
as $$
declare
  has_pg_cron boolean := to_regclass('cron.job_run_details') is not null and to_regclass('cron.job') is not null;
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  if not has_pg_cron then
    select jsonb_build_object(
      'cron_available', false,
      'job', jsonb_build_object(
        'jobname', 'daily_evaluate_deadman_switches',
        'schedule', null,
        'active', true
      ),
      'last_run', (
        select jsonb_build_object(
          'status', case when r.ok then 'succeeded' else 'failed' end,
          'start_time', r.started_at,
          'end_time', r.finished_at,
          'return_message', coalesce(r.detail->>'message', null)
        )
        from public.system_job_runs r
        where r.job_name = 'daily_evaluate_deadman_switches'
        order by r.started_at desc
        limit 1
      ),
      'counts_7d', (
        select jsonb_build_object(
          'success', count(*) filter (where r.ok),
          'failed', count(*) filter (where not r.ok)
        )
        from public.system_job_runs r
        where r.job_name = 'daily_evaluate_deadman_switches'
          and r.started_at > now() - interval '7 days'
      )
    ) into result;

    return coalesce(result, jsonb_build_object('cron_available', false));
  end if;

  select jsonb_build_object(
    'cron_available', true,
    'job', (
      select jsonb_build_object(
        'jobname', j.jobname,
        'schedule', j.schedule,
        'active', j.active
      )
      from cron.job j
      where j.jobname = 'daily_evaluate_deadman_switches'
      limit 1
    ),
    'last_run', (
      select jsonb_build_object(
        'status', d.status,
        'start_time', d.start_time,
        'end_time', d.end_time,
        'return_message', d.return_message
      )
      from cron.job_run_details d
      join cron.job j on j.jobid = d.jobid
      where j.jobname = 'daily_evaluate_deadman_switches'
      order by d.start_time desc
      limit 1
    ),
    'counts_7d', (
      select jsonb_build_object(
        'success', count(*) filter (where lower(d.status) = 'succeeded'),
        'failed', count(*) filter (where lower(d.status) <> 'succeeded')
      )
      from cron.job_run_details d
      join cron.job j on j.jobid = d.jobid
      where j.jobname = 'daily_evaluate_deadman_switches'
        and d.start_time > now() - interval '7 days'
    )
  ) into result;

  return coalesce(result, jsonb_build_object('cron_available', true));
end;
$$;

revoke all on function public.admin_system_health() from public;
grant execute on function public.admin_system_health() to authenticated;
