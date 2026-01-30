create extension if not exists pgcrypto;

create table if not exists public.newsletter_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text generated always as (lower(trim(email))) stored,
  source text null,
  path text null,
  referrer text null,
  user_agent text null,
  created_at timestamptz not null default now()
);

create unique index if not exists newsletter_signups_email_normalized_key on public.newsletter_signups (email_normalized);

alter table public.newsletter_signups enable row level security;

drop policy if exists "newsletter_signups_anon_insert" on public.newsletter_signups;

drop policy if exists "newsletter_signups_admin_select" on public.newsletter_signups;
create policy "newsletter_signups_admin_select"
on public.newsletter_signups
for select
to authenticated
using (public.is_admin());
