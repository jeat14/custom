insert into storage.buckets (id, name, public)
values ('proof-of-death', 'proof-of-death', false)
on conflict (id) do nothing;

create policy "heir_upload_proof_of_death_when_released"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'proof-of-death'
  and name ~ '^vault/[0-9a-f-]{36}/[0-9a-f-]{36}/'
  and split_part(name, '/', 3)::uuid = auth.uid()
  and exists (
    select 1
    from public.vaults v
    join public.vault_heirs h on h.vault_id = v.id
    where v.id = split_part(name, '/', 2)::uuid
      and v.deadman_status = 'released'
      and h.heir_user_id = auth.uid()
  )
);

create policy "heir_read_own_proof_of_death"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'proof-of-death'
  and name ~ '^vault/[0-9a-f-]{36}/[0-9a-f-]{36}/'
  and split_part(name, '/', 3)::uuid = auth.uid()
);

create policy "admin_read_all_proof_of_death"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'proof-of-death'
  and public.is_admin()
);

