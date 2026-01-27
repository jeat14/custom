# evaluate-switches environment

Set these secrets in Supabase (Edge Function secrets):

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- EVALUATE_SWITCHES_CRON_TOKEN
- RESEND_API_KEY (optional; enables warning emails)
- RESEND_FROM_EMAIL (optional; required if RESEND_API_KEY is set)
- APP_URL (optional; included in email body; recommended: https://app.evernest.com/login)

Invoke the function with either:
- Authorization: Bearer <EVALUATE_SWITCHES_CRON_TOKEN>
or
- X-CRON-TOKEN: <EVALUATE_SWITCHES_CRON_TOKEN>
