create extension if not exists pgcrypto;

create table if not exists public.vault_verification_requests (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults(id) on delete cascade,
  heir_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  proof_of_death_path text null,
  reject_reason text null,
  decided_by uuid null references auth.users(id) on delete set null,
  decided_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vault_id, heir_user_id)
);

alter table public.vault_verification_requests enable row level security;

drop policy if exists "heir_upsert_own_verification_request" on public.vault_verification_requests;
create policy "heir_upsert_own_verification_request"
on public.vault_verification_requests
for insert
to authenticated
with check (
  heir_user_id = auth.uid()
  and public.is_vault_released(vault_id)
  and public.is_vault_heir(vault_id)
);

drop policy if exists "heir_update_own_pending_verification_request" on public.vault_verification_requests;
create policy "heir_update_own_pending_verification_request"
on public.vault_verification_requests
for update
to authenticated
using (
  heir_user_id = auth.uid()
)
with check (
  heir_user_id = auth.uid()
  and status = 'pending'
);

drop policy if exists "heir_select_own_verification_request" on public.vault_verification_requests;
create policy "heir_select_own_verification_request"
on public.vault_verification_requests
for select
to authenticated
using (heir_user_id = auth.uid());

drop policy if exists "admin_select_all_verification_requests" on public.vault_verification_requests;
create policy "admin_select_all_verification_requests"
on public.vault_verification_requests
for select
to authenticated
using (public.is_admin());

drop policy if exists "admin_update_verification_requests" on public.vault_verification_requests;
create policy "admin_update_verification_requests"
on public.vault_verification_requests
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

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
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    r.id as request_id,
    r.vault_id,
    v.owner_id,
    ou.email as owner_email,
    r.heir_user_id,
    hu.email as heir_email,
    r.status,
    r.proof_of_death_path,
    r.created_at
  from public.vault_verification_requests r
  join public.vaults v on v.id = r.vault_id
  left join auth.users ou on ou.id = v.owner_id
  left join auth.users hu on hu.id = r.heir_user_id
  where public.is_admin()
    and r.status = 'pending'
  order by r.created_at desc;
$$;

revoke all on function public.admin_pending_verifications() from public;
grant execute on function public.admin_pending_verifications() to authenticated;

create or replace function public.admin_approve_verification_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  update public.vault_verification_requests
  set status = 'approved',
      reject_reason = null,
      decided_by = auth.uid(),
      decided_at = now(),
      updated_at = now()
  where id = request_id;
end;
$$;

revoke all on function public.admin_approve_verification_request(uuid) from public;
grant execute on function public.admin_approve_verification_request(uuid) to authenticated;

create or replace function public.admin_reject_verification_request(request_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  update public.vault_verification_requests
  set status = 'rejected',
      reject_reason = reason,
      decided_by = auth.uid(),
      decided_at = now(),
      updated_at = now()
  where id = request_id;
end;
$$;

revoke all on function public.admin_reject_verification_request(uuid, text) from public;
grant execute on function public.admin_reject_verification_request(uuid, text) to authenticated;

