# Resend Setup (Demo/Prod)

Evernest sends emails from Supabase Edge Functions:

- `evaluate-switches` (deadman reminders + release notifications)
- `admin-verification-email` (rejection reason emails to heirs)
- `newsletter-signup` (lead magnet guide delivery)
- `weekly-guidance` (optional weekly reminder emails)

## Required Secrets

Set these as **Supabase Edge Function secrets** (Dashboard → Project Settings → Edge Functions → Secrets):

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

Optional:

- `APP_URL` (included in email bodies; recommended to point at your deployed app login URL)
- `RESEND_GUIDE_FROM_EMAIL` (override sender for the lead magnet guide email)
- `RESEND_WEEKLY_FROM_EMAIL` (override sender for weekly reminder emails)

## Notes

- The `from` address must be a sender/domain verified in Resend.
- For quick demos, Resend supports a test sender like `onboarding@resend.dev` (use a verified sender for production).
