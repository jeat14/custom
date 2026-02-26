/// <reference path="../deno.d.ts" />
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function page(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:24px;background:#f6f4ef;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;color:#111827;line-height:1.6">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid rgba(17,24,39,0.10);border-radius:14px;padding:18px">
      <div style="font-weight:800;letter-spacing:-0.2px;margin:0 0 10px 0">Evernest</div>
      <h2 style="margin:0 0 10px 0;font-size:18px;letter-spacing:-0.2px">${escapeHtml(title)}</h2>
      ${body}
      <div style="margin-top:14px;color:#6b7280;font-size:12px">You can close this tab.</div>
    </div>
  </body>
</html>`
}

serve(async (req: Request) => {
  const url = new URL(req.url)
  const token = (url.searchParams.get('token') ?? '').trim()
  if (!token) {
    return new Response(page('Missing unsubscribe token', '<p style="margin:0;color:#374151">The unsubscribe link is incomplete.</p>'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(page('Unsubscribe unavailable', '<p style="margin:0;color:#374151">Please try again later.</p>'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase
    .from('newsletter_signups')
    .update({ weekly_opt_in: false, unsubscribed_at: new Date().toISOString() })
    .eq('unsubscribe_token', token)
    .select('id')
    .maybeSingle()

  if (error) {
    return new Response(page('Unsubscribe failed', '<p style="margin:0;color:#374151">Please try again later.</p>'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  if (!data?.id) {
    return new Response(
      page('Already unsubscribed (or invalid link)', '<p style="margin:0;color:#374151">This link is no longer active.</p>'),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  return new Response(
    page('You’re unsubscribed', '<p style="margin:0;color:#374151">You won’t receive the weekly reminder emails.</p>'),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
})
