# Evernest (alwaysnest.co.uk) — Project Spec

## Product
- Evernest is a zero-knowledge “digital estate” vault with heir handover and a duty-of-care safeguard.
- The landing site is at `https://alwaysnest.co.uk`.

## UI/UX Rules
- Always provide an obvious way back to Home (Back button or Home link) on non-home pages.
- Keep trust-building links visible, but avoid duplicate primary CTAs (one “primary” version, others secondary).
- Keep wording calm, minimal, and reassuring; prefer short, clear sentences.

## Admin Access Rules
- Never expose admin routes via public/global navigation.
- Admin entry points may appear only when the user is confirmed admin (via `rpc('is_admin')`), e.g. an “Admin” button next to the signed-in email.
- All admin data access must remain server-enforced (RLS and/or SECURITY DEFINER functions).

## Newsletter / Lead Capture
- Landing page uses a newsletter popup to capture emails before visitors leave.
- Emails are stored in Supabase `public.newsletter_signups`.
- RLS:
  - Allow anonymous inserts only.
  - Allow reads only for admins (`public.is_admin()`).

## Branding / Icons
- Ensure favicon and touch icons are present and correctly served:
  - `favicon.ico`, `favicon-48x48.png`, `apple-touch-icon.png`, Android icons, and `site.webmanifest`.

## Engineering Guardrails
- Never commit secrets (keys/tokens) or log sensitive data.
- Prefer smallest changes that match existing code style (inline styles are used widely in UI).
- Verify changes with a production build before deploy.

