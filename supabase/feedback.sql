create extension if not exists pgcrypto;

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

create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  page text null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.user_feedback enable row level security;

drop policy if exists "user_feedback_insert_own" on public.user_feedback;
create policy "user_feedback_insert_own"
on public.user_feedback
for insert
with check (auth.uid() = user_id);

drop policy if exists "user_feedback_select_own" on public.user_feedback;
create policy "user_feedback_select_own"
on public.user_feedback
for select
using (auth.uid() = user_id);

drop policy if exists "admin_select_all_user_feedback" on public.user_feedback;
create policy "admin_select_all_user_feedback"
on public.user_feedback
for select
using (public.is_admin());
