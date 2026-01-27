create or replace function public.is_vault_owner(vault_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vaults v
    where v.id = vault_id
      and v.owner_id = auth.uid()
  );
$$;

revoke all on function public.is_vault_owner(uuid) from public;
grant execute on function public.is_vault_owner(uuid) to authenticated;

create or replace function public.is_vault_released(vault_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vaults v
    where v.id = vault_id
      and v.deadman_status = 'released'
  );
$$;

revoke all on function public.is_vault_released(uuid) from public;
grant execute on function public.is_vault_released(uuid) to authenticated;

create or replace function public.is_vault_heir(vault_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vault_heirs h
    where h.vault_id = vault_id
      and h.heir_user_id = auth.uid()
  );
$$;

revoke all on function public.is_vault_heir(uuid) from public;
grant execute on function public.is_vault_heir(uuid) to authenticated;

create or replace function public.is_vault_verified_heir(vault_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if to_regclass('public.vault_verification_requests') is null then
    return false;
  end if;
  return exists (
    select 1
zzcs      and r.status = 'approved'
  );
end;
$$;

revoke all on function public.is_vault_verified_heir(uuid) from public;
grant execute on function public.is_vault_verified_heir(uuid) to authenticated;

do $$
declare
  r record;
begin
  for r in (
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vaults'
  ) loop
    execute format('drop policy if exists %I on public.vaults', r.policyname);
  end loop;
end
$$;

alter table public.vaults enable row level security;

create policy "vault_owner_all"
on public.vaults
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "vault_heir_read_released"
on public.vaults
for select
using (
  public.is_vault_released(id)
  and public.is_vault_verified_heir(id)
);

do $$
declare
  r record;
begin
  if to_regclass('public.vault_heirs') is null then
    return;
  end if;
  for r in (
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vault_heirs'
  ) loop
    execute format('drop policy if exists %I on public.vault_heirs', r.policyname);
  end loop;
end
$$;

do $$
begin
  if to_regclass('public.vault_heirs') is null then
    return;
  end if;
  execute 'alter table public.vault_heirs enable row level security';
end
$$;

do $$
begin
  if to_regclass('public.vault_heirs') is null then
    return;
  end if;
  execute $sql$
    create policy "vault_heirs_owner_manage"
    on public.vault_heirs
    for all
    using (public.is_vault_owner(vault_id))
    with check (public.is_vault_owner(vault_id))
  $sql$;
end
$$;

do $$
begin
  if to_regclass('public.vault_heirs') is null then
    return;
  end if;
  execute $sql$
    create policy "vault_heirs_heir_read_released"
    on public.vault_heirs
    for select
    using (
      auth.uid() = heir_user_id
      and public.is_vault_released(vault_id)
    )
  $sql$;
end
$$;

do $$
declare
  r record;
begin
  if to_regclass('public.vault_server_shares') is null then
    return;
  end if;
  for r in (
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'vault_server_shares'
  ) loop
    execute format('drop policy if exists %I on public.vault_server_shares', r.policyname);
  end loop;
end
$$;

do $$
begin
  if to_regclass('public.vault_server_shares') is null then
    return;
  end if;
  execute 'alter table public.vault_server_shares enable row level security';
end
$$;

do $$
begin
  if to_regclass('public.vault_server_shares') is null then
    return;
  end if;
  execute $sql$
    create policy "vault_server_shares_owner_manage"
    on public.vault_server_shares
    for all
    using (public.is_vault_owner(vault_id))
    with check (public.is_vault_owner(vault_id))
  $sql$;
end
$$;

do $$
begin
  if to_regclass('public.vault_server_shares') is null then
    return;
  end if;
  execute $sql$
    create policy "vault_server_shares_heir_read_released"
    on public.vault_server_shares
    for select
    using (
      public.is_vault_released(vault_id)
      and public.is_vault_verified_heir(vault_id)
    )
  $sql$;
end
$$;

do $$
declare
  r record;
begin
  if to_regclass('public.user_key_material') is null then
    return;
  end if;
  for r in (
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_key_material'
  ) loop
    execute format('drop policy if exists %I on public.user_key_material', r.policyname);
  end loop;
end
$$;

do $$
begin
  if to_regclass('public.user_key_material') is null then
    return;
  end if;
  execute 'alter table public.user_key_material enable row level security';
  execute $sql$
    create policy "user_key_material_own_all"
    on public.user_key_material
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id)
  $sql$;
end
$$;
