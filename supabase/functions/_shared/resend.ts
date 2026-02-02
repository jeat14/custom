type SendParams = {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  from?: string
}

type SendResult =
  | { ok: true }
  | { ok: false; status?: number; error: string; body?: string }
  | { skipped: true; missing: string[] }

export async function sendResendEmail(params: SendParams): Promise<SendResult> {
  const denoEnv = (globalThis as any)?.Deno?.env
  const apiKey = denoEnv?.get?.('RESEND_API_KEY')?.trim?.() ?? ''
  const from = (params.from ?? denoEnv?.get?.('RESEND_FROM_EMAIL')?.trim?.() ?? '').trim()
  const replyTo = (params.replyTo ?? denoEnv?.get?.('RESEND_REPLY_TO_EMAIL')?.trim?.() ?? '').trim()

  const missing: string[] = []
  if (!apiKey) missing.push('RESEND_API_KEY')
  if (!from) missing.push('RESEND_FROM_EMAIL')
  if (missing.length) return { skipped: true, missing }

  const sendOnce = async (fromEmail: string): Promise<SendResult> => {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
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

  const first = await sendOnce(from)
  if ((first as any)?.ok) return first

  const status = (first as any)?.status
  const body = String((first as any)?.body ?? '')
  const bodyLower = body.toLowerCase()
  const looksLikeSenderIssue =
    (status === 400 || status === 401 || status === 403) &&
    (bodyLower.includes('verify') || bodyLower.includes('verified') || bodyLower.includes('domain') || bodyLower.includes('sender'))

  if (looksLikeSenderIssue && from.toLowerCase() !== 'onboarding@resend.dev') {
    const retry = await sendOnce('onboarding@resend.dev')
    if ((retry as any)?.ok) return retry
  }

  return first
}
