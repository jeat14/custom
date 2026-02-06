import { useEffect, useMemo, useRef, useState } from 'react'
import { capture } from '../analytics'
import { initGoogleAnalytics, trackGooglePageView } from '../googleAnalytics'
import { supabase } from '../supabaseClient'

function getUtmParams() {
  const url = new URL(window.location.href)
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const
  const params: Record<string, string> = {}
  for (const k of keys) {
    const v = url.searchParams.get(k)
    if (v) params[k] = v
  }
  return params
}

export function DigitalEstatePlanning() {
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [showTurnstile, setShowTurnstile] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const turnstileRef = useRef<HTMLDivElement | null>(null)
  const turnstileWidgetIdRef = useRef<any>(null)
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

  const utms = useMemo(() => (typeof window === 'undefined' ? {} : getUtmParams()), [])

  useEffect(() => {
    capture('ads_landing_view', { page: 'digital_estate_planning', path: window.location.pathname, ...utms })
    initGoogleAnalytics()
    trackGooglePageView(window.location.pathname, window.location.search)
    document.title = 'Digital Estate Planning UK | Evernest'
    const description =
      'Digital estate planning for UK families. Store passwords, documents, and instructions securely so your family can access what matters when they need it.'
    const existing = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    if (existing) existing.content = description
    else {
      const m = document.createElement('meta')
      m.name = 'description'
      m.content = description
      document.head.appendChild(m)
    }
  }, [utms])

  useEffect(() => {
    if (!showTurnstile) return
    if (!siteKey) return
    if (!turnstileRef.current) return

    let canceled = false

    const render = () => {
      const api = (window as any).turnstile
      if (!api || canceled) return
      if (turnstileWidgetIdRef.current != null) {
        try {
          api.remove(turnstileWidgetIdRef.current)
        } catch {}
        turnstileWidgetIdRef.current = null
      }
      turnstileWidgetIdRef.current = api.render(turnstileRef.current, {
        sitekey: siteKey,
        size: 'compact',
        appearance: 'always',
        callback: (token: string) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => setTurnstileToken(''),
      })
    }

    if ((window as any).turnstile) {
      render()
    } else {
      const existing = document.querySelector('script[data-turnstile="true"]') as HTMLScriptElement | null
      if (existing) {
        existing.addEventListener('load', render, { once: true })
      } else {
        const s = document.createElement('script')
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        s.async = true
        s.defer = true
        s.dataset.turnstile = 'true'
        s.addEventListener('load', render, { once: true })
        document.head.appendChild(s)
      }
    }

    return () => {
      canceled = true
      const api = (window as any).turnstile
      if (api && turnstileWidgetIdRef.current != null) {
        try {
          api.remove(turnstileWidgetIdRef.current)
        } catch {}
      }
      turnstileWidgetIdRef.current = null
    }
  }, [showTurnstile, siteKey])

  const submit = async () => {
    setError(null)
    setMessage(null)

    const addr = email.trim().toLowerCase()
    const looksValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)
    if (!looksValid) {
      setError('Enter a valid email address')
      return
    }
    if (!supabase) {
      setError('Signup unavailable right now.')
      return
    }
    if (!siteKey) {
      setError('Signup unavailable right now.')
      return
    }
    if (!turnstileToken) {
      setShowTurnstile(true)
      setError('Please complete the quick check below')
      return
    }

    setIsSending(true)
    try {
      const { data, error } = await supabase.functions.invoke('newsletter-signup', {
        body: {
          email: addr,
          token: turnstileToken,
          source: 'ads_digital_estate_planning',
          path: window.location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent || null,
        },
      })
      if (error) {
        setError(error.message || 'Failed to save signup')
        return
      }

      const emailSent = (data as any)?.email_sent === true
      if (emailSent) {
        setMessage('Thanks — check your inbox (and spam) for the guide link.')
      } else {
        setMessage('Thanks — we saved your request. If you don’t receive the email, the guide is at: https://alwaysnest.co.uk/uk-guide')
      }

      capture('ads_landing_conversion', { page: 'digital_estate_planning', conversion: 'guide_request', ...utms })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 920, margin: '0 auto' }}>
      <div className="card" style={{ padding: 22 }}>
        <h1 style={{ margin: 0, letterSpacing: -0.4 }}>Digital estate planning for UK families</h1>
        <div className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          What happens to your passwords, crypto, and online accounts if something happens to you?
        </div>

        <div style={{ marginTop: 14, lineHeight: 1.6 }}>
          Store passwords, documents, and instructions securely — so your family can access what matters when they need it.
        </div>

        <div style={{ marginTop: 14, lineHeight: 1.7 }}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Passwords after death: keep access instructions safe and organised</li>
            <li>Emergency access: recovery kit + controlled handover</li>
            <li>Private by design: zero-knowledge, client-side encryption (we can’t see your data)</li>
          </ul>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="muted" style={{ marginBottom: 8, fontSize: 13, lineHeight: 1.6 }}>
            Created to solve the “passwords after death” problem.
          </div>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setShowForm(true)
              window.setTimeout(() => inputRef.current?.focus(), 0)
              capture('ads_landing_cta_click', { page: 'digital_estate_planning', cta: 'free_uk_guide', ...utms })
            }}
          >
            Get the free UK digital estate guide
          </button>
          <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
            You’ll get the free UK guide and can create a vault later if you choose.
          </div>
        </div>

        <div className="muted" style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6 }}>
          Evernest is not a password manager — it’s designed for emergency and end-of-life access.
        </div>

        {showForm ? (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                ref={inputRef}
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
                placeholder="you@example.com"
                inputMode="email"
                autoComplete="email"
                aria-label="Your email address"
              />
              <button type="button" className="primary" onClick={() => void submit()} disabled={isSending}>
                {isSending ? 'Saving…' : 'Get the free UK digital estate guide'}
              </button>
            </div>
            {siteKey && (showTurnstile || Boolean(turnstileToken)) ? (
              <div
                ref={turnstileRef}
                style={{ marginTop: 12, opacity: 0.88, transform: 'scale(0.94)', transformOrigin: '0 0' }}
              />
            ) : null}
            {error ? (
              <div className="error" style={{ marginTop: 10 }}>
                {error}
              </div>
            ) : null}
            {message ? (
              <div className="banner" style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 650, letterSpacing: -0.1 }}>{message}</div>
              </div>
            ) : null}
            <div className="muted" style={{ marginTop: 10, fontSize: 12, lineHeight: 1.55 }}>
              Client-side encryption using industry-standard cryptography. Zero-knowledge means we can’t see your data. We can’t reset your
              vault password (only you control access).{' '}
              <a href="/security" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                Security model documented publicly
              </a>
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 750, letterSpacing: -0.1 }}>FAQ</div>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 750, letterSpacing: -0.1 }}>What is a digital estate?</div>
              <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
                It’s the set of online accounts, passwords, devices, documents, and instructions your family may need if you can’t
                access them.
              </div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 750, letterSpacing: -0.1 }}>How does emergency access work?</div>
              <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
                You generate an offline recovery kit, and you control who receives it and when. Heir handover uses a duty-of-care
                safeguard.
              </div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 750, letterSpacing: -0.1 }}>Is this designed for the UK?</div>
              <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
                Yes — the guide and examples are UK-focused and written for practical estate-planning scenarios.
              </div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 750, letterSpacing: -0.1 }}>Can Evernest access my data?</div>
              <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
                No. Vault contents are encrypted client-side. Zero-knowledge means we don’t have the keys to view your data.
              </div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 750, letterSpacing: -0.1 }}>What happens if I forget my password?</div>
              <div className="muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
                We can’t reset it. You’ll need your offline recovery materials. This is part of the privacy-first design.
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 750, letterSpacing: -0.1 }}>Don’t leave your digital life unanswered</div>
          <div style={{ marginTop: 10 }}>
            <div className="muted" style={{ marginBottom: 8, fontSize: 13, lineHeight: 1.6 }}>
              Created to solve the “passwords after death” problem.
            </div>
            <button
              type="button"
              className="primary"
              onClick={() => {
                setShowForm(true)
                window.setTimeout(() => inputRef.current?.focus(), 0)
                capture('ads_landing_cta_click', { page: 'digital_estate_planning', cta: 'free_uk_guide_repeat', ...utms })
              }}
            >
              Get the free UK digital estate guide
            </button>
            <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
              You’ll get the free UK guide and can create a vault later if you choose.
            </div>
          </div>
        </div>

        <div className="muted" style={{ marginTop: 14, fontSize: 12, lineHeight: 1.55 }}>
          By requesting the guide, you agree to our Privacy Policy and Terms.
        </div>
      </div>
    </div>
  )
}
