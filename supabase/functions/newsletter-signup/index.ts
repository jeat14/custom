import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { sendResendEmail } from '../_shared/resend.ts'

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

function looksLikeEmail(raw: string) {
  const addr = raw.trim().toLowerCase()
  if (!addr) return false
  if (addr.length > 320) return false
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function guideUrl() {
  const explicit = (Deno.env.get('LEAD_MAGNET_GUIDE_URL') ?? '').trim()
  if (explicit) return explicit
  const appUrl = (Deno.env.get('APP_URL') ?? '').trim()
  if (!appUrl) return 'https://alwaysnest.co.uk/uk-guide'
  return `${appUrl.replace(/\/$/, '')}/uk-guide`
}

function guideEmailHtml(url: string) {
  const link = escapeHtml(url)
  return `<div style="margin:0;padding:0;background:#f6f4ef">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.6;color:#111827">
      <div style="font-weight:800;letter-spacing:-0.2px;font-size:16px;margin:0 0 12px 0">Evernest</div>
      <div style="background:#ffffff;border:1px solid rgba(17,24,39,0.10);border-radius:14px;padding:18px">
        <h2 style="margin:0 0 10px 0;font-size:18px;letter-spacing:-0.2px">Your free UK guide</h2>
        <p style="margin:0 0 14px 0;color:#374151">Here’s the guide you requested. You can open it instantly using the button below.</p>
        <div style="margin:0 0 14px 0">
          <a href="${link}" style="display:inline-block;background:#0f3a2b;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:700;font-size:14px">Open the guide</a>
        </div>
        <p style="margin:0 0 12px 0;color:#6b7280;font-size:13px;line-height:1.6">If the button doesn’t work, use this link: <a href="${link}" style="color:#0f3a2b;text-decoration:underline">${link}</a></p>
        <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6">If you didn’t request this, you can ignore this email.</p>
      </div>
      <div style="margin-top:14px;color:#6b7280;font-size:12px;line-height:1.6">
        Evernest • Secure, zero-knowledge vaulting for your digital estate
      </div>
    </div>
  </div>
</div>`
}

async function verifyTurnstile(token: string, remoteIp?: string | null) {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secret) return { ok: false, error: 'Missing TURNSTILE_SECRET_KEY' }

  const form = new URLSearchParams()
  form.set('secret', secret)
  form.set('response', token)
  if (remoteIp) form.set('remoteip', remoteIp)

  const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })

  const data = (await resp.json().catch(() => null)) as null | { success?: boolean }
  if (!resp.ok || !data?.success) return { ok: false, error: 'Verification failed' }
  return { ok: true }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
  }

  const body = (await req.json().catch(() => null)) as null | {
    email?: string
    token?: string
    source?: string | null
    path?: string | null
    referrer?: string | null
    user_agent?: string | null
  }

  const email = (body?.email ?? '').trim().toLowerCase()
  const token = (body?.token ?? '').trim()
  if (!looksLikeEmail(email)) return jsonResponse(400, { error: 'Invalid email' })
  if (!token) return jsonResponse(400, { error: 'Missing token' })

  const remoteIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip')?.trim() ??
    null

  const verify = await verifyTurnstile(token, remoteIp)
  if (!verify.ok) return jsonResponse(400, { error: verify.error ?? 'Verification failed' })

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error } = await supabase.from('newsletter_signups').insert({
    email,
    source: body?.source ?? null,
    path: body?.path ?? null,
    referrer: body?.referrer ?? null,
    user_agent: body?.user_agent ?? null,
  })

  const duplicate = Boolean(error && (error as any).code === '23505')
  if (error && !duplicate) return jsonResponse(500, { error: 'Failed to save signup' })

  const urlForGuide = guideUrl()
  const guideFrom = (Deno.env.get('RESEND_GUIDE_FROM_EMAIL') ?? '').trim()
  const sendResult = await sendResendEmail({
    to: email,
    subject: 'Your free UK guide: Protect your important digital documents',
    html: guideEmailHtml(urlForGuide),
    text: `Your free UK guide is here: ${urlForGuide}`,
    ...(guideFrom ? { from: guideFrom } : {}),
  })

  if ((sendResult as any)?.ok) return jsonResponse(200, { ok: true, duplicate, email_sent: true })
  if ((sendResult as any)?.skipped) {
    return jsonResponse(200, { ok: true, duplicate, email_sent: false, email_skipped: true, email_missing: (sendResult as any).missing })
  }

  const emailErrorStatus = (sendResult as any)?.status
  const emailErrorBody = String((sendResult as any)?.body ?? '')
  const emailErrorBodyTruncated = emailErrorBody.length > 600 ? emailErrorBody.slice(0, 600) : emailErrorBody
  return jsonResponse(200, { ok: true, duplicate, email_sent: false, email_error_status: emailErrorStatus, email_error_body: emailErrorBodyTruncated })
})
