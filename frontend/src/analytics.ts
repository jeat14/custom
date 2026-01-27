type CaptureProps = Record<string, unknown>

function getPosthogHost() {
  const host = (import.meta as any).env?.VITE_POSTHOG_HOST as string | undefined
  const raw = (host ?? 'https://app.posthog.com').trim()
  const withScheme = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`
  return withScheme.replace(/\/$/, '')
}

function getPosthogKey() {
  return ((import.meta as any).env?.VITE_POSTHOG_KEY as string | undefined)?.trim() ?? ''
}

function getAnonId() {
  const key = 'evernest_anon_id'
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const id = crypto.getRandomValues(new Uint32Array(4)).join('-')
  window.localStorage.setItem(key, id)
  return id
}

export function capture(event: string, props?: CaptureProps) {
  const apiKey = getPosthogKey()
  if (!apiKey) return

  const host = getPosthogHost()
  const distinctId = (props?.distinct_id as string | undefined) ?? getAnonId()
  const properties = { ...(props ?? {}), distinct_id: distinctId }

  void fetch(`${host}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, event, properties }),
    keepalive: true,
  }).catch(() => {})
}
