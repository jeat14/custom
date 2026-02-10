alter table public.newsletter_signups
  add column if not exists weekly_opt_in boolean not null default false;

alter table public.newsletter_signups
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

alter table public.newsletter_signups
  add column if not exists unsubscribed_at timestamptz null;

alter table public.newsletter_signups
  add column if not exists last_weekly_sent_at timestamptz null;
