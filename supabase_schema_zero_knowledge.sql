create extension if not exists pgcrypto;

create table if not exists public.vaults (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kdf_params jsonb not null,
  vault_ciphertext jsonb not null,
  owner_wrapped_dek jsonb not null,
  deadman_status text not null default 'active',
  last_checkin_at timestamptz not null default now(),
  gentle_after interval not null default interval '180 days',
  pending_after interval not null default interval '190 days',
  release_after interval not null default interval '194 days',
  released_at timestamptz null,
  gentle_emailed_at timestamptz null,
  warning_emailed_at timestamptz null,
  release_owner_emailed_at timestamptz null,
  release_heirs_emailed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id)
);

create table if not exists public.vault_heirs (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults(id) on delete cascade,
  heir_user_id uuid not null references auth.users(id) on delete cascade,
  share_b_package jsonb not null,
  created_at timestamptz not null default now(),
  unique(vault_id, heir_user_id)
);

create table if not exists public.vault_server_shares (
  vault_id uuid primary key references public.vaults(id) on delete cascade,
  share_a_b64 text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_key_material (
  user_id uuid primary key references auth.users(id) on delete cascade,
  heir_ecdh_public_jwk jsonb not null,
  heir_ecdh_private_wrapped jsonb not null,
  kdf_params jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vaults enable row level security;
alter table public.vault_heirs enable row level security;
alter table public.vault_server_shares enable row level security;
alter table public.user_key_material enable row level security;

create table if not exists public.heir_relationships (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults(id) on delete cascade,
  heir_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  rejection_reason text null,
  approved_at timestamptz null,
  approved_by uuid null references auth.users(id) on delete set null,
  rejected_at timestamptz null,
  rejected_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(vault_id, heir_user_id)
);

alter table public.heir_relationships enable row level security;

create policy "vault_owner_all"
on public.vaults
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "vault_heir_select_released" on public.vaults;

create policy "vault_heir_select_released"
on public.vaults
for select
using (
  deadman_status = 'released'
  and exists (
    select 1 from public.vault_heirs h
    where h.vault_id = vaults.id and h.heir_user_id = auth.uid()
  )
  and exists (
    select 1 from public.heir_relationships hr
    where hr.vault_id = vaults.id
      and hr.heir_user_id = auth.uid()
      and hr.status = 'approved'
  )
);

create policy "vault_heirs_owner_all"
on public.vault_heirs
for all
using (
  exists (
    select 1 from public.vaults v
    where v.id = vault_heirs.vault_id and v.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.vaults v
    where v.id = vault_heirs.vault_id and v.owner_id = auth.uid()
  )
);

create policy "vault_heirs_heir_select_released"
on public.vault_heirs
for select
using (
  heir_user_id = auth.uid()
  and exists (
    select 1 from public.vaults v
    where v.id = vault_heirs.vault_id and v.deadman_status = 'released'
  )
);

create policy "vault_server_shares_owner_all"
on public.vault_server_shares
for all
using (
  exists (
    select 1 from public.vaults v
    where v.id = vault_server_shares.vault_id and v.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.vaults v
    where v.id = vault_server_shares.vault_id and v.owner_id = auth.uid()
  )
);

drop policy if exists "vault_server_shares_heir_select_released" on public.vault_server_shares;

create policy "vault_server_shares_heir_select_released"
on public.vault_server_shares
for select
using (
  exists (
    select 1
    from public.vaults v
    join public.vault_heirs h on h.vault_id = v.id
    join public.heir_relationships hr on hr.vault_id = v.id and hr.heir_user_id = h.heir_user_id
    where v.id = vault_server_shares.vault_id
      and v.deadman_status = 'released'
      and h.heir_user_id = auth.uid()
      and hr.status = 'approved'
  )
);

create policy "user_key_material_self_all"
on public.user_key_material
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.vault_checkin(vault_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.vaults
  set last_checkin_at = now(),
      updated_at = now(),
      deadman_status = case when deadman_status = 'released' then 'released' else 'active' end
  where id = vault_id and owner_id = auth.uid();
end;
$$;

revoke all on function public.vault_checkin(uuid) from public;
grant execute on function public.vault_checkin(uuid) to authenticated;

create or replace function public.check_in()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.vaults
  set last_checkin_at = now(),
      updated_at = now(),
      deadman_status = case when deadman_status = 'released' then 'released' else 'active' end
  where owner_id = auth.uid();
end;
$$;

revoke all on function public.check_in() from public;
grant execute on function public.check_in() to authenticated;

create or replace function public.evaluate_deadman_switch()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.vaults
  set deadman_status = 'pending',
      updated_at = now()
  where deadman_status = 'active'
    and now() > (last_checkin_at + pending_after)
    and now() <= (last_checkin_at + release_after);

  update public.vaults
  set deadman_status = 'released',
      released_at = coalesce(released_at, now()),
      updated_at = now()
  where deadman_status <> 'released'
    and now() > (last_checkin_at + release_after);
end;
$$;

revoke all on function public.evaluate_deadman_switch() from public;
grant execute on function public.evaluate_deadman_switch() to service_role;

drop function if exists public.deadman_candidates();

create or replace function public.deadman_email_candidates()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  gentle jsonb;
  warning jsonb;
  release jsonb;
begin
  select coalesce(
    jsonb_agg(
      jsonb_build_object('vault_id', id, 'owner_id', owner_id)
    ),
    '[]'::jsonb
  )
  into gentle
  from public.vaults
  where deadman_status = 'active'
    and gentle_emailed_at is null
    and now() > (last_checkin_at + gentle_after)
    and now() <= (last_checkin_at + pending_after);

  select coalesce(
    jsonb_agg(
      jsonb_build_object('vault_id', id, 'owner_id', owner_id)
    ),
    '[]'::jsonb
  )
  into warning
  from public.vaults
  where deadman_status = 'pending'
    and warning_emailed_at is null
    and now() > (last_checkin_at + pending_after)
    and now() <= (last_checkin_at + release_after);

  select coalesce(
    jsonb_agg(
      jsonb_build_object('vault_id', id, 'owner_id', owner_id)
    ),
    '[]'::jsonb
  )
  into release
  from public.vaults
  where deadman_status = 'released'
    and (release_owner_emailed_at is null or release_heirs_emailed_at is null)
    and now() > (last_checkin_at + release_after);

  return jsonb_build_object(
    'gentle', gentle,
    'warning', warning,
    'release', release
  );
end;
$$;

revoke all on function public.deadman_email_candidates() from public;
grant execute on function public.deadman_email_candidates() to service_role;

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_admins a
    where a.user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create policy "admin_select_self"
on public.app_admins
for select
using (public.is_admin() and user_id = auth.uid());

create table if not exists public.vault_verification_requests (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults(id) on delete cascade,
  heir_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'verification_required',
  proof_of_death_path text not null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  reviewed_by uuid null references auth.users(id) on delete set null,
  admin_notes text null,
  unique(vault_id, heir_user_id)
);

alter table public.vault_verification_requests enable row level security;

create policy "heir_insert_verification_when_released"
on public.vault_verification_requests
for insert
with check (
  heir_user_id = auth.uid()
  and exists (
    select 1
    from public.vaults v
    join public.vault_heirs h on h.vault_id = v.id
    where v.id = vault_verification_requests.vault_id
      and v.deadman_status = 'released'
      and h.heir_user_id = auth.uid()
  )
);

create policy "heir_select_own_requests"
on public.vault_verification_requests
for select
using (heir_user_id = auth.uid());

create policy "admin_select_all_requests"
on public.vault_verification_requests
for select
using (public.is_admin());

create policy "admin_update_requests"
on public.vault_verification_requests
for update
using (public.is_admin())
with check (public.is_admin());

create policy "heir_relationships_select_own"
on public.heir_relationships
for select
using (heir_user_id = auth.uid());

create policy "admin_select_all_heir_relationships"
on public.heir_relationships
for select
using (public.is_admin());

create policy "admin_update_heir_relationships"
on public.heir_relationships
for update
using (public.is_admin())
with check (public.is_admin());

create or replace function public.admin_approve_verification_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.vault_verification_requests%rowtype;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select * into r
  from public.vault_verification_requests
  where id = request_id
  for update;

  if r.id is null then
    raise exception 'request not found';
  end if;

  update public.vault_verification_requests
  set status = 'approved',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      admin_notes = null
  where id = request_id;

  insert into public.heir_relationships (vault_id, heir_user_id, status, approved_at, approved_by, updated_at)
  values (r.vault_id, r.heir_user_id, 'approved', now(), auth.uid(), now())
  on conflict (vault_id, heir_user_id) do update
  set status = 'approved',
      rejection_reason = null,
      approved_at = now(),
      approved_by = auth.uid(),
      rejected_at = null,
      rejected_by = null,
      updated_at = now();
end;
$$;

revoke all on function public.admin_approve_verification_request(uuid) from public;
grant execute on function public.admin_approve_verification_request(uuid) to authenticated;

create or replace function public.admin_reject_verification_request(request_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.vault_verification_requests%rowtype;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select * into r
  from public.vault_verification_requests
  where id = request_id
  for update;

  if r.id is null then
    raise exception 'request not found';
  end if;

  update public.vault_verification_requests
  set status = 'rejected',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      admin_notes = reason
  where id = request_id;

  insert into public.heir_relationships (vault_id, heir_user_id, status, rejection_reason, rejected_at, rejected_by, updated_at)
  values (r.vault_id, r.heir_user_id, 'rejected', reason, now(), auth.uid(), now())
  on conflict (vault_id, heir_user_id) do update
  set status = 'rejected',
      rejection_reason = reason,
      rejected_at = now(),
      rejected_by = auth.uid(),
      approved_at = null,
      approved_by = null,
      updated_at = now();
end;
$$;

revoke all on function public.admin_reject_verification_request(uuid, text) from public;
grant execute on function public.admin_reject_verification_request(uuid, text) to authenticated;

create or replace function public.ensure_heir_relationship_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.heir_relationships (vault_id, heir_user_id, status, updated_at)
  values (new.vault_id, new.heir_user_id, 'pending', now())
  on conflict (vault_id, heir_user_id) do update
  set updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ensure_heir_relationship_pending on public.vault_verification_requests;
create trigger trg_ensure_heir_relationship_pending
after insert on public.vault_verification_requests
for each row
execute function public.ensure_heir_relationship_pending();

create or replace function public.admin_pending_verifications()
returns table (
  request_id uuid,
  vault_id uuid,
  owner_id uuid,
  owner_email text,
  heir_user_id uuid,
  heir_email text,
  status text,
  proof_of_death_path text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
  select
    r.id as request_id,
    r.vault_id,
    v.owner_id,
    u_owner.email as owner_email,
    r.heir_user_id,
    u_heir.email as heir_email,
    r.status,
    r.proof_of_death_path,
    r.created_at
  from public.vault_verification_requests r
  join public.vaults v on v.id = r.vault_id
  join auth.users u_owner on u_owner.id = v.owner_id
  join auth.users u_heir on u_heir.id = r.heir_user_id
  where v.deadman_status = 'released'
    and r.status = 'verification_required'
  order by r.created_at asc;
end;
$$;

revoke all on function public.admin_pending_verifications() from public;
grant execute on function public.admin_pending_verifications() to authenticated;

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
