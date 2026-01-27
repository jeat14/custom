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
  const appUrl = Deno.env.get('APP_URL')
  if (!stripeKey || !appUrl) {
    return jsonResponse(500, { error: 'Missing STRIPE_SECRET_KEY or APP_URL' })
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: tokenUser, error: tokenErr } = await supabase.auth.getUser(token)
  if (tokenErr || !tokenUser?.user) return jsonResponse(401, { error: 'Unauthorized' })

  const userId = tokenUser.user.id
  const { data: billingRow, error: billingErr } = await supabase
    .from('user_billing')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (billingErr) return jsonResponse(500, { error: billingErr.message })
  const customerId = (billingRow as any)?.stripe_customer_id as string | undefined
  if (!customerId) return jsonResponse(400, { error: 'Billing not initialized for user' })

  const body = (await req.json().catch(() => null)) as null | { return_url?: string }
  const returnUrl = body?.return_url?.trim() || `${appUrl.replace(/\/$/, '')}/vault`

  const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: encodeForm({
      customer: customerId,
      return_url: returnUrl,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return jsonResponse(500, { error: 'Stripe error', status: res.status, body: text })
  }

  const data = (await res.json().catch(() => null)) as null | { url?: string }
  const portalUrl = data?.url
  if (!portalUrl) return jsonResponse(500, { error: 'Missing portal url from Stripe' })

  return jsonResponse(200, { url: portalUrl })
})

