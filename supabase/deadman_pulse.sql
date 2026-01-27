alter table public.vaults
  add column if not exists deadman_status text not null default 'active';

alter table public.vaults
  add column if not exists pending_release_started_at timestamptz null;

alter table public.vaults
  add column if not exists pending_release_expires_at timestamptz null;

alter table public.vaults
  add column if not exists pending_release_owner_emailed_at timestamptz null;

alter table public.vaults
  add column if not exists pending_release_cancelled_at timestamptz null;

drop function if exists public.evaluate_deadman_switch_pulse();
create or replace function public.evaluate_deadman_switch_pulse()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.evaluate_deadman_switch();

  update public.vaults
  set deadman_status = 'pending_release',
      pending_release_started_at = coalesce(pending_release_started_at, now()),
      pending_release_expires_at = coalesce(pending_release_expires_at, now() + interval '24 hours')
  where deadman_status = 'released'
    and (pending_release_expires_at is null or pending_release_expires_at > now());

  update public.vaults
  set deadman_status = 'released'
  where deadman_status = 'pending_release'
    and pending_release_cancelled_at is null
    and pending_release_expires_at is not null
    and pending_release_expires_at <= now();
end;
$$;

revoke all on function public.evaluate_deadman_switch_pulse() from public;
grant execute on function public.evaluate_deadman_switch_pulse() to service_role;

drop function if exists public.cancel_pending_release();
create or replace function public.cancel_pending_release()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.vaults
  set deadman_status = 'active',
      pending_release_cancelled_at = now(),
      pending_release_started_at = null,
      pending_release_expires_at = null,
      pending_release_owner_emailed_at = null
  where owner_id = auth.uid()
    and deadman_status = 'pending_release';
end;
$$;

revoke all on function public.cancel_pending_release() from public;
grant execute on function public.cancel_pending_release() to authenticated;
