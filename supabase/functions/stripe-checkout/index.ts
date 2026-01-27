import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

type Json = Record<string, unknown>

function corsHeaders(req?: Request): Record<string, string> {
  const requested = req?.headers.get('access-control-request-headers') ?? ''
  const allowHeaders =
    requested.trim() ||
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-version, x-user-jwt'
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': allowHeaders,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function jsonResponse(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
}

function encodeForm(data: Record<string, string>) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(data)) params.set(k, v)
  return params.toString()
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

  const explicitUserJwt = (req.headers.get('x-user-jwt') ?? '').trim()
  const authHeader = req.headers.get('authorization') ?? ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : ''
  const token = explicitUserJwt || bearer
  if (!token) return jsonResponse(401, { error: 'Unauthorized' })

  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  const priceId = Deno.env.get('STRIPE_PRICE_ID_PRO')
  const appUrl = Deno.env.get('APP_URL')
  if (!stripeKey || !priceId || !appUrl) {
    return jsonResponse(500, { error: 'Missing STRIPE_SECRET_KEY, STRIPE_PRICE_ID_PRO, or APP_URL' })
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: tokenUser, error: tokenErr } = await supabase.auth.getUser(token)
  if (tokenErr || !tokenUser?.user) return jsonResponse(401, { error: 'Unauthorized' })

  const userId = tokenUser.user.id
  const email = tokenUser.user.email ?? ''

  const body = (await req.json().catch(() => null)) as null | { success_url?: string; cancel_url?: string }
  const successUrl = body?.success_url?.trim() || `${appUrl.replace(/\/$/, '')}/vault?checkout=success`
  const cancelUrl = body?.cancel_url?.trim() || `${appUrl.replace(/\/$/, '')}/vault?checkout=cancel`

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: encodeForm({
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      allow_promotion_codes: 'true',
      client_reference_id: userId,
      'metadata[user_id]': userId,
      ...(email ? { customer_email: email } : {}),
      'subscription_data[metadata][user_id]': userId,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return jsonResponse(500, { error: 'Stripe error', status: res.status, body: text })
  }

  const data = (await res.json().catch(() => null)) as null | { url?: string }
  const checkoutUrl = data?.url
  if (!checkoutUrl) return jsonResponse(500, { error: 'Missing checkout url from Stripe' })

  return jsonResponse(200, { url: checkoutUrl })
})
