import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { sendResendEmail } from '../_shared/resend.ts'

type Json = Record<string, unknown>

type SignupRow = {
  id: string
  email: string
  unsubscribe_token: string
}

function jsonResponse(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function emailShell(params: { title: string; bodyHtml: string; footerHtml: string }) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f4ef">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f6f4ef">
      <tr>
        <td align="center" style="padding:24px">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:560px;width:100%">
            <tr>
              <td style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#111827;font-size:14px;line-height:1.6">
                <div style="font-weight:800;letter-spacing:-0.2px;font-size:16px;margin:0 0 12px 0">Evernest</div>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;border:1px solid rgba(17,24,39,0.10);border-radius:14px;padding:18px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#111827;font-size:14px;line-height:1.65">
                <div style="font-size:16px;font-weight:750;letter-spacing:-0.2px;margin:0 0 10px 0">${escapeHtml(params.title)}</div>
                ${params.bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding-top:14px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#6b7280;font-size:12px;line-height:1.6">
                ${params.footerHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function weekIndex(nowMs: number) {
  const weekMs = 7 * 24 * 60 * 60 * 1000
  return Math.floor(nowMs / weekMs)
}

function unsubscribeUrl(params: { supabaseUrl: string; token: string }) {
  const base = params.supabaseUrl.replace(/\/$/, '')
  return `${base}/functions/v1/weekly-unsubscribe?token=${encodeURIComponent(params.token)}`
}

function guidanceTemplate(idx: number, appUrl: string) {
  const howItWorks = appUrl ? `${appUrl.replace(/\/$/, '')}/how-it-works` : 'https://alwaysnest.co.uk/how-it-works'
  const ukGuide = appUrl ? `${appUrl.replace(/\/$/, '')}/uk-guide` : 'https://alwaysnest.co.uk/uk-guide'

  const templates = [
    {
      subject: 'One thing most families forget to write down',
      title: 'One small thing that reduces a lot of stress',
      bodyHtml: `<p style="margin:0 0 12px 0;color:#374151">Most people assume their family “just knows” what to do. In reality, even close families guess — and guessing causes stress.</p>
<p style="margin:0 0 12px 0;color:#374151"><b>This week’s 2‑minute task:</b> write down where your primary email lives, and how someone could recover it (device, recovery codes, trusted contact).</p>
<p style="margin:0;color:#374151">If you want the simple checklist, it’s here: <a href="${escapeHtml(ukGuide)}" style="color:#0f3a2b;text-decoration:underline">open the guide</a>.</p>`,
    },
    {
      subject: 'If something happened tomorrow, would this be clear?',
      title: 'A quick question worth asking',
      bodyHtml: `<p style="margin:0 0 12px 0;color:#374151">If someone you trust had to handle your digital life tomorrow, would they know what exists — and what matters?</p>
<p style="margin:0 0 12px 0;color:#374151"><b>This week’s prompt:</b> list the 5 accounts that would cause the biggest stress if locked (email, phone, banking, utilities, crypto). Just the names — no passwords.</p>
<p style="margin:0;color:#374151">A calm overview of how Evernest works is here: <a href="${escapeHtml(howItWorks)}" style="color:#0f3a2b;text-decoration:underline">see how it works</a>.</p>`,
    },
    {
      subject: 'A small admin task that saves stress later',
      title: 'A tiny bit of admin, done calmly',
      bodyHtml: `<p style="margin:0 0 12px 0;color:#374151">The goal isn’t to be perfect. It’s to avoid leaving your family with a guessing game.</p>
<p style="margin:0 0 12px 0;color:#374151"><b>This week’s 2‑minute task:</b> put your recovery codes somewhere safe offline (not in a shared email).</p>
<p style="margin:0;color:#374151">If you need the checklist again: <a href="${escapeHtml(ukGuide)}" style="color:#0f3a2b;text-decoration:underline">open the guide</a>.</p>`,
    },
    {
      subject: 'One gentle reminder about passwords after death',
      title: 'Passwords after death (a calm reminder)',
      bodyHtml: `<p style="margin:0 0 12px 0;color:#374151">Most families aren’t prepared for the digital side of loss: accounts, devices, subscriptions, and “where is that login?”</p>
<p style="margin:0 0 12px 0;color:#374151"><b>This week’s prompt:</b> choose one person you trust, and write down what you’d want them to have access to (and what you wouldn’t).</p>
<p style="margin:0;color:#374151">If you want a simple starting point: <a href="${escapeHtml(ukGuide)}" style="color:#0f3a2b;text-decoration:underline">open the guide</a>.</p>`,
    },
  ]

  return templates[idx % templates.length]
}

serve(async (req: Request) => {
  const isHead = req.method === 'HEAD'
  const respond = (status: number, body: Json) =>
    isHead ? new Response(null, { status, headers: { 'Content-Type': 'application/json' } }) : jsonResponse(status, body)

  if (req.method !== 'POST' && req.method !== 'GET' && req.method !== 'HEAD') return respond(405, { error: 'Method not allowed' })

  const cronToken = (Deno.env.get('WEEKLY_GUIDANCE_CRON_TOKEN') ?? '').trim()
  const authHeader = (req.headers.get('authorization') ?? '').trim()
  const xCronToken = (req.headers.get('x-cron-token') ?? req.headers.get('x-evernest-cron-token') ?? '').trim()
  const url = new URL(req.url)
  const queryToken = (url.searchParams.get('token') ?? '').trim()
  const dryRun = (url.searchParams.get('dry_run') ?? '').trim() === '1'

  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''
  const authorized =
    (!!cronToken && bearer === cronToken) ||
    (!!cronToken && xCronToken === cronToken) ||
    (!!cronToken && queryToken === cronToken)

  if (!authorized) return respond(401, { error: 'Unauthorized' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return respond(500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const startedAt = new Date()
  const appUrl = (Deno.env.get('APP_URL') ?? '').trim()
  const from = (Deno.env.get('RESEND_WEEKLY_FROM_EMAIL') ?? '').trim()
  const now = new Date()
  const cutoff = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
  const template = guidanceTemplate(weekIndex(now.getTime()), appUrl)

  const { data: candidates, error } = await supabase
    .from('newsletter_signups')
    .select('id,email,unsubscribe_token')
    .is('unsubscribed_at', null)
    .eq('weekly_opt_in', true)
    .or(`last_weekly_sent_at.is.null,last_weekly_sent_at.lt.${cutoff.toISOString()}`)
    .order('created_at', { ascending: true })
    .limit(500)

  if (error) return respond(500, { error: 'Failed to load recipients', details: String((error as any)?.message ?? error) })

  const rows = (candidates ?? []) as SignupRow[]
  let sent = 0
  let skipped = 0
  const failures: Array<{ id: string; email: string; error: string }> = []

  for (const row of rows) {
    const unsub = unsubscribeUrl({ supabaseUrl, token: row.unsubscribe_token })
    const footerHtml = `Evernest • Calm weekly reminder • <a href="${escapeHtml(unsub)}" style="color:#6b7280;text-decoration:underline">Unsubscribe</a>`

    if (dryRun) {
      skipped += 1
      continue
    }

    const result = await sendResendEmail({
      to: row.email,
      subject: template.subject,
      html: emailShell({ title: template.title, bodyHtml: template.bodyHtml, footerHtml }),
      text: `${template.title}\n\nTo unsubscribe: ${unsub}`,
      ...(from ? { from } : {}),
    })

    if ((result as any)?.ok) {
      sent += 1
      await supabase.from('newsletter_signups').update({ last_weekly_sent_at: now.toISOString() }).eq('id', row.id)
      continue
    }

    if ((result as any)?.skipped) {
      failures.push({ id: row.id, email: row.email, error: `Missing env: ${((result as any)?.missing ?? []).join(',')}` })
      continue
    }

    failures.push({
      id: row.id,
      email: row.email,
      error: `Resend error status=${String((result as any)?.status ?? '')}`,
    })
  }

  return respond(200, {
    ok: true,
    dry_run: dryRun,
    attempted: rows.length,
    sent,
    skipped,
    failures,
    template: { subject: template.subject, title: template.title },
    started_at: startedAt.toISOString(),
    finished_at: new Date().toISOString(),
  })
})

