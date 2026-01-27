# Stripe Setup (Supabase Edge Functions)

This repo uses Stripe via Supabase Edge Functions:

- `stripe-checkout`: creates a Checkout Session for the signed-in user
- `stripe-webhook`: receives Stripe webhooks and updates `public.user_billing`

## Database

Run this SQL in Supabase SQL Editor:

- `supabase/billing.sql`

## Required Edge Secrets

Set these as **Supabase Edge Function secrets**:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL` (your deployed app URL, e.g. https://app.evernest.com)
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_PRO`
- `STRIPE_WEBHOOK_SECRET`

## Webhook Endpoint

Create a webhook endpoint in Stripe pointing to:

- `https://<PROJECT_REF>.functions.supabase.co/stripe-webhook`

Enable events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

