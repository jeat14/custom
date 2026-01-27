type SendParams = {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}

type SendResult =
  | { ok: true }
  | { ok: false; status?: number; error: string; body?: string }
  | { skipped: true; missing: string[] }

export async function sendResendEmail(params: SendParams): Promise<SendResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY')?.trim() ?? ''
  const from = Deno.env.get('RESEND_FROM_EMAIL')?.trim() ?? ''
  const replyTo = (params.replyTo ?? Deno.env.get('RESEND_REPLY_TO_EMAIL')?.trim() ?? '').trim()

  const missing: string[] = []
  if (!apiKey) missing.push('RESEND_API_KEY')
  if (!from) missing.push('RESEND_FROM_EMAIL')
  if (missing.length) return { skipped: true, missing }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.text ? { text: params.text } : {}),
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return { ok: false, status: res.status, error: 'Resend API error', body: text }
  }

  return { ok: true }
}
