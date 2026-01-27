import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { sendResendEmail } from '../_shared/resend.ts'

type Json = Record<string, unknown>

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function linkHtml(href: string, label: string) {
  const safeHref = escapeHtml(href)
  const safeLabel = escapeHtml(label)
  return `<a href="${safeHref}">${safeLabel}</a>`
}

function supportUrl(appUrl: string) {
  if (!appUrl) return ''
  return `${appUrl.replace(/\/$/, '')}/support`
}

function emailShell(params: { title: string; bodyHtml: string; appUrl: string }) {
  const support = supportUrl(params.appUrl)
  const footer = support
    ? `<hr /><p style="color:rgba(31,41,55,0.75);font-size:13px;line-height:1.6">Need help? ${linkHtml(
        support,
        'Contact Support'
      )}</p>`
    : `<hr /><p style="color:rgba(31,41,55,0.75);font-size:13px;line-height:1.6">Need help? Reply to this email.</p>`
  return `<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.6">
<h2 style="margin:0 0 12px 0">${escapeHtml(params.title)}</h2>
${params.bodyHtml}
${footer}
</div>`
}

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

  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : ''
  if (!token) return jsonResponse(401, { error: 'Unauthorized' })

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: tokenUser, error: tokenErr } = await supabase.auth.getUser(token)
  if (tokenErr || !tokenUser?.user) return jsonResponse(401, { error: 'Unauthorized' })

  const adminId = tokenUser.user.id
  const { data: adminRow, error: adminErr } = await supabase
    .from('app_admins')
    .select('user_id')
    .eq('user_id', adminId)
    .maybeSingle()

  if (adminErr || !adminRow) return jsonResponse(403, { error: 'Forbidden' })

  const body = (await req.json().catch(() => null)) as null | { request_id?: string; reason?: string }
  const requestId = body?.request_id
  const reason = body?.reason?.trim() ?? ''
  if (!requestId || !reason) return jsonResponse(400, { error: 'Missing request_id or reason' })

  const { data: requestRow, error: requestErr } = await supabase
    .from('vault_verification_requests')
    .select('id, vault_id, heir_user_id, status')
    .eq('id', requestId)
    .maybeSingle()

  if (requestErr || !requestRow) return jsonResponse(404, { error: 'Request not found' })

  const { data: heirUser, error: heirErr } = await supabase.auth.admin.getUserById(requestRow.heir_user_id)
  if (heirErr || !heirUser?.user?.email) return jsonResponse(500, { error: 'Heir email not available' })

  const appUrl = Deno.env.get('APP_URL') ?? ''
  const heirUrl = appUrl ? `${appUrl.replace(/\/$/, '')}/heir` : ''
  const subject = 'Additional verification needed for Evernest'
  const safeReason = escapeHtml(reason)
  const html = emailShell({
    title: 'Additional verification needed',
    bodyHtml: `<p>Thanks for submitting your verification document. We can’t approve it yet.</p>
<p><strong>Reason:</strong> ${safeReason}</p>
<p>Please sign in to upload an updated document.</p>${heirUrl ? `<p>${linkHtml(heirUrl, 'Open Heir Handover')}</p>` : ''}`,
    appUrl,
  })
  const text = `Additional verification needed.\n\nReason: ${reason}\n\nPlease sign in to upload an updated document.\n${
    heirUrl ? `\nOpen Heir Handover: ${heirUrl}\n` : ''
  }`

  const result = await sendResendEmail({ to: heirUser.user.email, subject, html, text })

  return jsonResponse(200, { ok: true, email_result: result })
})
