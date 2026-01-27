import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { sendResendEmail } from '../_shared/resend.ts'

type Json = Record<string, unknown>

function jsonResponse(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

serve(async (req: Request) => {
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

  const appUrl = Deno.env.get('APP_URL') ?? 'https://app.evernest.com/login'
  const subject = 'Additional verification needed for Evernest'
  const html = `<p>Thanks for submitting your verification document. We can’t approve it yet.</p>
<p><strong>Reason:</strong> ${reason.replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</p>
<p>Please sign in to upload an updated document.</p>
<p><a href="${appUrl}">Sign in to Evernest</a></p>`

  const result = await sendResendEmail({ to: heirUser.user.email, subject, html })

  return jsonResponse(200, { ok: true, email_result: result })
})
