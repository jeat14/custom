import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { Webhook } from 'https://esm.sh/svix@1.33.0'

type Json = Record<string, unknown>

function corsHeaders(req?: Request): Record<string, string> {
  const requested = req?.headers.get('access-control-request-headers') ?? ''
  const allowHeaders =
    requested.trim() ||
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-version'
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

async function fetchReceivedEmail(emailId: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY')?.trim() ?? ''
  if (!apiKey) return { ok: false as const, error: 'Missing RESEND_API_KEY' }

  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return { ok: false as const, error: 'Resend API error', status: res.status, body: text }
  }

  const data = (await res.json().catch(() => null)) as any
  if (!data) return { ok: false as const, error: 'Invalid Resend response' }
  return { ok: true as const, data }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(req) })
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
  }

  const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET')?.trim() ?? ''
  if (!webhookSecret) return jsonResponse(500, { error: 'Missing RESEND_WEBHOOK_SECRET' })

  const payload = await req.text().catch(() => '')
  if (!payload) return jsonResponse(400, { error: 'Missing payload' })

  const svixId = req.headers.get('svix-id') ?? ''
  const svixTimestamp = req.headers.get('svix-timestamp') ?? ''
  const svixSignature = req.headers.get('svix-signature') ?? ''
  if (!svixId || !svixTimestamp || !svixSignature) return jsonResponse(400, { error: 'Missing signature headers' })

  let event: any
  try {
    const wh = new Webhook(webhookSecret)
    event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    } as any)
  } catch {
    return jsonResponse(400, { error: 'Invalid webhook' })
  }

  if (event?.type !== 'email.received') return jsonResponse(200, { ok: true, ignored: true })

  const emailId = event?.data?.email_id as string | undefined
  if (!emailId) return jsonResponse(400, { error: 'Missing email_id' })

  const received = await fetchReceivedEmail(emailId)
  if (!received.ok) {
    return jsonResponse(502, {
      error: received.error,
      ...(received.status ? { status: received.status } : {}),
    })
  }

  const email = received.data
  const record = {
    email_id: email.id,
    received_at: email.created_at ?? null,
    from_address: email.from ?? null,
    to_addresses: email.to ?? null,
    subject: email.subject ?? null,
    html: email.html ?? null,
    text: email.text ?? null,
    headers: email.headers ?? null,
    attachments: email.attachments ?? null,
    raw_download_url: email.raw?.download_url ?? null,
    raw_expires_at: email.raw?.expires_at ?? null,
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error } = await supabase.from('support_inbox_emails').upsert(record, { onConflict: 'email_id' })
  if (error) return jsonResponse(500, { error: 'Failed to save email' })

  return jsonResponse(200, { ok: true })
})

