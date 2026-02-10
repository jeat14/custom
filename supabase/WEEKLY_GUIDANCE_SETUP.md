# Weekly Reminder Emails (Setup)

This repo supports a calm weekly reminder email for users who explicitly opt in.

## 1) Apply DB changes

Run the SQL in:

- `supabase/weekly_guidance.sql`

It adds:
- `weekly_opt_in` (default false)
- `unsubscribe_token`
- `unsubscribed_at`
- `last_weekly_sent_at`

## 2) Deploy Edge Functions

Deploy these Supabase Edge Functions:

- `weekly-guidance` (sends the weekly email)
- `weekly-unsubscribe` (one-click unsubscribe link)

## 3) Set Supabase Edge Function secrets

In Supabase Dashboard → Project Settings → Edge Functions → Secrets:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `APP_URL` (recommended: `https://alwaysnest.co.uk`)
- `WEEKLY_GUIDANCE_CRON_TOKEN` (generate a strong random token)

Optional:
- `RESEND_WEEKLY_FROM_EMAIL` (override sender just for weekly emails)

## 4) Set GitHub Action secrets (for scheduling)

You have two simple options:

### Option A (simplest): any cron service

Schedule a weekly request to:

`https://<project-ref>.supabase.co/functions/v1/weekly-guidance?token=<WEEKLY_GUIDANCE_CRON_TOKEN>`

Use GET or POST. This works with basic cron services because the token can be passed via query string.

### Option B: GitHub Actions

Create a workflow file at `.github/workflows/weekly-guidance.yml` that runs weekly and calls the function.

Note: pushing workflow files requires GitHub credentials with `workflow` scope. If your token doesn’t have that scope, add the file via the GitHub UI.

## 5) Dry run

Call the function with `dry_run=1` (it will select recipients and return counts, but won’t send):

- `POST /functions/v1/weekly-guidance?dry_run=1&token=<WEEKLY_GUIDANCE_CRON_TOKEN>`
