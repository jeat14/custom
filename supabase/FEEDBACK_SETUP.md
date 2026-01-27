# Feedback Setup

The in-app feedback widget writes to `public.user_feedback`.

1) Run this SQL in Supabase SQL Editor:

- `supabase/feedback.sql`

2) Ensure RLS is enabled (the script does this) and that admins are allowlisted in `public.app_admins` to read all feedback.

