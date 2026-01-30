create extension if not exists pgcrypto;

create table if not exists public.support_inbox_emails (
  id uuid primary key default gen_random_uuid(),
  email_id uuid not null,
  received_at timestamptz null,
  from_address text null,
  to_addresses jsonb null,
  subject text null,
  html text null,
  text text null,
  headers jsonb null,
  attachments jsonb null,
  raw_download_url text null,
  raw_expires_at timestamptz null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists support_inbox_emails_email_id_key on public.support_inbox_emails (email_id);

alter table public.support_inbox_emails enable row level security;

drop policy if exists "support_inbox_emails_admin_select" on public.support_inbox_emails;
create policy "support_inbox_emails_admin_select"
on public.support_inbox_emails
for select
to authenticated
using (public.is_admin());

drop policy if exists "support_inbox_emails_admin_update" on public.support_inbox_emails;
create policy "support_inbox_emails_admin_update"
on public.support_inbox_emails
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "support_inbox_emails_admin_delete" on public.support_inbox_emails;
create policy "support_inbox_emails_admin_delete"
on public.support_inbox_emails
for delete
to authenticated
using (public.is_admin());

