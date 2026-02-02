import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useSupabaseSession } from '../hooks/useSupabaseSession'
import { capture } from '../analytics'

export function NewsletterPopup(props: { contactEmail?: string | null }) {
  const { session } = useSupabaseSession()
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [showTurnstile, setShowTurnstile] = useState(false)
  const openedRef = useRef(false)
  const sessionOpenedKey = 'evernest_newsletter_opened_session'
  const inputRef = useRef<HTMLInputElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const turnstileRef = useRef<HTMLDivElement | null>(null)
  const turnstileWidgetIdRef = useRef<any>(null)
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    previousFocusRef.current = (document.activeElement as HTMLElement | null) ?? null
    const priorOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => {
      window.clearTimeout(t)
      document.body.style.overflow = priorOverflow
      previousFocusRef.current?.focus?.()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    setShowTurnstile(false)
    setTurnstileToken('')
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
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
  }, [isOpen, showTurnstile, siteKey])

  useEffect(() => {
    if (session?.user?.id) return
    const url = new URL(window.location.href)
    const forceOpen = url.searchParams.get('popup') === '1'
    const dismissUntilRaw = window.localStorage.getItem('evernest_newsletter_dismissed_until')
    const dismissUntil = dismissUntilRaw ? Number(dismissUntilRaw) : 0
    const now = Date.now()
    if (!forceOpen && dismissUntil && now < dismissUntil) return
    if (openedRef.current) return
    const openedThisSession = window.sessionStorage.getItem(sessionOpenedKey) === '1'
    if (!forceOpen && openedThisSession) return

    const openOnce = (reason: string) => {
      if (openedRef.current) return
      openedRef.current = true
      window.sessionStorage.setItem(sessionOpenedKey, '1')
      setIsOpen(true)
      capture('newsletter_popup_opened', { reason, page: window.location.pathname })
    }

    const maxDelayMs = 30000
    const timer = window.setTimeout(() => openOnce('delay'), maxDelayMs)
    if (forceOpen) openOnce('force')

    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      window.requestAnimationFrame(() => {
        ticking = false
        if (openedRef.current) return
        const doc = document.documentElement
        const scrollTop = window.scrollY || doc.scrollTop || 0
        const scrollHeight = doc.scrollHeight || 0
        const viewportHeight = window.innerHeight || 0
        const maxScroll = Math.max(1, scrollHeight - viewportHeight)
        const progress = scrollTop / maxScroll
        if (progress >= 0.5) openOnce('scroll_50pct')
      })
    }

    const onMouseOut = (e: MouseEvent) => {
      const nearTop = typeof e.clientY === 'number' && e.clientY <= 0
      if (nearTop) openOnce('exit_intent')
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('mouseout', onMouseOut)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('mouseout', onMouseOut)
    }
  }, [session?.user?.id])

  const dismissForDays = (days: number) => {
    const until = Date.now() + days * 24 * 60 * 60 * 1000
    window.localStorage.setItem('evernest_newsletter_dismissed_until', String(until))
  }

  const close = () => {
    setIsOpen(false)
    setError(null)
    setMessage(null)
    dismissForDays(1)
    capture('newsletter_popup_dismissed', { page: window.location.pathname })
  }

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
      if (props.contactEmail) {
        setError(`Signup unavailable. Email us at ${props.contactEmail}.`)
      } else {
        setError('Signup unavailable right now.')
      }
      return
    }
    if (!siteKey) {
      if (props.contactEmail) {
        setError(`Signup unavailable. Email us at ${props.contactEmail}.`)
      } else {
        setError('Signup unavailable right now.')
      }
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
          source: 'lead_magnet_uk_guide',
          path: window.location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent || null,
        },
      })
      if (error) {
        const msg = error.message || 'Failed to save signup'
        if (/404|not found/i.test(msg)) {
          if (props.contactEmail) setError(`Signup is being enabled. Email us at ${props.contactEmail}.`)
          else setError('Signup is being enabled. Try again shortly.')
        } else {
          setError(msg)
        }
        return
      }

      if ((data as any)?.duplicate) {
        setMessage('We already have that email — check your inbox for the guide link.')
        dismissForDays(365)
        capture('newsletter_signup_duplicate', { page: window.location.pathname })
        return
      }

      if ((data as any)?.email_sent === true) {
        setMessage('Thanks — check your email for the guide link.')
      } else {
        setMessage('Thanks — we’ve saved your request. We’ll email the guide link shortly.')
      }
      dismissForDays(365)
      capture('newsletter_signup', { page: window.location.pathname })
    } finally {
      setIsSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-labelledby="newsletter_title" onClick={() => close()}>
      <div className="modalCard" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
          <div>
            <div id="newsletter_title" style={{ fontSize: 16, fontWeight: 750, letterSpacing: -0.2 }}>
              Free UK guide: Protect your important digital documents
            </div>
            <div className="muted" style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55 }}>
              One email • No spam • UK-based
            </div>
          </div>
          <button type="button" onClick={() => close()} style={{ padding: '8px 10px', boxShadow: 'none' }}>
            Close
          </button>
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
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
            {isSending ? 'Saving…' : 'Send me my guide'}
          </button>
        </div>

        {siteKey && (showTurnstile || Boolean(turnstileToken)) ? (
          <div ref={turnstileRef} style={{ marginTop: 12, opacity: 0.88, transform: 'scale(0.94)', transformOrigin: '0 0' }} />
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

        <div className="muted" style={{ marginTop: 12, fontSize: 12, lineHeight: 1.55 }}>
          By requesting the guide, you agree to our <Link to="/privacy">Privacy Policy</Link> and <Link to="/terms">Terms</Link>.
        </div>
      </div>
    </div>
  )
}
