import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { sendResendEmail } from '../_shared/resend.ts'

type Json = Record<string, unknown>

type CandidateRow = {
  vault_id: string
  owner_id: string
}

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

function jsonResponse(status: number, body: Json) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

serve(async (req: Request) => {
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' })

  const cronToken = Deno.env.get('EVALUATE_SWITCHES_CRON_TOKEN')
  const authHeader = req.headers.get('authorization') ?? ''
  if (!cronToken || authHeader !== `Bearer ${cronToken}`) {
    return jsonResponse(401, { error: 'Unauthorized' })
  }

  const url = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' })
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error: evalErr } = await supabase.rpc('evaluate_deadman_switch_pulse')
  if (evalErr) return jsonResponse(500, { error: evalErr.message })

  const { data: candidates, error: candidatesErr } = await supabase.rpc('deadman_email_candidates')
  if (candidatesErr) return jsonResponse(500, { error: candidatesErr.message })

  const appUrl = Deno.env.get('APP_URL') ?? ''

  const gentle = (candidates?.gentle ?? []) as CandidateRow[]
  const warning = (candidates?.warning ?? []) as CandidateRow[]
  const release = (candidates?.release ?? []) as CandidateRow[]

  const gentleEmailResults: Array<{ vault_id: string; owner_id: string; result: unknown }> = []
  for (const row of gentle) {
    const { data, error } = await supabase.auth.admin.getUserById(row.owner_id)
    if (error || !data?.user?.email) {
      gentleEmailResults.push({
        vault_id: row.vault_id,
        owner_id: row.owner_id,
        result: { ok: false, error: error?.message ?? 'No email' },
      })
      continue
    }

    const email = data.user.email
    const signInUrl = appUrl ? `${appUrl.replace(/\/$/, '')}/vault` : ''
    const subject = 'Quick check-in reminder from Evernest'
    const html = emailShell({
      title: 'Quick check-in reminder',
      bodyHtml: `<p>If you’re able, please sign in and check in. This helps keep your vault private and prevents accidental handover.</p>${
        signInUrl ? `<p>${linkHtml(signInUrl, 'Sign in')}</p>` : ''
      }`,
      appUrl,
    })
    const text = `Quick check-in reminder.\n\nIf you’re able, please sign in and check in.\n${signInUrl ? `\nSign in: ${signInUrl}\n` : ''}`
    const result = await sendResendEmail({ to: email, subject, html, text })
    gentleEmailResults.push({ vault_id: row.vault_id, owner_id: row.owner_id, result })

    if ((result as any)?.ok || (result as any)?.skipped) {
      await supabase
        .from('vaults')
        .update({ gentle_emailed_at: new Date().toISOString() })
        .eq('id', row.vault_id)
    }
  }

  const warningEmailResults: Array<{ vault_id: string; owner_id: string; result: unknown }> = []
  for (const row of warning) {
    const { data, error } = await supabase.auth.admin.getUserById(row.owner_id)
    if (error || !data?.user?.email) {
      warningEmailResults.push({
        vault_id: row.vault_id,
        owner_id: row.owner_id,
        result: { ok: false, error: error?.message ?? 'No email' },
      })
      continue
    }

    const email = data.user.email
    const signInUrl = appUrl ? `${appUrl.replace(/\/$/, '')}/vault` : ''
    const subject = 'Important: please confirm you’re OK'
    const html = emailShell({
      title: 'Please confirm you’re OK',
      bodyHtml: `<p>We haven’t received a check-in within the required timeframe.</p>
<p>If you’re OK and want to keep everything private, please sign in and check in.</p>${
        signInUrl ? `<p>${linkHtml(signInUrl, 'Sign in & check in')}</p>` : ''
      }`,
      appUrl,
    })
    const text = `Please confirm you’re OK.\n\nWe haven’t received a check-in within the required timeframe.\n${
      signInUrl ? `\nSign in & check in: ${signInUrl}\n` : ''
    }`
    const result = await sendResendEmail({ to: email, subject, html, text })
    warningEmailResults.push({ vault_id: row.vault_id, owner_id: row.owner_id, result })

    if ((result as any)?.ok || (result as any)?.skipped) {
      await supabase
        .from('vaults')
        .update({ warning_emailed_at: new Date().toISOString() })
        .eq('id', row.vault_id)
    }
  }

  const { data: pulseRows, error: pulseErr } = await supabase
    .from('vaults')
    .select('id,owner_id,pending_release_expires_at,pending_release_owner_emailed_at')
    .eq('deadman_status', 'pending_release')
    .is('pending_release_owner_emailed_at', null)

  if (pulseErr) return jsonResponse(500, { error: pulseErr.message })

  const pulseEmailResults: Array<{ vault_id: string; owner_id: string; result: unknown }> = []
  for (const row of (pulseRows ?? []) as any[]) {
    const vaultId = (row as any).id as string
    const ownerId = (row as any).owner_id as string
    const expiresAt = (row as any).pending_release_expires_at as string | null

    const { data, error } = await supabase.auth.admin.getUserById(ownerId)
    if (error || !data?.user?.email) {
      pulseEmailResults.push({ vault_id: vaultId, owner_id: ownerId, result: { ok: false, error: error?.message ?? 'No email' } })
      continue
    }

    const cancelUrl = appUrl ? `${appUrl.replace(/\/$/, '')}/vault?cancelRelease=1` : ''
    const subject = 'Release started — cancel within 24 hours if needed'
    const html = emailShell({
      title: 'Release started',
      bodyHtml: `<p>A release request has been initiated for your Evernest vault.</p>
<p>If this is a mistake, you have <strong>24 hours</strong> to cancel.</p>
${expiresAt ? `<p>Deadline: <strong>${escapeHtml(expiresAt)}</strong></p>` : ''}${
        cancelUrl ? `<p>${linkHtml(cancelUrl, 'Cancel release')}</p>` : ''
      }`,
      appUrl,
    })
    const text = `Release started.\n\nA release request has been initiated for your Evernest vault.\nIf this is a mistake, you have 24 hours to cancel.\n${
      expiresAt ? `Deadline: ${expiresAt}\n` : ''
    }${cancelUrl ? `Cancel: ${cancelUrl}\n` : ''}`

    const result = await sendResendEmail({ to: data.user.email, subject, html, text })
    pulseEmailResults.push({ vault_id: vaultId, owner_id: ownerId, result })

    if ((result as any)?.ok || (result as any)?.skipped) {
      await supabase
        .from('vaults')
        .update({ pending_release_owner_emailed_at: new Date().toISOString() })
        .eq('id', vaultId)
    }
  }

  const releaseEmailResults: Array<{ vault_id: string; owner_id: string; owner_result?: unknown; heir_results?: unknown[] }> = []
  for (const row of release) {
    const { data: vaultRow } = await supabase
      .from('vaults')
      .select('id, owner_id, release_owner_emailed_at, release_heirs_emailed_at')
      .eq('id', row.vault_id)
      .maybeSingle()

    const entry: { vault_id: string; owner_id: string; owner_result?: unknown; heir_results?: unknown[] } = {
      vault_id: row.vault_id,
      owner_id: row.owner_id,
    }

    if (vaultRow && !vaultRow.release_owner_emailed_at) {
      const { data: ownerData, error: ownerErr } = await supabase.auth.admin.getUserById(row.owner_id)
      if (!ownerErr && ownerData?.user?.email) {
        const signInUrl = appUrl ? `${appUrl.replace(/\/$/, '')}/vault` : ''
        const subject = 'Your vault is now released'
        const html = emailShell({
          title: 'Your vault is now released',
          bodyHtml: `<p>We haven’t received a check-in within the required timeframe, so your vault has moved to released status.</p>${
            signInUrl ? `<p>${linkHtml(signInUrl, 'Sign in')}</p>` : ''
          }`,
          appUrl,
        })
        const text = `Your vault is now released.\n\nWe haven’t received a check-in within the required timeframe, so your vault has moved to released status.\n${
          signInUrl ? `\nSign in: ${signInUrl}\n` : ''
        }`
        entry.owner_result = await sendResendEmail({ to: ownerData.user.email, subject, html, text })
        if ((entry.owner_result as any)?.ok || (entry.owner_result as any)?.skipped) {
          await supabase
            .from('vaults')
            .update({ release_owner_emailed_at: new Date().toISOString() })
            .eq('id', row.vault_id)
        }
      } else {
        entry.owner_result = { ok: false, error: ownerErr?.message ?? 'No email' }
      }
    }

    if (vaultRow && !vaultRow.release_heirs_emailed_at) {
      const { data: heirs, error: heirsErr } = await supabase
        .from('vault_heirs')
        .select('heir_user_id')
        .eq('vault_id', row.vault_id)

      if (heirsErr) {
        entry.heir_results = [{ ok: false, error: heirsErr.message }]
      } else {
        const heirResults: unknown[] = []
        for (const h of heirs ?? []) {
          const heirUserId = (h as any).heir_user_id as string | undefined
          if (!heirUserId) continue
          const { data: heirData, error: heirErr } = await supabase.auth.admin.getUserById(heirUserId)
          if (heirErr || !heirData?.user?.email) {
            heirResults.push({ ok: false, heir_user_id: heirUserId, error: heirErr?.message ?? 'No email' })
            continue
          }
          const heirUrl = appUrl ? `${appUrl.replace(/\/$/, '')}/heir` : ''
          const subject = 'You have been entrusted as a digital guardian'
          const html = emailShell({
            title: 'You have been entrusted as a digital guardian',
            bodyHtml: `<p>You have been designated as a digital guardian for someone’s legacy.</p>
<p>To proceed, sign in and follow the verification steps. Access is only granted after a duty-of-care review.</p>${
              heirUrl ? `<p>${linkHtml(heirUrl, 'Open Heir Handover')}</p>` : ''
            }`,
            appUrl,
          })
          const text = `You have been entrusted as a digital guardian.\n\nSign in and follow the verification steps. Access is only granted after a duty-of-care review.\n${
            heirUrl ? `\nOpen: ${heirUrl}\n` : ''
          }`
          const result = await sendResendEmail({ to: heirData.user.email, subject, html, text })
          heirResults.push({ heir_user_id: heirUserId, result })
        }

        entry.heir_results = heirResults

        await supabase
          .from('vaults')
          .update({ release_heirs_emailed_at: new Date().toISOString() })
          .eq('id', row.vault_id)
      }
    }

    releaseEmailResults.push(entry)
  }

  return jsonResponse(200, {
    ok: true,
    gentle_candidates: gentle.length,
    warning_candidates: warning.length,
    release_candidates: release.length,
    gentle_email_attempts: gentleEmailResults.length,
    warning_email_attempts: warningEmailResults.length,
    release_email_attempts: releaseEmailResults.length,
    pulse_candidates: (pulseRows ?? []).length,
    pulse_email_attempts: pulseEmailResults.length,
    gentle_email_results: gentleEmailResults,
    warning_email_results: warningEmailResults,
    pulse_email_results: pulseEmailResults,
    release_email_results: releaseEmailResults,
  })
})
