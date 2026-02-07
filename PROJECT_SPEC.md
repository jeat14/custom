# Evernest (alwaysnest.co.uk) — Project Spec

## Product
- Evernest is a zero-knowledge “digital estate” vault with heir handover and a duty-of-care safeguard.
- The landing site is at `https://alwaysnest.co.uk`.

## UI/UX Rules
- Always provide an obvious way back to Home (Back button or Home link) on non-home pages.
- Keep trust-building links visible, but avoid duplicate primary CTAs (one “primary” version, others secondary).
- Keep wording calm, minimal, and reassuring; prefer short, clear sentences.

## Trust Signals
- Keep the Trustpilot widget in the footer as a lightweight trust cue (do not remove unless explicitly requested).
- Keep a simple, non-technical trust sentence on the homepage (e.g., “Built to help families safely store and pass on important digital information.”).
- Keep a small copyright line at the bottom of the footer (e.g., “© {year} Evernest”).

## Launch Priorities (Day 7)
- Prioritize clarity over complexity: ship a simple “How it works” narrative page.
- Prefer real UI visuals over stock: use screenshots or UI previews to prove the product works.
- Avoid heavy media that can cause lag (no demo video on landing/How it works); use static visuals instead.
- Add security badges near Step 1 to create immediate trust cues.
- Keep steps benefit-driven:
  - Secure your legacy (store what matters, encrypted).
  - Duty-of-care guard (safe check-in logic, no instant compromise).
  - Heir handover (verification before access).
- Emphasize recovery kit constraints: store offline; Evernest cannot reset the Vault Password.

## Admin Access Rules
- Never expose admin routes via public/global navigation.
- Admin entry points may appear only when the user is confirmed admin (via `rpc('is_admin')`), e.g. an “Admin” button next to the signed-in email.
- All admin data access must remain server-enforced (RLS and/or SECURITY DEFINER functions).

## Lead Magnet / Email Capture
- Landing page uses a popup to capture emails as one-time help (avoid “newsletter/updates/stay in touch” language).
- Offer: “Free UK guide: Protect your important digital documents”.
- Deliver the guide immediately via email after signup; link to `/uk-guide` (or override via `LEAD_MAGNET_GUIDE_URL`).
- Emails are stored in Supabase `public.newsletter_signups`.
- Status: popup is currently disabled for acquisition traffic; prefer the self-check flow on `/digital-estate-planning`.
- Debug: force open via `?popup=1`.
- Anti-spam:
  - Use Cloudflare Turnstile on the client.
  - Keep Turnstile enabled but visually de-emphasized (hidden until CTA click; compact).
  - Submit via Supabase Edge Function `newsletter-signup` (server-side insert using service role).
  - Do not allow direct anon inserts into `public.newsletter_signups` (drop the anon insert policy).
- Required secrets / env:
  - Vercel: `VITE_TURNSTILE_SITE_KEY`
  - Supabase Functions secret: `TURNSTILE_SECRET_KEY`
  - Supabase Functions secrets (outbound email): `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (optional: `RESEND_REPLY_TO_EMAIL`)
- Admin operations:
  - Provide an admin-only Newsletter page (`/admin/newsletter`) with Copy/Download CSV.
  - Allow reads only for admins (`public.is_admin()`).
- Security headers:
  - CSP must allow Turnstile (`https://challenges.cloudflare.com`) in `script-src`, `frame-src`, and `connect-src`.

## Google Ads Landing Pages
- Use dedicated, focused pages for search ads; do not route through the global AppLayout header/footer.
- Structure rules:
  - No header navigation
  - No footer navigation
  - No popups
  - One primary CTA only
- Page: `/digital-estate-planning`
  - Goal: convert high-intent UK search traffic to one action (request the free UK guide).
  - CTA flow:
    - First ask is help/insight (2-minute self-check)
    - Email comes after the user sees their result (guide delivery is the outcome)
    - Add a one-line reassurance right before the email field (email used only to send the guide; never store passwords)
  - H1: “Digital estate planning for UK families”
  - Fear-anchored subheadline: “What happens to your passwords, crypto, and online accounts if something happens to you?”
  - Core reassurance line: “Store passwords, documents, and instructions securely — so your family can access what matters when they need it, without guessing or delays.”
  - Trust cues near CTA:
    - Add one short “why trust this?” line above CTA
    - Add a “what happens after I click?” line under CTA
    - Clearly differentiate from password managers (“not a password manager — designed for emergency and end-of-life access”)
    - Include one specificity anchor in security copy (e.g. client-side encryption, publicly documented model, UK-based)
  - FAQ ordering:
    - Put “Can Evernest access my data?” first
  - Tracking:
    - Capture UTMs on load and on CTA click
    - Track a single conversion event (guide request)
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

## Google Ads Tag (gtag.js)
- Google Ads account tag ID: `AW-17938298248`.
- Install the Google tag once in `frontend/index.html`, immediately after the opening `<head>` tag.
- Do not add multiple Google tags/scripts; reuse the existing `window.gtag` for SPA page views and future conversions.
- CSP must allow:
  - `https://www.googletagmanager.com` (script)
  - `https://www.googleadservices.com`, `https://googleads.g.doubleclick.net`, `https://stats.g.doubleclick.net`, `https://www.doubleclick.net` (requests/pixels)
