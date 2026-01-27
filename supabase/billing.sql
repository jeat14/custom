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

create table if not exists public.user_billing (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free',
  stripe_customer_id text null,
  stripe_subscription_id text null,
  subscription_status text null,
  current_period_end timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_billing enable row level security;

drop policy if exists "user_billing_select_own" on public.user_billing;
create policy "user_billing_select_own"
on public.user_billing
for select
using (auth.uid() = user_id);

drop policy if exists "admin_select_all_user_billing" on public.user_billing;
create policy "admin_select_all_user_billing"
on public.user_billing
for select
using (public.is_admin());

drop policy if exists "admin_update_user_billing" on public.user_billing;
create policy "admin_update_user_billing"
on public.user_billing
for update
using (public.is_admin())
with check (public.is_admin());
