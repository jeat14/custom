# Evernest (alwaysnest.co.uk) — Project Spec

## Product
- Evernest is a zero-knowledge “digital estate” vault with heir handover and a duty-of-care safeguard.
- The landing site is at `https://alwaysnest.co.uk`.

## UI/UX Rules
- Always provide an obvious way back to Home (Back button or Home link) on non-home pages.
- Keep trust-building links visible, but avoid duplicate primary CTAs (one “primary” version, others secondary).
- Keep wording calm, minimal, and reassuring; prefer short, clear sentences.

## Launch Priorities (Day 7)
- Prioritize clarity over complexity: ship a simple “How it works” narrative page.
- Prefer real UI visuals over stock: use screenshots or UI previews to prove the product works.
- Add a 10-second demo video on “How it works” (served from `frontend/public/how-it-works-demo.mp4`).
- Add security badges near Step 1 to create immediate trust cues.
- Keep steps benefit-driven:
  - Secure your legacy (store what matters, encrypted).
  - Duty-of-care guard (safe check-in logic, no instant compromise).
  - Heir handover (verification before access).
- Emphasize recovery kit constraints: store offline; Evernest cannot reset the Vault Password.
- Autoplay note: browsers only allow autoplay when the video is muted; users can unmute via controls.
- Audio note: the page shows an explicit Unmute control so users can enable sound after interaction.

## Admin Access Rules
- Never expose admin routes via public/global navigation.
- Admin entry points may appear only when the user is confirmed admin (via `rpc('is_admin')`), e.g. an “Admin” button next to the signed-in email.
- All admin data access must remain server-enforced (RLS and/or SECURITY DEFINER functions).

## Newsletter / Lead Capture
- Landing page uses a newsletter popup to capture emails before visitors leave.
- Emails are stored in Supabase `public.newsletter_signups`.
- Anti-spam:
  - Use Cloudflare Turnstile on the client.
  - Submit via Supabase Edge Function `newsletter-signup` (server-side insert using service role).
  - Do not allow direct anon inserts into `public.newsletter_signups` (drop the anon insert policy).
- Required secrets / env:
  - Vercel: `VITE_TURNSTILE_SITE_KEY`
  - Supabase Functions secret: `TURNSTILE_SECRET_KEY`
- Admin operations:
  - Provide an admin-only Newsletter page (`/admin/newsletter`) with Copy/Download CSV.
  - Allow reads only for admins (`public.is_admin()`).
- Security headers:
  - CSP must allow Turnstile (`https://challenges.cloudflare.com`) in `script-src`, `frame-src`, and `connect-src`.

## Email Receiving (Resend Inbound)
- Resend can receive emails via a Resend-managed inbound address (`<anything>@<id>.resend.app`) or a custom domain (MX records).
- Configure a Resend webhook for `email.received` pointing at Supabase Edge Function `resend-inbound-email`.
- Webhook security:
  - Verify Svix signature headers using `RESEND_WEBHOOK_SECRET` (Supabase Edge Function secret).
- Storage:
  - Received emails are fetched via Resend Receiving API and stored in `public.support_inbox_emails`.
  - RLS allows admin-only reads/updates/deletes (`public.is_admin()`).

## Branding / Icons
- Ensure favicon and touch icons are present and correctly served:
  - `favicon.ico`, `favicon-48x48.png`, `apple-touch-icon.png`, Android icons, and `site.webmanifest`.

## Engineering Guardrails
- Never commit secrets (keys/tokens) or log sensitive data.
- Prefer smallest changes that match existing code style (inline styles are used widely in UI).
- Verify changes with a production build before deploy.
