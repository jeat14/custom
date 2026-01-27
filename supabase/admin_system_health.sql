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
    return jsonb_build_object('cron_available', false);
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

