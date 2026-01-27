import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

type Json = Record<string, unknown>

function jsonResponse(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function parseStripeSigHeader(sigHeader: string) {
  const parts = sigHeader.split(',').map((s) => s.trim())
  let timestamp = ''
  const signatures: string[] = []
  for (const p of parts) {
    const [k, v] = p.split('=')
    if (!k || !v) continue
    if (k === 't') timestamp = v
    if (k === 'v1') signatures.push(v)
  }
  return { timestamp, signatures }
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqualHex(a: string, b: string) {
  const aa = a.toLowerCase()
  const bb = b.toLowerCase()
  if (aa.length !== bb.length) return false
  let out = 0
  for (let i = 0; i < aa.length; i++) out |= aa.charCodeAt(i) ^ bb.charCodeAt(i)
  return out === 0
}

async function hmacSha256Hex(secret: string, data: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return toHex(new Uint8Array(sig))
}

async function verifyStripeSignature(params: { payload: string; sigHeader: string; secret: string }) {
  const { timestamp, signatures } = parseStripeSigHeader(params.sigHeader)
  if (!timestamp || !signatures.length) return false
  const signedPayload = `${timestamp}.${params.payload}`
  const expected = await hmacSha256Hex(params.secret, signedPayload)
  return signatures.some((s) => timingSafeEqualHex(s, expected))
}

type StripeEvent = {
  id: string
  type: string
  data: { object: any }
}

function toTimestamptzFromUnixSeconds(sec: unknown) {
  const n = typeof sec === 'number' ? sec : typeof sec === 'string' ? Number(sec) : NaN
  if (!Number.isFinite(n)) return null
  return new Date(n * 1000).toISOString()
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!webhookSecret) return jsonResponse(500, { error: 'Missing STRIPE_WEBHOOK_SECRET' })

  const sigHeader = req.headers.get('stripe-signature') ?? ''
  const payload = await req.text()
  const ok = await verifyStripeSignature({ payload, sigHeader, secret: webhookSecret })
  if (!ok) return jsonResponse(400, { error: 'Invalid signature' })

  const event = (JSON.parse(payload) as StripeEvent) ?? null
  if (!event?.type) return jsonResponse(400, { error: 'Invalid event' })

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const writeBilling = async (row: {
    user_id: string
    plan: string
    stripe_customer_id?: string | null
    stripe_subscription_id?: string | null
    subscription_status?: string | null
    current_period_end?: string | null
  }) => {
    const { error } = await supabase.from('user_billing').upsert({
      user_id: row.user_id,
      plan: row.plan,
      stripe_customer_id: row.stripe_customer_id ?? null,
      stripe_subscription_id: row.stripe_subscription_id ?? null,
      subscription_status: row.subscription_status ?? null,
      current_period_end: row.current_period_end ?? null,
      updated_at: new Date().toISOString(),
    })
    if (error) throw new Error(error.message)
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object ?? {}
      const userId = (s.client_reference_id || s.metadata?.user_id) as string | undefined
      if (userId) {
        await writeBilling({
          user_id: userId,
          plan: 'pro',
          stripe_customer_id: s.customer ?? null,
          stripe_subscription_id: s.subscription ?? null,
          subscription_status: 'active',
          current_period_end: null,
        })
      }
    }

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const sub = event.data.object ?? {}
      const userId = (sub.metadata?.user_id || sub.client_reference_id) as string | undefined
      if (userId) {
        const status = (sub.status as string | undefined) ?? null
        const plan = status === 'active' || status === 'trialing' ? 'pro' : 'free'
        await writeBilling({
          user_id: userId,
          plan,
          stripe_customer_id: sub.customer ?? null,
          stripe_subscription_id: sub.id ?? null,
          subscription_status: status,
          current_period_end: toTimestamptzFromUnixSeconds(sub.current_period_end),
        })
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object ?? {}
      const userId = (sub.metadata?.user_id || sub.client_reference_id) as string | undefined
      if (userId) {
        await writeBilling({
          user_id: userId,
          plan: 'free',
          stripe_customer_id: sub.customer ?? null,
          stripe_subscription_id: sub.id ?? null,
          subscription_status: (sub.status as string | undefined) ?? 'canceled',
          current_period_end: toTimestamptzFromUnixSeconds(sub.current_period_end),
        })
      }
    }

    return jsonResponse(200, { ok: true })
  } catch (e: any) {
    return jsonResponse(500, { error: e?.message ?? 'Webhook handler error' })
  }
})

