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
